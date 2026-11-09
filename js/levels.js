/**
 * Level & Quest Engine for OS-QUEST Post-Test
 * Laboratorium Teknik Digital - Sequential (Bertahap) Level Progression
 * Materi: Proses, Thread, Redirection, dan Pipeline (40 Soal / 8 Level = 100 Poin Maksimal).
 */

const POSTTEST_LEVELS = [
  {
    id: 1,
    title: "Level 1 — Proses dan Thread",
    badge: "MUDAH (2 Menit)",
    points: 10,
    case: "Praktikan memeriksa seluruh proses sistem Linux beserta informasi thread, thread dari proses terminal aktif, pemantauan sumber daya interaktif dengan top, dan pengelolaan status layanan daemon Apache2.",
    objectives: [
      {
        id: "l1_ps_thread",
        desc: "1. Tampilkan seluruh proses yang sedang berjalan pada sistem Linux beserta informasi thread dari masing-masing proses.",
        hint: "ps -e -T (Gunakan opsi -e dan -T untuk menampilkan thread proses)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('ps') && h.cmd.includes('-T') && (h.cmd.includes('-e') || h.cmd.includes('-A') || h.cmd.includes('aux')))
      },
      {
        id: "l1_ps_terminal",
        desc: "2. Tampilkan informasi thread dari proses terminal yang sedang digunakan. Gunakan PID proses terminal tersebut sebagai acuan.",
        hint: "ps -T -p $$ (Gunakan variabel PID terminal saat ini: $$)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('ps') && h.cmd.includes('-p') && (h.cmd.includes('$$') || h.cmd.includes('2045') || h.cmd.includes('-T')))
      },
      {
        id: "l1_top",
        desc: "3. Jalankan tampilan pemantauan proses Linux secara interaktif untuk melihat penggunaan sumber daya sistem.",
        hint: "top (Ketik top untuk pemantauan interaktif, tekan 'q' untuk keluar)",
        check: (vfs, hist) => hist.some(h => h.cmd.trim() === 'top' || h.cmd.startsWith('top '))
      },
      {
        id: "l1_apache_status",
        desc: "4. Periksa status layanan Apache2 untuk mengetahui apakah layanan tersebut sedang berjalan atau tidak.",
        hint: "systemctl status apache2",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('systemctl') && h.cmd.includes('status') && h.cmd.includes('apache'))
      },
      {
        id: "l1_apache_restart",
        desc: "5. Hentikan layanan Apache2 yang sedang berjalan, kemudian jalankan kembali layanan tersebut menggunakan mekanisme restart.",
        hint: "sudo systemctl stop apache2 && sudo systemctl restart apache2",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('systemctl') && h.cmd.includes('stop')) && hist.some(h => h.cmd.includes('systemctl') && (h.cmd.includes('restart') || h.cmd.includes('start')))
      }
    ],
    hint: `[Petunjuk Bertingkat Level 1]\n• 1.1: Gunakan 'ps' dengan opsi menampilkan thread: ps -e -T\n• 1.2: Gunakan variabel PID terminal saat ini: ps -T -p $$\n• 1.3: Pemantau proses interaktif 3 huruf: top (tekan 'q' untuk keluar)\n• 1.4: Periksa status layanan: systemctl status apache2\n• 1.5: Hentikan lalu restart: sudo systemctl stop apache2 lalu sudo systemctl restart apache2`
  },
  {
    id: 2,
    title: "Level 2 — Input dan Output Redirection Menggunakan Cat",
    badge: "MUDAH (2 Menit)",
    points: 10,
    case: "Praktikan membuat direktori akademik bertingkat, menyusun berkas jadwal menggunakan input redirection cat, membaca berkas dengan operator masukan (<), dan memeriksa tipe berkas.",
    objectives: [
      {
        id: "l2_mkdir_cd",
        desc: "1. Buat direktori bernama <code>Level2</code>, kemudian masuk ke dalam direktori tersebut.",
        hint: "mkdir Level2 && cd Level2",
        check: (vfs) => vfs.isDir('/home/praktikan/Level2') && vfs.currentPath.includes('/Level2')
      },
      {
        id: "l2_mkdir_sub",
        desc: "2. Buat subdirektori bernama <code>Data_Akademik</code> di dalam direktori <code>Level2</code>, kemudian masuk ke dalamnya.",
        hint: "mkdir Data_Akademik && cd Data_Akademik",
        check: (vfs) => vfs.isDir('/home/praktikan/Level2/Data_Akademik') && vfs.currentPath.includes('/Data_Akademik')
      },
      {
        id: "l2_jadwal_txt",
        desc: "3. Buat file bernama <code>jadwal.txt</code> yang berisi empat baris secara berurutan: Senin, Selasa, Rabu, Kamis.",
        hint: "cat > jadwal.txt (Ketik: Senin, Selasa, Rabu, Kamis lalu tekan Ctrl+D / Ctrl+C)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level2/Data_Akademik/jadwal.txt') || vfs.findFiles('/home/praktikan', n => n.name === 'jadwal.txt')[0]?.node;
          if (!node || !node.content) return false;
          let c = node.content.toLowerCase();
          return c.includes('senin') && c.includes('selasa') && c.includes('rabu') && c.includes('kamis');
        }
      },
      {
        id: "l2_cat_stdin",
        desc: "4. Tampilkan seluruh isi file <code>jadwal.txt</code> menggunakan mekanisme input redirection.",
        hint: "cat < jadwal.txt",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('cat') && h.cmd.includes('<') && h.cmd.includes('jadwal.txt'))
      },
      {
        id: "l2_file_type",
        desc: "5. Periksa jenis file <code>jadwal.txt</code> menggunakan perintah pemeriksaan tipe file.",
        hint: "file jadwal.txt",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('file') && h.cmd.includes('jadwal.txt'))
      }
    ],
    hint: `[Petunjuk Bertingkat Level 2]\n• 2.1: Buat dan masuk direktori: mkdir Level2 && cd Level2\n• 2.2: Buat subdirektori akademik: mkdir Data_Akademik && cd Data_Akademik\n• 2.3: Input keyboard ke file: cat > jadwal.txt (Ketik: Senin, Selasa, Rabu, Kamis lalu tekan CTRL+C / CTRL+D)\n• 2.4: Ambil isi sebagai masukan: cat < jadwal.txt\n• 2.5: Periksa tipe berkas: file jadwal.txt`
  },
  {
    id: 3,
    title: "Level 3 — Pengeditan File Menggunakan Nano",
    badge: "MUDAH–MENENGAH (2 Menit)",
    points: 10,
    case: "Praktikan membuat direktori Level3 dan menyusun profil data diri mahasiswa ke dalam berkas profil.txt menggunakan editor teks berbasis terminal GNU nano.",
    objectives: [
      {
        id: "l3_mkdir_cd",
        desc: "1. Buat direktori bernama <code>Level3</code>, kemudian masuk ke dalamnya.",
        hint: "mkdir Level3 && cd Level3",
        check: (vfs) => vfs.isDir('/home/praktikan/Level3') && vfs.currentPath.includes('/Level3')
      },
      {
        id: "l3_nano_open",
        desc: "2. Buat sebuah file bernama <code>profil.txt</code> menggunakan editor teks berbasis terminal.",
        hint: "nano profil.txt",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('nano') && h.cmd.includes('profil.txt')) || vfs.findFiles('/home/praktikan', n => n.name === 'profil.txt').length > 0
      },
      {
        id: "l3_nano_content",
        desc: "3. Masukkan informasi profil: Nama, NPM, Program Studi: Teknik Elektro, Universitas: Universitas Lampung ke dalam <code>profil.txt</code>.",
        hint: "Ketik teks di nano (Nama: ..., NPM: ..., Program Studi: Teknik Elektro, Universitas: Universitas Lampung)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level3/profil.txt') || vfs.findFiles('/home/praktikan', n => n.name === 'profil.txt')[0]?.node;
          if (!node || !node.content) return false;
          let c = node.content.toLowerCase();
          return (c.includes('teknik elektro') || c.includes('elektro')) && (c.includes('universitas lampung') || c.includes('unila') || c.includes('nama'));
        }
      },
      {
        id: "l3_nano_save",
        desc: "4. Simpan perubahan pada file <code>profil.txt</code> dan keluar dari editor nano.",
        hint: "Tekan Ctrl+O lalu Enter untuk menyimpan, kemudian Ctrl+X untuk keluar (atau Ctrl+X, Y, Enter)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level3/profil.txt') || vfs.findFiles('/home/praktikan', n => n.name === 'profil.txt')[0]?.node;
          return node && node.content && node.content.trim().length > 15;
        }
      },
      {
        id: "l3_cat_view",
        desc: "5. Tampilkan kembali seluruh isi file <code>profil.txt</code> melalui terminal.",
        hint: "cat profil.txt (atau cat < profil.txt)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('cat') && h.cmd.includes('profil.txt'))
      }
    ],
    hint: `[Petunjuk Bertingkat Level 3]\n• 3.1: Buat dan masuk direktori: mkdir Level3 && cd Level3\n• 3.2: Buka editor visual: nano profil.txt\n• 3.3: Masukkan informasi profil (Nama, NPM, Program Studi: Teknik Elektro, Universitas: Universitas Lampung)\n• 3.4: Simpan dan keluar: tekan Ctrl+O (Enter) lalu Ctrl+X (atau Ctrl+X, Y, Enter)\n• 3.5: Tampilkan isi file: cat < profil.txt`
  },
  {
    id: 4,
    title: "Level 4 — Output Redirection Menggunakan Echo",
    badge: "MENENGAH (2 Menit)",
    points: 10,
    case: "Praktikan memanipulasi berkas teks menggunakan perintah echo dengan operator overwrite redirection (>) dan append redirection (>>).",
    objectives: [
      {
        id: "l4_mkdir_cd",
        desc: "1. Buat direktori bernama <code>Level4</code>, kemudian masuk ke dalam direktori tersebut.",
        hint: "mkdir Level4 && cd Level4",
        check: (vfs) => vfs.isDir('/home/praktikan/Level4') && vfs.currentPath.includes('/Level4')
      },
      {
        id: "l4_echo_init",
        desc: "2. Buat file bernama <code>informasi.txt</code> yang berisi tulisan <code>Laboratorium Teknik Digital</code>.",
        hint: "echo \"Laboratorium Teknik Digital\" > informasi.txt",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('echo') && h.cmd.toLowerCase().includes('laboratorium teknik digital') && h.cmd.includes('informasi.txt')) || (vfs.getNode('/home/praktikan/Level4/informasi.txt')?.content || '').toLowerCase().includes('laboratorium')
      },
      {
        id: "l4_echo_overwrite",
        desc: "3. Ubah seluruh isi file <code>informasi.txt</code> menjadi <code>Universitas Lampung</code>. Pastikan tulisan sebelumnya tidak tersisa.",
        hint: "echo \"Universitas Lampung\" > informasi.txt (Gunakan operator > untuk overwrite)",
        check: (vfs, hist) => {
          let node = vfs.getNode('/home/praktikan/Level4/informasi.txt') || vfs.findFiles('/home/praktikan', n => n.name === 'informasi.txt')[0]?.node;
          if (!node || !node.content) return false;
          let c = node.content.toLowerCase();
          return c.includes('universitas lampung') && hist.some(h => h.cmd.includes('echo') && h.cmd.includes('>') && !h.cmd.includes('>>') && h.cmd.toLowerCase().includes('universitas lampung'));
        }
      },
      {
        id: "l4_echo_append",
        desc: "4. Tambahkan tulisan <code>Praktikum Sistem Operasi</code> pada bagian akhir file <code>informasi.txt</code> tanpa menghapus isi sebelumnya.",
        hint: "echo \"Praktikum Sistem Operasi\" >> informasi.txt (Gunakan operator >> untuk append)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level4/informasi.txt') || vfs.findFiles('/home/praktikan', n => n.name === 'informasi.txt')[0]?.node;
          if (!node || !node.content) return false;
          let c = node.content.toLowerCase();
          return c.includes('universitas lampung') && c.includes('praktikum sistem operasi');
        }
      },
      {
        id: "l4_cat_verify",
        desc: "5. Tampilkan seluruh isi akhir file <code>informasi.txt</code> untuk memastikan kedua tulisan tersimpan dengan benar.",
        hint: "cat informasi.txt",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('cat') && h.cmd.includes('informasi.txt'))
      }
    ],
    hint: `[Petunjuk Bertingkat Level 4]\n• 4.1: Buat dan masuk: mkdir Level4 && cd Level4\n• 4.2: Tulis teks pertama: echo "Laboratorium Teknik Digital" > informasi.txt\n• 4.3: Timpa dengan teks baru (overwrite): echo "Universitas Lampung" > informasi.txt\n• 4.4: Tambahkan di akhir (append): echo "Praktikum Sistem Operasi" >> informasi.txt\n• 4.5: Tampilkan isi akhir berkas: cat informasi.txt`
  },
  {
    id: 5,
    title: "Level 5 — Pipeline Menggunakan Sort dan Wc",
    badge: "MENENGAH (3 Menit)",
    points: 10,
    case: "Praktikan mengelola data peralatan laboratorium, melakukan pengurutan alfabetis A-Z dan Z-A, serta menghitung baris, kata, dan karakter menggunakan pipeline sort dan wc.",
    objectives: [
      {
        id: "l5_mkdir_cd",
        desc: "1. Buat direktori bernama <code>Level5</code>, kemudian masuk ke dalam direktori tersebut.",
        hint: "mkdir Level5 && cd Level5",
        check: (vfs) => vfs.isDir('/home/praktikan/Level5') && vfs.currentPath.includes('/Level5')
      },
      {
        id: "l5_cat_peralatan",
        desc: "2. Buat file bernama <code>peralatan.txt</code> yang berisi delapan nama peralatan: Multimeter, Arduino, Osiloskop, Breadboard, ESP32, Generator, Sensor, Transistor.",
        hint: "cat > peralatan.txt (Ketik 8 nama alat lalu tekan Ctrl+D / Ctrl+C)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level5/peralatan.txt') || vfs.findFiles('/home/praktikan', n => n.name === 'peralatan.txt')[0]?.node;
          if (!node || !node.content) return false;
          let c = node.content.toLowerCase();
          return c.includes('multimeter') && c.includes('arduino') && c.includes('osiloskop') && c.includes('breadboard');
        }
      },
      {
        id: "l5_sort_az",
        desc: "3. Tampilkan seluruh data peralatan berdasarkan urutan alfabetis dari A sampai Z tanpa mengubah isi file sumber.",
        hint: "cat peralatan.txt | sort (atau sort peralatan.txt)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('sort') && !h.cmd.includes('-r') && h.cmd.includes('peralatan.txt'))
      },
      {
        id: "l5_sort_za",
        desc: "4. Tampilkan seluruh data peralatan berdasarkan urutan alfabetis terbalik dari Z sampai A.",
        hint: "cat peralatan.txt | sort -r (atau sort -r peralatan.txt)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('sort') && h.cmd.includes('-r') && h.cmd.includes('peralatan.txt'))
      },
      {
        id: "l5_pipe_wc",
        desc: "5. Hitung jumlah baris, jumlah kata, dan jumlah karakter dari file <code>peralatan.txt</code> menggunakan pipeline.",
        hint: "cat peralatan.txt | sort | wc -l (atau cat peralatan.txt | wc)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('peralatan.txt') && h.cmd.includes('wc'))
      }
    ],
    hint: `[Petunjuk Bertingkat Level 5]\n• 5.1: Buat direktori: mkdir Level5 && cd Level5\n• 5.2: Tulis data peralatan: cat > peralatan.txt (Ketik 8 nama alat lalu CTRL+C)\n• 5.3: Urutkan A–Z: cat peralatan.txt | sort\n• 5.4: Urutkan terbalik Z–A: cat peralatan.txt | sort -r\n• 5.5: Hitung data via pipeline: cat peralatan.txt | sort | wc -l (atau wc -w, wc -c)`
  },
  {
    id: 6,
    title: "Level 6 — Pipeline Menggunakan Grep",
    badge: "MENENGAH (3 Menit)",
    points: 10,
    case: "Praktikan menyusun daftar komponen elektronika laboratorium, melakukan filter pencarian teks mengandung kata 'tor' dengan grep, serta merangkaikannya dengan sort dan wc.",
    objectives: [
      {
        id: "l6_mkdir_cd",
        desc: "1. Buat direktori bernama <code>Level6</code>, kemudian masuk ke dalam direktori tersebut.",
        hint: "mkdir Level6 && cd Level6",
        check: (vfs) => vfs.isDir('/home/praktikan/Level6') && vfs.currentPath.includes('/Level6')
      },
      {
        id: "l6_cat_komponen",
        desc: "2. Buat file bernama <code>komponen.txt</code> yang berisi delapan nama komponen: Resistor, Kapasitor, Transistor, Induktor, Dioda, Transformator, Sensor, Regulator.",
        hint: "cat > komponen.txt (Ketik 8 komponen lalu tekan Ctrl+D / Ctrl+C)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level6/komponen.txt') || vfs.findFiles('/home/praktikan', n => n.name === 'komponen.txt')[0]?.node;
          if (!node || !node.content) return false;
          let c = node.content.toLowerCase();
          return c.includes('resistor') && c.includes('kapasitor') && c.includes('transistor') && c.includes('dioda');
        }
      },
      {
        id: "l6_grep_tor",
        desc: "3. Tampilkan hanya data komponen yang mengandung teks <code>tor</code> pada file <code>komponen.txt</code>.",
        hint: "cat komponen.txt | grep \"tor\" (atau grep \"tor\" komponen.txt)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('grep') && h.cmd.includes('tor') && h.cmd.includes('komponen.txt') && !h.cmd.includes('sort') && !h.cmd.includes('wc'))
      },
      {
        id: "l6_grep_sort",
        desc: "4. Tampilkan hasil pencarian komponen yang mengandung teks <code>tor</code> dalam urutan alfabetis.",
        hint: "cat komponen.txt | grep \"tor\" | sort",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('grep') && h.cmd.includes('tor') && h.cmd.includes('sort'))
      },
      {
        id: "l6_grep_wc",
        desc: "5. Hitung jumlah baris hasil pencarian komponen yang mengandung teks <code>tor</code> tanpa menghitung seluruh isi file.",
        hint: "cat komponen.txt | grep \"tor\" | wc -l (atau grep -c \"tor\" komponen.txt)",
        check: (vfs, hist) => hist.some(h => h.cmd.includes('grep') && h.cmd.includes('tor') && h.cmd.includes('wc'))
      }
    ],
    hint: `[Petunjuk Bertingkat Level 6]\n• 6.1: Buat direktori: mkdir Level6 && cd Level6\n• 6.2: Masukkan data komponen: cat > komponen.txt (Ketik 8 komponen lalu CTRL+C)\n• 6.3: Cari teks 'tor': cat komponen.txt | grep "tor"\n• 6.4: Cari lalu urutkan: cat komponen.txt | grep "tor" | sort\n• 6.5: Hitung baris hasil pencarian: cat komponen.txt | grep "tor" | wc -l`
  },
  {
    id: 7,
    title: "Level 7 — Kombinasi Redirection dan Pipeline",
    badge: "MENENGAH–SULIT (4 Menit)",
    points: 20,
    case: "Asisten Laboratorium Teknik Digital mengolah data peserta praktikum: menyortir data berdasarkan kolom kedua (nama peserta), memfilter status Hadir/Izin, dan menyimpan hasil olahan.",
    objectives: [
      {
        id: "l7_cat_peserta",
        desc: "1. Buat direktori bernama Level7, kemudian buat file peserta.txt yang berisi delapan data (231108_Hadi_Hadir, 231105_Eka_Izin, dst).",
        hint: "mkdir Level7 && cd Level7 && cat > peserta.txt (Ketik 8 data peserta lalu tekan Ctrl+D)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level7/peserta.txt') ||
                     vfs.findFiles('/home/praktikan', n => n.name === 'peserta.txt')[0]?.node;
          if (!node || !node.content) return false;
          let lower = node.content.toLowerCase();
          let requiredNames = ['hadi', 'eka', 'budi', 'gina', 'andi', 'fajar', 'citra', 'dimas'];
          let matchCount = requiredNames.filter(name => lower.includes(name)).length;
          let lines = node.content.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
          return (matchCount >= 3 || lines.length >= 4) && (lower.includes('hadir') || lower.includes('izin'));
        }
      },
      {
        id: "l7_sort_col2",
        desc: "2. Urutkan seluruh data peserta berdasarkan nama peserta (kolom kedua) secara alfabetis A sampai Z, lalu simpan hasilnya ke dalam file peserta_urut.txt.",
        hint: "LC_ALL=C sort -t '_' -k2,2 peserta.txt > peserta_urut.txt",
        check: (vfs, hist) => {
          let node = vfs.getNode('/home/praktikan/Level7/peserta_urut.txt') ||
                     vfs.findFiles('/home/praktikan', n => n.name === 'peserta_urut.txt')[0]?.node;
          if (!node || !node.content) {
            return hist && hist.some(h => h.cmd.toLowerCase().includes('sort') && h.cmd.includes('peserta_urut') && h.code === 0);
          }
          let lines = node.content.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length < 3) return false;
          let firstLines = lines.slice(0, 3).join(' ').toLowerCase();
          let lastLines = lines.slice(-3).join(' ').toLowerCase();
          let hasAndiStart = firstLines.includes('andi') || firstLines.includes('budi') || firstLines.includes('citra');
          let hasHadiEnd = lastLines.includes('hadi') || lastLines.includes('gina') || lastLines.includes('fajar') || lastLines.includes('eka') || lastLines.includes('dimas');
          let ranSortCmd = hist && hist.some(h => h.cmd.toLowerCase().includes('sort') && h.cmd.includes('peserta_urut'));
          return (hasAndiStart && hasHadiEnd) || ranSortCmd || lines.length >= 4;
        }
      },
      {
        id: "l7_grep_hadir",
        desc: "3. Tampilkan hanya data peserta yang memiliki status kehadiran Hadir berdasarkan file peserta.txt.",
        hint: "grep \"Hadir\" peserta.txt (atau cat peserta.txt | grep \"Hadir\")",
        check: (vfs, hist) => hist.some(h => {
          let c = h.cmd.toLowerCase();
          let isGrep = c.includes('grep') && c.includes('hadir') && !h.cmd.includes('>');
          let hasOutput = h.output && (h.output.includes('Hadir') || h.output.includes('231101_Andi_Hadir'));
          return isGrep || hasOutput;
        })
      },
      {
        id: "l7_count_izin",
        desc: "4. Hitung jumlah peserta yang memiliki status Izin berdasarkan data pada file peserta.txt.",
        hint: "grep \"Izin\" peserta.txt | wc -l (atau grep -c \"Izin\" peserta.txt)",
        check: (vfs, hist) => hist.some(h => {
          let c = h.cmd.toLowerCase();
          let isGrepIzin = c.includes('grep') && c.includes('izin');
          let hasCount = c.includes('wc') || c.includes('-c');
          let outputIsThree = h.output && h.output.trim().includes('3');
          return (isGrepIzin && hasCount) || (isGrepIzin && outputIsThree) || (c.includes('wc') && outputIsThree);
        })
      },
      {
        id: "l7_save_hadir",
        desc: "5. Simpan seluruh data peserta yang memiliki status Hadir ke dalam file peserta_hadir.txt tanpa mengubah file sumber.",
        hint: "grep \"Hadir\" peserta.txt > peserta_hadir.txt",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Level7/peserta_hadir.txt') ||
                     vfs.findFiles('/home/praktikan', n => n.name === 'peserta_hadir.txt')[0]?.node;
          if (!node || !node.content) return false;
          let lines = node.content.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
          return lines.length >= 3 && lines.every(l => l.includes('Hadir') || l.includes('hadir'));
        }
      }
    ],
    hint: `[Petunjuk Bertingkat Level 7]\n• 7.1: Buat berkas peserta: mkdir Level7 && cd Level7 && cat > peserta.txt\n• 7.2: Urutkan kolom kedua: LC_ALL=C sort -t '_' -k2,2 peserta.txt > peserta_urut.txt\n• 7.3: Tampilkan peserta Hadir: grep "Hadir" peserta.txt\n• 7.4: Hitung peserta Izin: grep "Izin" peserta.txt | wc -l\n• 7.5: Simpan peserta Hadir: grep "Hadir" peserta.txt > peserta_hadir.txt`
  },
  {
    id: 8,
    title: "Level 8 — Studi Kasus Pengolahan Data Pemeriksaan Alat",
    badge: "SULIT (7 Menit)",
    points: 20,
    case: "Teknisi laboratorium melakukan pemeriksaan terhadap minimal 10 peralatan praktikum: menyimpan log data terstruktur pada folder data, mengurutkan data pada kolom kedua ke folder hasil, memisahkan alat PerluKalibrasi, membuat rekapitulasi, dan menangani error stream ke folder log.",
    objectives: [
      {
        id: "l8_mkdir_struct",
        desc: "1. Buat direktori utama bernama Pemeriksaan_Lab yang memiliki tiga subdirektori: data, hasil, dan log.",
        hint: "mkdir -p Pemeriksaan_Lab/{data,hasil,log} && cd Pemeriksaan_Lab",
        check: (vfs) => {
          let directCheck = vfs.isDir('/home/praktikan/Pemeriksaan_Lab/data') &&
                            vfs.isDir('/home/praktikan/Pemeriksaan_Lab/hasil') &&
                            vfs.isDir('/home/praktikan/Pemeriksaan_Lab/log');
          if (directCheck) return true;

          let labDirs = vfs.findDirs ? vfs.findDirs('/home/praktikan', (n, p) => n.name === 'Pemeriksaan_Lab') : [];
          return labDirs.some(ld => {
            let p = ld.path;
            return vfs.isDir(`${p}/data`) && vfs.isDir(`${p}/hasil`) && vfs.isDir(`${p}/log`);
          });
        }
      },
      {
        id: "l8_data_pemeriksaan",
        desc: "2. Di dalam direktori data, buat file bernama pemeriksaan.txt berisi minimal 10 data pemeriksaan dengan format: ID_NamaAlat_Hasil (kategori: Normal, PerluKalibrasi, TidakLayak).",
        hint: "cat > data/pemeriksaan.txt (Format: ALT001_osiloskop_Normal, minimal 10 baris lalu tekan Ctrl+D)",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Pemeriksaan_Lab/data/pemeriksaan.txt') ||
                     vfs.findFiles('/home/praktikan', (n, p) => n.name === 'pemeriksaan.txt' && p.includes('data'))[0]?.node ||
                     vfs.findFiles('/home/praktikan', n => n.name === 'pemeriksaan.txt')[0]?.node;
          if (!node || !node.content) return false;
          let lines = node.content.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length < 10) return false;
          let validCategories = ['normal', 'perlukalibrasi', 'tidaklayak'];
          let formattedLines = lines.filter(l => {
            let parts = l.split('_');
            return parts.length >= 3 && validCategories.includes(parts[parts.length - 1].toLowerCase());
          });
          return formattedLines.length >= 8;
        }
      },
      {
        id: "l8_sort_alat",
        desc: "3. Urutkan seluruh data pemeriksaan berdasarkan nama alat (kolom kedua) secara alfabetis A–Z dan simpan hasilnya ke file pemeriksaan_urut.txt di dalam direktori hasil.",
        hint: "LC_ALL=C sort -t '_' -k2,2 data/pemeriksaan.txt > hasil/pemeriksaan_urut.txt",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Pemeriksaan_Lab/hasil/pemeriksaan_urut.txt') ||
                     vfs.findFiles('/home/praktikan', (n, p) => n.name === 'pemeriksaan_urut.txt' && p.includes('hasil'))[0]?.node ||
                     vfs.findFiles('/home/praktikan', n => n.name === 'pemeriksaan_urut.txt')[0]?.node;
          if (!node || !node.content) return false;
          let lines = node.content.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length < 8) return false;
          let tools = lines.map(l => {
            let parts = l.split('_');
            return parts[1] ? parts[1].toLowerCase() : l.toLowerCase();
          });
          let isSorted = true;
          for (let i = 0; i < tools.length - 1; i++) {
            if (tools[i].localeCompare(tools[i + 1]) > 0) {
              isSorted = false;
              break;
            }
          }
          return isSorted || lines.length >= 10;
        }
      },
      {
        id: "l8_grep_kalibrasi",
        desc: "4. Ambil seluruh data alat yang memiliki hasil pemeriksaan PerluKalibrasi dan simpan ke dalam file perlu_kalibrasi.txt di dalam direktori hasil.",
        hint: "grep \"PerluKalibrasi\" data/pemeriksaan.txt > hasil/perlu_kalibrasi.txt",
        check: (vfs) => {
          let node = vfs.getNode('/home/praktikan/Pemeriksaan_Lab/hasil/perlu_kalibrasi.txt') ||
                     vfs.findFiles('/home/praktikan', (n, p) => n.name === 'perlu_kalibrasi.txt' && p.includes('hasil'))[0]?.node ||
                     vfs.findFiles('/home/praktikan', n => n.name === 'perlu_kalibrasi.txt')[0]?.node;
          if (!node || !node.content) return false;
          let lines = node.content.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
          return lines.length >= 1 && lines.every(l => l.toLowerCase().includes('perlukalibrasi'));
        }
      },
      {
        id: "l8_rekap_error",
        desc: "5. Buat file rekap.txt di direktori hasil berisi jumlah alat per kategori (Normal, PerluKalibrasi, TidakLayak), serta simpan pesan kesalahan dari perintah Linux yang sengaja menghasilkan error ke file error.txt di direktori log.",
        hint: "Rekap: grep \"Normal\" data/pemeriksaan.txt | wc -l > hasil/rekap.txt && grep \"PerluKalibrasi\" data/pemeriksaan.txt | wc -l >> hasil/rekap.txt && grep \"TidakLayak\" data/pemeriksaan.txt | wc -l >> hasil/rekap.txt\nError stream: ls folder_tidak_ada 2> log/error.txt",
        check: (vfs) => {
          let rekapNode = vfs.getNode('/home/praktikan/Pemeriksaan_Lab/hasil/rekap.txt') ||
                          vfs.findFiles('/home/praktikan', n => n.name === 'rekap.txt')[0]?.node;
          let errorNode = vfs.getNode('/home/praktikan/Pemeriksaan_Lab/log/error.txt') ||
                          vfs.findFiles('/home/praktikan', n => n.name === 'error.txt')[0]?.node;
          let hasRekap = rekapNode && rekapNode.content && rekapNode.content.trim().length > 0;
          let hasError = errorNode && errorNode.content && (
            errorNode.content.toLowerCase().includes('no such file') ||
            errorNode.content.toLowerCase().includes('cannot access') ||
            errorNode.content.toLowerCase().includes('not found') ||
            errorNode.content.toLowerCase().includes('error') ||
            errorNode.content.trim().length > 0
          );
          return hasRekap && hasError;
        }
      }
    ],
    hint: `[Petunjuk Bertingkat Level 8]\n• 8.1: Struktur direktori: mkdir -p Pemeriksaan_Lab/{data,hasil,log} && cd Pemeriksaan_Lab\n• 8.2: Isi 10 alat: cat > data/pemeriksaan.txt (Format: ALT001_osiloskop_Normal, dst)\n• 8.3: Urutkan kolom alat: LC_ALL=C sort -t '_' -k2,2 data/pemeriksaan.txt > hasil/pemeriksaan_urut.txt\n• 8.4: Filter PerluKalibrasi: grep "PerluKalibrasi" data/pemeriksaan.txt > hasil/perlu_kalibrasi.txt\n• 8.5: Rekapitulasi: grep "Normal" data/pemeriksaan.txt | wc -l > hasil/rekap.txt && grep "PerluKalibrasi" data/pemeriksaan.txt | wc -l >> hasil/rekap.txt && grep "TidakLayak" data/pemeriksaan.txt | wc -l >> hasil/rekap.txt\n• 8.5 (Error log): ls folder_tidak_ada 2> log/error.txt`
  }
];

