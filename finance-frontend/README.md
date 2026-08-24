# Finance Frontend System

Aplikasi frontend sistem keuangan (Finance System) yang dibangun menggunakan **React (v19)**, **TypeScript**, **Vite**, dan **Tailwind CSS**. Dokumentasi ini berisi penjelasan mengenai struktur folder, arsitektur aplikasi, serta panduan langkah awal untuk pengembangan.

---

## 🚀 Teknologi Utama

Aplikasi ini menggunakan stack teknologi berikut:
*   **React (v19.2.8)** & **React DOM** - UI Library.
*   **TypeScript (~v6.0.2)** - Typed JavaScript untuk keamanan dan produktivitas kode.
*   **Vite (v8.2.0)** - Next-generation frontend tooling untuk build yang sangat cepat.
*   **React Router Dom (v7.18.2)** - Library routing untuk navigasi multi-halaman.
*   **Axios (v1.19.0)** - HTTP Client untuk komunikasi dengan API backend.
*   **Lucide React (v1.31.0)** - Kumpulan ikon modern.
*   **Tailwind CSS (v3.4.19)** - Utility-first CSS framework untuk pembuatan layout/UI.

---

## 📂 Struktur Folder Proyek

Aplikasi ini menggunakan struktur folder modular di dalam folder `src/` untuk mempermudah pengembangan dan pemeliharaan:

```text
src/
├── assets/         # Aset statis seperti gambar, logo, dan SVG.
├── components/     # Komponen UI reusable (Button, Card, Modal, Sidebar, dll.).
├── context/        # State management global menggunakan React Context (e.g. AuthContext).
├── hooks/          # Custom hooks untuk enkapsulasi logika bisnis (e.g. useAuth).
├── pages/          # Halaman utama aplikasi (Dashboard, Invoices, Settings, dll.).
│   └── Settings/   # Modul Pengaturan Sistem (Settings) terpusat.
│       ├── components/  # Sub-tab halaman Settings yang terbagi secara modular.
│       └── index.tsx    # Halaman utama Settings.
├── routes/         # Konfigurasi routing aplikasi (Protected & Public Routes).
├── services/       # Integrasi API (Axios instance, request endpoints).
├── utils/          # Fungsi utility pembantu (Formatter mata uang, tanggal, dll.).
├── App.css         # Styling global spesifik untuk App.tsx.
├── App.tsx         # Root component.
├── index.css       # File entry CSS (Konfigurasi Tailwind CSS directives).
└── main.tsx        # Entry point aplikasi React.
```

---

## 🗺️ Panduan Arsitektur & Modul Fitur

Berikut adalah detail arsitektur komponen halaman utama dan sub-tab pengaturan yang telah diimplementasikan secara dinamis:

### 1. Halaman Pengaturan Utama (`src/pages/Settings`)
Halaman ini mengintegrasikan seluruh pengaturan administratif sistem dalam bentuk tab navigasi horizontal berbobot font medium (`font-medium`), yang memanggil komponen-komponen terpisah sebagai berikut:

*   **`components/ManageTeamTab.tsx` (Kelola Tim)**
    *   Tabel anggota tim lengkap dengan matriks perizinan (*permission matrix*) hak akses pengguna.
    *   Dialog undangan pendaftaran anggota tim baru secara multi-tahap (Form Data -> Konfirmasi Kirim -> Notifikasi Sukses).
*   **`components/BranchOfficeTab.tsx` (Kantor Cabang)**
    *   Manajemen kantor cabang operasional perusahaan dengan status terkunci pada negara "Indonesia" (*read-only*).
    *   Ringkasan statistik cabang: Total Kantor Cabang, Cabang Aktif, dan Total Staff.
    *   Pembaruan cabang dinamis menggunakan modal dengan input berlatar belakang putih (`bg-white`).
    *   Alur penghapusan cabang multi-tahap yang aman (Modal Warning Confirmation -> Modal Successfully Removed -> Done).
*   **`components/NotificationsTab.tsx` (Notifikasi)**
    *   Pusat preferensi pengiriman notifikasi faktur, persetujuan admin, dan sistem.
    *   Pilihan diatur menggunakan tombol toggle switch interaktif bergaya iOS berwarna oranye/emas yang langsung tersimpan ke `localStorage`.
*   **`components/EditProfileTab.tsx` (Ubah Profil)**
    *   Pengaturan avatar gambar profil serta kolom detail data pribadi pengguna.
    *   Memisahkan isian aktif (latar putih `bg-white`) dan isian tidak aktif / hanya-baca (latar abu-abu `bg-[#f8fafc]` dengan kursor dilarang).
*   **`components/SecurityTab.tsx` (Keamanan)**
    *   Ubah kata sandi pengguna dengan validasi keamanan.
    *   Tabel sesi perangkat aktif dengan fitur pencabutan akses (*Revoke Session*) serta tabel riwayat log masuk dengan detail alamat IP tercetak tebal (`font-semibold`).
*   **`components/ExchangeRateTab.tsx` (Nilai Tukar Mata Harian)**
    *   Formulir input konversi kurs mata uang (USD -> IDR, SAR -> IDR, USD -> SAR).
    *   Dilengkapi dengan gambar bendera negara PNG beresolusi tinggi (AS, Indonesia, Arab Saudi) agar tampil konsisten pada sistem operasi Windows.
    *   Input box isian memanjang penuh ke kanan dengan label mata uang akhiran melayang secara absolut.
    *   Tabel statis riwayat perubahan nilai tukar harian (*Rate History*) dengan baris header `#f8fafc`.
*   **`components/ServicesTab.tsx` (Katalog Layanan)**
    *   Formulir pendaftaran katalog harga layanan standar (seperti Umrah/Hajj Visa, Airport Transfer, Ground Handling) dengan input modal berlatar putih.
    *   Kolom data tabel diposisikan rapat ke kiri berdampingan, dengan tombol Edit dan Remove dipaksa sejajar tanpa patah baris (`whitespace-nowrap`).
    *   Ringkasan statistik katalog tanpa garis pemisah (*no divider*) dan jarak vertikal yang rapat.

### 2. State & Otentikasi (`src/context`)
*   **`AuthContext.tsx`**: Mengelola status autentikasi global pengguna. Menyediakan fungsi `login()`, `logout()`, status loading, dan data `user` saat ini ke seluruh aplikasi.

### 3. Pembantu Umum (`src/utils`)
*   **`formatter.ts`**:
    *   `formatRupiah(amount: number)`: Memformat angka ke Rupiah (e.g. `1250000` -> `Rp 1.250.000`).
    *   `formatDate(dateString: string)`: Menyelaraskan format tanggal dari server ke format lokal.

---

## 🛠️ Langkah Memulai Pengembangan (Quick Start)

### 1. Install Dependensi
Jalankan perintah berikut di root folder proyek (`finance-frontend`):
```bash
npm install
```

### 2. Konfigurasi Awal Tailwind CSS
Pastikan file-file berikut telah diperbarui untuk mengaktifkan Tailwind CSS:

*   **`tailwind.config.js`**:
    ```javascript
    /** @type {import('tailwindcss').Config} */
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    ```

*   **`src/index.css`** (Tambahkan direktif Tailwind di baris teratas):
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

### 3. Jalankan Server Development
Jalankan aplikasi secara lokal:
```bash
npm run dev
```
Buka browser Anda di alamat `http://localhost:5173`.
