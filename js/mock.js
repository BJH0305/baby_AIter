// 근거 카드의 방법을 번갈아 고르고 피드백에 따라 유지·교체한다.
function ruleAnswer(input, cards, history = null) {
  const candidates = [];
  const max = Math.max(0, ...cards.map((card) => card.methods.length));
  for (let i = 0; i < max; i++) for (const card of cards) {
    if (card.methods[i]) candidates.push({ id: `${card.id}-${i}`, title: card.methods[i], how: card.methods[i], why: card.causes[0] || "", cardId: card.id });
  }
  const feedback = history?.feedback || [], previous = history?.previous?.methods || [];
  const latest = new Map();
  for (const item of feedback) if (!latest.has(item.methodId)) latest.set(item.methodId, item.result);
  const used = new Set(previous.map((method) => method.id));
  const kept = [], replaced = [], methods = [];
  for (const old of previous) {
    const candidate = candidates.find((item) => item.id === old.id);
    if ((latest.get(old.id) === "good" || latest.get(old.id) === "some") && candidate && methods.length < 3) { methods.push(candidate); kept.push(candidate.id); }
  }
  for (const old of previous) {
    if (latest.get(old.id) !== "none") continue;
    const replacement = candidates.find((item) => !used.has(item.id));
    if (replacement && methods.length < 3) { methods.push(replacement); used.add(replacement.id); replaced.push({ from: old.id, to: replacement.id }); }
  }
  for (const candidate of candidates) {
    if (methods.length >= 3) break;
    if (!methods.some((method) => method.id === candidate.id) && latest.get(candidate.id) !== "none") methods.push(candidate);
  }
  const descriptions = [];
  if (kept.length) descriptions.push(`효과 있던 ${methods.find((method) => method.id === kept[0]).title}는 유지해요`);
  if (replaced.length) descriptions.push(`${previous.find((method) => method.id === replaced[0].from)?.title || "기존 방법"} 대신 ${methods.find((method) => method.id === replaced[0].to).title}를 제안해요`);
  return { causes: [...new Set(cards.map((card) => card.causes[0]).filter(Boolean))].slice(0, 2), methods: methods.slice(0, 3), level: "green", note: "", changes: feedback.length ? { kept, replaced, summary: descriptions.join(". ") } : null };
}
