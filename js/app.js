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
// 상담 화면에서 결과 화면으로 넘길 임시 데이터.
let pendingConsult = null;
let currentConsultId = null;
// 상담과 피드백은 서비스 전용 저장소에 보관한다.
function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem("babyaiter-v1"));
    if (data && data.profile && Array.isArray(data.consults) && Array.isArray(data.feedback)) return data;
  } catch {}
  return { profile: { name: "도윤", ageMonths: 38, hasSibling: true }, consults: [], feedback: [] };
}
function saveData(data) {
  try { localStorage.setItem("babyaiter-v1", JSON.stringify(data)); return true; } catch { return false; }
}
function getProfile() {
  try { return JSON.parse(localStorage.getItem("babyaiter-v1"))?.profile || { name: "도윤", ageMonths: 38, hasSibling: true }; }
  catch { return { name: "도윤", ageMonths: 38, hasSibling: true }; }
}

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
  if (tabbar) tabbar.hidden = target === "result";
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
  const age = document.getElementById("askAge");
  if (age) age.textContent = `아이 개월 수: ${getProfile().ageMonths}개월`;
  renderHome();
  renderResult();
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

// 홈은 저장된 프로필과 상담, 최근 피드백을 보여 준다.
function renderHome() {
  const data = loadData();
  const name = document.getElementById("profileName");
  const age = document.getElementById("profileAge");
  if (!name || !age) return;
  if (!document.getElementById("profileForm").contains(document.activeElement)) {
    name.value = data.profile.name;
    age.value = data.profile.ageMonths;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const startDay = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const weeklyMethods = new Set(data.feedback.filter((entry) => entry.date >= startDay).map((entry) => `${entry.consultId}:${entry.methodId}`));
  document.getElementById("weeklyCount").textContent = `${weeklyMethods.size}개`;
  const latest = data.consults[0];
  document.getElementById("currentSummary").innerHTML = latest
    ? `<div class="card"><p>${esc(latest.input.target)} · ${esc(latest.input.situation)}</p><button class="btn btn-secondary" data-consult="${esc(latest.id)}">결과 보기</button></div>`
    : '<div class="empty"><p>진행 중인 상담이 없어요</p><a class="btn btn-secondary" href="#ask">상담하기</a></div>';
  const recent = data.feedback.slice(0, 3);
  const results = { good: "효과 있음", some: "조금", none: "없음" };
  document.getElementById("homeRecent").innerHTML = recent.length
    ? `<div class="list">${recent.map((entry) => `<div class="list-item"><div class="body"><div class="name">${esc(results[entry.result] || entry.result)}</div><div class="sub">${esc(entry.date)} · ${esc(entry.memo || "메모 없음")}</div></div></div>`).join("")}</div>`
    : '<div class="empty"><p>아직 기록이 없어요</p><a class="btn btn-secondary" href="#log">기록 보기</a></div>';
}

// 현재 상담의 결과와 각 지도법의 출처를 표시한다.
function renderResult() {
  const container = document.getElementById("resultContent");
  const consult = loadData().consults.find((item) => item.id === currentConsultId);
  if (!container || !consult) return;
  const labels = { green: "가정 지도", yellow: "관찰 필요", red: "전문가 상담 권장" };
  const answer = consult.answer;
  const cards = consult.cardIds.map((id) => window.KNOWLEDGE.find((card) => card.id === id)).filter(Boolean);
  container.innerHTML = `<div class="section"><span class="badge">${esc(labels[answer.level] || labels.green)}</span></div>
    <div class="section card"><h2 class="title-md">원인 해석</h2>${answer.causes.map((cause) => `<p>${esc(cause)}</p>`).join("")}</div>
    <div class="section"><h2 class="title-md">지도법</h2>${answer.methods.map((method) => `<div class="card"><h3 class="title-md">${esc(method.title)}</h3><p>${esc(method.how)}</p><button class="btn btn-secondary" data-try="${esc(method.id)}" ${consult.tried.includes(method.id) ? "disabled" : ""}>${consult.tried.includes(method.id) ? "선택했어요" : "해 볼게요"}</button></div>`).join("")}</div>
    <div class="section"><h2 class="title-md">근거 자료</h2>${cards.map((card) => `<div class="card"><h3 class="title-md">${esc(card.title)}</h3><p>${esc(card.source)}</p></div>`).join("")}</div>`;
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
  const choice = e.target.closest("[data-try]");
  if (choice) {
    const data = loadData();
    const consult = data.consults.find((item) => item.id === currentConsultId);
    if (!consult || consult.tried.includes(choice.dataset.try)) return;
    consult.tried.push(choice.dataset.try);
    if (saveData(data)) { renderResult(); toast("지도법을 선택했어요"); }
    else toast("저장하지 못했어요");
  }
  const consultLink = e.target.closest("[data-consult]");
  if (consultLink) { currentConsultId = consultLink.dataset.consult; location.hash = "#result"; }
});

document.getElementById("profileForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  data.profile.name = document.getElementById("profileName").value.trim();
  data.profile.ageMonths = Number(document.getElementById("profileAge").value);
  if (!data.profile.name) return;
  if (saveData(data)) { renderHome(); toast("프로필을 저장했어요"); }
  else toast("저장하지 못했어요");
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

// 상담 조건을 선택하고 mock 분석이 끝나면 결과 화면으로 이동한다.
for (const id of ["targetChips", "situationChips"]) {
  document.getElementById(id)?.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll(`#${id} .chip`).forEach((item) => item.classList.toggle("on", item === chip));
  });
}
document.getElementById("askForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const loading = document.getElementById("askLoading");
  const input = {
    target: document.querySelector("#targetChips .on").dataset.value,
    situation: document.querySelector("#situationChips .on").dataset.value,
    text: document.getElementById("askText").value.trim(),
    ageMonths: getProfile().ageMonths
  };
  form.hidden = true;
  loading.hidden = false;
  try {
    pendingConsult = { input, answer: await askAI(input) };
    const data = loadData();
    const id = `c_${Date.now()}`;
    const cardIds = [...new Set(pendingConsult.answer.methods.map((method) => method.cardId))];
    data.consults.unshift({ id, createdAt: new Date().toISOString().slice(0, 10), round: 1, parentId: null, input, cardIds, answer: pendingConsult.answer, tried: [] });
    if (!saveData(data)) throw new Error("저장 실패");
    currentConsultId = id;
    location.hash = "#result";
    toast("상담 결과를 저장했어요");
  } catch {
    toast("분석하지 못했어요. 다시 시도해 주세요");
  } finally {
    form.hidden = false;
    loading.hidden = true;
  }
});

showScreen(location.hash.slice(1) || "home");
