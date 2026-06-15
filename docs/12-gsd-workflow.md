# 12 — Hướng dẫn quy trình GSD cho Bloóm

> **GSD (Get Shit Done)** là khung phát triển hướng đặc tả (spec-driven) cho
> Claude Code. Tài liệu này hướng dẫn dùng GSD cho Bloóm: từ cài đặt ban đầu
> đến quy trình thêm chức năng mới.
>
> Nguyên lý cốt lõi: chia dự án thành nhiệm vụ nhỏ, mỗi nhiệm vụ chạy trong cửa
> sổ ngữ cảnh tươi mới, luôn giữ phiên chính ở mức 0–30% context để chất lượng
> code không suy giảm.

---

## Mục lục

1. [Khái niệm & cách GSD hiểu dự án](#1-khái-niệm--cách-gsd-hiểu-dự-án)
2. [Cài đặt ban đầu (một lần)](#2-cài-đặt-ban-đầu-một-lần)
3. [File cầu nối & ánh xạ Phase ↔ Feature](#3-file-cầu-nối--ánh-xạ-phase--feature)
4. [Nạp ngữ cảnh dự án (brownfield)](#4-nạp-ngữ-cảnh-dự-án-brownfield)
5. [Quy trình thêm chức năng MỚI](#5-quy-trình-thêm-chức-năng-mới)
6. [Chế độ nhanh cho tác vụ nhỏ](#6-chế-độ-nhanh-cho-tác-vụ-nhỏ)
7. [Cách scope đúng 1 feature, không đụng feature đã xong](#7-cách-scope-đúng-1-feature-không-đụng-feature-đã-xong)
8. [Bảng lệnh tham khảo](#8-bảng-lệnh-tham-khảo)
9. [Model profiles & chi phí token](#9-model-profiles--chi-phí-token)
10. [Sai lầm thường gặp](#10-sai-lầm-thường-gặp)

---

## 1. Khái niệm & cách GSD hiểu dự án

GSD không làm Claude thông minh hơn — nó làm Claude **đáng tin cậy hơn** bằng cách:

- Chia việc thành **task nguyên tử**, mỗi task có tiêu chí nghiệm thu rõ ràng.
- Mỗi task commit git riêng → dễ rà soát, dễ rollback.
- Giữ context phiên chính luôn thấp → tránh "suy giảm ngữ cảnh".

GSD hiểu dự án qua các file trạng thái:

| File | Vai trò |
|------|---------|
| `PROJECT.md` | Tầm nhìn, mục tiêu (điểm vào — trỏ sang `docs/`) |
| `ROADMAP.md` | Ánh xạ phase → feature, đánh dấu done/đang làm |
| `STATE.md` | GSD tự ghi: cái gì đã tồn tại trong code |
| `CONTEXT.md` | Sở thích/quyết định thu được khi `discuss-phase` |
| `.planning/research/` | Kết quả nghiên cứu (nếu dùng `--research`) |

> **Bloóm đặc thù:** bộ tài liệu thật nằm trong [`docs/`](README.md)
> (overview, architecture, data-model, features, design-system, roadmap). Ta giữ
> `docs/` là **nguồn sự thật** và để `PROJECT.md`/`ROADMAP.md` chỉ trỏ tới nó.

---

## 2. Cài đặt ban đầu (một lần)

### 2.1 Khởi tạo git (bắt buộc)

GSD commit từng task, nên dự án phải là git repo:

```bash
cd /Users/ongbinhit/working/source/Bloóm
git init
git add -A && git commit -m "Initial: docs + mockups before GSD"
```

### 2.2 Cài GSD

```bash
npx get-shit-done-cc@latest
# Chọn: runtime = Claude Code, scope = Local (gắn riêng dự án này)
```

Xác minh:

```bash
/gsd:help
```

### 2.3 Cấp quyền git cho Claude Code

Thêm vào `.claude/settings.local.json` mảng `permissions.allow`:

```json
"Bash(git add:*)",
"Bash(git commit:*)",
"Bash(git status:*)",
"Bash(git diff:*)",
"Bash(git log:*)"
```

---

## 3. File cầu nối & ánh xạ Phase ↔ Feature

GSD lập kế hoạch theo **số phase** (`plan-phase 1`, `2`...). Còn docs Bloóm
đánh số theo **feature** (F1, F2...) và **giai đoạn** ([MVP], [GĐ2], [GĐ3]).
Hai hệ này KHÔNG tự khớp — phải ánh xạ rõ trong `ROADMAP.md`.

**`PROJECT.md`** (ở thư mục gốc — điểm vào cho GSD):

```markdown
# Bloóm — Project Vision
> Nguồn chi tiết: docs/. File này là điểm vào cho GSD.
- Tầm nhìn:        docs/01-product-overview.md
- Kiến trúc:       docs/02-architecture.md
- Mô hình dữ liệu: docs/03-data-model.md
- Chức năng:       docs/04-features.md
- Thiết kế:        docs/05-design-system.md
```

**`ROADMAP.md`** (ở thư mục gốc — bảng ánh xạ + trạng thái):

```markdown
# Bloóm — Roadmap (GSD phases)
> Nguồn gốc: docs/06-roadmap.md, docs/04-features.md

| GSD Phase | Feature trong docs | Giai đoạn | Trạng thái |
|-----------|--------------------|-----------|------------|
| 1 | F1, F1b, F1c (Auth) | MVP | ⬜ chưa làm |
| 2 | F2, F2.5 (Import + duyệt) | MVP | ⬜ chưa làm |
| 3 | F3 (Study & sentence mining) | MVP | ⬜ chưa làm |
| 4 | F4 (Ôn tập SRS) | MVP | ⬜ chưa làm |
| 5 | F5 (Dashboard tiến độ) | MVP | ⬜ chưa làm |
| 6 | F6 (Upload audio/video) | GĐ2 | ⬜ chưa làm |
| 7 | F7 (AI giải thích ngữ pháp) | GĐ2 | ⬜ chưa làm |
| 8 | F8 (TTS) | MVP/GĐ sau | ⬜ chưa làm |
```

> Mỗi khi hoàn thành một phase, đổi `⬜ chưa làm` → `✅ done`. Đây là cách GSD
> (và bạn) biết cái gì đã xong để không làm lại.

---

## 4. Nạp ngữ cảnh dự án (brownfield)

**Đừng** chạy `/gsd:new-project` (sẽ phỏng vấn lại từ đầu, bỏ qua docs sẵn có).
Thay vào đó, để GSD đọc hiểu hiện trạng:

```bash
/gsd:map-codebase
```

Lệnh này quét code + docs + file cầu nối → dựng `STATE.md` ghi nhận cái gì đã
tồn tại. Chạy lại lệnh này **mỗi khi** quay lại dự án sau thời gian dài hoặc sau
khi có thay đổi lớn ngoài GSD.

---

## 5. Quy trình thêm chức năng MỚI

Đây là phần dùng thường xuyên nhất. Có 2 nhánh tùy độ lớn.

### 5.1 Chức năng LỚN (đa file, nhiều bước) → quy trình phase đầy đủ

Ví dụ: thêm **F4 — Ôn tập SRS**, hoặc **F6 — Upload audio/video**.

**Bước 0 — Cập nhật tài liệu trước (nguồn sự thật).**
Mô tả chức năng vào [docs/04-features.md](04-features.md) và cập nhật trạng thái
trong `ROADMAP.md`. Bạn có thể tự viết, **hoặc nhờ Claude**:

> "Thêm/hoàn thiện mô tả F4 trong docs/04-features.md và đánh dấu Phase 4
> đang làm trong ROADMAP.md."

**Bước 1 — Map codebase** (nếu đã có code các phase trước):

```bash
/gsd:map-codebase
```

**Bước 2 — Discuss: chốt các điểm còn mơ hồ.**

```bash
/gsd:discuss-phase 4
```

GSD hỏi các "vùng xám" (dùng `ts-fsrs`? âm thanh `Howler`? UI ở đâu?...). Trả
lời, và **nói rõ phạm vi**:

> "Chỉ làm F4 (SRS) trong docs/04-features.md. F1–F3 đã xong, tái dùng model
> `card`/`sentences` đã có. Không đụng các feature khác."

**Bước 3 — Plan: sinh kế hoạch task nguyên tử.**

```bash
/gsd:plan-phase 4
```

GSD biến mỗi bước F4 thành task XML có `<verify>`/`<done>`. **ĐỌC KỸ** kế hoạch:
nếu thấy task nào làm lại F1–F3 → yêu cầu bỏ.

**Bước 4 — Execute: thực thi.**

```bash
/gsd:execute-phase 4
```

Subagent chạy (có thể song song), commit git từng task.

**Bước 5 — Verify: nghiệm thu.**

```bash
/gsd:verify-work 4
```

Kiểm theo đúng tiêu chí F4. Sai → GSD chẩn đoán và sửa.

**Bước 6 — Cập nhật trạng thái.**
Đổi Phase 4 → `✅ done` trong `ROADMAP.md`. Nếu là feature cuối của một milestone:

```bash
/gsd:complete-milestone
```

> **Mẹo:** chạy `/clear` giữa các bước lớn để reset context — đây là cốt lõi
> giữ GSD ở "vùng ngọt" 0–30%.

### 5.2 Sơ đồ một vòng thêm chức năng

```
[Cập nhật docs] → map-codebase → discuss-phase N → plan-phase N
       → (đọc & duyệt kế hoạch) → execute-phase N → verify-work N
       → cập nhật ROADMAP (✅) → /clear
```

---

## 6. Chế độ nhanh cho tác vụ nhỏ

Chức năng nhỏ/độc lập (1–2 file, làm trong 1 lượt) → **không cần** cả quy trình
phase, dùng:

```bash
/gsd:quick                              # làm ngay
/gsd:quick --discuss                    # chốt sở thích trước
/gsd:quick --research                   # khảo sát thư viện/cách làm trước
/gsd:quick --discuss --research --full  # nhỏ nhưng đủ discuss + verify
```

Ví dụ Bloóm: "thêm nút export 1 deck", "đổi âm thanh phản hồi", "thêm 1 loại
flashcard".

| Tình huống | Dùng |
|-----------|------|
| Tính năng kéo dài nhiều task, đụng nhiều file | Quy trình phase (mục 5) |
| Sửa nhanh, thêm 1 thứ nhỏ | `/gsd:quick` |
| Chưa chắc làm được / cần khảo sát | `/gsd:quick --research` |
| Có ý tưởng nhưng chưa làm | `/gsd:add-todo` |

---

## 7. Cách scope đúng 1 feature, không đụng feature đã xong

Ba cơ chế kết hợp đảm bảo GSD làm **đúng F4**, không làm lại F1–F3:

1. **Trỏ đích danh.** Luôn nói rõ feature ID + file:
   *"Triển khai F4 trong docs/04-features.md. F1–F3 đã xong."*
2. **map-codebase + ROADMAP.** `STATE.md` ghi cái gì đã có; `ROADMAP.md` đánh
   dấu `✅` các phase xong → GSD chỉ lập kế hoạch phần thiếu và tái dùng code cũ.
3. **Tiêu chí nghiệm thu.** Docs F4 đã có các bước cụ thể → biến thành `<verify>`
   trong plan → `verify-work` kiểm đúng phạm vi, không lệch sang F5/F6.

> Nếu chưa có code (chỉ docs), thay map-codebase bằng việc khai báo trong
> `discuss-phase`: *"F1–F3 coi như đã hoàn thành ở phiên trước."*

---

## 8. Bảng lệnh tham khảo

| Lệnh | Chức năng |
|------|-----------|
| `/gsd:help` | Trợ giúp / xác minh cài đặt |
| `/gsd:map-codebase` | Quét hiện trạng dự án (brownfield) |
| `/gsd:discuss-phase N` | Chốt quyết định triển khai phase N |
| `/gsd:plan-phase N` | Sinh kế hoạch task nguyên tử cho phase N |
| `/gsd:execute-phase N` | Thực thi phase N (subagent + commit) |
| `/gsd:verify-work N` | Kiểm thử chấp nhận phase N |
| `/gsd:quick [--discuss] [--research] [--full]` | Tác vụ nhỏ ngoài quy trình |
| `/gsd:complete-milestone` | Đóng một milestone |
| `/gsd:progress` | Trạng thái hiện tại |
| `/gsd:add-todo` | Ghi lại ý tưởng/tác vụ chờ |
| `/gsd:debug` | Gỡ lỗi có hệ thống |
| `/gsd:pause-work` / `/gsd:resume-work` | Tạm dừng / tiếp tục |
| `/gsd:set-profile <quality\|balanced\|budget>` | Đổi model profile |

> Lưu ý: tên lệnh chính xác có thể khác theo phiên bản GSD — chạy `/gsd:help`
> để xem danh sách thực tế sau khi cài.

---

## 9. Model profiles & chi phí token

GSD ăn nhiều token. Chọn profile theo ngân sách:

| Profile | Plan | Execute | Verify |
|---------|------|---------|--------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (mặc định) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |

```bash
/gsd:set-profile balanced
```

Gợi ý: dùng `balanced` mặc định; chuyển `budget` cho các phase execute nhiều,
đơn giản; dùng `quality` cho phase kiến trúc/logic phức tạp.

---

## 10. Sai lầm thường gặp

1. **Dùng quy trình phase cho việc nhỏ** → dùng `/gsd:quick`.
2. **Bỏ qua `discuss-phase`** → tiết kiệm 5–10 phút nhưng phải làm lại sau.
3. **Quên `map-codebase`** ở dự án đã có code → GSD viết trùng / phá phần cũ.
4. **Không cập nhật `ROADMAP.md`** → GSD không biết phase nào đã xong.
5. **Để context tích lũy** → nhớ `/clear` giữa các phase.
6. **Mô tả chức năng mơ hồ** → cập nhật docs rõ ràng trước khi `plan-phase`.
7. **Chạy `/gsd:new-project` trên dự án đã có docs** → mất công khai báo lại;
   dùng `map-codebase` thay thế.

---

> **Tóm lược:** Cài một lần (mục 2–4). Mỗi khi thêm chức năng mới: *cập nhật docs
> → discuss → plan → (duyệt) → execute → verify → đánh dấu ROADMAP → clear*. Trỏ
> đích danh feature và giữ `ROADMAP.md` cập nhật để GSD luôn làm đúng phạm vi.
