# GSD Phase 3 — Học + Chọn từ thông minh + Flashcard

> Phase này hiện thực hóa **F3 — Học & sentence mining** (MVP): thuật toán "từ
> đáng học" (i+1 + tần suất), trang `/study` đọc câu có furigana, `WordPopup`
> tra nghĩa tức thì từ `tokens` (không gọi API), `lib/tts` phát âm Web Speech
> theo `reading` kana, và lưu thẻ (note + cards) theo loại thẻ đang bật.
>
> Căn cứ: [docs/08-smart-word-selection.md](../docs/08-smart-word-selection.md),
> [docs/09-flashcard-types.md](../docs/09-flashcard-types.md),
> [docs/04-features.md](../docs/04-features.md) (F3, F8),
> [docs/03-data-model.md](../docs/03-data-model.md),
> [docs/05-design-system.md](../docs/05-design-system.md),
> [docs/07-user-journey.md](../docs/07-user-journey.md),
> [docs/02-architecture.md](../docs/02-architecture.md).

---

## Mục tiêu

Hoàn thành **F3 (Học & sentence mining)** mức MVP với 6 khối chức năng cốt lõi
(và 2 việc bổ trợ MVP: Cài đặt loại thẻ + Onboarding JLPT — xem cuối mục):

1. **Thuật toán "từ đáng học"** (`lib/study/word-selection.ts`): theo đúng 3 bước
   ở `08-smart-word-selection.md` — B1 giữ `worthLearning = true`; B2 bỏ từ đã
   biết (`user_words.status = 'known'`); B3 xếp hạng theo **tần suất lemma trong
   nội dung của user** + (tùy chọn) JLPT; **đánh dấu câu i+1** (câu chỉ chứa
   đúng 1 từ lạ). Trả về danh sách "N từ đáng học" + cờ i+1 cho từng câu.
2. **Bảng `user_words`** (`new` | `learning` | `known`) + repository: lưu vốn từ
   của user, index `user_words(user_id, word)` cho i+1; cập nhật khi lưu thẻ
   (`learning`) và khi Đã biết/Bỏ qua (`known`).
3. **Trang `/study`**: render từng câu qua `SentenceView` (furigana từ `tokens`),
   highlight câu i+1, hiển thị khối "Gợi ý N từ đáng học", click từ mở `WordPopup`.
4. **`WordPopup`**: hiện từ / cách đọc / loại từ / **nghĩa Việt** đọc thẳng từ
   `tokens` (KHÔNG gọi API), nút 🔊 (TTS), nút **Lưu thẻ** và **Đã biết / Bỏ qua**.
5. **`lib/tts`** (Web Speech API): `speak(text, { lang: 'ja-JP' })`, đọc từ theo
   `reading` (kana), đọc câu nguyên văn; bọc sau interface để GĐ sau nâng cloud.
6. **Lưu note + cards theo loại thẻ đang bật**: tạo 1 `note` + N `cards` cho các
   loại trong `user_settings.enabled_card_types` (fallback `app_settings.
   default_card_types`); ghi `notes.meaning` chốt nghĩa; cập nhật `user_words`.

Ngoài 6 khối trên, phase này **bổ sung 2 việc liền mạch với F3** (đều là MVP theo
`04`): (7) **Trang Cài đặt `/settings`** để user bật/tắt `enabled_card_types` +
`sound_enabled` (`04` "Bật/tắt loại thẻ trong cài đặt" = MVP; `09 §4`) — nếu không
có nơi này thì Phase 3 chỉ ĐỌC `enabled_card_types` mà user không bao giờ đổi được,
tính năng MVP bị bỏ; (8) **Onboarding chọn JLPT (cold start)** ghi
`user_settings.jlpt_level` + seed `user_words` — nếu không có thì nhánh A của thuật
toán i+1 (`08 §3`) không bao giờ chạy (xem QĐ-11, QĐ-12).

**Không thuộc phase này (ranh giới rõ):** ôn tập SRS/`/review` & `fsrs_state` đầy
đủ (F4), gamification XP/streak/confetti (F5), Admin sửa app_settings (F8),
audio/Whisper (GĐ2), AI giải thích ngữ pháp (GĐ2). (Onboarding JLPT **được** xây
ở mức tối thiểu trong phase này — xem QĐ-12 — chứ không còn "chỉ ĐỌC".)

---

## Phụ thuộc

Phase này phụ thuộc **[1, 2]** và phải hoàn thành các phase đó trước:

| Phụ thuộc | Phải có sẵn | Vì sao |
|-----------|-------------|--------|
| **Phase 1** (nền tảng hạ tầng) | `lib/db` (Drizzle + postgres.js), `lib/config` (đọc `app_settings`), `lib/auth.ts` (session Auth.js + `currentUser`), tầng `lib/repositories` + quy ước lọc `user_id`, design system (Nunito, color tokens, `.btn-3d`, `.wl-card`, `.wl-input`, `SentenceView` skeleton nếu có), shadcn/ui. | `/study` cần session để biết `userId`; mọi repository lọc theo `user_id`; UI phải dùng bộ class chuẩn; `lib/config` cung cấp `default_card_types`. |
| **Phase 2** (Import + AI Ingest + Duyệt/sửa) | `sources` + `sentences` (với `tokens` jsonb đầy đủ `surface/reading/lemma/pos/meaning_vi/worthLearning`), repository `sources.ts` (đọc sentences theo source/user), luồng F2 → F2.5 đã ghi DB. | `/study` đọc trực tiếp `sentences.tokens` để render furigana + tra nghĩa tức thì; thuật toán "từ đáng học" chạy trên `tokens` đã có `worthLearning`. Không có dữ liệu này thì không có gì để học. |

> Vì popup tra nghĩa **không gọi API runtime** (quyết định kiến trúc), toàn bộ
> chất lượng dữ liệu `tokens` được "chốt" ở Phase 2. Phase 3 chỉ tiêu thụ.

---

## Quyết định triển khai (discuss-phase)

Các điểm "xám" trong docs đã được chốt như sau (bám `08`, `09`, `03`, `04`):

### QĐ-1 — Ngưỡng "N từ đáng học mỗi buổi" = lấy từ `app_settings`, mặc định 6
`08 §7` để mở câu hỏi "N nên là 5–10". Chốt: thêm key `suggested_words_per_source`
vào `app_settings` (type `number`, mặc định **6** — khớp ví dụ "6 từ đáng học"
trong `08 §2.1` và "5 từ" trong `07 Bước 4`). Đọc qua `lib/config` để Admin chỉnh
runtime sau, **không hard-code**. Khi số ứng viên > N, cắt theo thứ hạng B3.

