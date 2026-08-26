# 🌐 Panduan Deployment di VPS (Ubuntu 22.04 / 24.04)

Dokumen ini menjelaskan langkah demi langkah untuk meng-hosting sistem keuangan **Manazil AL.Mukhtara Group** di Virtual Private Server (VPS) menggunakan **PM2** (sebagai manager proses backend Node.js) dan **Nginx** (sebagai web server frontend dan reverse proxy API).

---

## 🏗️ Gambaran Arsitektur Deployment

*   **Frontend**: File statis hasil build (`dist/`) disajikan langsung oleh Nginx pada Port `80` (HTTP) / `443` (HTTPS).
*   **Backend (Microservices)**: Seluruh service backend berjalan di Node.js menggunakan PM2 pada port internal masing-masing.
*   **API Gateway**: Berjalan pada Port `5000` di PM2. Nginx akan mengarahkan semua request `/api/*` ke API Gateway ini, yang kemudian mendistribusikannya ke layanan backend yang sesuai.
*   **Database**: Tetap menggunakan **Aiven MySQL** yang sudah aktif di cloud.

---

## 🛠️ Langkah 1: Persiapan Server VPS

Hubungkan ke VPS Anda via SSH dan lakukan pembaruan sistem:
```bash
sudo apt update && sudo apt upgrade -y
```

### 1. Instal Node.js (v18 atau v20)
Instal Node.js menggunakan Node Source:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Verifikasi instalasi:
```bash
node -v
npm -v
```

### 2. Instal PM2 (Process Manager) secara Global
PM2 digunakan agar service backend Node.js terus berjalan di latar belakang dan otomatis menyala kembali jika server restart.
```bash
sudo npm install pm2 -g
```

### 3. Instal Nginx (Web Server & Reverse Proxy)
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Instal MySQL Server (Lokal Database)
Instal database engine MySQL langsung di VPS Anda:
```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
```

Amankan instalasi database Anda:
```bash
sudo mysql_secure_installation
```

Masuk ke konsol MySQL sebagai administrator utama (root) untuk membuat database dan akun user baru:
```bash
sudo mysql
```

Jalankan query SQL berikut di dalam konsol MySQL:
```sql
CREATE DATABASE finance_db;
CREATE USER 'finance_user'@'localhost' IDENTIFIED BY 'PasswordKuatAnda123!';
GRANT ALL PRIVILEGES ON finance_db.* TO 'finance_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📁 Langkah 2: Kloning & Pengaturan Repositori

### 1. Kloning Repositori Git
Masuk ke direktori web server dan kloning kode aplikasi Anda:
```bash
cd /var/www
sudo git clone https://github.com/dimasalvarizk/finance-system.git
sudo chown -R $USER:$USER /var/www/finance-system
cd finance-system
```

### 2. Instalasi Seluruh Dependensi
Jalankan perintah penginstalan massal di root folder:
```bash
npm install
npm run install:all
```

### 3. Pengaturan File `.env` di Server
Buat dan lengkapi file `.env` di setiap service backend (`backend/auth-service/`, `backend/invoice-service/`, dll.). 

Pastikan variabel database mengarah ke database lokal VPS Anda (jika memilih opsi database dalam 1 VPS):
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=finance_user
DB_PASSWORD=PasswordKuatAnda123!
DB_NAME=finance_db
```
*(Atau gunakan opsi Aiven MySQL yang sudah Anda miliki jika ingin tetap di cloud).*

Pada `.env` di `finance-frontend/`, buat file `.env` produksi:
```env
VITE_SETTING_API_URL=https://domain-anda.com
```
*(Ganti `domain-anda.com` dengan IP VPS Anda atau nama domain asli jika sudah diarahkan).*

### 4. Ekspor Data dari Aiven & Impor ke Local MySQL VPS (Migrasi Data)
Jika Anda memilih memindahkan data yang sudah ada dari Aiven Cloud ke database lokal VPS Anda:

