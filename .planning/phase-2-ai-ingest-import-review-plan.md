# GSD Phase 2 — AI Ingest + Import + Duyệt transcript

> Ánh xạ feature: **F2 (Import nội dung)** + **F2.5 (Duyệt & sửa transcript)** trong
> [docs/04-features.md](../docs/04-features.md), cộng lõi **AI Ingest** trong
> [docs/11-ai-ingest.md](../docs/11-ai-ingest.md) và biện pháp chất lượng transcript
> trong [docs/10-transcript-quality.md](../docs/10-transcript-quality.md).
> Giai đoạn: **MVP**.

---

## Mục tiêu

Dựng đầu-cuối luồng đưa nội dung tiếng Nhật thô vào Bloóm và biến thành "dữ liệu
cuối" (câu + token đã có furigana/nghĩa) sẵn sàng cho màn Học (Phase 3):

1. **lib/ai (F2 lõi)** — interface AI chung + cài đặt OpenAI **gpt-4o**, hàm `ingest()`
   chạy **1 lượt** làm tất cả: dọn lỗi STT dè dặt + tách câu (bỏ nhãn người nói) + tách
   từ + furigana + loại từ (tiếng Việt) + nghĩa Việt theo ngữ cảnh + đánh dấu
   `worthLearning` + ước lượng `confidence`. Dùng **structured output (JSON schema)** +
   validate + retry; **chunk** văn dài theo `ingest_chunk_size`.
2. **API `/api/ingest` (F2)** — nhận text thô + loại nguồn + tiêu đề, chạy `ingest()` ở
   server (giấu API key), lưu **1 `sources` + N `sentences`** (tokens đã kèm nghĩa) qua
   tầng repository, trả về `sourceId`.
3. **Trang `/import` (F2)** — chọn loại nguồn (chat/meeting/youtube/text), nhập tiêu đề,
   dán text hoặc upload `.txt`, nút "Phân tích" → gọi `/api/ingest` → điều hướng sang
   bước **Duyệt & sửa**.
4. **`components/SentenceView.tsx`** — render câu tiếng Nhật với **furigana** (ruby) đọc
   thẳng từ `sentences.tokens`, mỗi từ **click được** (callback ra ngoài). Dùng lại được
   ở Phase 3 (màn Học).
5. **Trang Duyệt & sửa (F2.5)** — hiển thị câu đã tách, đối chiếu `original`↔`text` +
   `note`, **highlight câu `confidence = low`**, cho **sửa câu** (`text`), **bỏ câu rác**
   (`skipped`), rồi xác nhận để chuyển sang `/study`.

> Phạm vi loại trừ (Phase khác làm): WordPopup + Lưu thẻ + i+1 + study UI (Phase 3),
> SRS review (Phase 4), dashboard (Phase 5), TTS (F8), Whisper/audio (GĐ2). SentenceView
> ở phase này **chỉ render + phát click ra ngoài**, không mở popup.

---

## Phụ thuộc

| Phải xong trước | Vì sao |
|-----------------|--------|
| **Phase 1 (F1/F1b/F1c — Auth + scaffolding)** | Phase 2 cần: (a) Next.js 15 App Router + TypeScript + Tailwind đã khởi tạo; (b) `lib/db` (Drizzle + postgres.js) kết nối `DATABASE_URL`; (c) `lib/auth.ts` (Auth.js) để lấy `currentUser` server-side — **mọi truy vấn repository lọc `user_id`**; (d) bảng `users` + cột `role`; (e) `lib/config` đọc `app_settings` (cache + fallback). Import luôn gắn với 1 user đã đăng nhập; `/import`, `/api/ingest`, trang Duyệt & sửa đều là route được bảo vệ. |

Theo `ROADMAP.md`: **Phase 1 = F1/F1b/F1c (Auth)**, **Phase 2 = F2/F2.5 (Import + duyệt)**.
Trong `discuss-phase` khai báo: *"Phase 1 coi như đã hoàn thành; tái dùng `lib/db`,
`lib/auth.ts`, `lib/config`; không đụng feature đã xong."* (theo
[docs/12-gsd-workflow.md](../docs/12-gsd-workflow.md) §7).

Phase 2 **mở rộng** schema (thêm `sources`, `sentences`) nhưng không sửa bảng auth.

> ⚠️ **Khoảng trống auth (P2–P4):** Lớp **đăng nhập thật** (Email/Google + trang
> `/login`) chỉ ra đời ở **Phase 5** ([06-roadmap.md](../docs/06-roadmap.md) Sprint 5);
> Phase 1 cố ý để **providers Auth.js rỗng** (Phase 1 QĐ-9). Nhưng `/import`,
> `/import/[sourceId]/review`, `/api/ingest` đều là **route bảo vệ**, và tiêu chí
> nghiệm thu Phase 2–4 bám "đăng nhập rồi…". Để chạy được nghiệm thu **trước Phase 5**,
> Phase 2 thiết lập **chiến lược dev-auth dùng chung cho cả P2/P3/P4** — xem
> **QĐ-9 (dev-auth)** ở mục "Quyết định triển khai" và task *"Dev-auth dùng chung:
> seed-user + Credentials chỉ-dev"*. P3 (`seed-review` của P4 nối tiếp) tái dùng đúng
> cơ chế này; **không** tạo lối đăng nhập riêng rời rạc cho từng phase.

---

## Quyết định triển khai (discuss-phase)

Các "vùng xám" đã chốt, bám docs:

