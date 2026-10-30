// =========================================================
// 공통 동작: 화면 전환(해시 라우팅), 저장소, 토스트, 바텀시트
// 서버 없이 동작한다. 데이터는 브라우저 localStorage에 저장.
// =========================================================

// 상담 화면에서 결과 화면으로 넘길 임시 데이터.
let pendingConsult = null;
let currentConsultId = null;
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
  // 입력 화면에서는 탭바 숨김
  const tabbar = document.getElementById("tabbar");
  if (tabbar) tabbar.hidden = false;
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
  if (age) age.textContent = `${getProfile().name} · ${getProfile().ageMonths}개월`;
  renderHome();
  renderResult();
  renderLog();
  refreshIcons();
}

// 선택한 지도법별 피드백 입력과 저장된 기록을 보여 준다.
function renderLegacyLog() {
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
    data.consults.unshift({ id, createdAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date()), round: 2, parentId: previous.id, input: previous.input, cardIds: result._meta.cards.map((card) => card.id), answer, source: result._meta.source, mode: result._meta.mode, tried: [] });
    if (!saveData(data)) throw new Error("저장 실패");
    currentConsultId = id;
    location.hash = "#result";
    toast(result._meta.fallback ? "AI 연결이 느려 기본 답변을 보여 드려요" : "다시 상담한 결과를 저장했어요");
  } catch { toast("다시 상담하지 못했어요"); }
  finally { button.disabled = false; button.textContent = buttonText; }
}

