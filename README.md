# OS-QUEST: Platform Praktikum & Post-Test Sistem Operasi (Modul 2)

Platform website interaktif berbasis web yang mensimulasikan lingkungan **Ubuntu Server** secara autentik untuk kegiatan **Post-Test Praktikum Sistem Operasi** dengan sistem **gamifikasi berbasis level** (quest).

---

## 🚀 Fitur Utama

### 1. Terminal Ubuntu Server Interaktif
- **Shell Realistis**: Menggunakan prompt `praktikan@ubuntu-server:~$ ` yang otomatis menyesuaikan path folder kerja aktif (`~` untuk `/home/praktikan`).
- **Autentikasi & Error Handling Linux**: Pesan kesalahan autentik seperti pada Ubuntu Server:
  - `bash: <perintah>: command not found` (exit code 127)
  - `cat: <file>: No such file or directory` (exit code 1)
  - `mkdir: cannot create directory '<dir>': File exists`
  - `rm: cannot remove '<dir>': Is a directory`
- **Fitur Terminal**:
  - History perintah dengan tombol panah atas/bawah (↑ / ↓).
  - Autocomplete perintah dan nama file dengan tombol <kbd>Tab</kbd>.
  - Sinyal pembatalan / interupsi dengan tombol <kbd>Ctrl+C</kbd> (baik melalui keyboard maupun tombol UI).
  - Pembersih layar dengan perintah `clear` atau shortcut <kbd>Ctrl+L</kbd>.
- **Text Editor GNU nano Terintegrasi**:
  - Mengetik `nano <file>` membuka editor terminal GNU nano 6.2 interaktif secara overlay di atas terminal.
  - Mendukung penulisan buffer, shortcut `^O` / `^S` (WriteOut / Save), dan `^X` (Exit) dengan konfirmasi penyimpanan.
  - Editor di-overlay secara absolut sehingga tidak terpengaruh oleh scroll terminal — tidak lagi menghilang/blank.
- **Dukungan Multiline `cat > file.txt`**:
  - Input interaktif baris demi baris hingga praktikan menekan <kbd>Ctrl+D</kbd>.
- **Simulasi Proses `ps`, `top`, dan Web Server `apache2`**:
  - `ps -e -T` menampilkan Process ID (PID) dan Thread (SPID) semua proses.
  - `ps -T -p $$` menampilkan thread dari proses bash terminal aktif (PID 2045).
  - `top` menampilkan dashboard beban CPU, Memori, dan daftar task aktif secara interaktif (tekan `q` untuk keluar).
  - `systemctl start/stop/restart/status apache2` dan `pkill apache2` untuk simulasi manajemen daemon.
- **Dukungan Redirection & Pipeline Lanjut**:
  - Output redirection: `> file`, `>> file` (append), `2> file` (stderr).
  - Input redirection: `< file`.
  - Pipeline: `cmd1 | cmd2 | cmd3`.
  - Sorting kolom: `sort -t '_' -k2,2 file.txt`.
  - Environment variable prefix: `LC_ALL=C sort ...` didukung.

### 2. Gamifikasi Quest Berlevel — Kurikulum Aktif

Praktikan **hanya dapat mengakses level berikutnya setelah seluruh soal pada level aktif berhasil diselesaikan**. Setiap level memuat tepat **5 soal unik tanpa pengulangan**:

| Level | Judul | Topik Utama | Soal | Bobot/Soal | Total |
|:---:|:---|:---|:---:|:---:|:---:|
| **1** | Proses dan Thread | `ps -e -T`, `ps -T -p $$`, `top`, `systemctl` | 5 | 2 | 10 |
| **2** | Input & Output Redirection Cat | `mkdir`, `cat > file`, `cat < file`, `file` | 5 | 2 | 10 |
| **3** | Pengeditan File Nano | `nano profil.txt`, edit, save, `cat < profil.txt` | 5 | 2 | 10 |
| **4** | Output Redirection Echo | `echo "..." > file`, `echo "..." >> file`, `cat` | 5 | 2 | 10 |
| **5** | Pipeline Sort & Wc | `cat > peralatan.txt`, `sort`, `sort -r`, `cat \| wc` | 5 | 2 | 10 |
| **6** | Pipeline Grep | `cat > komponen.txt`, `grep "tor"`, `grep \| sort`, `grep \| wc -l` | 5 | 2 | 10 |
| **7** | Kombinasi Redirection & Pipeline | `sort -t '_' -k2,2 ... >`, `grep`, `grep \| wc -l`, `grep ... >` | 5 | 4 | 20 |
| **8** | Studi Kasus Pemeriksaan Alat | `mkdir -p`, `cat > pemeriksaan.txt`, `sort -k2,2 >`, `grep >`, `rekap + 2>` | 5 | 4 | 20 |

> **Total**: 40 Soal unik (8 Level × 5 Soal) | Nilai Maksimal: **100 Poin**

---

## 📋 Soal Post-Test (Bagian I)

### Petunjuk Umum
1. Praktikan wajib mengerjakan soal secara berurutan mulai dari Level 1 hingga Level 8.
2. Setiap level terdiri dari 5 soal.
3. Praktikan harus menyelesaikan seluruh soal dalam satu level sebelum dapat melanjutkan ke level berikutnya.
4. Seluruh pengerjaan dilakukan secara langsung melalui terminal Linux yang tersedia.
5. Sistem akan memeriksa perintah serta hasil pengerjaan praktikan.
6. Praktikan dapat menggunakan fitur petunjuk apabila mengalami kesulitan. Setiap penggunaan petunjuk akan mengurangi nilai.
7. Waktu pengerjaan keseluruhan adalah **25 menit**.

---

### Level 1 — Proses dan Thread *(Mudah | 2 Menit)*
| Soal | Deskripsi |
|---|---|
| **1.1** | Tampilkan seluruh proses yang sedang berjalan pada sistem Linux beserta informasi thread dari masing-masing proses. |
| **1.2** | Tampilkan informasi thread dari proses terminal yang sedang digunakan. Gunakan PID proses terminal tersebut sebagai acuan. |
| **1.3** | Jalankan tampilan pemantauan proses Linux secara interaktif untuk melihat penggunaan sumber daya sistem. |
| **1.4** | Periksa status layanan Apache2 untuk mengetahui apakah layanan tersebut sedang berjalan atau tidak. |
| **1.5** | Hentikan layanan Apache2 yang sedang berjalan, kemudian jalankan kembali layanan tersebut menggunakan mekanisme restart. |

### Level 2 — Input dan Output Redirection Menggunakan Cat *(Mudah | 2 Menit)*
| Soal | Deskripsi |
|---|---|
| **2.1** | Buat direktori bernama `Level2`, kemudian masuk ke dalam direktori tersebut. |
| **2.2** | Buat subdirektori bernama `Data_Akademik` di dalam direktori `Level2`, kemudian masuk ke dalamnya. |
| **2.3** | Buat file bernama `jadwal.txt` yang berisi: Senin, Selasa, Rabu, Kamis (masing-masing satu baris). |
| **2.4** | Tampilkan seluruh isi file `jadwal.txt` menggunakan mekanisme input redirection. |
| **2.5** | Periksa jenis file `jadwal.txt` menggunakan perintah pemeriksaan tipe file. |

### Level 3 — Pengeditan File Menggunakan Nano *(Mudah–Menengah | 2 Menit)*
| Soal | Deskripsi |
|---|---|
| **3.1** | Buat direktori bernama `Level3`, kemudian masuk ke dalamnya. |
| **3.2** | Buat sebuah file bernama `profil.txt` menggunakan editor teks nano. |
| **3.3** | Masukkan: Nama, NPM, Program Studi: Teknik Elektro, Universitas: Universitas Lampung ke dalam `profil.txt`. |
| **3.4** | Simpan perubahan pada file `profil.txt` dan keluar dari editor nano. |
| **3.5** | Tampilkan kembali seluruh isi file `profil.txt` melalui terminal. |

