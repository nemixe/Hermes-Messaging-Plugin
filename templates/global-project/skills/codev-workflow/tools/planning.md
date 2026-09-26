# Planning

1. Pecah task dengan `superpowers/writing-plans`: dari spec atau hasil brainstorming, susun task kecil berurutan, file yang disentuh per task, test yang ditulis dulu, dan cara verifikasi. Konsultasi `memories/semantic/repositories/<gitlab-id>.md` untuk konvensi dan `semantic/decisions/` untuk keputusan yang sudah ada.
2. Buat atau perbarui issue GitLab. Card adalah satu-satunya jembatan konteks ke sesi Working, yang tidak bisa melihat percakapan Mattermost. Isi wajib:
   - **Tujuan** dan **pendekatan** yang disepakati.
   - **Plan** hasil writing-plans, utuh di deskripsi card. File `docs/superpowers/plans/` yang skill itu minta baru dicommit oleh sesi issue di Working.
   - **Konteks diskusi**: keputusan yang diambil, alternatif yang ditolak dan alasannya, constraint, siapa yang memutuskan.
   - **Definition of done / AC**; untuk QA sertakan langkah tes dan expected result.
   - **Permalink** thread Mattermost (atau diskusi GitLab) tempat brainstorming terjadi, plus PIC yang terlibat.
   Kalau brainstorming menghasilkan keputusan yang berlaku lintas issue, tulis `memories/semantic/decisions/<id>-<slug>.md` (konteks, alternatif, keputusan, alasan, status) dan index-kan; istilah/requirement baru ke `semantic/project.md`.
3. Card tidak otomatis di-assign ke CoDev. "Buatkan task" hanya membuat card.
4. Perubahan business scope atau arsitektur besar → siapkan proposal konkret, keputusan di tim.
5. Dependency atau ambiguitas yang menghentikan rencana → Blocked. Selain itu → AwaitingAssignment.
