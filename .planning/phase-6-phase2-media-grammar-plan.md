# GSD Phase 6 — GĐ2 — Audio/Video, YouTube, Ngữ pháp

> Kế hoạch GSD cho **GĐ2** của WorkLingo: gộp **F6 (Upload audio/video → Whisper)**,
> **F7 (AI giải thích ngữ pháp)** và **import phụ đề YouTube** vào cùng một phase vì
> cả ba đều **đưa thêm đầu vào / chức năng vào pipeline AI Ingest và màn study đã có**.
> Nguồn sự thật: [docs/04-features.md](../docs/04-features.md) (F6, F7, mục 1 bản đồ
> tính năng), [docs/11-ai-ingest.md](../docs/11-ai-ingest.md),
> [docs/02-architecture.md](../docs/02-architecture.md),
> [docs/03-data-model.md](../docs/03-data-model.md).

---

## Mục tiêu

Cho phép người dùng **bổ sung 2 nguồn nội dung mới** ngoài "dán text / upload .txt"
(MVP) và **một công cụ học mới** trên câu, mà **không làm lại** pipeline Ingest/Study
đã có:

1. **F6 — Upload audio/video → STT (Whisper):**
   - Upload file audio/video tại `/import` → lưu file vào **Storage tự host**
     (filesystem local sau reverse proxy) → ghi `sources.audio_url`.
   - Gọi **OpenAI Whisper API** (`whisper-1`, model lấy từ `app_settings.whisper_model`)
     với `response_format = verbose_json` để nhận transcript **kèm timestamp từng đoạn**.
   - Ghép transcript thành text thô → đưa qua **AI Ingest (gpt-4o)** y như luồng .txt
     → ra `sentences` (original/text/tokens...).
   - **Tách câu kèm `audio_start`**: ánh xạ mỗi `sentence` về timestamp bắt đầu trong
     audio (cột `sentences.audio_start`, kiểu B trong data-model).
   - Trong màn **study**, mỗi câu có nút 🔊 **nghe lại đúng đoạn audio gốc** bắt đầu từ
     `audio_start` (phát file gốc qua Howler).

2. **Import phụ đề YouTube (F2.5 GĐ2):**
   - Tại `/import`, với loại nguồn `youtube`, dán **URL YouTube** → server lấy **phụ đề
     (caption track) tiếng Nhật** → ghép thành text thô (giữ timestamp đoạn) → đưa qua
     **AI Ingest** y như audio/video → ra `sentences` (có thể kèm `audio_start` theo
     mốc thời gian caption).

3. **F7 — AI giải thích ngữ pháp câu:**
   - Trong màn **study**, chọn 1 câu → nút **"Giải thích"** → server gọi **OpenAI qua
     `lib/ai`** với câu + ngữ cảnh đoạn → trả **giải thích ngữ pháp bằng tiếng Việt**
     (cấu trúc ngữ pháp, trợ từ, thì/thể, sắc thái) → hiển thị trong panel/popup.

**Phạm vi GIỮ NGUYÊN, không đụng:** AI Ingest core (`lib/ai/ingest.ts`,
`lib/ai/prompts.ts` — chỉ thêm hàm mới, không sửa schema câu), màn Duyệt & sửa (F2.5
MVP), render `SentenceView`/`WordPopup`, SRS, gamification, auth. Phase này chỉ **thêm
nguồn đầu vào + 1 hành động trên câu**.

---

## Phụ thuộc

| Phase phụ thuộc | Vì sao bắt buộc xong trước |
|-----------------|-----------------------------|
| **Phase 2 — F2/F2.5 (Import + Duyệt & sửa)** | Toàn bộ GĐ2 **tái dùng pipeline Ingest** (`/api/ingest`, `lib/ai/ingest.ts`, `repositories/sources.ts`, bảng `sources`/`sentences`) và **màn Duyệt & sửa**. Audio/YouTube chỉ thay khâu "lấy text thô" rồi đổ vào đúng pipeline đó → cần F2/F2.5 đã chạy được trước. |
| **Phase 3 — F3 (Study & sentence mining)** | F6 (nút nghe lại theo câu) và F7 (nút "Giải thích" trên câu) **gắn vào màn `/study` và `SentenceView`/`WordPopup`** đã có. Không có màn study thì không có chỗ đặt nút nghe lại / giải thích. |

> Theo mapping ROADMAP của dự án (docs/12), F6 = GSD Phase 6, F7 = GSD Phase 7. Theo
> yêu cầu lần lập kế hoạch này, **gộp F6 + F7 + YouTube vào một phase GĐ2** vì cùng
> chạm pipeline Ingest + màn study. Phụ thuộc khai báo: **[2, 3]**.

> Các bảng `sources.audio_url` và `sentences.audio_start` đã được **thiết kế sẵn** trong
> [docs/03-data-model.md](../docs/03-data-model.md) cho GĐ2 → phase này chỉ cần **thêm
> cột vào Drizzle schema + migration**, không đổi thiết kế.

