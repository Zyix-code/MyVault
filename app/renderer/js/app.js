const list = document.getElementById('list');
let chartInstance = null;
let currentAccounts = [];
let initialEditData = {};
let currentCategory = 'All';

const LOGO_MAP = {
    "instagram": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
    "insta": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
    "youtube": "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
    "twitter": "https://img.icons8.com/color/48/twitter--v1.png",
    "x": "https://img.icons8.com/ios-filled/50/twitterx--v1.png",
    "spotify": "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
    "netflix": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png",
    "discord": "https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
    "dc": "https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
    "google": "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
    "gmail": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
    "e-devlet": "https://cdn.e-devlet.gov.tr/themes/izmir/images/favicons/apple-touch-icon-180x180.png",
    "edevlet": "https://cdn.e-devlet.gov.tr/themes/izmir/images/favicons/apple-touch-icon-180x180.png",
    "valorant": "https://img.icons8.com/color/48/valorant.png",
    "valo": "https://img.icons8.com/color/48/valorant.png",
    "steam": "https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg",
    "lol": "https://img.icons8.com/color/48/league-of-legends.png",
    "league": "https://img.icons8.com/color/48/league-of-legends.png",
    "cs": "https://img.icons8.com/color/48/counter-strike.png",
    "counter": "https://img.icons8.com/color/48/counter-strike.png",
    "pubg": "https://img.icons8.com/color/48/pubg.png",
    "clash": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Clash_of_Clans_icon.png",
    "epic": "https://upload.wikimedia.org/wikipedia/commons/3/31/Epic_Games_logo.svg",
    "gta": "https://img.icons8.com/color/48/grand-theft-auto-v.png",
    "metin2": "https://img.icons8.com/color/48/metin2.png",
    "itemsatış": "https://cdn.itemsatis.com/uploads/logo_v2.png",
    "itemsatis": "https://cdn.itemsatis.com/uploads/logo_v2.png",
    "gamesatış": "https://images.gamesatis.com/assets/images/logo-icon.png",
    "gamesatis": "https://images.gamesatis.com/assets/images/logo-icon.png",
    "papara": "https://www.papara.com/static/images/papara-icon.png",
    "ininal": "https://www.ininal.com/assets/images/favicon.png",
    "amazon": "https://img.icons8.com/color/48/amazon.png",
    "trendyol": "https://cdn.dsmcdn.com/web/production/trendyol-logo.png"
};

