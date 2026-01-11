const { app, BrowserWindow, ipcMain, clipboard, dialog } = require('electron');
const path = require('path');
const vaultService = require('./app/services/vault-service');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 850,
        title: "MyVault - Güvenli Kasa",
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'app/main/preload.js'),
            contextIsolation: true, nodeIntegration: false, sandbox: false
        },
        autoHideMenuBar: true, backgroundColor: '#f3f4f6'
    });
    mainWindow.loadFile('app/renderer/login.html');
}

ipcMain.handle('auth:check-status', () => vaultService.isConfigured());
ipcMain.handle('auth:setup', (_, d) => handleServiceCall(vaultService.setupMaster(d.pass, d.question, d.answer)));
ipcMain.handle('auth:login', (_, p) => handleServiceCall(vaultService.login(p)));
ipcMain.handle('auth:get-question', () => vaultService.getSecurityQuestion());
ipcMain.handle('auth:reset', (_, d) => handleServiceCall(vaultService.resetPassword(d.answer, d.newPass)));

ipcMain.handle('vault:get-accounts', () => handleServiceData(vaultService.getAccounts()));
ipcMain.handle('vault:add-account', (_, d) => handleServiceCall(vaultService.addAccount(d.service, d.username, d.password, d.priority, d.category)));
ipcMain.handle('vault:delete-account', (_, id) => handleServiceCall(vaultService.deleteAccount(id)));
ipcMain.handle('vault:get-logs', () => handleServiceData(vaultService.getLogs()));
ipcMain.handle('vault:get-health', () => vaultService.getPasswordHealth());
ipcMain.handle('vault:update-account', (_, data) => handleServiceCall(vaultService.updateAccount(data)));

ipcMain.handle('vault:export', async (_, password) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Yedek Dosyasını Kaydet',
            defaultPath: `MyVault_Yedek_${new Date().toISOString().split('T')[0]}.json`,
            filters: [{ name: 'JSON Dosyası', extensions: ['json'] }]
        });
        if (filePath) {
            await vaultService.exportData(filePath, password);
            return { success: true };
        }
        return { success: false, error: 'İptal edildi.' };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('vault:import', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Yedek Dosyasını Seç',
            properties: ['openFile'],
            filters: [{ name: 'JSON Dosyası', extensions: ['json'] }]
        });
        if (filePaths && filePaths.length > 0) {
            const count = await vaultService.importData(filePaths[0]);
            return { success: true, count: count };
        }
        return { success: false, error: 'İptal edildi.' };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('util:check-pwned', (_, p) => vaultService.checkPwned(p));
ipcMain.handle('util:generate-password', () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let p = ""; 
    for(let i=0; i<16; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
    return p;
});
ipcMain.handle('util:copy', (_, t) => { clipboard.writeText(t); return true; });
ipcMain.handle('util:read-clipboard', () => clipboard.readText());
ipcMain.handle('util:clear-clipboard', () => { clipboard.clear(); return true; });

async function handleServiceCall(promise) {
    try { await promise; return { success: true }; } 
    catch (e) { console.error(e); return { success: false, error: e.message }; }
}
async function handleServiceData(promise) {
    try { const data = await promise; return { success: true, data: data }; } 
    catch (e) { return { success: false, error: e.message }; }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });