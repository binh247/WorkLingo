# 10 — Chất lượng transcript (xử lý text STT bị sai)

> Vấn đề: nội dung buổi họp từ audio→text (STT, do AI sinh) **thường có lỗi**
> (kanji đồng âm sai, thiếu dấu câu, filler, từ ghép sai). Nếu đào thẻ từ text
> sai → học phải tiếng Nhật sai. Tài liệu này mô tả cách chống.

## 1. Nguyên tắc: KHÔNG tin transcript mù quáng

Luôn có **người duyệt (human-in-the-loop)** trước khi đào thẻ. Người dùng đã dự
họp/đọc nội dung → nhận ra lỗi nhanh hơn mọi AI.

## 2. Hai kiểu đưa nội dung vào (khác nhau ở chỗ có audio hay không)

| Kiểu | Audio trong Bloóm? | Nghe lại để kiểm? | Giai đoạn |
|------|------------------------|-------------------|-----------|
| **A. Upload .txt** (AI làm sẵn nơi khác) | ❌ Không | ❌ Không | **MVP** |
| **B. Upload audio/video** → Bloóm tự STT | ✅ Có | ✅ Có (theo câu) | GĐ2 |

→ Biện pháp **"nghe lại audio" chỉ dùng cho kiểu B**. Kiểu A (MVP) phải dựa vào
các biện pháp **không cần audio** dưới đây.

## 3. Chống lỗi khi KHÔNG có audio (kiểu A — MVP)

### 3.1. ⭐ AI Ingest tự dọn lỗi & tự chấm độ tin cậy
Việc dọn lỗi nằm NGAY trong lượt AI Ingest (gpt-4o), không cần bước riêng:
```
Với mỗi câu, AI Ingest trả:
   • original   → câu gốc (trước sửa)
   • text       → câu sau khi sửa dè dặt
   • corrected  → có sửa không
   • note       → sửa gì (vd "格認 → 確認")
   • confidence → high | medium | low
```
Prompt yêu cầu: chỉ sửa lỗi rõ ràng, **không đoán bừa** — chỗ không chắc thì để
nguyên và đánh `confidence: low`. Câu `low` được **highlight "đáng ngờ"** để người
dùng ưu tiên kiểm.

### 3.2. Người dùng duyệt & sửa câu — **MVP** (lớp chốt)
- Màn **"Duyệt & sửa"** sau khi Ingest, trước khi đào thẻ.
- Hiện **đối chiếu** `original` ↔ `text` + `note`; câu `confidence=low` làm nổi.
- Sửa được câu **mọi lúc**, kể cả trên thẻ đã tạo (`sentences.text` cập nhật).
- Cho phép **bỏ qua câu rác** (câu lặp, nói dở) → không đào thẻ.

> ⚠️ Vì AI có thể "tự chế" khi sửa, bước người duyệt là **bắt buộc** — luôn cho
> thấy câu gốc để đối chiếu.

## 4. Khi CÓ audio (kiểu B — GĐ2)
- Mỗi câu lưu `audio_start` → nút **🔊 nghe lại đoạn này** để đối chiếu.
- Có thể kết hợp độ tin cậy của Whisper (STT) với `confidence` của AI Ingest để
  đánh dấu câu cần kiểm.
- **Khuyến nghị người dùng:** nếu còn file audio gốc, hãy upload audio vào
  Bloóm (kiểu B) thay vì dán transcript làm sẵn — để được nghe lại khi kiểm.

## 5. Tóm tắt biện pháp theo trường hợp

| Biện pháp | Kiểu A (.txt) | Kiểu B (audio) |
|-----------|:---:|:---:|
| AI Ingest dọn lỗi + chấm `confidence` | ✅ | ✅ |
| Highlight câu `confidence = low` | ✅ | ✅ |
| Đối chiếu câu gốc ↔ đã sửa | ✅ | ✅ |
| Người dùng sửa câu / bỏ câu rác | ✅ | ✅ |
| Nghe lại audio theo câu | ❌ | ✅ |

## 6. Ảnh hưởng dữ liệu
- `sentences.original` / `text` / `corrected` / `note` / `confidence` — từ AI Ingest.
- `sentences.text` **sửa tay được** (editable) — MVP.
- `sentences.skipped` — bỏ qua câu rác.

## 7. Câu hỏi mở
- Bước "Duyệt & sửa" là **bắt buộc** trước khi đào, hay cho phép bỏ qua?
- Có yêu cầu AI Ingest gắn thêm độ khó/JLPT cho token (cho i+1) không?
