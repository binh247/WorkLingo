# WorkLingo — Roadmap (ánh xạ GSD Phase ↔ Feature)

> **Nguồn sự thật:** [docs/06-roadmap.md](docs/06-roadmap.md),
> [docs/04-features.md](docs/04-features.md). Điểm vào: [PROJECT.md](PROJECT.md).
>
> GSD lập kế hoạch theo **số phase** (`plan-phase 1`, `2`...). Docs WorkLingo đánh
> số theo **feature** (F1–F8) và **giai đoạn** ([MVP], [GĐ2], [GĐ3]). Hai hệ này
> KHÔNG tự khớp — bảng dưới là ánh xạ chính thức. Mỗi khi xong một phase, đổi
> `⬜ chưa làm` → `✅ done`.
>
> **Trạng thái hiện tại: tất cả ⬜ chưa làm** (dự án chưa có code, mới có docs +
> kế hoạch trong [`.planning/`](.planning/)).

## Bảng ánh xạ phase

| GSD Phase | Tiêu đề | Feature ID (docs/04) | Giai đoạn | Trạng thái | Phụ thuộc | File kế hoạch |
|-----------|---------|----------------------|-----------|------------|-----------|---------------|
| 1 | Framework / Nền tảng | (hạ tầng — chưa gắn F; đặt nền cho mọi F: schema, lib/db, lib/config, lib/repositories, lib/ai, lib/auth) | MVP | ✅ done | — (không phụ thuộc) | [.planning/phase-1-framework-foundation-plan.md](.planning/phase-1-framework-foundation-plan.md) |
| 2 | AI Ingest + Import + Duyệt transcript | F2, F2.5 | MVP | ✅ done (ingest test thật qua endpoint my-gpt) | Phase 1 | [.planning/phase-2-ai-ingest-import-review-plan.md](.planning/phase-2-ai-ingest-import-review-plan.md) |
| 3 | Học + Chọn từ thông minh + Flashcard | F3 (gồm khởi tạo TTS F8 ở lib/tts) | MVP | ✅ done | Phase 1, 2 | [.planning/phase-3-study-wordselection-flashcards-plan.md](.planning/phase-3-study-wordselection-flashcards-plan.md) |
| 4 | Ôn tập SRS + Gamification | F4 (streak/XP/confetti mức cơ bản) | MVP | ✅ done (chưa có asset mp3/Lottie — sound no-op) | Phase 1, 3 | [.planning/phase-4-srs-gamification-plan.md](.planning/phase-4-srs-gamification-plan.md) |
| 5 | Auth + Admin + Dashboard + Deploy | F1, F1b, F1c, F1d, F5 | MVP | ✅ done — **MVP HOÀN CHỈNH** (Google/SMTP bật khi có env) | Phase 1, 2, 3, 4 | [.planning/phase-5-auth-admin-dashboard-deploy-plan.md](.planning/phase-5-auth-admin-dashboard-deploy-plan.md) |
| 6 | GĐ2 — Audio/Video, YouTube, Ngữ pháp | F6, F7 (+ import phụ đề YouTube) | GĐ2 | ✅ F7 done (test thật); F6 audio/Whisper wired (cần endpoint Whisper) | Phase 2, 3 | [.planning/phase-6-phase2-media-grammar-plan.md](.planning/phase-6-phase2-media-grammar-plan.md) |
| 7 | GĐ3 — Thống kê, Social, Export, Cloud TTS | Heatmap/thống kê chi tiết, Hearts/level/bảng xếp hạng, Export Anki, Cloud TTS + cache (nâng cấp F8) | GĐ3 | ✅ stats/level/leaderboard/heatmap/export Anki done; Cloud TTS để sau (cần endpoint) | Phase 3, 4, 5 | [.planning/phase-7-phase3-stats-social-export-plan.md](.planning/phase-7-phase3-stats-social-export-plan.md) |

> **Ghi chú feature:** Phase 1 là hạ tầng nền (không tương ứng 1 feature người
> dùng cụ thể) nhưng tạo schema **đầy đủ mọi bảng** + các tầng lib cho các phase
> sau. **F8 (TTS)** trải dài: khởi tạo `lib/tts` (Web Speech) ở Phase 3, nâng lên
> Cloud TTS + cache ở Phase 7. **Admin (F1d)** thuộc Phase 5.

## Thứ tự build (theo cột Phụ thuộc)

