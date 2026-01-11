const crypto = require('crypto');
const argon2 = require('argon2');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync('myvault_ultra_secure_key_2026', 'salt_v4_final', 32);

function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), content: encrypted };
}

function decrypt(encryptedHex, ivHex) {
    if (!encryptedHex || !ivHex) return null;
    try {
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return null;
    }
}

async function hashPassword(plainPassword) {
    return await argon2.hash(plainPassword, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1
    });
}

async function verifyPassword(hash, plainPassword) {
    try {
        return await argon2.verify(hash, plainPassword);
    } catch (err) {
        return false;
    }
}

function sha1(text) {
    return crypto.createHash('sha1').update(text).digest('hex').toUpperCase();
}

module.exports = { encrypt, decrypt, hashPassword, verifyPassword, sha1 };