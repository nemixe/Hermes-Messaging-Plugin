# How to use Codev in daily work cycle

Tiga langkah utama: brainstorm tugas, buat GitLab issue, lalu assign ke Codev. Percakapan dan investigasi di Mattermost; eksekusi kode dimulai setelah bot Codev menjadi assignee issue.

Syarat assignment berlaku juga di Desktop, TUI, CLI, dan komentar MR. Untuk
implementasi dari MR, Codev memverifikasi issue terkait dan assignment-nya.
Pertanyaan, investigasi, dan review tanpa perubahan kode tidak membutuhkan assignment.

```text
Mattermost / Desktop          GitLab
─────────────────────         ──────────────────────────
1. Brainstorm tugas
2. Minta buat issue    →      Issue (kartu) terbuat
3. Minta self-assign   →      Bot jadi assignee
   atau assign manual  →      Sesi coding Codev mulai
                              Kerja di GitLab → merge request siap review
```

## 1. Task brainstorming

Buka percakapan dengan Codev di Mattermost atau Desktop. Ceritakan ide, bug, atau fitur yang mau dikerjakan.

Codev sudah punya konteks project:

- Kode di repository yang terhubung ke project
- Specsbook / dokumen spec di repo, jika ada
- Daftar repository, catatan project, dan dokumentasi yang sudah ada

Yang dikerjakan di tahap ini:

- Memperjelas masalah, tujuan, dan batas scope
- Mengecek kode dan spec yang relevan
- Membandingkan opsi implementasi
- Menetapkan kriteria selesai dan repository target

Pertanyaan, penjelasan, dan investigasi tetap di percakapan ini. Codev belum menulis kode produksi.

Mulai dengan nama fiturnya. Codev yang buka kode dan specsbook.

> mari brainstorm untuk feature public tracking pengiriman

> mari brainstorm untuk feature login google

> mari brainstorm untuk feature filter tanggal di list order

Kalau beberapa repository bisa jadi pemilik kerja, sebutkan repo-nya. Kalau belum yakin, biarkan Codev yang tanya.

## 2. GitLab task creation

Setelah scope jelas, minta Codev membuat GitLab issue. Kartu ini jadi sumber tugas; assignment belakangan yang memulai coding.

Contoh, lanjutan dari thread brainstorm:

> bikin issue dulu, jangan assign dulu

> pecah jadi 2 issue: public tracking page sama share link tanpa login

Codev akan:

1. Membaca daftar repository project dan memilih yang sesuai
2. Mencari issue terbuka yang sama supaya tidak dobel
3. Mengonfirmasi nama repo, judul, dan ringkasan
4. Membuat issue setelah kamu setuju

Konfirmasi bisa dilewati jika kamu sudah menyebut repo + judul dan langsung minta dibuat.

Deskripsi issue memuat request asli, konteks, dan kriteria selesai. Jangan taruh password, token, atau data rahasia di isi issue.

## 3. Task delegation

Kerja coding dimulai ketika akun bot Codev menjadi assignee issue. Ada dua cara.

### Assign manual di GitLab

Buka kartu issue, assign ke akun bot Codev. Assignment itu memulai sesi coding di diskusi issue.

### Self-assign lewat Mattermost

Di thread Mattermost, minta Codev assign dirinya ke issue yang sudah ada, atau buat issue lalu langsung assign.

Contoh:

> Assign issue #42 ke Codev.

> Buat issue-nya dan langsung assign ke kamu.

Codev mengonfirmasi repo dan judul (jika issue baru), menambahkan bot sebagai assignee, lalu membalas dengan link issue yang sudah dicek. Sesi Mattermost selesai di link itu; implementasi berjalan di sesi GitLab.

Pindah kolom board (To Do → Doing, dan seterusnya) tidak memulai kerja Codev. Yang memicu sesi adalah assignment ke bot.

## Setelah di-assign

Di diskusi GitLab, Codev:

- Mengirim preamble singkat yang menyebut langkah konkret berikutnya saat perlu menyelidiki
- Menyiapkan workspace terpisah untuk kartu itu
- Memastikan tujuan dan acceptance criteria, lalu menelusuri dampak UI, API, aturan bisnis, otorisasi, dan data yang relevan
- Mengimplementasikan, menjalankan cek yang relevan, kirim branch, dan membuka atau memperbarui merge request
- Menggeser status kartu sesuai progres nyata (Doing → blocked/waiting → review)
- Menutup dengan hasil, verifikasi, dan link merge request, atau pertanyaan blocker yang jelas