---

## Quyết định triển khai (discuss-phase)

Các "vùng xám" và lựa chọn đã chốt, bám docs:

### QĐ-1 — Storage = filesystem tự host, bọc sau `lib/storage` (chống lock-in)
- **Vấn đề:** docs nhắc "Storage (lưu file audio/video - GĐ2)" nhưng dự án **tự host,
  KHÔNG Supabase** (02-architecture §1) → không có Supabase Storage.
- **Chốt:** Lưu file vào **thư mục local trên server** (mặc định `./storage/audio/`,
  đường dẫn lấy từ `app_settings.storage_dir`), phục vụ qua route handler có kiểm
  quyền `user_id`. **Bọc sau một interface `lib/storage`** (giống cách `lib/ai`,
  `lib/tts` bọc provider) để GĐ sau đổi sang S3/MinIO chỉ sửa một chỗ. Đường dẫn gốc
  là **config trong `app_settings`**, không hard-code; KHÔNG để file trong `public/`
  (tránh lộ file người khác).
- **Lý do:** đồng nhất nguyên tắc chống lock-in + "setting hệ thống ở DB, secret ở env"
  (02-architecture §1, §7).

### QĐ-2 — Whisper trả `verbose_json` để có timestamp → suy ra `audio_start`
- **Vấn đề:** `sentences.audio_start` cần timestamp, nhưng AI Ingest tách câu **lại**
  từ text thô (Whisper segment ≠ câu sau Ingest).
- **Chốt:** Gọi Whisper với `response_format: "verbose_json"` (qua `OPENAI_API_KEY`,
  model = `app_settings.whisper_model`, mặc định `whisper-1`) → nhận `segments[]` có
  `start`. Ghép `segment.text` thành raw text (giữ một map `offset_ký_tự → start`).
  Sau khi Ingest tách câu, **ánh xạ `audio_start` cho mỗi câu** bằng cách so khớp
  câu với segment đầu tiên phủ nó (so theo prefix/substring của `sentence.text` hoặc
  `original` trong chuỗi segment). Không khớp được → `audio_start = null` (nút nghe lại
  ẩn cho câu đó).
- **Lý do:** docs ghi rõ "kết hợp confidence Whisper + AI Ingest" và `audio_start`
  "kiểu B" (03-data-model). Ánh xạ best-effort, không chặn luồng nếu thiếu mốc.

### QĐ-3 — Tái dùng `/api/ingest`, KHÔNG sửa schema câu của AI Ingest
- **Vấn đề:** có nên cho Whisper/YouTube đi đường Ingest riêng?
- **Chốt:** Audio/YouTube **chỉ thay khâu "lấy raw text"**; sau đó gọi **đúng
  `lib/ai/ingest.ts` và schema JSON câu hiện có** (11-ai-ingest §3) để ra
  `sentences`. Không thêm field vào schema token/câu của Ingest. `audio_start` được
  **gán ở tầng repository/route sau Ingest**, không phải do AI sinh.
- **Lý do:** keyDecision "AI Ingest 1 lượt làm tất cả, không gọi lại"; giữ pipeline
  một đường để Duyệt & sửa, Study, SRS dùng lại nguyên vẹn.

### QĐ-4 — Upload + transcribe chạy **server-side, đồng bộ trong API route**, có giới hạn
- **Vấn đề:** file lớn, Whisper chậm → serverless timeout? Long-running server thì sao?
- **Chốt:** Dự án là **long-running Node server (không serverless)** (02-architecture §8)
  → chạy upload + Whisper + Ingest **đồng bộ trong một API route** `POST /api/ingest/audio`,
  trả về `sourceId` khi xong (giống `/api/ingest` text). Giới hạn kích thước/độ dài lấy
  từ `app_settings` (`max_audio_mb`, `max_import_chars`); vượt → trả lỗi rõ ràng. UI
  hiển thị trạng thái "Đang transcribe…". (Hàng đợi nền/streaming để GĐ sau, không làm
  bây giờ để giữ task nguyên tử.)
- **Lý do:** tránh phụ thuộc hạ tầng job-queue chưa có; phù hợp keyDecision "AI Ingest
  chạy lúc import, độ trễ vài giây chấp nhận được".

### QĐ-5 — Lấy phụ đề YouTube: bọc sau `lib/youtube`, không phụ thuộc API key trả phí
- **Vấn đề:** YouTube Data API cần key + quota; lấy caption "chính chủ" cần OAuth chủ
  kênh → không khả thi cho video bất kỳ.
