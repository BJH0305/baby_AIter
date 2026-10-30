// 대상과 상황에 맞는 카드에 점수를 매기고 연령 범위에 맞는 상위 3개를 반환한다.
function searchCards({ target = "", situation = "", text = "", ageMonths } = {}) {
  const input = `${situation} ${text}`.toLowerCase();
  const words = input.split(/\s+/).filter(Boolean);
  return (window.KNOWLEDGE || [])
    .filter((card) => ageMonths == null || ageMonths === "" ||
      (Number(ageMonths) >= card.ageMonths[0] && Number(ageMonths) <= card.ageMonths[1]))
    .map((card, index) => {
      let score = target && (card.targets || []).includes(target) ? 2 : 0;
      for (const tag of (card.tags || card.clues || [])) {
        const keyword = tag.toLowerCase();
        if (input.includes(keyword) || words.some((word) => word.length >= 2 && keyword.includes(word))) score += 1;
      }
      return { card, score, index };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map((entry) => entry.card);
}

// 상담 정보와 선택된 근거, 피드백을 안전한 답변 지시문으로 묶는다.
function buildPrompt(input, cards, history) {
  return [
    "제공된 근거 카드 내용만 사용하고, 내용이 없으면 모른다고 답하세요. 진단하지 말고 출처 카드 id를 표시하세요.",
    "피드백이 있으면 효과 있던 방법은 유지·강화하고 효과 없던 방법은 근거 카드의 다른 방법으로 교체하며 changes에 변경 내용을 요약하세요.",
    `상담: ${JSON.stringify(input)}`,
    `근거 카드: ${JSON.stringify(cards)}`,
    `이전 기록: ${JSON.stringify(history || null)}`
  ].join("\n");
}

// 일치하는 카드가 없으면 기본 카드를 사용한다.
function getConsultCards(input) {
  const cards = searchCards(input);
  // 이전 상담 화면도 단계별 변경 중 동작하도록 원인 카드에서 임시 호환 값을 만든다.
  const selected = cards.length ? cards : window.KNOWLEDGE.slice(0, 3);
  return selected.map((card) => ({ ...card, causes: card.causes || [card.explain], methods: card.methods || (card.tips || []).map((tip) => tip.text) }));
}
// 서버 답변의 지도법이 보낸 카드에 속하는지 검사한다.
function isValidAnswer(answer, cards) {
  if (!answer || !Array.isArray(answer.methods) || answer.methods.length !== 3 ||
      !Array.isArray(answer.causes) || !answer.causes.every((cause) => typeof cause === "string") ||
      !["green", "yellow"].includes(answer.level) || typeof answer.note !== "string") return false;
  const ids = new Set();
  for (const method of answer.methods) {
    const card = cards.find((item) => item.id === method?.cardId);
    if (!card || typeof method.id !== "string" || !method.id.startsWith(`${card.id}-`)) return false;
    const suffix = method.id.slice(card.id.length + 1);
    if (!/^(0|[1-9]\d*)$/.test(suffix) || !card.methods[Number(suffix)] ||
        method.title !== card.methods[Number(suffix)] || typeof method.how !== "string" || typeof method.why !== "string" || ids.has(method.id)) return false;
    ids.add(method.id);
  }
  if (answer.changes != null && (!Array.isArray(answer.changes.kept) || !answer.changes.kept.every((id) => typeof id === "string") || !Array.isArray(answer.changes.replaced) || !answer.changes.replaced.every((item) => typeof item?.from === "string" && typeof item?.to === "string") || typeof answer.changes.summary !== "string")) return false;
  return true;
}

// 서버가 실패하거나 지연되면 동일한 카드로 기본 답변을 만든다.
async function askAI(input, history = null, requestedMode = "fast") {
  const mode = requestedMode === "deep" ? "deep" : "fast";
  const cards = getConsultCards(input);
  const config = window.APP_CONFIG || {};
  const useLive = config.AI_MODE === "live";
  if (useLive && config.API_URL) {
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, mode === "deep" ? 30000 : 12000); });
      const request = fetch(config.API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, cards: cards.map(({ id, title, causes, methods }) => ({ id, title, causes, methods })), history, mode }), signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("request failed");
        return response.json();
      });
      const result = await Promise.race([request, timeout]);
      if (!["fast", "deep"].includes(result.mode) || !isValidAnswer(result.answer, cards)) throw new Error("invalid answer");
      Object.defineProperty(result.answer, "_meta", { value: { source: "ai", cards, fallback: false, mode: result.mode } });
      return result.answer;
    } catch {} finally { clearTimeout(timer); }
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const answer = ruleAnswer(input, cards, history);
  Object.defineProperty(answer, "_meta", { value: { source: "rule", cards, fallback: useLive, mode } });
  return answer;
}


