// =========================================================
// 공통 동작: 화면 전환(해시 라우팅), 저장소, 토스트, 바텀시트
// 서버 없이 동작한다. 데이터는 브라우저 localStorage에 저장.
// =========================================================

// 상담 화면에서 결과 화면으로 넘길 임시 데이터.
let pendingConsult = null;
let currentConsultId = null;
// 최초 실행과 시연 초기화에 사용할 가명 예시 데이터.
function demoData() {
  const input = { target: "동생", situation: "동생을 안고 있을 때", text: "", ageMonths: 38 };
  return {
    profile: { name: "도윤", ageMonths: 38, hasSibling: true },
    consults: [{ id: "c_demo", createdAt: "2026-10-27", round: 1, parentId: null, input, cardIds: getConsultCards(input).map((card) => card.id), answer: ruleAnswer(input, getConsultCards(input)), tried: ["bite-sibling-0", "bite-basic-0"] }],
    feedback: [
      { id: "f_demo3", consultId: "c_demo", methodId: "bite-sibling-0", date: "2026-10-29", result: "good", memo: "단독 시간 후 저녁까지 괜찮았음" },
      { id: "f_demo2", consultId: "c_demo", methodId: "bite-basic-0", date: "2026-10-28", result: "none", memo: "물자마자 안 된다고 했더니 더 울고 또 물었음" },
      { id: "f_demo1", consultId: "c_demo", methodId: "bite-sibling-0", date: "2026-10-27", result: "good", memo: "동생 낮잠 때 블록 놀이 10분, 깨물기 없었음" }
    ]
  };
}
// 상담과 피드백은 서비스 전용 저장소에 보관한다.
function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem("babyaiter-v1"));
    if (data && data.profile && Array.isArray(data.consults) && Array.isArray(data.feedback)) {
      // 기존 시연 기록의 예전 ID를 카드 ID로 바꿔 기록을 유지한다.
      for (const consult of data.consults) {
        for (const method of consult.answer?.methods || []) {
          const card = window.KNOWLEDGE.find((item) => item.id === method.cardId);
          const index = card?.methods?.indexOf(method.title) ?? -1;
          if (!/^m\d+$/.test(method.id) || index < 0) continue;
          const oldId = method.id, newId = `${card.id}-${index}`;
          method.id = newId;
          consult.tried = (consult.tried || []).map((id) => id === oldId ? newId : id);
          data.feedback.filter((entry) => entry.consultId === consult.id && entry.methodId === oldId).forEach((entry) => { entry.methodId = newId; });
        }
      }
      return data;
    }
  } catch {}
  return demoData();
}
function saveData(data) {
  try { localStorage.setItem("babyaiter-v1", JSON.stringify(data)); return true; } catch { return false; }
}
// 위험 신호나 14일 이상 효과 없음 기록이 있으면 답변보다 규칙을 우선한다.
function applySafety(answer, input, feedback = [], today = new Date()) {
  const text = `${input.text || ""} ${input.situation || ""}`;
  const dangerAnswer = (window.QUESTIONS || []).some((q) => q.options.some((o) => o.danger && input.answers?.[q.id] === o.value));
  const hasFlag = dangerAnswer || (window.KNOWLEDGE || []).some((card) => (card.redFlagKeywords || []).some((flag) => text.includes(flag)));
  const dates = feedback.map((entry) => entry.date).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const elapsed = dates.length ? (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.parse(`${dates[0]}T00:00:00Z`)) / 86400000 : 0;
  const noProgress = dates.length === feedback.length && dates.length > 0 && feedback.every((entry) => entry.result === "none") && elapsed >= 14;
  return hasFlag || noProgress ? { ...answer, level: "red" } : answer;
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
function render() {
  const age = document.getElementById("askAge");
  if (age) age.textContent = `만 2~3세 대상 · 우리 아이 ${getProfile().ageMonths}개월`;
  document.getElementById("modeField").hidden = quizIndex < window.QUESTIONS.length || window.APP_CONFIG?.AI_MODE !== "live";
  renderHome();
  renderResult();
  renderLog();
  refreshIcons();
}

// 선택한 지도법별 피드백 입력과 저장된 기록을 보여 준다.
function renderLog() {
  const container = document.getElementById("logContent");
  if (!container) return;
  const data = loadData();
  const tried = data.consults.flatMap((consult) => consult.answer.methods.filter((method) => consult.tried.includes(method.id)).map((method) => ({ consult, method })));
  const forms = tried.map(({ consult, method }) => `<form class="card section" data-feedback-consult="${esc(consult.id)}" data-feedback-method="${esc(method.id)}"><h3 class="title-md">${esc(method.title)}</h3><div class="field"><span class="label">효과</span><div class="chips"><button type="button" class="chip on" data-result="good" aria-pressed="true">효과 있음</button><button type="button" class="chip" data-result="some" aria-pressed="false">조금</button><button type="button" class="chip" data-result="none" aria-pressed="false">없음</button></div><input type="hidden" name="result" value="good"></div><div class="field"><label class="label">메모 <textarea class="textarea" name="memo"></textarea></label></div><div class="field"><label class="label">날짜 <input class="input" type="date" name="date" required /></label></div><button class="btn btn-secondary" type="submit">저장</button></form>`).join("");
  const labels = { good: "효과 있음", some: "조금", none: "없음" };
  const timeline = data.feedback.map((entry) => {
    const consult = data.consults.find((item) => item.id === entry.consultId);
    const method = consult?.answer.methods.find((item) => item.id === entry.methodId);
    return `<div class="card"><h3 class="title-md">${esc(method?.title || "지도법")}</h3><p>${esc(entry.date)} · ${esc(labels[entry.result] || entry.result)}</p><p>${esc(entry.memo || "메모 없음")}</p></div>`;
  }).join("");
  container.innerHTML = tried.length ? `<h2 class="title-md section">시도한 지도법</h2>${forms}<h2 class="title-md section">기록</h2>${timeline || '<div class="empty"><p>아직 기록이 없어요</p></div>'}${data.feedback.length ? '<button class="btn btn-primary btn-block" id="reconsult">결과 반영해서 다시 상담</button>' : ""}` : '<div class="empty"><p>선택한 지도법이 없어요</p><a class="btn btn-secondary" href="#ask">상담하기</a></div>';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  container.querySelectorAll('input[name="date"]').forEach((input) => { input.value = today; });
}

document.getElementById("logContent")?.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-feedback-consult]");
  if (!form) return;
  event.preventDefault();
  const data = loadData();
  data.feedback.unshift({ id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, consultId: form.dataset.feedbackConsult, methodId: form.dataset.feedbackMethod, date: form.elements.date.value, result: form.elements.result.value, memo: form.elements.memo.value.trim() });
  if (saveData(data)) { renderLog(); toast("기록을 저장했어요"); }
  else toast("저장하지 못했어요");
});
document.getElementById("logContent")?.addEventListener("click", (event) => {
  if (event.target.closest("#reconsult")) { reconsult(event.target.closest("#reconsult")); return; }
  const button = event.target.closest("button[data-result]");
  if (!button) return;
  const form = button.closest("form");
  form.elements.result.value = button.dataset.result;
  form.querySelectorAll("button[data-result]").forEach((item) => {
    item.classList.toggle("on", item === button);
    item.setAttribute("aria-pressed", String(item === button));
  });
});