- **Chốt:** Tạo module `lib/youtube/captions.ts` (interface `fetchCaptions(url, lang)`)
  lấy **caption track công khai** (ưu tiên tiếng Nhật `ja`; fallback auto-caption nếu
  có) qua thư viện cộng đồng (vd `youtube-transcript`), trả `[{ text, start }]`. Ghép
  thành raw text giữ mốc `start` → dùng lại QĐ-2/QĐ-3 để gán `audio_start`. **Không**
  tải/lưu video; chỉ lưu `sources.raw_content` + (tùy chọn) URL gốc ở `sources.title`/
  metadata. Nếu video không có caption → báo lỗi "Video không có phụ đề khả dụng".
- **Lý do:** docs F2.5-GĐ2 chỉ yêu cầu "đưa nội dung từ phụ đề YouTube vào pipeline
  Ingest" — không yêu cầu tải video. Bọc interface để đổi nguồn caption sau dễ.

### QĐ-6 — F7 dùng `lib/ai` (prompt riêng), KHÔNG lưu DB, có giới hạn tần suất
- **Vấn đề:** giải thích ngữ pháp có cần lưu? gọi model nào?
- **Chốt:** Thêm `lib/ai/grammar.ts` + prompt trong `lib/ai/prompts.ts` (hàm
  `explainGrammar(sentence, context)`), gọi qua interface `lib/ai` chung
  (model = `app_settings.openai_model`, mặc định `gpt-4o`), trả **markdown tiếng Việt**.
  Route `POST /api/grammar` nhận `sentenceId` → repository lấy câu + vài câu lân cận
  cùng source làm ngữ cảnh (lọc theo `user_id`) → gọi AI → trả text. **Không tạo bảng
  mới**; kết quả hiển thị tức thời (có thể cache phía client trong phiên). Bảo vệ:
  yêu cầu đăng nhập, kiểm `user_id` sở hữu câu.
- **Lý do:** F7 là "công cụ tra cứu theo yêu cầu", không phải dữ liệu học lâu dài →
  không cần persist (giữ data-model gọn). Bọc sau `lib/ai` theo keyDecision "đổi
  provider dễ".

### QĐ-7 — Seed thêm `app_settings` cho GĐ2 thay vì hard-code
- **Chốt:** Thêm seed key: `whisper_model` (đã có gợi ý trong data-model, mặc định
  `"whisper-1"`), `storage_dir` (`"./storage"`), `max_audio_mb` (`50`),
  `youtube_caption_lang` (`"ja"`), và bật cờ trong `feature_flags`:
  `{ "audio_ingest": true, "youtube_ingest": true, "grammar_explain": true }`.
- **Lý do:** "mọi setting hệ thống ở `app_settings`, đọc qua `lib/config`, sửa runtime
  qua Admin" (02-architecture §7, 03-data-model §4). Cho phép Admin tắt nhanh tính năng
  GĐ2 nếu cần.

### QĐ-8 — Nút "nghe lại đoạn" phát **file audio gốc** qua Howler, không phải TTS
- **Vấn đề:** dễ nhầm với F8 (TTS Web Speech đọc kana).
- **Chốt:** Nút 🔊 "nghe lại đoạn gốc" của F6 **phát chính file audio đã upload** bắt
  đầu từ `audio_start` (dùng **Howler.js** — đã trong tech stack — với `sprite`/seek
  theo `audio_start`, dừng sau ~vài giây hoặc tới câu kế). Khác hoàn toàn nút TTS đọc
  reading kana (F8, đã có). Câu YouTube không có file audio cục bộ → ẩn nút nghe lại
  (hoặc chỉ hiện link mở YouTube tại mốc `start` — tùy chọn, không bắt buộc).
- **Lý do:** F6 mục đích "đối chiếu đoạn gốc" (04-features §F6, 11/F2 GĐ2) → phải là
  audio thật, không phải giọng máy.

---

## Kế hoạch task nguyên tử (plan-phase)

> Mỗi task nhỏ, độc lập, commit riêng. Thứ tự gợi ý: hạ tầng dữ liệu/config → storage →
> whisper → ingest audio → youtube → study nghe lại → grammar.

<task type="auto">
  <name>Schema: thêm cột audio cho sources/sentences</name>
  <files>lib/db/schema.ts</files>
  <action>Trong Drizzle schema, thêm cột vào bảng đã có (KHÔNG tạo bảng mới): `sources.audio_url` (text, nullable) và `sentences.audio_start` (real/float, nullable) đúng như docs/03-data-model.md (mục sources, sentences). Đảm bảo enum `sources.type` đã có giá trị `youtube` (nếu chưa có thì bổ sung). Giữ nguyên các cột hiện tại, không đổi tên/kiểu cột cũ.</action>
  <verify>Chạy `npx drizzle-kit generate` sinh ra file migration mới trong drizzle/ chứa ADD COLUMN audio_url và audio_start; `npx tsc --noEmit` không lỗi type ở schema.ts.</verify>
  <done>schema.ts khai báo sources.audio_url và sentences.audio_start (nullable); enum type có 'youtube'; migration được sinh.</done>
</task>