// 선택한 답변의 내부 가중치만으로 후보를 정렬한다. 메모·대상·장소만으로 원인을 추정하지 않는다.
function scoreCauses(input = {}) {
  const age = Number(input.ageMonths);
  if (!Number.isInteger(age) || age < 12 || age > 59) return [];
  return window.KNOWLEDGE.map((card, index) => {
    let score = 0;
    const reasons = [];
    for (const question of window.QUESTIONS) {
      const option = question.options.find((o) => o.value === input.answers?.[question.id]);
      const weight = option?.scores?.[card.id.replace("cause-", "")] || 0;
      if (weight > 0) { score += weight; reasons.push(`${question.title} → ${option.label}`); }
    }
    return { cardId: card.id, score, reasons, index };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3);
}
// 증거가 있는 후보만 표시한다. 동점은 카드 순서로 정렬하되 가능성 차이를 주장하지 않는다.
function createCauseAnswer(input) {
  const candidates = scoreCauses(input).map(({ cardId, reasons }) => ({ cardId, why: reasons.join(" / ") }));
  const answer = { type: "cause", candidates, causes: [], methods: [], level: "green", note: "가능성이 높은 원인 후보예요. 진단이 아니에요." };
  Object.defineProperty(answer, "_meta", { value: { source: "rule", cards: candidates.map((c) => window.KNOWLEDGE.find((card) => card.id === c.cardId)), fallback: false, mode: "fast" } });
  return answer;
}

// JSON 형식뿐 아니라 후보 id·중복·문장 길이·금지 표현을 검증한다.
function validCauseExplanations(answer, candidates) {
  if (!answer || !Array.isArray(answer.explanations) || answer.explanations.length !== candidates.length || Object.keys(answer).some((key) => key !== "explanations")) return false;
  const allowed = new Set(candidates.map((c) => c.cardId)), seen = new Set();
  return answer.explanations.every((item) => {
    if (!item || Object.keys(item).some((key) => !["cardId", "why"].includes(key)) || !allowed.has(item.cardId) || seen.has(item.cardId) || typeof item.why !== "string" || !item.why.trim() || item.why.length > 300 || /[%％]|정확도|확률|진단|장애|질환|ADHD|자폐|확실|틀림없|반드시|원인입니다/i.test(item.why)) return false;
    seen.add(item.cardId); return true;
  });
}
// AI는 규칙이 정한 후보의 설명만 바꾼다. 위험 신호는 API 호출보다 먼저 처리한다.
async function askCauseAI(input, requestedMode = "fast") {
  const base = createCauseAnswer(input), config = window.APP_CONFIG || {};
  base.level = applySafety(base, input).level;
  const mode = requestedMode === "deep" ? "deep" : "fast";
  if (base.level === "red" || !base.candidates.length || config.AI_MODE !== "live") return base;
  let timer;
  const controller = new AbortController();
  try {
    if (!config.API_URL) throw new Error("no endpoint");
    // Worker의 7항목 한도 안에서 안전·컨디션을 묶되 직접 입력 문자열은 그대로 전달한다.
    const answerText = (q) => input.answers?.[q.id] === "other" ? (input.otherAnswers?.[q.id] || "") : (q.options.find((o) => o.value === input.answers?.[q.id])?.label || "잘 모르겠어요");
    const selectedAnswers = window.QUESTIONS.filter((q) => q.id !== "q-condition").map((q) => ({ question: q.title, answer: q.id === "q-safety" ? `안전: ${answerText(q)} / 컨디션: ${answerText(window.QUESTIONS.find((item) => item.id === "q-condition"))}` : answerText(q) }));
    const request = fetch(config.API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ task: "cause", mode, input: { ageMonths: input.ageMonths, answers: selectedAnswers, text: input.text || "" }, cards: base._meta.cards.map(({ id, title, clues, explain, evidence }) => ({ id, title, clues, explain, evidence })), candidates: base.candidates })
    }).then(async (res) => { if (!res.ok) throw new Error("request failed"); return res.json(); });
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, mode === "deep" ? 30000 : 12000); });
    const result = await Promise.race([request, timeout]);
    if (!validCauseExplanations(result.answer, base.candidates)) throw new Error("invalid cause answer");
    const answer = { ...base, candidates: base.candidates.map((c) => ({ ...c, why: result.answer.explanations.find((e) => e.cardId === c.cardId).why })) };
    Object.defineProperty(answer, "_meta", { value: { ...base._meta, source: "ai", mode } });
    return answer;
  } catch {
    const answer = { ...base };
    Object.defineProperty(answer, "_meta", { value: { ...base._meta, fallback: true, mode } });
    return answer;
  } finally { clearTimeout(timer); }
}
