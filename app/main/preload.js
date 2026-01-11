const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    auth: {
        checkStatus: () => ipcRenderer.invoke('auth:check-status'),
        setup: (data) => ipcRenderer.invoke('auth:setup', data),
        login: (pass) => ipcRenderer.invoke('auth:login', pass),
        getQuestion: () => ipcRenderer.invoke('auth:get-question'),
        reset: (data) => ipcRenderer.invoke('auth:reset', data)
    },
    vault: {
        getAccounts: () => ipcRenderer.invoke('vault:get-accounts'),
        addAccount: (data) => ipcRenderer.invoke('vault:add-account', data),
        updateAccount: (data) => ipcRenderer.invoke('vault:update-account', data),
        deleteAccount: (id) => ipcRenderer.invoke('vault:delete-account', id),
        getLogs: () => ipcRenderer.invoke('vault:get-logs'),
        getHealth: () => ipcRenderer.invoke('vault:get-health'),
        exportData: (pass) => ipcRenderer.invoke('vault:export', pass),
        importData: () => ipcRenderer.invoke('vault:import')
    },
    utils: {
        generatePassword: () => ipcRenderer.invoke('util:generate-password'),
        checkPwned: (pass) => ipcRenderer.invoke('util:check-pwned', pass),
        copy: (text) => ipcRenderer.invoke('util:copy', text),
        readClipboard: () => ipcRenderer.invoke('util:read-clipboard'),
        clearClipboard: () => ipcRenderer.invoke('util:clear-clipboard')
    }
});