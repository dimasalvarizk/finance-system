# 🌐 Panduan Deployment VPS Hostinger: Docker Compose (Coolify & Terminal)

Dokumen ini menjelaskan cara melakukan deployment sistem keuangan **Manazil AL.Mukhtara Group** pada VPS Hostinger menggunakan **Docker Compose**. 

Dengan menggunakan Docker Compose, Anda bisa mendeploy seluruh stack aplikasi (6 backend services + 1 frontend) sekaligus menggunakan satu konfigurasi tunggal, baik lewat **Coolify Panel** maupun langsung lewat **Terminal SSH**.

---

## 🏗️ Gambaran Arsitektur Container

*   `api-gateway`: Pintu masuk API publik (Port `5000` di-expose).
*   `finance-frontend`: Halaman web statis disajikan via Nginx (Port `80`/`443` di-expose).
*   `auth-service`, `invoice-service`, `request-service`, `company-service`, `setting-service`: Layanan internal (Port `5001` - `5005` tertutup dari publik, hanya diakses oleh gateway).

---

## 🚀 Opsi A: Deployment Lewat Coolify Panel (Sangat Mudah & Otomatis)

Coolify mendukung deployment multi-container menggunakan Docker Compose secara langsung. Keuntungannya adalah **Coolify yang mengurus SSL (HTTPS) dan Traefik proxy** secara otomatis di latar belakang.

### Langkah-langkah:
1. Buka dashboard Coolify Anda -> **Projects** -> Pilih proyek Anda -> Pilih environment **production**.
2. Klik **Add Resource** -> Pilih **Docker Compose** (pilihan di baris kedua kartu resource).
3. Salin dan tempelkan isi file [docker-compose.yml](file:///d:/Manazil%20AL.Mukhtara%20Group/FinanceSystem/docker-compose.yml) ke dalam editor Coolify.
4. Klik **Save**.
5. Di halaman konfigurasi Coolify, Anda akan melihat daftar semua service yang terdeteksi:
   * **Mengatur Domain Frontend**: Pada service `finance-frontend`, temukan kolom **Domains** lalu masukkan domain Anda: `https://odstfin.io, https://www.odstfin.io`
   * **Mengatur Domain API Gateway**: Pada service `api-gateway`, temukan kolom **Domains** lalu masukkan subdomain API: `https://api.odstfin.io`
   * **Menghubungkan Git Source**: Pastikan source Git repositori Anda diarahkan ke repositori GitHub Anda.
6. Klik **Deploy** di pojok kanan atas. Coolify akan otomatis men-clone, men-build Dockerfile di masing-masing folder, mendaftarkan SSL HTTPS, dan menjalankan kontainer.

---

## 💻 Opsi B: Deployment Lewat Terminal VPS (SSH)

Jika Anda ingin mendeploy langsung menggunakan terminal server Anda:

### Langkah 1: Arahkan DNS Domain
Pastikan domain Anda sudah diarahkan ke IP VPS Anda (**`187.52.126.215`**):
*   `odstfin.io` & `www.odstfin.io` $\rightarrow$ `187.52.126.215`
*   `api.odstfin.io` $\rightarrow$ `187.52.126.215`

### Langkah 2: Masuk ke VPS Anda via SSH
```bash
ssh root@187.52.126.215
```

### Langkah 3: Kloning & Jalankan Docker Compose
1. Pastikan Git, Docker, dan Docker Compose sudah terpasang di VPS Anda.
2. Kloning repositori Anda:
   ```bash
   cd /var/www
   git clone https://github.com/dimasalvarizk/finance-system.git
   cd finance-system
   ```
3. Lengkapi file `.env` di masing-masing folder service (`backend/auth-service/.env`, dll.) dengan detail database Anda.
4. Jalankan seluruh kontainer secara latar belakang (*detached mode*):
   ```bash
   docker compose up --build -d
   ```
5. Cek status container yang berjalan:
   ```bash
   docker compose ps
   ```

---

## 🔒 Konfigurasi Nginx di VPS (Hanya untuk Opsi B Terminal Manual)

Jika Anda menggunakan Opsi B (Terminal SSH manual tanpa Coolify), Anda perlu mengonfigurasi Nginx di VPS Anda sebagai reverse proxy agar traffic domain diarahkan ke kontainer yang tepat.

Buat file konfigurasi Nginx baru:
```bash
sudo nano /etc/nginx/sites-available/finance-system
```

Salin konfigurasi reverse proxy berikut:
```nginx
server {
    listen 80;
    server_name odstfin.io www.odstfin.io;

    location / {
        proxy_pass http://127.0.0.1:80; # Mengarah ke container frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.odstfin.io;

    location / {
        proxy_pass http://127.0.0.1:5000; # Mengarah ke container api-gateway
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Aktifkan konfigurasi dan muat ulang Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/finance-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Gunakan Certbot untuk menginstal SSL HTTPS gratis:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d odstfin.io -d www.odstfin.io -d api.odstfin.io
```
