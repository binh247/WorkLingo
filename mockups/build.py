#!/usr/bin/env python3
"""Ghép các màn HTML do workflow sinh ra thành một file index.html bấm-chuyển-màn."""
import json
import os

SRC = "/private/tmp/claude-501/-Users-ongbinhit-working-source-WorkLingo/08d90647-34ba-4379-a200-2ce8ee071dcf/tasks/wmta8abtr.output"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

screens = {s["id"]: s for s in data["result"]["screens"]}

# ---------- VÁ LỖI (kết quả workflow kiểm thử) ----------
BUGFIXES = {
    # study: thiếu null-check chipRow -> có thể vỡ JS
    "study": [
        ("var chipRow = root.querySelector('#study-chip-row');",
         "var chipRow = root.querySelector('#study-chip-row'); if(!chipRow){ return; }"),
    ],
    # settings: selector escape '/' không khớp -> đổi sang quét span theo regex N1-5
    "settings": [
        ("""  window.settings_jlptChange = function (sel) {
    var badge = root.querySelector('section .rounded-full.bg-brand\\\\/15');
    // fallback: tìm huy hiệu N4 cạnh email
    if (!badge) {
      var badges = root.querySelectorAll('span.bg-brand\\\\/15');
      badges.forEach(function (s) { if (/^N[1-5]$/.test(s.textContent.trim())) badge = s; });
    }
    if (badge) badge.textContent = sel.value;
  };""",
         """  window.settings_jlptChange = function (sel) {
    var badge = null;
    root.querySelectorAll('span').forEach(function (s) { if (/^N[1-5]$/.test(s.textContent.trim())) badge = s; });
    if (badge) badge.textContent = sel.value;
  };"""),
    ],
}
for sid, repls in BUGFIXES.items():
    if sid in screens:
        h = screens[sid]["innerHtml"]
        for old, new in repls:
            if old in h:
                h = h.replace(old, new)
            else:
                print(f"  [WARN] bugfix pattern not found in {sid}: {old[:50]}...")
        screens[sid]["innerHtml"] = h

