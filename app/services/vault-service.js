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

    const passHash = await hashPassword(password);
    const answerHash = await hashPassword(answer.toLowerCase().trim());
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
    if (lockRow && lockRow.value) {
        const lockTime = new Date(lockRow.value);
        if (new Date() < lockTime) {
            const remaining = Math.ceil((lockTime - new Date()) / 1000);
            throw new Error(`Sistem KİLİTLİ! ${remaining} sn bekleyin.`);
        } else {
            await Promise.all([
                runAsync("UPDATE config SET value = NULL WHERE key = 'lock_until'"),
                runAsync("UPDATE config SET value = '0' WHERE key = 'login_attempts'")
            ]);
        }
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
    } else {
        const attRow = await getAsync("SELECT value FROM config WHERE key = 'login_attempts'");
        let attempts = attRow ? (parseInt(attRow.value) || 0) + 1 : 1;
        await runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['login_attempts', attempts.toString()]);
        
        if (!suppressLog) await logAction('GİRİŞ HATASI', `Hatalı deneme: ${attempts}`);

        if (attempts >= 3) {
            const unlockTime = new Date(new Date().getTime() + 30000).toISOString();
            await runAsync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ['lock_until', unlockTime]);
            await logAction('SİSTEM KİLİTLENDİ', 'Brute-force koruması.');
            throw new Error("Çok fazla hatalı giriş! Sistem 30 saniye kilitlendi.");
        }
        throw new Error("Hatalı Şifre!");
    }
}

async function getSecurityQuestion() {
    const row = await getAsync("SELECT value FROM config WHERE key = 'sec_question'");
    return row ? row.value : null;
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

async function addAccount(service, username, password, priority, category) {
    const { iv, content } = encrypt(password);
    const safePriority = priority || 'Low';
    const safeCategory = category || 'Diğer';
    await runAsync(
        "INSERT INTO accounts (service_name, username, encrypted_password, iv, priority, category) VALUES (?, ?, ?, ?, ?, ?)",
        [service, username, content, iv, safePriority, safeCategory]
    );
    await logAction('HESAP EKLENDİ', `${service} (${safeCategory})`);
}

async function updateAccount(data) {
    const { id, service, username, password, priority, category } = data;
    const { iv, content } = encrypt(password); 
    const safeCategory = category || 'Diğer';
    await runAsync(`
        UPDATE accounts 
        SET service_name = ?, username = ?, encrypted_password = ?, iv = ?, priority = ?, category = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, [service, username, content, iv, priority, safeCategory, id]);
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
                password: decrypt(row.encrypted_password, row.iv)
            };
        } catch (e) {
            return { ...row, password: 'HATA: Çözülemedi' };
        }
    });
}

async function deleteAccount(id) {
    const acc = await getAsync("SELECT service_name FROM accounts WHERE id = ?", [id]);
    await runAsync("DELETE FROM accounts WHERE id = ?", [id]);
    await logAction('HESAP SİLİNDİ', `Silinen Kayıt: ${acc ? acc.service_name : 'Bilinmeyen'}`);
}

async function checkPwned(password) {
    try {
        if (!password) return 0;
        const hash = sha1(password);
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return -1;
        const text = await res.text();
        const match = text.match(new RegExp(`^${suffix}:(\\d+)$`, 'm'));
        return match ? parseInt(match[1]) : 0;
    } catch (e) { return -1; }
}

async function getPasswordHealth() {
    const accounts = await getAccounts();
    let weakCount = 0, reusedCount = 0, strongCount = 0;
    let chartReused = 0, chartWeak = 0, chartStrong = 0;
    const counts = {};
    const uniquePasswords = [];

    accounts.forEach(a => {
        if (!a.password) return;
        counts[a.password] = (counts[a.password] || 0) + 1;
        if(counts[a.password] === 1) uniquePasswords.push(a.password);
    });

    const pwnedStatus = {};
    const chunkSize = 10;
    for (let i = 0; i < uniquePasswords.length; i += chunkSize) {
        const chunk = uniquePasswords.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (pwd) => {
            const leaks = await checkPwned(pwd);
            pwnedStatus[pwd] = leaks > 0;
        }));
    }

    accounts.forEach(a => {
        const p = a.password;
        if (!p) return;
        let isReused = counts[p] > 1;
        let isLeaked = pwnedStatus[p] === true;
        let isSimple = (p.length < 8 || !/\d/.test(p) || !/[a-zA-Z]/.test(p));
        let isWeak = isSimple || isLeaked; 

        if (isReused) reusedCount++;
        if (isWeak) weakCount++;
        if (!isReused && !isWeak) strongCount++;

        if (isWeak) chartWeak++; 
        else if (isReused) chartReused++; 
        else chartStrong++;
    });

    return { 
        stats: { weak: weakCount, reused: reusedCount, strong: strongCount },
        chart: { weak: chartWeak, reused: chartReused, strong: chartStrong },
        total: accounts.length 
    };
}

async function exportData(filePath, password) {
    await login(password, true);
    const accounts = await getAccounts();
    fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), 'utf-8');
    await logAction('DIŞA AKTARMA', 'Tüm veriler şifresiz olarak dışa aktarıldı.');
}

async function importData(filePath) {
    try {
        const accounts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let count = 0;
        for (const acc of accounts) {
            const exists = await getAsync(
                "SELECT id FROM accounts WHERE service_name = ? AND username = ?", 
                [acc.service_name, acc.username]
            );
            if(!exists) {
                await addAccount(acc.service_name, acc.username, acc.password, acc.priority || 'Low', acc.category || 'Diğer');
                count++;
            }
        }
        await logAction('İÇE AKTARMA', `${count} yeni hesap yüklendi.`);
        return count;
    } catch (e) { throw new Error("Dosya okuma veya JSON hatası: " + e.message); }
}

module.exports = {
    isConfigured, setupMaster, login, getSecurityQuestion, resetPassword,
    addAccount, updateAccount, getAccounts, deleteAccount, 
    getLogs, checkPwned, getPasswordHealth, exportData, importData
};