1. **Unduh (Dump) Data dari Aiven**:
   Jalankan perintah berikut di terminal komputer lokal Anda untuk mengunduh seluruh skema dan isi database Aiven ke file `backup.sql`:
   ```bash
   mysqldump --host=mysql-2eb97f07-alvarizkidimas-adc9.d.aivencloud.com --port=10443 --user=avnadmin --password=AVNS_9ySGvnNH6nEdcZHIGI4 --ssl-mode=REQUIRED defaultdb > backup.sql
   ```
2. **Kirim file `backup.sql` ke VPS**:
   Gunakan perintah SCP atau program SFTP (seperti FileZilla) untuk mengunggah file backup tersebut ke direktori VPS Anda:
   ```bash
   scp backup.sql user-vps@ip-vps-anda:/var/www/
   ```
3. **Impor ke Local MySQL di VPS**:
   Jalankan perintah berikut di dalam terminal VPS Anda:
   ```bash
   mysql -u finance_user -p finance_db < /var/www/backup.sql
   ```

---

## 🚀 Langkah 3: Menjalankan Backend dengan PM2

Buat konfigurasi file orkestrasi PM2 di root direktori proyek bernama `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "api-gateway",
      script: "index.js",
      cwd: "./backend/api-gateway",
      env: { PORT: 5000, NODE_ENV: "production" }
    },
    {
      name: "auth-service",
      script: "index.js",
      cwd: "./backend/auth-service",
      env: { PORT: 5001, NODE_ENV: "production" }
    },
    {
      name: "invoice-service",
      script: "index.js",
      cwd: "./backend/invoice-service",
      env: { PORT: 5002, NODE_ENV: "production" }
    },
    {
      name: "request-service",
      script: "index.js",
      cwd: "./backend/request-service",
      env: { PORT: 5003, NODE_ENV: "production" }
    },
    {
      name: "company-service",
      script: "index.js",
      cwd: "./backend/company-service",
      env: { PORT: 5004, NODE_ENV: "production" }
    },
    {
      name: "setting-service",
      script: "index.js",
      cwd: "./backend/setting-service",
      env: { PORT: 5005, NODE_ENV: "production" }
    }
  ]
};
```

Jalankan seluruh microservices backend sekaligus dengan PM2:
```bash
pm2 start ecosystem.config.cjs
```

Simpan daftar proses PM2 agar otomatis berjalan saat VPS restart:
```bash
pm2 save
pm2 startup
```
*(Ikuti perintah output yang ditampilkan di terminal untuk menyelesaikan konfigurasi startup).*

---

## 🖥️ Langkah 4: Build & Sajikan Frontend dengan Nginx

### 1. Build Frontend React
Masuk ke folder frontend dan lakukan kompilasi aset produksi:
```bash
cd /var/www/finance-system/finance-frontend
npm run build
```
Proses ini akan menghasilkan folder `/var/www/finance-system/finance-frontend/dist` berisi file HTML/JS/CSS statis.

### 2. Konfigurasi Server Block Nginx
Buat file konfigurasi baru untuk aplikasi Anda di Nginx:
```bash
sudo nano /etc/nginx/sites-available/finance-system
```

Salin konfigurasi berikut (ganti `domain-anda.com` dengan domain/IP Anda):
```nginx
server {
    listen 80;
    server_name domain-anda.com www.domain-anda.com;

    # Folder static build React
    root /var/www/finance-system/finance-frontend/dist;
    index index.html;

    # Dukungan routing React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Teruskan request /api ke API Gateway (Port 5000)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Penanganan CORS dan headers tambahan jika diperlukan
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Aktifkan konfigurasi tersebut dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/finance-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Langkah 5: Keamanan & SSL (Let's Encrypt HTTPS)

Direkomendasikan menggunakan HTTPS (SSL gratis Let's Encrypt) demi keamanan transmisi JWT dan data keuangan:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```
*Ikuti langkah interaktif di layar, pilih opsi untuk mengalihkan (redirect) seluruh lalu lintas HTTP ke HTTPS.*

---

## 📊 Langkah 6: Monitoring Proses

Untuk memantau log aktivitas backend dan memastikan semuanya berjalan lancar di VPS, Anda dapat menggunakan command berikut:

*   Melihat dashboard monitor real-time PM2: `pm2 monit`
*   Melihat log output secara langsung: `pm2 logs`
*   Melihat status service: `pm2 status`