1. **Lưu vị trí gọi AI Ingest: API route `/api/ingest` (server), không Server Action.**
   - Căn cứ: [02-architecture.md](../docs/02-architecture.md) §4 liệt kê đích danh
     `app/api/ingest/route.ts`; §2 "Next.js Server Actions / API routes đặt lượt AI Ingest
     ở server, giấu API key". Chọn **API route** để khớp cấu trúc thư mục đã vẽ sẵn và để
     trang `/import` (client component có upload file) gọi qua `fetch` dễ kiểm bằng `curl`.
   - API key (`OPENAI_API_KEY`) đọc từ **env**, model (`gpt-4o`) đọc từ **`app_settings`**
     qua `lib/config` (key `openai_model`) — đúng nguyên tắc secret-ở-env, config-ở-DB
     ([02-architecture.md](../docs/02-architecture.md) §7).

2. **Structured output bằng OpenAI Responses/Chat `response_format` JSON schema, validate
   bằng Zod, retry tối đa 2 lần.**
   - Căn cứ: [11-ai-ingest.md](../docs/11-ai-ingest.md) §3 (schema cụ thể), §6 "ràng buộc
     bằng JSON schema + validate; sai định dạng → retry (hạ nhiệt độ, nhắc lại schema)".
   - Chốt: SDK `openai`. Schema trong `lib/ai/prompts.ts` (cả JSON schema gửi cho OpenAI
     **và** Zod schema để validate phía ta). Lần retry **hạ `temperature`** (mặc định 0.2
     → 0) và **nhắc lại schema** trong message. Vượt số lần retry → ném lỗi rõ ràng để API
     trả 502.

3. **Token bắt buộc vs tùy chọn — theo đúng `required` trong schema docs.**
   - Căn cứ: [11-ai-ingest.md](../docs/11-ai-ingest.md) §3:
     - Token `required`: `surface`, `reading`, `pos`, `meaning_vi`, `worthLearning`
       (`lemma` **tùy chọn** — fallback `lemma = surface` khi thiếu, dùng cho i+1 sau).
     - Sentence `required`: `original`, `text`, `corrected`, `confidence`, `tokens`
       (`note` tùy chọn → rỗng khi không sửa). `confidence ∈ {high, medium, low}`.
   - `translation` (dịch cả câu) là **tùy chọn** ([03-data-model.md](../docs/03-data-model.md)
     §2) → Phase 2 **không** yêu cầu AI sinh, để cột `translation` null (không scope-creep).

4. **Chunking văn dài: theo lượt nói / đoạn, giữ ranh giới câu trọn vẹn, gọi nhiều lần
   rồi ghép mảng `sentences`.**
   - Căn cứ: [11-ai-ingest.md](../docs/11-ai-ingest.md) §5; [03-data-model.md] thuật toán
     chunk. Ngưỡng = `app_settings.ingest_chunk_size` (mặc định **4000** ký tự); giới hạn
     toàn bài = `app_settings.max_import_chars` (mặc định **50000**) → vượt thì API trả
     400 trước khi gọi OpenAI.
   - Quy tắc chia: tách theo **dòng** (mỗi lượt nói thường 1 dòng trong transcript), gom
     dòng vào chunk đến gần ngưỡng, **không cắt giữa một dòng**; nếu một dòng > ngưỡng thì
     cắt theo dấu câu Nhật (`。！？\n`). Ghép kết quả: nối các mảng `sentences` theo thứ
     tự chunk.

5. **Lưu DB: 1 `sources` + N `sentences` trong một giao dịch, qua
   `lib/repositories/sources.ts`; mọi truy vấn lọc `user_id`.**
   - Căn cứ: [02-architecture.md](../docs/02-architecture.md) §3/§5/§6 (UI không gọi DB
     trực tiếp; repository luôn kèm `where user_id`); [03-data-model.md] bảng `sources`,
     `sentences`. `sources.raw_content` lưu **text gốc đã dán/upload**; `sources.type ∈
     {chat, meeting, youtube, text}`. Mỗi `sentences` lưu đủ `original/text/corrected/
     note/confidence/tokens`, `skipped=false`. Dùng transaction của postgres.js/Drizzle để
     không bị "source mồ côi" khi insert sentences lỗi.

6. **Furigana = ruby text, fallback font Noto Sans JP; reading lấy từ token, KHÔNG tự tách
   kanji.**
   - Căn cứ: bản đồ component "Furigana / ruby text … fallback font Noto Sans JP"; user
     journey [07](../docs/07-user-journey.md) bước 4 (furigana trên mỗi kanji). Chốt:
     SentenceView render **theo từng token** — mỗi token là một `<ruby>surface<rt>reading</rt></ruby>`
     (chỉ hiện `<rt>` khi `reading ≠ surface`, tránh hiện furigana thừa cho kana/dấu câu).
     **Không** dùng Kuromoji ([keyDecisions]: thay thế hoàn toàn Kuromoji). Click bắt ở
     cấp token, phát `onWordClick(token, sentenceId)` ra ngoài.

7. **Human-in-the-loop bắt buộc; chỉnh sửa làm bằng Server Action gọi repository, không
   gọi lại AI.**
   - Căn cứ: [10-transcript-quality.md](../docs/10-transcript-quality.md) §3.2 (màn Duyệt &
     sửa là lớp chốt; sửa `sentences.text`; bỏ câu rác `skipped`; câu sửa được mọi lúc).
     Trang Duyệt & sửa dùng Server Actions `updateSentenceText`, `toggleSkip` →
     `repositories/sources.ts` (lọc `user_id`). **Không** re-ingest khi sửa (giảm chi
     phí). Highlight câu `confidence = low` bằng `.wl-card` viền cảnh báo + `.wl-badge`.

