# 🚀 OS-QUEST
### Platform Praktikum & Post-Test Sistem Operasi (Modul 2)

OS-QUEST merupakan platform pembelajaran berbasis web yang mensimulasikan lingkungan **Ubuntu Server** untuk mendukung kegiatan Praktikum dan Post-Test Sistem Operasi.

Platform ini menggunakan sistem gamifikasi berbasis level (quest), sehingga praktikan harus menyelesaikan seluruh soal pada level aktif sebelum dapat melanjutkan ke level berikutnya.

---

## 🎯 Fitur Utama

### 1. Terminal Ubuntu Server Interaktif

**Shell Realistis**

- Menggunakan prompt terminal dinamis:
  `praktikan@ubuntu-server:~$`
- Path direktori menyesuaikan folder kerja aktif.
- Mendukung navigasi direktori dan pengelolaan file.

**Autentikasi dan Error Handling Linux**

Pesan kesalahan disimulasikan menyerupai Ubuntu Server, antara lain:

| Pesan Kesalahan | Exit Code |
|---|---|
| `bash: command not found` | 127 |
| `cat: No such file or directory` | 1 |
| `mkdir: File exists` | 1 |
| `rm: Is a directory` | 1 |

**Fitur Terminal:**

- History perintah menggunakan tombol panah atas/bawah.
- Autocomplete perintah dan nama file menggunakan `Tab`.
- Interupsi proses menggunakan `Ctrl+C`.
- Membersihkan terminal menggunakan `clear` atau `Ctrl+L`.

### 2. Text Editor GNU Nano

OS-QUEST menyediakan simulasi editor GNU Nano 6.2 secara interaktif.

Fitur yang didukung:

- Membuka dan mengedit file menggunakan `nano`.
- Menulis dan mengubah isi file.
- Menyimpan file menggunakan `Ctrl+O`.
- Keluar dari editor menggunakan `Ctrl+X`.
- Konfirmasi penyimpanan perubahan.

### 3. Simulasi Proses dan Thread

Mendukung simulasi beberapa perintah Linux untuk pengelolaan proses.

| Perintah | Fungsi |
|---|---|
| `ps -e -T` | Menampilkan proses dan thread |
| `ps -T -p $$` | Menampilkan thread proses shell aktif |
| `top` | Memantau proses dan penggunaan sumber daya |
| `systemctl` | Simulasi manajemen layanan |
| `pkill apache2` | Simulasi penghentian proses Apache |

### 4. Dukungan Redirection dan Pipeline

**Output Redirection**

- `>` : Mengarahkan output dan menimpa isi file.
- `>>` : Menambahkan output ke akhir file.
- `2>` : Mengarahkan pesan kesalahan (stderr).

**Input Redirection**

- `<` : Mengambil input dari file.

**Pipeline**

- `|` : Menghubungkan output suatu perintah sebagai input perintah berikutnya.

**Pengolahan Teks**

Mendukung kombinasi perintah seperti:

- `sort`
- `sort -r`
- `sort -t`
- `grep`
- `wc`

OS-QUEST juga mendukung pengaturan environment variable seperti `LC_ALL=C`.

---

## 🎮 Sistem Gamifikasi Quest

OS-QUEST menggunakan sistem pembelajaran bertingkat yang terdiri dari **8 level**.

Ketentuan pengerjaan:

- Setiap level memiliki 5 soal unik.
- Setiap soal memiliki bobot 2 poin.
- Total nilai setiap level adalah 10 poin.
- Praktikan hanya dapat membuka level berikutnya setelah seluruh soal pada level aktif berhasil diselesaikan.
- Setiap level memiliki materi dan tingkat kesulitan yang berbeda.

### Kurikulum Level

| Level | Judul | Topik Utama | Jumlah Soal | Bobot/Soal | Total |
|---|---|---|---:|---:|---:|
| 1 | Proses dan Thread | `ps`, `top`, `systemctl` | 5 | 2 | 10 |
| 2 | Input & Output Redirection | `mkdir`, `cat`, redirection | 5 | 2 | 10 |
| 3 | Pengeditan File Nano | `nano`, edit, save, exit | 5 | 2 | 10 |
| 4 | Output Redirection | `echo`, `>`, `>>` | 5 | 2 | 10 |
| 5 | Pipeline Sort & WC | `cat`, `sort`, `wc` | 5 | 2 | 10 |
| 6 | Pipeline Grep | `grep`, kombinasi pipeline | 5 | 2 | 10 |
| 7 | Kombinasi Redirection & Pipeline | Pengolahan teks lanjutan | 5 | 2 | 10 |
| 8 | Kombinasi Perintah Linux | Integrasi materi seluruh level | 5 | 2 | 10 |

---

## 🖥️ Teknologi

Platform OS-QUEST dikembangkan sebagai aplikasi berbasis web dengan fitur terminal Linux interaktif dan simulasi lingkungan Ubuntu Server.

---

## 📌 Tujuan Pengembangan

1. Membantu praktikan memahami penggunaan perintah dasar Linux.
2. Memberikan pengalaman praktik melalui terminal interaktif.
3. Melatih kemampuan pengelolaan file, proses, dan pengolahan teks.
4. Meningkatkan pemahaman praktikan melalui sistem evaluasi berbasis quest.
5. Menyediakan media Post-Test yang interaktif dan mudah digunakan.

---

**OS-QUEST — Learn Linux Through Interactive Quests!**
