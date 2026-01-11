# 🛡️ MyVault – Güvenli Şifre ve Kasa Yönetim Sistemi

<p align="center">
  <img src="https://media.giphy.com/media/Y4ak9Ki2GZCbJxAnJD/giphy.gif" width="150px">
</p>

<p align="center">
  <b>Electron.js ve modern kriptografi mimarisi üzerine kurulu, gizlilik odaklı masaüstü kasa paneli.</b><br>
  Şifrelerinizi yerel bir veritabanında saklamak, güvenlik analizleri yapmak ve hassas verilerinizi korumak için tasarlanmıştır.
</p>

---

## 🚀 Özellikler

- ✔ **Argon2 Şifreleme:** Master password ve kayıtlı verileriniz, dünyanın en güvenli hashing algoritmalarından biri olan Argon2 ile korunur.
- ✔ **Güvenlik Analizleri (Charts):** Kayıtlı şifrelerinizin karmaşıklık düzeyini ve güvenlik puanını grafiklerle (Chart.js) anlık takip edin.
- ✔ **Yerel Veritabanı:** Verileriniz bulutta değil, tamamen sizin kontrolünüzde, cihazınızdaki SQLite veritabanında saklanır.
- ✔ **Güvenlik Soruları:** Şifre sıfırlama ve kurtarma süreçleri için özelleştirilebilir ek güvenlik katmanı.
- ✔ **Modern Arayüz:** Sade, kullanıcı dostu ve verimlilik odaklı masaüstü deneyimi.

<p align="center">
  <img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black&style=flat-square">
  <img src="https://img.shields.io/badge/Framework-Electron-47848F?logo=electron&logoColor=white&style=flat-square">
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white&style=flat-square">
  <img src="https://img.shields.io/badge/Encryption-Argon2-orange?logo=lock&logoColor=white&style=flat-square">
  <img src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square">
</p>

---

## 🧠 Sistem Nasıl Çalışır?

Uygulama, **Local-First** (Önce Yerel) prensibiyle çalışır:

### 1️⃣ Master Password Güvenliği
- Uygulama ilk açılışta bir ana şifre oluşturmanızı ister. Bu şifre Argon2 ile hashlenerek veritabanına kaydedilir. Ana şifre olmadan veritabanı içeriği okunamaz.

### 2️⃣ Şifre Saklama ve Yönetim
- Kaydedilen her şifre, veritabanına eklenmeden önce şifreleme katmanından geçer.
- Uygulama içindeki dashboard, şifrelerinizin ne kadar "güçlü" olduğunu matematiksel olarak hesaplar ve görselleştirir.

### 3️⃣ Veri Gizliliği
- Sistem, verileri Windows üzerinde `AppData/Roaming/MyVault` klasörü içindeki `vault.db` dosyasında tutar. 
- Verileriniz asla bir sunucuya gönderilmez, bu da "Zero-Knowledge" (Sıfır Bilgi) güvenliği sağlar.

---

## 🛠️ Kurulum ve Çalıştırma

Bu proje Node.js tabanlıdır. Bilgisayarınızda Node.js yüklü olmalıdır.

### 1️⃣ Projeyi İndirin
```bash
git clone [https://github.com/Zyix-code/MyVault.git](https://github.com/Zyix-code/MyVault.git)
cd MyVault
```

### 2️⃣ Kütüphaneleri Yükleyin
```bash
npm install
```

### 3️⃣ Başlatma
Uygulamayı geliştirici modunda çalıştırmak için:
```bash
npm start
```

### 4️⃣ Build (Exe Alma)
Kendi kurulabilir Windows uygulamanızı oluşturmak için:
```bash
npm run build
```

### ⚖️ Lisans
Bu proje GNU General Public License v3.0 ile lisanslanmıştır. zyixcode tarafından geliştirilen bu projeyi, lisans koşullarına uyarak özgürce kullanabilirsiniz.

### 🤝 Geliştirici
<p align="left"> <a href="https://discordapp.com/users/481831692399673375"><img src="https://img.shields.io/badge/Discord-Zyix%231002-7289DA?logo=discord&style=flat-square"></a> <a href="https://www.youtube.com/channel/UC7uBi3y2HOCLde5MYWECynQ?view_as=subscriber"><img src="https://img.shields.io/badge/YouTube-Subscribe-red?logo=youtube&style=flat-square"></a> <a href="https://www.reddit.com/user/_Zyix"><img src="https://img.shields.io/badge/Reddit-Profile-orange?logo=reddit&style=flat-square"></a> <a href="https://open.spotify.com/user/07288iyoa19459y599jutdex6"><img src="https://img.shields.io/badge/Spotify-Follow-green?logo=spotify&style=flat-square"></a> </p>
Developed with ❤️ by zyixcode
