# REVIEW.md — Claude 검토 결과 / 수정 요청

> Claude가 코드를 검토하고 여기에 수정 요청을 적는다. Codex는 TASKS보다 이 파일의 `[ ]` 항목을 먼저 처리하고 `[x]` + 메모를 남긴다.

## 1차 검토 (T1~T10, 2026-10-30 19:00) — 375px 브라우저에서 실제 클릭 테스트함
콘솔 에러 0, 가로 스크롤 없음, 화면 이동·저장·재상담·초기화 동작 확인. 아래는 고칠 점 (위에서부터 우선순위).

- [x] R1. **(가장 중요) 근거 검색이 상담 흐름에 연결되어 있지 않음.** 지금은 `askAI`가 입력과 상관없이 고정 MOCK을 돌려줘서, "친구 / 장난감 다툼"으로 상담해도 동생 질투 원인과 동생 지도법이 나온다. 이렇게 고친다:
  - `askAI(input, history)` 안에서 `const cards = searchCards(input)`로 근거 카드를 먼저 찾는다. 카드가 0개면 `bite-basic` 카드를 쓴다.
  - mock 모드는 고정 답변 대신 **규칙 기반 답변 생성 함수** `ruleAnswer(input, cards, history)`를 `js/mock.js`에 만든다 (live 실패 시 대체 답변도 이걸 쓴다):
    - causes: 검색된 카드 순서대로 각 카드의 `causes[0]`, 최대 2개 (중복 제거)
    - methods: 카드1의 methods[0], 카드2의 methods[0], 카드1의 methods[1] … 순서로 3개. id는 `${card.id}-${index}` (예: `bite-sibling-0`), why는 그 카드의 `causes[0]`, cardId는 그 카드
    - history가 있으면: 피드백이 `good`/`some`인 방법은 유지, `none`인 방법은 같은 카드들의 아직 안 쓴 methods로 교체, `changes`에 kept / replaced / summary("효과 있던 ○○는 유지하고, ○○ 대신 ○○를 제안해요")를 채운다
  - 상담 저장 시 `cardIds`는 검색된 카드 id 목록으로 저장한다.
  - `MOCK.first/second` 고정 답변과 `docs/DATA.md` 6번 규칙은 이 방식으로 대체한다. `demoData()`의 첫 상담 answer도 `ruleAnswer(동생 입력, searchCards(동생 입력), null)`로 만든다.
  - 확인: 친구/장난감 다툼 → 또래 다툼 카드가 첫 근거로 나오고 원인·지도법이 친구 상황에 맞음. 동생/안고 있을 때 → 동생 질투 카드가 첫 근거.
  - 메모: js/ai.js, js/mock.js, js/app.js, docs/DATA.md / 친구·동생 검색 및 피드백 유지·교체 확인 / 이전 기록 ID 호환
- [x] R2. 결과 화면 지도법 카드에 같은 문장이 두 번 나옴 (`title`과 `how`가 같음). `how`가 `title`과 같으면 `how` 줄을 출력하지 않는다. 대신 카드 아래 작은 글씨로 `왜: {why}` 와 `근거: {카드 title}`을 보여 준다.
  - 메모: js/app.js / 결과 카드 코드 및 문법 확인 / 중복 문장 제거와 근거 표시
- [ ] R3. 위험 신호 규칙이 실제 문장에서 동작하지 않음 ("상처가 났어요 피가 났어요"를 넣어도 '가정 지도'). `applySafety`가 카드의 `redFlags` 대신 **`redFlagKeywords`**(knowledge.js에 Claude가 추가함)를 입력 text·situation에서 찾도록 바꾼다. red일 때 안내 카드는 결과 화면 맨 위(달라진 점보다 위)에 보이게 한다.
- [ ] R4. 스타터 키트 예제 코드가 남아 있음. `js/data.js`의 SEED_ITEMS와 이를 쓰는 코드(`STORE_KEY`, `store`, `items`, `itemRow`, `filter`/`filterChips`, `catChips`, `newForm`, `.list-item` 클릭 시 바텀시트 여는 핸들러, `data-toggle` 핸들러)를 지운다. `index.html`의 `js/data.js` 스크립트도 제거 (파일 삭제는 사람 허락 없이 해도 됨 — 이 항목이 허락이다).
- [ ] R5. 시연 데이터 보강: `demoData()` 피드백에 memo를 채운다 (예: 10/27 "동생 낮잠 때 블록 놀이 10분, 깨물기 없었음", 10/28 "물자마자 안 된다고 했더니 더 울고 또 물었음", 10/29 "단독 시간 후 저녁까지 괜찮았음"). 홈 '최근 기록'에는 결과 대신 **지도법 이름 + 결과 배지**로 보여 준다.
- [ ] R6. 근거 자료 카드에 `card.evidence`가 있으면 인용 문장으로 보여 주고, `card.verified`가 false면 출처 옆에 작은 회색 "검수 중" 배지를 붙인다 (자료 검수가 끝나면 자동으로 사라지게).
- [ ] R7. 홈 상단 프로필 입력폼이 너무 크다. 홈에는 `도윤 · 38개월` 한 줄 카드 + "수정" 버튼만 두고, 수정은 바텀시트(.sheet)에서 한다.