# ---------- MÀN MỚI (viết tay, dùng bộ component chuẩn) ----------
EXTRA = {
    "forgot": {
        "label": "Quên mật khẩu", "icon": "🔑", "fullbleed": True,
        "innerHtml": """
<div class="min-h-screen w-full flex items-center justify-center bg-[#F7F7F7] px-4 py-10">
  <div class="w-full max-w-md bounce-in">
    <div class="text-center mb-6">
      <div class="text-6xl mb-2">🔑</div>
      <h1 class="text-3xl font-extrabold text-ink">Quên mật khẩu</h1>
      <p class="text-muted font-bold mt-2">Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
    </div>
    <div class="wl-card p-6 sm:p-8">
      <label class="block text-sm font-bold text-muted mb-1 ml-1">Email</label>
      <input type="email" class="wl-input mb-5" placeholder="ban@congty.vn" />
      <button id="forgot-send" type="button" class="btn-3d btn-primary w-full text-lg uppercase tracking-wide">Gửi liên kết</button>
      <div id="forgot-done" class="hidden mt-4 text-center text-brand-dark font-bold bg-brand/10 rounded-2xl p-3">✓ Đã gửi! Kiểm tra hộp thư của bạn.</div>
    </div>
    <p class="text-center mt-6"><a href="#" onclick="appShow('login');return false;" class="text-info font-extrabold">← Quay lại đăng nhập</a></p>
  </div>
</div>
<script>(function(){var r=document.querySelector('#view-forgot');if(!r)return;var b=r.querySelector('#forgot-send');if(b)b.addEventListener('click',function(){var d=r.querySelector('#forgot-done');if(d)d.classList.remove('hidden');});})();</script>
""",
    },
    "changepass": {
        "label": "Đổi mật khẩu", "icon": "🔒", "fullbleed": False,
        "innerHtml": """
<div class="max-w-xl mx-auto px-4 py-6">
  <h1 class="text-3xl font-extrabold text-ink mb-1">Đổi mật khẩu</h1>
  <p class="text-muted font-bold mb-6">Đặt mật khẩu mới cho tài khoản của bạn.</p>
  <div class="wl-card p-6 space-y-4">
    <div>
      <label class="block text-sm font-bold text-muted mb-1 ml-1">Mật khẩu hiện tại</label>
      <input id="cp-old" type="password" class="wl-input" placeholder="••••••••" />
    </div>
    <div>
      <label class="block text-sm font-bold text-muted mb-1 ml-1">Mật khẩu mới</label>
      <input id="cp-new" type="password" class="wl-input" placeholder="••••••••" />
      <p class="text-xs text-muted font-bold mt-1 ml-1">Tối thiểu 8 ký tự</p>
    </div>
    <div>
      <label class="block text-sm font-bold text-muted mb-1 ml-1">Xác nhận mật khẩu mới</label>
      <input id="cp-confirm" type="password" class="wl-input" placeholder="••••••••" />
    </div>
    <div id="cp-msg" class="hidden text-sm font-bold rounded-xl p-3"></div>
    <button id="cp-submit" type="button" class="btn-3d btn-primary w-full uppercase tracking-wide">Cập nhật mật khẩu</button>
  </div>
</div>
<script>(function(){
  var r=document.querySelector('#view-changepass'); if(!r) return;
  var btn=r.querySelector('#cp-submit'), msg=r.querySelector('#cp-msg');
  function show(ok,t){ msg.className='text-sm font-bold rounded-xl p-3 '+(ok?'bg-brand/10 text-brand-dark':'bg-danger/10 text-danger'); msg.textContent=t; }
  if(btn) btn.addEventListener('click',function(){
    var o=r.querySelector('#cp-old').value, n=r.querySelector('#cp-new').value, c=r.querySelector('#cp-confirm').value;
    if(!o||!n||!c){ show(false,'Vui lòng điền đủ các ô.'); return; }
    if(n.length<8){ show(false,'Mật khẩu mới phải từ 8 ký tự.'); return; }
    if(n!==c){ show(false,'Xác nhận mật khẩu không khớp.'); return; }
    show(true,'✓ Đã cập nhật mật khẩu!');
  });
})();</script>
""",
    },
    "admin": {
        "label": "Quản trị", "icon": "🛡️", "fullbleed": False,
        "innerHtml": """
<div class="max-w-5xl mx-auto px-4 py-6">
  <h1 class="text-3xl font-extrabold text-ink mb-1">🛡️ Quản trị</h1>
  <p class="text-muted font-bold mb-6">Tổng quan hệ thống & quản lý người dùng.</p>

  <!-- Thống kê -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    <div class="wl-card p-4 text-center"><div class="text-3xl">👥</div><div class="text-2xl font-extrabold text-info mt-1">1.248</div><div class="text-xs font-bold text-muted">Người dùng</div></div>
    <div class="wl-card p-4 text-center"><div class="text-3xl">📚</div><div class="text-2xl font-extrabold text-brand mt-1">5.392</div><div class="text-xs font-bold text-muted">Tài liệu</div></div>
    <div class="wl-card p-4 text-center"><div class="text-3xl">🃏</div><div class="text-2xl font-extrabold text-ink mt-1">84.120</div><div class="text-xs font-bold text-muted">Thẻ đã tạo</div></div>
    <div class="wl-card p-4 text-center"><div class="text-3xl">🤖</div><div class="text-2xl font-extrabold text-xp mt-1">12.940</div><div class="text-xs font-bold text-muted">Lượt AI / tháng</div></div>
  </div>

  <!-- Tab -->
  <div class="flex gap-2 mb-4">
    <button class="wl-chip wl-chip-on admin-tab" data-tab="users">Người dùng</button>
    <button class="wl-chip admin-tab" data-tab="content">Nội dung</button>
  </div>

  <!-- Tab Người dùng -->
  <div id="admin-users" class="wl-card overflow-hidden">
    <div class="p-4 border-b-2 border-[#EEE]">
      <input class="wl-input" placeholder="🔍 Tìm theo tên hoặc email..." />
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead class="bg-[#F7F7F7] text-muted text-xs font-extrabold uppercase">
          <tr><th class="px-4 py-3">Người dùng</th><th class="px-4 py-3">Vai trò</th><th class="px-4 py-3">Streak</th><th class="px-4 py-3">Tham gia</th><th class="px-4 py-3">Trạng thái</th><th class="px-4 py-3 text-right">Hành động</th></tr>
        </thead>
        <tbody class="font-bold text-sm" id="admin-rows">
          <tr class="border-t border-[#EEE]"><td class="px-4 py-3">Minh<br><span class="text-muted text-xs">minh@worklingo.vn</span></td><td class="px-4 py-3"><span class="wl-badge bg-info/15 text-info">Admin</span></td><td class="px-4 py-3">🔥 7</td><td class="px-4 py-3 text-muted">12/03/2026</td><td class="px-4 py-3"><span class="wl-badge bg-brand/15 text-brand-dark admin-status">Hoạt động</span></td><td class="px-4 py-3 text-right"><button class="btn-3d btn-neutral btn-sm admin-lock">Khoá</button></td></tr>
          <tr class="border-t border-[#EEE]"><td class="px-4 py-3">Lan Nguyễn<br><span class="text-muted text-xs">lan@congty.vn</span></td><td class="px-4 py-3"><span class="wl-badge bg-gray-100 text-ink">Học viên</span></td><td class="px-4 py-3">🔥 23</td><td class="px-4 py-3 text-muted">05/01/2026</td><td class="px-4 py-3"><span class="wl-badge bg-brand/15 text-brand-dark admin-status">Hoạt động</span></td><td class="px-4 py-3 text-right"><button class="btn-3d btn-neutral btn-sm admin-lock">Khoá</button></td></tr>
          <tr class="border-t border-[#EEE]"><td class="px-4 py-3">Tuấn Trần<br><span class="text-muted text-xs">tuan@congty.vn</span></td><td class="px-4 py-3"><span class="wl-badge bg-gray-100 text-ink">Học viên</span></td><td class="px-4 py-3">🔥 0</td><td class="px-4 py-3 text-muted">28/04/2026</td><td class="px-4 py-3"><span class="wl-badge bg-danger/15 text-danger admin-status">Đã khoá</span></td><td class="px-4 py-3 text-right"><button class="btn-3d btn-neutral btn-sm admin-lock">Mở khoá</button></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Tab Nội dung -->
  <div id="admin-content" class="wl-card p-6 hidden">
    <p class="font-bold text-ink mb-3">Tài liệu mới nhất trong hệ thống</p>
    <ul class="space-y-2 font-bold text-sm">
      <li class="flex justify-between border-b border-[#EEE] pb-2">💼 Họp team dev 30/05 <span class="text-muted">Minh · 4 câu</span></li>
      <li class="flex justify-between border-b border-[#EEE] pb-2">🎬 日本語ニュース <span class="text-muted">Lan · 40 câu</span></li>
      <li class="flex justify-between">💬 Chat khách hàng A <span class="text-muted">Tuấn · 18 câu</span></li>
    </ul>
  </div>
</div>
<script>(function(){
  var r=document.querySelector('#view-admin'); if(!r) return;
  // Tab
  r.querySelectorAll('.admin-tab').forEach(function(t){
    t.addEventListener('click',function(){
      r.querySelectorAll('.admin-tab').forEach(function(x){x.classList.remove('wl-chip-on');});
      t.classList.add('wl-chip-on');
      var tab=t.getAttribute('data-tab');
      r.querySelector('#admin-users').classList.toggle('hidden', tab!=='users');
      r.querySelector('#admin-content').classList.toggle('hidden', tab!=='content');
    });
  });
  // Khoá / mở khoá
  r.querySelectorAll('.admin-lock').forEach(function(btn){
    btn.addEventListener('click',function(){
      var row=btn.closest('tr'); var st=row.querySelector('.admin-status');
      var locked = btn.textContent.trim()==='Mở khoá';
      if(locked){ btn.textContent='Khoá'; st.textContent='Hoạt động'; st.className='wl-badge bg-brand/15 text-brand-dark admin-status'; }
      else { btn.textContent='Mở khoá'; st.textContent='Đã khoá'; st.className='wl-badge bg-danger/15 text-danger admin-status'; }
    });
  });
})();</script>
""",
    },
}
for sid, s in EXTRA.items():
    screens[sid] = {"id": sid, "label": s["label"], "icon": s["icon"], "innerHtml": s["innerHtml"]}