### QĐ-2 — Tần suất tính **on-the-fly** ở MVP, KHÔNG dựng `user_word_freq`
`08 §5` và `03 §2` cho phép cache bảng `user_word_freq` "nếu cần tối ưu sau". Chốt:
MVP đếm `lemma` từ `tokens` của các `sentences` thuộc user **on-the-fly** trong
repository (1 truy vấn gom theo `user_id`), tránh thêm bảng + job đồng bộ sớm.
Để lại comment `TODO(perf)` chỗ tính tần suất để GĐ sau nâng cache.

### QĐ-3 — Định nghĩa i+1: dựa trên `worthLearning` làm proxy "từ lạ"
`08 §4` định nghĩa i+1 = câu chỉ chứa đúng 1 từ mới. Vì chưa có nhãn "đã biết
toàn bộ phần còn lại" tin cậy ở MVP, chốt cách tính cụ thể: với mỗi câu, đếm số
token thỏa **(worthLearning = true) AND (lemma KHÔNG ở user_words.known)**. Nếu
đếm == 1 → câu **i+1** (đánh dấu "vàng"). Từ lạ duy nhất đó được ưu tiên thứ hạng
cao nhất ở B3. Đây là xấp xỉ thực dụng, bám đúng tinh thần "đào từ trong câu i+1".

### QĐ-4 — Khóa chống lock-in cho TTS: interface `Speaker` + adapter Web Speech
`04 F8` + keyDecision yêu cầu bọc sau `lib/tts`. Chốt cấu trúc: `lib/tts/index.ts`
export `speak(text, opts)` + `cancel()` + `isSupported()`; bên trong gọi adapter
`webspeech.ts` dùng `window.speechSynthesis` + `SpeechSynthesisUtterance`
(`lang = 'ja-JP'`). **Đọc theo `reading` (kana) cho từ**, đọc nguyên `text` câu
cho câu. Đọc `app_settings.tts_provider` (mặc định `webspeech`) qua `lib/config`;
provider khác (`cloud`) để GĐ sau. Module là **client-only** (`'use client'`),
guard SSR bằng `isSupported()` (kiểm tra `typeof window !== 'undefined'`).

### QĐ-5 — "Lưu thẻ" sinh note + N cards trong **một** Server Action giao dịch
`09 §1-2` + `03` (note 1-nhiều cards). Chốt: 1 Server Action `saveWordAsCards`
chạy server-side, trong **một transaction**:
(a) upsert `notes` (`user_id, sentence_id, target_word, reading, meaning`);
(b) tạo `cards` cho mỗi loại trong `enabled_card_types` của user (fallback
`app_settings.default_card_types` = `["recognition","cloze"]`), mỗi card
`fsrs_state` khởi tạo bằng state "new" của ts-fsrs (hoặc `{}` rỗng chờ F4 nạp —
xem QĐ-7);
(c) upsert `user_words` (lemma → `learning`).
Idempotent: nếu note (cùng `user_id + sentence_id + target_word`) đã có thì
không tạo trùng; nếu thiếu card-type đang bật thì bổ sung. **Cloze chỉ tạo khi
từ đích nằm trong câu** (`09 §5` — luôn đúng vì đào từ chính câu đó, vẫn assert
để an toàn).

### QĐ-6 — "Đã biết / Bỏ qua" chỉ ghi `user_words = known`, KHÔNG tạo thẻ
`08 §2.1` + `04 F3.5`. Chốt: nút "Đã biết / Bỏ qua" gọi Server Action
`markWordKnown` → upsert `user_words(lemma) = 'known'`. Từ đó sẽ bị B2 loại khỏi
gợi ý lần sau ("app học dần"). Không đụng `notes/cards`.

### QĐ-7 — `fsrs_state` khởi tạo bằng ts-fsrs `createEmptyCard()`, due = now
`03` lưu `fsrs_state jsonb`. F4 (SRS) chưa thuộc phase này, nhưng card mới phải có
state hợp lệ để F4 lấy được. Chốt: dùng `ts-fsrs` `createEmptyCard(new Date())`
sinh state ban đầu (đã có `due`, `stability`, `difficulty`, `state = New`), lưu
nguyên vào `cards.fsrs_state`. Việc chấm/đặt lịch để F4. (Chỉ import ts-fsrs ở
server; không kéo logic ôn vào phase này.)

### QĐ-8 — Render furigana bằng `<ruby>` HTML thuần (ruby text), font Noto Sans JP
`05 §3` yêu cầu furigana ruby text + fallback Noto Sans JP. Chốt: `SentenceView`
render mỗi token có `reading` khác `surface` bằng `<ruby>{surface}<rt>{reading}</rt></ruby>`;
token chỉ-kana/dấu câu render thường. Không thêm thư viện ruby ngoài. Token là
đơn vị **click được** (mở `WordPopup`); chỉ token `worthLearning` mới có affordance
nổi bật (gạch chân nhạt), nhưng **mọi** token vẫn click tra được nghĩa.

### QĐ-9 — Đánh dấu trạng thái từ trên câu đọc từ `user_words`
`04 F3.6`. Chốt: `/study` nạp sẵn map `lemma → status` từ `user_words` của user;
`SentenceView`/`WordPopup` tô dấu token: `learning` (đã lưu thẻ) = badge xanh,
`known` (đã biết/bỏ) = badge xám mờ. Khối "Gợi ý N từ" đã loại các `known`.

### QĐ-10 — `/study` lấy `sourceId` qua query param, bảo vệ bằng session + lọc user
`07 Bước 4` mở source cụ thể để học. Chốt: route `/study?source=<id>`; Server
Component đọc `sourceId`, verify `currentUser`, gọi repository
`getSourceForStudy(userId, sourceId)` (đã lọc `user_id`); nếu source không thuộc
user → 404/redirect. Không truyền dữ liệu user khác.