### Level 4 — Output Redirection Menggunakan Echo *(Menengah | 2 Menit)*
| Soal | Deskripsi |
|---|---|
| **4.1** | Buat direktori bernama `Level4`, kemudian masuk ke dalam direktori tersebut. |
| **4.2** | Buat file bernama `informasi.txt` yang berisi tulisan `Laboratorium Teknik Digital`. |
| **4.3** | Ubah seluruh isi file `informasi.txt` menjadi `Universitas Lampung` (isi lama tidak tersisa). |
| **4.4** | Tambahkan tulisan `Praktikum Sistem Operasi` pada bagian akhir file `informasi.txt` tanpa menghapus isi sebelumnya. |
| **4.5** | Tampilkan seluruh isi akhir file `informasi.txt` untuk memastikan kedua tulisan tersimpan dengan benar. |

### Level 5 — Pipeline Menggunakan Sort dan Wc *(Menengah | 3 Menit)*
| Soal | Deskripsi |
|---|---|
| **5.1** | Buat direktori bernama `Level5`, kemudian masuk ke dalam direktori tersebut. |
| **5.2** | Buat file bernama `peralatan.txt` yang berisi 8 nama peralatan: Multimeter, Arduino, Osiloskop, Breadboard, ESP32, Generator, Sensor, Transistor. |
| **5.3** | Tampilkan seluruh data peralatan berdasarkan urutan alfabetis A–Z tanpa mengubah isi file sumber. |
| **5.4** | Tampilkan seluruh data peralatan berdasarkan urutan alfabetis terbalik Z–A. |
| **5.5** | Hitung jumlah baris, jumlah kata, dan jumlah karakter dari file `peralatan.txt` menggunakan pipeline. |

### Level 6 — Pipeline Menggunakan Grep *(Menengah | 3 Menit)*
| Soal | Deskripsi |
|---|---|
| **6.1** | Buat direktori bernama `Level6`, kemudian masuk ke dalam direktori tersebut. |
| **6.2** | Buat file bernama `komponen.txt` yang berisi 8 nama komponen: Resistor, Kapasitor, Transistor, Induktor, Dioda, Transformator, Sensor, Regulator. |
| **6.3** | Tampilkan hanya data komponen yang mengandung teks `tor` pada file `komponen.txt`. |
| **6.4** | Tampilkan hasil pencarian komponen yang mengandung teks `tor` dalam urutan alfabetis. |
| **6.5** | Hitung jumlah baris hasil pencarian komponen yang mengandung teks `tor` tanpa menghitung seluruh isi file. |

### Level 7 — Kombinasi Redirection dan Pipeline *(Menengah–Sulit | 4 Menit)*

**Kasus**: Asisten Laboratorium Teknik Digital diminta mengolah data peserta kegiatan praktikum.

| Soal | Deskripsi |
|---|---|
| **7.1** | Buat direktori bernama `Level7`, kemudian buat file `peserta.txt` yang berisi 8 data: `231101_Andi_Hadir`, `231102_Budi_Izin`, ..., `231108_Hadi_Hadir`. |
| **7.2** | Urutkan seluruh data peserta berdasarkan nama (kolom kedua) secara alfabetis A–Z. Simpan ke `peserta_urut.txt`. |
| **7.3** | Tampilkan hanya data peserta yang memiliki status kehadiran `Hadir` berdasarkan file `peserta.txt`. |
| **7.4** | Hitung jumlah peserta yang memiliki status `Izin` berdasarkan data pada file `peserta.txt`. |
| **7.5** | Simpan seluruh data peserta yang memiliki status `Hadir` ke dalam file `peserta_hadir.txt` tanpa mengubah file sumber. |

