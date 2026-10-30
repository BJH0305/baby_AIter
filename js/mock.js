// 시연 답변은 지식 카드에 적힌 문장을 그대로 사용한다.
const siblingCard = window.KNOWLEDGE.find((card) => card.id === "bite-sibling");
const basicCard = window.KNOWLEDGE.find((card) => card.id === "bite-basic");
function mockMethod(id, card, index) {
  return { id, title: card.methods[index], how: card.methods[index], why: card.causes[0], cardId: card.id };
}
const MOCK = {
  first: {
    causes: [siblingCard.causes[0], basicCard.causes[0]],
    methods: [mockMethod("m1", siblingCard, 0), mockMethod("m2", basicCard, 0), mockMethod("m3", siblingCard, 1)],
    level: "green", note: "", changes: null
  },
  second: {
    causes: [siblingCard.causes[0], basicCard.causes[0]],
    methods: [mockMethod("m1", siblingCard, 0), mockMethod("m4", basicCard, 2), mockMethod("m3", siblingCard, 1)],
    level: "green", note: "",
    changes: { kept: ["m1"], replaced: [{ from: "m2", to: "m4" }], summary: siblingCard.methods[0] + " / " + basicCard.methods[2] }
  }
};