class QuestManager {
  constructor() {
    this.levels = POSTTEST_LEVELS;
    this.currentLevelIndex = 0;
    this.unlockedLevels = [1]; // Pengerjaan bertahap: level 1 terbuka di awal
    this.completedLevels = [];
    this.completedObjectivesByLevel = {}; // { [lvlId]: string[] of completed obj IDs }
    this.revealedHints = [];
    this.penaltyPoints = 0;
    this.commandHistory = [];
    this.loadState();
  }

  loadState() {
    try {
      let saved = localStorage.getItem('ltd_posttest_save_v5');
      if (saved) {
        let p = JSON.parse(saved);
        this.currentLevelIndex = p.currentLevelIndex || 0;
        this.unlockedLevels = p.unlockedLevels || [1];
        this.completedLevels = p.completedLevels || [];
        this.completedObjectivesByLevel = p.completedObjectivesByLevel || {};
        this.revealedHints = p.revealedHints || [];
        this.penaltyPoints = p.penaltyPoints || 0;
      }
    } catch (e) {
      console.warn("Could not load state:", e);
    }
  }

  saveState() {
    try {
      localStorage.setItem('ltd_posttest_save_v5', JSON.stringify({
        currentLevelIndex: this.currentLevelIndex,
        unlockedLevels: this.unlockedLevels,
        completedLevels: this.completedLevels,
        completedObjectivesByLevel: this.completedObjectivesByLevel,
        revealedHints: this.revealedHints,
        penaltyPoints: this.penaltyPoints
      }));
    } catch (e) {
      console.warn("Could not save state:", e);
    }
  }

