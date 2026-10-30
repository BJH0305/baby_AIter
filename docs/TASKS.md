# TASKS.md — 구현 작업 목록 (Claude가 관리, Codex가 처리)

> Codex: 위에서부터 `[ ]` 작업을 하나씩 처리하고 `[x]` + 메모 한 줄을 남긴다 (AGENTS.md "협업 방식").
> `🛑 사람 확인` 작업은 직접 하지 말고 멈춰서 사람에게 알린다.
> 기준 문서: `docs/idea-brief.md` (화면 4개, 핵심 기능 3개, 시연 시나리오)

## 최저 단계 — 이것만 돼도 시연 가능
- [x] T1. 화면 뼈대 교체: `index.html`의 예시 화면을 idea-brief 4번의 화면 4개(home, ask, result, log)로 바꾼다. 상단 제목·title은 "베이비 AI터". 하단 탭바는 홈/상담하기/기록 3개. 아직 로직 없이 화면 이동만. `index.html` 하단에 `js/knowledge.js`, `js/mock.js`, `js/ai.js` 스크립트를 `js/app.js`보다 먼저 불러오게 추가(파일이 없으면 빈 파일 생성).
  - 메모: index.html, js/app.js, js/mock.js, js/ai.js / 탭과 상담 결과 링크 확인 / 각 화면 내용은 이후 작업에서 구현
- [x] T2. 근거 카드 검색: `js/knowledge.js`(이미 있음, 내용 수정 금지)의 `window.KNOWLEDGE`를 읽어 `searchCards({target, situation, text, ageMonths})` 함수를 `js/ai.js`에 만든다. 태그·키워드 일치 점수로 상위 3개 반환. 함수 위에 동작 설명 주석.
  - 메모: js/ai.js / 대상·상황·연령으로 검색 결과 확인 / 카드 내용은 변경하지 않음
- [x] T3. AI 호출 구조 (mock 먼저): `js/ai.js`에 `AI_MODE`, `buildPrompt(input, cards, history)`, `askAI(input, history)`를 만든다. mock 모드는 `js/mock.js`의 답변을 0.8~1.2초 뒤 반환. mock 답변은 knowledge.js 카드 내용만 써서 2세트 작성: (a) 1차 상담 답변 (b) 피드백 반영 2차 답변. 답변 형식(JSON): `{ causes:[...], methods:[{title, how, why, cardId}], level:"green|yellow|red", note }`.
  - 메모: js/ai.js, js/mock.js, docs/DATA.md / 피드백 유무별 mock 답변 확인 / 시연용 고정 답변
- [x] T4. 상담하기 화면: 대상 칩(친구/동생), 상황 칩 5개(장난감 다툼, 동생을 안고 있을 때, 피곤·졸릴 때, 흥분했을 때, 이유 모름), 짧은 설명 입력, 개월 수(프로필에서 가져옴). "분석하기" → skeleton → 결과 화면.
  - 메모: index.html, js/app.js / 상담 조건 선택 후 분석하기 / 결과 내용과 저장은 T5에서 구현
- [x] T5. 결과 화면: 원인 해석 카드, 지도법 3개 카드(각각 "해 볼게요" 버튼), 근거 카드 목록(제목·출처), 단계 배지(가정 지도/관찰 필요/전문가 상담 권장). 상담 1건을 localStorage에 저장 + 토스트.
  - 메모: index.html, js/app.js / 상담 분석 후 결과와 지도법 선택 확인 / 시연 답변과 출처는 검수 필요
- [x] T6. 홈 화면: 아이 프로필(가명·개월 수, 수정 가능), 진행 중 상담 1건 요약, 이번 주 시도한 지도법 수, 최근 기록 3개, 빈 상태.
  - 메모: index.html, js/app.js / 홈에서 프로필 저장과 상담 요약 확인 / 기록은 T7에서 입력

## 중간 단계 — 차별점(피드백 루프)
- [x] T7. 기록 화면: "해 볼게요"한 지도법마다 효과 있음/조금/없음 버튼 + 메모 + 날짜 저장. 타임라인으로 표시. 빈 상태.
  - 메모: index.html, js/app.js / 지도법 선택 후 기록 탭에서 효과·메모·날짜 저장 / 재상담은 T8에서 연결
