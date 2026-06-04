# GSD Phase 5 — Auth + Admin + Dashboard + Deploy

> Phase này khoá lại lớp **xác thực + phân quyền**, dựng **trang Admin** (gồm
> trình sửa `app_settings` runtime), **Dashboard tiến độ**, và **triển khai
> server riêng** (Node + PostgreSQL tự host sau reverse proxy + TLS, sao lưu
> `pg_dump`). Bám sát [02-architecture.md](../docs/02-architecture.md),
> [03-data-model.md](../docs/03-data-model.md),
> [04-features.md](../docs/04-features.md).

## Mục tiêu

Hoàn thành các tính năng auth/quản trị/triển khai để WorkLingo chạy được trên
server thật, có người dùng thật, bảo mật dữ liệu theo `user_id`:

- **F1 — Đăng nhập:** Auth.js (NextAuth) + Drizzle adapter, đăng nhập
  **Email/Password** và **Google OAuth**, trang `/login`, vào `/dashboard`.
- **F1b — Quên mật khẩu:** `/forgot` nhập email → gửi email link đặt lại (token
  hết hạn) → `/reset-password` đặt mật khẩu mới.
- **F1c — Đổi mật khẩu:** `/change-password` cho người đã đăng nhập (mật khẩu
  hiện tại + mới + xác nhận, validate ≥8 ký tự + khớp).
- **F1d — Trang Admin:** `/admin` (chỉ `role = admin`): thống kê tổng, quản lý
  người dùng (bảng + tìm kiếm + khoá/mở khoá), tab Nội dung, và **trình sửa
  `app_settings` runtime** (đọc/ghi qua `lib/config`, invalidate cache).
- **F6 — Auth & bảo vệ route:** middleware bảo vệ route, lọc `user_id` ở tầng
  `lib/repositories`, thêm cột `users.role` và cờ khoá tài khoản.
- **F5/F7 — Dashboard tiến độ:** `/dashboard` hiển thị streak, tổng XP, số thẻ
  đến hạn hôm nay, tổng số thẻ — **và danh sách tài liệu (`sources`) của user làm
  entry point quay lại `/study?source=<id>`** (pages-routes §3/§5.2/§9.2: danh sách
  source nằm trên Dashboard, không có `/library` riêng ở MVP).
- **Deploy:** server riêng (Node + PostgreSQL tự host) sau reverse proxy
  (nginx/Caddy) + TLS, script sao lưu `pg_dump` định kỳ.

## Phụ thuộc

Phase này phụ thuộc **[1, 2, 3, 4]** phải hoàn thành trước:

| Phase | Vì sao cần trước Phase 5 |
|-------|--------------------------|
| **1 — Nền tảng / DB / config** | `lib/db` (Drizzle + postgres.js), `lib/config` (đọc `app_settings`, cache + fallback), và bảng `app_settings` đã có thì trình sửa Admin (F1d) mới có chỗ ghi và invalidate. Auth.js Drizzle adapter cần kết nối DB sẵn sàng. |
| **2 — AI Ingest + import** | Admin "tab Nội dung" và thống kê "số tài liệu / lượt AI" cần `sources`/`sentences` đã tồn tại để đếm. |
| **3 — Học & sentence mining** | Bảng `notes`, `cards`, `user_words` đã có thì thống kê Admin "số thẻ" và lọc `user_id` trong repository mới có dữ liệu thật để bảo vệ. |
| **4 — Ôn tập SRS + gamification** | Dashboard (F5/F7) đọc `user_stats` (XP, streak) và `cards` đến hạn (`fsrs_state->>'due'`) do Phase 4 sinh ra. Không có Phase 4 thì Dashboard rỗng. |

> Nói cách khác: Phase 5 là lớp "vỏ bọc" (ai được xem gì, ai quản trị, deploy ra
> sao) phủ lên dữ liệu/logic do Phase 1–4 tạo. Auth phải có TRƯỚC khi mở ra
> internet, nên Phase 5 đứng cuối lộ trình MVP.

## Quyết định triển khai (discuss-phase)

Các điểm "xám" và lựa chọn đã chốt, có lý do bám docs:

### QĐ1 — Chiến lược session: JWT, không Database Session
- **Chốt:** Auth.js dùng `session.strategy = "jwt"`.
- **Lý do:** Credentials Provider (Email/Password) của Auth.js **không** hỗ trợ
  database session — buộc phải JWT. Dùng JWT đồng nhất cho cả Credentials lẫn
  Google tránh hai cơ chế song song. `lib/auth.ts` vẫn dùng Drizzle adapter để
  lưu `users`/`accounts`/`verification_tokens` (03-data-model §4), riêng
  `sessions` sẽ không được dùng cho phiên (giữ bảng do adapter tạo, để mang đi
  được). `role` và trạng thái khoá nhồi vào token qua callback `jwt`/`session`.

### QĐ2 — Mật khẩu lưu trong bảng `users`, hash bằng bcrypt
- **Chốt:** Phase 5 chỉ THÊM 3 cột vào `users`: `password_hash` (text, nullable)
  + `users.disabled` (bool, default false) + `users.created_at`. Cột `users.role`
  (`pgEnum('role', ['user','admin'])`, default `user`) **đã được tạo ở Phase 1**
  (QĐ-9 Phase 1) → Phase 5 **giữ nguyên, không khai lại, không đổi kiểu**. Hash
  bằng `bcryptjs` (cost 10).
