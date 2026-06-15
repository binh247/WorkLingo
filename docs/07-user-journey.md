# 07 — Hành trình sử dụng (App vận hành thế nào)

> Tài liệu này mô tả **bằng ví dụ cụ thể** cách app vận hành end-to-end, để dễ
> hình dung. Bản triển khai đầu: **upload file .txt** chứa nội dung buổi họp
> tiếng Nhật. (Video → STT làm sau, xem [04-features.md](04-features.md).)

---

## 1. Bức tranh tổng thể

```
        ┌──────────────────────────────────────────────────────┐
        │                    BLOÓM                          │
        └──────────────────────────────────────────────────────┘

  [1] UPLOAD            [2] THƯ VIỆN          [3] HỌC (đọc & đào từ)
  file .txt    ──►   danh sách tài liệu   ──►   đọc câu + furigana
  (buổi họp)         (mỗi buổi họp 1 mục)        click từ → lưu thẻ
                            │                          │
                            │                          ▼
                            │                   [4] BỘ THẺ (deck)
                            │                   gom thẻ từ MỌI tài liệu
                            │                          │
                            ▼                          ▼
                     [5] DASHBOARD  ◄────────  [6] ÔN TẬP (SRS)
                     streak/XP/tiến độ          học thẻ đến hạn
```

**Ý tưởng cốt lõi:**
- Mỗi file upload = một **"tài liệu" (source)**.
- Đọc tài liệu → **đào (mine)** các từ thành **flashcard**.
- Tất cả flashcard từ mọi tài liệu **gom chung vào một bộ thẻ**, ôn theo SRS.

---

## 2. Đi qua từng bước bằng ví dụ

### Bước 1 — Upload file .txt buổi họp

Giả sử bạn có file `hop-team-dev-30-05.txt` nội dung:

```
田中：おはようございます。今日の会議を始めます。
鈴木：先週のタスクですが、確認が遅れてすみません。
田中：大丈夫です。明日までに資料を準備してください。
鈴木：承知しました。来週の月曜日に共有します。
```

Màn **Upload**:
```
┌─────────────────────────────────────────────┐
│  ➕ Thêm tài liệu mới                          │
│                                               │
│  Loại:  ( ) Chat   (•) Họp   ( ) Video  ( )Text│
│  Tiêu đề: [ Họp team dev 30/05            ]    │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │   📄  Kéo thả file .txt vào đây        │   │
│  │        hoặc dán nội dung               │   │
│  └───────────────────────────────────────┘   │
│                                               │
│                        [ PHÂN TÍCH ]          │
└─────────────────────────────────────────────┘
```

### Bước 2 — App xử lý (tự động, sau khi bấm "Phân tích")

```
File .txt
   │
   └─► AI Ingest (gpt-4o, 1 lượt) làm tất cả:
         • dọn lỗi STT (giữ câu gốc + ghi chú)
         • tách câu (bỏ nhãn người nói 田中/鈴木)
         • tách từ + furigana + loại từ + nghĩa Việt
           「確認が遅れて…」 → 確認(かくにん) "xác nhận" / が / 遅れる(おくれる) "trễ"...
         • đánh dấu từ "đáng học" + câu "đáng ngờ"
   │
   └─► Lưu DB: 1 `sources` + N `sentences` (tokens đã kèm nghĩa)
```

→ Sau bước này, buổi họp xuất hiện trong **Thư viện**.

### Bước 3 — Thư viện (quản lý NHIỀU tài liệu)

Đây chính là chỗ trả lời "**upload nhiều đoạn text thì quản lý sao**":