- [x] T8. 다시 상담: 기록 화면의 "결과 반영해서 다시 상담" → 이전 입력·시도한 방법·결과를 history로 askAI에 전달 → 2차 답변을 결과 화면에 표시하고 상단에 "지난번과 달라진 점"(유지/교체한 방법) 요약.
  - 메모: js/app.js / 기록 후 다시 상담 버튼 확인 / mock은 시연용 고정 2차 답변
- [x] T9. 안전장치 규칙(코드로): 근거 카드의 `redFlags` 키워드가 입력에 있거나, 같은 상담에서 14일 이상 "효과 없음"만 있으면 level을 red로 올리고 "전문가 상담 권장" 안내 카드(육아종합지원센터·소아청소년과 상담 권장 문구, 진단 표현 금지)를 보여 준다. AI 답보다 규칙이 우선.
  - 메모: js/app.js / 위험 신호 문구 또는 14일 경과한 효과 없음 기록 후 재상담 / 키워드 일치 기반
- [x] T10. 시연용 예시 데이터: idea-brief 7번대로 도윤(가명, 38개월) 프로필 + 3일치 상담·피드백 기록 시드. 홈 상단 제목 5번 탭 → 초기화. 
  - 메모: js/app.js / 처음 열거나 홈 제목 5번 탭 / 예시는 2026-10-27~29 고정

## 실제 AI 연결
- [x] T11. 🛑 사람 확인: 대회에서 받은 API 종류(OpenAI/Gemini 등)와 사용 방식 확인.
  - 메모(Claude): OpenAI 프로젝트 키(sk-proj) 확인, 운영진 사용 허락 받음. 서버 함수 `api/worker.js`는 Claude가 작성 완료. 키는 Cloudflare Secret에만 넣는다(배준희가 직접).
- [x] T12. live 모드 프론트 연결 (서버 함수 `api/worker.js`는 이미 있음 — 수정하지 말 것):
  - 메모: js/config.js, js/ai.js, js/app.js, index.html, docs/DATA.md / mock과 가짜 live 응답 및 오류 대체 확인 / live 요청·검증·실패 대체 및 답변 출처 표시
  - `js/config.js` 새로 만들기: `window.APP_CONFIG = { AI_MODE: "mock", API_URL: "" }` (URL은 비밀이 아님. 배포 후 배준희가 값을 채움). index.html에서 ai.js보다 먼저 불러오기
  - `askAI`: AI_MODE가 "live"이고 API_URL이 있으면 `POST API_URL` body `{ input, cards: searchCards 결과(id,title,causes,methods), history }` → 응답 `{answer}`
  - 응답 검증: methods가 3개이고 각 id가 `카드id-인덱스` 형식으로 보낸 카드에 실제로 있는지 확인. 아니면 규칙 기반 답변(ruleAnswer)으로 대체
  - 12초 넘거나 실패하면 규칙 기반 답변 + 토스트 "AI 연결이 느려 기본 답변을 보여 드려요"
  - 결과 화면 상단에 작은 배지: "AI 답변" 또는 "기본 답변" (어느 쪽인지 정직하게 표시). Consult에 `source: "ai" | "rule"` 저장
  - 안전장치(applySafety)는 AI 답변에도 그대로 적용
  - 확인: config가 mock일 때 지금과 똑같이 동작. 프론트 코드 어디에도 키가 없음
- [x] T12b. 답변 방식 선택: 상담하기 화면 '분석하기' 위에 칩 2개 `빠른 답변`(기본) / `깊게 생각하기`. 요청 body에 `mode: "fast" | "deep"`만 보낸다(모델 이름은 보내지 않음). 타임아웃은 fast 12초, deep 30초. deep 로딩 중에는 "자료를 꼼꼼히 비교하고 있어요" 문구. 결과 배지에 `AI 답변 · 빠른`/`AI 답변 · 깊게` 표시. mock 모드에서는 칩을 숨긴다.
  - 메모: js/config.js, js/ai.js, js/app.js, index.html / 실제 API fast·deep·재상담, 잘못된 URL fallback 통과 / 브라우저 실클릭 미검증

## 마무리
- [x] T13. (T21로 대체) 🛑 사람 확인: 레퍼런스 캡처(docs/design-ref/, Calm 기준) 받기 → `css/styles.css` :root 토큰만 조정.
- [x] T14. (T22로 대체) 안정화: 375px 가로 스크롤 없음, 콘솔 에러 0, 눌러지는 것 전부 동작, 빈 상태·토스트 점검.