8. **UI tuân hệ thống thiết kế Bloóm (lớp dùng chung), mobile-first, prefers-reduced-motion.**
   - Căn cứ: [keyDecisions] bộ component bắt buộc (`.btn-3d` + biến thể màu, `.wl-input`,
     `.wl-select`, `.wl-card`, `.wl-badge`, `.wl-chip`). Nút "Phân tích" = `.btn-3d
     .btn-primary`; loại nguồn = `.wl-chip`; ô tiêu đề = `.wl-input`; textarea dán nội dung
     theo style input. Trang transition + animation < 300ms, tôn trọng
     `prefers-reduced-motion`.

9. **QĐ-9 (dev-auth) — đăng nhập tạm dùng chung cho P2/P3/P4: seed-user + provider
   Credentials chỉ-dev, KHÔNG phải auth thật của Phase 5.**
   - **Vấn đề:** auth thật (Email/Google + `/login`) thuộc **Phase 5**, còn Phase 1 để
     `providers: []` (Phase 1 QĐ-9). Vậy P2–P4 có route bảo vệ nhưng **không có cách đăng
     nhập thật** để chạy tiêu chí "đăng nhập rồi…". Trước đây chỉ P4 có `seed-review-demo`,
     không nhất quán giữa các phase.
   - **Chốt:** Phase 2 dựng **một** cơ chế dev-auth tối thiểu, tái dùng nguyên xi ở P3/P4:
     - **Script `lib/db/seed-user.ts`** (idempotent): tạo/đảm bảo 1 **user test** cố định
       (email `dev@bloom.local`, `role='user'`) và in ra `userId` (ENV `DEV_USER_ID`
       tiện cho các seed khác như `seed-review-demo` ở P4). Không tạo password thật.
     - **Provider Credentials chỉ-dev** trong `lib/auth.ts`, **chỉ bật khi
       `NODE_ENV !== 'production'` AND `AUTH_DEV_LOGIN === 'true'`** (mặc định tắt). Provider
       này đăng nhập **đúng user test seed ở trên** (không cần mật khẩu), trả session có
       `user.id` + `role` y như session thật → mọi `currentUser` / repository (lọc
       `user_id`) chạy bình thường, **không** phải sửa code nghiệp vụ khi Phase 5 thay bằng
       Email/Google. Production **bắt buộc** provider này tắt.
     - **Trang `/login` tối thiểu (dev):** một nút "Đăng nhập (dev)" gọi `signIn('credentials')`;
       khi Phase 5 tới sẽ **thay nội dung** trang này bằng Email/Google (route `/login` đã
       tồn tại sẵn để các redirect "chưa đăng nhập → `/login`" có đích thật). Trang dev này
       không phải phạm vi UX cuối — chỉ để nghiệm thu P2–P4.
   - **Lý do chọn cách này (vs. chỉ seed user):** redirect bảo vệ route trỏ `/login`
     ([07-user-journey.md](../docs/07-user-journey.md)); cần một đích `/login` đăng nhập
     được để nghiệm thu "đăng xuất → redirect `/login` → đăng nhập → vào lại được". Dùng
     **Auth.js Credentials** giữ đúng nguyên tắc *"user lưu trong Postgres của ta"*
     ([02-architecture.md](../docs/02-architecture.md) §1) và **không lock-in**; Phase 5
     chỉ **thêm/đổi provider**, không động repository/route.
   - **Ranh giới với Phase 5:** dev-auth **không** thay phần việc Phase 5 (Email magic-link,
     Google OAuth, `AUTH_GOOGLE_*`, hoàn thiện `/login`/dashboard). Nó chỉ là cầu nối nghiệm
     thu; Phase 5 gỡ/khoá `AUTH_DEV_LOGIN` và lắp provider thật.

---

## Kế hoạch task nguyên tử (plan-phase)

> Mỗi task nhỏ, độc lập, commit riêng. Đường dẫn khớp [02-architecture.md](../docs/02-architecture.md) §4.

<task type="auto">
  <name>Dev-auth dùng chung: seed-user + Credentials chỉ-dev + /login tối thiểu</name>
  <files>lib/db/seed-user.ts; lib/auth.ts; app/(auth)/login/page.tsx; .env.example</files>
  <action>Theo QĐ-9 (dev-auth). Dựng cơ chế đăng nhập tạm để nghiệm thu P2–P4 (P3/P4 tái dùng, không tự dựng riêng): (1) `lib/db/seed-user.ts` — script tsx idempotent (ON CONFLICT theo email DO NOTHING) tạo/đảm bảo user test cố định `dev@bloom.local`, `role='user'`; in `userId` ra stdout (để dùng làm `DEV_USER_ID` cho seed khác như `seed-review-demo` ở P4). KHÔNG đặt password thật. (2) `lib/auth.ts` — thêm provider **Credentials** vào mảng `providers` **chỉ khi** `process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_LOGIN === 'true'` (mặc định tắt; production luôn rỗng provider này); `authorize()` không cần mật khẩu, trả về user test (truy `users` theo email `dev@bloom.local`, null nếu chưa seed); giữ `session.strategy` + callback gắn `role` y như Phase 1 để session dev giống session thật (có `user.id`, `role`). KHÔNG sửa repository/route nghiệp vụ. (3) `app/(auth)/login/page.tsx` — trang `/login` tối thiểu: nếu đã đăng nhập → redirect `/import`; nếu chưa, hiện nút `.btn-3d .btn-primary` "Đăng nhập (dev)" gọi `signIn('credentials')` (client). Ghi chú trong file: Phase 5 thay nội dung bằng Email/Google. (4) `.env.example` — thêm `AUTH_DEV_LOGIN="false"` (mô tả: "Bật đăng nhập dev tạm — CHỈ dev, P5 gỡ"). KHÔNG đụng providers Email/Google (Phase 5).</action>
  <verify>`npx tsx lib/db/seed-user.ts` in ra `userId`, chạy lần 2 không tạo trùng. Với `AUTH_DEV_LOGIN=true` (dev): mở `/login` bấm "Đăng nhập (dev)" → có session, `currentUser` trả user test; mở `/import` vào được. Với `AUTH_DEV_LOGIN` unset/false: `/api/auth/providers` không liệt kê credentials; `/import` khi chưa đăng nhập → redirect `/login`. `tsc --noEmit` sạch; build production không kích hoạt provider dev.</verify>
  <done>Có 1 cơ chế dev-auth dùng chung (seed-user + Credentials chỉ-dev + `/login` tối thiểu) cho phép P2/P3/P4 chạy tiêu chí "đăng nhập rồi…"; tắt mặc định + an toàn ở production; không thay phần việc auth thật của Phase 5.</done>
