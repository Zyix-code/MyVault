const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let dbPath;
let dbFolder;

if (app.isPackaged) {
    dbFolder = path.join(app.getPath('userData'), 'database');
} else {
    dbFolder = path.join(app.getAppPath(), 'database');
}

dbPath = path.join(dbFolder, 'vault.db');

if (!fs.existsSync(dbFolder)) {
    try {
        fs.mkdirSync(dbFolder, { recursive: true });
    } catch (err) {
        console.error("Klasör oluşturulamadı:", err);
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Veritabanı bağlantı hatası:", err.message);
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_name TEXT NOT NULL,
            username TEXT,
            encrypted_password TEXT NOT NULL,
            iv TEXT NOT NULL,
            priority TEXT DEFAULT 'Low',
            category TEXT DEFAULT 'Diğer',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        db.run("ALTER TABLE accounts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
            if (err && !err.message.includes("duplicate column name")) {
                console.log("Bilgi: updated_at zaten mevcut.");
            }
        });

        db.run("ALTER TABLE accounts ADD COLUMN category TEXT DEFAULT 'Diğer'", (err) => {
             if (err && !err.message.includes("duplicate column name")) {
                console.log("Bilgi: category zaten mevcut.");
            }
        });
    });
}

initDb();

function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

module.exports = { db, runAsync, getAsync, allAsync };