// 최근 피드백이 있는 상담의 입력과 기록을 재상담에 전달한다.
async function reconsult(button) {
  const data = loadData();
  const latestFeedback = data.feedback[0];
  const previous = data.consults.find((consult) => consult.id === latestFeedback?.consultId);
  if (!previous) return;
  const feedback = data.feedback.filter((entry) => entry.consultId === previous.id).map((entry) => ({ ...entry, title: previous.answer.methods.find((method) => method.id === entry.methodId)?.title || "" }));
  const history = { previous: { input: previous.input, methods: previous.answer.methods.map(({ id, title }) => ({ id, title })) }, feedback };
  button.disabled = true;
  const buttonText = button.textContent;
  button.textContent = previous.mode === "deep" ? "자료를 꼼꼼히 비교하고 있어요" : "분석하고 있어요";
  try {
    const result = await askAI(previous.input, history, previous.mode || "fast");
    const answer = applySafety(result, previous.input, feedback);
    const id = `c_${Date.now()}`;
    data.consults.unshift({ id, createdAt: new Date().toISOString().slice(0, 10), round: 2, parentId: previous.id, input: previous.input, cardIds: result._meta.cards.map((card) => card.id), answer, source: result._meta.source, mode: result._meta.mode, tried: [] });
    if (!saveData(data)) throw new Error("저장 실패");
    currentConsultId = id;
    location.hash = "#result";
    toast(result._meta.fallback ? "AI 연결이 느려 기본 답변을 보여 드려요" : "다시 상담한 결과를 저장했어요");
  } catch { toast("다시 상담하지 못했어요"); }
  finally { button.disabled = false; button.textContent = buttonText; }
}

