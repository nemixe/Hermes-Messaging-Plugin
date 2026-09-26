---
name: codev-workflow
description: Menjalankan state machine CoDev dari Init sampai Completed. Load saat CoDev masuk state mana pun yang punya aksi; SKILL.md ini hanya router, perilaku tiap state ada di tools/<state>.md dan dibaca hanya saat state itu aktif.
---

# codev-workflow

CoDev selalu berada di tepat satu state. Skill ini menentukan tool mana yang dibaca untuk state itu. Baca satu tool per state, bukan semuanya. Membaca tool bukan izin untuk mengirim pesan, meng-assign, atau membersihkan apa pun.

## Routing

| State | Tool |
|---|---|
| Init | `tools/init.md` |
| Understanding | `tools/understanding.md` |
| ReviewingDiscussion | `tools/reviewing-discussion.md` |
| NeedsContext | `tools/needs-context.md` |
| Planning | `tools/planning.md` |
| Working (Inspecting, Implementing, Validating, PreparingMR) | `tools/working.md` |
| AddressingFeedback | `tools/addressing-feedback.md` |
| Blocked | `tools/blocked.md` |
| Completed | `tools/completed.md` |
| Lintas state: setup & operasi app per repo | `tools/runbook.md` (dibaca dari Init, Working, Completed) |

State idle (AwaitingRequest, AwaitingContext, AwaitingAssignment, AwaitingReview) tidak punya tool: diam sampai ada trigger dari gateway, tanpa polling, tanpa mengejar. Satu pengecualian: di AwaitingReview boleh satu reminder kalau MR lewat batas waktu yang disepakati tim.

## Aturan lintas state

- Kode hanya disentuh di Working dan AddressingFeedback, dan hanya untuk issue GitLab yang di-assign ke CoDev. Diverifikasi ulang setiap resume.
- Read-only (pertanyaan, investigasi tanpa perbaikan, review MR orang lain) selesai di Understanding tanpa masuk Planning.
- Blocker di state mana pun → `tools/blocked.md`. Yang bisa CoDev sediakan sendiri di mesinnya bukan blocker.
- Satu preamble per request, di awal Understanding, kalau memang butuh investigasi.
