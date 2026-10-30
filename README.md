# SW-DNA² 챌린지 스타터 키트

이 폴더 전체가 그대로 GitHub 저장소이자 Codex 작업 폴더다. Codex는 맨 위의 `AGENTS.md`를 자동으로 읽는다.

```
swdna-starter/
├─ AGENTS.md              Codex 작업 규칙 (자동으로 읽힘)
├─ DESIGN.md              디자인 규칙 + 검수 체크리스트
├─ index.html             앱 화면 템플릿 (더블클릭으로 열림)
├─ css/styles.css         디자인 토큰 + 공통 컴포넌트
├─ js/data.js             예시 데이터 (현장에서 교체)
├─ js/app.js              화면 전환, 저장, 토스트, 바텀시트
├─ docs/
│  ├─ CONTEXT.md          Codex용 대회 상황 브리핑 (연결 직후 prompts 0-1번으로 먹임)
│  ├─ idea-brief.md       아이디어 확정 후 B가 채우는 기획서
│  ├─ FEATURE_CATALOG.md  기능 16종: 구현 방식 Lv1/Lv2, 시연 포인트, 예상 질문과 답
│  ├─ QNA.md              질의응답 공통 답변 (보안, AI 활용, 기획)
│  └─ progress-log.md     매 정각 진행 기록 (꾸럼e에 옮겨 적기)
└─ guide/                 사람용 안내서
   ├─ 00-리더-진행순서.md   현장 도착부터 발표까지 리더가 따라갈 순서
   ├─ 01-아이디어-고르기.md  심사 기준에 맞는 아이디어 고르는 법, 점수표
   ├─ A-빌더.md            레포 생성 → Codex 연결 → 구현 루프 → 동결·영상
   ├─ B-기획기록.md         기획서, 꾸럼e 기록, 사용자 의견, 근거 자료
   ├─ C-발표디자인.md       발표 PDF, 화면 검수, 리허설
   ├─ prompts.md          Codex 지시문 (1번이 아이디어→명세)
```

## 흐름 한 줄 요약
Codex 연결 → `guide/prompts.md` 0-1번(상황 이해) → 아이디어 회의(0-2번 평가) → 확정 → B가 `docs/idea-brief.md` 채움 → A가 `guide/prompts.md` 1번 실행 → **`docs/spec.md` 자동 생성**(기능 선택, 구현 순서별 지시문, 시연 시나리오, 예상 질문 10개와 답, 슬라이드 문장) → spec 5번 지시문대로 구현 → 21:30 동결 → 영상·발표.

## 오늘 밤
1. Mobbin(mobbin.com)에서 참고할 앱 화면 미리 골라 두기
2. `guide/A-빌더.md`의 "오늘 밤"대로 설치 확인 (GitHub 저장소는 현장에서 만든다)
3. B·C 역할을 맡을 팀원에게 `guide/B-기획기록.md`, `guide/C-발표디자인.md` 전달 (현장에서 링크로 보여줘도 됨)

## 와이파이 대비 (선택)
글꼴은 Google Fonts, 아이콘은 Lucide를 인터넷에서 불러온다. 끊기면 글꼴은 기본 글꼴로 바뀌어 보이고 아이콘이 사라진다.
아이콘만이라도 로컬에 두려면 저장소 폴더에서:
```
mkdir vendor
curl -L -o vendor/lucide.min.js https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js
```
그리고 `index.html`의 Lucide `<script>` 주소를 `vendor/lucide.min.js`로 바꾼다.
