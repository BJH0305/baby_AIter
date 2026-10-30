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
