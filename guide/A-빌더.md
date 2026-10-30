# A. 빌더 플레이북 (구현 25점 책임)

> 목표: 21:30까지 **핵심 기능 3개가 끊김 없이 시연되는 배포 링크** + 시연 영상.
> 그리고 질의응답에서 "직접 이해하고 만들었다"를 보여줄 준비.
> 리더를 겸하면 시간순 진행은 `guide/00-리더-진행순서.md`를 보고, 이 파일은 구현 상세로 쓴다.

## 왜 이렇게 하나 (점수 전략)
- 구현 25점 = 서비스 완성도 + 아이디어 실현도 + 코딩 완성도. 기능 개수가 아니라 **끝까지 동작하는 기능 3개**가 점수다
- 총장상 실현형은 기획+구현+발표 합산. 핵심 기능 하나를 Lv2(진짜 동작)로 올리면 다른 팀과 차이가 난다
- 질의에서 "AI가 다 짠 거 아니냐"가 거의 반드시 나온다. 직접 원인을 찾아 고친 사례 1개가 가장 강한 답이다
- 커밋 기록은 수행 점수(과정 주도성)와 발표 "개발 과정" 슬라이드의 증거다. 작게, 자주 커밋한다

---

## 오늘 밤 (30~40분)

### 1. 설치 확인
PowerShell(또는 터미널)에서:
```
node -v
git --version
codex --version
```
- 없으면 설치: Node.js LTS, Git, Codex CLI(`npm i -g @openai/codex`)
- VS Code에서 Codex를 쓰고 싶으면 확장 "Codex"(OpenAI)도 설치
- Windows PowerShell에서 `codex`나 `npm`이 "이 시스템에서 스크립트를 실행할 수 없으므로" 오류를 내면: 명령 프롬프트(cmd)에서 실행하거나, 본인 판단으로 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`를 실행한다 (현재 사용자에게만 적용되는 설정 변경)
- 첫 `git push` 때 GitHub 로그인 창이 뜬다. 오늘 밤 한 번 로그인해 두면 현장에선 안 뜬다
- git 최초 설정(안 했다면):
```
git config --global user.name "본인이름"
git config --global user.email "GitHub 이메일"
```

### 2. GitHub 로그인만 확인
- `gh auth status`에 내 계정이 보이면 끝. 저장소는 현장에서 이 폴더로 바로 만든다 (아래 "팀 저장소 만들기")

### 3. (선택) Lv2 대비
- 로그인·여러 사람 데이터 공유가 필요한 아이디어가 나올 수 있으면 [supabase.com](https://supabase.com)에 GitHub로 가입만 해 둔다. 프로젝트는 현장에서 만든다.

### 4. 읽어 둘 것 (10분)
- `docs/FEATURE_CATALOG.md`: F01(로그인), F06(챗봇), F07(사진) 질문과 답만이라도
- `docs/QNA.md`의 "AI 활용" 항목

---

## 현장 순서

### 13:00~15:00 (강의 중)
- [ ] MetaShell Pass로 Codex 연결 (pass.metashell.kr → 참가자 → 받은 이메일 → 8자리 코드 → 안내대로 Codex 연결)
- [ ] 팀 저장소 생성·초대·Pages (아래 "팀 저장소 만들기"를 강의 중에 미리 해 둔다)
- [ ] 저장소 폴더에서 `codex` 실행 → `guide/prompts.md` **0-1번**(상황 이해) 붙여넣기 → 5줄 요약이 제대로 나오면 끝
- [ ] 안 되면 바로 운영진에게 문의 (15시 전에 해결해야 한다)

### 15:00~15:40 아이디어 회의 (셋이 같이)
- 화면 3개로 시연이 끝나는지, 서버 없이 되는지를 빌더 입장에서 계속 체크한다
- `docs/FEATURE_CATALOG.md`를 띄워 두고 "이건 F05 Lv1로 30분"처럼 바로 견적을 낸다
- 후보가 나오면 `prompts.md` **0-2번**으로 Codex 평가, 확정되면 **0-3번**으로 기획서 초안

### 팀 저장소 만들기 (5분, 13:00 강의 중에 미리)
1. 노트북의 스타터 폴더를 팀 이름으로 복사해서 바로 GitHub에 올린다 (PowerShell):
```
cd "$HOME\OneDrive\Desktop\SW경진\SW-DNA_최종본\03_스타터키트_저장소"
Copy-Item swdna-starter swdna-team[팀번호] -Recurse
cd swdna-team[팀번호]
git init
git add -A
git commit -m "스타터 키트"
git branch -M main
gh repo create swdna-team[팀번호] --public --source=. --remote=origin --push
code .
```
2. 팀원이 GitHub 계정이 있으면 **Settings → Collaborators**로 초대 (B가 github.com에서 docs 파일을 직접 고칠 수 있다)
3. **Settings → Pages → Deploy from a branch → main / (root) → Save** (1~2분 뒤 `https://[내아이디].github.io/swdna-team[팀번호]/`)
> Pages는 무료 계정에선 Public 저장소만 된다. 비밀 키는 애초에 안 쓰므로 Public이어도 문제없다.