  getCurrentLevel() {
    return this.levels[this.currentLevelIndex] || this.levels[0];
  }

  isLevelUnlocked(levelId) {
    return this.unlockedLevels.includes(levelId);
  }

  selectLevel(levelId) {
    let idx = this.levels.findIndex(l => l.id === levelId);
    if (idx !== -1) {
      if (!this.unlockedLevels.includes(levelId)) {
        return false; // Bertahap: terkunci sampai level sebelumnya selesai
      }
      this.currentLevelIndex = idx;
      this.saveState();
      return true;
    }
    return false;
  }

  recordCommand(cmd, output, code) {
    this.commandHistory.push({
      cmd,
      output,
      code,
      timestamp: Date.now()
    });
  }

  isAllHintsRevealed(levelId) {
    return this.revealedHints.includes('all_' + levelId) || this.revealedHints.includes('lvl_' + levelId) || this.revealedHints.includes(levelId);
  }

  isObjectiveHintRevealed(levelId, objId) {
    return this.isAllHintsRevealed(levelId) || this.revealedHints.includes(objId);
  }

  isHintRevealed(levelId) {
    return this.isAllHintsRevealed(levelId);
  }

  getUnlockedObjectivesInLevel(levelId) {
    let lvl = this.levels.find(l => l.id === levelId);
    if (!lvl) return [];
    if (this.isAllHintsRevealed(levelId)) return lvl.objectives.map(o => o.id);
    return lvl.objectives.filter(o => this.revealedHints.includes(o.id)).map(o => o.id);
  }

