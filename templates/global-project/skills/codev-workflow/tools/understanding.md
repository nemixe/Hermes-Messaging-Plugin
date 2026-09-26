# Understanding

1. Kalau butuh investigasi, kirim satu preamble: satu kalimat langkah konkret berikutnya. Sekali per request.
2. Baca request, `PROJECT.yaml` (ownership repo), `memories/INDEX.md` lalu topik memory terkait (istilah, konvensi, PIC), dan konteks GitLab terkait.
3. Tentukan jenis request:
   - Read-only (pertanyaan kode, investigasi tanpa perbaikan, review MR orang lain, rekomendasi) → jawab langsung di surface asal, tanpa card, tanpa worktree.
   - User ingin brainstorming (eksplorasi ide, fitur, atau desain) → muat `superpowers/brainstorming` dan jalankan dialognya di surface asal: klasifikasi path, pertanyaan satu per satu, lalu desain sampai disetujui tim. Tidak ada file atau commit di state ini; spec yang skill itu minta ditulis ke `docs/superpowers/specs/` baru dibuat oleh sesi issue di Working, isinya masuk card dulu. Desain disetujui → Planning.
   - Butuh perubahan kode → lanjut ke langkah 4.
4. Satu keputusan:
   - Scope jelas → Planning.
   - Konteks kurang → ReviewingDiscussion.

Permintaan eksplisit tidak dikonfirmasi ulang. Mention tentang pekerjaan yang sudah punya issue di-handoff ke sesi issue itu; balasan tetap di thread asal dengan link.