// 홈은 저장된 프로필과 상담, 최근 피드백을 보여 준다.
function renderLegacyHome() {
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
  const consult = loadData().consults.find((item) => item.id === currentConsultId) || (!currentConsultId ? getInspections()[0] : null);
  if (!container) return;
  if (!consult) { container.innerHTML = '<div class="empty"><p>아직 검사 결과가 없어요</p><a class="btn btn-secondary" href="#ask">질문 검사</a></div>'; return; }
  if (consult.answer.type === "cause") { currentConsultId = consult.id; renderCauseResult(container, consult); return; }
  container.innerHTML = '<div class="empty"><p>이전 상담 기록이에요. 새로운 질문 검사를 시작해 주세요.</p><a class="btn btn-secondary" href="#ask">질문 검사로</a></div>';
  return;
  // 아래 옛 상담 결과 코드는 보존하되 화면에서는 사용하지 않는다.
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
function inspectionRow(consult) {
  return `<div class="card section"><p class="muted">${esc(consult.createdAt)}</p><h3 class="title-md">${esc(inspectionTitle(consult))}</h3><p>결과가 맞았나요? ${esc(feedbackLabels[consult.feedbackResult] || "아직 답하지 않았어요")}</p><button class="btn btn-secondary" type="button" data-consult="${esc(consult.id)}">결과 보기</button><button class="btn btn-ghost" type="button" data-delete-record="${esc(consult.id)}">삭제</button></div>`;
}
function renderHome() {
  const data = loadData();
  document.getElementById("profileSummary").textContent = `${data.profile.name} · ${data.profile.ageMonths}개월`;
  const recent = getInspections(data).slice(0, 3);
  document.getElementById("homeRecent").innerHTML = recent.length ? recent.map(inspectionRow).join("") : '<div class="empty"><p>아직 검사 기록이 없어요</p><p>질문에 답하고 원인 후보를 살펴보세요.</p></div>';
}
function renderLog() {
  const inspections = getInspections();
  document.getElementById("logContent").innerHTML = inspections.length ? inspections.map(inspectionRow).join("") : '<div class="empty"><p>아직 검사 기록이 없어요</p><button class="btn btn-secondary" data-start-quiz>검사 시작하기</button></div>';
}
// 원문 데이터는 유지하고 대응 문장의 대상 표현만 선택 답변에 맞춘다.
function displayTip(text, input) {
  const target = input.answers?.["q-target"];
  if (target === "peer") return text;
  if (target === "sibling") return text.replace(/친구/g, "동생");
  return text.replace(/친구(?:에게|한테|의|가|를|와|는|도)?\s*/g, "").replace(/ {2,}/g, " ").trim();
}
// 첫 화면에는 요약만 표시하고, 선택 답변·AI 설명·원문 근거는 접어 둔다.
function renderCauseResult(container, consult) {
  const answer = applySafety(consult.answer, consult.input);
  const safety = answer.level === "red" ? '<div class="section card" role="alert"><h2 class="title-md">전문가 상담 권장</h2><p>먼저 물린 사람의 안전과 상처를 확인해 주세요. 육아종합지원센터 또는 소아청소년과에 상담해 보세요.</p></div>' : "";
  const targetSummary = {peer: "친구를 깨물었을 때", sibling: "형제자매를 깨물었을 때", adult: "보호자·어른을 깨물었을 때"}[consult.input.answers?.["q-target"]] || "깨물기 상황";
  const inputSummary = `${consult.input.ageMonths}개월 · ${targetSummary}`;
  container.innerHTML = `${safety}<p class="section muted">${esc(inputSummary)}</p><div class="section"><p>가능성이 높은 원인 후보예요. 진단이 아니에요.</p><p class="muted result-note">원인은 여러 개가 함께 있을 수 있어요. 위에 있다고 더 확실한 건 아니에요.</p><span class="badge">${consult.source === "ai" ? "AI 설명" : "기본 설명"}</span></div>` + (answer.candidates.length ? answer.candidates.map((candidate) => {
    const card = window.KNOWLEDGE.find((c) => c.id === candidate.cardId);
    if (!card) return "";
    const selected = scoreCauses(consult.input).find((c) => c.cardId === card.id)?.reasons.join(" / ") || "[확인 필요]";
    // AI가 쓴 이유를 먼저 보여 주고, 없는 경우 카드의 전체 설명을 사용한다.
    const hasAI = consult.source === "ai" && typeof candidate.why === "string" && candidate.why.trim().length > 0;
    const explanation = hasAI ? candidate.why : card.explain;
    return `<article class="section card cause-card"><h2 class="title-md">${esc(card.title)}</h2>${hasAI ? '<p class="label">우리 아이 답변으로 본 이유</p>' : ""}<p class="cause-summary">${esc(explanation)}</p><div class="cause-tips"><b>이럴 땐 이렇게</b><ul>${card.tips.map((tip) => `<li>${esc(displayTip(tip.text, consult.input))}</li>`).join("")}</ul></div><details><summary>근거 보기</summary><div class="evidence-body">${hasAI ? `<p>${esc(card.explain)}</p>` : ""}<p>선택한 답변: ${esc(selected)}</p><p class="muted source-text">${esc(displaySource(card))}</p>${sourceLink(card)}<blockquote>${esc(card.evidence)}</blockquote>${card.verified === false ? '<span class="badge">검수 중</span>' : ""}</div></details></article>`;
  }).join("") : '<div class="section empty"><p>답변만으로 원인 후보를 좁히기 어려워요.</p><p>관찰 내용을 확인하고 다시 답해 주세요.</p></div>') + `<div class="section card"><h2 class="title-md">결과가 맞았나요?</h2><div class="chips" role="group" aria-label="결과 피드백">${Object.entries(feedbackLabels).map(([value, label]) => `<button type="button" class="chip ${consult.feedbackResult === value ? "on" : ""}" aria-pressed="${consult.feedbackResult === value}" data-cause-feedback="${value}" data-inspection="${esc(consult.id)}">${label}</button>`).join("")}</div></div><a class="btn btn-secondary btn-block" href="#ask">답변 다시 살펴보기</a><a class="btn btn-ghost btn-block" href="#log">검사 기록 보기</a>`;
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
  if (event.target.closest("[data-start-quiz]")) {
    quizIndex = 0;
    for (const id of Object.keys(quizAnswers)) delete quizAnswers[id];
    for (const id of Object.keys(quizOtherAnswers)) delete quizOtherAnswers[id];
    document.getElementById("askText").value = "";
    renderQuiz(); location.hash = "#ask";
  }
});

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
  if (saveData(demoData())) { currentConsultId = null; quizIndex = 0; for (const id of Object.keys(quizAnswers)) delete quizAnswers[id]; for (const id of Object.keys(quizOtherAnswers)) delete quizOtherAnswers[id];
    document.getElementById("askText").value = ""; renderQuiz(); render(); toast("예시 데이터로 초기화했어요"); }
  else toast("초기화하지 못했어요");
});