### QĐ-11 — Trang `/settings` ghi `user_settings`; tắt loại đang có thẻ → suspend (xác nhận)
`04` ("Bật/tắt loại thẻ trong cài đặt" = MVP) + `09 §4-5`. Chốt: thêm route
`/settings` (Server Component verify `currentUser`) cho phép user bật/tắt từng loại
trong `enabled_card_types` (`recognition`/`cloze`/`production`/`reading`) và
`sound_enabled`. Server Action `updateUserSettings` (`'use server'`,
transaction): upsert `user_settings(user_id, enabled_card_types, sound_enabled)`
— tạo dòng theo `app_settings.default_card_types` nếu user chưa có. Theo `09 §5`
("tắt loại đang có thẻ → ẩn khỏi hàng đợi, không xóa, *cần xác nhận*"): khi user
**tắt** một loại mà đã tồn tại `cards type = loại đó`, UI **hỏi xác nhận** trước;
xác nhận → set `cards.suspended = true` cho các card loại đó (KHÔNG xóa, giữ tiến
độ); **bật lại** → `suspended = false`. `sound_enabled` chỉ ghi cờ (TTS/Howler ở
F4 đọc cờ này). Đọc `enabled_card_types` qua repository `settings` (đã dùng ở QĐ-5)
để `/study` + `saveWordAsCards` luôn nhất quán với màn Cài đặt.