// 홈은 저장된 프로필과 상담, 최근 피드백을 보여 준다.
function renderHome() {
  const data = loadData();
  const summary = document.getElementById("profileSummary");
  if (!summary) return;
  summary.textContent = `${data.profile.name} · ${data.profile.ageMonths}개월`;
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
    ? `<div class="list">${recent.map((entry) => { const consult = data.consults.find((item) => item.id === entry.consultId); const method = consult?.answer.methods.find((item) => item.id === entry.methodId); return `<div class="list-item"><div class="body"><div class="name">${esc(method?.title || "지도법")}</div><div class="sub">${esc(entry.date)} · ${esc(entry.memo || "메모 없음")}</div></div><span class="badge">${esc(results[entry.result] || entry.result)}</span></div>`; }).join("")}</div>`
    : '<div class="empty"><p>아직 기록이 없어요</p><a class="btn btn-secondary" href="#log">기록 보기</a></div>';
}

// 현재 상담의 결과와 각 지도법의 출처를 표시한다.
function renderResult() {
  const container = document.getElementById("resultContent");
  const consult = loadData().consults.find((item) => item.id === currentConsultId);
  if (!container || !consult) return;
  if (consult.answer.type === "cause") { renderCauseResult(container, consult); return; }
  const labels = { green: "가정 지도", yellow: "관찰 필요", red: "전문가 상담 권장" };
  const answer = consult.answer;
  const cards = consult.cardIds.map((id) => window.KNOWLEDGE.find((card) => card.id === id)).filter(Boolean);
  const previous = loadData().consults.find((item) => item.id === consult.parentId);
  const findMethod = (id) => answer.methods.find((method) => method.id === id)?.title || previous?.answer.methods.find((method) => method.id === id)?.title || id;
  const changes = answer.changes ? `<div class="section card"><h2 class="title-md">지난번과 달라진 점</h2>${answer.changes.kept.map((id) => `<p>유지: ${esc(findMethod(id))}</p>`).join("")}${answer.changes.replaced.map((item) => `<p>교체: ${esc(findMethod(item.from))} → ${esc(findMethod(item.to))}</p>`).join("")}</div>` : "";
  const safety = answer.level === "red" ? '<div class="section card"><h2 class="title-md">전문가 상담 권장</h2><p>육아종합지원센터 또는 소아청소년과에 상담해 보세요.</p></div>' : "";
  container.innerHTML = `${safety}${changes}<div class="section"><span class="badge">${consult.source === "ai" ? `AI 답변 · ${consult.mode === "deep" ? "깊게" : "빠른"}` : "기본 답변"}</span> <span class="badge">${esc(labels[answer.level] || labels.green)}</span></div>
    <div class="section card"><h2 class="title-md">원인 해석</h2>${answer.causes.map((cause) => `<p>${esc(cause)}</p>`).join("")}</div>
    <div class="section"><h2 class="title-md">지도법</h2>${answer.methods.map((method) => `<div class="card"><h3 class="title-md">${esc(method.title)}</h3>${method.how !== method.title ? `<p>${esc(method.how)}</p>` : ""}<p class="muted">왜: ${esc(method.why)}</p><p class="muted">근거: ${esc(window.KNOWLEDGE.find((card) => card.id === method.cardId)?.title || method.cardId)}</p><button class="btn btn-secondary" data-try="${esc(method.id)}" ${consult.tried.includes(method.id) ? "disabled" : ""}>${consult.tried.includes(method.id) ? "선택했어요" : "해 볼게요"}</button></div>`).join("")}</div>
    <div class="section"><h2 class="title-md">근거 자료</h2>${cards.map((card) => `<div class="card"><h3 class="title-md">${esc(card.title)}</h3>${card.evidence ? `<blockquote>${esc(card.evidence)}</blockquote>` : ""}<p class="muted">${esc(card.source)} ${card.verified === false ? '<span class="badge">검수 중</span>' : ""}</p></div>`).join("")}</div>`;
}