## 범위 변경 (10/30) — docs/SCOPE.md 기준. 아래부터 순서대로
- [x] T15. 자료 → 원인 카드 초안: `docs/sources/raw/*.pdf`(로컬)와 `docs/sources/sites.md`를 읽고, SCOPE.md의 원인 분류 7개마다 `docs/sources/cards.md` 양식으로 카드 초안을 쓴다. 출처는 자료 제목 + **쪽수**, 근거 문장은 원문 그대로 40자 이내. 자료에서 못 찾은 칸은 "[확인 필요]". `확인: 미완료`로 둔다(사람이 검수). 국내 공공 자료 우선, 해외 자료는 보조.
  - 메모: docs/sources/cards.md / 인용 40자 이내·해당 PDF 페이지 일치 확인 / 사람 원문 검수 미완료
- [x] T16. `js/knowledge.js` 재구성: 카드 7개를 원인 카드로 바꾼다. 필드: id(cause-*), title, ageMonths, clues(관찰 단서), explain(부모용 1~2문장), questions(관련 질문 id), tip(대응 한 줄), redFlags, redFlagKeywords, source, page, evidence, verified(false). 옛 지도법 카드는 삭제하지 말고 맨 아래 주석 처리.
  - 메모: js/knowledge.js, js/ai.js, js/app.js / 필드·인용 길이·기존 상담 호환 검사 통과 / 사람 원문 검수 미완료
- [x] T17. 질문 검사 화면(`#ask` 교체): 한 화면에 질문 하나 + 상단 진행 바 + 하단 큰 선택 버튼. 질문 5~7개(직전 상황, 누구를, 장소·시간, 컨디션, 이앓이 시기, 말 표현 수준, 최근 환경 변화), 각 문항은 2~4지선다. 마지막에 선택 입력(한 줄 메모). 뒤로 가기 가능. 문항 정의는 `js/questions.js` 한 파일에 모은다. K-DST 문항 금지.
  - 메모: index.html, js/questions.js, js/app.js, js/knowledge.js / 구문·문항 수·카드 참조·위험 선택지 검사 통과, Pages 실클릭은 push 후 확인 / 사람 원문 검수 미완료
- [x] T18. 원인 점수 + 결과 화면: 답변 → 카드별 점수(규칙 기반, `js/ai.js`의 `scoreCauses`)로 상위 2~3개. 결과 화면: 원인 후보 카드(이름, 왜 그렇게 봤는지 = 선택한 답변, explain, tip, 출처·쪽수·근거 문장), 상단에 "가능성이 높은 원인 후보예요. 진단이 아니에요." 고정 문구. %·정확도 표시 금지. 안전 규칙(redFlagKeywords, 위험 답변)은 그대로 최우선.
  - 메모: js/ai.js, js/app.js, js/knowledge.js, index.html, css/styles.css / 순위·근거 부족·연령·위험 답변·위험 단어 검사 통과; Pages 캐시 혼합 방지 버전 추가 / 사람 원문 검수 미완료
- [x] T19. AI 설명 연결: live 모드면 상위 후보 카드 + 답변을 Worker로 보내 "왜 이 원인 같은지" 설명 문장만 AI가 다시 쓴다(순위는 규칙이 정함). `api/worker.js`에 `task: "cause"` 분기와 전용 SYSTEM 프롬프트 추가(카드 밖 내용 금지, 진단 금지, JSON `{explanations:[{cardId, why}]}`). 실패하면 규칙 설명 그대로. **worker.js 수정 후 "⏸ 확인 필요"로 멈추고 배준희에게 재배포 요청.**
  - 메모: api/worker.js, js/ai.js, js/app.js, index.html / 모의 통합 검사 통과; T17~T18 Pages 실클릭·콘솔 오류 없음; 실제 AI는 사용자가 재배포 후 task:cause 200·AI 설명 표시 확인 완료 / 사람 원문 검수 미완료
- [x] T20. 기록 단순화: 결과 아래 "결과가 맞았나요?" 맞아요/일부/아니에요 1탭 저장. 기록 화면은 검사 기록 타임라인(날짜, 상위 원인, 맞았나요). 옛 지도법 피드백·재상담 UI는 숨긴다(코드는 남김). 홈: "검사 시작하기" 큰 버튼 + 최근 검사 3개.
  - 메모: js/app.js, index.html, css/styles.css / 화면 생성·피드백 저장·중복 제거·내부 메모 숨김·안전 최상단 검사 통과, Pages 실클릭·저장 유지 확인 완료 / 사람 원문 검수 미완료