</task>

<task type="auto">
  <name>Cài deps AI Ingest + Zod</name>
  <files>package.json</files>
  <action>Thêm và cài dependency: `openai` (SDK chính thức cho gpt-4o + structured output) và `zod` (validate JSON trả về). Chạy `npm install openai zod`. Không thêm Kuromoji/từ điển nào (theo keyDecisions: thay thế hoàn toàn Kuromoji). Đảm bảo `OPENAI_API_KEY` đã có trong `.env.example` (mô tả: "OpenAI — AI Ingest gpt-4o").</action>
  <verify>`npm ls openai zod` in ra phiên bản đã cài; `node -e "require('openai'); require('zod')"` không lỗi.</verify>
  <done>`openai` và `zod` xuất hiện trong `package.json` dependencies; cài thành công, import được.</done>
</task>

<task type="auto">
  <name>Seed app_settings cho Ingest</name>
  <files>lib/db/seed-settings.ts (hoặc bổ sung seed sẵn có); drizzle/ (nếu seed bằng SQL)</files>
  <action>Đảm bảo các key `app_settings` mà Ingest cần đã có giá trị mặc định đúng [03-data-model.md] §4: `openai_model="gpt-4o"`, `ingest_chunk_size=4000`, `max_import_chars=50000`. Mỗi key có `type` đúng (`string`/`number`). Nếu Phase 1 đã seed các key này thì task chỉ xác minh và bổ sung key còn thiếu (idempotent: ON CONFLICT DO NOTHING). KHÔNG thêm secret vào app_settings.</action>
  <verify>Query DB: `SELECT key,value,type FROM app_settings WHERE key IN ('openai_model','ingest_chunk_size','max_import_chars')` trả đủ 3 dòng đúng giá trị.</verify>
  <done>3 key tồn tại trong app_settings với giá trị mặc định; `lib/config` đọc được (không rơi vào fallback).</done>
</task>

<task type="auto">
  <name>Schema sources + sentences (Drizzle)</name>
  <files>lib/db/schema.ts; drizzle/ (migration sinh ra)</files>
  <action>Thêm 2 bảng vào Drizzle schema đúng [03-data-model.md] §2. `sources`: id uuid PK (defaultRandom), user_id uuid FK→users (notNull), type enum/text in ('chat','meeting','youtube','text'), title text, raw_content text, audio_url text nullable, created_at timestamptz default now(). `sentences`: id uuid PK, source_id uuid FK→sources (notNull, onDelete cascade), original text notNull, text text notNull, corrected boolean notNull default false, note text nullable, confidence text notNull (giá trị 'high'|'medium'|'low'), tokens jsonb notNull (mảng {surface,reading,lemma,pos,meaning_vi,worthLearning}), skipped boolean notNull default false, translation text nullable, audio_start doublePrecision nullable. Thêm index `sentences(source_id)` theo §5. Export type `Source`, `Sentence` (InferSelect). Sinh migration bằng `npx drizzle-kit generate`.</action>
  <verify>`npx drizzle-kit generate` tạo file migration mới; `npx drizzle-kit migrate` (hoặc lệnh migrate của dự án) chạy trên DB local không lỗi; `\d sources` và `\d sentences` trong psql cho thấy đủ cột + index `sentences(source_id)`.</verify>
  <done>Bảng `sources`, `sentences` tồn tại trong DB với cột/khoá ngoại/index đúng tài liệu; type TS export được.</done>
</task>

