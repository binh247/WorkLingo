# 01 — Tổng quan sản phẩm

## 1. Tầm nhìn

**Bloóm** giúp người đi làm học tiếng Nhật từ **chính nội dung công việc thật
của họ** — thay vì giáo trình chung chung. Người dùng đưa vào đoạn chat công ty,
transcript cuộc họp, hay một video YouTube; Bloóm biến nội dung đó thành bài
học: tách từ, tra nghĩa tiếng Việt, tạo flashcard giữ nguyên ngữ cảnh, và ôn tập
theo thuật toán lặp lại ngắt quãng (SRS).

## 2. Vấn đề giải quyết

- Người đi làm tại môi trường tiếng Nhật phải dùng ngôn ngữ thật hằng ngày, nhưng
  giáo trình lại dạy nội dung xa rời công việc → học xong khó áp dụng.
- Học rời rạc từng từ, mất ngữ cảnh → nhớ kém, dùng sai.
- Thiếu động lực duy trì đều đặn.

## 3. Phương pháp nền tảng

| Nguyên tắc | Ý nghĩa |
|-----------|---------|
| **Comprehensible Input** | Học qua nội dung hiểu được ~80–90% (lý thuyết Krashen) |
| **Sentence mining (Refold)** | Flashcard sinh từ câu thật, không phải từ đơn lẻ |
| **i+1** | Ưu tiên câu chỉ chứa 1 yếu tố mới chưa biết (GĐ2) |
| **SRS** | Lặp lại ngắt quãng để ghi nhớ lâu dài (thuật toán FSRS) |
| **Giữ ngữ cảnh** | Mỗi thẻ gắn câu gốc + nguồn (chat/meeting/video) |

## 4. Điểm khác biệt

| App thông thường (Anki, Duolingo) | Bloóm |
|-----------------------------------|-----------|
| Nội dung soạn sẵn, chung chung | Nội dung **công việc thật của bạn** |
| Học rời ngữ cảnh | Giữ nguyên câu gốc + nguồn |
| Động lực thấp | Động lực cao — học đúng cái dùng hằng ngày |
| Gamification tách rời việc học | Streak/XP **gắn với SRS thật** |

## 5. Đối tượng người dùng

- **Chính:** người đi làm trong môi trường tiếng Nhật (kỹ sư, BrSE, nhân viên
  công ty Nhật) trình độ sơ–trung cấp, cần nâng nhanh năng lực thực dụng.
- **Phụ:** người tự học muốn immersion từ nội dung mình quan tâm.

## 6. Giá trị cốt lõi cung cấp

1. **Biến nội dung công việc → bài học** chỉ với thao tác dán/upload.
2. **Tra nghĩa tiếng Việt** ngay trên từng từ trong câu.
3. **Flashcard có ngữ cảnh** — nhớ từ trong câu thật.
4. **Ôn tập SRS** — học đúng lúc sắp quên.
5. **Trải nghiệm vui, gây nghiện** kiểu Duolingo (streak, XP, ăn mừng).

## 7. Phạm vi theo giai đoạn

### MVP (Giai đoạn 1) — luồng text-first
```
Dán text tiếng Nhật
  → Tách câu + tách từ + furigana + nghĩa (Nhật-Việt)
  → Click từ/câu để lưu flashcard
  → Ôn tập SRS + gamification (streak, XP, confetti)
```

### Giai đoạn 2 — mở rộng nguồn & AI
- Upload audio/video → transcribe (Whisper).
- Import phụ đề YouTube.
- AI giải thích ngữ pháp câu (OpenAI).
- Thuật toán phát hiện câu i+1 theo vốn từ user.

### Giai đoạn 3 — hoàn thiện
- Phân loại nội dung theo nguồn/dự án/người gửi.
- Thống kê tiến độ, heatmap; level, bảng xếp hạng.
- TTS chất lượng cao (cloud) + cache audio (phát âm cơ bản đã có ở MVP qua Web Speech).
- Export sang Anki.

## 8. Tiêu chí thành công (MVP)

- Người dùng dán được nội dung → thấy câu tách từ + nghĩa trong < 3 giây.
- Tạo và ôn tập flashcard trọn vòng SRS không lỗi.
- Có streak/XP/confetti tạo cảm giác hoàn thành.
- Đăng nhập Email + Google hoạt động ổn định.
