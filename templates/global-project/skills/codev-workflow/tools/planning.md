# Planning

Planning mengubah request menjadi plan di card GitLab. Dua skill berurutan: `superpowers/brainstorming` menghasilkan desain yang disetujui tim, `superpowers/writing-plans` mengubahnya menjadi plan. Semuanya berjalan di surface asal, tanpa file dan tanpa commit; file `docs/superpowers/specs/` dan `docs/superpowers/plans/` yang kedua skill itu minta baru ditulis dan dicommit oleh sesi issue di Working.

1. **Desain dengan `superpowers/brainstorming`.** Baca `memories/semantic/repositories/<gitlab-id>.md` (konvensi, entry point) dan `semantic/decisions/` (keputusan yang sudah ada) sebelum mengusulkan apa pun. Klasifikasikan path dan sebutkan ke tim: spike, bounded, atau architectural; ragu → path yang lebih berat. Pertanyaan satu per satu, pilihan ganda kalau bisa. Setiap pertanyaan atau desain yang menunggu jawaban → AwaitingContext; balasan masuk → kembali ke langkah ini. Visual companion tidak tersedia, jangan ditawarkan.
   - **Spike**: sepakati pertanyaan dan cara probe, investigasi read-only (tanpa file, tanpa commit), laporkan rekomendasi di surface asal. Tidak ada card dan tidak ada plan → AwaitingRequest. Probe yang butuh kode bukan spike: klasifikasi ulang.
   - **Bounded**: pertanyaan yang memang mengubah desain, lalu desain singkat di surface asal (pendekatan, file yang disentuh, cara test). Berhenti sampai tim bilang ya.
   - **Architectural**: pertanyaan, 2–3 pendekatan dengan rekomendasi, desain per section dengan persetujuan tiap section, lalu spec tertulis diposting utuh di surface asal untuk review (bukan file). Spec disetujui → langkah 2.
2. **Plan dengan `superpowers/writing-plans`.** Dari desain (bounded) atau spec (architectural) yang disetujui, susun plan lengkap sesuai skill: header, file per task, interface antar task, step test-first, cara verifikasi, commit per task, self-review. Declared preference CoDev untuk skill ini:
   - Bounded juga mendapat plan tertulis, karena sesi Working tidak melihat percakapan ini. Plan bounded pendek, satu atau dua task.
   - Execution method selalu Native (`superpowers/executing-plans` di Working). Tidak ditanyakan.
   - Execution handoff diganti langkah 3: plan tidak disimpan ke file, tapi ke card.
3. **Buat atau perbarui issue GitLab.** Card adalah satu-satunya jembatan konteks ke sesi Working, yang tidak bisa melihat percakapan Mattermost. Isi wajib:
   - **Tujuan** dan **pendekatan** yang disepakati.
   - **Spec** (architectural) utuh, section terpisah.
   - **Plan** hasil writing-plans, utuh di deskripsi card.
   - **Konteks diskusi**: keputusan yang diambil, alternatif yang ditolak dan alasannya, constraint, siapa yang memutuskan.
   - **Definition of done / AC**; untuk QA sertakan langkah tes dan expected result.
   - **Permalink** thread Mattermost (atau diskusi GitLab) tempat brainstorming terjadi, plus PIC yang terlibat.
   Kalau brainstorming menghasilkan keputusan yang berlaku lintas issue, tulis `memories/semantic/decisions/<id>-<slug>.md` (konteks, alternatif, keputusan, alasan, status) dan index-kan; istilah/requirement baru ke `semantic/project.md`.
4. Card tidak otomatis di-assign ke CoDev. "Buatkan task" hanya membuat card. Assignment ke CoDev adalah persetujuan tim atas plan di card; review plan terjadi di sana, bukan lewat pertanyaan tambahan di thread.
5. Perubahan business scope atau arsitektur besar → siapkan proposal konkret, keputusan di tim.
6. Dependency atau ambiguitas yang menghentikan rencana → Blocked. Selain itu → AwaitingAssignment.