### Level 8 — Studi Kasus Pengolahan Data Pemeriksaan Alat *(Sulit | 7 Menit)*

**Kasus**: Teknisi Laboratorium Teknik Digital melakukan pemeriksaan peralatan sebelum praktikum.

| Soal | Deskripsi |
|---|---|
| **8.1** | Buat direktori utama `Pemeriksaan_Lab` dengan tiga subdirektori: `data`, `hasil`, dan `log`. |
| **8.2** | Di dalam direktori `data`, buat file `pemeriksaan.txt` berisi minimal 10 data format `ID_NamaAlat_Hasil` dengan kategori Normal, PerluKalibrasi, TidakLayak. |
| **8.3** | Urutkan data pemeriksaan berdasarkan nama alat (kolom kedua) A–Z. Simpan ke `hasil/pemeriksaan_urut.txt`. |
| **8.4** | Ambil seluruh data alat dengan hasil `PerluKalibrasi` dan simpan ke `hasil/perlu_kalibrasi.txt`. |
| **8.5** | Buat file `hasil/rekap.txt` berisi jumlah alat per kategori, dan simpan pesan error dari perintah yang sengaja salah ke `log/error.txt`. |

---

## 🗝️ Sistem Penilaian (Bagian IV)

### Bobot Nilai
| Level | Soal | Bobot/Soal | Total |
|:---:|:---:|:---:|:---:|
| Level 1–6 | 5 | 2 poin | 10 poin/level |
| Level 7–8 | 5 | 4 poin | 20 poin/level |
| **Total** | **40** | | **100 poin** |

### Pengurangan Poin Petunjuk
| Petunjuk yang Dibuka | Pengurangan |
|---|:---:|
| Tidak menggunakan petunjuk | 0 poin |
| Petunjuk untuk 1 nomor soal saja | -20 poin |
| Semua petunjuk pada level tersebut | -30 poin (upgrade dari 1 soal: +10 poin) |

> **Rumus**: Nilai Akhir = Nilai Murni − Total Penalti Petunjuk (minimal 0 poin).

---

## 🔐 Fasilitas & Keamanan Portal Asisten Praktikum (Asprak)

- **Portal Terproteksi & Aman**: Password Master **tidak** ditampilkan di halaman login. Hanya Tim Asisten Praktikum yang mengetahuinya.
- **Ubah Master PIN**: Asisten dapat memperbarui PIN Master secara langsung dari tab Manajemen Kode Kelas.
- **Manajemen Kode Kelas**: Kode akses ujian tiap kelas (`PSO A`–`PSO E`) dapat diubah dan disimpan secara dinamis.
- **Diagram Distribusi & Rekap Nilai**: Visualisasi diagram batang interaktif hasil nilai praktikan dengan fitur ekspor ke Excel (`.xlsx`) dan CSV.
- **Live Virtual File Tree**: Menampilkan struktur direktori dan file di home praktikan secara real-time.
- **Virtual Web Browser**: Mensimulasikan browser yang membuka alamat `http://192.168.1.50` untuk menguji status Apache2.
- **Efek Suara Web Audio API**: Suara feedback interaktif untuk pengetikan, ceklis target misi, dan selebrasi kemenangan level.
- **Sertifikat Kelulusan Digital**: Tampil otomatis setelah Level 8 berhasil diselesaikan lengkap dengan identitas Nama, NPM, dan Kelas.

---

## 💻 Cara Menjalankan Website Secara Lokal

Website ini dibangun murni menggunakan HTML, Vanilla CSS modern, dan JavaScript modular tanpa dependensi berat.

Jalankan perintah berikut di folder proyek:
```bash
python -m http.server 8080
```
Buka browser pada alamat:
```
http://localhost:8080
```
#   P o s t - T e s t _ P S O _ I n p u t - O u t p u t  
 