# GSD Phase 1 — Framework / Nền tảng

> Tài liệu kế hoạch GSD cho Phase 1 dự án **Bloóm**. Bám sát:
> [02-architecture.md](../docs/02-architecture.md),
> [03-data-model.md](../docs/03-data-model.md),
> [05-design-system.md](../docs/05-design-system.md),
> [06-roadmap.md](../docs/06-roadmap.md) (Sprint 1) và mockup chuẩn
> [`mockups/index.html`](../mockups/index.html).

## Mục tiêu

Dựng **bộ khung dự án chạy được** (nền tảng / scaffold) làm bệ phóng cho mọi
phase sau. Phase này KHÔNG xây tính năng nghiệp vụ đầy đủ (Ingest thật, study,
review, auth flow) — chỉ dựng khung + skeleton để các phase sau cắm logic vào.

Phạm vi cụ thể:

1. **Khởi tạo Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui.**
2. **Theme Duolingo:** font Nunito (+ Noto Sans JP cho kanji/kana), color tokens
   làm CSS variables map vào Tailwind, bộ component chuẩn (`.btn-3d` + biến thể
   màu, `.wl-input`, `.wl-select`, `.wl-card`, `.wl-badge`, `.wl-chip`), component
   React `Button3D`, `ProgressBar`, `Card`; cài Motion.
3. **PostgreSQL tự host** (đã có `docker-compose.yml` + `.env`) chạy được, kết nối
   qua `DATABASE_URL`.
4. **Drizzle ORM (`lib/db`)** + **schema cho TẤT CẢ bảng** (users/accounts/
   sessions/verification_tokens của Auth.js + sources, sentences, notes, cards,
   reviews, user_words, user_stats, user_settings, app_settings) + index gợi ý;
   **migration sinh bởi drizzle-kit** và apply được lên DB.
5. **Tầng repository skeleton** (`lib/repositories`): cards, sources, settings,
   stats — chữ ký hàm + lọc `user_id` (chống lock-in, chống lộ dữ liệu).
6. **`lib/ai` skeleton:** interface chung + `openai.ts` (cấu hình client) +
   `ingest.ts` (stub) + `prompts.ts` (chỗ giữ prompt/schema).
7. **`lib/config` + bảng `app_settings` + seed key mặc định** (cache + fallback).
8. **`lib/tts` skeleton** (interface `speak()` — Web Speech API ở MVP).
9. **`lib/srs` skeleton** (wrap ts-fsrs — chữ ký `getDue`/`schedule`).

> **Định nghĩa "chạy được" của Phase 1:** `npm run build` xanh; `npm run dev` mở
> được trang chủ render theme Duolingo; `docker compose up -d` + `drizzle-kit
> migrate` tạo đủ bảng; chạy script seed → bảng `app_settings` có đủ 7 key mặc
> định; mọi file skeleton trong `lib/` import được, type-check sạch.

## Phụ thuộc

**Phụ thuộc phase trước: KHÔNG có** — đây là phase đầu tiên (`dependsOn: []`).

Tương ứng **Sprint 1 — Nền tảng** trong [06-roadmap.md](../docs/06-roadmap.md).
Mọi phase sau (AI Ingest, study/sentence mining, SRS, gamification, auth, admin)
đều **phụ thuộc Phase 1**, vì cần:

- Cấu trúc thư mục + tooling (Next.js/TS/Tailwind/shadcn) để có nơi đặt code.
- Schema + migration để có bảng thật cho repository/feature thao tác.
- Tầng repository (chữ ký hàm) để feature gọi mà không chạm DB trực tiếp.
- `lib/config` + `app_settings` để mọi nơi đọc cấu hình hệ thống (model AI,
  chunk size, default card types...) thay vì hard-code.
- `lib/ai`/`lib/tts`/`lib/srs` skeleton (interface) để Sprint 2–4 chỉ cần điền
  cài đặt cụ thể mà không phải đổi chữ ký phía gọi.

**Điều kiện bên ngoài đã sẵn / có thể trì hoãn:** `OPENAI_API_KEY` chỉ cần ở
Sprint 2 (Ingest), Google OAuth chỉ cần ở Sprint 5 (auth). Phase 1 chạy được mà
**không cần** các secret này (skeleton AI không gọi API thật).

## Quyết định triển khai (discuss-phase)

Các điểm "xám" cần chốt trước khi sinh task, kèm lựa chọn và lý do (bám docs).

### QĐ-1 — Tailwind v4 hay v3 + cách khai báo token

**Chốt:** Dùng **Tailwind CSS v4** (mặc định khi `create-next-app` mới) với
khai báo color tokens làm **CSS variables** trong `app/globals.css` rồi map qua
`@theme` (v4). Bộ component chuẩn (`.btn-3d`, `.wl-input`, `.wl-card`...) được
**port nguyên xi** từ `mockups/index.html` vào `globals.css` (giữ đúng số: bo
góc `1rem`, viền `2px` + đáy `4px`, padding `.75rem 1.5rem`, font-weight 800).