// 원인 후보는 규칙이 정한 순서를 유지하고 선택 답변·원문 근거를 함께 보여 준다.
function renderCauseResult(container, consult) {
  const answer = applySafety(consult.answer, consult.input);
  const safety = answer.level === "red" ? '<div class="section card" role="alert"><h2 class="title-md">전문가 상담 권장</h2><p>먼저 물린 사람의 안전과 상처를 확인해 주세요. 육아종합지원센터 또는 소아청소년과에 상담해 보세요.</p></div>' : "";
  const sources = (text) => esc(text).replace(/https:\/\/[^\s;)]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">원문 열기</a>`);
  container.innerHTML = `${safety}<div class="section card"><h2 class="title-md">가능성이 높은 원인 후보예요. 진단이 아니에요.</h2><p>여러 이유가 겹칠 수 있어요. 답변과 연결되는 후보만 보여 드려요.</p><p class="muted">같은 점수의 후보 사이에는 가능성 차이를 뜻하는 순위가 없어요.</p><span class="badge">${consult.source === "ai" ? "AI 설명" : "기본 설명"}</span></div>` + (answer.candidates.length ? answer.candidates.map((candidate) => {
    const card = window.KNOWLEDGE.find((c) => c.id === candidate.cardId);
    if (!card) return "";
    return `<article class="section card"><h2 class="title-md">${esc(card.title)}</h2><p>선택한 답변: ${esc(scoreCauses(consult.input).find((c) => c.cardId === card.id)?.reasons.join(" / ") || "[확인 필요]")}</p><p>왜 이렇게 봤나요: ${esc(candidate.why)}</p><p>${esc(card.explain)}</p><p>이럴 땐 이렇게: ${esc(card.tip)}</p><p class="muted source-text">출처: ${sources(card.source)}</p><p class="muted">쪽수: ${esc(card.page)}</p><blockquote>${esc(card.evidence)}</blockquote>${card.verified === false ? '<span class="badge">검수 중</span>' : ""}</article>`;
  }).join("") : '<div class="section empty"><p>답변만으로 원인 후보를 좁히기 어려워요.</p><p>관찰 내용을 확인하고 다시 답해 주세요.</p></div>') + '<a class="btn btn-secondary btn-block" href="#ask">답변 다시 살펴보기</a>';
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// ---------- 이벤트 ----------
document.addEventListener("click", (e) => {
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

// 홈 제목을 다섯 번 탭하면 예시 데이터로 되돌린다.
let titleTaps = 0;
document.querySelector('[data-screen="home"] .topbar h1')?.addEventListener("click", () => {
  titleTaps += 1;
  if (titleTaps < 5) return;
  titleTaps = 0;
  if (saveData(demoData())) { currentConsultId = null; render(); toast("예시 데이터로 초기화했어요"); }
  else toast("초기화하지 못했어요");
});

document.getElementById("editProfile")?.addEventListener("click", () => {
  const profile = loadData().profile;
  openSheet(`<h2 class="title-md">아이 프로필 수정</h2><form id="profileForm"><div class="field"><label class="label" for="profileName">가명</label><input class="input" id="profileName" required maxlength="30" value="${esc(profile.name)}" /></div><div class="field"><label class="label" for="profileAge">개월 수</label><input class="input" id="profileAge" type="number" min="24" max="47" required value="${esc(profile.ageMonths)}" /></div><button class="btn btn-primary btn-block" type="submit">저장</button></form>`);
});
document.getElementById("sheetBody")?.addEventListener("submit", (event) => {
  if (event.target.id !== "profileForm") return;
  event.preventDefault();
  const data = loadData();
  data.profile.name = document.getElementById("profileName").value.trim();
  data.profile.ageMonths = Number(document.getElementById("profileAge").value);
  if (!data.profile.name) return;
  if (saveData(data)) { closeSheet(); renderHome(); toast("프로필을 저장했어요"); }
  else toast("저장하지 못했어요");
});

// 상담 조건을 선택하고 mock 분석이 끝나면 결과 화면으로 이동한다.
for (const id of ["targetChips", "situationChips", "modeChips"]) {
  document.getElementById(id)?.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll(`#${id} .chip`).forEach((item) => { item.classList.toggle("on", item === chip); item.setAttribute("aria-pressed", String(item === chip)); });
  });
}
document.getElementById("askForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const loading = document.getElementById("askLoading");
  if (quizIndex !== window.QUESTIONS.length || window.QUESTIONS.some((q) => !quizAnswers[q.id])) return;
  const input = getQuizInput();
  if (!Number.isInteger(input.ageMonths) || input.ageMonths < 24 || input.ageMonths > 47) { toast("만 2~3세(24~47개월) 대상이에요. 프로필을 확인해 주세요"); return; }
  form.hidden = true;
  loading.hidden = false;
  try {
    const mode = document.querySelector("#modeChips .on")?.dataset.value || "fast";
    loading.querySelector("p").textContent = mode === "deep" ? "자료를 꼼꼼히 비교하고 있어요" : "분석하고 있어요";
    const result = createCauseAnswer(input);
    pendingConsult = { input, answer: applySafety(result, input) };
    const data = loadData();
    const id = `c_${Date.now()}`;
    const cardIds = result._meta.cards.map((card) => card.id);
    data.consults.unshift({ id, createdAt: new Date().toISOString().slice(0, 10), round: 1, parentId: null, input, cardIds, answer: pendingConsult.answer, source: result._meta.source, mode: result._meta.mode, tried: [] });
    if (!saveData(data)) throw new Error("저장 실패");
    currentConsultId = id;
    location.hash = "#result";
    toast(result._meta.fallback ? "AI 연결이 느려 기본 답변을 보여 드려요" : "검사 결과를 저장했어요");
  } catch {
    toast("분석하지 못했어요. 다시 시도해 주세요");
  } finally {
    form.hidden = false;
    loading.hidden = true;
  }
});