  unlockObjectiveHint(levelId, objId) {
    if (this.isObjectiveHintRevealed(levelId, objId)) return { success: false, penalty: 0 };
    let alreadyUnlocked = this.getUnlockedObjectivesInLevel(levelId);

    // Jika praktikan sudah pernah membuka 1 soal dan ingin membuka soal lain pada level ini,
    // upgrade otomatis ke semua petunjuk level ini seharga sisa +10 poin saja (total -30 poin)
    if (alreadyUnlocked.length >= 1) {
      return this.unlockAllLevelHints(levelId);
    }

    this.revealedHints.push(objId);
    this.penaltyPoints += 20; // Petunjuk 1 soal: -20 Poin
    this.saveState();
    return { success: true, penalty: 20 };
  }

  unlockAllLevelHints(levelId) {
    if (this.isAllHintsRevealed(levelId)) return { success: false, penalty: 0 };
    let alreadyUnlocked = this.getUnlockedObjectivesInLevel(levelId);
    let penaltyToAdd = (alreadyUnlocked.length > 0) ? 10 : 30; // Jika sudah buka 1 soal, sisa +10 (total 30); jika baru buka semua, -30

    let marker = 'all_' + levelId;
    if (!this.revealedHints.includes(marker)) this.revealedHints.push(marker);
    if (!this.revealedHints.includes(levelId)) this.revealedHints.push(levelId);

    let lvl = this.levels.find(l => l.id === levelId);
    if (lvl) {
      lvl.objectives.forEach(o => {
        if (!this.revealedHints.includes(o.id)) this.revealedHints.push(o.id);
      });
    }

    this.penaltyPoints += penaltyToAdd;
    this.saveState();
    return { success: true, penalty: penaltyToAdd };
  }

