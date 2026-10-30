// 대상과 상황에 맞는 카드에 점수를 매기고 연령 범위에 맞는 상위 3개를 반환한다.
function searchCards({ target = "", situation = "", text = "", ageMonths } = {}) {
  const input = `${situation} ${text}`.toLowerCase();
  const words = input.split(/\s+/).filter(Boolean);
  return (window.KNOWLEDGE || [])
    .filter((card) => ageMonths == null || ageMonths === "" ||
      (Number(ageMonths) >= card.ageMonths[0] && Number(ageMonths) <= card.ageMonths[1]))
    .map((card, index) => {
      let score = target && card.targets.includes(target) ? 2 : 0;
      for (const tag of card.tags) {
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
  return cards.length ? cards : window.KNOWLEDGE.filter((card) => card.id === "bite-basic");
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