- **Lý do:** Drizzle adapter của Auth.js không tự quản mật khẩu (OAuth-first).
  Email/Password (F1, F1c) cần một chỗ lưu hash → đặt ngay trong `users` cho gọn
  (03-data-model nói rõ `users` "có thêm cột `role`" + "trạng thái khoá/mở"). Cột
  nullable vì user đăng nhập bằng Google sẽ không có mật khẩu. `bcryptjs` (thuần
  JS) tránh phụ thuộc native `bcrypt` khó build trên server tự host. Giữ `role`
  bằng `pgEnum` đã có để tránh migration enum→text mâu thuẫn (xem task "Mở rộng
  schema users").

### QĐ3 — Email reset password: bảng token riêng + adapter mặc định nodemailer
- **Chốt:** Token đặt lại mật khẩu dùng lại bảng `verification_tokens` (đã có do
  adapter) với `identifier = "reset:<email>"`, `expires` = +30 phút; gửi mail qua
  `nodemailer` đọc `SMTP_*` từ **env** (secret) — KHÔNG đưa SMTP vào
  `app_settings` (vì chứa credential).
- **Lý do:** 04-features F1b yêu cầu "link đặt lại (token hết hạn)". Tái dùng
  `verification_tokens` tránh thêm bảng. SMTP là secret bootstrap → theo nguyên
  tắc 02-architecture §7 "chỉ secret ở env". Ở môi trường dev chưa có SMTP, log
  link ra console (cờ `feature_flags.email_console_fallback` trong `app_settings`).

### QĐ4 — Bảo vệ route: middleware (lớp 1) + check trong Server Action/repository (lớp 2)
- **Chốt:** `middleware.ts` chặn route chưa đăng nhập (redirect `/login`) và chặn
  `/admin/*` nếu `role != admin`. NHƯNG mọi truy vấn dữ liệu vẫn lọc `user_id`
  trong `lib/repositories` (lớp phòng thủ thật sự), và mọi Server Action admin
  gọi `requireAdmin()` server-side.
- **Lý do:** 02-architecture §6 nói rõ "phân quyền ở tầng app, mọi repository
  luôn kèm `where user_id`". Middleware chỉ là UX/định tuyến, không thay thế việc
  lọc dữ liệu. Tránh tin tưởng JWT `role` ở edge — Server Action admin **đọc lại
  `role` từ DB** (token có thể cũ sau khi bị hạ quyền).

### QĐ5 — Trình sửa `app_settings` render form theo cột `type`, ghi qua repository + invalidate cache
- **Chốt:** Admin liệt kê toàn bộ key trong `app_settings`; render input theo
  `type` (`string`→text, `number`→number, `bool`→switch, `json`→textarea JSON có
  validate). Lưu qua `repositories/settings.updateAppSetting(key, value, userId)`
  → ghi `value/updated_at/updated_by` → gọi `config.invalidate()` để xoá cache
  `lib/config`.
- **Lý do:** 03-data-model §4 định nghĩa cột `type` chính là để "render form
  Admin". 02-architecture §8: `lib/config` cache TTL ngắn + "cơ chế invalidate
  khi Admin sửa setting". KHÔNG cho Admin sửa secret (DATABASE_URL/AUTH_SECRET/key
  ở env) — trình sửa chỉ thao tác trên các key không-secret trong DB.

### QĐ6 — Khoá tài khoản = cờ `users.disabled`, chặn ngay tại đăng nhập + chặn phiên đang mở
- **Chốt:** Admin bấm "Khoá" → set `users.disabled = true`. Credentials/Google
  `signIn` callback từ chối nếu `disabled`. Với phiên JWT đang mở: callback
  `session` đọc lại `disabled` từ DB mỗi lần và buộc đăng xuất nếu true (hoặc rút
  ngắn `maxAge` để hiệu lực sớm).
- **Lý do:** 04-features F1d "khoá/mở khoá tài khoản". Vì JWT stateless, không
  revoke được ngay → bù bằng việc đọc lại DB trong callback `session`. Đánh đổi:
  thêm 1 query nhẹ mỗi request có phiên (chấp nhận được với app self-host).

### QĐ7 — Streak timezone: một giá trị duy nhất, một nơi seed
- **Chốt:** Trả lời "câu hỏi mở" của 04-features §5: streak/`last_studied_date`
  tính theo timezone lấy từ `app_settings.app_timezone`. **Giá trị chốt duy nhất
  toàn hệ thống: `"Asia/Ho_Chi_Minh"`** (WorkLingo phục vụ người Việt — căn cứ
  `userEmail` `@aureole-it.vn`; đây cũng là giá trị fallback cứng trong
  `lib/config`).
- **Một nơi seed duy nhất — đồng bộ với Phase 4:** Phase 4 (QĐ5 + QĐ10 + task seed)
  đã được **chốt lại giá trị `app_timezone = "Asia/Ho_Chi_Minh"`** trong module
  DEFAULTS duy nhất `lib/config/defaults.ts` (`APP_SETTINGS_DEFAULTS`). Để KHÔNG còn
  hai luồng tính streak/dueToday theo hai timezone khác nhau (review P4 vs dashboard
  P5), **chốt:**
  - Phase 4 là **nơi seed gốc** của key này (qua DEFAULTS), giá trị `"Asia/Ho_Chi_Minh"`
    là fallback cứng duy nhất (cũng lấy từ DEFAULTS, không khai rải rác).
  - Phase 5 **KHÔNG seed lại** `app_timezone` (chỉ ensure tồn tại idempotent, xem
    task "Seed app_settings cho timezone + email fallback").
  - Cả luồng review (P4 `recordStudyDay`) lẫn dashboard (P5 `getDashboard.dueToday`)
    đọc CÙNG `config.get('app_timezone')` → tuyệt đối nhất quán.
  > **Lưu ý:** Phase 4 plan đã đồng bộ giá trị này (không còn `"Asia/Tokyo"`). Nếu DB
  > dev lỡ seed `"Asia/Tokyo"` từ bản kế hoạch cũ, chạy 1 lệnh update/Admin sửa
  > runtime về `"Asia/Ho_Chi_Minh"`.
- **Lý do:** Dashboard (F5) hiển thị streak phải nhất quán với luồng ôn (P4). MVP
  một thị trường → một timezone hệ thống là đủ, để per-user TZ sang GĐ sau. Đặt
  trong `app_settings` để Admin chỉnh được runtime mà không deploy lại (đúng tinh
  thần 02 §7); seed một nơi (Phase 4) tránh hai giá trị mâu thuẫn.

### QĐ8 — Thống kê "lượt AI/tháng": đếm `sources.created_at` trong tháng hiện tại
- **Chốt:** "Lượt AI/tháng" ≈ số `sources` được tạo trong tháng hiện tại (mỗi
  import = 1+ lượt gọi gpt-4o). Không thêm bảng log AI riêng ở Phase này.
- **Lý do:** 03-data-model không có bảng log AI; thêm bảng mới sẽ phình scope
  Phase 5. `sources` là proxy đủ tốt cho MVP; nếu cần đo chính xác (số chunk) thì
  để GĐ sau. Ghi chú rõ trong UI là "ước lượng theo số tài liệu".