<task type="auto">
  <name>Migration: áp cột audio vào DB</name>
  <files>drizzle/ (file migration mới)</files>
  <action>Chạy migration vừa sinh ở task trước lên PostgreSQL tự host bằng drizzle-kit (lệnh migrate theo cấu hình dự án, dùng DATABASE_URL trong .env). Không xóa dữ liệu hiện có; chỉ thêm cột nullable.</action>
  <verify>Kết nối psql: `\d sources` hiển thị cột audio_url; `\d sentences` hiển thị cột audio_start. Hoặc chạy `npx drizzle-kit migrate` không lỗi.</verify>
  <done>Bảng sources có audio_url, sentences có audio_start trên DB thật; migrate exit code 0.</done>
</task>

<task type="auto">
  <name>Seed app_settings cho GĐ2</name>
  <files>lib/db/seed.ts, lib/config.ts</files>
  <action>Thêm seed các key app_settings GĐ2 (idempotent, dùng upsert/onConflictDoNothing): `whisper_model`=`"whisper-1"` (string), `storage_dir`=`"./storage"` (string), `max_audio_mb`=`50` (number), `youtube_caption_lang`=`"ja"` (string); và merge vào `feature_flags` các cờ `audio_ingest`, `youtube_ingest`, `grammar_explain` = true. Trong lib/config.ts, bổ sung các key này vào bảng fallback mặc định (để getConfig trả giá trị đúng kể cả khi DB thiếu key) và export hàm getter tiện dụng nếu lib/config có quy ước getter sẵn.</action>
  <verify>Chạy seed script; truy vấn `SELECT key,value FROM app_settings WHERE key IN ('whisper_model','storage_dir','max_audio_mb','youtube_caption_lang','feature_flags');` thấy đủ key. Gọi getConfig('whisper_model') trả 'whisper-1' khi xóa thử key (fallback).</verify>
  <done>app_settings có đủ key GĐ2; lib/config trả fallback đúng khi thiếu key; feature_flags chứa 3 cờ GĐ2.</done>
</task>

<task type="auto">
  <name>lib/storage: interface lưu/đọc file (filesystem)</name>
  <files>lib/storage/index.ts, lib/storage/local.ts</files>
  <action>Tạo interface `Storage` với `save(userId, file, ext): Promise<{ key: string; url: string }>` và `getStream(key): ReadableStream|Buffer` và `getPublicPath(key): string`. Cài đặt `local.ts` lưu file vào `${storage_dir}/audio/${userId}/${uuid}.${ext}` (storage_dir đọc từ lib/config). Tạo thư mục nếu chưa có (fs.mkdir recursive). `url` trả về dạng đường dẫn nội bộ `/api/media/<key>` (không phải đường dẫn hệ thống). index.ts export instance mặc định (local) để đổi provider sau dễ. Không đặt file trong public/.</action>
  <verify>Viết một script nhỏ tạm gọi storage.save với buffer giả → file xuất hiện đúng dưới storage_dir/audio/<userId>/; `npx tsc --noEmit` sạch.</verify>
  <done>lib/storage lưu được file ra đĩa, trả key + url nội bộ; thư mục tự tạo; bọc sau interface đổi provider dễ.</done>
</task>

<task type="auto">
  <name>Route phục vụ media có kiểm quyền</name>
  <files>app/api/media/[...key]/route.ts</files>
  <action>Tạo GET route stream file audio từ lib/storage theo `key`. Kiểm tra session Auth.js (server-side); chỉ cho phép khi key thuộc về user hiện tại (key có chứa userId — đối chiếu với session.user.id) HOẶC user là admin. Trả đúng Content-Type theo đuôi file (audio/mpeg, video/mp4, audio/wav...), hỗ trợ HTTP Range request (header Range → 206 Partial Content) để Howler seek theo audio_start hoạt động. Chưa đăng nhập → 401; không sở hữu → 403; không tồn tại → 404.</action>
  <verify>Đăng nhập, mở `/api/media/<key của mình>` trong trình duyệt phát được audio; gửi `curl -H "Range: bytes=0-1023"` trả 206. Truy cập key của user khác trả 403; chưa đăng nhập trả 401.</verify>
  <done>Route stream audio có kiểm user_id, hỗ trợ Range; trả mã lỗi đúng cho các trường hợp.</done>
</task>

<task type="auto">
  <name>lib/ai: hàm transcribe (Whisper) verbose_json</name>
  <files>lib/ai/transcribe.ts, lib/ai/openai.ts</files>
  <action>Thêm hàm `transcribe(audioFile, { model, language='ja' }): Promise<{ text: string; segments: {start:number; text:string}[] }>` gọi OpenAI Whisper API với `response_format: 'verbose_json'`, model = app_settings.whisper_model (đọc lib/config), dùng OPENAI_API_KEY từ env. Đặt cài đặt cụ thể trong openai.ts (tái dùng client OpenAI đã có nếu lib/ai/openai.ts đã khởi tạo), interface trong transcribe.ts. Có retry 1 lần khi lỗi mạng. Ghép `segments[].text` thành `text` đầy đủ.</action>
  <verify>Viết test/script gọi transcribe với 1 file .mp3 tiếng Nhật ngắn → trả về text + mảng segments có trường start (number) và text. tsc sạch.</verify>
  <done>transcribe() trả text + segments[{start,text}] từ Whisper; model lấy từ config; ẩn API key ở server.</done>