<task type="auto">
  <name>lib/ai prompts + JSON schema + Zod</name>
  <files>lib/ai/prompts.ts</files>
  <action>Tạo `lib/ai/prompts.ts` chứa: (1) hằng `INGEST_SYSTEM_PROMPT` đúng bản nháp prompt [11-ai-ingest.md] §4 (chuyên gia tiếng Nhật & biên tập; dọn lỗi DÈ DẶT, không chắc thì giữ nguyên + confidence=low, KHÔNG đoán bừa/bịa; tách câu bỏ nhãn người nói vd "田中："; tách từ surface/reading hiragana/lemma/pos tiếng Việt/meaning_vi theo ngữ cảnh; worthLearning=true cho từ nội dung, false cho trợ từ/số/dấu câu/tên riêng; chỉ trả JSON). (2) `INGEST_JSON_SCHEMA` — JSON Schema object đúng §3 để truyền vào `response_format` của OpenAI (required: sentences; mỗi sentence required original/text/corrected/confidence/tokens; mỗi token required surface/reading/pos/meaning_vi/worthLearning; confidence enum high/medium/low). (3) `ingestResultSchema` — Zod schema tương ứng để validate kết quả (lemma/note optional, default ''). Export cả ba.</action>
  <verify>`node -e "const p=require('./lib/ai/prompts'); console.log(!!p.INGEST_SYSTEM_PROMPT, !!p.INGEST_JSON_SCHEMA, !!p.ingestResultSchema)"` in `true true true`; viết test nhanh: `ingestResultSchema.parse({sentences:[{original:'x',text:'x',corrected:false,confidence:'high',tokens:[{surface:'確認',reading:'かくにん',pos:'danh từ',meaning_vi:'xác nhận',worthLearning:true}]}]})` không ném lỗi.</verify>
  <done>Prompt + JSON schema + Zod schema khớp đúng schema trong docs 11 §3; parse mẫu hợp lệ pass, mẫu thiếu trường required fail.</done>
</task>

<task type="auto">
  <name>lib/ai interface + OpenAI client</name>
  <files>lib/ai/index.ts; lib/ai/openai.ts</files>
  <action>`lib/ai/index.ts`: định nghĩa interface chung `AIProvider` với method `complete(opts: {system, user, jsonSchema, temperature})` trả về object đã parse JSON; export `getAIProvider()` trả provider mặc định (OpenAI). `lib/ai/openai.ts`: khởi tạo client `new OpenAI({apiKey: process.env.OPENAI_API_KEY})`; cài đặt `complete()` gọi gpt-4o (model đọc từ `lib/config` key `openai_model`, fallback 'gpt-4o') với `response_format` kiểu json_schema (truyền `jsonSchema`), `temperature` từ tham số; trả `JSON.parse` của nội dung. Bọc theo keyDecisions "đổi provider dễ" — chỉ `openai.ts` biết OpenAI. KHÔNG gọi DB ở đây.</action>
  <verify>`tsc --noEmit` pass cho 2 file; (cần OPENAI_API_KEY thật) script tay gọi `getAIProvider().complete({system:'Trả về {"ok":true}', user:'hi', jsonSchema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok']}, temperature:0})` trả `{ok:true}`.</verify>
  <done>Interface AI + cài đặt OpenAI biên dịch sạch; chỉ `openai.ts` import SDK `openai`; model đọc qua lib/config.</done>
</task>

<task type="auto">
  <name>lib/ai/ingest: chunk + gọi AI + validate + retry + ghép</name>
  <files>lib/ai/ingest.ts</files>
  <action>Tạo hàm `ingest(rawText: string): Promise<IngestSentence[]>`. Bước: (1) đọc `ingest_chunk_size` (default 4000) qua lib/config; (2) `chunkText(rawText, size)` — chia theo dòng, gom đến gần ngưỡng, KHÔNG cắt giữa dòng; dòng đơn vượt ngưỡng thì cắt theo dấu câu Nhật 。！？ và newline (docs 11 §5: giữ ranh giới câu trọn vẹn); (3) với mỗi chunk gọi `getAIProvider().complete()` với `INGEST_SYSTEM_PROMPT` + `INGEST_JSON_SCHEMA`, temperature 0.2; (4) validate bằng `ingestResultSchema`; nếu fail → retry tối đa 2 lần, lần retry hạ temperature về 0 và thêm câu nhắc lại schema vào user message (docs 11 §6); vượt retry → throw Error('Ingest validation failed'); (5) ghép `sentences` của các chunk theo thứ tự. Chuẩn hoá: thiếu `lemma` → gán `surface`; thiếu `note` → ''. Export `ingest` và `chunkText`. KHÔNG lưu DB ở đây (tách trách nhiệm).</action>
  <verify>Unit test `chunkText`: chuỗi 9000 ký tự nhiều dòng → trả ≥2 chunk, không chunk nào > size+1 dòng, ghép lại đủ nội dung. (Có key) `ingest('田中：確認をお願いします。')` trả mảng ≥1 câu, mỗi câu có original/text/confidence/tokens, token có reading hiragana; nhãn 田中： bị loại khỏi text.</verify>
  <done>`ingest()` trả mảng câu đã validate; văn >4000 ký tự được chunk + ghép; lỗi định dạng kích hoạt retry rồi throw nếu vẫn fail.</done>
</task>

<task type="auto">
  <name>repositories/sources: tạo source + sentences (transaction, lọc user_id)</name>
  <files>lib/repositories/sources.ts</files>
  <action>Tạo các hàm: `createSourceWithSentences({userId, type, title, rawContent, sentences})` — trong 1 transaction Drizzle: insert 1 `sources` (gắn user_id), insert N `sentences` (source_id vừa tạo, map original/text/corrected/note/confidence/tokens, skipped=false), trả `sourceId`. `getSourceWithSentences(sourceId, userId)` — lấy source + sentences, **bắt buộc `where user_id = userId`** (404/null nếu không thuộc user). `updateSentenceText(sentenceId, userId, text)` — cập nhật `sentences.text` (kiểm quyền qua join source.user_id = userId). `setSentenceSkipped(sentenceId, userId, skipped)`. Mọi truy vấn lọc theo user (docs 02 §6). Export tất cả.</action>
  <verify>`tsc --noEmit` pass. Test tích hợp (DB test): tạo user → createSourceWithSentences với 2 câu → getSourceWithSentences trả đúng 2 câu; gọi với userId khác → trả null/[]; updateSentenceText đổi được text; setSentenceSkipped(true) đặt skipped=true.</verify>
  <done>Repository tạo source+sentences nguyên tử; mọi hàm lọc user_id; UI/API không chạm Drizzle trực tiếp.</done>
