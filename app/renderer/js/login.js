const views = { setup: 'viewSetup', login: 'viewLogin', recovery: 'viewRecovery' };

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const isConfigured = await window.api.auth.checkStatus();
        switchView(isConfigured ? 'login' : 'setup');
    } catch (e) { console.error(e); }
});

function switchView(name) {
    Object.values(views).forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(views[name]).classList.remove('hidden');
    if (name === 'login') document.getElementById('loginPass').focus();
}

document.getElementById('btnSetup').addEventListener('click', async () => {
    const pass = document.getElementById('setupPass').value;
    const question = document.getElementById('setupQuestion').value.trim();
    const answer = document.getElementById('setupAnswer').value.trim();

    const strongRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if (!strongRegex.test(pass)) {
        return Swal.fire({
            icon: 'warning',
            title: 'Zayıf Şifre',
            html: 'Ana şifreniz şunları içermelidir:<br><ul style="text-align:left; margin-top:10px;"><li>En az 8 karakter</li><li>En az 1 büyük harf</li><li>En az 1 küçük harf</li><li>En az 1 rakam</li></ul>',
            confirmButtonText: 'Tamam'
        });
    }

    if (!answer || !question) return Swal.fire('Eksik Bilgi', 'Güvenlik sorusunu ve cevabını doldurunuz.', 'warning');

    const res = await window.api.auth.setup({ pass, question, answer });
    if (res.success) {
        Swal.fire({ icon: 'success', title: 'Kurulum Başarılı!', showConfirmButton: false, timer: 1500 });
        switchView('login');
    } else {
        Swal.fire('Hata', res.error, 'error');
    }
});

async function handleLogin() {
    const input = document.getElementById('loginPass');
    const btn = document.getElementById('btnLogin');
    if (btn.disabled) return;
    const res = await window.api.auth.login(input.value);
    
    if (res.success) {
        window.location.href = 'index.html';
    } else {
        input.value = '';
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: res.error || 'Hatalı Şifre', showConfirmButton: false, timer: 3000 });
        if (res.error && res.error.includes('bekleyin')) {
            const match = res.error.match(/(\d+)/);
            lockInterface(match ? parseInt(match[0]) : 30);
        }
    }
}

function lockInterface(duration) {
    const input = document.getElementById('loginPass');
    const btn = document.getElementById('btnLogin');
    let timeLeft = duration;

    input.disabled = true;
    btn.disabled = true;
    input.placeholder = "SİSTEM KİLİTLENDİ 🔒";
    btn.classList.replace('btn-primary-custom', 'btn-secondary');
    btn.innerHTML = `<i class="bi bi-hourglass-split me-2"></i>Bekleyin (${timeLeft})`;

    const timer = setInterval(() => {
        timeLeft--;
        btn.innerHTML = `<i class="bi bi-hourglass-split me-2"></i>Bekleyin (${timeLeft})`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            input.disabled = false;
            btn.disabled = false;
            btn.classList.replace('btn-secondary', 'btn-primary-custom');
            btn.innerHTML = 'Kasa\'yı Aç <i class="bi bi-arrow-right ms-2"></i>';
            input.placeholder = "Ana Şifre";
            input.focus();
        }
    }, 1000);
}

document.getElementById('btnLogin').addEventListener('click', handleLogin);
document.getElementById('loginPass').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

document.getElementById('linkForgot').addEventListener('click', async () => {
    document.getElementById('recoveryNewPass').value = '';
    document.getElementById('recoveryAnswer').value = '';
    try {
        const q = await window.api.auth.getQuestion();
        document.getElementById('recoveryQuestionDisplay').innerText = q || "Soru bulunamadı";
    } catch (error) {
        console.error("Soru yüklenirken hata oluştu:", error);
        document.getElementById('recoveryQuestionDisplay').innerText = "Veritabanına ulaşılamadı!";
    }
    switchView('recovery');
});

document.getElementById('btnReset').addEventListener('click', async () => {
    const answer = document.getElementById('recoveryAnswer').value.trim();
    const newPass = document.getElementById('recoveryNewPass').value;
    const strongRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if (!strongRegex.test(newPass)) {
        return Swal.fire({
            icon: 'warning',
            title: 'Zayıf Şifre',
            html: 'Yeni şifreniz en az 8 karakter, büyük/küçük harf ve rakam içermelidir.',
            confirmButtonText: 'Tamam'
        });
    }

    const res = await window.api.auth.reset({ answer, newPass });
    if (res.success) {
        Swal.fire('Başarılı', 'Şifreniz sıfırlandı.', 'success');
        switchView('login');
    } else {
        Swal.fire('Hata', 'Güvenlik cevabı yanlış!', 'error');
    }
});

document.getElementById('btnBack').addEventListener('click', () => switchView('login'));