### QĐ-12 — Onboarding JLPT (cold start): xây tối thiểu, seed `user_words` nhánh A
`08 §3` (cách A) + `08 §7` (câu hỏi mở) + roadmap Sprint 3 ("(Tùy chọn) onboarding
chọn trình độ JLPT"). Vấn đề: phase này ĐỌC `user_settings.jlpt_level` cho nhánh A
của thuật toán, nhưng nếu **không phase nào ghi** thì `jlpt_level` luôn rỗng →
nhánh A không bao giờ chạy ("rơi giữa khe"). Chốt **giải pháp A+B** (đúng khuyến
nghị `08 §3`): xây 1 bước onboarding **tối thiểu** trong phase này —
- Khi user mới chưa có `user_settings.jlpt_level`, hiện 1 bước chọn nhanh
  N5/N4/N3/N2/N1 + lựa chọn "Bỏ qua / Tôi không chắc" (nhẹ, 1 chạm).
- Server Action `setJlptLevel(level)` ghi `user_settings.jlpt_level` và **seed**
  `user_words` cho các từ ở/dưới trình độ đã chọn = `'known'` (nhánh A: dùng danh
  sách JLPT tĩnh đóng gói trong repo `lib/study/jlpt-seed.ts`, KHÔNG gọi API).
- Nếu user "Bỏ qua" → không seed; thuật toán rơi về **nhánh B (học dần)** như cũ —
  vẫn chạy đúng (tần suất + bỏ từ đã biết qua thời gian).

> Hệ quả: nhánh A (`jlptLevel` trong `selectWorthLearning`) trở nên **dùng được
> thật**. Nếu sau này muốn cắt phạm vi, lựa chọn thay thế là **bỏ hẳn tham số
> `jlptLevel`** khỏi `selectWorthLearning` + chỉ giữ nhánh B; phase này chọn **giữ
> A+B** vì chi phí thấp (1 trang nhỏ + 1 danh sách tĩnh) và đúng tinh thần `08`.

---

## Kế hoạch task nguyên tử (plan-phase)

> Mỗi task nhỏ, độc lập, commit riêng. Đường dẫn theo cấu trúc `02-architecture.md`.
> Quy ước: mọi repository **luôn** lọc `where user_id = currentUser`; UI dùng bộ
> class chuẩn (`.btn-3d` + biến thể, `.wl-card`...). Lệnh dự án giả định
> `npm run typecheck`, `npm run lint`, `npm run dev` đã có từ Phase 1.

<task type="auto">
  <name>Schema user_words + index</name>
  <files>lib/db/schema.ts, drizzle/ (migration sinh ra)</files>
  <action>Trong lib/db/schema.ts thêm (nếu chưa có) bảng userWords: cột userId (uuid, FK users.id, notNull), word (text, notNull — lưu lemma), status (enum/text: 'new'|'learning'|'known', default 'new'). Đặt PRIMARY KEY hỗn hợp (userId, word) hoặc unique (userId, word) để upsert. Thêm index userWordsUserWordIdx trên (userId, word) đúng gợi ý 03 §5. Khai báo enum pg enum userWordStatus nếu schema dùng enum. Chạy drizzle-kit generate để sinh migration vào drizzle/.</action>
  <verify>npx drizzle-kit generate chạy không lỗi; mở file migration mới trong drizzle/ thấy CREATE TABLE user_words + index (userId, word) + ràng buộc unique; npm run typecheck pass.</verify>
  <done>Bảng user_words + unique(userId, word) + index có trong schema.ts và 1 migration mới trong drizzle/; typecheck xanh.</done>
</task>

<task type="auto">
  <name>Áp migration user_words vào DB</name>
  <files>drizzle/ (migration), scripts/db (nếu có script migrate)</files>
  <action>Chạy lệnh migrate của dự án (drizzle-kit migrate hoặc script npm run db:migrate đã có) áp migration user_words lên PostgreSQL tự host qua DATABASE_URL. Không tạo cơ chế mới — dùng đúng pipeline migration Phase 1.</action>
  <verify>psql "$DATABASE_URL" -c "\d user_words" liệt kê cột user_id, word, status + index (user_id, word); chèn thử 1 dòng rồi xóa thành công.</verify>
  <done>Bảng user_words tồn tại thật trong DB với cột + index đúng; truy vấn \d trả schema mong đợi.</done>
</task>

<task type="auto">
  <name>Repository user_words</name>
  <files>lib/repositories/userWords.ts</files>
  <action>Tạo lib/repositories/userWords.ts với các hàm (đều nhận userId là tham số ĐẦU, luôn lọc/ghi theo user_id): getStatusMap(userId): Promise&lt;Map&lt;string,'new'|'learning'|'known'&gt;&gt; (gom toàn bộ user_words của user thành map lemma→status); getKnownLemmas(userId): Promise&lt;Set&lt;string&gt;&gt;; upsertStatus(userId, word, status): upsert (onConflict (userId, word) do update status); markKnown(userId, word) = upsertStatus(...,'known'); markLearning(userId, word) = upsertStatus(...,'learning'). Dùng Drizzle qua lib/db. Không gọi từ Client Component.</action>
  <verify>npm run typecheck pass; viết 1 test nhỏ (hoặc node script tạm) gọi upsertStatus 2 lần cùng (userId, word) → chỉ 1 dòng, status cập nhật lần sau; getStatusMap trả đúng.</verify>
  <done>File userWords.ts export đủ 5 hàm, upsert idempotent theo (userId, word), typecheck xanh.</done>
</task>

<task type="auto">
  <name>Repository tần suất lemma (on-the-fly)</name>
  <files>lib/repositories/wordFreq.ts</files>
  <action>Tạo lib/repositories/wordFreq.ts hàm getLemmaFrequency(userId): Promise&lt;Map&lt;string, number&gt;&gt; — đếm số lần xuất hiện mỗi lemma trong tokens (jsonb) của tất cả sentences thuộc các sources của user (join sources.user_id = userId, bỏ sentences.skipped = true). Có thể đọc tokens rồi đếm ở JS, hoặc dùng jsonb_array_elements + GROUP BY ở SQL — chọn 1, giữ trong repository. Thêm comment TODO(perf): cache user_word_freq ở GĐ sau (theo QĐ-2). Lọc đúng user_id ở mọi join.</action>
  <verify>npm run typecheck pass; với 1 source seed có lemma lặp, getLemmaFrequency trả count đúng cho ≥2 lemma; câu skipped=true không được đếm.</verify>
  <done>getLemmaFrequency trả Map lemma→count đúng, loại câu skipped, lọc theo user_id; có TODO(perf).</done>
</task>

<task type="auto">
  <name>Thuật toán chọn từ đáng học + i+1</name>
  <files>lib/study/word-selection.ts</files>
  <action>Tạo lib/study/word-selection.ts thuần (không I/O) với:
  - type Token = { surface; reading; lemma; pos; meaning_vi; worthLearning }.
  - type SuggestedWord = { lemma; surface; reading; meaning_vi; pos; freq; sentenceId; isPlusOne }.
  - selectWorthLearning(params: { sentences: {id; tokens: Token[]}[]; knownLemmas: Set&lt;string&gt;; freq: Map&lt;string,number&gt;; limit: number; jlptLevel?: string }): { suggestions: SuggestedWord[]; plusOneSentenceIds: Set&lt;string&gt; }.
  Logic đúng 08 §2: B1 giữ token worthLearning=true; B2 bỏ token có lemma trong knownLemmas; B3 xếp hạng giảm dần theo freq (tie-break: từ thuộc câu i+1 ưu tiên trước, rồi theo thứ tự xuất hiện); gom theo lemma (mỗi lemma 1 mục, giữ câu đầu tiên gặp); cắt còn limit. Tính i+1 theo QĐ-3: với mỗi câu đếm token (worthLearning && !known); ==1 → thêm sentenceId vào plusOneSentenceIds và đặt isPlusOne cho từ lạ đó. Pure function, không gọi DB/API.</action>
  <verify>Viết test (vitest/jest theo cấu hình Phase 1) lib/study/word-selection.test.ts: (1) câu có 1 từ worthLearning chưa biết → đánh i+1; (2) từ known bị loại; (3) limit cắt đúng N; (4) lemma trùng gộp 1 mục. npm test chạy xanh.</verify>
  <done>Hàm pure trả suggestions đã lọc/xếp hạng + plusOneSentenceIds đúng theo 4 ca test; không phụ thuộc DB.</done>
</task>

<task type="auto">
  <name>Repository study: nạp dữ liệu cho trang học</name>
  <files>lib/repositories/study.ts</files>
  <action>Tạo lib/repositories/study.ts hàm getSourceForStudy(userId, sourceId): trả { source: {id,title,type}, sentences: {id, original, text, confidence, tokens, skipped}[] } CHỈ khi sources.user_id = userId (nếu không thuộc user → trả null). Sắp xếp sentences theo thứ tự gốc, loại skipped=true khỏi danh sách học (hoặc trả kèm cờ để UI ẩn). Tái sử dụng repository sources Phase 2 nếu đã có hàm tương đương — không nhân đôi logic. Không trả dữ liệu user khác.</action>
  <verify>npm run typecheck pass; gọi với (userA, sourceCủaB) → null; với (userA, sourceCủaA) → trả sentences kèm tokens.</verify>
  <done>getSourceForStudy lọc đúng user_id, trả null khi không thuộc user, kèm tokens; typecheck xanh.</done>
</task>

<task type="auto">
  <name>lib/tts — interface + adapter Web Speech</name>
  <files>lib/tts/index.ts, lib/tts/webspeech.ts</files>
  <action>Theo QĐ-4. lib/tts/index.ts (client-only, thêm 'use client' ở chỗ dùng): export type SpeakOptions = { lang?: string; rate?: number }; export function isSupported(): boolean (typeof window!=='undefined' && 'speechSynthesis' in window); export function speak(text: string, opts?: SpeakOptions): void; export function cancel(): void. index.ts chọn adapter theo provider (mặc định 'webspeech'); webspeech.ts cài đặt: tạo SpeechSynthesisUtterance(text), set u.lang = opts.lang ?? 'ja-JP', rate hợp lý (~0.95), gọi window.speechSynthesis.cancel() trước rồi speak(u). Guard SSR: nếu !isSupported() thì no-op. Thêm helper speakWord(reading) (đọc kana) và speakSentence(text). KHÔNG đọc app_settings ở client trực tiếp — provider truyền vào từ server qua prop nếu cần (MVP cứng webspeech).</action>
  <verify>npm run typecheck pass; npm run dev mở trang test tạm gọi speak('こんにちは') có phát âm trên trình duyệt; isSupported() trả false khi render server (no crash).</verify>
  <done>lib/tts export speak/cancel/isSupported/speakWord/speakSentence; không crash SSR; phát âm ja-JP trên trình duyệt.</done>
</task>

<task type="auto">
  <name>Seed app_settings: suggested_words_per_source</name>
  <files>lib/config.ts (hoặc lib/config/defaults), scripts seed app_settings</files>
  <action>Theo QĐ-1. Thêm key suggested_words_per_source vào danh sách seed/fallback của lib/config: type 'number', value mặc định 6, description "Số từ đáng học gợi ý tối đa mỗi tài liệu". Đảm bảo lib/config.get('suggested_words_per_source') trả 6 khi DB thiếu key (fallback). Nếu Phase 1 có script seed app_settings thì bổ sung key này; nếu không, chỉ cần fallback trong config defaults.</action>
  <verify>npm run typecheck pass; gọi lib/config getter cho key này (DB rỗng) trả 6; nếu set DB =8 thì trả 8.</verify>
  <done>Key suggested_words_per_source có default 6, đọc qua lib/config với fallback; typecheck xanh.</done>
</task>

<task type="auto">
  <name>WordPopup component</name>
  <files>components/WordPopup.tsx</files>
  <action>Tạo components/WordPopup.tsx ('use client'). Props: { token: Token; sentenceId: string; status?: 'new'|'learning'|'known'; onSaved?: ()=&gt;void; onMarkedKnown?: ()=&gt;void; onClose?: ()=&gt;void }. Hiển thị trong .wl-card: surface lớn + (reading) cách đọc; dòng "Nghĩa:" = token.meaning_vi; dòng "Loại:" = token.pos. ĐỌC THẲNG từ token, KHÔNG gọi API. Nút 🔊 (lucide Volume2) gọi lib/tts.speakWord(token.reading || token.surface). Hai nút .btn-3d: "Lưu thẻ" (.btn-primary, lucide Plus) và "Đã biết / Bỏ qua" (.btn-neutral). Khi status='learning' đổi nút Lưu thành nhãn "Đã lưu" (badge .wl-badge). Hai nút gọi Server Action saveWordAsCards / markWordKnown (task sau) qua callback truyền từ /study; dùng useTransition để disable khi đang chạy. A11y: đóng bằng Esc, focus trap nhẹ.</action>
  <verify>npm run typecheck + lint pass; mở /study (sau khi có trang), click 1 từ → popup hiện nghĩa/reading/pos đúng từ tokens; nút 🔊 phát âm; không có network request tra nghĩa (check DevTools Network).</verify>
  <done>WordPopup hiển thị nghĩa từ tokens tức thì (0 request API), có 🔊 + 2 nút hành động, đổi trạng thái khi đã lưu.</done>
</task>

<task type="auto">
  <name>SentenceView render furigana + i+1 + click từ</name>
  <files>components/SentenceView.tsx</files>
  <action>Tạo/hoàn thiện components/SentenceView.tsx ('use client'). Props: { sentence: { id; text; tokens: Token[]; confidence?: 'high'|'medium'|'low' }; isPlusOne?: boolean; statusMap: Map&lt;string,'new'|'learning'|'known'&gt;; onSelectToken: (token: Token, sentenceId: string)=&gt;void }. Render câu: lặp tokens, mỗi token nếu reading khác surface và chứa kanji → <ruby>{surface}<rt>{reading}</rt></ruby> (QĐ-8), font Noto Sans JP fallback; mỗi token là <button> click được gọi onSelectToken. Token worthLearning có gạch chân nhạt; token lemma status 'learning' → badge xanh nhạt, 'known' → xám mờ (QĐ-9). Nếu isPlusOne → bọc câu trong nền vàng nhạt (câu "vàng") + nhãn nhỏ "i+1". Câu confidence='low' viền cảnh báo nhẹ (tái dùng style từ F2.5 nếu có). prefers-reduced-motion tôn trọng.</action>
  <verify>npm run typecheck + lint pass; câu có kanji hiện furigana ruby phía trên; click token gọi callback; câu i+1 nền vàng + nhãn; từ learning/known có badge.</verify>
  <done>SentenceView hiện furigana ruby, đánh dấu i+1 vàng, badge trạng thái từ, mọi token click được; typecheck/lint xanh.</done>
</task>

<task type="auto">
  <name>Server Action saveWordAsCards (note + N cards + user_words)</name>
  <files>app/study/actions.ts, lib/repositories/cards.ts, lib/repositories/notes.ts</files>
  <action>Theo QĐ-5 + QĐ-7. Tạo Server Action saveWordAsCards (app/study/actions.ts, 'use server'): lấy currentUser từ lib/auth; input { sentenceId, token: {surface, reading, lemma, pos, meaning_vi} }. Trong 1 transaction (lib/db): (a) đọc enabled_card_types của user qua repository settings (fallback app_settings.default_card_types = ["recognition","cloze"] qua lib/config); (b) upsert notes (user_id, sentence_id, target_word=surface, reading, meaning=meaning_vi) — idempotent theo (user_id, sentence_id, target_word); lib/repositories/notes.ts cung cấp upsertNote; (c) cho mỗi type đang bật chưa có card thì tạo card (note_id, user_id, type, fsrs_state = ts-fsrs createEmptyCard(new Date()), suspended=false); lib/repositories/cards.ts cung cấp createCardsForNote(userId, noteId, types). Bỏ qua type 'cloze' nếu surface không nằm trong sentence.text (assert QĐ-5, log cảnh báo); (d) userWords.markLearning(userId, lemma). revalidate trang /study. Trả { ok, noteId, createdTypes }.</action>
  <verify>npm run typecheck pass; lưu 1 từ với enabled=["recognition","cloze"] → DB có 1 note + 2 cards (mỗi card fsrs_state có due) + user_words(lemma)='learning'; gọi lại cùng từ KHÔNG tạo trùng; ts-fsrs import chỉ ở server.</verify>
  <done>saveWordAsCards tạo đúng 1 note + N cards theo loại bật, fsrs_state hợp lệ, user_words=learning, idempotent; chạy server-side.</done>
</task>

<task type="auto">
  <name>Server Action markWordKnown</name>
  <files>app/study/actions.ts</files>
  <action>Theo QĐ-6. Thêm Server Action markWordKnown (cùng file actions.ts, 'use server'): lấy currentUser; input { lemma }. Gọi userWords.markKnown(userId, lemma). KHÔNG tạo note/card. revalidate /study. Trả { ok }.</action>
  <verify>npm run typecheck pass; gọi markWordKnown → user_words(lemma)='known'; không có note/card mới; từ đó biến mất khỏi gợi ý lần render sau.</verify>
  <done>markWordKnown ghi user_words='known', không tạo thẻ, idempotent.</done>
</task>

<task type="auto">
  <name>Khối "Gợi ý N từ đáng học"</name>
  <files>components/SuggestedWords.tsx</files>
  <action>Tạo components/SuggestedWords.tsx ('use client'). Props: { suggestions: SuggestedWord[]; onSaveAll: ()=&gt;void; onToggleSkip: (lemma)=&gt;void; statusMap }. UI theo 07 Bước 4 / 08 §2.1 trong .wl-card: tiêu đề "✨ Buổi họp này có {n} từ đáng học cho bạn:"; danh sách chip .wl-chip mỗi từ (surface + reading nhỏ), chạm chip để bỏ (đánh known qua onToggleSkip, chuyển .wl-chip-off mờ); nút "✓ Lưu tất cả" .btn-3d .btn-primary gọi onSaveAll (lặp saveWordAsCards cho các từ còn giữ). Hiển thị cảnh báo nhẹ nếu enabled_card_types ≥3: "Bật 3 loại = mỗi từ thành 3 thẻ ôn" (09 §4). useTransition cho trạng thái đang lưu.</action>
  <verify>npm run typecheck + lint pass; khối hiện đúng N từ; chạm 1 từ → mờ + gọi markWordKnown; "Lưu tất cả" tạo thẻ cho các từ còn giữ.</verify>
  <done>SuggestedWords hiện N từ, toggle bỏ (known), Lưu tất cả tạo thẻ; cảnh báo quá tải khi ≥3 loại.</done>
</task>

<task type="auto">
  <name>Trang /study (Server Component + client wiring)</name>
  <files>app/study/page.tsx, app/study/StudyClient.tsx</files>
  <action>Theo QĐ-10. app/study/page.tsx (Server Component): đọc searchParams.source; verify currentUser (lib/auth) — chưa đăng nhập → redirect /login; gọi getSourceForStudy(userId, sourceId) — null → notFound(); nạp song song knownLemmas + statusMap (userWords) + freq (wordFreq) + suggested_words_per_source (lib/config) + jlptLevel (user_settings); chạy selectWorthLearning để có suggestions + plusOneSentenceIds. Truyền tất cả xuống app/study/StudyClient.tsx ('use client'): hiển thị header (tiêu đề source, "câu i/N"), SuggestedWords ở trên, danh sách SentenceView (đánh dấu câu i+1), điều khiển Câu trước/Câu tiếp; quản lý state token đang chọn → mở WordPopup; nối callback popup/suggested vào Server Actions saveWordAsCards & markWordKnown; cập nhật statusMap lạc quan sau khi lưu. Dùng bộ class chuẩn + Motion fade chuyển câu (tôn trọng reduced-motion).</action>
  <verify>npm run dev; mở /study?source=&lt;id thật của user&gt; → thấy câu có furigana, khối gợi ý N từ, câu i+1 nền vàng; click từ → popup nghĩa tức thì + 🔊; Lưu thẻ → DB có note+cards, từ đổi badge learning; mở /study?source=&lt;id user khác&gt; → 404. Network: 0 request tra nghĩa.</verify>
  <done>/study render đầy đủ (furigana, gợi ý, i+1, popup, lưu thẻ, đã biết), bảo vệ theo user, không gọi API tra nghĩa.</done>
</task>

<task type="auto">
  <name>Liên kết Thư viện → /study (entry point)</name>
  <files>app/(thư viện/dashboard nơi liệt kê source).tsx hoặc components liên quan</files>
  <action>Thêm liên kết "Tiếp tục/Bắt đầu" từ danh sách source (Thư viện/Dashboard theo 07 Bước 3) trỏ tới /study?source=&lt;sourceId&gt;. Nếu Phase 2 đã có nút chuyển sang study sau Duyệt & sửa, đảm bảo nó dùng đúng query param ?source=. Chỉ chỉnh tối thiểu để mở được /study; không xây lại Thư viện.</action>
  <verify>npm run dev; từ trang liệt kê source bấm "Tiếp tục" → điều hướng đúng /study?source=&lt;id&gt; và trang học hiện đúng tài liệu đó.</verify>
  <done>Có ít nhất 1 entry point điều hướng tới /study?source=&lt;id&gt; hoạt động.</done>
</task>

<task type="auto">
  <name>Repository user_settings (đọc/ghi loại thẻ + âm thanh + jlpt)</name>
  <files>lib/repositories/settings.ts, lib/db/schema.ts (nếu user_settings chưa có), drizzle/ (migration nếu cần)</files>
  <action>Theo QĐ-11 + QĐ-12 + 03 §4 (bảng user_settings). Nếu Phase 1/2 đã có bảng user_settings (cột user_id PK, enabled_card_types jsonb, sound_enabled bool, jlpt_level text?) và repository tương ứng thì TÁI SỬ DỤNG, chỉ bổ sung hàm thiếu — không nhân đôi. Nếu chưa có: thêm bảng user_settings vào schema.ts + sinh migration (drizzle-kit generate) + áp migration (pipeline Phase 1). Tạo/bổ sung lib/repositories/settings.ts (mọi hàm nhận userId đầu, lọc/ghi theo user_id): getUserSettings(userId): trả { enabledCardTypes, soundEnabled, jlptLevel } — nếu chưa có dòng thì trả default từ app_settings.default_card_types (qua lib/config) + soundEnabled=true + jlptLevel=null; getEnabledCardTypes(userId) (dùng lại bởi QĐ-5 saveWordAsCards & /study); updateUserSettings(userId, { enabledCardTypes?, soundEnabled? }): upsert (onConflict user_id do update); setJlptLevel(userId, level): upsert jlpt_level. Không gọi từ Client Component.</action>
  <verify>npm run typecheck pass; getUserSettings cho user chưa có dòng trả default (enabledCardTypes = app_settings.default_card_types, soundEnabled=true, jlptLevel=null); updateUserSettings 2 lần cùng userId → 1 dòng, giá trị cập nhật lần sau; getEnabledCardTypes khớp với updateUserSettings.</verify>
  <done>settings.ts export getUserSettings/getEnabledCardTypes/updateUserSettings/setJlptLevel, upsert idempotent theo user_id, fallback default đúng; bảng user_settings tồn tại trong DB; typecheck xanh.</done>
</task>

<task type="auto">
  <name>Trang /settings + Server Action updateUserSettings (bật/tắt loại thẻ + âm thanh)</name>
  <files>app/settings/page.tsx, app/settings/SettingsClient.tsx, app/settings/actions.ts</files>
  <action>Theo QĐ-11 (04 "Bật/tắt loại thẻ trong cài đặt" = MVP; 09 §4-5). app/settings/page.tsx (Server Component): verify currentUser (lib/auth) — chưa đăng nhập → redirect /login; gọi getUserSettings(userId); đồng thời nạp số card hiện có theo từng type (repository cards: countCardsByType(userId) → Map type→count) để biết loại nào "đang có thẻ". Truyền xuống app/settings/SettingsClient.tsx ('use client'): trong .wl-card, mỗi loại thẻ (recognition/cloze/production/reading) 1 toggle (shadcn Switch); toggle sound_enabled. Cảnh báo quá tải khi bật ≥3 loại "Bật 3 loại = mỗi từ thành 3 thẻ ôn" (09 §4). Khi user TẮT một loại mà countCardsByType[type] > 0 → mở Dialog xác nhận (09 §5: "ẩn khỏi hàng đợi, không xóa") trước khi áp dụng; xác nhận → gọi Server Action. app/settings/actions.ts ('use server') updateUserSettings: lấy currentUser; input { enabledCardTypes: string[]; soundEnabled: boolean }; trong 1 transaction: (a) repository settings.updateUserSettings(userId, ...); (b) với mỗi loại VỪA TẮT → cards.setSuspendedByType(userId, type, true); với mỗi loại VỪA BẬT lại → setSuspendedByType(userId, type, false) (KHÔNG xóa card — giữ tiến độ, 09 §5); lib/repositories/cards.ts bổ sung setSuspendedByType(userId, type, suspended) + countCardsByType(userId). revalidate /settings và /study. Trả { ok, enabledCardTypes, soundEnabled }. useTransition để disable khi đang lưu. Thêm link tới /settings từ menu/header (tối thiểu).</action>
  <verify>npm run dev; mở /settings → thấy toggle 4 loại + âm thanh, phản ánh đúng user_settings; bật loại thứ 3 → hiện cảnh báo quá tải; tắt 1 loại đang có thẻ → Dialog xác nhận; xác nhận → user_settings.enabled_card_types cập nhật + cards loại đó suspended=true (KHÔNG bị xóa); bật lại → suspended=false; /study + saveWordAsCards sau đó dùng đúng enabled_card_types mới. Chưa đăng nhập → redirect /login.</verify>
  <done>/settings cho bật/tắt enabled_card_types + sound_enabled, ghi user_settings; tắt loại đang có thẻ phải xác nhận rồi suspend (không xóa), bật lại bỏ suspend; cảnh báo quá tải khi ≥3 loại; bảo vệ theo session.</done>
</task>

<task type="auto">
  <name>Onboarding JLPT (cold start) + seed user_words nhánh A</name>
  <files>app/onboarding/page.tsx, app/onboarding/OnboardingClient.tsx, app/onboarding/actions.ts, lib/study/jlpt-seed.ts</files>
  <action>Theo QĐ-12 (08 §3 cách A + A+B). Tạo lib/study/jlpt-seed.ts: danh sách JLPT TĨNH đóng gói trong repo (map level → lemma[] cho các từ phổ biến ở/dưới mức đó), KHÔNG gọi API; export getKnownLemmasForLevel(level): string[] (gộp từ mọi mức ≤ level). Tạo app/onboarding/page.tsx (Server Component): verify currentUser; nếu user_settings.jlpt_level đã có → redirect /dashboard (chỉ onboarding 1 lần). app/onboarding/OnboardingClient.tsx ('use client'): 1 bước nhẹ chọn N5/N4/N3/N2/N1 (chip/.btn-3d) + nút "Bỏ qua / Tôi không chắc" (08 §3). app/onboarding/actions.ts ('use server') setJlptLevel: lấy currentUser; input { level: 'N5'|'N4'|'N3'|'N2'|'N1'|null }; nếu level != null → settings.setJlptLevel(userId, level) + seed user_words: với mỗi lemma trong getKnownLemmasForLevel(level) gọi userWords.upsertStatus(userId, lemma, 'known') (batch, idempotent); nếu level == null (Bỏ qua) → KHÔNG seed (rơi về nhánh B). revalidate /study. Trả { ok }. Đảm bảo thuật toán selectWorthLearning vẫn nhận jlptLevel (đã có ở task word-selection) để nhánh A dùng được.</action>
  <verify>npm run dev; user mới chưa có jlpt_level → /onboarding hiện bước chọn; chọn N5 → user_settings.jlpt_level='N5' + user_words có các lemma N5 status='known'; mở /study → các từ N5 đã biết KHÔNG xuất hiện trong gợi ý (B2 loại); chọn "Bỏ qua" → không seed, gợi ý chạy theo tần suất (nhánh B); vào lại /onboarding khi đã có jlpt_level → redirect /dashboard.</verify>
  <done>Onboarding ghi user_settings.jlpt_level + seed user_words='known' theo level (nhánh A chạy được); "Bỏ qua" giữ nhánh B; chỉ onboarding 1 lần; không gọi API.</done>
</task>

<task type="auto">
  <name>Cập nhật STATE/ROADMAP cho F3</name>
  <files>STATE.md, ROADMAP.md</files>
  <action>Ghi vào STATE.md các artifact đã tạo trong phase (user_words + repo, lib/study/word-selection, lib/study/jlpt-seed, lib/tts, repository settings, WordPopup, SentenceView, SuggestedWords, /study, /settings, /onboarding, Server Actions saveWordAsCards/markWordKnown/updateUserSettings/setJlptLevel). Đánh dấu F3 (Học & sentence mining) = done trong ROADMAP.md (Phase 3), gồm cả "Bật/tắt loại thẻ trong cài đặt" và "(Tùy chọn) onboarding chọn trình độ JLPT" (Sprint 3). Không sửa code.</action>
  <verify>Mở STATE.md/ROADMAP.md thấy mục Phase 3 / F3 cập nhật đúng; git diff chỉ chạm 2 file md.</verify>
  <done>STATE.md liệt kê đủ artifact phase 3; ROADMAP.md đánh dấu F3 done.</done>
</task>

---

## Components tạo/đụng trong phase

| Component | File | Mục đích |
|-----------|------|----------|
| `SentenceView` | `components/SentenceView.tsx` | Render câu + furigana (`<ruby>`), đánh dấu câu **i+1** (nền vàng), badge trạng thái từ (`learning`/`known`), mỗi token click được mở popup. Đọc từ `tokens`, không gọi API. |
| `WordPopup` | `components/WordPopup.tsx` | Popup nghĩa từ: surface/reading/pos/`meaning_vi` đọc thẳng từ `tokens` (KHÔNG API) + nút 🔊 (TTS) + "Lưu thẻ" + "Đã biết / Bỏ qua". |
| `SuggestedWords` | `components/SuggestedWords.tsx` | Khối "✨ N từ đáng học cho bạn": chip từng từ, chạm để bỏ (→ `known`), "Lưu tất cả", cảnh báo quá tải khi bật ≥3 loại thẻ. |
| `StudyClient` | `app/study/StudyClient.tsx` | Vỏ client của `/study`: state câu hiện tại, token đang chọn, nối callback vào Server Actions, cập nhật lạc quan `statusMap`, Motion chuyển câu. |
| `SettingsClient` | `app/settings/SettingsClient.tsx` | Vỏ client của `/settings`: toggle 4 loại thẻ + `sound_enabled`, cảnh báo quá tải ≥3 loại, Dialog xác nhận khi tắt loại đang có thẻ (`09 §5`), gọi `updateUserSettings`. |
| `OnboardingClient` | `app/onboarding/OnboardingClient.tsx` | Vỏ client của `/onboarding`: chọn N5–N1 hoặc "Bỏ qua", gọi `setJlptLevel`. |
| `ui/` (shadcn) | `components/ui/` | Dialog/Popover nền cho `WordPopup`; Switch cho `/settings`; Dialog xác nhận tắt loại thẻ (tái dùng từ Phase 1). |

> Bộ class chuẩn bắt buộc: `.btn-3d` + biến thể (`.btn-primary`/`.btn-neutral`),
> `.wl-card`, `.wl-chip`/`.wl-chip-on`, `.wl-badge` — không tự chế bo góc/viền.

---

## Pages/Routes trong phase

| Route | Mô tả | Auth |
|-------|-------|------|
| `/study?source=<sourceId>` | Màn đọc & sentence mining: nạp `sentences.tokens` của source, render furigana, gợi ý N từ đáng học, đánh dấu i+1, click từ mở popup, lưu thẻ / đánh dấu đã biết. | **Bắt buộc đăng nhập**; Server Component verify `currentUser`, repository lọc `user_id`; source không thuộc user → `notFound()`. |
| Server Action `saveWordAsCards` | (trong `app/study/actions.ts`) tạo 1 `note` + N `cards` theo loại đang bật + `user_words = learning`, transaction, idempotent. | Server-side, lấy `currentUser` từ session; mọi ghi kèm `user_id`. |
| Server Action `markWordKnown` | (trong `app/study/actions.ts`) ghi `user_words = known`, không tạo thẻ. | Server-side, `currentUser`. |
| `/settings` | Trang Cài đặt: bật/tắt `enabled_card_types` (4 loại) + `sound_enabled`; cảnh báo quá tải khi ≥3 loại; tắt loại đang có thẻ → xác nhận rồi `suspend` (`09 §5`). | **Bắt buộc đăng nhập**; Server Component verify `currentUser`; ghi `user_settings` theo `user_id`. |
| Server Action `updateUserSettings` | (trong `app/settings/actions.ts`) upsert `user_settings(enabled_card_types, sound_enabled)`; loại vừa tắt → `cards.suspended = true`, loại bật lại → `false` (không xóa). | Server-side, `currentUser`. |
| `/onboarding` | Bước chọn JLPT (cold start) 1 lần: chọn N5–N1 hoặc "Bỏ qua". | **Bắt buộc đăng nhập**; đã có `jlpt_level` → redirect `/dashboard`. |
| Server Action `setJlptLevel` | (trong `app/onboarding/actions.ts`) ghi `user_settings.jlpt_level` + seed `user_words = known` theo level (nhánh A); "Bỏ qua" → không seed (nhánh B). | Server-side, `currentUser`. |

> Không tạo route API runtime để tra nghĩa (quyết định: nghĩa lấy từ `tokens`).
> Onboarding seed `user_words` từ **danh sách JLPT tĩnh** (`lib/study/jlpt-seed.ts`),
> KHÔNG gọi API.

---

## Tiêu chí hoàn thành Phase (verify-work)

Checklist nghiệm thu quan sát được (chạy `npm run dev`, dùng tài khoản có ≥1
`source` đã Ingest từ Phase 2):

- [ ] **Schema/DB**: `\d user_words` cho thấy cột `user_id, word, status` + unique/index `(user_id, word)`; migration đã áp.
- [ ] **Trang học**: mở `/study?source=<id của mình>` hiển thị từng câu với **furigana ruby** phía trên kanji (font Noto Sans JP), điều hướng Câu trước/Câu tiếp.
- [ ] **Gợi ý từ**: khối "✨ N từ đáng học cho bạn" hiển thị tối đa **N = `suggested_words_per_source`** (mặc định 6) từ, đã **loại từ `known`** và **xếp theo tần suất**.
- [ ] **i+1**: câu chỉ chứa đúng 1 từ lạ (worthLearning && !known) được **highlight nền vàng + nhãn i+1**.
- [ ] **Tra nghĩa tức thì**: click 1 từ mở `WordPopup` hiện `reading` + `meaning_vi` + `pos` **mà DevTools Network KHÔNG có request tra nghĩa nào** (đọc từ `tokens`).
- [ ] **TTS**: nút 🔊 trong popup đọc **theo `reading` (kana)** bằng Web Speech (`lang='ja-JP'`); không crash khi trình duyệt không hỗ trợ.
- [ ] **Lưu thẻ**: bấm "Lưu thẻ" với `enabled_card_types=["recognition","cloze"]` → DB có **1 `note` + 2 `cards`**, mỗi `cards.fsrs_state` có `due` hợp lệ (`createEmptyCard`), `notes.meaning` = nghĩa chốt; từ đổi sang badge **`learning`**; lưu lại **không tạo trùng**.
- [ ] **Cloze an toàn**: card `cloze` chỉ tạo khi `surface` nằm trong `sentence.text`.
- [ ] **Đã biết / Bỏ qua**: bấm → `user_words = known`, **không** tạo note/card, và từ **biến mất khỏi gợi ý** ở lần render sau ("app học dần").
- [ ] **Cảnh báo quá tải**: khi user bật ≥3 loại thẻ, UI hiện nhắc "Bật 3 loại = mỗi từ thành 3 thẻ ôn".
- [ ] **Cài đặt loại thẻ**: `/settings` cho bật/tắt `enabled_card_types` + `sound_enabled`, ghi `user_settings`; sau khi đổi, `/study` + "Lưu thẻ" tạo card đúng theo loại mới.
- [ ] **Tắt loại đang có thẻ (`09 §5`)**: tắt một loại đã có `cards` → UI **hỏi xác nhận**; xác nhận → các card loại đó `suspended = true` (**không bị xóa**); bật lại → `suspended = false`.
- [ ] **Onboarding JLPT (cold start)**: user mới chưa có `jlpt_level` thấy `/onboarding`; chọn 1 mức → `user_settings.jlpt_level` được ghi + `user_words` có lemma tương ứng = `known` → các từ đó **không** xuất hiện trong gợi ý (nhánh A); chọn "Bỏ qua" → không seed, gợi ý vẫn chạy theo tần suất (nhánh B); đã onboarding → vào lại `/onboarding` redirect.
- [ ] **Phân quyền**: mở `/study?source=<id của user khác>` → `notFound()`/redirect; `/settings` và `/onboarding` yêu cầu đăng nhập; không lộ dữ liệu user khác.
- [ ] **Chất lượng code**: `npm run typecheck`, `npm run lint`, `npm test` (test `word-selection`) đều xanh; mọi truy vấn repository kèm `user_id`; ts-fsrs chỉ import ở server.
- [ ] **STATE.md/ROADMAP.md** cập nhật: F3 đánh dấu done, artifact liệt kê.