</task>

<task type="auto">
  <name>API /api/ingest</name>
  <files>app/api/ingest/route.ts</files>
  <action>Route handler POST: (1) lấy `currentUser` từ session Auth.js (lib/auth) — chưa đăng nhập → 401; (2) đọc body `{type, title, rawContent}`; validate `type ∈ {chat,meeting,youtube,text}`, `rawContent` không rỗng, độ dài ≤ `max_import_chars` (lib/config, default 50000) — vi phạm → 400 kèm message; (3) gọi `ingest(rawContent)` (lib/ai/ingest); lỗi AI/validate → 502 message thân thiện; (4) `createSourceWithSentences({userId, type, title, rawContent, sentences})`; (5) trả 200 `{sourceId, sentenceCount}`. Đặt `export const runtime='nodejs'` (cần postgres.js + OpenAI server-side). Không trả tokens nặng về client ở bước này (client điều hướng sang trang Duyệt & sửa để tải lại).</action>
  <verify>`curl -X POST localhost:3000/api/ingest -H 'Content-Type: application/json' -d '{"type":"meeting","title":"Họp test","rawContent":"田中：確認をお願いします。"}'` khi đã đăng nhập → 200 `{sourceId,...}`; chưa đăng nhập → 401; rawContent rỗng → 400; rawContent > max_import_chars → 400.</verify>
  <done>POST /api/ingest chạy Ingest ở server (API key không lộ ra client), lưu source+sentences, trả sourceId; kiểm tra auth + giới hạn ký tự hoạt động.</done>
</task>

<task type="auto">
  <name>Trang /import (form + upload .txt + gọi API)</name>
  <files>app/import/page.tsx; app/import/ImportForm.tsx</files>
  <action>Trang `/import` (Server Component bảo vệ auth: chưa đăng nhập → redirect /login). `ImportForm.tsx` là Client Component: chọn loại nguồn bằng nhóm `.wl-chip` (Chat/Họp/Video/Text → giá trị chat/meeting/youtube/text, mặc định meeting theo journey), ô tiêu đề `.wl-input`, vùng dán nội dung (textarea style input) + kéo-thả/đọc file `.txt` (FileReader, chỉ nhận text/plain) đổ vào textarea, nút "Phân tích" `.btn-3d .btn-primary`. Khi bấm: disable nút + hiện trạng thái "Đang phân tích…" (ProgressBar/spinner), `fetch('/api/ingest')` POST; thành công → `router.push('/import/[sourceId]/review')`; lỗi → hiện thông báo. Mobile-first 1 cột, tôn trọng prefers-reduced-motion.</action>
  <verify>Mở `/import` (đã đăng nhập): chọn loại nguồn, dán "田中：確認をお願いします。", bấm Phân tích → điều hướng sang trang Duyệt & sửa của source mới. Upload 1 file .txt → nội dung đổ vào textarea. Chưa đăng nhập mở /import → redirect /login.</verify>
  <done>Trang /import cho chọn loại nguồn + tiêu đề + dán/upload .txt + Phân tích; gọi /api/ingest và chuyển sang Duyệt & sửa; dùng đúng lớp UI (.wl-chip/.wl-input/.btn-3d).</done>
</task>

<task type="auto">
  <name>components/SentenceView (furigana + token click được)</name>
  <files>components/SentenceView.tsx</files>
  <action>Tạo `SentenceView` props `{tokens: Token[]; onWordClick?: (token, index)=>void; highlightWords?: Set<string>}`. Render câu bằng cách map từng token thành span click được; nếu `token.reading && token.reading !== token.surface` thì bọc `<ruby>{surface}<rt>{reading}</rt></ruby>`, ngược lại render surface trần (kana/dấu câu không hiện furigana). Token có `worthLearning` hoặc nằm trong `highlightWords` thì thêm class nhấn (vd nền vàng nhẹ). Click token → gọi `onWordClick`. Font fallback Noto Sans JP cho phần Nhật (className). KHÔNG gọi AI/API; KHÔNG dùng Kuromoji — đọc thẳng tokens (docs 02 §5 "tra nghĩa tức thì, không gọi API"). Đây là component dùng lại ở Phase 3.</action>
  <verify>Storybook/route thử render `<SentenceView tokens={[{surface:'確認',reading:'かくにん',pos:'danh từ',meaning_vi:'xác nhận',worthLearning:true},{surface:'を',reading:'を',pos:'trợ từ',meaning_vi:'(trợ từ)',worthLearning:false}]} />`: 確認 hiện furigana かくにん phía trên, を không hiện furigana; click 確認 gọi onWordClick.</verify>
  <done>SentenceView render furigana ruby từ tokens, mỗi từ click được, không gọi API; kana/dấu câu không kèm furigana thừa.</done>
</task>

