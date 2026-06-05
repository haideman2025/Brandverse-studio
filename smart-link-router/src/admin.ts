// =====================================================================
// Trang quản trị tự phục vụ (/admin) — 1 file HTML, không cần build.
// Người dùng tự: đăng nhập, tạo/sửa chiến dịch, dán URL Ladipage,
// bật/tắt LDP, copy link ads, copy mã gắn Ladipage, xem kết quả,
// cấu hình Pixel/CAPI. Không cần biết kỹ thuật.
//
// Lưu ý kỹ thuật: viết JS bên trong bằng nối chuỗi (tránh `${` và dấu
// backtick) để không vỡ template literal bao ngoài. Thẻ đóng script
// được viết là <\/script> để HTML không đóng sớm.
// =====================================================================

export const ADMIN_HTML = `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Smart Link Router — Quản trị</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
         background:#0b0f1a; color:#e6e9ef; }
  header { position:sticky; top:0; background:#0d1322; border-bottom:1px solid #1e2740;
           padding:14px 16px; display:flex; align-items:center; justify-content:space-between; z-index:10; }
  header h1 { font-size:16px; margin:0; }
  header h1 span { color:#7dd3fc; }
  .wrap { max-width:760px; margin:0 auto; padding:16px; }
  button { font:inherit; cursor:pointer; border:none; border-radius:9px; padding:10px 14px;
           background:#2563eb; color:#fff; font-weight:600; }
  button.ghost { background:#1b2438; color:#cdd5e6; }
  button.sm { padding:6px 10px; font-size:13px; font-weight:500; }
  button.danger { background:#3a1f22; color:#f87171; }
  button:disabled { opacity:.5; cursor:not-allowed; }
  input, select { font:inherit; width:100%; padding:11px 12px; border-radius:9px;
                  border:1px solid #2a3550; background:#0f1626; color:#e6e9ef; }
  label.fld { display:block; margin:12px 0 5px; font-size:13px; color:#9aa6bf; }
  .card { background:#141a2b; border:1px solid #222b44; border-radius:14px; padding:16px; margin-bottom:14px; }
  .row { display:flex; gap:8px; align-items:center; }
  .row > * { min-width:0; }
  .muted { color:#8b93a7; font-size:13px; }
  .pill { display:inline-block; font-size:11px; padding:2px 8px; border-radius:20px; background:#1b2438; color:#9aa6bf; }
  .pill.on { background:#16351f; color:#4ade80; }
  .pill.off { background:#3a1f22; color:#f87171; }
  .stat { display:flex; gap:16px; margin-top:10px; }
  .stat div b { display:block; font-size:18px; }
  .stat div span { font-size:11px; color:#8b93a7; }
  .ldp-row { display:grid; grid-template-columns: 1fr; gap:6px; border:1px solid #222b44;
             border-radius:10px; padding:10px; margin-bottom:8px; background:#0f1626; }
  .ldp-row .top { display:flex; gap:8px; align-items:center; }
  .ldp-row .top input { flex:1; }
  .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
  .toast { position:fixed; bottom:18px; left:50%; transform:translateX(-50%);
           background:#16351f; color:#bbf7d0; padding:10px 16px; border-radius:10px;
           font-size:14px; opacity:0; transition:.2s; pointer-events:none; }
  .toast.show { opacity:1; }
  pre { background:#0f1626; border:1px solid #2a3550; border-radius:9px; padding:10px;
        font-size:12px; white-space:pre-wrap; word-break:break-all; color:#cbd5e1; }
  a { color:#7dd3fc; }
  .tabs { display:flex; gap:8px; margin-bottom:16px; }
  .tabs button { background:#1b2438; color:#cdd5e6; }
  .tabs button.active { background:#2563eb; color:#fff; }
  .hide { display:none; }
  h2 { font-size:16px; margin:4px 0 12px; }
</style>
</head><body>
<header>
  <h1>Smart Link <span>Router</span></h1>
  <button id="logoutBtn" class="ghost sm hide" onclick="logout()">Đăng xuất</button>
</header>

<!-- LOGIN -->
<div id="login" class="wrap">
  <div class="card">
    <h2>Đăng nhập quản trị</h2>
    <p class="muted">Nhập mật khẩu quản trị để quản lý chiến dịch.</p>
    <label class="fld">Mật khẩu</label>
    <input id="pwd" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter')login()"/>
    <div class="actions"><button onclick="login()">Vào</button></div>
    <p id="loginErr" class="muted" style="color:#f87171"></p>
  </div>
</div>

<!-- APP -->
<div id="app" class="wrap hide">
  <div class="tabs">
    <button id="tabCamp" class="active" onclick="switchTab('camp')">Chiến dịch</button>
    <button id="tabSet" onclick="switchTab('set')">Cài đặt</button>
  </div>

  <!-- CAMPAIGNS -->
  <div id="viewCamp">
    <div class="actions" style="margin-bottom:14px">
      <button onclick="openForm()">+ Tạo chiến dịch</button>
      <button class="ghost" onclick="loadLinks()">↻ Làm mới</button>
    </div>
    <div id="links"></div>
  </div>

  <!-- SETTINGS -->
  <div id="viewSet" class="hide">
    <div class="card">
      <h2>Meta Conversions API (tùy chọn)</h2>
      <p class="muted">Bật để mỗi chuyển đổi tự bắn về Facebook, giúp FB phân phối tốt hơn.</p>
      <label class="fld">Pixel ID</label>
      <input id="pixel" placeholder="vd: 1234567890"/>
      <label class="fld">CAPI Access Token (chỉ nhập khi muốn đổi)</label>
      <input id="capi" type="password" placeholder="để trống nếu không đổi"/>
      <label class="fld">Đơn vị tiền tệ</label>
      <input id="cur" placeholder="VND"/>
      <label class="fld">Đổi mật khẩu quản trị (tùy chọn, ≥6 ký tự)</label>
      <input id="newpwd" type="password" placeholder="để trống nếu không đổi"/>
      <div class="actions"><button onclick="saveSettings()">Lưu cài đặt</button></div>
      <p id="setMsg" class="muted"></p>
    </div>
  </div>
</div>

<!-- FORM (tạo/sửa) -->
<div id="formView" class="wrap hide">
  <div class="card">
    <h2 id="formTitle">Tạo chiến dịch</h2>
    <label class="fld">Tên chiến dịch</label>
    <input id="fName" placeholder="vd: Sale tháng 6" oninput="onNameInput()"/>
    <label class="fld">Mã chiến dịch (slug) — nằm trong link ads</label>
    <input id="fSlug" placeholder="sale-thang-6"/>
    <label class="fld">Chế độ tối ưu</label>
    <select id="fMode" onchange="renderRows()">
      <option value="auto">Tự tối ưu (khuyên dùng) — tự dồn traffic về LDP tốt nhất</option>
      <option value="manual">Chia tay — tự đặt tỉ lệ %</option>
    </select>

    <label class="fld">Danh sách Landing Page (Ladipage)</label>
    <div id="rows"></div>
    <button class="ghost sm" onclick="addRow()">+ Thêm LDP</button>

    <div class="actions">
      <button onclick="saveCampaign()">Lưu</button>
      <button class="ghost" onclick="backToList()">Hủy</button>
    </div>
    <p id="formMsg" class="muted" style="color:#f87171"></p>
  </div>

  <div id="resultCard" class="card hide">
    <h2>✅ Đã lưu! Dùng ngay:</h2>
    <label class="fld">Link dán vào quảng cáo Facebook</label>
    <div class="row"><input id="adLink" readonly/><button class="sm" onclick="copyEl('adLink')">Copy</button></div>
    <label class="fld">Dashboard theo dõi</label>
    <div class="row"><input id="dashLink" readonly/><button class="sm" onclick="openEl('dashLink')">Mở</button></div>
    <label class="fld">Mã gắn vào trang "cảm ơn / đặt hàng thành công" của Ladipage (để đo chuyển đổi)</label>
    <pre id="snippet"></pre>
    <div class="actions"><button class="sm" onclick="copySnippet()">Copy mã</button>
      <button class="ghost sm" onclick="backToList()">Xong</button></div>
  </div>
</div>

<div id="toast" class="toast"></div>

<script>
var ORIGIN = location.origin;
function tk(){ return localStorage.getItem('slr_admin_token') || ''; }
function setTk(t){ localStorage.setItem('slr_admin_token', t); }
function clearTk(){ localStorage.removeItem('slr_admin_token'); }

function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 1800); }

function api(method, path, body){
  return fetch(ORIGIN+path, {
    method: method,
    headers: { 'Authorization':'Bearer '+tk(), 'Content-Type':'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function(r){
    if(r.status===401){ clearTk(); showLogin(); throw new Error('unauthorized'); }
    return r.json().catch(function(){ return {}; }).then(function(j){
      if(!r.ok) throw new Error(j.error || ('HTTP '+r.status));
      return j;
    });
  });
}

function showLogin(){ document.getElementById('login').classList.remove('hide');
  document.getElementById('app').classList.add('hide');
  document.getElementById('formView').classList.add('hide');
  document.getElementById('logoutBtn').classList.add('hide'); }
function showApp(){ document.getElementById('login').classList.add('hide');
  document.getElementById('app').classList.remove('hide');
  document.getElementById('formView').classList.add('hide');
  document.getElementById('logoutBtn').classList.remove('hide'); }

function login(){
  var p = document.getElementById('pwd').value.trim();
  if(!p) return;
  setTk(p);
  api('GET','/api/links').then(function(){ showApp(); loadLinks(); })
    .catch(function(){ document.getElementById('loginErr').textContent='Sai mật khẩu.'; });
}
function logout(){ clearTk(); showLogin(); }

function switchTab(t){
  document.getElementById('tabCamp').classList.toggle('active', t==='camp');
  document.getElementById('tabSet').classList.toggle('active', t==='set');
  document.getElementById('viewCamp').classList.toggle('hide', t!=='camp');
  document.getElementById('viewSet').classList.toggle('hide', t!=='set');
  if(t==='set') loadSettings();
}

function esc(s){ return String(s==null?'':s).replace(/[&<>\"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]; }); }

function loadLinks(){
  api('GET','/api/links').then(function(j){
    var box = document.getElementById('links');
    if(!j.links || !j.links.length){ box.innerHTML='<p class=\"muted\">Chưa có chiến dịch nào. Bấm “Tạo chiến dịch”.</p>'; return; }
    box.innerHTML = j.links.map(function(l){
      var st = '<div class=\"stat\"><div><b>'+l.clicks+'</b><span>Click</span></div>'
        + '<div><b>'+l.conversions+'</b><span>Conv.</span></div>'
        + '<div><b>'+l.cr+'%</b><span>CR</span></div>'
        + '<div><b>'+l.variants+'</b><span>LDP</span></div></div>';
      var pill = l.active ? '<span class=\"pill on\">đang chạy</span>' : '<span class=\"pill off\">đã tắt</span>';
      var modePill = '<span class=\"pill\">'+(l.mode==='auto'?'tự tối ưu':'chia tay')+'</span>';
      return '<div class=\"card\">'
        + '<div class=\"row\" style=\"justify-content:space-between\"><div><b>'+esc(l.name||l.slug)+'</b> '+pill+' '+modePill
        + '<div class=\"muted\">'+esc(l.slug)+'</div></div></div>'
        + st
        + '<div class=\"actions\">'
        + '<button class=\"sm\" onclick=\"copyText(\\''+l.ad_link+'\\')\">Copy link ads</button>'
        + '<button class=\"ghost sm\" onclick=\"window.open(\\''+l.dashboard+'\\')\">Dashboard</button>'
        + '<button class=\"ghost sm\" onclick=\"openForm(\\''+l.slug+'\\')\">Sửa / mã gắn</button>'
        + (l.active?'<button class=\"danger sm\" onclick=\"deactivate(\\''+l.slug+'\\')\">Tắt</button>':'')
        + '</div></div>';
    }).join('');
  }).catch(function(){});
}

function deactivate(slug){
  if(!confirm('Tắt chiến dịch '+slug+'? (số liệu vẫn giữ)')) return;
  api('DELETE','/api/links/'+slug).then(function(){ toast('Đã tắt'); loadLinks(); });
}

// ---- Form ----
var editingSlug = null;
function slugify(s){
  return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
    .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
}
function onNameInput(){
  if(editingSlug) return;
  document.getElementById('fSlug').value = slugify(document.getElementById('fName').value);
}
function rowHtml(v){
  v = v || {};
  var manual = document.getElementById('fMode') && document.getElementById('fMode').value==='manual';
  return '<div class=\"ldp-row\">'
    + '<div class=\"top\"><input class=\"v-label\" placeholder=\"Tên gợi nhớ (LDP A...)\" value=\"'+esc(v.label||'')+'\"/>'
    + '<label class=\"muted\" style=\"display:flex;gap:4px;align-items:center;white-space:nowrap\">'
    + '<input type=\"checkbox\" class=\"v-active\" style=\"width:auto\" '+(v.active===false?'':'checked')+'/> bật</label>'
    + '<button class=\"danger sm\" onclick=\"this.closest(&quot;.ldp-row&quot;).remove()\">✕</button></div>'
    + '<input class=\"v-url\" placeholder=\"https://landing-page-cua-ban...\" value=\"'+esc(v.url||'')+'\"/>'
    + (manual ? '<input class=\"v-weight\" type=\"number\" min=\"0\" step=\"1\" placeholder=\"Tỉ lệ (vd 50)\" value=\"'+(v.weight!=null?v.weight:1)+'\"/>' : '')
    + '</div>';
}
function addRow(v){ document.getElementById('rows').insertAdjacentHTML('beforeend', rowHtml(v)); }
function renderRows(){
  // giữ lại dữ liệu đang nhập khi đổi chế độ
  var data = collectRows();
  document.getElementById('rows').innerHTML='';
  if(!data.length){ addRow(); addRow(); return; }
  data.forEach(addRow);
}
function collectRows(){
  return [].slice.call(document.querySelectorAll('#rows .ldp-row')).map(function(r){
    var w = r.querySelector('.v-weight');
    return { label:r.querySelector('.v-label').value.trim(),
             url:r.querySelector('.v-url').value.trim(),
             active:r.querySelector('.v-active').checked,
             weight: w?parseFloat(w.value||'1'):1 };
  });
}

function openForm(slug){
  document.getElementById('app').classList.add('hide');
  document.getElementById('formView').classList.remove('hide');
  document.getElementById('resultCard').classList.add('hide');
  document.getElementById('formMsg').textContent='';
  editingSlug = slug || null;
  document.getElementById('formTitle').textContent = slug ? 'Sửa chiến dịch' : 'Tạo chiến dịch';
  document.getElementById('fSlug').disabled = !!slug;
  if(slug){
    api('GET','/api/links/'+slug).then(function(j){
      document.getElementById('fName').value = j.link.name || '';
      document.getElementById('fSlug').value = j.link.slug;
      document.getElementById('fMode').value = j.link.mode;
      document.getElementById('rows').innerHTML='';
      j.variants.forEach(function(v){ addRow({label:v.label,url:v.url,active:v.active===1,weight:v.weight}); });
      if(!j.variants.length){ addRow(); }
    });
  } else {
    document.getElementById('fName').value='';
    document.getElementById('fSlug').value='';
    document.getElementById('fMode').value='auto';
    document.getElementById('rows').innerHTML='';
    addRow(); addRow(); addRow();
  }
}
function backToList(){ document.getElementById('formView').classList.add('hide');
  document.getElementById('app').classList.remove('hide'); loadLinks(); }

function saveCampaign(){
  var name = document.getElementById('fName').value.trim();
  var slug = document.getElementById('fSlug').value.trim();
  var mode = document.getElementById('fMode').value;
  var rows = collectRows().filter(function(r){ return r.url; });
  var msg = document.getElementById('formMsg');
  if(!slug){ msg.textContent='Thiếu mã chiến dịch (slug).'; return; }
  if(!rows.length){ msg.textContent='Cần ít nhất 1 landing page.'; return; }
  msg.textContent='Đang lưu...';
  api('POST','/api/links', { slug:slug, name:name, mode:mode, variants:rows })
    .then(function(j){
      msg.textContent='';
      document.getElementById('resultCard').classList.remove('hide');
      document.getElementById('adLink').value = j.ad_link;
      document.getElementById('dashLink').value = j.dashboard;
      document.getElementById('snippet').textContent = snippetFor(slug);
      toast('Đã lưu chiến dịch');
      window.scrollTo(0, document.body.scrollHeight);
    })
    .catch(function(e){ msg.textContent='Lỗi: '+e.message; });
}

function snippetFor(slug){
  return '<!-- Dán vào trang cảm on/đặt hàng thành công của Ladipage -->\\n'
    + '<script>\\n'
    + '  var vid = new URLSearchParams(location.search).get(\"slr_vid\") || \"\";\\n'
    + '  new Image().src = \"'+ORIGIN+'/px/'+slug+'.gif?vid=\" + encodeURIComponent(vid) + \"&value=0\";\\n'
    + '<\\/script>';
}
function copySnippet(){ copyText(document.getElementById('snippet').textContent); }

// ---- Settings ----
function loadSettings(){
  api('GET','/api/settings').then(function(j){
    document.getElementById('pixel').value = j.meta_pixel_id||'';
    document.getElementById('cur').value = j.default_currency||'VND';
    document.getElementById('capi').placeholder = j.capi_token_set ? 'đã có token (để trống nếu không đổi)' : 'chưa có';
  });
}
function saveSettings(){
  var body = { meta_pixel_id: document.getElementById('pixel').value,
               default_currency: document.getElementById('cur').value };
  var capi = document.getElementById('capi').value.trim();
  if(capi) body.meta_capi_token = capi;
  var np = document.getElementById('newpwd').value.trim();
  if(np) body.admin_token = np;
  api('POST','/api/settings', body).then(function(){
    document.getElementById('capi').value=''; document.getElementById('newpwd').value='';
    if(np) setTk(np);
    document.getElementById('setMsg').textContent='Đã lưu ✓'; toast('Đã lưu cài đặt');
  }).catch(function(e){ document.getElementById('setMsg').textContent='Lỗi: '+e.message; });
}

// ---- helpers ----
function copyText(t){ navigator.clipboard.writeText(t).then(function(){ toast('Đã copy'); },
  function(){ prompt('Copy thủ công:', t); }); }
function copyEl(id){ copyText(document.getElementById(id).value); }
function openEl(id){ window.open(document.getElementById(id).value); }

// init
if(tk()){ api('GET','/api/links').then(function(){ showApp(); loadLinks(); }).catch(function(){ showLogin(); }); }
else { showLogin(); }
<\/script>
</body></html>`;