</task>

<task type="auto">
  <name>lib/ai: map segment → audio_start cho từng câu</name>
  <files>lib/ai/audioMapping.ts</files>
  <action>Tạo hàm thuần `mapSentencesToAudioStart(sentences, segments): number|null[]` (best-effort, QĐ-2): dựng chuỗi ghép segments kèm offset ký tự → start; với mỗi sentence (dùng sentence.original hoặc text đã chuẩn hoá bỏ khoảng trắng) tìm vị trí xuất hiện đầu tiên trong chuỗi ghép → lấy start của segment phủ vị trí đó. Không tìm thấy → null. Hàm phải pure, không gọi DB/AI, có unit test.</action>
  <verify>Viết unit test (vitest/jest theo dự án) với mảng segments giả + 3 câu → trả audio_start hợp lý cho câu khớp, null cho câu không khớp. Test pass.</verify>
  <done>Hàm map pure, có test pass; trả audio_start hoặc null cho từng câu.</done>
</task>

<task type="auto">
  <name>Repository: tạo source audio + gán audio_start</name>
  <files>lib/repositories/sources.ts</files>
  <action>Thêm hàm `createAudioSource({ userId, type, title, rawContent, audioUrl, sentences, audioStarts })` (tái dùng logic lưu source+sentences hiện có, KHÔNG viết trùng): tạo source với type ('meeting'|'youtube'|'text' tùy gọi) + audio_url, rồi lưu sentences kèm audio_start tương ứng theo index. Luôn lọc/đặt user_id = userId (phân quyền tầng repo). Nếu đã có hàm lưu sentences dùng chung thì mở rộng nó nhận thêm audio_start, không tạo đường lưu song song.</action>
  <verify>Gọi hàm với dữ liệu giả trong script → source mới có audio_url; sentences có audio_start đúng theo mảng truyền vào; truy vấn theo user_id khác không thấy source này.</verify>
  <done>Repository tạo được source audio + sentences kèm audio_start, gắn đúng user_id; tái dùng logic lưu sẵn có.</done>
</task>

<task type="auto">
  <name>API: POST /api/ingest/audio (upload→whisper→ingest)</name>
  <files>app/api/ingest/audio/route.ts</files>
  <action>Tạo POST nhận multipart/form-data (field `file`, `title`, `type` mặc định 'meeting'). Luồng đồng bộ (QĐ-4): (1) kiểm session + feature_flags.audio_ingest; (2) validate kích thước ≤ max_audio_mb và đuôi file là audio/video hợp lệ; (3) lib/storage.save → audioUrl; (4) lib/ai/transcribe → text+segments; (5) gọi lib/ai/ingest (gpt-4o) với text (chunk nếu > ingest_chunk_size, tái dùng logic chunk đã có); (6) lib/ai/audioMapping.mapSentencesToAudioStart; (7) sources.createAudioSource; (8) trả JSON { sourceId }. Lỗi từng bước → status + message tiếng Việt rõ ràng. KHÔNG sửa /api/ingest (text) hiện có.</action>
  <verify>`curl -F file=@sample.mp3 -F title=test -F type=meeting <host>/api/ingest/audio` (đã đăng nhập) trả { sourceId }; DB có source mới (audio_url set) + sentences (có audio_start). Upload file > max_audio_mb trả lỗi 4xx rõ ràng. Khi feature_flags.audio_ingest=false trả 403/disabled.</verify>
  <done>Endpoint chạy trọn upload→Whisper→Ingest→lưu DB, trả sourceId; tôn trọng giới hạn + feature flag; không đụng route ingest text.</done>
</task>

<task type="auto">
  <name>lib/youtube: lấy phụ đề YouTube</name>
  <files>lib/youtube/captions.ts, lib/youtube/index.ts</files>
  <action>Tạo interface `fetchCaptions(url, lang)` (QĐ-5) dùng thư viện cộng đồng (vd `youtube-transcript`) lấy caption track ưu tiên lang = app_settings.youtube_caption_lang ('ja'), fallback auto-caption. Trả `{ items: {text,start}[]; rawText: string }` (rawText = ghép text theo thứ tự, giữ map offset→start như QĐ-2). Trích videoId từ nhiều dạng URL (watch?v=, youtu.be/, shorts/). Video không có caption → throw Error có message 'Video không có phụ đề khả dụng'. index.ts export instance mặc định để đổi nguồn caption sau dễ.</action>
  <verify>Gọi fetchCaptions với 1 URL YouTube có phụ đề tiếng Nhật → trả items có text+start và rawText không rỗng. Gọi với video không phụ đề → throw đúng message. tsc sạch.</verify>
  <done>lib/youtube lấy được caption ja (hoặc fallback), trả items+rawText; báo lỗi rõ khi không có phụ đề; bọc sau interface.</done>