const safe = (str) => {
    if (!str) return '';
    return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const trToEng = (str) => {
    return str.replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
};

const trPrio = (p) => p === 'High' ? 'Yüksek' : p === 'Medium' ? 'Orta' : 'Düşük';

document.addEventListener('DOMContentLoaded', () => {
    loadAccounts(); 
    loadChart(); 
    inactivityTime();
    const updateBtn = document.getElementById('updateAccountBtn');
    if (updateBtn) updateBtn.addEventListener('click', handleUpdateAccount);

    document.getElementById('saveAccount').addEventListener('click', handleSaveAccount);
    
    document.getElementById('genPass').addEventListener('click', async () => {
        document.getElementById('addPass').value = await window.api.utils.generatePassword();
    });

    document.getElementById('search').addEventListener('input', (e) => { 
        const v = e.target.value.toLowerCase(); 
        document.querySelectorAll('#list > div').forEach(el => {
            el.style.display = el.innerText.toLowerCase().includes(v) ? 'block' : 'none';
        });
    });

    const addModalEl = document.getElementById('addModal');
    if (addModalEl) {
        addModalEl.addEventListener('hidden.bs.modal', () => {
            ['addService', 'addUser', 'addPass', 'addNote'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('addPriority').value = 'Medium'; 
            document.getElementById('addCategory').value = 'Diğer'; 
        });
    }
});

function filterCategory(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('#categoryList button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = cat === 'All' ? 'Tüm Hesaplar' : `${cat} Hesapları`;
    renderList();
}

async function loadAccounts() {
    const res = await window.api.vault.getAccounts();
    if (!res.success) return;
    currentAccounts = res.data;
    renderList();
}

function renderList() {
    const filtered = currentCategory === 'All' 
        ? currentAccounts 
        : currentAccounts.filter(a => a.category === currentCategory);

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="col-12 text-center mt-5">
                <div class="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-4" style="width:100px; height:100px;">
                    <i class="bi bi-filter text-secondary opacity-25" style="font-size: 3rem;"></i>
                </div>
                <h4 class="fw-bold text-secondary">Bu kategoride hesap yok</h4>
            </div>`;
        return;
    }

    const getLogoData = (rawName) => {
        const lowerName = rawName.toLowerCase();
        const cleanForCompare = trToEng(lowerName).replace(/\s/g, '');
        if (/(^|\s)x(\s|$)/.test(lowerName)) return { type: 'img', src: LOGO_MAP['x'] };
        for (const [key, url] of Object.entries(LOGO_MAP)) {
            if (key === 'x') continue;
            if (cleanForCompare.includes(key)) return { type: 'img', src: url };
        }
        if (lowerName.trim().includes(' ')) return { type: 'text', char: rawName.trim().charAt(0).toUpperCase() };
        let domain = cleanForCompare;
        if (!domain.includes('.')) domain += '.com';
        return { type: 'img', src: `https://logo.clearbit.com/${domain}` };
    };

    list.innerHTML = filtered.map(a => {
    const logoData = getLogoData(a.service_name);
    const firstChar = a.service_name.trim().charAt(0).toUpperCase();
    
    const iconHtml = `<div class="service-icon-box">
        ${logoData.type === 'img' 
            ? `<img src="${logoData.src}" class="service-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="service-icon-fallback" style="display:none;">${firstChar}</div>`
            : `<div class="service-icon-fallback">${firstChar}</div>`
        }
    </div>`;

    const noteHtml = a.notes ? `
        <div class="note-area shadow-sm">
            <div class="fw-bold text-primary mb-1" style="font-size: 0.65rem; letter-spacing: 0.5px;">
                <i class="bi bi-sticky-fill me-1"></i> NOT
            </div>
            <div class="text-dark">${safe(a.notes)}</div>
        </div>` : '';

    return `
        <div class="col-md-4 col-sm-6 mb-3">
            <div class="account-card priority-${a.priority} shadow-sm border-0">
                <div class="d-flex justify-content-between mb-2 align-items-center">
                    <span class="badge bg-light text-secondary border" style="font-size: 0.7rem;">${safe(a.category)}</span>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm p-1 text-primary border-0" onclick="editAccount(${a.id})"><i class="bi bi-pencil-square"></i></button>
                        <button class="btn btn-sm p-1 text-danger border-0" onclick="del(${a.id})"><i class="bi bi-trash-fill"></i></button>
                    </div>
                </div>
                
                <div class="d-flex align-items-center gap-3 mb-2">
                    ${iconHtml}
                    <div style="min-width: 0;"> 
                        <h6 class="fw-bold text-dark m-0 text-truncate">${safe(a.service_name)}</h6>
                        <small class="text-muted text-truncate d-block" style="font-size: 0.75rem;">${safe(a.username || 'Kullanıcı adı yok')}</small>
                    </div>
                </div>

                ${noteHtml}

                <div class="mt-auto pt-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="text-muted m-0" style="font-size: 0.65rem; font-weight: 700;">GÜVENLİ ŞİFRE</label>
                        <i class="bi bi-eye-fill text-muted" style="font-size: 0.75rem;"></i>
                    </div>
                    <div class="pass-field" onclick="copy('${safe(a.password)}')" title="Kopyala">
                        <span class="blur font-monospace" style="font-size: 0.9rem;">${safe(a.password)}</span>
                    </div>
                </div>
            </div>
        </div>`;
}).join('');
}

window.editAccount = (id) => {
    const acc = currentAccounts.find(x => x.id === id);
    if (!acc) return;
    
    document.getElementById('editId').value = acc.id;
    document.getElementById('editService').value = acc.service_name;
    document.getElementById('editUser').value = acc.username;
    document.getElementById('editPass').value = acc.password;
    document.getElementById('editPriority').value = acc.priority;
    document.getElementById('editCategory').value = acc.category || 'Diğer'; 
    document.getElementById('editNote').value = acc.notes || '';

    initialEditData = {
        id: acc.id.toString(), service: acc.service_name, username: acc.username, 
        password: acc.password, priority: acc.priority, category: acc.category || 'Diğer',
        notes: acc.notes || ''
    };
    new bootstrap.Modal(document.getElementById('editModal')).show();
};

async function handleUpdateAccount() {
    const currentData = {
        id: document.getElementById('editId').value,
        service: document.getElementById('editService').value,
        username: document.getElementById('editUser').value,
        password: document.getElementById('editPass').value,
        priority: document.getElementById('editPriority').value,
        category: document.getElementById('editCategory').value,
        notes: document.getElementById('editNote').value
    };

    if (!currentData.service || !currentData.password) return Swal.fire('Hata', 'Gerekli alanları doldurun.', 'warning');
    if (JSON.stringify(initialEditData) === JSON.stringify(currentData)) {
        return bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    }

    const res = await window.api.vault.updateAccount(currentData);
    if (res.success) {
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        loadAccounts(); loadChart();
        Swal.fire({ toast: true, icon: 'success', title: 'Güncellendi', position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
}

window.generateEditPass = async () => { document.getElementById('editPass').value = await window.api.utils.generatePassword(); };

async function handleSaveAccount() {
    const data = {
        service: document.getElementById('addService').value,
        username: document.getElementById('addUser').value,
        password: document.getElementById('addPass').value,
        priority: document.getElementById('addPriority').value,
        category: document.getElementById('addCategory').value,
        notes: document.getElementById('addNote').value
    };

    if (!data.service || !data.password) return Swal.fire('Eksik Bilgi', 'Servis ve şifre zorunludur.', 'warning');

    const btn = document.getElementById('saveAccount');
    btn.disabled = true;

    const leaks = await window.api.utils.checkPwned(data.password);
    if (leaks > 0) {
        const c = await Swal.fire({ title: 'RİSKLİ ŞİFRE', text: `Bu şifre daha önce ${leaks} kez sızdırılmış. Yine de kaydedilsin mi?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Evet, Kaydet', cancelButtonText: 'Vazgeç' });
        if (!c.isConfirmed) { btn.disabled = false; return; }
    }

    const res = await window.api.vault.addAccount(data);
    btn.disabled = false;

    if (res.success) {
        bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
        loadAccounts(); loadChart();
        Swal.fire({ toast: true, icon: 'success', title: 'Başarıyla Kaydedildi', position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
}

window.backupMenu = async () => {
    const { value: choice } = await Swal.fire({ title: 'Veri Yönetimi', icon: 'question', showDenyButton: true, showCancelButton: true, confirmButtonText: 'Dışa Aktar', denyButtonText: 'İçe Aktar', cancelButtonText: 'İptal' });
    if (choice) {
        const { value: pass } = await Swal.fire({ title: 'Onay', text: 'Ana Şifre:', input: 'password', showCancelButton: true });
        if (pass) {
            const res = await window.api.vault.exportData(pass);
            res.success ? Swal.fire('Başarılı', 'Yedeklendi.', 'success') : (res.error !== 'İptal edildi.' && Swal.fire('Hata', res.error, 'error'));
        }
    } else if (choice === false) {
        const res = await window.api.vault.importData();
        if (res.success) {
            Swal.fire('Tamamlandı', `${res.count} hesap yüklendi.`, 'success');
            loadAccounts(); loadChart();
        } else if (res.error !== 'İptal edildi.') Swal.fire('Hata', res.error, 'error');
    }
};

window.del = async (id) => {
    const c = await Swal.fire({ title: 'Silinsin mi?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sil' });
    if (c.isConfirmed) { await window.api.vault.deleteAccount(id); loadAccounts(); loadChart(); }
};

window.copy = async (txt) => { await window.api.utils.copy(txt); Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }).fire({ icon: 'success', title: 'Kopyalandı' }); };
window.showLogs = async () => {
    const res = await window.api.vault.getLogs();
    const tbody = document.getElementById('logTableBody');
    if (res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Kayıt yok.</td></tr>'; } 
    else {
        tbody.innerHTML = res.data.map(l => {
            let boxClass = 'bg-icon-primary', iconClass = 'bi-info-circle';
            const act = l.action.toUpperCase();
            if (act.includes('SİL')) { boxClass = 'bg-icon-danger'; iconClass = 'bi-trash'; }
            else if (act.includes('EKLE')) { boxClass = 'bg-icon-success'; iconClass = 'bi-plus-lg'; }
            else if (act.includes('HATA')) { boxClass = 'bg-icon-warning'; iconClass = 'bi-exclamation-triangle'; }
            return `<tr class="log-row"><td class="ps-4 py-3"><div class="d-flex align-items-center gap-3"><div class="icon-box ${boxClass} rounded-3"><i class="bi ${iconClass}"></i></div><span class="fw-semibold text-dark">${safe(l.action)}</span></div></td><td class="text-secondary small font-monospace">${l.timestamp}</td><td class="text-soft small">${safe(l.details)}</td></tr>`;
        }).join('');
    }
    new bootstrap.Modal(document.getElementById('logsModal')).show();
};

async function loadChart() {
    const h = await window.api.vault.getHealth();
    document.getElementById('statStrong').innerText = h.stats.strong;
    document.getElementById('statReused').innerText = h.stats.reused;
    document.getElementById('statWeak').innerText = h.stats.weak;
    const ctx = document.getElementById('healthChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Güçlü', 'Tekrar Eden', 'Riskli'], datasets: [{ data: [h.chart.strong, h.chart.reused, h.chart.weak], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0, hoverOffset: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '85%', plugins: { legend: { display: false } } }
    });
}
function inactivityTime() {
    let t;
    window.onload = document.onmousemove = document.onkeypress = document.onclick = reset;
    function logout() { Swal.fire({ title: 'Zaman Aşımı', showConfirmButton: false, timer: 1500 }).then(() => location.href = 'login.html'); }
    function reset() { clearTimeout(t); t = setTimeout(logout, 300000); }
}