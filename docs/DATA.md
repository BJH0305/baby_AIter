# DATA.md — 데이터 형식 (Claude 결정, T3~T10 공통)

## 1. localStorage
- 키: `babyaiter-v1` (app.js의 STORE_KEY를 이걸로 바꾼다)
- 값:
```js
{
  profile: { name: "도윤", ageMonths: 38, hasSibling: true },   // 가명만
  consults: [ Consult, ... ],     // 상담 (최신이 앞)
  feedback: [ Feedback, ... ]     // 적용 결과 기록 (최신이 앞)
}
```

## 2. Consult (상담 1건)
```js
{
  id: "c_1730280000000",
  createdAt: "2026-10-27",
  round: 1,                       // 1 = 첫 상담, 2 = 피드백 반영 재상담
  parentId: null,                 // round 2면 이전 상담 id
  input: { target: "동생", situation: "동생을 안고 있을 때", text: "...", ageMonths: 38 },
  cardIds: ["bite-sibling", "bite-basic"],
  answer: Answer,
  source: "ai" | "rule",          // 답변 생성 방식
  tried: ["m1", "m3"]             // "해 볼게요" 누른 methods id
}
```

## 3. Answer (askAI 반환값, mock·live 동일)
```js
{
  causes: ["...", "..."],
  methods: [ { id: "m1", title: "...", how: "...", why: "...", cardId: "bite-sibling" } ],  // 3개
  level: "green" | "yellow" | "red",
  note: "...",
  changes: null | { kept: ["m1"], replaced: [{ from: "m2", to: "m4" }], summary: "..." }   // round 2에서만
}
```

## 4. Feedback (적용 결과 1건)
```js
{ id: "f_...", consultId: "c_...", methodId: "m1", date: "2026-10-28",
  result: "good" | "some" | "none",   // 효과 있음 / 조금 / 없음
  memo: "단독 시간 10분 했더니 동생 깨물기 없었음" }
```

## 5. askAI(input, history)
- 반환값은 Answer이며, 저장하지 않는 `_meta`에 source, cards, fallback이 담긴다.
- history 형식 (첫 상담이면 `null`):
```js
{ previous: { input, methods: [ {id, title} ] },
  feedback: [ { methodId, title, result, memo, date } ] }
```
- buildPrompt는 history가 있으면 "효과 있던 방법은 유지·강화, 효과 없던 방법은 근거 카드의 다른 방법으로 교체, changes에 무엇을 바꿨는지 요약"을 지시한다.

## 6. 규칙 기반 답변 (REVIEW R1)
- 검색한 카드의 원인·지도법만 사용한다. 결과가 없으면 기본 카드를 사용한다.
- 피드백 good/some은 유지하고 none은 아직 사용하지 않은 지도법으로 교체한다.
- 지도법 ID는 `카드id-인덱스` 형식이다.