<task type="auto">
  <name>Server Actions sửa câu / bỏ câu rác</name>
  <files>app/import/[sourceId]/review/actions.ts</files>
  <action>Tạo Server Actions: `updateSentenceTextAction(sentenceId, text)` và `toggleSkipAction(sentenceId, skipped)`. Mỗi action lấy `currentUser` từ session; gọi `repositories/sources.updateSentenceText`/`setSentenceSkipped` (đã lọc user_id) — không thuộc user thì throw. Sau cập nhật gọi `revalidatePath` cho trang review. KHÔNG re-ingest (docs 10 §3.2: chỉ sửa tay, không gọi AI lại).</action>
  <verify>`tsc --noEmit` pass; gọi action qua form trên trang review (task sau) thấy text/skipped đổi sau reload; action với sentence của user khác → ném lỗi/không đổi.</verify>
  <done>Hai Server Action sửa text + toggle skip hoạt động qua repository, lọc user_id, không gọi AI lại.</done>
</task>

<task type="auto">
  <name>Trang Duyệt & sửa (đối chiếu + highlight low + sửa/skip + xác nhận)</name>
  <files>app/import/[sourceId]/review/page.tsx; app/import/[sourceId]/review/ReviewList.tsx</files>
  <action>`page.tsx` (Server Component, bảo vệ auth): `getSourceWithSentences(sourceId, currentUser.id)`; null → notFound(). Truyền sentences xuống `ReviewList`. `ReviewList.tsx` (Client): mỗi câu là `.wl-card` hiển thị — nếu `corrected` thì đối chiếu original↔text + `note` (docs 10 §3.2, docs 04 F2.5); câu `confidence='low'` thêm viền/nền cảnh báo + `.wl-badge` "đáng ngờ" (docs 10/11). Mỗi câu có: ô sửa `text` (.wl-input, lưu qua updateSentenceTextAction), nút "Bỏ câu rác" toggle skipped (toggleSkipAction) làm mờ câu khi skipped. Có thể render câu bằng SentenceView (tokens) để xem furigana. Nút "Xác nhận & học" `.btn-3d .btn-primary` → `router.push('/study?sourceId=...')` (Phase 3 dùng). Mobile-first.</action>
  <verify>Sau khi /import phân tích xong, trang review hiển thị các câu; câu corrected hiện đối chiếu gốc↔sửa + note; câu confidence=low có badge "đáng ngờ" + highlight; sửa 1 câu rồi reload thấy giữ thay đổi; bấm Bỏ câu rác làm câu mờ + skipped=true trong DB; nút Xác nhận điều hướng sang /study.</verify>
  <done>Trang Duyệt & sửa đối chiếu original↔text + note, highlight confidence=low, cho sửa text + bỏ câu rác, xác nhận sang study — đúng F2.5/docs 10.</done>
</task>

<task type="auto">
  <name>Liên kết điều hướng + bảo vệ route phase 2</name>
  <files>app/import/page.tsx; (middleware hoặc layout bảo vệ nếu Phase 1 chưa phủ); app/dashboard hoặc nav (link tới /import)</files>
  <action>Thêm link "Thêm tài liệu / Import" vào điều hướng chính (dashboard/nav nếu đã có từ Phase 1, nếu chưa thì chỉ đảm bảo /import truy cập được sau đăng nhập). Đảm bảo cả 3 route phase 2 (`/import`, `/import/[sourceId]/review`, `/api/ingest`) đều yêu cầu đăng nhập (tái dùng cơ chế bảo vệ của Phase 1; nếu Phase 1 dùng middleware matcher thì bổ sung path). Không trùng lặp logic auth.</action>
  <verify>Đăng xuất rồi mở `/import` và `/import/<id>/review` → redirect /login; gọi `/api/ingest` khi đăng xuất → 401. Đăng nhập rồi thấy link Import trong nav (nếu có nav).</verify>
  <done>Ba route phase 2 đều được bảo vệ; có lối vào /import từ điều hướng; không lặp logic auth của Phase 1.</done>
</task>

---

## Components tạo/đụng trong phase

| Component | File | Mục đích | Trạng thái |
|-----------|------|----------|-----------|
| `SentenceView` | `components/SentenceView.tsx` | Render câu + furigana (ruby) từ `sentences.tokens`, mỗi từ click được, không gọi API | Tạo mới (dùng lại Phase 3) |
| `ImportForm` | `app/import/ImportForm.tsx` | Form chọn loại nguồn + tiêu đề + dán/upload .txt + nút Phân tích | Tạo mới |
| `ReviewList` | `app/import/[sourceId]/review/ReviewList.tsx` | Danh sách câu duyệt: đối chiếu gốc↔sửa, highlight low, sửa/skip, xác nhận | Tạo mới |
| Lớp UI dùng chung | (CSS dự án từ Phase trước) | `.btn-3d`+biến thể màu, `.wl-input`, `.wl-select`, `.wl-card`, `.wl-badge`, `.wl-chip` | Tái dùng |
| ProgressBar/spinner | `components/` (nếu có từ Phase trước) | Trạng thái "Đang phân tích…" khi gọi /api/ingest | Tái dùng nếu có, đơn giản nếu chưa |
| Furigana / ruby | (trong SentenceView) | `<ruby><rt>` + fallback Noto Sans JP cho kanji/kana | Tạo trong SentenceView |
| `/login` (dev) | `app/(auth)/login/page.tsx` | Trang đăng nhập dev tối thiểu (QĐ-9): nút "Đăng nhập (dev)" → `signIn('credentials')`; đích redirect bảo vệ route | Tạo mới (Phase 5 thay bằng Email/Google) |
| Dev-auth | `lib/db/seed-user.ts`, `lib/auth.ts` (provider Credentials chỉ-dev) | Seed user test idempotent + đăng nhập tạm dùng chung P2/P3/P4 (QĐ-9) | Tạo seed-user mới; mở rộng `lib/auth.ts` của Phase 1 |