</task>

<task type="auto">
  <name>API: POST /api/ingest/youtube</name>
  <files>app/api/ingest/youtube/route.ts</files>
  <action>Tạo POST nhận JSON { url, title? }. Luồng (tái dùng QĐ-3): kiểm session + feature_flags.youtube_ingest; lib/youtube.fetchCaptions → rawText + items; validate độ dài ≤ max_import_chars; lib/ai/ingest (chunk nếu dài); map audio_start từ items (dùng lại lib/ai/audioMapping với segments = items map về {start,text}); sources.createAudioSource với type='youtube', audio_url=null (không lưu video), title mặc định = URL nếu không truyền. Trả { sourceId }. Lỗi không có phụ đề → 422 message tiếng Việt.</action>
  <verify>`curl -X POST -d '{"url":"https://youtu.be/<id_có_phụ_đề_ja>"}' -H 'Content-Type: application/json' <host>/api/ingest/youtube` (đã đăng nhập) trả { sourceId }; DB có source type=youtube + sentences (audio_start có thể set theo caption). URL không phụ đề trả 422.</verify>
  <done>Endpoint YouTube tạo source type=youtube qua đúng pipeline Ingest; sentences có audio_start theo caption khi map được; báo lỗi khi thiếu phụ đề.</done>
</task>

<task type="auto">
  <name>UI Import: tab Upload audio/video + tab YouTube</name>
  <files>app/import/page.tsx, components/AudioUploadForm.tsx</files>
  <action>Mở rộng màn /import (KHÔNG bỏ phần dán text/.txt hiện có): thêm lựa chọn loại nguồn audio/video → form upload file (kéo-thả + chọn file), nhập tiêu đề, nút "Phân tích" gọi POST /api/ingest/audio (multipart) với trạng thái "Đang transcribe…" (disable nút, hiển thị spinner). Với loại 'youtube' → ô dán URL gọi POST /api/ingest/youtube. Khi thành công → điều hướng sang màn Duyệt & sửa của sourceId trả về (đúng route đang dùng cho text). Dùng component chuẩn .btn-3d / .wl-input / .wl-card theo design-system; ẩn các tab nếu feature_flag tương ứng tắt.</action>
  <verify>Mở /import: thấy tab Upload audio/video và YouTube; upload 1 file → hiện "Đang transcribe…" rồi chuyển sang Duyệt & sửa với câu đã tách. Dán URL YouTube có phụ đề → chuyển sang Duyệt & sửa. Tắt feature flag → tab ẩn.</verify>
  <done>/import có 2 luồng mới (audio/video, YouTube) gọi đúng API, hiển thị trạng thái, chuyển sang Duyệt & sửa; tôn trọng feature flags + design-system.</done>
</task>

<task type="auto">
  <name>Component: nút nghe lại đoạn audio gốc (Howler)</name>
  <files>components/SentencePlayer.tsx, components/SentenceView.tsx</files>
  <action>Tạo SentencePlayer nhận props { audioSrc, audioStart, audioEnd? }: nút 🔊 "nghe lại đoạn gốc" dùng Howler.js — load audioSrc (= /api/media/<key>), khi bấm thì seek tới audioStart và play; dừng sau audioEnd (nếu có audio_start câu kế) hoặc sau ~6s. Quản lý 1 Howl instance dùng chung (tránh tạo nhiều). Trong SentenceView, render SentencePlayer CHỈ khi câu có audio_start != null và source có audio_url; nếu không thì ẩn. Phân biệt rõ với nút TTS (F8) đọc kana — đây là 2 nút khác nhau. Tôn trọng prefers-reduced-motion/sound_enabled (không tự phát, chỉ phát khi bấm).</action>
  <verify>Mở /study của một source audio: câu có audio_start hiện nút nghe lại; bấm → phát đúng đoạn audio gốc bắt đầu từ audio_start qua Howler. Câu không có audio_start không hiện nút. Source text/.txt cũ không hiện nút (không hồi quy).</verify>
  <done>SentenceView hiện nút nghe lại đoạn gốc cho câu có audio_start; Howler seek+play đúng mốc; không ảnh hưởng source không audio.</done>
</task>