- [x] T21. 디자인 적용: `docs/design-ref/reference.html`(한서희 제공)의 색·글꼴·둥근 카드·여백만 `css/styles.css` :root 토큰에 반영(cream #f7f6f1, green #527b68, ink #24332e, Noto Sans KR). 구조는 지금 모바일 앱 그대로. 서비스 이름은 "베이비 AI터"(레퍼런스의 "베이비 AI 시터" 아님). 레퍼런스의 K-DST 문구는 가져오지 않는다.
  - 메모: css/styles.css, index.html / CSS 변경은 root 토큰 내부만 확인; 기존 화면 생성 검사 통과, Pages 크림 배경·녹색·375px 시각 확인 완료 / 사람 원문 검수 미완료
- [x] T22. 시연 데이터·안정화: 도윤(38개월) 시나리오를 질문 검사 기준으로 바꾸고(검사 2회 기록), 375px·콘솔 에러 0·모든 버튼 점검. favicon 추가. Pages 주소(https://bjh0305.github.io/baby_AIter/)에서 확인.
  - 메모: js/app.js, index.html, favicon.svg, css/styles.css, docs/DATA.md / Pages 실클릭: AI·위험 우선·후보 없음·피드백 유지·초기화 통과, 콘솔 오류·가로 넘침 없음 / 사람 원문 검수 미완료
  - 메모: js/app.js, index.html, favicon.svg, css/styles.css / 시연 데이터·초기화·파비콘 구현 및 로컬 통합 검사 통과 / Pages 375px·전체 실클릭 확인 중

## 질문
(Codex가 막히면 여기에 적는다)

⏸ 확인 필요 (T3)
상황: 피드백 기록의 데이터 형식과 2차 mock 답변을 선택하는 기준이 아직 정해져 있지 않음.
선택지: A. 카드 문장으로 고정된 시연용 1차·2차 답변을 만들고 T8에서 피드백 연결 / B. 지금 피드백 데이터 형식과 선택 규칙부터 정해 구현
추천: A — 현재 작업 범위와 시연 시나리오에 맞고 피드백 구조는 T7~T8에서 정할 수 있음.
  - 결정(Claude): **A로 진행.** 단, 데이터 형식과 mock 선택 규칙은 지금 `docs/DATA.md`대로 맞춘다 (askAI의 history 형식, Answer 형식, MOCK.first/second 선택 규칙). T7~T8은 같은 형식에 연결만 한다.

⏸ 확인 필요 (T11)
상황: 실제 AI 연결에 사용할 대회 API 종류와 사용 방식이 아직 확인되지 않음.
선택지: A. 대회에서 받은 API 종류와 사용 방식을 알려주기 / B. 우선 시연용 mock으로 유지하기
추천: A — 실제 AI 연결 작업의 범위를 정할 수 있음. API 키는 채팅이나 코드에 적지 않음.
  - 결정(Claude): API 사용 확정(OpenAI, 운영진 허락). REVIEW R1~R7을 먼저 처리한 뒤 T12 진행. 서버 함수 배포·키 등록은 배준희가 직접 한다.


⏸ 확인 필요 (T13)
상황: docs/design-ref에 레퍼런스 캡처가 없어 디자인을 진행할 수 없음. T12b API 검증은 완료, 브라우저 실클릭은 로컬 파일 접근 차단으로 미검증.
선택지: A. 캡처를 제공한 뒤 T13 진행 / B. 현재 디자인을 유지하고 T14 안정화로 이동
추천: B — 현재 시연 흐름의 안정화부터 확인 가능.


⏸ 확인 필요 (T19)
상황: 원인 설명 전용 Worker 분기 구현·모의 통합 검사가 완료되어 Cloudflare 재배포가 필요합니다.
선택지:
  A. 배준희가 api/worker.js를 Cloudflare에 재배포한 뒤 완료를 알려주기 — 실제 AI 설명을 확인하고 T20부터 이어갑니다.
  B. 재배포를 보류하고 현재 상태에서 멈추기 — 규칙 기반 설명은 유지되며 후속 작업은 대기합니다.
추천: A — T19의 실제 AI 설명 검증을 마친 뒤 다음 작업을 진행할 수 있습니다.
→ 재배포 후 알려 주세요. 사용자 요청 및 RUN.md의 재배포 정지 조건에 따라 T20으로 넘어가지 않습니다.

  - 결정(사용자, T19): Cloudflare 재배포와 사이트 task:"cause" 200 응답·"AI 설명" 표시 확인 완료. T20~T22 진행 승인.