document.getElementById("editProfile")?.addEventListener("click", () => {
  const profile = loadData().profile;
  openSheet(`<h2 class="title-md">아이 프로필 수정</h2><form id="profileForm"><div class="field"><label class="label" for="profileName">가명</label><input class="input" id="profileName" required maxlength="30" value="${esc(profile.name)}" /></div><div class="field"><label class="label" for="profileAge">개월 수</label><input class="input" id="profileAge" type="number" min="0" step="1" required value="${esc(profile.ageMonths)}" /></div><button class="btn btn-primary btn-block" type="submit">저장</button><button type="button" class="btn btn-ghost btn-block" data-clear-records>전체 기록 초기화</button></form>`);
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
  if (quizIndex !== window.QUESTIONS.length || window.QUESTIONS.some((q) => !isQuizAnswered(q))) return;
  const input = getQuizInput();
  if (!Number.isInteger(input.ageMonths) || input.ageMonths < 0) { toast("개월 수를 확인해 주세요"); return; }
  form.hidden = true;
  loading.hidden = false;
  try {
    const mode = "fast";
    loading.querySelector("p").textContent = mode === "deep" ? "자료를 꼼꼼히 비교하고 있어요" : "분석하고 있어요";
    const result = await askCauseAI(input, mode);
    pendingConsult = { input, answer: applySafety(result, input) };
    const data = loadData();
    const id = `c_${Date.now()}`;
    const cardIds = result._meta.cards.map((card) => card.id);
    data.consults.unshift({ id, createdAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date()), round: 1, parentId: null, input, cardIds, answer: pendingConsult.answer, source: result._meta.source, mode: result._meta.mode, tried: [] });
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
const quizOtherAnswers = {};
function isQuizAnswered(q) { return Boolean(quizAnswers[q.id]) && (quizAnswers[q.id] !== "other" || Boolean(quizOtherAnswers[q.id]?.trim())); }
function getQuizInput() {
  const selected = (id) => window.QUESTIONS.find((q) => q.id === id)?.options.find((o) => o.value === quizAnswers[id])?.label || "";
  return { answers: { ...quizAnswers }, otherAnswers: Object.fromEntries(Object.entries(quizOtherAnswers).filter(([id]) => quizAnswers[id] === "other")), target: selected("q-target"), situation: selected("q-situation"), text: document.getElementById("askText").value.trim(), ageMonths: getProfile().ageMonths };
}
function renderQuiz() {
  const questions = window.QUESTIONS, question = questions[quizIndex], done = !question;
  document.getElementById("questionContent").innerHTML = `<p class="section">${done ? questions.length : quizIndex + 1} / ${questions.length}</p><div class="progress" role="progressbar" aria-label="질문 진행" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${quizIndex}"><i style="width:calc(100% * ${quizIndex} / ${questions.length})"></i></div>` + (done ? '<h2 class="title-md section">질문에 모두 답했어요</h2><p>특별한 상황이 있으면 적어 주세요.</p>' : `<h2 class="title-md section" id="questionTitle">${esc(question.title)}</h2>${question.help ? `<p class="muted section">${esc(question.help)}</p>` : ""}<div role="group" aria-labelledby="questionTitle">${question.options.map((o) => `<div class="field"><button type="button" class="btn ${quizAnswers[question.id] === o.value ? "btn-primary" : "btn-secondary"} btn-block" data-answer="${o.value}" aria-pressed="${quizAnswers[question.id] === o.value}">${esc(o.label)}</button></div>`).join("")}</div>`);
  if (!done && quizAnswers[question.id] === "other") document.getElementById("questionContent").innerHTML += `<div class="field"><label class="label" for="quizOther">기타 직접 입력</label><input class="input" id="quizOther" maxlength="40" value="${esc(quizOtherAnswers[question.id] || "")}" placeholder="직접 입력해 주세요" /></div>`;
  document.getElementById("quizBack").hidden = quizIndex === 0;
  document.getElementById("quizNext").hidden = done;
  document.getElementById("quizNext").disabled = !done && !isQuizAnswered(question);
  document.getElementById("quizSubmit").hidden = !done;
  document.getElementById("quizNote").hidden = !done;
}
document.getElementById("questionContent").addEventListener("click", (e) => {
  const option = e.target.closest("[data-answer]");
  if (!option) return;
  quizAnswers[window.QUESTIONS[quizIndex].id] = option.dataset.answer;
  renderQuiz();
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
