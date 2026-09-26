# Runbook per repo

Satu file per repo: `memories/semantic/workflows/<gitlab-id>-runbook.md`. Tujuannya: iterasi berikutnya tidak perlu menemukan ulang cara menjalankan app. Dipakai di Init (dibuat), Working (dipakai dan dikoreksi), Completed (ditambah deploy).

## Kapan dibaca dan ditulis

- **Masuk Working untuk repo apa pun**: baca runbook-nya dulu. Kalau `status: current` dan `verified_at` masih cocok dengan revisi repo → jalankan langkah-langkahnya, jangan eksplorasi ulang.
- **Runbook tidak ada, stale, atau ada langkah yang gagal** → discovery: baca README, manifest, Dockerfile/compose, CI config, Makefile/script, lalu coba jalankan. Tiap langkah yang terbukti jalan langsung dicatat; yang gagal dicatat sebagai gagal beserta gejalanya, bukan sebagai prosedur.
- **Selesai Working**: perbarui `verified_at` dan revisi repo yang diverifikasi. Perubahan yang mengubah cara jalan (dependency baru, env baru, migration) wajib masuk runbook di MR yang sama.

## Isi wajib

```markdown
---
title: <nama repo> runbook
scope: repositories/<gitlab-id>
status: current | proposed | superseded
verified_at: <tanggal> @ <commit>
---
## Current
1. Prasyarat runtime: bahasa/versi, package manager, docker, service eksternal (db, cache, queue).
2. Clone & branch: remote, default branch, cara buat worktree issue.
3. Dependency: perintah install, cache/lockfile yang harus dihormati.
4. Env: daftar NAMA variabel, file/lokasi (.env.example → .env), mana yang wajib, dari mana nilainya diminta (PIC). Tanpa nilai.
5. Database: create, migrate, seed; perintah reset; data awal yang penting.
6. Start: perintah jalan, port, URL lokal, cara stop; konflik port/data kalau dua worktree jalan bersamaan.
7. Health check: cara tahu app benar-benar hidup (endpoint, log yang harus muncul).
8. Akses app: akun uji/role yang tersedia dan di mana credential-nya disimpan (private runtime state), langkah login, batasan (mis. OTP, SSO).
9. Test & lint: perintah unit/integration/e2e, quality gate Sonar, durasi kira-kira.
10. Build & deploy: perintah build, environment tujuan, siapa yang berwenang, cara verifikasi hasil deploy.
11. Jebakan yang sudah ditemui: gejala → penyebab → solusi.
## Sources
## History
```

## Aturan

- Perintah ditulis persis seperti yang berhasil dijalankan, dengan working directory-nya.
- Secret tidak pernah masuk runbook; hanya nama variabel dan lokasi. Credential akun uji disimpan di private runtime state profil CoDev dan runbook hanya menunjuk ke sana.
- Langkah yang belum dicoba ditandai `belum diverifikasi`, bukan ditulis seolah pasti.
- Runbook yang dibuat orang lain (README, doc repo) tetap otoritatif untuk niatnya; runbook memory mencatat apa yang benar-benar jalan di mesin CoDev dan penyimpangannya.
- Kalau dua repo saling bergantung (FE butuh BE hidup), tulis urutan start lintas repo di `semantic/architecture.md` dan link dari kedua runbook.
