# 03 — Mô hình dữ liệu

> **PostgreSQL tự host** (không Supabase), truy vấn qua **Drizzle ORM**. Bảng
> auth do **Auth.js** quản lý.
> Toàn bộ phân tích (câu + token + furigana + nghĩa) do **AI Ingest (gpt-4o)** sinh
> 1 lượt và lưu trong `sentences.tokens`. Không dùng Kuromoji / từ điển ngoài / bảng cache riêng.

## 1. Sơ đồ quan hệ

```
┌─────────────┐
│   users     │  (Auth.js: users / accounts / sessions / verification_tokens)
└──────┬──────┘
       │
       ├───────────────┬────────────────┐
       │               │                │
┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
│  sources    │  │ user_words  │  │ user_stats  │
│ (nguồn nội  │  │ (vốn từ cho │  │ (XP, streak)│
│  dung)      │  │  i+1)       │  └─────────────┘
└──────┬──────┘  └─────────────┘
       │
┌──────▼──────┐
│  sentences  │  (câu tách từ source, giữ ngữ cảnh)
└──────┬──────┘
       │
┌──────▼──────┐
│   notes     │  (nội dung 1 từ đã đào — dùng chung)
└──────┬──────┘
       │ 1-nhiều (theo loại thẻ đang bật)
┌──────▼──────┐       ┌─────────────┐
│   cards     │◄──────┤   reviews   │  (log mỗi lần ôn — FSRS)
│ (theo type) │       └─────────────┘
└─────────────┘

(Không có bảng từ điển/cache riêng — phân tích nằm trong sentences.tokens)

Bảng toàn cục (không gắn user):
  app_settings  (key–value: cấu hình hệ thống, sửa qua Admin)
```

## 2. Chi tiết bảng

### `sources` — mỗi lần import nội dung
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | |
| type | enum | `chat` \| `meeting` \| `youtube` \| `text` |
| title | text | tên gợi nhớ |
| raw_content | text | nội dung gốc |
| audio_url | text? | link file audio (GĐ2) |
| created_at | timestamptz | |

### `sentences` — câu tách ra từ source
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | uuid (PK) | |
| source_id | uuid (FK → sources) | |
| original | text | câu gốc trước khi AI sửa (giữ để đối chiếu) |
| text | text | câu sau khi AI dọn lỗi (**sửa tay được** — xem [10](10-transcript-quality.md)) |
| corrected | bool | AI có chỉnh câu này không |
| note | text? | ghi chú AI sửa gì (vd "格認 → 確認") |
| confidence | text | AI ước lượng độ tin cậy: `high` \| `medium` \| `low` |
| tokens | jsonb | từ AI Ingest: `[{surface, reading, lemma, pos, meaning_vi, worthLearning}]` |
| skipped | bool | người dùng đánh dấu câu rác → không đào thẻ |
| translation | text? | bản dịch cả câu (tùy chọn) |
| audio_start | float? | timestamp trong audio (GĐ2, kiểu B) |

> `tokens` đã chứa **furigana + loại từ + nghĩa Việt** → màn Học/popup đọc trực
> tiếp, không gọi AI lại. Câu `confidence = low` được coi là "đáng ngờ" để highlight.

### `notes` — nội dung 1 từ đã đào (dùng chung cho mọi loại thẻ)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | |
| sentence_id | uuid (FK → sentences) | câu ngữ cảnh (từ buổi họp) |
| target_word | text | từ/cụm cần học (vd 確認) |
| reading | text | cách đọc (かくにん) |
| meaning | text | nghĩa tiếng Việt (chốt khi lưu) |
| created_at | timestamptz | |

### `cards` — mỗi loại thẻ của một note (lịch SRS riêng)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | uuid (PK) | |
| note_id | uuid (FK → notes) | thuộc note nào |
| user_id | uuid (FK → users) | (tiện lọc/truy vấn) |
| type | enum | `recognition` \| `cloze` \| `production` \| `reading` |
| fsrs_state | jsonb | trạng thái FSRS (due, stability, difficulty...) |
| suspended | bool | true nếu loại thẻ bị tắt (ẩn khỏi hàng đợi, không xóa) |
| created_at | timestamptz | |

> Một `note` (từ 確認) sinh nhiều `cards` theo **các loại đang bật** (xem
> [09-flashcard-types.md](09-flashcard-types.md)). Mỗi card ôn độc lập.

### `reviews` — log mỗi lần ôn
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | uuid (PK) | |
| card_id | uuid (FK → cards) | |
| rating | int | 1=Again, 2=Hard, 3=Good, 4=Easy |
| reviewed_at | timestamptz | |

### `user_words` — vốn từ đã biết (cho thuật toán i+1)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | uuid (FK → users) | |
| word | text | dạng từ điển (lemma) của từ |
| status | enum | `new` \| `learning` \| `known` |