<task type="auto">
  <name>lib/ai: giải thích ngữ pháp (prompt + hàm)</name>
  <files>lib/ai/grammar.ts, lib/ai/prompts.ts</files>
  <action>Trong prompts.ts thêm prompt GRAMMAR_EXPLAIN (tiếng Việt): yêu cầu AI giải thích cấu trúc ngữ pháp của 1 câu tiếng Nhật cho người Việt — phân tích trợ từ, thì/thể, dạng động từ, sắc thái lịch sự, mẫu ngữ pháp (kèm ví dụ ngắn), dựa trên ngữ cảnh đoạn; trả markdown gọn, KHÔNG bịa nếu không chắc. Trong grammar.ts thêm `explainGrammar({ sentence, context }): Promise<string>` gọi lib/ai (model = app_settings.openai_model, mặc định gpt-4o) qua interface chung lib/ai/index. Không structured-output JSON (trả markdown). Có retry 1 lần.</action>
  <verify>Gọi explainGrammar với câu mẫu (vd 確認をお願いします。) + ngữ cảnh → trả chuỗi markdown tiếng Việt giải thích trợ từ を/お願いします. tsc sạch.</verify>
  <done>explainGrammar() trả giải thích ngữ pháp tiếng Việt từ câu + ngữ cảnh; dùng model từ config; prompt nằm ở prompts.ts.</done>
</task>

<task type="auto">
  <name>API: POST /api/grammar</name>
  <files>app/api/grammar/route.ts, lib/repositories/sentences.ts</files>
  <action>Tạo POST nhận { sentenceId }. Kiểm session + feature_flags.grammar_explain. Thêm/ dùng repository getSentenceWithContext(sentenceId, userId) trong sentences.ts: lấy câu (lọc user_id qua source) + 1-2 câu lân cận cùng source làm ngữ cảnh; nếu câu không thuộc user → 403. Gọi lib/ai/grammar.explainGrammar → trả { explanation }. Lỗi AI → 502 message tiếng Việt. KHÔNG lưu DB (QĐ-6).</action>
  <verify>`curl -X POST -d '{"sentenceId":"<id của mình>"}' <host>/api/grammar` (đã đăng nhập) trả { explanation } markdown tiếng Việt. sentenceId của user khác trả 403. feature_flags.grammar_explain=false trả disabled.</verify>
  <done>Endpoint trả giải thích ngữ pháp cho câu của chính user; không persist; bảo vệ user_id + feature flag.</done>
</task>

<task type="auto">
  <name>UI Study: nút "Giải thích" + panel ngữ pháp</name>
  <files>components/GrammarExplain.tsx, components/SentenceView.tsx</files>
  <action>Tạo GrammarExplain: nút "Giải thích" trên/cạnh mỗi câu trong SentenceView; bấm → gọi POST /api/grammar với sentenceId, hiển thị spinner rồi render markdown trả về trong panel/Sheet (dùng shadcn + react-markdown hoặc renderer markdown đã có). Cache kết quả trong state theo sentenceId để không gọi lại trong phiên. Ẩn nút nếu feature_flags.grammar_explain tắt. Dùng .btn-3d/.wl-card theo design-system; tôn trọng prefers-reduced-motion.</action>
  <verify>Mở /study, bấm "Giải thích" trên một câu → hiện giải thích ngữ pháp tiếng Việt; bấm lại không gọi API lần 2 (dùng cache). Tắt feature flag → nút ẩn.</verify>
  <done>Màn study có nút Giải thích → hiển thị giải thích ngữ pháp markdown; cache theo câu; tôn trọng feature flag + design-system.</done>
</task>

<task type="auto">
  <name>Admin: lộ các app_settings GĐ2 + cập nhật docs</name>
  <files>app/admin/page.tsx, docs/04-features.md, ROADMAP.md</files>
  <action>Đảm bảo trang Admin (đã có form sửa app_settings runtime) render và cho sửa các key GĐ2 mới: whisper_model, storage_dir, max_audio_mb, youtube_caption_lang, feature_flags (3 cờ). Nếu form Admin tự sinh theo type của key thì chỉ cần seed đúng type (task seed đã làm) — kiểm tra hiển thị/sửa được. Cập nhật ROADMAP.md đánh dấu Phase 6 (GĐ2) đang làm/▶, và bổ sung ghi chú nhỏ trong docs/04-features.md rằng F6/F7/YouTube triển khai gộp GĐ2 (không đổi mô tả feature).</action>
  <verify>Đăng nhập admin, mở /admin: thấy và sửa được whisper_model, max_audio_mb, feature_flags; lib/config invalidate sau khi sửa (đổi whisper_model → lần transcribe sau dùng model mới). ROADMAP.md có trạng thái Phase 6 cập nhật.</verify>
  <done>Admin chỉnh được setting GĐ2 runtime; cache invalidate; ROADMAP/docs cập nhật trạng thái GĐ2.</done>
</task>

---

## Components tạo/đụng trong phase