### 15:45 명세 만들기 (15분)
1. B가 채운 `docs/idea-brief.md` 반영 (B가 github.com에서 고쳤다면 `git pull`)
2. VS Code 터미널에서 `codex` → `guide/prompts.md` **1번** 붙여넣기
3. 나온 `docs/spec.md`를 셋이 5분 검토. 특히 2번(기능 선택)과 5번(구현 순서)
4. 커밋:
```
git add -A
git commit -m "기획: 명세 확정"
git push
```

### 16:00~21:30 구현 루프
```
① spec.md 5번의 다음 단계 지시문 붙여넣기
② 브라우저에서 index.html 새로고침해서 확인 (VS Code Live Server 쓰면 자동 새로고침)
③ 괜찮으면: git add -A ; git commit -m "기능: [무엇]" ; git push
④ 이상하면: Codex에 증상 말하기 → 2번 넘게 실패하면 git restore . 하고 지시를 더 작게 쪼개기
```
- push할 때마다 Pages가 자동 갱신된다. 팀원 폰으로 링크 열어 두고 실제 폰 화면에서도 확인
- 커밋 메시지는 "기능: / 수정: / 디자인: / 기획:"으로 시작. 이게 수행 점수 증거이자 발표 "개발 과정" 슬라이드 재료
- 직접 원인을 찾아 고친 문제는 B에게 바로 말해서 진행 기록에 남긴다 (질의 "AI가 다 짰냐" 대비)

### 체크포인트 (못 지키면 범위를 줄인다)
| 시각 | 상태 | 못 지켰을 때 |
| --- | --- | --- |
| 17:00 | 뼈대 교체 완료, 화면 이동 됨 | 화면 수를 3개로 줄임 |
| 18:00 | 핵심 기능 1 동작 | Lv2였다면 Lv1로 후퇴 |
| 20:00 | 핵심 기능 2·3 동작 | 기능 3은 버리고 1·2를 다듬기 |
| 21:00 | 시연 안정화(prompts 5번) 시작 | 새 기능 추가 금지 |
| 21:30 | **코드 동결** | 이후 고치는 건 오타뿐 |

**15분 규칙**: 같은 문제로 15분 넘게 막히면 그 기능의 Lv를 낮추거나 빼고 다음으로 간다.

### 21:30 동결 후
1. `git tag 시연-v1` → `git push --tags` (발표 직전 망가져도 이 상태로 돌아갈 수 있다)
2. 시연 영상 녹화: 폭 390px 브라우저(크롬 F12 → 기기 모드 iPhone 12 Pro)로 spec 6번 시나리오대로 90초. Windows는 Win+Alt+R, Mac은 Cmd+Shift+5
3. 영상을 유튜브 "일부 공개" 또는 구글 드라이브 링크로 올리고 C에게 전달 (발표 PDF에 링크·QR)
4. `guide/prompts.md` **6번**으로 `docs/tech-notes.md` 생성 → 5줄 구조 설명 외우기

### 22:00 이후
- `docs/spec.md` 8번 중 A 담당 질문 답변을 소리 내서 2번 연습
- 심사위원이 "코드 보여주세요" 할 때 열 파일 3곳 확인 (tech-notes 4번)
- 리허설에서 시연 담당(보통 A가 조작, C가 말)

### 31일 아침
- [ ] 배포 링크·QR 동작 확인, 데이터 초기화(제목 5번 탭) 확인
- [ ] 발표 PC가 운영진 PC일 수 있다. 라이브 시연은 배포 링크로, 실패하면 바로 영상으로 넘어간다

---

## 혼자 다 해야 할 때

팀원이 잘 안 움직여도 **협업 기여도는 채점 항목**이라 혼자 다 한 티를 내면 손해다.
- B 일이 멈추면: 매 정각 `git log --oneline`을 보여주고 B에게 진행 기록 한 블록만 쓰게 한다 (5분)
- C 일이 멈추면: prompts 7번으로 대본 초안을 뽑아 주고 C는 슬라이드에 옮기기만
- 발표 질의는 반드시 셋이 한 번씩 답하도록 질문을 미리 나눠 준다
