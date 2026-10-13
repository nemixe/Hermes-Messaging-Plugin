# Daily report

Dipakai dari Understanding saat ada permintaan laporan harian atau trigger jadwal yang sudah diotorisasi. Ini laporan read-only atas card GitLab, bukan state pekerjaan baru. Menambahkan tool ini tidak membuat jadwal atau memberi izin posting ke channel lain.

## 1. Scope dan format project

- Tentukan project, pemilik pekerjaan, tanggal/periode, dan zona waktu dari request serta konteks project. Default pemilik adalah CoDev; Yesterday berarti kemarin dan Today berarti hari ini dalam zona waktu project atau user. Jangan memperluas ke seluruh tim tanpa permintaan.
- Gunakan format yang diminta user. Jika tidak ditentukan, baca konvensi laporan di memory project/repo melalui `memories/INDEX.md` dan contoh daily report terbaru yang disepakati tim di konteks atau thread project yang boleh diakses. Pertahankan heading, urutan, bahasa, dan periode tiap bagian; format Yesterday/Today mengikuti periodenya, bukan dipaksa menjadi hari ini semua.
- Beberapa project dilaporkan terpisah memakai format masing-masing. Jika format belum tersedia, gunakan fallback di bawah; jangan mengarang konvensi project atau meminta ulang format yang sudah tersedia.

## 2. Verifikasi card dan kategori

Gunakan `PROJECT.yaml` untuk menentukan repo yang relevan, termasuk repo task-management bila card berada terpisah dari kode. History sesi dan memory hanya membantu menemukan card; baca card GitLab beserta label/status, assignee, dan aktivitas pada periode laporan sebagai bukti. Ambil seluruh halaman hasil dalam scope sebelum menyimpulkan tidak ada card.

Setiap item pekerjaan wajib berupa **satu card GitLab yang terverifikasi**, dengan link, judul, dan hasil/status singkat bila perlu. Nomor card atau rencana dari percakapan saja belum cukup. MR, commit, hasil tes, dan catatan internal boleh mendukung status card, tetapi bukan item task tersendiri. Identitas card memakai project dan IID agar nomor yang sama dari repo berbeda tidak tertukar.

Ikuti arti kategori dan status board project melalui peta `## Board` repo (`tools/board.md`), serta periode bagian laporan:

| Kategori | Syarat masuk |
|---|---|
| What Was Done Yesterday | Card yang selesai kemarin, dengan bukti aktivitas/status pada periode tersebut. |
| What Will Be Done Today | Hanya card yang sudah berstatus Done dan terbukti selesai hari ini saat laporan dibuat. Tulis hasilnya sebagai pekerjaan yang sudah selesai, meskipun heading memakai bentuk rencana. Jika tidak ada card yang memenuhi syarat, hilangkan bagian ini. |
| Any Blockers | Hambatan nyata yang masih berlaku, dengan link card terkait dan kebutuhan konkret untuk melanjutkan. Kebutuhan trigger normal saja bukan blocker. |

- Done mengikuti kriteria selesai yang disepakati project. State CoDev Completed atau MR merged saja tidak otomatis berarti card Done.
- CoDev membutuhkan trigger untuk mengerjakan task. Assignment, backlog, rencana sebelumnya, task Doing, atau feedback yang belum dikerjakan tidak cukup untuk mengisi Today/Todo dengan janji pekerjaan. Aturan ini juga berlaku bila project memakai nama heading lain.
- Satu card muncul sekali pada bagian pekerjaan sesuai periode selesainya. Card yang dihentikan, dibatalkan, atau ditunda tidak menjadi rencana aktif; laporkan di Any Blockers hanya jika ada hambatan nyata yang masih perlu diselesaikan.
- Bagian Yesterday dan Blockers yang sudah diperiksa dan kosong ditulis **Tidak ada**. Jika akses gagal atau bukti belum cukup, tulis **Belum dapat diverifikasi: <sebab singkat>** pada bagian terkait, termasuk Today; hilangkan Today hanya setelah terverifikasi tidak ada card Done hari ini.

## 3. Susun dan sampaikan

Format daily report mengikuti project, sehingga tidak dibatasi menjadi 1–2 kalimat untuk seluruh laporan. Tetap gunakan satu baris singkat per card; detail validasi hanya saat diminta. Fallback jika belum ada format project:

```markdown
Daily report — <project> — <tanggal>

What Was Done Yesterday
- [#<IID> <judul card>](<URL card>) — <hasil yang selesai kemarin>

What Will Be Done Today
- [#<IID> <judul card>](<URL card>) — Sudah selesai hari ini: <hasil singkat>

Any Blockers
- Tidak ada
```

Hilangkan bagian What Will Be Done Today dari contoh bila tidak ada card Done hari ini. Pesan "Morning @channel" beserta pengingat update adalah contoh permintaan laporan, bukan isi laporan yang perlu disalin atau dikirim ulang.

Sebelum mengirim, cocokkan setiap item dengan card, scope pemilik, periode, dan bukti kategorinya. Pastikan Today hanya berisi hasil yang sudah Done hari ini, tanpa janji pekerjaan yang masih membutuhkan trigger atau pengingat alur QA rutin.

Balas di surface asal atau tujuan yang sudah diotorisasi. Permintaan laporan atau jadwal yang sah tetap mendapat laporan meskipun kosong; notifikasi otomatis yang hanya mengulang laporan yang sudah terkirim mengikuti aturan deduplikasi di `SKILL.md`. Penyusunan laporan tidak mengubah assignment, label, state card, atau membuat card untuk mengisi bagian kosong.
