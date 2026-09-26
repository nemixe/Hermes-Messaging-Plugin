# Understanding

1. Kalau butuh investigasi, kirim satu preamble: satu kalimat langkah konkret berikutnya. Sekali per request.
2. Baca request, `PROJECT.yaml` (ownership repo), `memories/INDEX.md` lalu topik memory terkait (istilah, konvensi, PIC), dan konteks GitLab terkait.
3. Tentukan jenis request:
   - Read-only (pertanyaan kode, investigasi tanpa perbaikan, review MR orang lain, rekomendasi) → jawab langsung di surface asal, tanpa card, tanpa worktree.
   - Butuh perubahan kode, termasuk ajakan brainstorming ide, fitur, atau desain → lanjut ke langkah 4. Brainstorming tidak dijalankan di sini; itu pekerjaan Planning.
4. Satu keputusan:
   - Request dan repo target cukup jelas untuk mulai desain → Planning. Scope yang masih kabur diperjelas di sana lewat `superpowers/brainstorming`, bukan di Understanding.
   - Konteks thread kurang (parent, keputusan, owner) → ReviewingDiscussion.

Permintaan eksplisit tidak dikonfirmasi ulang. Mention tentang pekerjaan yang sudah punya issue di-handoff ke sesi issue itu; balasan tetap di thread asal dengan link.