**Lý do:** 05-design-system.md §2 yêu cầu "định nghĩa CSS variables + map vào
Tailwind theme để dễ đổi màu về sau"; mockup đã có sẵn CSS chuẩn → tái dùng để
code thật khớp mockup 1-1 (key decision: "Chuẩn này định nghĩa trong CSS dùng
chung của mockup và áp cho code thật"). Color tokens chốt theo mockup:
`brand #58CC02 / dark #46A302`, `danger #FF4B4B / dark #E04343`, `xp #FFC800`,
`info #1CB0F6 / dark #1799D6`, `ink #3C3C3C`, `muted #AFAFAF`, nền `#FFFFFF/#F7F7F7`.

### QĐ-2 — `id` của tất cả bảng nghiệp vụ là `uuid`, default `gen_random_uuid()`

**Chốt:** Mọi bảng nghiệp vụ (sources, sentences, notes, cards, reviews) dùng PK
`uuid` với default `gen_random_uuid()` (pgcrypto/built-in Postgres 18). Bảng auth
của Auth.js (`users`, `accounts`, `sessions`, `verification_tokens`) dùng **đúng
schema chuẩn của `@auth/drizzle-adapter`** (users.id `text`/`uuid` theo adapter)
để tránh lệch khi cắm Auth.js ở Sprint 5. FK `user_id` ở bảng nghiệp vụ trỏ về
`users.id` đúng kiểu của adapter.

**Lý do:** 03-data-model.md ghi rõ các bảng nghiệp vụ là `uuid (PK)`; bảng auth
"do Drizzle adapter tạo" nên phải theo chuẩn adapter để mang đi được
(02-architecture §1 chống lock-in). Dùng `gen_random_uuid()` tránh phụ thuộc
extension thừa.

### QĐ-3 — Lưu cấu trúc phức tạp bằng `jsonb` đúng như data-model

**Chốt:** `sentences.tokens` (`jsonb`), `cards.fsrs_state` (`jsonb`),
`user_settings.enabled_card_types` (`jsonb`), `app_settings.value` (`jsonb`) đều
khai báo `jsonb`. Tạo **type TypeScript** cho `tokens` (`Token = {surface,
reading, lemma, pos, meaning_vi, worthLearning}`) và gắn `.$type<Token[]>()` của
Drizzle để type-safe ở tầng repository. Các enum (`sources.type`,
`cards.type`, `user_words.status`, `app_settings.type`) khai báo bằng
**pgEnum** của Drizzle.

**Lý do:** 03-data-model.md §2 định rõ kiểu jsonb + cấu trúc tokens; key decision
"phân tích nằm trong sentences.tokens, không bảng cache riêng". pgEnum cho phép
DB ràng buộc giá trị + Drizzle suy luận type, giảm bug ở các phase sau.

### QĐ-4 — Index gợi ý đưa vào schema ngay từ Phase 1

**Chốt:** Khai báo sẵn 4 index trong schema (theo 03-data-model §5):
`cards(user_id, suspended, (fsrs_state->>'due'))` (lấy thẻ đến hạn),
`notes(sentence_id)` + `cards(note_id)`, `sentences(source_id)`,
`user_words(user_id, word)` (kiểm tra i+1). Index trên biểu thức `fsrs_state->>'due'`
khai báo bằng `sql` raw trong Drizzle index builder.

**Lý do:** roadmap Sprint 4 (SRS) và thuật toán i+1 phụ thuộc các index này; tạo
sớm trong migration nền tảng tránh phải sửa migration đã apply về sau.

### QĐ-5 — Repository skeleton trả stub có chữ ký thật + chỗ chèn `where user_id`

**Chốt:** Mỗi hàm repository có **chữ ký đầy đủ** (tham số `userId` đứng đầu, kiểu
trả về rõ ràng) nhưng thân hàm là stub: hoặc query thật tối thiểu (vd
`getStats` select 1 dòng) hoặc `throw new Error("not implemented")` cho hàm ghi
phức tạp, kèm comment `// TODO Sprint X`. **Mọi hàm có truy vấn DB đều viết sẵn
`where eq(table.userId, userId)`** để khoá pattern phân quyền từ đầu.

**Lý do:** 02-architecture §6 + 03-data-model §4: "mọi truy vấn repository luôn
kèm where user_id = currentUser"; roadmap rủi ro "quên lọc user_id → lộ dữ liệu"
→ giảm thiểu bằng "lọc tập trung ở repository + viết test". Khoá pattern ở
skeleton để phase sau chỉ điền logic, không quên lọc.

### QĐ-6 — `lib/config` cache in-memory TTL ngắn + fallback hằng số mặc định

**Chốt:** `lib/config.ts` đọc `app_settings` qua repository `settings.ts`, cache
`Map<string, value>` trong module với **TTL ngắn (vd 30s)** + hàm `invalidate()`
để Admin gọi sau khi sửa. Nếu key thiếu trong DB → trả **DEFAULTS** (hằng số khai
trong chính `lib/config`) trùng giá trị seed. API: `getConfig<T>(key): Promise<T>`.

**Lý do:** 02-architecture §8 + key decision: "lib/config cache app_settings TTL
ngắn + invalidate khi Admin sửa; fallback mặc định nếu key thiếu". TTL + fallback
giúp app không vỡ khi DB chưa seed hoặc Admin chưa cấu hình.

### QĐ-7 — `lib/ai` không gọi API thật ở Phase 1; chỉ interface + client + stub

**Chốt:** `lib/ai/index.ts` định nghĩa interface `AIProvider` (vd
`ingest(text): Promise<IngestResult>`). `openai.ts` khởi tạo client OpenAI
(`new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`) nhưng **không gọi** trong
Phase 1. `ingest.ts` export hàm `runIngest` stub `throw new Error("Ingest chưa
triển khai — Sprint 2")`. `prompts.ts` giữ hằng `INGEST_SYSTEM_PROMPT = ""` +
chỗ cho JSON schema. `IngestResult` type khớp cấu trúc `sentences[]` trong
03-data-model §3.

**Lý do:** key decision "bọc AI sau lib/ai (interface chung + openai.ts) để đổi
provider dễ"; roadmap đặt Ingest thật ở Sprint 2. Phase 1 chỉ cần khung để build
xanh mà không cần `OPENAI_API_KEY`.

### QĐ-8 — Seed `app_settings` bằng script idempotent `onConflictDoNothing`

**Chốt:** Tạo `lib/db/seed.ts` chạy bằng `tsx` (script npm `db:seed`), seed đúng
**7 key** từ 03-data-model §4: `openai_model="gpt-4o"`, `whisper_model="whisper-1"`,
`ingest_chunk_size=4000`, `max_import_chars=50000`,
`default_card_types=["recognition","cloze"]`, `tts_provider="webspeech"`,
`feature_flags={}` — kèm `type` và `description`. Dùng
`insert(...).onConflictDoNothing()` để chạy lại không lỗi/không ghi đè giá trị
Admin đã sửa.

**Lý do:** 03-data-model §4 liệt kê chính xác 7 key + value + type; roadmap
Sprint 1 yêu cầu "seed các key mặc định". Idempotent để an toàn khi chạy lại
trong CI/onboarding.

### QĐ-9 — Auth.js cấu hình tối thiểu (chưa bật provider) ở Phase 1

**Chốt:** Tạo `lib/auth.ts` khai báo cấu hình Auth.js + `DrizzleAdapter(db)` trỏ
vào schema auth, **danh sách providers để rỗng/comment** (Email + Google bật ở
Sprint 5). Route handler `app/api/auth/[...nextauth]/route.ts` export `GET/POST`
từ cấu hình. Thêm cột `users.role` (`pgEnum('user'|'admin')`, default `user`)
ngay trong schema.

**Lý do:** 03-data-model §4 yêu cầu cột `users.role` cho Admin; 02-architecture
§4 liệt kê `lib/auth.ts` + route handler trong cấu trúc thư mục. Tạo khung sớm
để Sprint 5 chỉ cần thêm provider, không phải tái cấu trúc.

### QĐ-10 — `lib/srs` skeleton dùng ts-fsrs, chưa nối DB

**Chốt:** `lib/srs.ts` import `ts-fsrs`, export `createEmptyState()`,
`schedule(state, rating, now)` (gọi `fsrs.repeat`/`next`), `isDue(state, now)`.
Chưa nối repository/reviews (việc đó ở Sprint 4). Type `Rating` map 1=Again,
2=Hard, 3=Good, 4=Easy đúng 03-data-model `reviews.rating`.

**Lý do:** key decision "ts-fsrs làm chuẩn SRS"; cấu trúc thư mục liệt kê
`lib/srs.ts`. Cung cấp chữ ký để Sprint 4 cắm vào màn review.

## Kế hoạch task nguyên tử (plan-phase)

> Mỗi task nhỏ, độc lập, commit riêng được. Thứ tự gợi ý theo phụ thuộc nội bộ
> (T1 → T2 → ... ). Đường dẫn khớp cấu trúc thư mục 02-architecture §4.

<task type="auto">
  <name>Khởi tạo Next.js 15 + TS + Tailwind</name>
  <files>package.json, tsconfig.json, next.config.ts, app/layout.tsx, app/page.tsx, app/globals.css, postcss.config.mjs, .gitignore</files>
  <action>Chạy `npx create-next-app@latest` tại thư mục gốc /Users/ongbinhit/working/source/Bloóm với lựa chọn: TypeScript, App Router, Tailwind CSS, ESLint, src dir = NO (dùng app/ ở gốc theo 02-architecture §4), import alias `@/*`. Vì thư mục đã có file (.env, docs, mockups...), khởi tạo vào thư mục tạm rồi copy các file scaffold (app/, package.json, tsconfig.json, next.config, postcss, globals.css) về gốc, KHÔNG đè .env/.env.example/docker-compose.yml/docs/mockups/.planning. Cập nhật .gitignore thêm node_modules, .next, .env. app/page.tsx tạm render một heading "Bloóm" để xác minh chạy.</action>
  <verify>npm install && npm run dev → mở http://localhost:3000 thấy trang "Bloóm"; npm run build chạy xanh.</verify>
  <done>Có package.json với Next 15 + React + TS; `npm run build` thành công; trang chủ render được; .env không bị ghi đè.</done>
</task>

<task type="auto">
  <name>Cài shadcn/ui + lucide-react</name>
  <files>components.json, components/ui/, lib/utils.ts, package.json</files>
  <action>Chạy `npx shadcn@latest init` (chọn style mặc định, base color neutral, CSS variables = yes). Thêm vài component nền: `npx shadcn@latest add button input select card badge dialog`. Cài lucide-react (đi kèm shadcn). Đảm bảo alias `@/components`, `@/lib/utils` khớp tsconfig. KHÔNG tự custom theme ở bước này (theme Duolingo làm ở task riêng).</action>
  <verify>npm run build xanh; tồn tại components/ui/button.tsx và lib/utils.ts; import { Button } from "@/components/ui/button" không lỗi.</verify>
  <done>Thư mục components/ui/ có các component shadcn; components.json hợp lệ; build xanh.</done>
</task>

<task type="auto">
  <name>Theme Duolingo: font + color tokens + bộ component chuẩn CSS</name>
  <files>app/globals.css, app/layout.tsx, tailwind.config.ts (nếu v3) hoặc app/globals.css @theme (v4)</files>
  <action>Trong app/layout.tsx cấu hình font Nunito (next/font/google, weights 400/700/800/900) + Noto Sans JP (weights 500/700) làm fallback cho kanji/kana; gắn vào body. Trong app/globals.css khai báo color tokens làm CSS variables theo mockups/index.html: brand #58CC02 / brand-dark #46A302, danger #FF4B4B / danger-dark #E04343, xp #FFC800, info #1CB0F6 / info-dark #1799D6, ink #3C3C3C, muted #AFAFAF, bg #FFFFFF/#F7F7F7; map vào Tailwind theme (@theme cho v4 hoặc tailwind.config cho v3). Port nguyên bộ component chuẩn từ mockups/index.html vào globals.css: .btn-3d (+ .btn-sm, :active, :disabled), biến thể .btn-primary/.btn-info/.btn-danger/.btn-xp/.btn-neutral, .wl-input, .wl-select, .wl-card, .wl-badge, .wl-chip/.wl-chip-on, và ruby rt (furigana). Body dùng font Nunito màu #3C3C3C nền trắng.</action>
  <verify>npm run dev → trang chủ dùng font Nunito; thêm tạm 1 nút class "btn-3d btn-primary" thấy nút xanh có đáy 3D, nhấn lún xuống; mở DevTools thấy CSS var --color-brand = #58CC02.</verify>
  <done>globals.css có đủ color tokens + .btn-3d + .wl-* + ruby rt; font Nunito + Noto Sans JP load; khớp mockup; build xanh.</done>
</task>

<task type="auto">
  <name>Cài Motion + component React Button3D, ProgressBar, Card</name>
  <files>components/Button3D.tsx, components/ProgressBar.tsx, components/Card.tsx, package.json</files>
  <action>Cài `motion` (framer-motion). Tạo components/Button3D.tsx: nhận prop variant ('primary'|'info'|'danger'|'xp'|'neutral'), size ('default'|'sm'), render <button> với class `btn-3d btn-{variant}` (+ btn-sm), spread props còn lại. components/ProgressBar.tsx: nhận value (0-100), dùng motion.div animate width theo value với easing mượt (<300ms), tôn trọng prefers-reduced-motion. components/Card.tsx: wrapper class `wl-card` + padding, nhận children + className. Tất cả TypeScript, có type props rõ ràng.</action>
  <verify>npm run build xanh; import 3 component vào app/page.tsx render thử: nút biến thể, ProgressBar value=60 animate, Card bọc nội dung — quan sát trên /.</verify>
  <done>3 component tồn tại, type-check sạch, render đúng style chuẩn; ProgressBar animate width; build xanh.</done>
</task>

<task type="auto">
  <name>Cài Drizzle + postgres.js + khởi tạo lib/db/index.ts</name>
  <files>lib/db/index.ts, drizzle.config.ts, package.json</files>
  <action>Cài `drizzle-orm`, `postgres`, và dev `drizzle-kit`, `tsx`, `@types/...` nếu cần. Tạo lib/db/index.ts: khởi tạo postgres.js client từ process.env.DATABASE_URL với connection pool (max hợp lý, vd 10) đúng 02-architecture §8 (long-running server, cổng 5432); export `db = drizzle(client, { schema })`. Tạo drizzle.config.ts trỏ schema=./lib/db/schema.ts, out=./drizzle, dialect=postgresql, dbCredentials.url=process.env.DATABASE_URL (đọc .env qua dotenv hoặc loadEnvConfig). Thêm npm scripts: "db:generate": "drizzle-kit generate", "db:migrate": "drizzle-kit migrate", "db:studio": "drizzle-kit studio".</action>
  <verify>docker compose up -d (Postgres 18 chạy); `npm run db:studio` kết nối được DB (hoặc `node -e` import lib/db không lỗi); type-check sạch (dù schema chưa có bảng).</verify>
  <done>lib/db/index.ts export db; drizzle.config.ts hợp lệ; scripts db:* có trong package.json; kết nối DATABASE_URL thành công.</done>
</task>

<task type="auto">
  <name>Schema bảng auth (Auth.js / Drizzle adapter) + cột role</name>
  <files>lib/db/schema.ts</files>
  <action>Trong lib/db/schema.ts khai báo 4 bảng auth theo chuẩn @auth/drizzle-adapter Postgres: users (id, name, email unique, emailVerified, image) + THÊM cột role bằng pgEnum('role', ['user','admin']) default 'user' (theo 03-data-model §4); accounts, sessions, verification_tokens đúng schema adapter (FK userId → users.id, onDelete cascade). Export các bảng. Cài `@auth/drizzle-adapter` và `next-auth@beta` (Auth.js v5) để có kiểu tham chiếu nếu cần.</action>
  <verify>npm run db:generate sinh migration chứa 4 bảng auth + cột role; type-check sạch.</verify>
  <done>schema.ts có users(+role enum)/accounts/sessions/verification_tokens khớp adapter; generate ra SQL hợp lệ.</done>
</task>

<task type="auto">
  <name>Schema bảng nội dung: sources + sentences (+ type Token)</name>
  <files>lib/db/schema.ts, lib/db/types.ts</files>
  <action>Thêm vào schema.ts: pgEnum sourceType ['chat','meeting','youtube','text']; pgEnum confidence ['high','medium','low']. Bảng sources: id uuid PK default gen_random_uuid(), userId uuid FK→users.id, type sourceType, title text, rawContent text, audioUrl text nullable (GĐ2), createdAt timestamptz default now(). Bảng sentences: id uuid PK, sourceId uuid FK→sources.id cascade, original text, text text, corrected boolean default false, note text nullable, confidence confidence, tokens jsonb .$type<Token[]>(), skipped boolean default false, translation text nullable, audioStart real nullable (GĐ2). Tạo lib/db/types.ts export `type Token = { surface: string; reading: string; lemma: string; pos: string; meaning_vi: string; worthLearning: boolean }` (đúng 03-data-model §2 cấu trúc tokens) và import vào schema.</action>
  <verify>npm run db:generate sinh migration sources + sentences với cột/enum đúng; type của tokens là Token[].</verify>
  <done>schema có sources + sentences khớp 03-data-model; Token type tái dùng; generate xanh.</done>
</task>

<task type="auto">
  <name>Schema bảng SRS: notes + cards + reviews (+ index)</name>
  <files>lib/db/schema.ts</files>
  <action>Thêm vào schema.ts: pgEnum cardType ['recognition','cloze','production','reading']. Bảng notes: id uuid PK, userId uuid FK→users, sentenceId uuid FK→sentences, targetWord text, reading text, meaning text, createdAt timestamptz. Bảng cards: id uuid PK, noteId uuid FK→notes, userId uuid FK→users, type cardType, fsrsState jsonb (đặt $type sau ở Sprint 4, tạm jsonb), suspended boolean default false, createdAt timestamptz. Bảng reviews: id uuid PK, cardId uuid FK→cards, rating integer (1-4), reviewedAt timestamptz default now(). Khai báo index theo 03-data-model §5: notes(sentenceId), cards(noteId), cards(userId, suspended, sql`(${cards.fsrsState}->>'due')`). Comment rating: 1=Again 2=Hard 3=Good 4=Easy.</action>
  <verify>npm run db:generate sinh migration notes/cards/reviews + index; type-check sạch.</verify>
  <done>3 bảng SRS + 3 index khớp 03-data-model; generate xanh.</done>
</task>

<task type="auto">
  <name>Schema bảng user_*: user_words, user_stats, user_settings (+ index)</name>
  <files>lib/db/schema.ts</files>
  <action>Thêm vào schema.ts: pgEnum wordStatus ['new','learning','known']. Bảng user_words: userId uuid FK→users, word text, status wordStatus default 'new', PK composite (userId, word); index user_words(userId, word) cho i+1. Bảng user_stats: userId uuid PK FK→users, xp integer default 0, streak integer default 0, lastStudiedDate date nullable. Bảng user_settings: userId uuid PK FK→users, enabledCardTypes jsonb .$type<string[]>() default ["recognition"], soundEnabled boolean default true, jlptLevel text nullable. Khớp 03-data-model §2 và §4.</action>
  <verify>npm run db:generate sinh migration 3 bảng + index user_words; type-check sạch.</verify>
  <done>user_words/user_stats/user_settings khớp 03-data-model; index có; generate xanh.</done>
</task>

<task type="auto">
  <name>Schema bảng app_settings + sinh & apply migration tổng</name>
  <files>lib/db/schema.ts, drizzle/ (migration sinh ra)</files>
  <action>Thêm vào schema.ts: pgEnum settingType ['string','number','bool','json']. Bảng app_settings: key text PK, value jsonb, type settingType, description text nullable, updatedAt timestamptz default now(), updatedBy uuid FK→users nullable. Sau khi có TẤT CẢ bảng, chạy `npm run db:generate` để sinh migration tổng trong drizzle/, rồi `npm run db:migrate` apply lên Postgres (docker compose phải đang chạy).</action>
  <verify>docker compose up -d; npm run db:migrate chạy không lỗi; `docker exec bloom-postgres psql -U bloom -d bloom -c "\dt"` liệt kê đủ 13 bảng (users, accounts, sessions, verification_tokens, sources, sentences, notes, cards, reviews, user_words, user_stats, user_settings, app_settings).</verify>
  <done>Thư mục drizzle/ có file migration; mọi bảng + enum + index đã tạo trong DB; migrate idempotent.</done>
</task>

<task type="auto">
  <name>Repository skeleton: settings (app_settings + user_settings)</name>
  <files>lib/repositories/settings.ts</files>
  <action>Tạo lib/repositories/settings.ts dùng db từ lib/db. Hàm: getAllAppSettings(): Promise<AppSetting[]> (select toàn bảng app_settings); getAppSetting(key): Promise<AppSetting|null>; upsertAppSetting(key, value, type, description, updatedBy): insert onConflictDoUpdate (dùng ở Admin Sprint 5); getUserSettings(userId): Promise select where eq(userSettings.userId, userId); upsertUserSettings(userId, patch). Mọi hàm liên quan user lọc where userId. Hàm ghi phức tạp có thể stub throw "TODO Sprint 5" nhưng giữ chữ ký + lọc userId.</action>
  <verify>type-check sạch; `import { getAllAppSettings } from "@/lib/repositories/settings"` không lỗi; gọi getAllAppSettings() trên DB trống trả mảng rỗng.</verify>
  <done>settings.ts export đủ hàm với chữ ký; hàm user lọc userId; build xanh.</done>
</task>

<task type="auto">
  <name>Repository skeleton: sources, cards, stats</name>
  <files>lib/repositories/sources.ts, lib/repositories/cards.ts, lib/repositories/stats.ts</files>
  <action>sources.ts: createSource(userId, input), getSource(userId, id), listSources(userId), insertSentences(sourceId, sentences[]), getSentences(sourceId) — tất cả hàm gắn user lọc where userId. cards.ts: getDue(userId): Promise<Card[]> (theo 02-architecture luồng SRS, dùng where userId + suspended=false + fsrs due<=now — Sprint 4 hoàn thiện, tạm stub trả []), saveCard(userId, card), suspendCard(userId, cardId, suspended). stats.ts: getStats(userId) (select 1 dòng user_stats where userId, trả default nếu null), addXp(userId, amount), bumpStreak(userId, today). Hàm phức tạp stub `throw new Error("TODO Sprint X")` nhưng GIỮ chữ ký + viết sẵn where eq(table.userId, userId). Mỗi file có comment đầu nêu rõ đây là skeleton (02-architecture §6 — luôn lọc user_id).</action>
  <verify>type-check sạch; import cả 3 file không lỗi; getStats(uuid bất kỳ) trên DB trống trả object default (không throw).</verify>
  <done>3 repository file tồn tại, chữ ký đầy đủ, mọi truy vấn có where userId; build xanh.</done>
</task>

<task type="auto">
  <name>lib/config: đọc app_settings (cache TTL + fallback mặc định)</name>
  <files>lib/config.ts</files>
  <action>Tạo lib/config.ts: khai hằng DEFAULTS khớp 7 seed key (openai_model="gpt-4o", whisper_model="whisper-1", ingest_chunk_size=4000, max_import_chars=50000, default_card_types=["recognition","cloze"], tts_provider="webspeech", feature_flags={}). Cache Map trong module với TTL 30s. getConfig<T>(key): đọc cache → nếu hết hạn/thiếu thì gọi repositories/settings.getAppSetting(key) → nếu null trả DEFAULTS[key]. invalidate(key?) xoá cache (Admin gọi sau khi sửa — Sprint 5). Export type Keys + getConfig + invalidate.</action>
  <verify>type-check sạch; node script gọi getConfig("openai_model") trên DB chưa seed trả "gpt-4o" (fallback); sau db:seed trả giá trị từ DB.</verify>
  <done>lib/config.ts có DEFAULTS + cache + fallback + invalidate; fallback hoạt động khi key thiếu.</done>
</task>

<task type="auto">
  <name>Seed app_settings (script idempotent)</name>
  <files>lib/db/seed.ts, package.json</files>
  <action>Tạo lib/db/seed.ts chạy bằng tsx: insert vào app_settings 7 key đúng 03-data-model §4 với value(jsonb)/type/description: openai_model("gpt-4o","string"), whisper_model("whisper-1","string"), ingest_chunk_size(4000,"number"), max_import_chars(50000,"number"), default_card_types(["recognition","cloze"],"json"), tts_provider("webspeech","string"), feature_flags({},"json"). Dùng insert(...).values(...).onConflictDoNothing() để idempotent. Thêm script npm "db:seed": "tsx lib/db/seed.ts". In log số dòng seed.</action>
  <verify>npm run db:seed (sau migrate); chạy lại lần 2 không lỗi; `psql -c "SELECT key,type FROM app_settings"` trả đúng 7 dòng.</verify>
  <done>Bảng app_settings có đủ 7 key mặc định; seed chạy lại an toàn (idempotent).</done>
</task>

<task type="auto">
  <name>lib/ai skeleton: interface + openai client + ingest stub + prompts</name>
  <files>lib/ai/index.ts, lib/ai/openai.ts, lib/ai/ingest.ts, lib/ai/prompts.ts, package.json</files>
  <action>Cài `openai`. lib/ai/index.ts: export interface AIProvider { ingest(text: string): Promise<IngestResult> } và type IngestResult = { sentences: SentenceData[] } với SentenceData = { original, text, corrected, note?, confidence, tokens: Token[] } (khớp 03-data-model §3, tái dùng Token từ lib/db/types). lib/ai/openai.ts: khởi tạo `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` export client; KHÔNG gọi API. lib/ai/ingest.ts: export async runIngest(text): Promise<IngestResult> = stub `throw new Error("AI Ingest chưa triển khai — Sprint 2")`. lib/ai/prompts.ts: export INGEST_SYSTEM_PROMPT = "" (chỗ giữ) + chú thích sẽ chứa prompt + JSON schema structured output (Sprint 2).</action>
  <verify>npm run build xanh KHÔNG cần OPENAI_API_KEY thật (chỉ khởi tạo client, không gọi); import { runIngest } không lỗi type.</verify>
  <done>4 file lib/ai tồn tại; interface + types khớp data-model; build xanh không gọi API.</done>
</task>

<task type="auto">
  <name>lib/tts skeleton (Web Speech interface)</name>
  <files>lib/tts/index.ts</files>
  <action>Tạo lib/tts/index.ts: export `speak(text: string, opts?: { lang?: string }): void`. Triển khai MVP Web Speech API: nếu chạy ở client và `window.speechSynthesis` tồn tại → tạo SpeechSynthesisUtterance(text), set lang = opts?.lang ?? "ja-JP", gọi speechSynthesis.speak; nếu server/không hỗ trợ → no-op. Comment: GĐ sau bọc cloud TTS + cache audio (02-architecture §2, key decision). Nơi gọi (Sprint 3) sẽ truyền reading kana.</action>
  <verify>type-check sạch; import { speak } không lỗi; gọi speak("テスト") trong client component không crash (no-op nếu môi trường không hỗ trợ).</verify>
  <done>lib/tts/index.ts export speak() interface, MVP Web Speech, an toàn server-side; build xanh.</done>
</task>

<task type="auto">
  <name>lib/srs skeleton (wrap ts-fsrs)</name>
  <files>lib/srs.ts, package.json</files>
  <action>Cài `ts-fsrs`. Tạo lib/srs.ts: import từ ts-fsrs. Export type Rating mapping 1=Again,2=Hard,3=Good,4=Easy (khớp 03-data-model reviews.rating). Hàm createEmptyState(): trả empty card state; schedule(state, rating, now=new Date()): dùng fsrs scheduler (createEmptyCard/fsrs().repeat hoặc next) trả { fsrsState, log } mới; isDue(state, now=new Date()): boolean theo due<=now. Chưa nối repository/DB (Sprint 4). Comment rõ skeleton.</action>
  <verify>type-check sạch; node script: createEmptyState() rồi schedule(state, 3) trả state mới có due tương lai; isDue(emptyState) = true.</verify>
  <done>lib/srs.ts export createEmptyState/schedule/isDue dùng ts-fsrs; build xanh.</done>
</task>

<task type="auto">
  <name>lib/auth.ts + route handler Auth.js (khung, chưa bật provider)</name>
  <files>lib/auth.ts, app/api/auth/[...nextauth]/route.ts</files>
  <action>Tạo lib/auth.ts dùng NextAuth (Auth.js v5): cấu hình `NextAuth({ adapter: DrizzleAdapter(db, {...mapping bảng}), providers: [], session: { strategy: "database" }, callbacks để gắn role vào session })` export { handlers, auth, signIn, signOut }. providers để rỗng (Email + Google thêm Sprint 5 — QĐ-9). app/api/auth/[...nextauth]/route.ts: `export const { GET, POST } = handlers`. Đảm bảo AUTH_SECRET đọc từ env.</action>
  <verify>npm run build xanh; mở http://localhost:3000/api/auth/providers trả JSON {} (không provider) — endpoint sống; không crash khi thiếu Google secret.</verify>
  <done>lib/auth.ts + route handler tồn tại; Auth.js dùng DrizzleAdapter trỏ schema; endpoint /api/auth/* phản hồi; build xanh.</done>
</task>

<task type="auto">
  <name>Trang chủ nền tảng + smoke test toàn bộ skeleton</name>
  <files>app/page.tsx, README.md (mục Setup), package.json (script "verify")</files>
  <action>Cập nhật app/page.tsx thành trang nền tảng đơn giản kiểu Duolingo: dùng Card + Button3D + ProgressBar để chứng minh theme hoạt động (heading Bloóm, 1 ProgressBar demo, vài nút biến thể màu). Thêm mục Setup vào README.md: docker compose up -d → npm install → npm run db:migrate → npm run db:seed → npm run dev. (Tùy chọn) thêm script npm "verify": chạy tsc --noEmit + next build. KHÔNG thêm logic nghiệp vụ.</action>
  <verify>docker compose up -d && npm install && npm run db:migrate && npm run db:seed && npm run build; npm run dev → / hiển thị theme Duolingo (nút 3D, ProgressBar animate, Card); npx tsc --noEmit sạch.</verify>
  <done>Trang / render theme; toàn bộ pipeline setup chạy từ đầu đến cuối không lỗi; build + type-check xanh.</done>
</task>

## Components tạo/đụng trong phase

| Component | File | Mục đích (Phase 1) |
|-----------|------|--------------------|
| `Button3D` | `components/Button3D.tsx` | Nút chữ ký Duolingo: `.btn-3d` + biến thể màu (primary/info/danger/xp/neutral) + `btn-sm`; nền tảng cho mọi nút app |
| `ProgressBar` | `components/ProgressBar.tsx` | Thanh tiến độ animate width bằng Motion (<300ms), tôn trọng `prefers-reduced-motion`; dùng lại ở review/dashboard |
| `Card` | `components/Card.tsx` | Khối/thẻ nội dung style `.wl-card` (nền trắng, viền 2px, bo 1.5rem) |
| `components/ui/*` (shadcn) | `components/ui/` | Bộ control nền (button, input, select, card, badge, dialog) làm nền cho component app |
| Bộ class CSS chuẩn | `app/globals.css` | `.btn-3d`, `.wl-input`, `.wl-select`, `.wl-card`, `.wl-badge`, `.wl-chip(-on)`, `ruby rt` — port từ `mockups/index.html` |
| `SentenceView`, `WordPopup`, `ReviewCard` | (chưa tạo — Sprint 2–4) | Ghi nhận trong cấu trúc thư mục; KHÔNG xây ở Phase 1 |

## Pages/Routes trong phase

| Route | File | Mô tả | Auth |
|-------|------|-------|------|
| `/` | `app/page.tsx` | Trang nền tảng smoke-test theme Duolingo (Card + Button3D + ProgressBar) — tạm để xác minh khung | Không |
| `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | Route handler Auth.js (khung, providers rỗng — bật Email/Google ở Sprint 5) | Công khai (endpoint auth) |

> Các route nghiệp vụ (`/login`, `/import`, `/study`, `/review`, `/dashboard`,
> `/admin`, `/api/ingest`) **chưa xây ở Phase 1** — thuộc Sprint 2–5. Phase 1 chỉ
> dựng khung Auth.js + trang chủ để xác minh nền tảng.

## Tiêu chí hoàn thành Phase (verify-work)

Checklist nghiệm thu quan sát được:

- [ ] `npm install` xong không lỗi; `npm run build` **xanh**; `npx tsc --noEmit` **sạch**.
- [ ] `npm run dev` mở `http://localhost:3000/` thấy trang dùng **font Nunito**,
      có **nút 3D** (nhấn lún xuống), **ProgressBar animate**, **Card** style `.wl-card`.
- [ ] DevTools xác nhận CSS variable `--color-brand` = `#58CC02` và các token khác
      khớp `mockups/index.html`.
- [ ] `docker compose up -d` → Postgres 18 healthy (`pg_isready` pass).
- [ ] `npm run db:migrate` tạo **đủ 13 bảng**: `users, accounts, sessions,
      verification_tokens, sources, sentences, notes, cards, reviews, user_words,
      user_stats, user_settings, app_settings` (kiểm bằng `psql \dt`).
- [ ] Cột `users.role` tồn tại (enum `user|admin`, default `user`); các enum khác
      (`sourceType`, `confidence`, `cardType`, `wordStatus`, `settingType`) đã tạo.
- [ ] Index gợi ý tồn tại: `cards(user_id, suspended, fsrs_state->>'due')`,
      `notes(sentence_id)`, `cards(note_id)`, `sentences(source_id)`,
      `user_words(user_id, word)`.
- [ ] `npm run db:seed` chạy được + chạy lại **idempotent**; bảng `app_settings`
      có **đúng 7 key** seed (`openai_model, whisper_model, ingest_chunk_size,
      max_import_chars, default_card_types, tts_provider, feature_flags`).
- [ ] `getConfig("openai_model")` trả `"gpt-4o"` (fallback khi chưa seed, giá trị
      DB khi đã seed); `invalidate()` xoá cache.
- [ ] Mọi hàm repository có truy vấn DB đều chứa `where user_id = userId`
      (rà soát `lib/repositories/*.ts`); hàm chưa làm dùng stub có chữ ký + `// TODO`.
- [ ] `lib/ai` (index/openai/ingest/prompts), `lib/tts/index.ts`, `lib/srs.ts`,
      `lib/config.ts`, `lib/auth.ts` import được, type-check sạch; `runIngest` ném
      lỗi "chưa triển khai" (chưa gọi API thật).
- [ ] `lib/srs`: `createEmptyState()` + `schedule(state, 3)` trả state mới có `due`
      tương lai; `isDue` hoạt động.
- [ ] `/api/auth/providers` trả `{}` (endpoint sống, không provider) — không crash
      khi thiếu Google secret/OPENAI_API_KEY.
- [ ] Cấu trúc thư mục khớp `02-architecture.md §4` (`app/`, `lib/db`,
      `lib/repositories`, `lib/ai`, `lib/config.ts`, `lib/tts`, `lib/srs.ts`,
      `lib/auth.ts`, `components/`, `drizzle/`).
- [ ] `.env`/`.env.example`/`docker-compose.yml`/`docs/`/`mockups/` **không bị
      ghi đè** khi scaffold.
