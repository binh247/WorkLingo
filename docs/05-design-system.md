# 05 — Hệ thống thiết kế (Duolingo-style)

> Mục tiêu: giao diện **vui nhộn, thân thiện, gây nghiện** kiểu Duolingo. ~70%
> cảm giác đến từ **cách style** (bo góc, màu, nút 3D, font), phần còn lại từ
> **animation + âm thanh + ăn mừng**.

## 1. Công nghệ thiết kế

| Vai trò | Công nghệ |
|---------|-----------|
| Component nền | shadcn/ui (custom theme mạnh) |
| Utility CSS | Tailwind CSS |
| Animation UI | Motion (framer-motion) |
| Hoạt cảnh/linh vật | lottie-react |
| Ăn mừng | canvas-confetti |
| Âm thanh | Howler.js |
| Font | Nunito (Google Fonts) |
| Icon | lucide-react |

## 2. Bảng màu (color tokens)

| Token | Màu gợi ý | Dùng cho |
|-------|-----------|----------|
| `primary` (green) | `#58CC02` | Hành động chính, đáp án đúng |
| `primary-dark` | `#46A302` | Viền dưới nút 3D (xanh) |
| `danger` (red) | `#FF4B4B` | Đáp án sai, mất mạng |
| `xp` (gold) | `#FFC800` | XP, thành tích |
| `info` (blue) | `#1CB0F6` | Liên kết, nhấn mạnh phụ |
| `bg` | `#FFFFFF` / `#F7F7F7` | Nền |
| `text` | `#3C3C3C` | Chữ chính |
| `muted` | `#AFAFAF` | Chữ phụ, viền nhạt |

> Định nghĩa làm CSS variables + map vào Tailwind theme để dễ đổi về sau.

## 3. Typography

- **Font:** Nunito (400 / 700 / 800 / 900).
- **Tiêu đề:** `font-extrabold`, kích thước lớn (`text-2xl`–`text-4xl`).
- **Nội dung:** `font-bold` cho cảm giác chắc chắn, dễ đọc.
- **Tiếng Nhật:** đảm bảo fallback font hỗ trợ kanji/kana (vd Noto Sans JP) cho
  phần hiển thị câu; furigana cỡ nhỏ phía trên (ruby text).

## 4. Hình khối & spacing

- **Bo góc lớn:** `rounded-2xl` cho card, `rounded-3xl` cho khối lớn, nút bo tròn.
- **Viền dày:** `border-2` tạo nét "sticker".
- **Khoảng trắng rộng:** padding thoáng, ít thông tin/màn → đỡ ngợp.

## 5. Component chữ ký: Nút 3D "nhấn được"

```html
<!-- ý tưởng Tailwind -->
<button class="bg-[#58CC02] text-white font-extrabold rounded-2xl
               border-b-4 border-[#46A302] px-6 py-3
               active:border-b-0 active:translate-y-1
               transition-all">
  TIẾP TỤC
</button>
```
- Trạng thái nghỉ: có "đáy" dày (`border-b-4`) → cảm giác nổi 3D.
- Khi nhấn: `border-b-0 translate-y-1` → như bị ấn xuống.

## 5b. ⭐ Bộ component chuẩn (BẮT BUỘC — để control đồng nhất)

> Mọi control PHẢI dùng các class chuẩn dưới đây thay vì tự chế (tránh tình
> trạng nút chỗ bo chỗ không, viền khác nhau). Đã định nghĩa sẵn trong CSS dùng
> chung của mockup (`mockups/index.html`) và là chuẩn cho code thật.

### Nút — `.btn-3d` + biến thể màu
`.btn-3d` đã **tự chứa**: bo góc `1rem`, padding `.75rem 1.5rem`, `font-weight 800`,
viền `2px` + đáy `4px`, hiệu ứng nhấn. Chỉ cần thêm **biến thể màu**:

| Class | Dùng cho | Màu |
|-------|----------|-----|
| `.btn-3d .btn-primary` | Hành động chính | xanh `#58CC02` |
| `.btn-3d .btn-info` | Hành động phụ nổi bật | xanh dương `#1CB0F6` |
| `.btn-3d .btn-danger` | Hành động nguy hiểm | đỏ `#FF4B4B` |
| `.btn-3d .btn-xp` | Thưởng/điểm | vàng `#FFC800` |
| `.btn-3d .btn-neutral` | Phụ/huỷ | trắng viền xám |
| thêm `.btn-sm` | nút nhỏ (trong bảng…) | — |

```html
<button class="btn-3d btn-primary">TIẾP TỤC</button>
<button class="btn-3d btn-neutral btn-sm">Khoá</button>
```

### Các control khác
| Class | Dùng cho |
|-------|----------|
| `.wl-input` | Ô nhập text/password/email (bo `1rem`, viền 2px, nền `#F7F7F7`, focus xanh dương) |
| `.wl-select` | Dropdown (cùng style với input) |
| `.wl-card` | Khối/thẻ nội dung (nền trắng, viền 2px, bo `1.5rem`) |
| `.wl-badge` | Nhãn tròn nhỏ (trạng thái, vai trò) |
| `.wl-chip` / `.wl-chip-on` | Chip lọc/tab (bo tròn; `-on` = đang chọn) |

> **Quy tắc vàng:** nút → luôn `.btn-3d` + 1 biến thể màu; ô nhập → `.wl-input`;
> dropdown → `.wl-select`; thẻ → `.wl-card`; nhãn → `.wl-badge`; chip/tab →
> `.wl-chip`. KHÔNG tự đặt bo góc/viền/padding rời rạc cho control.

## 6. Animation (Motion) — dùng đúng chỗ

| Tình huống | Hiệu ứng |
|-----------|----------|
| Chuyển trang/màn | fade + slide nhẹ |
| Progress bar tăng | width animate, easing mượt |
| Thẻ ôn lật đáp án | scale/flip ngắn |
| Đúng/sai | rung nhẹ (sai) / nảy nhẹ (đúng) |
| Hoàn thành buổi | Lottie nhân vật + confetti |

> **Nguyên tắc:** animation < 300ms cho phản hồi, không chặn thao tác; tránh lạm
> dụng gây chậm máy yếu.

## 7. Âm thanh (Howler.js)

| Sự kiện | Âm |
|---------|-----|
| Trả lời đúng | "ding" tươi |
| Trả lời sai | "buzz" nhẹ |
| Hoàn thành buổi | fanfare ngắn |

> Cho phép **tắt âm** trong cài đặt; tôn trọng chế độ im lặng.

## 8. Trạng thái phản hồi (feedback) khi ôn

- **Đúng:** nền xanh `primary`, icon ✓, âm "ding", +XP bay lên.
- **Sai:** nền đỏ `danger`, icon ✕, âm "buzz", hiện đáp án đúng.
- Phản hồi xuất hiện **tức thì**, rõ ràng, không mơ hồ.

## 9. Accessibility & responsive
- Tương phản màu đạt chuẩn (chữ trên nền màu).
- Hỗ trợ bàn phím cho thao tác ôn (phím số chấm Again/Hard/Good/Easy).
- Mobile-first: bố cục một cột, nút lớn dễ chạm.
- Tôn trọng `prefers-reduced-motion` → giảm animation cho người nhạy cảm.

## 10. Việc cần làm khi dựng theme (Sprint 1)
- [ ] Cài Nunito + cấu hình font trong Next.js.
- [ ] Khai báo color tokens (CSS vars) + map Tailwind theme.
- [ ] Tạo component `Button3D`, `ProgressBar`, `Card` theo phong cách trên.
- [ ] Cài Motion; tạo wrapper chuyển trang.
- [ ] Chuẩn bị asset: vài Lottie (ăn mừng) + file âm thanh đúng/sai.
