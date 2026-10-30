// =========================================================
// 공통 동작: 화면 전환(해시 라우팅), 저장소, 토스트, 바텀시트
// 서버 없이 동작한다. 데이터는 브라우저 localStorage에 저장.
// =========================================================

// 상담 화면에서 결과 화면으로 넘길 임시 데이터.
let pendingConsult = null;
let currentConsultId = null;
let analysisState = null;
// 최초 실행과 시연 초기화에 사용할 가명 예시 데이터.
function demoData() {
  // 가명·고정 날짜의 검사 2회. 실제 부모 기록과 구별되는 시연 데이터다.
  const examples = [
    { id: "c_demo_cause2", createdAt: "2026-10-30", feedbackResult: "some", answers: { "q-situation": "blocked", "q-target": "sibling", "q-context": "home", "q-condition": "unknown", "q-teething": "no", "q-expression": "attention", "q-change": "baby" }, text: "동생을 돌보는 시간에 함께 놀기를 원했어요." },
    { id: "c_demo_cause1", createdAt: "2026-10-29", feedbackResult: "yes", answers: { "q-situation": "toy", "q-target": "peer", "q-context": "nursery", "q-condition": "tired", "q-teething": "no", "q-expression": "difficult", "q-change": "none" }, text: "어린이집 낮잠 전에 친구가 놀잇감을 만졌어요." }
  ];
  const consults = examples.map(({ id, createdAt, feedbackResult, answers, text }) => {
    const selected = (qid) => window.QUESTIONS.find((q) => q.id === qid).options.find((o) => o.value === answers[qid]).label;
    const input = { answers, text, ageMonths: 38, target: selected("q-target"), situation: selected("q-situation") };
    const answer = createCauseAnswer(input);
    return { id, createdAt, feedbackResult, round: 1, parentId: null, input, cardIds: answer.candidates.map((c) => c.cardId), answer, source: "rule", mode: "fast", tried: [] };
  });
  return { profile: { name: "도윤", ageMonths: 38, hasSibling: true }, consults, feedback: [] };
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
  const text = `${input.text || ""} ${input.situation || ""} ${Object.values(input.otherAnswers || {}).join(" ")}`;
  const dangerAnswer = input.answers?.["q-condition"] === "injury" || (window.QUESTIONS || []).some((q) => q.options.some((o) => o.danger && input.answers?.[q.id] === o.value));
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
  document.querySelectorAll("[data-desktop-tab]").forEach((link) => { link.classList.toggle("active", link.dataset.desktopTab === (target === "result" ? "ask" : target)); });
  // 휴대폰에서는 모든 화면의 하단 탭을 유지한다.
  const tabbar = document.getElementById("tabbar");
  if (tabbar) tabbar.hidden = false;
  render();
  const content = document.querySelector(`[data-screen="${target}"] .content`);
  if (content) content.scrollTop = 0;
  window.scrollTo(0, 0);
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
  if (age) age.textContent = `${getProfile().name} · ${getProfile().ageMonths}개월`;
  renderHome();
  renderResult();
  renderLog();
  refreshIcons();
}

// 새 검사 형식만 렌더링한다. 예전 기록은 저장소에서 보존하되 노출하지 않는다.
function renderResult() {
  const container = document.getElementById("resultContent");
  const inspections = getInspections();
  const consult = currentConsultId ? inspections.find((c) => c.id === currentConsultId) : inspections[0];
  if (!container) return;
  if (analysisState) {
    if (container.dataset.analysis !== "loading") { container.innerHTML = analysisMarkup(); container.dataset.analysis = "loading"; }
    return;
  }
  delete container.dataset.analysis;
  if (!consult) { container.innerHTML = '<div class="empty"><p>아직 검사 결과가 없어요</p><a class="btn btn-secondary" href="#ask">질문 검사</a></div>'; return; }
  currentConsultId = consult.id;
  renderCauseResult(container, consult);
}

