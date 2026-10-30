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

const AI_MODE = "mock";

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
// 검색된 근거로 규칙 기반 답변을 만든다.
async function askAI(input, history = null) {
  const cards = getConsultCards(input);
  return new Promise((resolve) => setTimeout(() => resolve(ruleAnswer(input, cards, history)), 1000));
}