### QĐ9 — Deploy: PM2 chạy Node `next start` + Caddy reverse proxy (TLS tự động)
- **Chốt:** Build production `next build && next start` chạy dưới **PM2**
  (auto-restart, log). Reverse proxy dùng **Caddy** (TLS Let's Encrypt tự động,
  cấu hình ngắn) đứng trước cổng app. PostgreSQL tự host qua `docker-compose.yml`
  (đã có, postgres:18). Backup: cron gọi `pg_dump` nén `.sql.gz`, giữ N ngày.
- **Lý do:** 02-architecture §8 yêu cầu "server riêng sau reverse proxy, TLS, sao
  lưu pg_dump", "long-running (không serverless) → connection pool postgres.js".
  Caddy giảm công sức TLS so với nginx + certbot. Tài liệu hoá, không cần hạ tầng
  cloud-specific (chống lock-in).

## Kế hoạch task nguyên tử (plan-phase)

> Mỗi task nhỏ, độc lập, commit riêng được. Đường dẫn bám
> [02-architecture.md §4](../docs/02-architecture.md). Giả định Phase 1–4 đã tạo
> `lib/db`, `lib/config`, `lib/repositories`, schema cơ bản, các trang học/ôn.

<task type="auto">
  <name>Mở rộng schema users + migration auth</name>
  <files>lib/db/schema.ts, drizzle/ (migration mới)</files>
  <action>Trong lib/db/schema.ts: bảo đảm có đủ bảng Auth.js (users, accounts, sessions, verification_tokens) theo chuẩn @auth/drizzle-adapter. **Cột `users.role` ĐÃ tồn tại từ Phase 1** — khai bằng `pgEnum('role', ['user','admin'])` default `'user'` (QĐ-9 Phase 1 + 03-data-model §4). **TUYỆT ĐỐI KHÔNG khai lại `role` (và không đổi sang `text`)** ở Phase này; nếu đổi kiểu enum→text trên cột đã tồn tại, `drizzle-kit generate` sẽ sinh ALTER mâu thuẫn (Postgres không cast enum→text trực tiếp) → migration vỡ. Phase 5 CHỈ THÊM 3 cột mới vào bảng users: passwordHash text (nullable), disabled boolean not null default false, createdAt timestamptz not null default now(). Sinh migration bằng `npx drizzle-kit generate` và đặt file vào drizzle/. Bám 03-data-model §4 (users có role enum, trạng thái khoá, ngày tham gia).</action>
  <verify>Chạy `npx drizzle-kit generate` không lỗi; mở file SQL mới trong drizzle/ thấy ALTER ADD COLUMN cho password_hash, disabled, created_at — và KHÔNG có ALTER nào động vào cột role (không có `ALTER COLUMN role TYPE ...`).</verify>
  <done>Migration tồn tại trong drizzle/; `npx drizzle-kit migrate` áp được lên DB dev; psql `\d users` thấy 3 cột mới (password_hash, disabled, created_at) và cột role giữ nguyên kiểu enum `role` từ Phase 1.</done>
</task>

<task type="auto">
  <name>Seed app_settings cho timezone + email fallback</name>
  <files>lib/db/seed.ts (hoặc drizzle/seed), lib/config.ts (defaults)</files>
  <action>**app_timezone đã được seed ở Phase 4 (nơi seed gốc, QĐ7) — Phase 5 KHÔNG seed lại, không ghi đè value.** Trước khi tiếp, xác nhận seed Phase 4 đã đổi giá trị `app_timezone` sang `"Asia/Ho_Chi_Minh"` (xem QĐ7 + lưu ý đồng bộ ngược Phase 4); nếu chưa, sửa Phase 4 trước. Nhiệm vụ Phase này: (1) trong lib/config.ts đặt default fallback cứng `app_timezone = "Asia/Ho_Chi_Minh"` TRÙNG với value seed Phase 4 (không được lệch giá trị, theo QĐ7); (2) chỉ ensure idempotent (`onConflictDoNothing`) `app_timezone` nếu DB hoàn toàn chưa có row (trường hợp chạy seed Phase 5 trên DB trống mà bỏ qua Phase 4) — với cùng value `"Asia/Ho_Chi_Minh"`, KHÔNG dùng update/onConflictDoUpdate để tránh đè giá trị Admin/Phase 4. **XP — dùng đúng MỘT key chuẩn `xp_per_review`** (json, đã do Phase 4 seed/định nghĩa trong DEFAULTS — QĐ10 Phase 4). **TUYỆT ĐỐI KHÔNG tạo `xp_per_correct`** (tên đồng nghĩa gây drift): Dashboard cần "XP mỗi lượt ôn đúng" thì đọc `xp_per_review` qua lib/config và lấy `.good` (= `.easy`, mặc định 10). Nếu key/giá trị mới của Phase này (vd cờ `feature_flags.email_console_fallback`, default true ở dev) còn thiếu → bổ sung **vào module DEFAULTS duy nhất** `lib/config/defaults.ts` (`APP_SETTINGS_DEFAULTS`, lập từ Phase 4), KHÔNG khai danh sách key song song. Giữ nguyên các key Phase 1/3/4. Seed lặp qua APP_SETTINGS_DEFAULTS với onConflictDoNothing (idempotent, không đè value Admin).</action>
  <verify>Chạy seed (idempotent); psql `select key,value,type from app_settings where key='app_timezone';` thấy đúng MỘT row value `"Asia/Ho_Chi_Minh"` (không bị Phase 5 ghi đè/nhân đôi); gọi config.get('app_timezone') trả "Asia/Ho_Chi_Minh"; xoá row rồi gọi lại → fallback cũng trả "Asia/Ho_Chi_Minh"; grep -rn "xp_per_correct" lib/ app/ (ngoài node_modules) trả rỗng (XP chỉ dùng key `xp_per_review`).</verify>
  <done>app_settings có đúng một row app_timezone = "Asia/Ho_Chi_Minh" (seed gốc từ Phase 4, không bị Phase 5 ghi đè); lib/config fallback cùng giá trị; review (P4) và dashboard (P5) đọc cùng một timezone; KHÔNG có key xp_per_correct — Dashboard đọc XP qua `xp_per_review`.</done>
</task>