// 출처 원본은 그대로 보관하고 화면에서는 기관·자료 제목·쪽수만 표시한다.
function displaySource(card) {
  const primary = card.source.split(" - 로컬 ")[0].split("; 보조:")[0];
  let label = primary.replace(/\s*\(발행기관 \[확인 필요\]\)/g, "").replace(/https:\/\/\S+/g, "").trim();
  if (!primary.includes("발행기관 [확인 필요]") && !label.startsWith("2023년 양육상담")) label = label.replace(" - ", " · ");
  label = label.replace("미국 Head Start", "미국 보건복지부 Head Start");
  if (label.startsWith("CHLA")) label = "미국 " + label;
  const page = card.page.match(/인쇄 (\d+(?:[~–-]\d+)?)/)?.[1] || card.page.match(/^(\d+)/)?.[1];
  return `${label}${page ? ` · p.${page.replace("~", "–")}` : ""}`;
}
// 해당 자료 자체의 URL만 연결한다. 보조 자료 링크를 원문인 것처럼 붙이지 않는다.
function sourceLink(card) {
  const primary = card.source.split("; 보조:")[0];
  const url = primary.match(/https:\/\/[^\s;)]+/)?.[0];
  return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>` : "";
}

const feedbackLabels = { yes: "맞아요", some: "일부", no: "아니에요" };
// 옛 상담과 피드백은 저장소에서 보존하고 새 검사만 목록에 보여 준다.
function getInspections(data = loadData()) {
  return data.consults.filter((c) => c.answer?.type === "cause");
}
function inspectionTitle(consult) {
  return consult.answer.candidates.map((c) => window.KNOWLEDGE.find((card) => card.id === c.cardId)?.title).filter(Boolean).join(" · ") || "원인 후보를 좁히기 어려워요";
}
// 원인 아이콘은 결과·최근 기록·홈 궤도에서 같은 매핑을 사용한다.
const causeIcons = {frustration: "message-circle", condition: "moon", change: "house", play: "puzzle", explore: "smile", attention: "users", control: "hand"};
const orbitCauses = [["frustration", "표현"], ["condition", "피로"], ["change", "환경"], ["play", "놀이"], ["explore", "탐색"], ["attention", "관심"]];
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
function causeIcon(id) { return causeIcons[id?.replace("cause-", "")] || "circle-help"; }
function optionIcon(questionId, value) {
  if (value === "other") return "pencil";
  if (value === "unknown" || value === "none") return "circle-help";
  const byQuestion = {
    "q-safety": {yes: "triangle-alert", no: "shield-check"},
    "q-situation": {toy: "blocks", blocked: "hand", play: "puzzle"},
    "q-target": {peer: "users", sibling: "baby", adult: "user-round"},
    "q-context": {home: "house", nursery: "school", outside: "map-pin"},
    "q-condition": {tired: "moon", hungry: "utensils", unwell: "thermometer"},
    "q-teething": {yes: "smile", no: "minus"},
    "q-expression": {difficult: "message-circle", attention: "users", self: "hand"},
    "q-change": {baby: "baby", move: "house", nursery: "school"}
  };
  return byQuestion[questionId]?.[value] || "circle-help";
}
function inspectionRow(consult) {
  return `<div class="card section inspection-card"><span class="icon-badge">${icon(causeIcon(consult.answer.candidates[0]?.cardId))}</span><div class="inspection-body"><div class="inspection-meta"><span>${esc(consult.createdAt)}</span><span class="badge">${esc(consult.input.target || "")}</span></div><h3 class="title-md">${esc(inspectionTitle(consult))}</h3><p class="muted">결과가 맞았나요? ${esc(feedbackLabels[consult.feedbackResult] || "아직 답하지 않았어요")}</p></div><div class="inspection-actions"><button class="btn btn-secondary btn-sm" type="button" data-consult="${esc(consult.id)}">결과 보기</button><button class="icon-btn" type="button" aria-label="기록 삭제" data-delete-record="${esc(consult.id)}">${icon("trash-2")}</button></div></div>`;
}
function renderHome() {
  const data = loadData();
  document.getElementById("profileSummary").textContent = `${data.profile.name} · ${data.profile.ageMonths}개월`;
  // 장식의 원인 이름도 검수된 카드 제목을 사용한다.
  for (const [element, id] of [["homeExpression", "cause-frustration"], ["homeCondition", "cause-condition"], ["homeChange", "cause-change"]]) {
    const label = document.getElementById(element);
    if (label) label.textContent = window.KNOWLEDGE.find((card) => card.id === id)?.title || "";
  }
  const recent = getInspections(data).slice(0, 3);
  document.getElementById("homeRecent").innerHTML = recent.length ? recent.map(inspectionRow).join("") : '<div class="empty card"><p>아직 검사 기록이 없어요</p><p>질문에 답하고 원인 후보를 살펴보세요.</p></div>';
}
function renderLog() {
  const inspections = getInspections();
  document.getElementById("logContent").innerHTML = inspections.length ? inspections.map(inspectionRow).join("") : '<div class="empty"><p>아직 검사 기록이 없어요</p><button class="btn btn-secondary" data-start-quiz>검사 시작하기</button></div>';
}
// 원문 데이터는 유지하고 대응 문장의 대상 표현만 선택 답변에 맞춘다.
function displayTip(text, input) {
  const target = input.answers?.["q-target"];
  if (target === "peer") return text;
  if (target === "sibling") return text.replace(/친구가/g, "동생이").replace(/친구를/g, "동생을").replace(/친구는/g, "동생은").replace(/친구와/g, "동생과").replace(/친구/g, "동생");
  return text.replace(/친구(?:에게|한테|의|가|를|와|는|도)?\s*/g, "").replace(/ {2,}/g, " ").trim();
}
// 검수 카드·저장된 답변·AI 응답만 결과에 사용한다. 시안 예시 데이터는 사용하지 않는다.
function renderCauseResult(container, consult) {
  const answer = applySafety(consult.answer, consult.input);
  const safety = answer.level === "red" ? `<div class="section card safety-alert" role="alert"><span class="icon-badge">${icon("triangle-alert")}</span><div><h2 class="title-md">전문가 상담 권장</h2><p>먼저 물린 사람의 안전과 상처를 확인해 주세요. 육아종합지원센터 또는 소아청소년과에 상담해 보세요.</p></div></div>` : "";
  const targetSummary = {peer: "친구를 깨물었을 때", sibling: "형제자매를 깨물었을 때", adult: "보호자·어른을 깨물었을 때"}[consult.input.answers?.["q-target"]] || "깨물기 상황";
  const candidates = answer.candidates.map((candidate, index) => {
    const card = window.KNOWLEDGE.find((c) => c.id === candidate.cardId);
    if (!card) return "";
    const selected = scoreCauses(consult.input).find((c) => c.cardId === card.id)?.reasons.join(" / ") || "[확인 필요]";
    const hasAI = consult.source === "ai" && typeof candidate.why === "string" && candidate.why.trim().length > 0;
    const explanation = hasAI ? candidate.why : card.explain;
    return `<article class="card cause-card" data-cause="${esc(card.id)}" style="--card-index:${index}"><div class="cause-heading"><span class="icon-badge">${icon(causeIcon(card.id))}</span><div><span class="muted candidate-label">원인 후보 ${index + 1}</span><h2 class="title-md">${esc(card.title)}</h2></div></div><div class="cause-reason">${hasAI ? `<p class="label reason-label">${icon("sparkles")}우리 아이 답변으로 본 이유</p>` : ""}<p class="cause-summary">${esc(explanation)}</p></div><div class="cause-tips"><b class="tip-heading">${icon("heart")}이럴 땐 이렇게</b><ul>${card.tips.map((tip, tipIndex) => `<li><span class="tip-number">${tipIndex + 1}</span><span>${esc(displayTip(tip.text, consult.input))}</span></li>`).join("")}</ul></div><details><summary><span>${icon("book-open")}근거 보기</span>${icon("chevron-down")}</summary><div class="evidence-body">${hasAI ? `<p>${esc(card.explain)}</p>` : ""}<p class="label">출처 자료</p><p class="source-text">${esc(displaySource(card))}</p>${sourceLink(card)}<p class="label">원문 발췌</p><blockquote>${esc(card.evidence)}</blockquote><p>선택한 답변: ${esc(selected)}</p>${card.verified === false ? '<span class="badge">검수 중</span>' : ""}</div></details></article>`;
  }).join("");
  const answers = window.QUESTIONS.map((question, index) => {
    const value = consult.input.answers?.[question.id];
    const label = value === "other" ? `기타: ${consult.input.otherAnswers?.[question.id] || ""}` : question.options.find((option) => option.value === value)?.label || "선택하지 않았어요";
    return `<div class="answer-row"><p>Q${index + 1}. ${esc(question.title)}</p><b>${esc(label)}</b></div>`;
  }).join("");
  container.innerHTML = `${safety}<header class="result-heading"><div class="result-meta"><span class="badge accent">${esc(consult.input.ageMonths)}개월 · ${esc(targetSummary)}</span><span class="badge">${icon("sparkles")}${consult.source === "ai" ? "AI 설명" : "기본 설명"}</span></div><h1 class="result-title">원인 후보</h1><p>가능성이 높은 원인 후보예요. 진단이 아니에요.</p><p class="muted result-note">원인은 여러 개가 함께 있을 수 있어요. 위에 있다고 더 확실한 건 아니에요.</p></header><div class="result-layout"><div class="cause-list">${candidates || '<div class="card empty"><p>답변만으로 원인 후보를 좁히기 어려워요.</p><p>관찰 내용을 확인하고 다시 답해 주세요.</p></div>'}</div><aside class="result-aside"><details class="card answers-summary" ${window.matchMedia?.("(min-width: 768px)")?.matches ? "open" : ""}><summary><span>내가 답한 내용 요약</span>${icon("chevron-down")}</summary><div class="answers-body">${answers}${consult.input.text ? `<div class="answer-row"><p>추가 메모</p><b>${esc(consult.input.text)}</b></div>` : ""}</div><a class="btn btn-secondary btn-block" href="#ask">답변 다시 살펴보기</a></details><div class="card feedback-card"><h2 class="title-md">결과가 맞았나요?</h2><div class="chips" role="group" aria-label="결과 피드백">${Object.entries(feedbackLabels).map(([value, label]) => `<button type="button" class="chip ${consult.feedbackResult === value ? "on" : ""}" aria-pressed="${consult.feedbackResult === value}" data-cause-feedback="${value}" data-inspection="${esc(consult.id)}">${label}</button>`).join("")}</div></div><a class="btn btn-primary btn-block" href="#log">${icon("clock")}검사 기록 보기</a></aside></div>`;
}
// 한 탭으로 검사별 피드백을 갱신한다. 이전 지도법 피드백과 섞지 않는다.
document.addEventListener("click", (event) => {
  const feedback = event.target.closest("[data-cause-feedback]");
  if (feedback) {
    const data = loadData(), consult = getInspections(data).find((c) => c.id === feedback.dataset.inspection);
    if (!consult || !feedbackLabels[feedback.dataset.causeFeedback]) return;
    consult.feedbackResult = feedback.dataset.causeFeedback;
    if (saveData(data)) { currentConsultId = consult.id; render(); toast("결과에 대한 답변을 저장했어요"); }
    else toast("저장하지 못했어요");
  }
  const startButton = event.target.closest("[data-start-quiz]");
  if (startButton) {
    quizIndex = 0;
    for (const id of Object.keys(quizAnswers)) delete quizAnswers[id];
    for (const id of Object.keys(quizOtherAnswers)) delete quizOtherAnswers[id];
    document.getElementById("askText").value = "";
    renderQuiz(); location.hash = "#ask";
  }
});

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8, "aria-hidden": "true" } });
}

// 참고 구현의 팡·확산·회전 흐름. 상태 문구는 한 번만 읽고 장식은 보조기술에서 숨긴다.
function analysisMarkup() {
  return `<div class="analysis-loader" id="analysisLoader" role="status" aria-live="polite"><span class="sr-only">답변을 정리하고 공공기관 자료와 비교해 원인 후보를 고르고 있어요.</span><div class="analysis-stage" aria-hidden="true"><div class="analysis-ring"></div><div class="analysis-ring dash"></div><div class="analysis-ripple"></div><div class="analysis-ripple r2"></div><div class="analysis-orbit">${orbitCauses.map(([key, label], index) => `<div class="analysis-node" style="--a:${index * 60}deg;--i:${index}"><div class="analysis-arm"><div class="analysis-face"><div class="analysis-chip">${icon(causeIcons[key])}</div><div class="analysis-label">${label}</div></div></div></div>`).join("")}</div><div class="analysis-core">${icon("baby")}</div></div><div class="analysis-status" aria-hidden="true"><div class="analysis-messages"><b>답변을 정리하고 있어요</b><b>공공기관 자료와 비교하고 있어요</b><b>원인 후보를 고르고 있어요</b></div><div class="analysis-dots"><i></i><i></i><i></i></div></div></div>`;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForAnalysis(request) {
  // 실패도 최소 표시 시간을 지켜 결과/오류가 애니메이션을 중간에 자르지 않게 한다.
  const [outcome] = await Promise.all([request.then((value) => ({ok: true, value}), (error) => ({ok: false, error})), delay(1500)]);
  document.getElementById("analysisLoader")?.classList.add("is-leaving");
  await delay(300);
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

// ---------- 이벤트 ----------
document.addEventListener("click", (e) => {
  const consultLink = e.target.closest("[data-consult]");
  if (consultLink) { currentConsultId = consultLink.dataset.consult; location.hash = "#result"; }
});

// 홈 제목을 다섯 번 탭하면 예시 데이터로 되돌린다.
let titleTaps = 0;
document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-reset-demo]")) return;
  titleTaps += 1;
  if (titleTaps < 5) return;
  titleTaps = 0;
  if (saveData(demoData())) { currentConsultId = null; quizIndex = 0; for (const id of Object.keys(quizAnswers)) delete quizAnswers[id]; for (const id of Object.keys(quizOtherAnswers)) delete quizOtherAnswers[id];
    document.getElementById("askText").value = ""; renderQuiz(); render(); toast("예시 데이터로 초기화했어요"); }
  else toast("초기화하지 못했어요");
});

document.getElementById("editProfile")?.addEventListener("click", () => {
  const profile = loadData().profile;
  openSheet(`<h2 class="title-md">아이 프로필 수정</h2><form id="profileForm"><div class="field"><label class="label" for="profileName">가명</label><input class="input" id="profileName" required maxlength="30" value="${esc(profile.name)}" /></div><div class="field"><label class="label" for="profileAge">개월 수</label><input class="input" id="profileAge" type="number" min="12" max="59" step="1" required value="${esc(profile.ageMonths)}" /></div><button class="btn btn-primary btn-block" type="submit">저장</button><button type="button" class="btn btn-ghost btn-block" data-clear-records>전체 기록 초기화</button></form>`);
});
document.getElementById("sheetBody")?.addEventListener("submit", (event) => {
  if (event.target.id !== "profileForm") return;
  event.preventDefault();
  const data = loadData();
  data.profile.name = document.getElementById("profileName").value.trim();
  data.profile.ageMonths = Number(document.getElementById("profileAge").value);
  if (!data.profile.name) return;
  if (!Number.isInteger(data.profile.ageMonths) || data.profile.ageMonths < 12 || data.profile.ageMonths > 59) { toast("개월 수는 12~59개월 사이로 입력해 주세요"); return; }
  if (saveData(data)) { closeSheet(); renderHome(); refreshIcons(); toast("프로필을 저장했어요"); }
  else toast("저장하지 못했어요");
});

// 질문 응답으로 원인 후보를 생성하고 저장한다.
document.getElementById("askForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (analysisState) return;
  if (quizIndex !== window.QUESTIONS.length || window.QUESTIONS.some((q) => !isQuizAnswered(q))) return;
  const input = getQuizInput();
  if (!Number.isInteger(input.ageMonths) || input.ageMonths < 0) { toast("개월 수를 확인해 주세요"); return; }
  form.hidden = true;
  analysisState = {};
  location.hash = "#result";
  showScreen("result");
  try {
    const mode = "fast";
    const result = await waitForAnalysis(askCauseAI(input, mode));
    pendingConsult = { input, answer: applySafety(result, input) };
    const data = loadData();
    const id = `c_${Date.now()}`;
    const cardIds = result._meta.cards.map((card) => card.id);
    data.consults.unshift({ id, createdAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date()), round: 1, parentId: null, input, cardIds, answer: pendingConsult.answer, source: result._meta.source, mode: result._meta.mode, feedbackResult: null, tried: [] });
    if (!saveData(data)) throw new Error("저장 실패");
    currentConsultId = id;
    analysisState = null;
    location.hash = "#result";
    showScreen("result");
    const container = document.getElementById("resultContent");
    container.classList.add("results-entering");
    setTimeout(() => container.classList.remove("results-entering"), 1000);
    toast(result._meta.fallback ? "AI 연결이 느려 기본 답변을 보여 드려요" : "검사 결과를 저장했어요");
  } catch {
    analysisState = null;
    location.hash = "#ask";
    showScreen("ask");
    toast("분석하지 못했어요. 다시 시도해 주세요");
  } finally {
    form.hidden = false;

  }
});

// 질문 답변은 뒤로 가도 유지하며 미응답 상태에서는 진행하지 않는다.
let quizIndex = 0;
const quizAnswers = {};
const quizOtherAnswers = {};
function isQuizAnswered(q) { return Boolean(quizAnswers[q.id]) && (quizAnswers[q.id] !== "other" || Boolean(quizOtherAnswers[q.id]?.trim())); }
function getQuizInput() {
  const selected = (id) => window.QUESTIONS.find((q) => q.id === id)?.options.find((o) => o.value === quizAnswers[id])?.label || "";
  return { answers: { ...quizAnswers }, otherAnswers: Object.fromEntries(Object.entries(quizOtherAnswers).filter(([id]) => quizAnswers[id] === "other")), target: selected("q-target"), situation: selected("q-situation"), text: document.getElementById("askText").value.trim(), ageMonths: getProfile().ageMonths };
}
function renderQuiz() {
  const questions = window.QUESTIONS, question = questions[quizIndex], done = !question;
  const selected = question ? quizAnswers[question.id] : null;
  document.getElementById("questionContent").innerHTML = `<p class="section"><span class="question-count">${done ? questions.length : quizIndex + 1} / ${questions.length}</span></p><div class="progress" role="progressbar" aria-label="질문 진행" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${quizIndex}"><i style="width:calc(100% * ${quizIndex} / ${questions.length})"></i></div>` + (done ? '<h2 class="title-md section">질문에 모두 답했어요</h2><p>특별한 상황이 있으면 적어 주세요.</p>' : `<h2 class="title-md section" id="questionTitle">${esc(question.title)}</h2>${question.help ? `<p class="muted section">${esc(question.help)}</p>` : ""}<div class="option-list ${selected ? "has-selection" : ""}" id="quizOptions" role="group" aria-labelledby="questionTitle">${question.options.map((option) => `<div class="field"><button type="button" class="btn question-option ${selected === option.value ? "btn-primary is-selected" : "btn-secondary"} btn-block" data-answer="${option.value}" aria-pressed="${selected === option.value}"><span class="option-icon">${icon(optionIcon(question.id, option.value))}</span><span class="option-label">${esc(option.label)}</span><span class="option-check">${icon("check")}</span></button></div>`).join("")}</div>${question.options.some((option) => option.value === "other") ? `<div class="field" id="quizOtherField" ${selected === "other" ? "" : "hidden"}><label class="label" for="quizOther">기타 직접 입력</label><input class="input" id="quizOther" maxlength="40" value="${esc(quizOtherAnswers[question.id] || "")}" placeholder="직접 입력해 주세요" /></div>` : ""}`);
  document.getElementById("quizBack").hidden = quizIndex === 0;
  document.getElementById("quizNext").hidden = done;
  document.getElementById("quizNext").disabled = !done && !isQuizAnswered(question);
  document.getElementById("quizSubmit").hidden = !done;
  document.getElementById("quizNote").hidden = !done;
  refreshIcons();
}
// 버튼을 다시 만들지 않고 선택 상태를 갱신하여 전환 효과와 키보드 초점을 유지한다.
function syncQuizSelection() {
  const question = window.QUESTIONS[quizIndex];
  if (!question) return;
  const selected = quizAnswers[question.id], group = document.getElementById("quizOptions");
  group.classList.toggle("has-selection", Boolean(selected));
  group.querySelectorAll("[data-answer]").forEach((button) => {
    const active = button.dataset.answer === selected;
    button.classList.toggle("is-selected", active);
    button.classList.toggle("btn-primary", active);
    button.classList.toggle("btn-secondary", !active);
    button.setAttribute("aria-pressed", String(active));
  });
  const other = document.getElementById("quizOtherField");
  if (other) other.hidden = selected !== "other";
  document.getElementById("quizNext").disabled = !isQuizAnswered(question);
}
document.getElementById("questionContent").addEventListener("click", (event) => {
  const option = event.target.closest("[data-answer]"), question = window.QUESTIONS[quizIndex];
  if (!option || !question?.options.some((item) => item.value === option.dataset.answer)) return;
  quizAnswers[question.id] = option.dataset.answer;
  syncQuizSelection();
});

