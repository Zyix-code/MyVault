const { runAsync, allAsync, getAsync } = require('./db');
const { encrypt, decrypt, hashPassword, verifyPassword, sha1 } = require('../utils/crypto');
const fs = require('fs');

async function logAction(action, details) {
    try {
        const now = new Date();
        const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
            .toISOString().slice(0, 19).replace('T', ' ');
        await runAsync("INSERT INTO audit_logs (action, details, timestamp) VALUES (?, ?, ?)", [action, details, localTime]);
    } catch (e) { console.error(e); }
}

async function getLogs() {
    return await allAsync("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50");
}

async function isConfigured() {
    const row = await getAsync("SELECT value FROM config WHERE key = 'master_pass_hash'");
    return !!row;
}

async function setupMaster(password, question, answer) {
    if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
        throw new Error("Güvensiz Şifre: En az 8 karakter, büyük/küçük harf ve rakam gereklidir.");
    }
    const [passHash, answerHash] = await Promise.all([
        hashPassword(password),
        hashPassword(answer.toLowerCase().trim())
    ]);
    await Promise.all([
        runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['master_pass_hash', passHash]),
        runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['sec_question', question]),
        runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['sec_answer_hash', answerHash]),
        runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['login_attempts', '0']),
        runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['lock_until', null])
    ]);
    await logAction('SİSTEM KURULUMU', 'Kurulum tamamlandı.');
}

async function login(password, suppressLog = false) {
    const lockRow = await getAsync("SELECT value FROM config WHERE key = 'lock_until'");
    if (lockRow?.value) {
        const lockTime = new Date(lockRow.value);
        if (new Date() < lockTime) {
            throw new Error(`Sistem KİLİTLİ! ${Math.ceil((lockTime - new Date()) / 1000)} sn bekleyin.`);
        }
        await Promise.all([
            runAsync("UPDATE config SET value = NULL WHERE key = 'lock_until'"),
            runAsync("UPDATE config SET value = '0' WHERE key = 'login_attempts'")
        ]);
    }
    const passRow = await getAsync("SELECT value FROM config WHERE key = 'master_pass_hash'");
    if (!passRow) throw new Error("Sistem kurulu değil!");
    const success = await verifyPassword(passRow.value, password);
    if (success) {
        await Promise.all([
            runAsync("UPDATE config SET value = '0' WHERE key = 'login_attempts'"),
            runAsync("UPDATE config SET value = NULL WHERE key = 'lock_until'")
        ]);
        if (!suppressLog) await logAction('GİRİŞ BAŞARILI', 'Kasa açıldı.');
        return true;
    }
    const attRow = await getAsync("SELECT value FROM config WHERE key = 'login_attempts'");
    const attempts = (parseInt(attRow?.value) || 0) + 1;
    await runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['login_attempts', attempts.toString()]);
    if (!suppressLog) await logAction('GİRİŞ HATASI', `Hatalı deneme: ${attempts}`);
    if (attempts >= 3) {
        const unlockTime = new Date(Date.now() + 30000).toISOString();
        await runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['lock_until', unlockTime]);
        await logAction('SİSTEM KİLİTLENDİ', 'Brute-force koruması aktif.');
        throw new Error("Çok fazla hatalı giriş! Sistem 30 saniye kilitlendi.");
    }
    throw new Error("Hatalı Şifre!");
}

async function getSecurityQuestion() {
    const row = await getAsync("SELECT value FROM config WHERE key = 'sec_question'");
    return row?.value || null;
}

async function resetPassword(answer, newPassword) {
    if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(newPassword)) {
        throw new Error("Güvensiz Şifre: En az 8 karakter, büyük/küçük harf ve rakam gereklidir.");
    }
    const row = await getAsync("SELECT value FROM config WHERE key = 'sec_answer_hash'");
    if (!row) return false;
    const isCorrect = await verifyPassword(row.value, answer.toLowerCase().trim());
    if (isCorrect) {
        const newHash = await hashPassword(newPassword);
        await Promise.all([
            runAsync("UPDATE config SET value = ? WHERE key = 'master_pass_hash'", [newHash]),
            runAsync("UPDATE config SET value = '0' WHERE key = 'login_attempts'"),
            runAsync("UPDATE config SET value = NULL WHERE key = 'lock_until'")
        ]);
        await logAction('ŞİFRE SIFIRLANDI', 'Güvenlik sorusu ile sıfırlandı.');
        return true;
    }
    await logAction('SIFIRLAMA HATASI', 'Yanlış güvenlik cevabı.');
    throw new Error("Yanlış güvenlik cevabı.");
}