```
Phase 1 (nền tảng — không phụ thuộc)
   │
   ├─► Phase 2 (Ingest/Import/Duyệt)
   │       │
   │       ├─► Phase 3 (Học/Chọn từ/Flashcard)
   │       │       │
   │       │       ├─► Phase 4 (SRS/Gamification)
   │       │       │       │
   │       │       │       └─► Phase 5 (Auth/Admin/Dashboard/Deploy)  ◄── cần 1,2,3,4
   │       │       │
   │       │       └─► Phase 6 (GĐ2: Audio/YouTube/Ngữ pháp)  ◄── cần 2,3
   │       │
   │       └─► (Phase 6 cũng cần Phase 3)
   │
   └─► Phase 7 (GĐ3: Thống kê/Social/Export/Cloud TTS)  ◄── cần 3,4,5
```

- **MVP** = Phase 1 → 2 → 3 → 4 → 5 (xong theo thứ tự là hoàn thành MVP).
- **Phase 6 (GĐ2)** có thể bắt đầu sau Phase 3 (chỉ cần 2 và 3), song song với
  Phase 4/5 nếu muốn — nhưng nên đóng MVP (đến Phase 5) trước.
- **Phase 7 (GĐ3)** cần Phase 5 (Auth/Admin/Dashboard) nên là phase cuối.

## Quy mô từng phase (tham khảo, từ file kế hoạch)

| Phase | Số task | Trọng tâm giao nộp |
|-------|---------|--------------------|
| 1 | 18 | Scaffold Next.js 15 + theme Duolingo; Drizzle schema TẤT CẢ bảng + 5 index; lib/db, lib/config (seed 7 key), lib/repositories skeleton (luôn `where user_id`), lib/ai/tts/srs skeleton, lib/auth tối thiểu |
| 2 | 12 | lib/ai/ingest (gpt-4o, structured output + Zod + retry, chunk theo `ingest_chunk_size`), `/api/ingest`, màn Import + Duyệt & sửa, SentenceView (furigana ruby từ tokens) |
| 3 | 16 | Thuật toán "từ đáng học" (i+1, tần suất on-the-fly), `user_words`, WordPopup (nghĩa tức thì, 0 API), lib/tts (Web Speech, đọc theo reading kana), saveWordAsCards (1 note + N cards theo enabled_card_types) |
| 4 | 17 | lib/srs (bọc ts-fsrs, chỉ file này import ts-fsrs), getDue qua index `cards(user_id,suspended,due)`, submitReview transaction (reviews + fsrs_state + user_stats), ReviewCard 4 loại, Celebration (confetti + Lottie), Howler |
| 5 | 22 | Auth.js (Credentials + bcryptjs + Google OAuth, session JWT), `users.password_hash/role/disabled`, /login /forgot /reset /change-password, middleware + requireUser/requireAdmin, /dashboard, /admin + /admin/users/content/settings, deploy (PM2 + Caddy + backup pg_dump) |
| 6 | 16 | Upload audio/video → lib/storage (filesystem tự host) → Whisper (verbose_json) → Ingest; import phụ đề YouTube; lib/ai/grammar (giải thích ngữ pháp tiếng Việt, không persist); `sources.audio_url` + `sentences.audio_start`; mọi tính năng gắn `feature_flags` |
| 7 | 16 | /stats (heatmap CSS Grid + Recharts), level/hearts/leaderboard (lib/gamification), Export Anki (.apkg, fallback TSV), Cloud TTS adapter (OpenAI tts-1) + cache mp3 theo sha256 |

## Quyết định kiến trúc xuyên suốt (tóm tắt — chi tiết ở PROJECT.md / docs)

- **PostgreSQL tự host, KHÔNG Supabase** (Drizzle + postgres.js, kết nối trực tiếp).
- **Cấu hình hệ thống ở `app_settings` qua `lib/config`** (cache TTL 30s + fallback
  DEFAULTS + invalidate); chỉ secret khởi động ở env.
- **AI Ingest = OpenAI gpt-4o, 1 lượt** (structured output + Zod + retry), lưu vào
  `sentences.tokens`, không gọi AI lại lúc học/ôn; không Kuromoji/từ điển ngoài.
- **Tầng repository chống lock-in** — UI không chạm DB; mọi truy vấn `where user_id`;
  AI/TTS/SRS đều bọc sau lib interface.