// 질문 답변은 뒤로 가도 유지하며 미응답 상태에서는 진행하지 않는다.
let quizIndex = 0;
const quizAnswers = {};
function getQuizInput() {
  const selected = (id) => window.QUESTIONS.find((q) => q.id === id)?.options.find((o) => o.value === quizAnswers[id])?.label || "";
  return { answers: { ...quizAnswers }, target: selected("q-target"), situation: selected("q-situation"), text: document.getElementById("askText").value.trim(), ageMonths: getProfile().ageMonths };
}
function renderQuiz() {
  const questions = window.QUESTIONS, question = questions[quizIndex], done = !question;
  document.getElementById("questionContent").innerHTML = `<p class="section">${done ? questions.length : quizIndex + 1} / ${questions.length}</p><div class="progress" role="progressbar" aria-label="질문 진행" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${quizIndex}"><i style="width:calc(100% * ${quizIndex} / ${questions.length})"></i></div>` + (done ? '<h2 class="title-md section">질문에 모두 답했어요</h2><p>덧붙일 내용이 있으면 메모해 주세요.</p>' : `<h2 class="title-md section" id="questionTitle">${esc(question.title)}</h2>${question.help ? `<p class="muted section">${esc(question.help)}</p>` : ""}<div role="group" aria-labelledby="questionTitle">${question.options.map((o) => `<div class="field"><button type="button" class="btn ${quizAnswers[question.id] === o.value ? "btn-primary" : "btn-secondary"} btn-block" data-answer="${o.value}" aria-pressed="${quizAnswers[question.id] === o.value}">${esc(o.label)}</button></div>`).join("")}</div>`);
  document.getElementById("quizBack").hidden = quizIndex === 0;
  document.getElementById("quizNext").hidden = done;
  document.getElementById("quizNext").disabled = !done && !quizAnswers[question.id];
  document.getElementById("quizSubmit").hidden = !done;
  document.getElementById("quizNote").hidden = !done;
  document.getElementById("modeField").hidden = !done || window.APP_CONFIG?.AI_MODE !== "live";
}
document.getElementById("questionContent").addEventListener("click", (e) => {
  const option = e.target.closest("[data-answer]");
  if (!option) return;
  quizAnswers[window.QUESTIONS[quizIndex].id] = option.dataset.answer;
  renderQuiz();
});
document.getElementById("quizNext").addEventListener("click", () => {
  if (!quizAnswers[window.QUESTIONS[quizIndex]?.id]) return;
  quizIndex += 1; renderQuiz();
});
document.getElementById("quizBack").addEventListener("click", () => { quizIndex = Math.max(0, quizIndex - 1); renderQuiz(); });
renderQuiz();

showScreen(location.hash.slice(1) || "home");