async function addAccount(service, username, password, priority, category, notes) {
    const { iv, content } = encrypt(password);
    await runAsync(
        "INSERT INTO accounts (service_name, username, encrypted_password, iv, priority, category, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [service, username, content, iv, priority || 'Low', category || 'Diğer', notes || '']
    );
    await logAction('HESAP EKLENDİ', `${service} (${category || 'Diğer'})`);
}

async function updateAccount(data) {
    const { id, service, username, password, priority, category, notes } = data;
    const { iv, content } = encrypt(password); 
    await runAsync(`
        UPDATE accounts 
        SET service_name = ?, username = ?, encrypted_password = ?, iv = ?, priority = ?, category = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, [service, username, content, iv, priority, category || 'Diğer', notes || '', id]);
    await logAction('GÜNCELLEME', `${service} hesabı güncellendi.`);
    return true;
}

async function getAccounts() {
    const rows = await allAsync(`
        SELECT * FROM accounts ORDER BY 
        CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END ASC,
        created_at DESC
    `);
    return rows.map(row => {
        try {
            return {
                id: row.id,
                service_name: row.service_name,
                username: row.username,
                priority: row.priority,
                category: row.category || 'Diğer',
                notes: row.notes || '',
                password: decrypt(row.encrypted_password, row.iv)
            };
        } catch (e) {
            return { ...row, password: 'HATA: Çözülemedi', notes: row.notes || '' };
        }
    });
}

async function deleteAccount(id) {
    const acc = await getAsync("SELECT service_name FROM accounts WHERE id = ?", [id]);
    await runAsync("DELETE FROM accounts WHERE id = ?", [id]);
    await logAction('HESAP SİLİNDİ', `Silinen Kayıt: ${acc?.service_name || 'Bilinmeyen'}`);
}

async function checkPwned(password) {
    try {
        if (!password) return 0;
        const hash = sha1(password).toUpperCase();
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return -1;
        const text = await res.text();
        const match = text.split('\n').find(line => line.startsWith(suffix));
        return match ? parseInt(match.split(':')[1]) : 0;
    } catch (e) { return -1; }
}

async function getPasswordHealth() {
    const accounts = await getAccounts();
    const stats = { weak: 0, reused: 0, strong: 0 };
    const chart = { weak: 0, reused: 0, strong: 0 };
    
    const passCounts = {};
    const comboCounts = {};

    accounts.forEach(a => {
        if (a.password) {
            passCounts[a.password] = (passCounts[a.password] || 0) + 1;
            const combo = `${a.username || ''}-${a.password}`;
            comboCounts[combo] = (comboCounts[combo] || 0) + 1;
        }
    });

    for (const a of accounts) {
        if (!a.password) continue;

        const isPassReused = passCounts[a.password] > 1;
        const combo = `${a.username || ''}-${a.password}`;
        const isComboReused = comboCounts[combo] > 1;

        const isReused = isPassReused || isComboReused;
        
        const isSimple = a.password.length < 8 || !/\d/.test(a.password) || !/[a-zA-Z]/.test(a.password);
        const leaks = await checkPwned(a.password);
        const isWeak = isSimple || leaks > 0;

        if (isReused) { 
            stats.reused++; 
            chart.reused++; 
        } 
        else if (isWeak) { 
            stats.weak++; 
            chart.weak++; 
        } 
        else { 
            stats.strong++; 
            chart.strong++; 
        }
    }

    return { stats, chart, total: accounts.length };
}

async function exportData(filePath, password) {
    await login(password, true);
    const accounts = await getAccounts();
    fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), 'utf-8');
    await logAction('DIŞA AKTARMA', 'Veriler şifresiz dışa aktarıldı.');
}

async function importData(filePath) {
    try {
        const accounts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let count = 0;
        for (const acc of accounts) {
            const exists = await getAsync("SELECT id FROM accounts WHERE service_name = ? AND username = ?", [acc.service_name, acc.username]);
            if(!exists) {
                await addAccount(acc.service_name, acc.username, acc.password, acc.priority, acc.category, acc.notes);
                count++;
            }
        }
        await logAction('İÇE AKTARMA', `${count} yeni hesap yüklendi.`);
        return count;
    } catch (e) { throw new Error("İçe aktarma hatası: " + e.message); }
}

module.exports = {
    isConfigured, setupMaster, login, getSecurityQuestion, resetPassword,
    addAccount, updateAccount, getAccounts, deleteAccount, 
    getLogs, checkPwned, getPasswordHealth, exportData, importData
};