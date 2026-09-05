# 🎨 Panduan Desain Sistem ODST: Warna & Tipografi (ODST Design System Requirements)

Dokumen ini merupakan panduan standar spesifikasi **Warna (Color Palette)** dan **Tipografi (Typography)** resmi untuk **ODST Group** (*PT. ODST AIRLINES INDO / ODST Travel & Tourism / Finance System*).

---

## 1. 🌈 Palet Warna Resmi ODST (ODST Color Palette)

Sistem warna ODST dirancang untuk memberikan kesan profesional, terpercaya, modern, dan presisi tinggi pada aplikasi keuangan dan operasional.

### 🔷 A. Warna Utama (Brand & Primary Colors)
Warna identitas utama yang digunakan pada sidebar, header, navbar, dan elemen branding.

| Nama Warna | Kode HEX | RGB | HSL | Penggunaan Utama | Kelas Tailwind |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ODST Deep Navy** | `#242E69` | `rgb(36, 46, 105)` | `hsl(231, 49%, 28%)` | Background Sidebar, Primary Brand Navbar, Brand Header | `bg-[#242e69]` |
| **ODST Navy Hover** | `#303C7C` | `rgb(48, 60, 124)` | `hsl(231, 44%, 34%)` | Hover Menu Sidebar, Border Divider Sidebar | `hover:bg-[#303c7c]` `border-[#303c7c]` |
| **ODST Navy Muted** | `#A0A8CC` | `rgb(160, 168, 204)` | `hsl(229, 32%, 71%)` | Subtitle role di sidebar, teks keterangan sekunder | `text-[#a0a8cc]` |
| **ODST Dark Slate** | `#192F5D` | `rgb(25, 47, 93)` | `hsl(221, 58%, 23%)` | Header tabel formal, aksen gelap resmi | `bg-[#192f5d]` |

---

### 🔶 B. Warna Aksen & Interaksi (Accent & Action Colors)
Digunakan untuk tombol tindakan (Call-to-Action), menu navigasi aktif, badge highlight, dan fokus interaktif.

| Nama Warna | Kode HEX | RGB | HSL | Penggunaan Utama | Kelas Tailwind |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ODST Amber Gold** | `#F59E0B` | `rgb(245, 158, 11)` | `hsl(38, 92%, 50%)` | Menu Aktif (Active Tab/Nav), Tombol Warning, Highlight | `bg-[#f59e0b]` `text-[#f59e0b]` |
| **ODST Action Blue** | `#007AFF` | `rgb(0, 122, 255)` | `hsl(211, 100%, 50%)` | Tombol Submit/Action, Active Pill, Focus Ring Input | `bg-[#007aff]` `text-[#007aff]` `focus:ring-[#007aff]` |
| **ODST Sky Blue** | `#3B82F6` | `rgb(59, 130, 246)` | `hsl(217, 91%, 60%)` | Toggle Checkbox checked, Link info, Badge status | `bg-[#3b82f6]` `text-[#3b82f6]` |

---

### ⚪ C. Warna Netral & Latar Belakang (Neutral & Background Colors)
Digunakan untuk latar belakang halaman, kartu panel, border pemisah, dan teks isi.

| Nama Warna | Kode HEX | RGB | HSL | Penggunaan Utama | Kelas Tailwind |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Canvas** | `#F8FAFC` | `rgb(248, 250, 252)` | `hsl(210, 40%, 98%)` | Background utama seluruh halaman aplikasi | `bg-[#f8fafc]` (`bg-slate-50`) |
| **Card / Surface** | `#FFFFFF` | `rgb(255, 255, 255)` | `hsl(0, 0%, 100%)` | Container kartu, modal popup, dropdown | `bg-white` |
| **Text Primary (Dark)** | `#0C0D0F` | `rgb(12, 13, 15)` | `hsl(220, 11%, 5%)` | Judul halaman, heading form, angka total | `text-[#0c0d0f]` |
| **Text Body** | `#1C1E21` | `rgb(28, 30, 33)` | `hsl(216, 8%, 12%)` | Teks paragraf, isi tabel, nilai input | `text-[#1c1e21]` |
| **Text Muted / Placeholder** | `#75777C` | `rgb(117, 119, 124)` | `hsl(223, 3%, 47%)` | Label form, placeholder input, timestamp | `text-[#75777c]` `text-slate-500` |
| **Border Line / Stroke** | `#E2E4E8` | `rgb(226, 228, 232)` | `hsl(220, 13%, 90%)` | Border input form, garis batas kartu dan tabel | `border-[#e2e4e8]` |

---

### 🚦 D. Warna Status & Feedback Sistem (System Status Colors)
Digunakan untuk status invoice, reservasi hotel, validasi error, notifikasi sukses, dan tag peringatan.

| Status | HEX Background | HEX Border | HEX Text / Icon | Contoh Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Success (Paid / Done)** | `#ECFDF5` (`bg-emerald-50`) | `#A7F3D0` (`border-emerald-200`) | `#10B981` / `#059669` | Status *"Paid"*, *"Confirmed"*, *"Success"* |
| **Warning (Pending / Maint)** | `#FFFBEB` (`bg-amber-50`) | `#FDE68A` (`border-amber-200`) | `#D97706` / `#F59E0B` | Status *"Pending"*, Mode Maintenance, Warning Alert |
| **Danger (Overdue / Error)** | `#FEF2F2` (`bg-red-50`) | `#FCA5A5` (`border-red-200`) | `#EF4444` / `#DC2626` | Status *"Overdue"*, *"Rejected"*, Error Validasi Form |
| **Info / Draft** | `#F0F9FF` (`bg-sky-50`) | `#BAE6FD` (`border-sky-200`) | `#0284C7` / `#0369A1` | Status *"Draft"*, *"In Review"*, Tips & Info |