```
┌──────────────────────────────────────────────────────────┐
│  📚 Thư viện của tôi              [ ➕ Thêm tài liệu ]      │
│                                                            │
│  🔍 [ Tìm kiếm... ]     Lọc: [Tất cả ▾] [Mới nhất ▾]       │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 💼 Họp team dev 30/05                                │  │
│  │ Họp · 4 câu · đã đào 3 thẻ · đọc 100%   [Tiếp tục ›] │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 💬 Chat với khách hàng A                             │  │
│  │ Chat · 18 câu · đã đào 7 thẻ · đọc 60%   [Tiếp tục ›]│  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 💼 Họp review sprint 28/05                           │  │
│  │ Họp · 25 câu · đã đào 0 thẻ · chưa đọc   [Bắt đầu ›] │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

Mỗi tài liệu hiển thị: **loại, số câu, số thẻ đã đào, % đã đọc**. Thao tác:
- **Mở** để đọc/học tiếp.
- **Đổi tên / Xóa**.
- **Lọc** theo loại (họp/chat/...), **tìm kiếm** theo tiêu đề.
- (GĐ sau) gắn **nhãn/dự án** để nhóm nhiều buổi họp cùng dự án.

### Bước 4 — Học: đọc & đào từ (sentence mining)

> **Điểm "thông minh":** app KHÔNG bắt bạn lướt hết hàng trăm từ. Sau khi phân
> tích, nó **gợi ý sẵn các từ đáng học cho bạn** (mới + hay gặp + đúng trình độ —
> xem [08-smart-word-selection.md](08-smart-word-selection.md)) và highlight trong
> text. Bạn chỉ xác nhận giữ/bỏ.

```
┌──────────────────────────────────────────────────────────┐
│  ✨ Buổi họp này có 5 từ đáng học cho bạn:                 │
│     確認  資料  納期  承知  共有     [ ✓ Lưu tất cả ]      │
│  (chạm từng từ để bỏ nếu bạn đã biết → app ghi nhớ)        │
└──────────────────────────────────────────────────────────┘
```

Mở "Họp team dev 30/05" → màn **đọc** (có thể xem chi tiết từng từ):

```
┌──────────────────────────────────────────────────────────┐
│  ‹ Quay lại     💼 Họp team dev 30/05        câu 2 / 4     │
│                                                            │
│  ─────────────────────────────────────────────────        │
│   先週のタスクですが、かくにん が遅れてすみません。          │
│            (furigana hiện phía trên mỗi kanji)             │
│                          ▲ chạm vào 確認                   │
│  ─────────────────────────────────────────────────        │
│                                                            │
│        ┌───────────────────────────────┐                  │
│        │ 確認 (かくにん)            🔊  │  ← popup khi chạm │
│        │ Nghĩa: xác nhận, kiểm tra      │                  │
│        │ Loại: danh từ + する           │                  │
│        │            [ ➕ Lưu thành thẻ ] │                  │
│        └───────────────────────────────┘                  │
│                                                            │
│                          [ Câu trước ]  [ Câu tiếp ]       │
└──────────────────────────────────────────────────────────┘
```

- Mỗi từ **chạm được** → popup nghĩa **Nhật-Việt** (đã có sẵn trong tokens do AI
  Ingest sinh; hiện tức thì, không gọi API).
- Bấm **"Lưu thành thẻ"** → tạo flashcard, **gắn nguyên câu gốc làm ngữ cảnh**.
- Từ đã lưu được tô dấu để biết "đã đào".

### Bước 5 — Bộ thẻ (gom từ MỌI tài liệu)

Đây là chỗ trả lời "**học sao khi có nhiều text**": tất cả thẻ đào ra — dù từ buổi
họp nào — **gom chung một bộ**. Mỗi thẻ vẫn nhớ nó đến từ đâu.

```
┌──────────────────────────────────────────────────────────┐
│  🃏 Bộ thẻ của tôi (32 thẻ)        Lọc nguồn: [Tất cả ▾]   │
│                                                            │
│  確認  かくにん  xác nhận        ← 💼 Họp team dev 30/05    │
│  資料  しりょう  tài liệu        ← 💼 Họp team dev 30/05    │
│  納期  のうき    kỳ hạn giao     ← 💬 Chat khách hàng A     │
│  ...                                                       │
│                                                            │
│  → đến hạn ôn hôm nay: 12 thẻ      [ 🔥 ÔN TẬP NGAY ]      │
└──────────────────────────────────────────────────────────┘
```

### Bước 6 — Ôn tập (SRS) — xem demo HTML

Bấm **"Ôn tập ngay"** → vào màn ôn (chính là
[mockups/review-screen.html](../mockups/review-screen.html)):
- Hệ thống lấy các thẻ **đến hạn** (FSRS `due <= hôm nay`) **từ tất cả tài liệu**.
- Hiện **câu ngữ cảnh gốc**, ẩn nghĩa từ đích → bạn nhớ lại → tự chấm
  Again/Hard/Good/Easy.
- Đúng → +XP + confetti; sai → hiện đáp án. Cập nhật lịch ôn lần sau.

---

## 3. Hai cách "học" khi có nhiều tài liệu

| Cách | Khi nào dùng | Mô tả |
|------|--------------|-------|
| **Ôn tổng hợp (mặc định)** | Hằng ngày | SRS gom **mọi thẻ đến hạn** từ tất cả tài liệu — đúng tinh thần SRS, hiệu quả nhất |
| **Học theo tài liệu** | Vừa họp xong | Vào một buổi họp cụ thể, đọc & đào từ trong đó; có thể ôn riêng thẻ của tài liệu đó |

> **Khuyến nghị:** *đào từ* thì theo từng tài liệu (lúc đọc), nhưng *ôn tập* thì
> để SRS gom chung — vì trí nhớ cần ôn đúng lúc sắp quên, không phụ thuộc từ đó
> nằm ở buổi họp nào.

---

## 4. Vòng lặp sử dụng hằng ngày (tóm tắt)

```
  Có nội dung mới (buổi họp)
        │  upload .txt
        ▼
  Đọc & đào từ mới  ──►  thẻ vào bộ chung
        │
        ▼
  Mỗi ngày: mở app → "Ôn tập" → học thẻ đến hạn
        │
        ▼
  Streak +1, XP tăng, confetti 🎉  →  duy trì đều đặn
```

---

## 5. Vì sao thiết kế thế này?

- **Tài liệu (source) tách biệt** → bạn quản lý theo từng buổi họp/cuộc chat,
  dễ tìm lại "buổi họp hôm đó nói gì".
- **Thẻ gom chung** → ôn tập hiệu quả theo khoa học trí nhớ (SRS), không bị
  phân mảnh theo nguồn.
- **Giữ ngữ cảnh** → mỗi thẻ luôn kèm câu gốc + biết đến từ buổi nào → nhớ sâu
  và ứng dụng đúng tình huống công việc.

---

## 6. Phần làm sau (đã ghi nhận)
- **Video / audio → STT (Whisper)**: thay bước "upload .txt" bằng "upload
  video/audio", phần còn lại của luồng **giữ nguyên** (vẫn ra `sentences`).
- Import phụ đề YouTube.
- Gắn nhãn/dự án để nhóm nhiều buổi họp.
