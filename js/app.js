// =========================================================
// 공통 동작: 화면 전환(해시 라우팅), 저장소, 토스트, 바텀시트
// 서버 없이 동작한다. 데이터는 브라우저 localStorage에 저장.
// =========================================================

const STORE_KEY = "swdna-app-v1"; // 서비스 이름 정해지면 바꾸기

// ---------- 저장소 ----------
const store = {
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : structuredClone(window.SEED_ITEMS);
    } catch {
      return structuredClone(window.SEED_ITEMS);
    }
  },
  save(items) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch {}
  },
  reset() {
    try { localStorage.removeItem(STORE_KEY); } catch {}
  },
};
let items = store.load();

// ---------- 화면 전환 ----------
function showScreen(name) {
  const screens = document.querySelectorAll(".screen");
  const exists = [...screens].some((s) => s.dataset.screen === name);
  const target = exists ? name : "home";
  screens.forEach((s) => (s.hidden = s.dataset.screen !== target));
  document.querySelectorAll("#tabbar a").forEach((a) =>
    a.classList.toggle("active", a.dataset.tab === target)
  );
  // 입력 화면에서는 탭바 숨김
  const tabbar = document.getElementById("tabbar");
  if (tabbar) tabbar.hidden = target === "new";
  window.scrollTo(0, 0);
  render();
}
window.addEventListener("hashchange", () => {
  closeSheet();
  showScreen(location.hash.slice(1));
});

// ---------- 토스트 ----------
let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

// ---------- 바텀시트 ----------
function openSheet(html) {
  document.getElementById("sheetBody").innerHTML = html;
  document.getElementById("sheet").classList.add("show");
  document.getElementById("sheetBackdrop").classList.add("show");
  refreshIcons();
}
function closeSheet() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("sheetBackdrop").classList.remove("show");
}
document.getElementById("sheetClose").addEventListener("click", closeSheet);
document.getElementById("sheetBackdrop").addEventListener("click", closeSheet);

// ---------- 렌더링 ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => { const [, m, day] = d.split("-"); return `${+m}월 ${+day}일`; };

function itemRow(it) {
  const badge = it.status === "done"
    ? '<span class="badge">완료</span>'
    : '<span class="badge accent">진행 중</span>';
  const icon = it.cat === "학교" ? "graduation-cap" : it.cat === "생활" ? "house" : "tag";
  return `
    <div class="list-item" data-id="${it.id}">
      <div class="thumb"><i data-lucide="${icon}"></i></div>
      <div class="body">
        <div class="name">${esc(it.title)}</div>
        <div class="sub">${esc(it.cat)} · ${fmtDate(it.date)}</div>
      </div>
      ${badge}
    </div>`;
}

let filter = "all";
function render() {
  const recent = document.getElementById("recentList");
  if (recent) recent.innerHTML = items.slice(0, 3).map(itemRow).join("");

  const full = document.getElementById("fullList");
  const empty = document.getElementById("emptyState");
  if (full) {
    const shown = items.filter((it) => filter === "all" || it.status === filter);
    full.innerHTML = shown.map(itemRow).join("");
    full.hidden = shown.length === 0;
    if (empty) empty.hidden = shown.length !== 0;
  }
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// ---------- 이벤트 ----------
document.addEventListener("click", (e) => {
  const row = e.target.closest(".list-item");
  if (row) {
    const it = items.find((x) => x.id === Number(row.dataset.id));
    if (!it) return;
    openSheet(`
      <span class="badge accent">${esc(it.cat)}</span>
      <h2 class="title-lg" style="margin:8px 0 4px">${esc(it.title)}</h2>
      <p class="muted">${fmtDate(it.date)}</p>
      <p style="margin-top:16px">${esc(it.memo || "메모 없음")}</p>
      <button class="btn btn-primary btn-block" style="margin-top:24px" data-toggle="${it.id}">
        ${it.status === "done" ? "진행 중으로 되돌리기" : "완료로 표시"}
      </button>`);
    return;
  }
  const tg = e.target.closest("[data-toggle]");
  if (tg) {
    const it = items.find((x) => x.id === Number(tg.dataset.toggle));
    it.status = it.status === "done" ? "todo" : "done";
    store.save(items);
    closeSheet();
    render();
    toast(it.status === "done" ? "완료로 표시했어요" : "진행 중으로 바꿨어요");
  }
});

document.getElementById("filterChips")?.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  filter = chip.dataset.f;
  document.querySelectorAll("#filterChips .chip").forEach((c) => c.classList.toggle("on", c === chip));
  render();
});

document.getElementById("catChips")?.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#catChips .chip").forEach((c) => c.classList.toggle("on", c === chip));
});

document.getElementById("newForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("fTitle").value.trim();
  if (!title) return;
  const cat = document.querySelector("#catChips .chip.on")?.textContent || "기타";
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  items.unshift({ id: Date.now(), title, cat, memo: document.getElementById("fMemo").value.trim(), status: "todo", date });
  store.save(items);
  e.target.reset();
  location.hash = "#home";
  toast("저장했어요");
});

showScreen(location.hash.slice(1) || "home");