Codev menjadi owner tugas sampai kriteria penerimaan tim terpenuhi. Keputusan teknis
rutin diselesaikan mandiri; perubahan scope bisnis atau arsitektur besar diajukan
ke PIC dengan temuan, rekomendasi, keputusan yang dibutuhkan, dan langkah lanjut.
PIC dipilih dari peta tanggung jawab PM/BE/FE/QA. Handoff ke QA menyertakan langkah
uji dan hasil yang diharapkan setelah Codev menguji pekerjaannya sendiri.

### Bukti wajib untuk perubahan UI

- E2E otomatis yang bisa dijalankan ulang, menguji alur pengguna dan skenario gagal yang relevan, dengan hasil lulus.
- Screenshot aplikasi yang benar-benar berjalan pada revisi yang diuji, mencakup state dan viewport relevan; perubahan responsif mencakup ukuran layar terdampak.
- MR memuat skenario, perintah/hasil E2E, revisi, dan screenshot melalui upload GitLab atau artifact yang dapat diakses reviewer. Path lokal saja tidak cukup.

Build atau unit test saja belum memenuhi bukti UI. Jika E2E gagal, environment
terblokir, atau screenshot belum tersedia/terbaru/dapat diakses, verifikasi belum
lengkap. MR baru tetap draft dan issue belum dipindah ke review. Backend tanpa
dampak UI memakai pemeriksaan API, otorisasi, dan data yang relevan tanpa wajib screenshot.

### Setelah MR dibuka

Pembukaan MR bukan tanda tugas selesai. Untuk feedback reviewer atau QA, mention
Codev lagi pada issue/MR terkait. Codev mengecek feedback dan CI terbaru,
melanjutkan MR yang sama, memperbaiki temuan valid, serta mengulang pengujian dan
memperbarui bukti yang terdampak. Perbedaan pendapat dijelaskan dengan bukti.
Status Done mengikuti acceptance criteria tim; merge/deploy tetap perlu izin.
Perubahan CI atau feedback tanpa pemicu yang didukung belum membangunkan Codev
secara otomatis. Assignment dapat sudah memulai worker GitLab; jangan memulai
implementasi kedua dari Desktop untuk tugas yang sama.

Balasan GitLab dalam Bahasa Indonesia. Narasi progres disimpan internal, termasuk
di Desktop. Pesan yang terlihat hanya satu preamble, hasil akhir, atau blocker
yang membutuhkan input pengguna; heartbeat “Working” dinonaktifkan.

Kalau Codev butuh input lagi di issue yang sama, mention bot di komentar baru. Assign ulang ke bot yang sudah menjadi assignee belum tentu memicu kerja baru.

## Boleh dan tidak boleh

### Boleh

- Disarankan untuk task low dan mid
- Baca kode, specsbook, catatan project, dan daftar repository yang terhubung ke project itu
- Brainstorm, jelaskan, dan investigasi di Mattermost
- Buat atau pecah GitLab issue setelah konfirmasi
- Geser status kartu sesuai progres nyata (Doing, blocked, review)
- Tanya blocker yang jelas: apa yang kurang, di mana, lanjut setelah apa

### Tidak boleh

- Mengerjakan task di Mattermost; pengerjaan task hanya lewat assignment GitLab issue ke Codev
- Init project lewat Codev
- Mengubah scope bisnis atau arsitektur besar tanpa keputusan tim
- Merge atau deploy tanpa izin eksplisit; review dan perbaikan QA tetap ditangani pada MR yang sama
- Taruh password, token, atau data rahasia di issue, thread publik, atau commit
- Mulai sesi coding baru di issue yang sudah dikerjakan sesi lain
- Meminta ubah pengaturan sistem, kredensial, atau data project lain
- Meminta ubah global project skill

## Ringkasan perintah

| Tahap | Kamu bilang (contoh) | Hasil |
| --- | --- | --- |
| Brainstorm | “mari brainstorm untuk feature public tracking pengiriman” | Scope, opsi, pecahan kerja |
| Buat task | “bikin issue dulu di frontend, jangan assign dulu” | Kartu issue, belum coding |
| Delegasi | Assign bot di GitLab, atau “assign #42 ke kamu” | Sesi coding + merge request |

Brainstorm → issue → assign bisa dalam satu thread. Boleh juga digabung setelah rencana disepakati: “buat issue dan assign ke kamu.”
