# 🌐 Panduan Deployment VPS Hostinger & Coolify (Domain: odstfin.io)

Dokumen ini menjelaskan langkah demi langkah untuk melakukan deployment sistem keuangan **Manazil AL.Mukhtara Group** pada VPS Hostinger menggunakan **Coolify Panel** dengan domain **odstfin.io**.

---

## 🏗️ Gambaran Arsitektur Deployment di Coolify

Untuk menjalankan sistem microservices ini secara optimal di Coolify, kita akan membagi deployment menjadi 3 bagian:
1. **Frontend (React)**: Di-expose secara publik pada domain `https://odstfin.io` dan `https://www.odstfin.io`.
2. **API Gateway Backend**: Di-expose secara publik pada subdomain `https://api.odstfin.io` (Port internal `5000`).
3. **Microservices Backend**: Berjalan secara privat di dalam jaringan Docker internal Coolify (Port `5001` - `5005`). Layanan-layanan ini tidak di-expose ke publik demi alasan keamanan.
4. **Database (MySQL)**: Menggunakan database **Aiven MySQL** (yang saat ini sudah berjalan) atau membuat MySQL container lokal di dalam Coolify.

---

## 🛠️ Langkah 1: Pengaturan DNS Domain (`odstfin.io`)

Sebelum melakukan setup di Coolify, Anda harus mengarahkan DNS domain Anda ke IP VPS Anda (**`187.52.126.215`**).

Masuk ke panel penyedia domain Anda (Hostinger DNS Zone Editor / Cloudflare) dan tambahkan record berikut:

| Type | Host (Name) | Points to (Value) | TTL | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `187.52.126.215` | Default / 3600 | Domain utama untuk Frontend |
| **A** | `www` | `187.52.126.215` | Default / 3600 | Subdomain www untuk Frontend |
| **A** | `api` | `187.52.126.215` | Default / 3600 | Subdomain untuk API Gateway |

> [!NOTE]
> Setelah DNS ditambahkan, biasanya diperlukan waktu propagasi sekitar 5 menit hingga 1 jam sebelum domain aktif sepenuhnya.

---

## 🚀 Langkah 2: Deploy Backend Services di Coolify

Setiap microservice akan dibuat sebagai satu Resource Application di dalam proyek Coolify Anda.

### A. Deploy API Gateway (Pintu Masuk Utama API)
Layanan ini akan meneruskan semua request dari Frontend ke microservices lainnya.
1. Masuk ke dashboard Coolify Anda -> **Projects** -> Pilih proyek Anda -> Pilih environment **production**.
2. Klik **Add Resource** -> Pilih **Git Repository (with GitHub App)** atau **Private Git Repository (with Deploy Key)**.
3. Pilih repositori `finance-system` dan branch `main`.
4. Di halaman konfigurasi utama, atur data berikut:
   * **Base Directory**: `backend/api-gateway`
   * **Build Pack**: `Nixpacks`
   * **Exposed Ports**: `5000`
   * **Domains**: `https://api.odstfin.io` *(Coolify otomatis mengurus SSL HTTPS gratis)*
5. Buka tab **Environment Variables** di menu kiri dan tambahkan variabel berikut:
   * `PORT=5000`
   * `NODE_ENV=production`
   * `JWT_SECRET=gunakan_jwt_secret_kemarin_di_local`
6. Klik **Actions** -> **Deploy**.

---

### B. Deploy Microservices Lainnya (Internal Only)
Lakukan langkah yang sama untuk microservices berikut. Layanan-layanan ini **tidak memerlukan** domain publik.

#### 1. Auth Service (`backend/auth-service`)
* **Base Directory**: `backend/auth-service`
* **Build Pack**: `Nixpacks`
* **Exposed Ports**: `5001`
* **Env Variables**:
  * `PORT=5001`
  * `NODE_ENV=production`
  * `JWT_SECRET=jwt_secret_anda`
  * `DB_HOST=host_database_aiven`
  * `DB_PORT=port_database_aiven`
  * `DB_USER=user_database_aiven`
  * `DB_PASSWORD=password_database_aiven`
  * `DB_NAME=defaultdb`

#### 2. Invoice Service (`backend/invoice-service`)
* **Base Directory**: `backend/invoice-service`
* **Build Pack**: `Nixpacks`
* **Exposed Ports**: `5002`
* **Env Variables**: Sediakan variabel port `5002` dan kredensial database Aiven MySQL yang sama seperti di atas.

#### 3. Request Service (`backend/request-service`)
* **Base Directory**: `backend/request-service`
* **Build Pack**: `Nixpacks`
* **Exposed Ports**: `5003`
* **Env Variables**: Sediakan variabel port `5003` dan kredensial database Aiven MySQL yang sama seperti di atas.

#### 4. Company Service (`backend/company-service`)
* **Base Directory**: `backend/company-service`
* **Build Pack**: `Nixpacks`
* **Exposed Ports**: `5004`
* **Env Variables**: Sediakan variabel port `5004` dan kredensial database Aiven MySQL yang sama seperti di atas.

#### 5. Setting Service (`backend/setting-service`)
* **Base Directory**: `backend/setting-service`
* **Build Pack**: `Nixpacks`
* **Exposed Ports**: `5005`
* **Env Variables**: Sediakan variabel port `5005` dan kredensial database Aiven MySQL yang sama seperti di atas.

---

## 🖥️ Langkah 3: Deploy Frontend (`finance-frontend`)

Aplikasi Frontend akan mengompilasi React static files dan disajikan menggunakan Nginx internal bawaan Coolify.

1. Di dashboard Coolify, klik **Add Resource** -> Pilih Repositori GitHub Anda.
2. Atur konfigurasi utama sebagai berikut:
   * **Base Directory**: `finance-frontend`
   * **Build Pack**: `Nixpacks` (Coolify akan mendeteksi `package.json` React, otomatis menjalankan `npm run build` dan menyajikannya).
   * **Domains**: `https://odstfin.io, https://www.odstfin.io` *(Pisahkan dengan koma untuk mendaftarkan kedua domain)*
3. Buka tab **Environment Variables** di menu kiri dan tambahkan:
   * `VITE_SETTING_API_URL=https://api.odstfin.io` *(Ini wajib agar frontend Anda tahu ke mana harus menembak API Gateway)*
4. Klik **Actions** -> **Deploy**.

---

## 🔍 Cara Verifikasi & Monitoring

Setelah semua container berstatus **Running** (bulatan hijau di Coolify):

1. **Buka Aplikasi**: Akses `https://odstfin.io` di browser Anda. Pastikan ikon gembok SSL (HTTPS) sudah aktif dan aman.
2. **Cek Log Deployment**: Jika ada kegagalan build pada salah satu service, klik menu **Deployment Logs** di bagian kali bawah menu aplikasi bersangkutan untuk melihat pesan errornya.
3. **Cek Log Runtime**: Jika aplikasi berjalan tetapi tidak bisa diakses/error API, klik menu **Runtime Logs** untuk melihat error log secara real-time.
