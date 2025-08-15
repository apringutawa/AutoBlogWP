# Panduan Pengguna — AutoBlog WordPress (Apps Script)

## 1) Apa ini?
Otomatisasi pembuatan artikel Bahasa Indonesia dari sumber RSS/Atom, lengkap dengan gambar, monetisasi, taxonomy, dan publish ke WordPress. Judul otomatis diterjemahkan ke Bahasa Indonesia.

## 2) Persiapan
- WordPress dengan REST API aktif (disarankan pakai App Password).
- API keys:
  - Gemini (Google AI Studio v1)
  - Pexels / Pixabay / Unsplash (minimal satu)
- Google Spreadsheet baru (sebagai dashboard/monitoring).

## 3) Instalasi
1. Buka spreadsheet → **Extensions → Apps Script**.
2. Tempel `Code.gs`.
3. Jalankan `setupAll()` (buat sheet + seed Script Properties).
4. Buka **Project Settings → Script Properties** → isi semua kunci & opsi.
5. Kembali ke spreadsheet, menu **AutoBlog** akan muncul.

## 4) Konfigurasi Utama
- `WORDPRESS_SITE`, `WORDPRESS_USER`, `WORDPRESS_PASSWORD`
- `GEMINI_API_KEY`
- `RSS_FEEDS` → CSV / per-baris / JSON array
- `RUN_POST_LIMIT`, `DAILY_POST_LIMIT`
- `IMAGE_PROVIDERS` + API keys yang ada
- `TAXONOMY_SOURCE` (`props`/`sheet`) & `TAXONOMY_JSON`

## 5) Cara Pakai
- **Run sekarang**: proses batch `Pending` hingga limit per-run/harian.
- **Setup Daily Trigger**: jadwalkan otomatis setiap 8 jam.
- **Import/Export Props ke sheet Secrets**: manajemen kunci mudah.
- **Buka Dashboard**: lihat ringkasan harian.

## 6) Alur Teknis
1. **Fetch RSS/Atom** → tambah baris `Pending` (TitleEN, SourceURL, Feed, Domain).
2. **Processing**:
   - Translate **TitleEN → TitleID** (ID)
   - Scrape sumber → ringkasan teks
   - Generate artikel HTML (ID) via Gemini
   - Sisipkan monetisasi (Adsense + Shopee box)
   - Ambil gambar (rotasi provider)
   - Map kategori & tag (taxonomy props/sheet, auto-create jika perlu)
   - Upload media + publish post ke WordPress
3. Update status menjadi **Posted** + isi kolom PostURL, PostID, MediaID.

## 7) Sheet
- **AutoBlog**: monitoring utama (status, error, provider).
- **Content**: menyimpan HTML final artikel.
- **Taxonomy** (opsional): `Keyword | CategoryIDs | CategoryNames | Tags`.

## 8) Tips
- Tambah feed dengan mengedit `RSS_FEEDS` di Script Properties (CSV/JSON/baris).
- Ubah frekuensi trigger di `setupDailyTrigger()`.
- Mode uji: ubah `postToWordPress()` → gunakan `status:'draft'`.

## 9) Troubleshooting
- RSS invalid → pastikan URL valid, gunakan JSON array jika perlu.
- Gemini 404 → periksa nama model: `gemini-2.5-flash` / `gemini-2.5-pro`.
- WP 401/403 → cek kredensial & hak akses user.
- Konten pendek → scraper gagal; coba sumber lain.
- Tidak ada gambar → periksa API key minimal satu provider.

## 10) Keamanan
- Simpan kredensial di **Script Properties** / sheet `Secrets`.
- Jangan commit kunci ke repo publik.
- Gunakan App Password WP khusus agar mudah dicabut bila perlu.
