# 11 — AI Ingest (lõi xử lý nội dung)

> Một lượt gọi AI (**OpenAI gpt-4o**) biến text thô (video→text / user dán) thành
> "dữ liệu cuối": dọn lỗi STT + tách câu + tách từ + furigana + loại từ + nghĩa
> Việt + đánh dấu từ đáng học. **Thay thế hoàn toàn Kuromoji + từ điển ngoài.**

## 1. Vì sao 1 lượt AI làm hết?
- Có **ngữ cảnh cả đoạn** → chọn đúng cách đọc (vd 行った: いった/おこなった), đúng
  nghĩa theo tình huống công việc.
- Đơn giản hoá kiến trúc: không Kuromoji, không bảng từ điển/cache, không tra lúc click.
- Kết quả lưu `sentences.tokens` → mọi màn đọc trực tiếp, **không gọi AI lại**.

## 2. Đầu vào → Đầu ra

```
Input:  raw text (1 buổi họp / đoạn chat / transcript video)
Output: JSON { sentences: [...] }  (lưu vào sources + sentences)
```

## 3. JSON schema (structured output)

```jsonc
{
  "type": "object",
  "properties": {
    "sentences": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "original":   { "type": "string" },              // câu gốc trước sửa
          "text":       { "type": "string" },              // câu sau khi dọn lỗi
          "corrected":  { "type": "boolean" },             // có sửa không
          "note":       { "type": "string" },              // sửa gì (rỗng nếu không)
          "confidence": { "enum": ["high","medium","low"] },
          "tokens": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "surface":       { "type": "string" },     // dạng trong câu (確認)
                "reading":       { "type": "string" },     // furigana hiragana (かくにん)
                "lemma":         { "type": "string" },     // dạng gốc
                "pos":           { "type": "string" },     // loại từ tiếng Việt
                "meaning_vi":    { "type": "string" },     // nghĩa theo ngữ cảnh
                "worthLearning": { "type": "boolean" }     // có đáng đào thẻ không
              },
              "required": ["surface","reading","pos","meaning_vi","worthLearning"]
            }
          }
        },
        "required": ["original","text","corrected","confidence","tokens"]
      }
    }
  },
  "required": ["sentences"]
}
```

## 4. Prompt (bản nháp — bạn chuẩn bị/chỉnh)

> Bạn là chuyên gia tiếng Nhật & biên tập. Dưới đây là transcript (có thể có lỗi
> nhận dạng giọng nói). Hãy xử lý và TRẢ VỀ ĐÚNG JSON theo schema:
>
> 1. **Dọn lỗi dè dặt**: chỉ sửa lỗi nhận dạng rõ ràng. Giữ nguyên câu gốc ở
>    `original`, đặt câu đã sửa ở `text`, ghi lý do ở `note`. **Không chắc thì
>    GIỮ NGUYÊN** và đặt `confidence: "low"` — tuyệt đối không đoán bừa hay bịa nội dung.
> 2. **Tách câu** tự nhiên; bỏ nhãn người nói (vd 田中：).
> 3. **Tách từ**: mỗi `token` gồm `surface`, `reading` (hiragana), `lemma`,
>    `pos` (loại từ bằng tiếng Việt: danh từ / động từ / tính từ / trợ từ...),
>    `meaning_vi` (nghĩa tiếng Việt **theo ngữ cảnh câu**).
> 4. **Đánh dấu** `worthLearning: true` cho từ nội dung đáng học; `false` cho
>    trợ từ, số, dấu câu, tên riêng.
>
> Chỉ trả JSON, không giải thích thêm.

## 5. Chunking (văn dài)
- Văn dài vượt context → chia theo **lượt nói / đoạn**, gọi nhiều lần, rồi **ghép**
  mảng `sentences`.
- Giữ ranh giới câu trọn vẹn khi chia (không cắt giữa câu).

## 6. Độ tin cậy & xử lý lỗi
- Ràng buộc đầu ra bằng **JSON schema** (response_format/structured output) +
  validate; nếu sai định dạng → **retry** (có thể hạ nhiệt độ, nhắc lại schema).
- `confidence: low` → câu được highlight ở màn **Duyệt & sửa** (xem [10](10-transcript-quality.md)).

## 7. Tùy chọn mở rộng
- Thêm trường `difficulty`/`jlpt` cho mỗi token để hỗ trợ i+1 (xem [08](08-smart-word-selection.md)).
- Thêm `translation` (dịch cả câu) nếu muốn hiển thị nghĩa câu.
- Sau này có thể thêm **Kuromoji làm bộ kiểm tra furigana** (đối chiếu, cảnh báo lệch).

## 8. Câu hỏi mở
- Nhiệt độ (temperature) cho Ingest? (thấp để ổn định)
- Có cache theo (lemma, reading) để đồng nhất nghĩa giữa các tài liệu không?
- Mức chi tiết `pos` (thô: danh/động/tính... hay chi tiết hơn)?