> Phase 2 **không** tạo `WordPopup` / `ReviewCard` (Phase 3/4). `/login` + dev-auth ở
> đây là **tạm thời cho nghiệm thu**; auth thật do Phase 5.

---

## Pages/Routes trong phase

| Route | Loại | Mô tả | Auth |
|-------|------|-------|------|
| `/login` | Page (App Router) | **Dev tối thiểu (QĐ-9):** nút "Đăng nhập (dev)" → `signIn('credentials')` vào user test (chỉ khi `AUTH_DEV_LOGIN=true`, dev). Đích cho mọi redirect "chưa đăng nhập". **Phase 5 thay** bằng Email/Google. | Công khai |
| `/import` | Page (App Router) | Chọn loại nguồn (chat/meeting/youtube/text), tiêu đề, dán text / upload .txt, nút "Phân tích" → gọi `/api/ingest` (F2) | Bắt buộc đăng nhập |
| `/import/[sourceId]/review` | Page (App Router) | Duyệt & sửa transcript: đối chiếu `original`↔`text` + note, highlight `confidence=low`, sửa câu, bỏ câu rác, "Xác nhận & học" → `/study` (F2.5) | Bắt buộc đăng nhập; chỉ source của chính user (getSourceWithSentences lọc user_id, sai → notFound) |
| `/api/ingest` | Route Handler (POST, runtime nodejs) | Nhận `{type,title,rawContent}` → chạy AI Ingest (gpt-4o) server-side → lưu 1 `sources` + N `sentences` → trả `{sourceId, sentenceCount}` | 401 nếu chưa đăng nhập; gắn `user_id` của session |

> `/study` chỉ là **đích điều hướng**, do Phase 3 hiện thực. `/login` ở Phase 2 là
> **trang dev tối thiểu** (QĐ-9) chỉ để nghiệm thu P2–P4; UX đăng nhập thật
> (Email/Google) do **Phase 5** hoàn thiện.

---

## Tiêu chí hoàn thành Phase (verify-work)

Checklist nghiệm thu quan sát được (bám F2/F2.5 + docs 10/11):

- [ ] **DB:** bảng `sources` và `sentences` tồn tại đúng cột/khoá ngoại/index `sentences(source_id)` ([03-data-model.md] §2/§5); `app_settings` có `openai_model`, `ingest_chunk_size`, `max_import_chars`.
- [ ] **lib/ai:** `ingest('田中：確認をお願いします。')` trả mảng câu; mỗi câu có `original/text/corrected/confidence/tokens`; token có `reading` hiragana, `meaning_vi`, `worthLearning`; nhãn người nói `田中：` bị loại khỏi `text` (docs 11 §4).
- [ ] **Chunking:** text > `ingest_chunk_size` (4000) được chia nhiều chunk, không cắt giữa câu, kết quả ghép lại đủ (docs 11 §5).
- [ ] **Structured output + retry:** kết quả AI được validate bằng Zod theo schema docs 11 §3; mô phỏng JSON sai định dạng → hàm retry rồi throw nếu vẫn fail (docs 11 §6).
- [ ] **API /api/ingest:** đăng nhập → POST trả 200 `{sourceId,...}` và DB có 1 source + N sentences gắn đúng `user_id`; chưa đăng nhập → 401; `rawContent` rỗng → 400; vượt `max_import_chars` → 400; API key không lộ ra client.
- [ ] **/import:** chọn loại nguồn + tiêu đề, dán hoặc upload .txt, bấm "Phân tích" → hiện trạng thái xử lý → điều hướng sang trang Duyệt & sửa của source mới (F2 bước 1–5).
- [ ] **SentenceView:** render furigana ruby cho kanji, không hiện furigana cho kana/dấu câu; mỗi từ click được; không gọi API (đọc tokens trực tiếp).
- [ ] **Duyệt & sửa:** câu `corrected` hiện đối chiếu `original`↔`text` + `note`; câu `confidence=low` được highlight + badge "đáng ngờ"; sửa `text` lưu lại (reload còn); "Bỏ câu rác" đặt `skipped=true` và làm mờ câu; "Xác nhận & học" điều hướng `/study` (F2.5 bước 1–5; docs 10 §3.2).
- [ ] **Phân quyền:** mở `/import/<id>/review` của source thuộc user khác → notFound; mọi truy vấn repository lọc `user_id` (docs 02 §6).
- [ ] **Bảo vệ route:** đăng xuất mở `/import`, `/import/<id>/review` → redirect `/login`; `/api/ingest` → 401.
- [ ] **Dev-auth (QĐ-9):** `lib/db/seed-user.ts` tạo user test idempotent; với `AUTH_DEV_LOGIN=true` (dev), `/login` đăng nhập được vào user test → mọi tiêu chí "đăng nhập rồi…" chạy được; với cờ tắt/production, provider Credentials **không** xuất hiện và route vẫn bị bảo vệ. Cơ chế này dùng chung cho P3/P4 (không dựng lối đăng nhập riêng).
- [ ] **UI chuẩn:** dùng `.btn-3d`+biến thể, `.wl-chip`, `.wl-input`, `.wl-card`, `.wl-badge`; mobile-first; tôn trọng `prefers-reduced-motion`.
- [ ] **Không lock-in / không Kuromoji:** UI không gọi Drizzle trực tiếp (qua repositories); không có dependency Kuromoji/từ điển ngoài; phân tích nằm trong `sentences.tokens`.
