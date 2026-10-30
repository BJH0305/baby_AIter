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
  mode: "fast" | "deep",          // 서버가 실제 사용한 답변 방식
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


## 7. 범위 변경 후 검사 기록 (T20~T22)
- 기존 `babyaiter-v1` 키, `profile`, `consults`, `feedback`를 유지한다. 옛 상담·지도법 피드백은 삭제하지 않고 새 화면에서 숨긴다.
- 새 검사는 `consult.answer.type === "cause"`로 구별한다.
- `consult.input.answers`: `js/questions.js`의 질문 id → 선택지 value. `text`는 선택 메모, `ageMonths`는 24~47 범위다.
- `consult.answer.candidates`: 규칙이 정한 순서의 `{cardId, why}` 목록. AI는 `why`만 바꾸며 점수·가능성 수치는 표시하지 않는다.
- `consult.feedbackResult`: `yes`(맞아요), `some`(일부), `no`(아니에요). 미응답은 필드가 없다. 같은 검사의 답을 다시 누르면 기존 값을 갱신한다.
- `createdAt`은 Asia/Seoul 날짜이며 목록은 최신 저장 순서다. 예시 초기화는 도윤(가명, 38개월)의 검사 2회와 해당 피드백을 돌려준다.
- 출처 원본·로컬 파일명·공개 URL 미확인 메모는 `knowledge.js`에 보존한다. 화면용 `displaySource`는 기관·자료 제목·쪽수만 만든다.
- 기본 설명과 선택 답변이 같으면 중복 설명을 생략한다. 원문 인용과 선택 답변은 `근거 보기` 안에 표시한다.

## 팀 결정 후속: 대응 목록
- 원인 카드의 `tip`은 `tips: [{text, page, evidence}]`로 전환. `page`는 각 대응의 근거 쪽수, `evidence`는 원문 대조용 발췌다.
- 부모 화면에는 대응 문장과 쪽수만 목록으로 표시한다. 대응은 같은 원인의 근거 PDF에서 확인하며 기존 안전 규칙과 AI 설명 요청 형식은 유지한다.

## F0~F7 후속 형식
- `input.answers`는 선택지 값, `input.otherAnswers`는 기타 원문(문항당 40자). 기타는 점수를 주지 않고 안전 단어 검사는 적용한다.
- Worker는 변경하지 않는다. 답변 7항목 한도에 맞춰 안전·컨디션을 묶어 8문항 입력을 손실 없이 전달한다.
- 질문 q-safety가 yes이면 안전 안내 우선. 이전 q-condition injury 기록도 계속 지원한다.
- 입력 범위 12~59개월, 주 대상은 24~47개월. 개별·전체 삭제는 프로필을 보존하며 전체 기록 초기화는 예시를 재삽입하지 않는다. 제목 5회 탭만 예시를 복원한다.
