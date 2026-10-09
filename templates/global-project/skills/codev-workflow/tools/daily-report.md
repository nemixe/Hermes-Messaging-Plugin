# Daily report

Dipakai dari Understanding saat ada permintaan laporan harian atau trigger jadwal yang sudah diotorisasi. Ini laporan read-only atas card GitLab, bukan state pekerjaan baru. Menambahkan tool ini tidak membuat jadwal atau memberi izin posting ke channel lain.

## 1. Scope dan format project

- Tentukan project, pemilik pekerjaan, tanggal/periode, dan zona waktu dari request serta konteks project. Default pemilik adalah CoDev; default periode adalah hari ini dalam zona waktu project atau user. Jangan memperluas ke seluruh tim tanpa permintaan.
- Gunakan format yang diminta user. Jika tidak ditentukan, baca konvensi laporan di memory project/repo melalui `memories/INDEX.md` dan contoh daily report terbaru yang disepakati tim di konteks atau thread project yang boleh diakses. Pertahankan heading, urutan, bahasa, dan periode tiap bagian; format Yesterday/Today mengikuti periodenya, bukan dipaksa menjadi hari ini semua.
- Beberapa project dilaporkan terpisah memakai format masing-masing. Jika format belum tersedia, gunakan fallback di bawah; jangan mengarang konvensi project atau meminta ulang format yang sudah tersedia.

## 2. Verifikasi card dan kategori

Gunakan `PROJECT.yaml` untuk menentukan repo yang relevan, termasuk repo task-management bila card berada terpisah dari kode. History sesi dan memory hanya membantu menemukan card; baca card GitLab beserta label/status, assignee, dan aktivitas pada periode laporan sebagai bukti. Ambil seluruh halaman hasil dalam scope sebelum menyimpulkan tidak ada card.

Setiap item Done, Doing, dan Todo wajib berupa **satu card GitLab yang terverifikasi**, dengan link, judul, dan hasil/status singkat bila perlu. Nomor card atau rencana dari percakapan saja belum cukup. MR, commit, hasil tes, dan catatan internal boleh mendukung status card, tetapi bukan item task tersendiri. Identitas card memakai project dan IID agar nomor yang sama dari repo berbeda tidak tertukar.

Ikuti arti kategori dan status board project melalui peta `## Board` repo (`tools/board.md`), serta periode bagian laporan:

| Kategori | Syarat masuk |
|---|---|
| Done | Card mencapai kriteria selesai yang disepakati project dalam periode bagian ini, dengan bukti aktivitas/status. State CoDev Completed atau MR merged saja tidak otomatis berarti card Done. |
| Doing | Card masih aktif dikerjakan oleh pemilik dalam scope pada waktu laporan, didukung status dan aktivitas terbaru. |
| Todo | Card yang memang ditugaskan atau disepakati untuk dikerjakan berikutnya dalam periode bagian ini, dengan bukti rencana yang masih berlaku. Backlog terbuka saja bukan komitmen Todo. |

- Satu card muncul sekali sesuai kategori yang berlaku. Jika format project memisahkan periode (misalnya Yesterday/Today), card boleh muncul pada periode berbeda hanya dengan bukti hasil dan rencana masing-masing.
- Card yang dihentikan, dibatalkan, atau ditunda tanpa rencana lanjut tidak menjadi Doing/Todo, walaupun masih ter-assign. Menunggu review atau feedback saja bukan task baru. Jika project memiliki bagian Review/Blocked/On hold, cantumkan card di sana sesuai statusnya; jika tidak, cukup tercatat pada card, tanpa membuat item pengisi di tiga kategori utama.
- Contoh yang tidak menjadi item: "Menunggu review dokumentasi; tangani feedback ketika masuk" atau "Task currency dan filter tetap dihentikan". Jika feedback benar-benar sudah masuk dan pengerjaannya disepakati, laporkan card terkait beserta pekerjaan konkretnya.
- Kategori yang sudah diperiksa dan kosong ditulis **Tidak ada**. Jika akses gagal atau bukti belum cukup, tulis **Belum dapat diverifikasi: <sebab singkat>**; jangan menyamakan data yang belum terbaca dengan tidak ada pekerjaan.

## 3. Susun dan sampaikan

Format daily report mengikuti project, sehingga tidak dibatasi menjadi 1–2 kalimat untuk seluruh laporan. Tetap gunakan satu baris singkat per card; detail validasi hanya saat diminta. Fallback jika belum ada format project:

```markdown
Daily report — <project> — <tanggal>

Done
- [#<IID> <judul card>](<URL card>) — <hasil singkat>

Doing
- Tidak ada

Todo
- Tidak ada
```

Sebelum mengirim, cocokkan setiap item dengan card, scope pemilik, periode, dan bukti kategorinya. Pastikan tidak ada task rekaan, card yang dihentikan sebagai rencana aktif, atau pengingat alur QA rutin. Jika semua kategori kosong, tetap tulis "Tidak ada" pada masing-masing kategori.

Balas di surface asal atau tujuan yang sudah diotorisasi. Permintaan laporan atau jadwal yang sah tetap mendapat laporan meskipun kosong; notifikasi otomatis yang hanya mengulang laporan yang sudah terkirim mengikuti aturan deduplikasi di `SKILL.md`. Penyusunan laporan tidak mengubah assignment, label, state card, atau membuat card untuk mengisi bagian kosong.