### `user_stats` — gamification (1 dòng / user)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | uuid (FK → users, PK) | |
| xp | int | tổng điểm kinh nghiệm |
| streak | int | số ngày học liên tiếp |
| last_studied_date | date | ngày học gần nhất (tính streak) |

### Cấu trúc `tokens` (trong `sentences.tokens`)
Mỗi phần tử là một từ do AI Ingest sinh:
| Trường | Mô tả |
|--------|-------|
| surface | dạng xuất hiện trong câu (vd 確認) |
| reading | furigana (hiragana, vd かくにん) |
| lemma | dạng gốc |
| pos | loại từ (tiếng Việt, vd "danh từ + する") |
| meaning_vi | nghĩa tiếng Việt theo ngữ cảnh câu |
| worthLearning | bool — AI gợi ý có đáng đào thẻ không (bỏ trợ từ/số/tên riêng) |

## 3. AI Ingest: 1 lượt sinh "dữ liệu cuối"

```
Text thô (video→text / user dán)
   │  [chunk nếu dài]
   ▼
lib/ai/ingest (gpt-4o, prompt + structured output) → JSON:
   sentences[]: { original, text, corrected, note, confidence,
                  tokens[]: {surface, reading, lemma, pos, meaning_vi, worthLearning} }
   ▼
lưu sources + sentences  →  mọi màn đọc trực tiếp, KHÔNG gọi AI lại
```

Vì AI thấy **cả ngữ cảnh đoạn văn** nên chọn đúng cách đọc (vd 行った: いった hay
おこなった) tốt hơn nhiều so với tra từ lẻ. Đầu ra ràng buộc bằng JSON schema +
validate; lỗi định dạng → retry.

## 4. Phân quyền

- Mọi bảng có `user_id` → repository **luôn** lọc `where user_id = <currentUser>`.
- KHÔNG dựa vào RLS/`auth.uid()` của provider — phân quyền ở tầng app.
- Bảng auth của Auth.js (`users`, `accounts`, `sessions`, `verification_tokens`)
  do Drizzle adapter tạo, nằm chung trong PostgreSQL tự host → mang đi được.
- Thêm cột **`users.role`** (`user` | `admin`) để chặn truy cập trang Admin
  (F1d). Mọi route/Server Action admin kiểm tra `role = admin`.

### `user_settings` — tùy chỉnh theo từng người dùng (gồm loại thẻ bật/tắt)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | uuid (FK → users, PK) | |
| enabled_card_types | jsonb | vd `["recognition","cloze"]` |
| sound_enabled | bool | bật/tắt âm thanh |
| jlpt_level | text? | trình độ khai báo lúc onboarding (cold start) |

### `app_settings` — cấu hình hệ thống toàn cục (không secret)
> Lưu **mọi setting hệ thống** trong DB thay vì env/hard-code → sửa runtime qua
> trang Admin, không cần deploy lại. **Không** chứa secret (`DATABASE_URL`,
> `AUTH_SECRET`, OAuth/API key vẫn ở env). Mô hình key–value linh hoạt:

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| key | text (PK) | định danh setting, vd `openai_model` |
| value | jsonb | giá trị (chuỗi/số/bool/đối tượng tùy key) |
| type | text | kiểu để render form Admin: `string`\|`number`\|`bool`\|`json` |
| description | text? | mô tả cho Admin |
| updated_at | timestamptz | |
| updated_by | uuid (FK → users)? | admin sửa gần nhất |

**Key gợi ý (seed mặc định):**

| key | value mặc định | Ý nghĩa |
|-----|----------------|---------|
| `openai_model` | `"gpt-4o"` | Model cho AI Ingest |
| `whisper_model` | `"whisper-1"` | Model transcribe (GĐ2) |
| `ingest_chunk_size` | `4000` | Ngưỡng ký tự để chunk văn dài |
| `max_import_chars` | `50000` | Giới hạn nội dung mỗi lần import |
| `default_card_types` | `["recognition","cloze"]` | Loại thẻ bật mặc định cho user mới |
| `tts_provider` | `"webspeech"` | `webspeech` (MVP) → `cloud` (sau) |
| `feature_flags` | `{}` | Bật/tắt tính năng theo cờ |

> Đọc qua `lib/config` (cache + fallback mặc định nếu key thiếu). `user_settings`
> ghi đè `app_settings` ở phạm vi từng người khi có (vd loại thẻ).

## 5. Index gợi ý
- `cards(user_id, suspended, (fsrs_state->>'due'))` — lấy thẻ đến hạn nhanh.
- `notes(sentence_id)`, `cards(note_id)`.
- `sentences(source_id)`.
- `user_words(user_id, word)` — kiểm tra i+1.