---

## 2. 🔤 Standar Tipografi ODST (ODST Typography System)

Sistem tipografi ODST menggunakan kombinasi font sans-serif modern berlisensi terbuka melalui Google Fonts:

```html
<!-- Google Fonts Embed URL -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
```

### 📋 A. Keluarga Font & Pembagian Peran (Font Family Roles)

| Font Family | Peran Utama | Karakter & Kegunaan | Kelas Tailwind |
| :--- | :--- | :--- | :--- |
| **Poppins** | **Brand & Heading Utama** | Modern, geometris, elegan. Digunakan untuk Judul Halaman, Hero Title, Card Header, Brand Display. | `font-sans` atau `font-['Poppins']` |
| **Inter** | **UI, Menu & Navigasi** | Sangat terbaca di layar digital pada ukuran kecil. Digunakan untuk Menu Sidebar, Tab, Button, Tooltip, Badge. | `font-inter` |
| **Roboto** | **Data Form, Tabel & Angka Finansial** | Ramping, teratur, presisi. Digunakan untuk input textfield, kolom data tabel, nominal mata uang (SAR/USD/IDR), Invoice PDF. | `font-roboto` |
| **SF Pro Display** | **Aksen Modern / iOS Fallback** | Tampilan premium untuk metrik analitik dashboard dan angka KPI. | `font-sfpro` |

---

### 📐 B. Skala Ukuran & Bobot Font (Font Size & Weight Hierarchy)

| Tingkatan | Ukuran (Size) | Line Height | Font Weight | Font Family | Contoh Penerapan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / H1** | `24px` - `28px` (`text-2xl` / `text-[26px]`) | `1.25` | `700` (Bold) | `Poppins` | Judul Utama Dashboard, Login Welcome Header |
| **Heading / H2** | `20px` - `22px` (`text-xl` / `text-[20px]`) | `1.3` | `600` (SemiBold) | `Poppins` | Judul Section, Judul Modal Dialog, Judul Halaman Modul |
| **Subheading / H3** | `16px` - `18px` (`text-lg` / `text-[16px]`) | `1.4` | `600` (SemiBold) | `Poppins` / `Inter` | Judul Widget Kartu, Header Tabel, Nama Kategori |
| **Body Medium** | `14px` (`text-[14px]` / `text-sm`) | `1.5` | `400` / `500` | `Inter` | Menu Sidebar, Tombol Navigasi, Teks Paragraf Standar |
| **Body Regular** | `13px` (`text-[13px]`) | `1.5` | `400` / `500` | `Roboto` / `Inter` | Field Input Form, Isi Sel Tabel Keuangan, Deskripsi |
| **Caption / Label** | `11px` - `12px` (`text-[11px]` / `text-xs`) | `1.4` | `500` / `600` | `Inter` | Label Form Input, Tag Status Badge, Timestamp, Role Subtitle |
| **Micro / Subtext** | `9px` - `10px` (`text-[9px]`) | `1.2` | `700` (Bold) | `Inter` | Badge Maintenance Mini, Keterangan Flag Bahasa |

---

## 3. 💻 Konfigurasi Kode (Code Snippets)

### A. CSS Variables (`:root`)
Tambahkan ke dalam file `index.css`:

```css
:root {
  /* ODST Brand Colors */
  --odst-navy-primary: #242e69;
  --odst-navy-hover: #303c7c;
  --odst-navy-muted: #a0a8cc;
  --odst-accent-amber: #f59e0b;
  --odst-accent-blue: #007aff;
  
  /* Canvas & Text */
  --odst-bg-canvas: #f8fafc;
  --odst-surface-white: #ffffff;
  --odst-text-dark: #0c0d0f;
  --odst-text-body: #1c1e21;
  --odst-text-muted: #75777c;
  --odst-border-line: #e2e4e8;

  /* Typography */
  --font-heading: 'Poppins', sans-serif;
  --font-interface: 'Inter', sans-serif;
  --font-data: 'Roboto', sans-serif;
}
```

### B. Tailwind Configuration (`tailwind.config.js`)
Konfigurasi font dan warna pada project frontend:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odst: {
          navy: '#242e69',
          'navy-hover': '#303c7c',
          'navy-muted': '#a0a8cc',
          amber: '#f59e0b',
          blue: '#007aff',
          canvas: '#f8fafc',
          border: '#e2e4e8',
          text: '#0c0d0f',
          muted: '#75777c',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        sfpro: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

---

## 4. 📌 Aturan Penggunaan (Design Rules & Guidelines)

1. **Konsistensi Latar Belakang**: Latar belakang aplikasi selalu menggunakan `#F8FAFC` untuk tampilan terang yang bersih dan ramah di mata.
2. **Kontras & Keterbacaan**: Pastikan teks di atas latar `#242E69` (Sidebar) selalu berwarna putih `#FFFFFF` atau `#A0A8CC` untuk subteks.
3. **Pemisah (Divider)**: Gunakan border tipis `1px` dengan warna `#303C7C` di area gelap (sidebar) dan `#E2E4E8` di area terang (kartu & tabel).
4. **Angka dan Nilai Finansial**: Selalu gunakan font `Roboto` atau `Inter` untuk angka/tabel keuangan agar susunan angka sejajar dan mudah dibaca saat kalkulasi.
