# 09 — Các loại flashcard

> Một **từ** đào ra có thể sinh **nhiều loại thẻ**, mỗi loại luyện một kỹ năng và
> có lịch ôn SRS riêng. Điểm đặc trưng Bloóm: **mọi loại đều hiển thị lại câu
> gốc từ buổi họp/nội dung bạn upload**.

## 1. Khái niệm: note vs card (chuẩn SRS)

```
NOTE (nội dung 1 từ — dùng chung)
  確認 / かくにん / "xác nhận, kiểm tra" / câu họp gốc / từ loại
        │
        ├──► CARD: Nhận diện (JP→Việt)   — fsrs_state riêng
        ├──► CARD: Cloze (điền câu)       — fsrs_state riêng
        └──► CARD: Sản sinh (Việt→JP)     — fsrs_state riêng
```

- **Note**: thông tin của từ (sửa 1 chỗ, mọi thẻ cùng cập nhật).
- **Card**: một hướng ôn cụ thể, lên lịch độc lập (như Anki).

## 2. Các loại thẻ (MVP: 3 loại — người dùng được bật/tắt)

Ví dụ từ 確認, đào từ câu họp 「明日までに確認をお願いします」.
🟩 = phần **lấy từ nội dung buổi họp của người dùng**.

### Loại 1 — Nhận diện (JP → Việt) ⭐ mặc định
| Mặt trước | Mặt sau |
|-----------|---------|
| 確認<br>🟩 明日までに確認をお願いします<br>*(câu họp làm ngữ cảnh)* | かくにん<br>xác nhận, kiểm tra |

Luyện: đọc hiểu — gặp từ trong tài liệu → hiểu nghĩa.

### Loại 4 — Cloze (điền vào câu) ⭐ dùng nội dung họp nhiều nhất
| Mặt trước | Mặt sau |
|-----------|---------|
| 🟩 明日までに ＿＿＿ をお願いします。<br>*(toàn bộ là câu họp, khoét từ đích)* | 確認 (かくにん) |

Luyện: dùng từ đúng ngữ cảnh thật của công việc.

### Loại 2 — Sản sinh (Việt → JP)
| Mặt trước | Mặt sau |
|-----------|---------|
| "xác nhận / kiểm tra" | 確認 (かくにん)<br>🟩 明日までに確認を… *(ví dụ từ họp)* |

Luyện: chủ động nhớ ra từ tiếng Nhật khi cần diễn đạt.

### (Tùy chọn) Loại 3 — Đọc kanji (Kanji → đọc)
| Mặt trước | Mặt sau |
|-----------|---------|
| 確認 | かくにん |

### (GĐ sau) Loại 5 — Nghe (Audio → nghĩa)
Cần TTS/audio — hoãn sang giai đoạn có audio.

## 3. Tổng hợp: câu buổi họp xuất hiện ở đâu

| Loại | Vị trí câu họp | MVP |
|------|----------------|-----|
| Cloze | **Mặt trước = chính câu họp** | ✅ |
| Nhận diện | Mặt trước, ngữ cảnh dưới từ | ✅ (mặc định) |
| Sản sinh | Mặt sau, ví dụ minh họa | ✅ |
| Đọc kanji | (không bắt buộc hiện câu) | Tùy chọn |
| Nghe | Phát audio của câu | GĐ sau |

> Mỗi thẻ luôn gắn **đúng câu nó được đào ra** (`cards.note → notes.sentence_id`)
> → người học thấy lại đúng tình huống công việc thật.

## 4. Cho phép người dùng chọn loại thẻ

- Trong **Cài đặt**: bật/tắt từng loại (mặc định bật: Nhận diện; Cloze, Sản
  sinh tùy người dùng bật).
- Khi đào 1 từ → app sinh card cho **các loại đang bật**.
- **Cảnh báo quá tải:** mỗi loại bật thêm = nhân số thẻ phải ôn. UI nên nhắc:
  *"Bật 3 loại = mỗi từ thành 3 thẻ ôn"*.

## 5. Lưu ý thiết kế
- Nếu một từ xuất hiện ở **nhiều buổi họp**, dùng câu của **lần đào ra** thẻ đó
  (giữ trong `notes.sentence_id`). (Có thể cho đổi câu ví dụ sau.)
- Cloze chỉ tạo được khi từ đích **nằm trong câu** (luôn đúng vì đào từ câu).
- Khi người dùng **tắt** một loại đang có thẻ: giữ thẻ cũ hay ẩn? → đề xuất ẩn
  khỏi hàng đợi ôn, không xóa (tránh mất tiến độ). *(cần xác nhận)*