# Thứ tự hiển thị trên thanh điều hướng (login/forgot không nằm trong nav)
NAV_ORDER = ["dashboard", "library", "import", "transcript", "study", "cardtypes", "review", "admin", "changepass", "settings"]
# Màn full màn hình (ẩn sidebar)
FULLBLEED = {"login", "review", "forgot"}

HEAD = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>WorkLingo — Mockup đầy đủ chức năng</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Noto+Sans+JP:wght@500;700&display=swap" rel="stylesheet" />
<script>
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: {
          sans: ['Nunito', 'sans-serif'],
          jp: ['"Noto Sans JP"', 'sans-serif'],
        },
        colors: {
          brand:  { DEFAULT: '#58CC02', dark: '#46A302' },
          danger: { DEFAULT: '#FF4B4B', dark: '#E04343' },
          xp: '#FFC800',
          info:   { DEFAULT: '#1CB0F6', dark: '#1799D6' },
          ink: '#3C3C3C',
          muted: '#AFAFAF',
        },
      },
    },
  };
</script>
<style>
  body { font-family: 'Nunito', sans-serif; color: #3C3C3C; background: #fff; }
  .font-jp { font-family: 'Noto Sans JP', sans-serif; }

  /* ============ BỘ COMPONENT CHUẨN (đồng nhất control) ============ */
  /* Nút 3D kiểu Duolingo — tự chứa bo góc/padding/đậm để mọi nút đồng nhất */
  .btn-3d {
    border-bottom-width: 4px; border-radius: 1rem;
    padding: 0.75rem 1.5rem; font-weight: 800; line-height: 1.2;
    display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
    transition: all .08s ease; cursor: pointer; border-style: solid; border-width: 2px; border-bottom-width: 4px;
  }
  .btn-3d:active { border-bottom-width: 0; transform: translateY(4px); }
  .btn-3d:disabled { opacity: .5; cursor: not-allowed; transform: none; }
  .btn-3d.btn-sm { padding: 0.4rem 0.9rem; font-size: .875rem; border-radius: .75rem; }
  /* Biến thể màu */
  .btn-primary { background:#58CC02; border-color:#46A302; color:#fff; }
  .btn-info    { background:#1CB0F6; border-color:#1799D6; color:#fff; }
  .btn-danger  { background:#FF4B4B; border-color:#E04343; color:#fff; }
  .btn-xp      { background:#FFC800; border-color:#E0AC00; color:#3C3C3C; }
  .btn-neutral { background:#fff; border-color:#E5E5E5; color:#3C3C3C; }
  /* Ô nhập & select chuẩn */
  .wl-input, .wl-select {
    width:100%; padding:0.75rem 1rem; border-radius:1rem;
    border:2px solid #E5E5E5; background:#F7F7F7; font-weight:700; color:#3C3C3C; font-family:inherit;
  }
  .wl-input:focus, .wl-select:focus { outline:none; background:#fff; border-color:#1CB0F6; }
  /* Thẻ/khối chuẩn */
  .wl-card { background:#fff; border:2px solid #EEEEEE; border-radius:1.5rem; }
  /* Badge tròn */
  .wl-badge { display:inline-flex; align-items:center; gap:.25rem; font-weight:800; border-radius:9999px; padding:.15rem .6rem; font-size:.75rem; }
  /* Chip lọc/từ */
  .wl-chip { border:2px solid #E5E5E5; border-radius:9999px; padding:.35rem .9rem; font-weight:800; font-size:.875rem; background:#fff; color:#3C3C3C; cursor:pointer; }
  .wl-chip.wl-chip-on { background:#E8F9DC; border-color:#58CC02; color:#46A302; }
  /* ================================================================= */
  /* Furigana */
  ruby rt { font-size: .55em; color: #777; font-weight: 700; }
  /* Animation */
  .bounce-in { animation: bounceIn .35s ease; }
  @keyframes bounceIn { 0%{transform:scale(.85);opacity:0;} 60%{transform:scale(1.04);} 100%{transform:scale(1);opacity:1;} }
  .shake { animation: shake .35s ease; }
  @keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-6px);} 75%{transform:translateX(6px);} }
  /* Nav active */
  .nav-active { background: #E8F9DC; color: #46A302 !important; }
  /* View switching */
  .view { display: none; }
  .view.view-active { display: block; }
  /* thanh cuộn gọn */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
</style>
</head>
<body class="font-sans">
"""

# Sidebar
nav_buttons = []
for vid in NAV_ORDER:
    s = screens.get(vid)
    if not s:
        continue
    nav_buttons.append(
        f'''      <button data-nav="{vid}" onclick="appShow('{vid}')"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-ink hover:bg-[#F2F2F2] transition-colors text-left">
        <span class="text-xl">{s["icon"]}</span><span>{s["label"]}</span>
      </button>'''
    )
nav_html = "\n".join(nav_buttons)

SIDEBAR = f"""<div id="app-shell" class="flex min-h-screen">
  <aside id="app-sidebar" class="w-64 shrink-0 border-r-2 border-[#EEEEEE] bg-white p-4 flex-col gap-1 hidden md:flex sticky top-0 h-screen">
    <div class="flex items-center gap-2 px-2 py-3 mb-2">
      <span class="text-3xl">🦉</span>
      <span class="text-2xl font-extrabold text-brand">WorkLingo</span>
    </div>
{nav_html}
    <div class="mt-auto">
      <div class="flex items-center justify-around bg-[#F7F7F7] rounded-2xl py-3 px-2 font-extrabold">
        <span class="text-orange-500">🔥 7</span>
        <span class="text-xp">⭐ 1240</span>
        <span class="text-danger">❤️ 5</span>
      </div>
      <button onclick="appShow('login')" class="w-full mt-2 text-sm font-bold text-muted hover:text-danger py-2">↩︎ Đăng xuất</button>
    </div>
  </aside>

  <main id="app-main" class="flex-1 min-w-0">
"""

# Mobile top bar (hiện nav nhỏ trên mobile) — đơn giản: nút mở từng màn qua select
MOBILE_BAR = """    <div id="app-mobilebar" class="md:hidden sticky top-0 z-20 bg-white border-b-2 border-[#EEE] px-4 py-2 flex items-center gap-2">
      <span class="text-2xl">🦉</span>
      <select onchange="appShow(this.value)" class="flex-1 font-extrabold text-ink bg-[#F7F7F7] rounded-xl px-3 py-2 border-2 border-[#EEE]">
""" + "\n".join(
    f'        <option value="{vid}">{screens[vid]["icon"]} {screens[vid]["label"]}</option>'
    for vid in NAV_ORDER if vid in screens
) + """
      </select>
    </div>
"""

# Các section
sections = []
for vid, s in screens.items():
    inner = s["innerHtml"]
    # Tránh trùng id với section wrapper: nếu màn tự dùng id="view-<id>" bên trong,
    # đổi thành id="<id>-content" (JS vẫn scope qua querySelector('#view-<id>') -> section).
    inner = inner.replace(f'id="view-{vid}"', f'id="{vid}-content"')
    sections.append(f'<section id="view-{vid}" class="view" data-fullbleed="{str(vid in FULLBLEED).lower()}">\n{inner}\n</section>')
sections_html = "\n\n".join(sections)

ROUTER = """
  </main>
</div>

<script>
  window.appShow = function (id) {
    var views = document.querySelectorAll('.view');
    views.forEach(function (v) { v.classList.remove('view-active'); });
    var target = document.getElementById('view-' + id);
    if (target) target.classList.add('view-active');

    var fullbleed = target && target.getAttribute('data-fullbleed') === 'true';
    var sidebar = document.getElementById('app-sidebar');
    var mobilebar = document.getElementById('app-mobilebar');
    var main = document.getElementById('app-main');
    if (sidebar) sidebar.style.display = fullbleed ? 'none' : '';
    if (mobilebar) mobilebar.style.display = fullbleed ? 'none' : '';

    // active nav
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.classList.toggle('nav-active', b.getAttribute('data-nav') === id);
    });
    window.scrollTo(0, 0);
  };
  // Link "Quên mật khẩu?" ở màn đăng nhập -> màn forgot
  var fp = document.getElementById('login-forgot');
  if (fp) fp.addEventListener('click', function (e) { e.preventDefault(); window.appShow('forgot'); });

  // Bắt đầu ở màn đăng nhập
  window.appShow('login');
</script>
</body>
</html>
"""

html = HEAD + SIDEBAR + MOBILE_BAR + sections_html + ROUTER

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print("Wrote", OUT, "(", len(html), "bytes )")
print("Screens:", ", ".join(screens.keys()))