document.getElementById("questionContent").addEventListener("input", (event) => {
  if (event.target.id !== "quizOther") return;
  quizOtherAnswers[window.QUESTIONS[quizIndex].id] = event.target.value;
  document.getElementById("quizNext").disabled = !isQuizAnswered(window.QUESTIONS[quizIndex]);
});
document.getElementById("quizNext").addEventListener("click", () => {
  if (!isQuizAnswered(window.QUESTIONS[quizIndex])) return;
  quizIndex += 1; renderQuiz();
});
document.getElementById("quizBack").addEventListener("click", () => { quizIndex = Math.max(0, quizIndex - 1); renderQuiz(); });
renderQuiz();

showScreen(location.hash.slice(1) || "home");

// 삭제는 바텀시트에서 확인한 뒤 수행하며 프로필과 시연 복원 기능은 보존한다.
document.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-delete-record]"), clear = event.target.closest("[data-clear-records]");
  if (remove || clear) {
    openSheet(`<h2 class="title-md">${clear ? "전체 기록을 초기화할까요?" : "이 기록을 삭제할까요?"}</h2><div class="section"><button type="button" class="btn btn-secondary" data-cancel-delete>취소</button><button type="button" class="btn btn-primary" data-confirm-delete="${clear ? "all" : esc(remove.dataset.deleteRecord)}">삭제</button></div>`);
  }
  if (event.target.closest("[data-cancel-delete]")) closeSheet();
  const confirm = event.target.closest("[data-confirm-delete]");
  if (!confirm) return;
  const data = loadData(), id = confirm.dataset.confirmDelete;
  data.consults = id === "all" ? [] : data.consults.filter((c) => c.id !== id);
  data.feedback = id === "all" ? [] : data.feedback.filter((f) => f.consultId !== id);
  if (saveData(data)) { if (id === "all" || currentConsultId === id) currentConsultId = null; closeSheet(); render(); toast(id === "all" ? "전체 기록을 초기화했어요" : "기록을 삭제했어요"); }
  else toast("삭제하지 못했어요");
});
