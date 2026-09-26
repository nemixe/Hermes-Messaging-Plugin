# Completed

Masuk saat MR approved atau merged. **Completed bukan card closed.** Tanggung jawab CoDev berlanjut sampai perubahan berhasil di-deploy dan lolos QA, demo, serta acceptance client di production. Card hanya ditutup PM/QA setelah itu; CoDev tidak pernah menutup card sendiri.

Siklus card setelah merge:

```
Merged → Deployed (tanggung jawab CoDev) → QA testing sesuai AC → Demo client → Pass di production → Closed (oleh PM/QA)
```

## 1. Deploy

CoDev memastikan perubahan sampai ke environment tujuan (staging/UAT, atau sesuai `memories/semantic/workflows/` project itu):

- Kalau deploy lewat pipeline yang CoDev boleh jalankan, jalankan dan pantau sampai selesai.
- Kalau deploy butuh DevOps, minta ke PIC DevOps dengan format blocker: versi/commit, environment tujuan, dan apa yang perlu dilakukan.
- Verifikasi hasilnya sendiri di environment itu (smoke test sesuai AC), bukan hanya status pipeline hijau.
- Deploy gagal karena kode → issue yang sama, worktree yang sama, MR baru. Gagal karena infra → blocker ke DevOps.

Ownership repo tidak memberi otoritas deploy ke production. Production hanya lewat jalur dan orang yang berwenang.

## 2. Handoff ke QA

Pindahkan status card ke testing (bukan closed), mention PIC QA di card. Isi handoff:

- Environment dan versi yang di-deploy.
- Checklist AC dari card, tiap poin diberi cara verifikasi dan expected result.
- Bukti yang sudah ada: hasil test, screenshot/log smoke test.
- Coverage gap: apa yang belum diuji CoDev dan kenapa.

## 3. Lapor di surface asal

Catat handoff QA di issue GitLab. Jika request awal task berasal dari thread Mattermost dan permalink di issue cocok dengan channel/thread yang diverifikasi, SOUL mengizinkan satu ringkasan non-teknis di thread asal setelah deploy terverifikasi: apa yang sekarang bisa dilakukan, di environment mana, dan bahwa task siap QA. Gunakan `mattermost-access` untuk memeriksa tujuan sebelum posting. Jika asalnya GitLab, tidak terbukti, atau gateway sudah menyampaikan ringkasan itu di thread asal, jangan mengirim pesan Mattermost. Thread, channel, dan DM lain tetap memerlukan izin eksplisit.

## 4. Setelah handoff

- Temuan QA, hasil demo, atau bug dari client di production masuk sebagai diskusi GitLab di issue yang sama → AwaitingRequest → Conversation → perbaikan di worktree issue yang sama dengan MR baru. Card tidak dibuat ulang.
- Worktree issue dipertahankan sampai card closed, bukan sampai MR merged.
- Memory: handoff, environment, versi, dan link MR ke `memories/episodic/YYYY-MM-DD.md`. Cara deploy dan verifikasinya yang baru terbukti masuk bagian Build & deploy di runbook repo (`tools/runbook.md`). Keputusan yang berubah selama review → update `semantic/decisions/`. Refresh `INDEX.md` kalau ada halaman baru.

→ AwaitingRequest.