| Component | File | Mục đích | Trạng thái |
|-----------|------|----------|------------|
| AudioUploadForm | `components/AudioUploadForm.tsx` | Form upload file audio/video + dán URL YouTube tại /import, gọi API ingest tương ứng, hiển thị "Đang transcribe…" | Tạo mới |
| SentencePlayer | `components/SentencePlayer.tsx` | Nút 🔊 nghe lại **đoạn audio gốc** từ `audio_start` qua Howler (khác nút TTS) | Tạo mới |
| GrammarExplain | `components/GrammarExplain.tsx` | Nút "Giải thích" + panel hiển thị giải thích ngữ pháp tiếng Việt (markdown) | Tạo mới |
| SentenceView | `components/SentenceView.tsx` | Thêm chỗ gắn SentencePlayer (khi câu có audio_start) và GrammarExplain; **không đổi** logic render furigana/token | Sửa (mở rộng) |

---

## Pages/Routes trong phase

| Route | Loại | Mô tả | Auth |
|-------|------|-------|------|
| `/import` | Page (sửa) | Thêm luồng upload audio/video và dán URL YouTube ngoài dán text/.txt hiện có | Yêu cầu đăng nhập |
| `/study` | Page (sửa gián tiếp qua SentenceView) | Câu của source audio có nút nghe lại đoạn gốc; mọi câu có nút "Giải thích" ngữ pháp | Yêu cầu đăng nhập |
| `POST /api/ingest/audio` | API route (mới) | Upload→lưu Storage→Whisper transcribe→AI Ingest→lưu source/sentences (kèm audio_start) | Yêu cầu đăng nhập; check `feature_flags.audio_ingest` |
| `POST /api/ingest/youtube` | API route (mới) | Lấy phụ đề YouTube→AI Ingest→lưu source type=youtube | Yêu cầu đăng nhập; check `feature_flags.youtube_ingest` |
| `POST /api/grammar` | API route (mới) | Nhận sentenceId→lấy câu+ngữ cảnh (lọc user_id)→AI giải thích ngữ pháp tiếng Việt | Yêu cầu đăng nhập; sở hữu câu; check `feature_flags.grammar_explain` |
| `GET /api/media/[...key]` | API route (mới) | Stream file audio đã upload, hỗ trợ Range, kiểm `user_id`/admin | Yêu cầu đăng nhập; chỉ chủ sở hữu hoặc admin |
| `/admin` | Page (sửa) | Sửa runtime các app_settings GĐ2 mới (whisper_model, storage_dir, max_audio_mb, youtube_caption_lang, feature_flags) | Chỉ `role = admin` |

---

## Tiêu chí hoàn thành Phase (verify-work)

Checklist nghiệm thu quan sát được:

- [ ] **Schema/DB:** `sources.audio_url` và `sentences.audio_start` tồn tại trên DB
      (kiểm `\d sources`, `\d sentences`); migration chạy không mất dữ liệu cũ.
- [ ] **Config:** `SELECT` thấy đủ key GĐ2 trong `app_settings`; `lib/config` trả
      fallback đúng khi thiếu key; Admin sửa được runtime và cache invalidate.
- [ ] **Storage có kiểm quyền:** mở `/api/media/<key của mình>` phát được audio và đáp
      ứng Range (206); key của user khác → 403; chưa đăng nhập → 401. File **không**
      nằm trong `public/`.
- [ ] **F6 đầu-cuối:** tại `/import` upload 1 file audio/video tiếng Nhật → hiện
      "Đang transcribe…" → tự chuyển sang **Duyệt & sửa** với câu đã tách; DB có source
      mới (`audio_url` set) + `sentences` có `audio_start` (≥ phần lớn câu khớp).
- [ ] **Nghe lại đoạn gốc:** tại `/study` của source audio, câu có `audio_start` hiện
      nút 🔊 nghe lại; bấm → phát **đúng đoạn audio gốc** từ `audio_start` qua Howler;
      câu không có `audio_start` không hiện nút; source text/.txt cũ **không hồi quy**.
- [ ] **YouTube:** dán URL video tiếng Nhật **có phụ đề** → tạo source `type=youtube`
      qua đúng pipeline Ingest → sang Duyệt & sửa; URL **không có phụ đề** → báo lỗi
      tiếng Việt rõ ràng (không crash).
- [ ] **F7 giải thích ngữ pháp:** tại `/study` bấm "Giải thích" trên một câu → hiển thị
      giải thích ngữ pháp **tiếng Việt** (markdown) trong vài giây; bấm lại dùng cache,
      không gọi API lần 2; câu của user khác → API trả 403.
- [ ] **Phân quyền & flags:** mọi API mới yêu cầu đăng nhập và lọc theo `user_id`; tắt
      `feature_flags.audio_ingest` / `youtube_ingest` / `grammar_explain` thì luồng/nút
      tương ứng bị ẩn/disabled.
- [ ] **Không hồi quy pipeline cũ:** luồng dán text/.txt → Ingest → Duyệt & sửa →
      Study → SRS vẫn hoạt động như trước; **schema câu của AI Ingest không đổi**.
- [ ] **Build/Type:** `npx tsc --noEmit` sạch; build dự án thành công; unit test của
      `audioMapping` pass.