<task type="auto">
  <name>Cấu hình Auth.js core (lib/auth.ts)</name>
  <files>lib/auth.ts, auth.config.ts (nếu tách edge), .env.example</files>
  <action>Tạo lib/auth.ts dùng NextAuth v5: DrizzleAdapter(db) trỏ tới schema users/accounts/sessions/verification_tokens; session.strategy='jwt' (QĐ1); providers: Google (đọc AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET) và Credentials (email+password, verify bằng bcryptjs so với users.passwordHash). Callbacks: signIn từ chối nếu user.disabled (QĐ6); jwt nhồi token.role + token.uid; session đọc lại role+disabled từ DB qua repository và gắn vào session.user, ép đăng xuất nếu disabled. Export handlers, auth, signIn, signOut. Cập nhật .env.example: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, SMTP_HOST/PORT/USER/PASS/FROM, OPENAI_API_KEY, DATABASE_URL.</action>
  <verify>`npm run build` không lỗi type cho lib/auth.ts; import { auth } từ lib/auth.ts trong một route test trả session/null.</verify>
  <done>lib/auth.ts export đủ handlers/auth/signIn/signOut; bcryptjs + @auth/drizzle-adapter cài trong package.json.</done>
</task>

<task type="auto">
  <name>Route handler Auth.js</name>
  <files>app/api/auth/[...nextauth]/route.ts</files>
  <action>Tạo route handler export { GET, POST } = handlers từ lib/auth.ts. Bám cấu trúc 02-architecture §4 (app/api/auth/[...nextauth]/).</action>
  <verify>`curl -s http://localhost:3000/api/auth/providers` trả JSON liệt kê google + credentials.</verify>
  <done>Endpoint /api/auth/* phản hồi; providers gồm google và credentials.</done>
</task>

<task type="auto">
  <name>Repository users (auth + admin)</name>
  <files>lib/repositories/users.ts</files>
  <action>Tạo lib/repositories/users.ts với: getUserByEmail(email), createUserWithPassword({email,name,passwordHash}), getUserById(id), setUserPasswordHash(userId,hash), setUserRole/setUserDisabled (cho Admin), listUsers({search,limit,offset}) trả tên/email/role/disabled/createdAt + join user_stats.streak, countUsers(). Mọi hàm dữ liệu thường (không-admin) đảm bảo lọc theo điều kiện rõ ràng. KHÔNG để UI gọi db trực tiếp (02-architecture §3).</action>
  <verify>Viết test nhỏ hoặc gọi từ một script: createUserWithPassword rồi getUserByEmail trả đúng; listUsers({search}) lọc theo email.</verify>
  <done>lib/repositories/users.ts export đủ hàm; build pass; truy vấn chạy trên DB dev.</done>
</task>

<task type="auto">
  <name>Helper phân quyền server-side (requireUser / requireAdmin)</name>
  <files>lib/auth-helpers.ts</files>
  <action>Tạo lib/auth-helpers.ts: getCurrentUser() đọc session qua auth(); requireUser() ném redirect /login nếu chưa đăng nhập; requireAdmin() đọc lại role từ DB (repositories/users.getUserById) và ném notFound()/redirect nếu role!='admin' hoặc disabled (QĐ4, QĐ6). Đây là cổng dùng trong mọi Server Action/trang admin.</action>
  <verify>Gọi requireAdmin() trong một Server Action test với user thường → bị chặn; với admin → qua.</verify>
  <done>lib/auth-helpers.ts export getCurrentUser/requireUser/requireAdmin; admin check đọc role từ DB không chỉ từ token.</done>
</task>

<task type="auto">
  <name>Middleware bảo vệ route</name>
  <files>middleware.ts</files>
  <action>Tạo middleware.ts dùng auth từ lib/auth.ts: route công khai (/login, /forgot, /reset-password, /api/auth/*) cho qua; route khác yêu cầu đăng nhập (redirect /login?callbackUrl=...); /admin và /admin/* yêu cầu token.role=='admin' (nếu không → redirect /dashboard). Khai matcher loại trừ _next/static, assets. Đây là lớp 1 (QĐ4), không thay cho lọc user_id ở repository.</action>
  <verify>Mở /dashboard khi chưa đăng nhập → redirect /login; mở /admin bằng user thường → redirect /dashboard.</verify>
  <done>middleware.ts chặn đúng theo trạng thái đăng nhập và role; route auth công khai vẫn vào được.</done>
</task>

<task type="auto">
  <name>Trang /login (Email + Google)</name>
  <files>app/(auth)/login/page.tsx, app/(auth)/login/actions.ts, components/AuthForm.tsx</files>
  <action>Tạo trang /login (server component) + form client dùng .wl-input cho email/password và .btn-3d .btn-primary cho "Đăng nhập", nút "Đăng nhập với Google" gọi signIn('google'). Server Action loginWithCredentials gọi signIn('credentials', {redirectTo:'/dashboard'}); báo lỗi sai mật khẩu/tài khoản khoá. Có link "Quên mật khẩu?" → /forgot. Dùng theme Duolingo (05-design-system, components chuẩn .wl-card).</action>
  <verify>Mở /login: thấy form email/password + nút Google + link Quên mật khẩu; đăng nhập đúng → /dashboard; sai → báo lỗi.</verify>
  <done>Đăng nhập Email/Password và Google đều dẫn vào /dashboard; sai thông tin hiện lỗi; tài khoản disabled bị chặn.</done>
</task>

<task type="auto">
  <name>Trang /forgot (quên mật khẩu)</name>
  <files>app/(auth)/forgot/page.tsx, app/(auth)/forgot/actions.ts, lib/email.ts, lib/repositories/password-reset.ts</files>
  <action>Tạo lib/email.ts (nodemailer đọc SMTP_* từ env; nếu feature_flags.email_console_fallback thì console.log link thay vì gửi). Tạo repositories/password-reset.ts: createResetToken(email) tạo token ngẫu nhiên (crypto.randomUUID hoặc 32 byte hex), lưu verification_tokens với identifier 'reset:'+email, expires +30 phút; consumeResetToken(email,token) kiểm tra còn hạn + xoá. Trang /forgot: form nhập email → Server Action gửi link /reset-password?token=...&email=... (luôn trả thông báo trung lập, không lộ email tồn tại hay không). Bám QĐ3.</action>
  <verify>Submit /forgot với email có thật → console (dev) in link reset; psql thấy row verification_tokens identifier 'reset:...'.</verify>
  <done>/forgot nhận email, tạo token hết hạn, gửi/log link reset; thông báo trung lập không tiết lộ tồn tại email.</done>
</task>

<task type="auto">
  <name>Trang /reset-password (đặt mật khẩu mới qua token)</name>
  <files>app/(auth)/reset-password/page.tsx, app/(auth)/reset-password/actions.ts</files>
  <action>Trang đọc token+email từ query; form nhập mật khẩu mới + xác nhận. Server Action: validate ≥8 ký tự + khớp; gọi consumeResetToken; nếu hợp lệ → hash bcryptjs → repositories/users.setUserPasswordHash; xoá token; redirect /login với thông báo thành công. Token sai/hết hạn → báo lỗi rõ.</action>
  <verify>Dùng link từ /forgot mở /reset-password → đặt mật khẩu mới → đăng nhập /login bằng mật khẩu mới thành công; dùng lại token cũ → báo hết hạn.</verify>
  <done>Đặt lại mật khẩu hoạt động, token dùng một lần, sau đó đăng nhập bằng mật khẩu mới.</done>
</task>

<task type="auto">
  <name>Trang /change-password (đổi mật khẩu khi đã đăng nhập)</name>
  <files>app/change-password/page.tsx, app/change-password/actions.ts</files>
  <action>Trang yêu cầu requireUser(). Form: mật khẩu hiện tại + mật khẩu mới + xác nhận (dùng .wl-input + .btn-3d). Server Action: lấy currentUser, verify mật khẩu hiện tại bằng bcryptjs với users.passwordHash (nếu user chỉ Google chưa có hash → cho phép đặt mật khẩu mới mà không cần hiện tại, thông báo phù hợp); validate đủ ô, ≥8 ký tự, hai ô mới khớp (04-features F1c); cập nhật setUserPasswordHash; báo thành công/lỗi.</action>
  <verify>Đăng nhập → /change-password → đổi đúng → đăng xuất → đăng nhập bằng mật khẩu mới OK; nhập sai mật khẩu hiện tại hoặc lệch xác nhận → báo lỗi.</verify>
  <done>Đổi mật khẩu cập nhật hash; validate ≥8 ký tự + khớp + đúng mật khẩu hiện tại; báo lỗi đúng trường hợp.</done>
</task>

<task type="auto">
  <name>Áp lọc user_id triệt để ở repositories nghiệp vụ</name>
  <files>lib/repositories/cards.ts, lib/repositories/sources.ts, lib/repositories/stats.ts, lib/repositories/settings.ts</files>
  <action>Rà toàn bộ hàm đọc/ghi dữ liệu người dùng (getCards/getDue/saveCard, sources/sentences, getStats, user_settings) bảo đảm MỌI hàm nhận userId và thêm where user_id = userId (02-architecture §6). Đổi chữ ký hàm còn thiếu userId. KHÔNG để hàm nào trả dữ liệu xuyên user. Viết test khẳng định user A không đọc được card của user B.</action>
  <verify>Chạy test repository: tạo 2 user, mỗi user 1 card; getCards(userA) chỉ trả card của A. `npm test` (hoặc script) pass.</verify>
  <done>Test chứng minh cô lập dữ liệu theo user_id; không hàm repository nào thiếu điều kiện user_id.</done>
</task>

<task type="auto">
  <name>Repository stats cho Dashboard</name>
  <files>lib/repositories/stats.ts</files>
  <action>Bổ sung/khẳng định trong stats.ts: getDashboard(userId) trả { streak, xp, dueToday, totalCards } — streak+xp từ user_stats; totalCards = count cards của user (không suspended tuỳ chọn); dueToday = count cards user có fsrs_state->>'due' <= cuối ngày hôm nay theo app_timezone (QĐ7, dùng lib/config.get('app_timezone')). Index gợi ý cards(user_id, suspended, (fsrs_state->>'due')) theo 03-data-model §5. **Danh sách source cho Dashboard:** TÁI DÙNG `repositories/sources.listSources(userId)` (đã có chữ ký + lọc `where user_id` từ Phase 1 skeleton — task "Repository skeleton: sources, cards, stats") để liệt kê tài liệu của user; nếu Phase 1 còn để stub thì hiện thực hoá ở đây: select sources where userId order by createdAt desc, trả { id, title, type, createdAt } (tuỳ chọn join count sentences để hiển thị số câu). KHÔNG viết hàm trùng lặp trong stats.ts — Dashboard gọi thẳng sources.listSources(userId).</action>
  <verify>Gọi getDashboard(userId) sau khi seed vài card due hôm nay → dueToday đúng; totalCards đúng. Gọi sources.listSources(userId) trả đúng danh sách source của user (không lẫn source user khác).</verify>
  <done>getDashboard trả 4 trường đúng số; dueToday tính theo app_timezone; sources.listSources(userId) hiện thực (không còn stub) trả danh sách source lọc theo user_id cho Dashboard dùng.</done>
</task>

<task type="auto">
  <name>Trang /dashboard (tiến độ + danh sách tài liệu)</name>
  <files>app/dashboard/page.tsx, components/StatCard.tsx, components/SourceList.tsx</files>
  <action>Trang server component requireUser(); gọi repositories/stats.getDashboard(currentUser.id) VÀ repositories/sources.listSources(currentUser.id). Render 4 thẻ .wl-card: 🔥 Streak, ⭐ Tổng XP, 📅 Thẻ đến hạn hôm nay, 🃏 Tổng số thẻ (04-features F5). Có nút .btn-3d .btn-primary "Bắt đầu ôn" → /review (nổi bật nếu dueToday>0). **Bên dưới 4 StatCard, render khối "Tài liệu của bạn" (component SourceList):** mỗi source là 1 .wl-card hiển thị tiêu đề + .wl-badge loại nguồn (chat/meeting/youtube/text) + ngày tạo (+ số câu nếu có), bấm vào → link `/study?source=<id>` (entry point quay lại học source cũ — pages-routes §3/§9.2: giải quyết việc sau import lần đầu user mất đường về /study). Có nút/link "+ Thêm tài liệu" → /import. **Trạng thái rỗng:** chưa có source → .wl-card rỗng "Chưa có tài liệu nào" + CTA → /import. Mobile-first một cột (05-design-system). Tôn trọng prefers-reduced-motion cho mọi animate.</action>
  <verify>Đăng nhập → /dashboard hiển thị 4 con số khớp DB; nút Bắt đầu ôn dẫn /review; thấy danh sách source của user, bấm một source → mở /study?source=<id> đúng; user mới chưa import thấy trạng thái rỗng + CTA Thêm tài liệu.</verify>
  <done>/dashboard hiện streak/XP/thẻ đến hạn/tổng thẻ đúng dữ liệu user hiện tại + danh sách tài liệu của user làm entry point sang /study?source=<id> (và /import); chỉ liệt kê source của user hiện tại; bố cục theme Duolingo.</done>
</task>

<task type="auto">
  <name>Repository admin (thống kê + nội dung)</name>
  <files>lib/repositories/admin.ts</files>
  <action>Tạo lib/repositories/admin.ts (chỉ gọi sau requireAdmin): getGlobalStats() → { totalUsers, totalSources, totalCards, aiThisMonth } trong đó aiThisMonth = count sources có created_at trong tháng hiện tại (QĐ8); listContent({search,limit,offset}) → tài liệu toàn hệ thống (sources join users: title, type, owner email, số câu, created_at). Các hàm này CỐ Ý không lọc user_id (phạm vi admin) nhưng chỉ truy cập qua requireAdmin.</action>
  <verify>Gọi getGlobalStats() → 4 số khớp `select count(*)`; listContent({search}) lọc theo title/email.</verify>
  <done>admin.ts trả thống kê toàn cục + danh sách nội dung; chỉ dùng được sau requireAdmin.</done>
</task>

<task type="auto">
  <name>Server Actions quản lý user (khoá/mở/đổi role)</name>
  <files>app/admin/actions.ts</files>
  <action>Tạo Server Actions: setDisabled(userId, value) và setRole(userId, role) — mỗi action gọi requireAdmin() đầu tiên (QĐ4), chặn admin tự khoá/hạ quyền chính mình (tránh khoá hết admin), gọi repositories/users.setUserDisabled/setUserRole, revalidatePath('/admin'). Trả kết quả để UI cập nhật.</action>
  <verify>Là admin: khoá một user thường → users.disabled=true; user đó đăng nhập bị từ chối (QĐ6). Thử khoá chính mình → bị chặn.</verify>
  <done>Khoá/mở khoá + đổi role hoạt động qua action; không cho admin tự khoá/hạ quyền mình; user thường không gọi được action.</done>
</task>

<task type="auto">
  <name>Server Action sửa app_settings + invalidate cache</name>
  <files>app/admin/settings/actions.ts, lib/repositories/settings.ts, lib/config.ts</files>
  <action>Trong settings.ts thêm getAllAppSettings() và updateAppSetting(key,value,updatedBy) (ghi value/updated_at/updated_by, theo 03-data-model §4). Trong config.ts bổ sung invalidate() xoá cache (02-architecture §8). Server Action updateSetting(key, rawValue): requireAdmin(); ép kiểu theo cột type (string/number/bool/json), validate JSON nếu type=json; gọi updateAppSetting; gọi config.invalidate(); revalidatePath('/admin/settings'). KHÔNG cho sửa secret (các key này không nằm trong app_settings nên đương nhiên không xuất hiện).</action>
  <verify>Sửa openai_model qua action → psql thấy value đổi + updated_at mới; gọi config.get('openai_model') ngay sau trả giá trị mới (cache đã invalidate).</verify>
  <done>Sửa được app_settings runtime; lib/config phản ánh giá trị mới ngay không cần restart; chỉ admin gọi được.</done>
</task>

<task type="auto">
  <name>Trang /admin layout + bảo vệ + tab</name>
  <files>app/admin/layout.tsx, app/admin/page.tsx</files>
  <action>app/admin/layout.tsx gọi requireAdmin() (chặn server-side dù middleware đã chặn — phòng thủ kép QĐ4) và render thanh tab dùng .wl-chip: Thống kê (/admin), Người dùng (/admin/users), Nội dung (/admin/content), Cấu hình (/admin/settings). app/admin/page.tsx hiển thị 4 ô thống kê từ repositories/admin.getGlobalStats() (số người dùng, tài liệu, thẻ, lượt AI/tháng — ghi chú "ước lượng theo số tài liệu" cho lượt AI, QĐ8).</action>
  <verify>Admin mở /admin thấy 4 con số + 4 tab; user thường mở /admin bị chặn (redirect/notFound).</verify>
  <done>/admin chỉ admin vào được; trang Thống kê hiển thị đúng 4 số; tab điều hướng hoạt động.</done>
</task>

<task type="auto">
  <name>Trang /admin/users (bảng + tìm kiếm + khoá/mở)</name>
  <files>app/admin/users/page.tsx, components/admin/UserTable.tsx</files>
  <action>Trang requireAdmin(); đọc query ?q= để tìm kiếm; gọi repositories/users.listUsers({search}). Bảng .wl-card: tên, email, vai trò (.wl-badge), streak, ngày tham gia, trạng thái (Hoạt động/Đã khoá). Mỗi dòng nút Khoá/Mở khoá gọi Server Action setDisabled; nút đổi role gọi setRole (04-features F1d). Ô tìm kiếm .wl-input submit lọc theo tên/email.</action>
  <verify>Admin mở /admin/users thấy danh sách; gõ email vào tìm kiếm lọc đúng; bấm Khoá → trạng thái đổi sang Đã khoá ngay.</verify>
  <done>Bảng user có tìm kiếm + khoá/mở khoá + đổi role hoạt động và phản ánh ngay (revalidate).</done>
</task>

<task type="auto">
  <name>Trang /admin/content (tab Nội dung)</name>
  <files>app/admin/content/page.tsx, components/admin/ContentTable.tsx</files>
  <action>Trang requireAdmin(); gọi repositories/admin.listContent({search}); bảng: tiêu đề, loại nguồn (.wl-badge chat/meeting/youtube/text), chủ sở hữu (email), số câu, ngày tạo (04-features F1d tab Nội dung — chỉ theo dõi, không sửa nội dung của người khác ở MVP). Tìm kiếm theo tiêu đề/email.</action>
  <verify>Admin mở /admin/content thấy danh sách tài liệu toàn hệ thống kèm chủ sở hữu + số câu; tìm kiếm lọc đúng.</verify>
  <done>Tab Nội dung liệt kê sources toàn hệ thống với metadata; chỉ admin xem được.</done>
</task>

<task type="auto">
  <name>Trang /admin/settings (trình sửa app_settings runtime)</name>
  <files>app/admin/settings/page.tsx, components/admin/SettingForm.tsx</files>
  <action>Trang requireAdmin(); gọi repositories/settings.getAllAppSettings(); với mỗi key render control theo type (QĐ5): string→.wl-input text, number→.wl-input number, bool→switch/.wl-chip toggle, json→textarea (hiển thị JSON.stringify, validate khi lưu). Hiện description + updated_at + updated_by. Nút Lưu mỗi dòng (hoặc form chung) gọi Server Action updateSetting → invalidate cache. Cảnh báo nhỏ: "Đây là cấu hình hệ thống (không secret). Secret nằm ở biến môi trường."</action>
  <verify>Admin mở /admin/settings: đổi ingest_chunk_size thành số mới → Lưu → reload thấy giá trị mới; nhập JSON sai cho feature_flags → báo lỗi validate, không lưu.</verify>
  <done>Trình sửa hiển thị mọi key theo đúng kiểu, lưu được runtime, validate json, invalidate cache; secret không xuất hiện ở đây.</done>
</task>

<task type="auto">
  <name>Nút Đăng xuất + liên kết điều hướng auth</name>
  <files>components/UserMenu.tsx, app/layout.tsx (hoặc layout app chính)</files>
  <action>Tạo UserMenu hiển thị tên/email user (đọc session), link /change-password, link /admin (chỉ hiện nếu role=admin), nút Đăng xuất gọi signOut({redirectTo:'/login'}). Gắn vào header layout chính (không phải layout (auth)). Dùng .btn-3d .btn-neutral cho nút.</action>
  <verify>Đăng nhập → header hiện tên + menu; bấm Đăng xuất → về /login; user thường không thấy link /admin, admin thì thấy.</verify>
  <done>UserMenu hoạt động: đăng xuất, link đổi mật khẩu, link admin có điều kiện role.</done>
</task>

<task type="auto">
  <name>Script seed tài khoản admin đầu tiên</name>
  <files>scripts/create-admin.ts, package.json (script)</files>
  <action>Tạo scripts/create-admin.ts đọc tham số email+password (hoặc env ADMIN_EMAIL/ADMIN_PASSWORD), hash bcryptjs, upsert user với role='admin', tạo user_stats rỗng. Thêm npm script "create-admin". Dùng để bootstrap admin trên server mới (không có admin thì không vào /admin được).</action>
  <verify>`ADMIN_EMAIL=a@b.c ADMIN_PASSWORD=12345678 npm run create-admin` → psql thấy user role=admin; đăng nhập /login bằng tài khoản này vào được /admin.</verify>
  <done>Script tạo/nâng cấp một user thành admin; đăng nhập vào /admin thành công.</done>
</task>

<task type="auto">
  <name>Cấu hình deploy: PM2 + build production</name>
  <files>ecosystem.config.js, package.json (scripts start:prod), docs/deploy.md</files>
  <action>Tạo ecosystem.config.js (PM2): app name worklingo, script "npm run start", instances 1 (hoặc cluster nếu cần), env NODE_ENV=production, đọc .env. Thêm script build:prod = "next build", start:prod = "next start -p 3000". Viết docs/deploy.md mô tả: docker compose up -d (postgres:18 đã có trong docker-compose.yml), drizzle-kit migrate, create-admin, pm2 start ecosystem.config.js, pm2 save + startup. Nhấn dùng connection pool postgres.js (02-architecture §8).</action>
  <verify>`npm run build:prod` build thành công; `pm2 start ecosystem.config.js` chạy app, `pm2 status` thấy online; mở http://localhost:3000 phản hồi.</verify>
  <done>App production chạy dưới PM2 ổn định (auto-restart), docs/deploy.md mô tả đủ bước dựng từ máy trống.</done>
</task>

<task type="auto">
  <name>Reverse proxy Caddy + TLS</name>
  <files>Caddyfile, docs/deploy.md (bổ sung)</files>
  <action>Tạo Caddyfile: domain (vd worklingo.example.com) reverse_proxy localhost:3000; Caddy tự xin/renew TLS Let's Encrypt. Ghi chú mở port 80/443, đặt domain DNS A record. Bổ sung docs/deploy.md phần Caddy (cài, đặt Caddyfile, caddy run/systemd). Bám 02-architecture §8 (reverse proxy + TLS).</action>
  <verify>Trên server có domain: `caddy validate --config Caddyfile` OK; truy cập https://domain trả app qua TLS hợp lệ (chứng chỉ Let's Encrypt). Ở local: caddy validate pass.</verify>
  <done>Caddyfile hợp lệ, reverse proxy về app cổng 3000, TLS tự động; docs hướng dẫn rõ.</done>
</task>

<task type="auto">
  <name>Script sao lưu pg_dump định kỳ</name>
  <files>scripts/backup-db.sh, docs/deploy.md (bổ sung cron)</files>
  <action>Tạo scripts/backup-db.sh: đọc DATABASE_URL (hoặc biến PG*), chạy pg_dump (qua docker exec worklingo-postgres pg_dump hoặc pg_dump trực tiếp), nén gzip ra thư mục backups/ với tên worklingo-YYYYMMDD-HHMM.sql.gz, xoá bản cũ hơn N ngày (mặc định 14). chmod +x. Bổ sung docs/deploy.md mục crontab ví dụ "0 3 * * * /path/scripts/backup-db.sh". Bám 02-architecture §8 (sao lưu pg_dump định kỳ).</action>
  <verify>Chạy `bash scripts/backup-db.sh` → tạo file backups/worklingo-*.sql.gz; `gunzip -t` file hợp lệ; chạy lần 2 → file mới, file quá hạn bị xoá.</verify>
  <done>Backup tạo file .sql.gz hợp lệ, rotate theo số ngày; docs ghi cron ví dụ.</done>
</task>

<task type="auto">
  <name>Smoke test luồng auth + admin end-to-end</name>
  <files>docs/phase-5-acceptance.md (checklist chạy tay), (tùy chọn) tests/auth.e2e</files>
  <action>Viết checklist nghiệm thu (và/hoặc test Playwright tối thiểu): đăng ký admin bằng script → login Google + login email → /dashboard hiện số → /change-password đổi mật khẩu → /forgot+/reset-password → admin khoá user và xác nhận user bị chặn login → admin sửa app_settings và xác nhận lib/config đổi → user thường bị chặn /admin. Tham chiếu Tiêu chí hoàn thành Phase bên dưới.</action>
  <verify>Chạy hết checklist trên môi trường dev: tất cả bước pass; nếu có Playwright thì `npx playwright test` xanh.</verify>
  <done>Toàn bộ luồng auth/admin/dashboard chạy thông trên dev; checklist tick hết.</done>
</task>

## Components tạo/đụng trong phase

| Component | File | Mục đích |
|-----------|------|----------|
| AuthForm | `components/AuthForm.tsx` | Form đăng nhập Email/Password + nút Google (dùng `.wl-input`, `.btn-3d`) |
| StatCard | `components/StatCard.tsx` | Thẻ số liệu Dashboard (streak/XP/đến hạn/tổng thẻ) theo `.wl-card` |
| SourceList | `components/SourceList.tsx` | Danh sách tài liệu (`sources`) của user trên Dashboard, mỗi item link `/study?source=<id>` + `.wl-badge` loại nguồn; trạng thái rỗng → CTA `/import` |
| UserMenu | `components/UserMenu.tsx` | Menu user: tên/email, link đổi mật khẩu, link admin (theo role), Đăng xuất |
| UserTable | `components/admin/UserTable.tsx` | Bảng quản lý người dùng + tìm kiếm + khoá/mở/đổi role |
| ContentTable | `components/admin/ContentTable.tsx` | Bảng tab Nội dung: tài liệu toàn hệ thống + chủ sở hữu |
| SettingForm | `components/admin/SettingForm.tsx` | Trình sửa `app_settings`, render control theo cột `type` |

## Pages/Routes trong phase

| Route | Mô tả | Yêu cầu auth |
|-------|-------|--------------|
| `/login` | Đăng nhập Email/Password + Google, link Quên mật khẩu (F1) | Công khai |
| `/forgot` | Nhập email nhận link đặt lại (F1b) | Công khai |
| `/reset-password` | Đặt mật khẩu mới qua token (F1b) | Công khai (cần token hợp lệ) |
| `/change-password` | Đổi mật khẩu khi đã đăng nhập (F1c) | Đã đăng nhập |
| `/dashboard` | Streak, XP, thẻ đến hạn hôm nay, tổng thẻ + danh sách tài liệu (entry point sang `/study?source=<id>`, `/import`) (F5/F7) | Đã đăng nhập |
| `/admin` | Thống kê tổng + thanh tab (F1d) | `role = admin` |
| `/admin/users` | Bảng người dùng + tìm kiếm + khoá/mở/đổi role (F1d) | `role = admin` |
| `/admin/content` | Tab Nội dung: tài liệu toàn hệ thống (F1d) | `role = admin` |
| `/admin/settings` | Trình sửa `app_settings` runtime (F1d/F8) | `role = admin` |
| `/api/auth/[...nextauth]` | Route handler Auth.js (sign-in/out/callback) | Công khai (cơ chế auth) |

## Tiêu chí hoàn thành Phase (verify-work)

Checklist nghiệm thu quan sát được:

- [ ] **Đăng nhập Email/Password** đúng → vào `/dashboard`; sai → báo lỗi rõ.
- [ ] **Đăng nhập Google** (callback) tạo/đăng nhập user và vào `/dashboard`.
- [ ] **Bảo vệ route:** mở `/dashboard` khi chưa đăng nhập → redirect `/login`.
- [ ] **Phân quyền admin:** user thường mở `/admin` → bị chặn (redirect/notFound);
      admin vào được — và check `role` được đọc lại từ DB, không chỉ token.
- [ ] **Lọc dữ liệu theo user_id:** test repository chứng minh user A không thấy
      `cards/sources/stats` của user B (02-architecture §6).
- [ ] **Quên mật khẩu:** `/forgot` tạo token hết hạn (psql thấy `verification_tokens`),
      `/reset-password` đặt mật khẩu mới được; token dùng một lần.
- [ ] **Đổi mật khẩu:** `/change-password` validate ≥8 ký tự + khớp + đúng mật
      khẩu hiện tại; cập nhật hash; đăng nhập lại bằng mật khẩu mới OK.
- [ ] **Khoá/mở khoá:** admin khoá một user → user đó không đăng nhập được và
      phiên đang mở bị buộc đăng xuất (QĐ6); admin không tự khoá/hạ quyền mình.
- [ ] **Trình sửa app_settings:** đổi một key (vd `openai_model`/`ingest_chunk_size`)
      runtime → DB cập nhật + `lib/config.get` trả giá trị mới ngay (cache invalidate),
      không cần restart; secret KHÔNG xuất hiện trong trình sửa.
- [ ] **Dashboard:** `/dashboard` hiển thị streak, tổng XP, thẻ đến hạn hôm nay
      (theo `app_timezone`), tổng số thẻ — khớp dữ liệu user hiện tại.
- [ ] **Dashboard — danh sách tài liệu:** `/dashboard` liệt kê `sources` của user
      (chỉ của user hiện tại), bấm một source → mở `/study?source=<id>` (entry point
      quay lại học source cũ sau import); user mới chưa import → trạng thái rỗng +
      CTA `/import` (pages-routes §3/§5.2/§9.2).
- [ ] **Timezone nhất quán:** chỉ một row `app_settings.app_timezone` =
      `"Asia/Ho_Chi_Minh"` (seed gốc ở Phase 4, Phase 5 không ghi đè); streak (luồng
      review P4) và dueToday (dashboard P5) tính theo CÙNG timezone (QĐ7).
- [ ] **Schema users:** migration Phase 5 chỉ THÊM `password_hash/disabled/created_at`;
      cột `role` giữ kiểu `pgEnum('role',['user','admin'])` từ Phase 1 — migration
      KHÔNG có ALTER đổi kiểu `role` (không vỡ vì enum→text).
- [ ] **Thống kê Admin:** `/admin` hiện số người dùng/tài liệu/thẻ/lượt A/tháng;
      `/admin/content` liệt kê tài liệu toàn hệ thống + chủ sở hữu.
- [ ] **Deploy:** `npm run build:prod` thành công; app chạy dưới PM2 (`pm2 status`
      online); Caddy reverse proxy + TLS hợp lệ (`caddy validate` pass / HTTPS
      truy cập được trên server có domain).
- [ ] **Backup:** `scripts/backup-db.sh` tạo `.sql.gz` hợp lệ (`gunzip -t` OK) và
      rotate theo số ngày; có ví dụ cron trong `docs/deploy.md`.
- [ ] **Bootstrap admin:** `npm run create-admin` tạo được admin trên DB trống và
      đăng nhập vào `/admin` thành công.
