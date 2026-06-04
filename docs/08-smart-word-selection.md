# 08 — Chọn từ thông minh ("Từ đáng học cho bạn") — MVP

> Đây là phần khiến WorkLingo **thông minh thật**, không chỉ là máy tạo flashcard.
> Thay vì hiện hết hàng trăm từ bắt người dùng tự lọc, app **tự gợi ý đúng những
> từ đáng học** cho từng người. Quyết định: đưa vào **MVP**.

## 1. Vấn đề cần giải

Một buổi họp có hàng trăm từ. Nếu lưu hết → quá tải → bỏ cuộc. Việc học hiệu quả
phụ thuộc 2 điều:
1. **Chọn đúng từ** (vừa tầm, hay gặp, chưa biết) — app lo.
2. **Ôn đúng cách** (SRS, active recall, có ngữ cảnh) — xem [04](04-features.md).

Tài liệu này lo phần (1).

## 2. Thuật toán lọc & xếp hạng (mỗi khi upload 1 tài liệu)

```
Tokens từ AI Ingest (đã có worthLearning + nghĩa + loại từ)
   │
   ├─[B1] Giữ token worthLearning = true (AI đã bỏ trợ từ/số/tên riêng)
   │
   ├─[B2] Bỏ từ ĐÃ BIẾT
   │       • lemma có trong user_words với status = 'known'
   │
   ├─[B3] XẾP HẠNG ưu tiên:
   │       • Tần suất trong nội dung CỦA BẠN (gặp nhiều buổi họp → ưu tiên)
   │       • (tùy chọn) so trình độ JLPT khai báo của user
   │       • Câu i+1: câu chỉ chứa ĐÚNG 1 từ lạ → đánh dấu là câu "vàng" để đào
   │
   └─► Kết quả: "Gợi ý N từ đáng học" + highlight sẵn trong text
```

### Người dùng chỉ cần xác nhận (1 chạm)
```
App: "Buổi họp này có 6 từ đáng học cho bạn:"
   確認  資料  納期  承知  共有  来週
   [✓ Lưu tất cả]   hoặc chạm từng từ để bỏ/giữ
```
- Giữ → tạo thẻ.
- Bỏ → đánh dấu `user_words = known` → **không gợi ý lại lần sau** (app học dần).

## 3. Bài toán "ngày đầu" (cold start)

Ngày đầu `user_words` trống → app chưa biết bạn đã biết gì. Hai cách xử lý:

| Cách | Mô tả |
|------|-------|
| **A. Onboarding chọn trình độ** | Hỏi "Trình độ của bạn? (N5/N4/N3...)" (lưu `user_settings.jlpt_level`). Có thể yêu cầu AI Ingest đánh thêm độ khó/JLPT mỗi token để so với trình độ → i+1 chạy đúng sớm |
| **B. Học dần** | Coi mọi từ `worthLearning` là ứng viên, **xếp theo tần suất**; người dùng bỏ từ đã biết → sau vài buổi app tự hiệu chỉnh |

> **Khuyến nghị kết hợp A+B:** hỏi trình độ lúc onboarding (nhẹ) + nhờ AI Ingest
> gắn nhãn độ khó cho token (thêm trường vào schema nếu cần).

## 4. "i+1" là gì và vì sao quan trọng

**i+1** = câu mà bạn đã biết hết, **chỉ trừ 1 từ mới**. Đây là câu học hiệu quả
nhất: đủ ngữ cảnh để đoán nghĩa, không quá tải.

```
Bạn đã biết: 明日 / までに / お願い / します
Câu:  「明日までに確認をお願いします」
       → chỉ 確認 là lạ  ⇒ câu i+1 hoàn hảo để đào 確認
```

App ưu tiên đào từ trong các câu i+1, và đánh dấu các câu này trong màn đọc.

## 5. Dữ liệu cần (bổ sung cho MVP)

- `user_words(user_id, word, status)` — **chuyển từ GĐ2 lên MVP**. Nguồn cập nhật:
  - Khi lưu thẻ → từ đó thành `learning`.
  - Khi "bỏ qua/đã biết" → `known`.
  - (Cách A) seed từ JLPT lúc onboarding.
- **Tần suất**: tính từ `tokens` của các `sentences` thuộc user (đếm lemma).
  Có thể tính on-the-fly hoặc cache bảng `user_word_freq` nếu cần tối ưu sau.

## 6. Phân biệt rõ: "thông minh" nằm ở đâu

| Khâu | Có phải "học" không? | Ai làm |
|------|----------------------|--------|
| Lọc & gợi ý từ đáng học | Không — là chuẩn bị | **App (thông minh)** |
| Xác nhận giữ/bỏ | Curation | Người dùng (1 chạm) |
| **Ôn tập SRS (nhớ lại)** | ✅ **ĐÂY là lúc học** | Người dùng + thuật toán FSRS |

→ App "thông minh" ở khâu **chọn đúng từ**; việc học thật xảy ra ở **ôn tập**.

## 7. Câu hỏi mở
- Có làm onboarding hỏi trình độ JLPT không, hay chỉ dựa AI ước lượng + học dần?
- Ngưỡng "gợi ý tối đa N từ / buổi" nên là bao nhiêu (vd 5–10)?