  unlockHint(levelId) {
    return this.unlockAllLevelHints(levelId).success;
  }

  isLevelComplete(levelId) {
    return this.completedLevels.includes(levelId);
  }

  // Nilai Gabungan Akumulatif (Level 1-6: @10 Poin, Level 7-8: @20 Poin = 100 Poin Maksimal)
  getCumulativeScore() {
    let pure = this.getPureScore();
    return Math.max(0, pure - this.penaltyPoints);
  }

  getPureScore() {
    let total = 0;
    for (let lvl of this.levels) {
      if (this.completedLevels.includes(lvl.id)) {
        total += lvl.points;
      } else {
        let doneObjs = this.completedObjectivesByLevel[lvl.id] || [];
        let ptsPerObj = lvl.points / lvl.objectives.length;
        total += Math.round(doneObjs.length * ptsPerObj);
      }
    }
    return Math.min(100, total);
  }

  getNetScore() {
    return this.getCumulativeScore();
  }

  getCompletedLevelsCount() {
    return this.completedLevels.length;
  }

  evaluateCurrentLevel(vfs, terminalState) {
    let current = this.getCurrentLevel();
    let doneList = this.completedObjectivesByLevel[current.id] || [];
    let objResults = [];

    for (let obj of current.objectives) {
      let passed = doneList.includes(obj.id);
      if (!passed) {
        try {
          passed = obj.check(vfs, this.commandHistory, terminalState);
        } catch (e) {
          passed = false;
        }
        if (passed) {
          doneList.push(obj.id);
        }
      }
      objResults.push({ id: obj.id, passed });
    }

    this.completedObjectivesByLevel[current.id] = doneList;
    let allDone = current.objectives.every(o => doneList.includes(o.id));

    let isNewlyCompleted = false;
    if (allDone && !this.completedLevels.includes(current.id)) {
      this.completedLevels.push(current.id);
      isNewlyCompleted = true;

      // Unlock level berikutnya secara bertahap
      let nextLvl = this.levels[this.currentLevelIndex + 1];
      if (nextLvl && !this.unlockedLevels.includes(nextLvl.id)) {
        this.unlockedLevels.push(nextLvl.id);
      }
    }

    this.saveState();

    return {
      allDone,
      isNewlyCompleted,
      objResults,
      currentLevel: current,
      hasNext: this.currentLevelIndex < this.levels.length - 1
    };
  }

  advanceToNextLevel() {
    if (this.currentLevelIndex < this.levels.length - 1) {
      let nextId = this.levels[this.currentLevelIndex + 1].id;
      if (this.unlockedLevels.includes(nextId)) {
        this.currentLevelIndex++;
        this.saveState();
        return true;
      }
    }
    return false;
  }

  resetAll() {
    localStorage.removeItem('ltd_posttest_save_v5');
    localStorage.removeItem('ltd_posttest_save_v4');
    localStorage.removeItem('ltd_posttest_save_v3');
    this.currentLevelIndex = 0;
    this.unlockedLevels = [1];
    this.completedLevels = [];
    this.completedObjectivesByLevel = {};
    this.revealedHints = [];
    this.penaltyPoints = 0;
    this.commandHistory = [];
  }
}

window.POSTTEST_LEVELS = POSTTEST_LEVELS;
window.QuestManager = QuestManager;
window.questManager = new QuestManager();
