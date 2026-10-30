// 공식 자료의 관찰 항목을 부모용으로 재구성했다. 발달검사 문항은 사용하지 않는다.
// scores는 순위 정렬용 내부 규칙이며 확률이나 검증된 검사 점수가 아니다.
window.QUESTIONS = [
  { id: "q-safety", title: "물린 곳에 상처나 피가 났나요?", source: "Head Start: 피부 손상·출혈 안내", options: [
    { value: "yes", label: "예", scores: {}, danger: true },
    { value: "no", label: "아니오", scores: {} }
  ]},
  { id: "q-situation", title: "깨물기 바로 전, 어떤 일이 있었나요?", source: "지침서 인쇄 227~229쪽; CHLA 1쪽", options: [
    { value: "toy", label: "놀잇감을 가져가거나 만졌어요", scores: {frustration: 3} },
    { value: "blocked", label: "스스로 하려던 일을 제지했어요", scores: {control: 3, frustration: 1} },
    { value: "play", label: "놀이에 흥분하거나 깨물기를 따라 했어요", scores: {play: 3} },
    { value: "unknown", label: "잘 모르겠어요", scores: {} }
  ]},
  { id: "q-target", title: "누구를 깨물었나요?", source: "CHLA 1쪽; Head Start 웹 자료", options: [
    { value: "peer", label: "친구", scores: {} }, { value: "sibling", label: "형제자매", scores: {} },
    { value: "adult", label: "보호자·어른", scores: {} }, { value: "unknown", label: "잘 모르겠어요", scores: {} }
  ]},
  { id: "q-context", title: "어디에서 일어났나요?", source: "CHLA 1쪽: 주변 상황·시끄러움 관찰", options: [
    { value: "home", label: "집", scores: {} }, { value: "nursery", label: "어린이집", scores: {} },
    { value: "outside", label: "그 밖의 장소", scores: {} }, { value: "unknown", label: "잘 모르겠어요", scores: {} }
  ]},
  { id: "q-condition", title: "깨물기 직전 컨디션은 어땠나요?", source: "CHLA 1쪽; Head Start 웹; Virtual Lab School 1쪽", options: [
    { value: "tired", label: "피곤하거나 졸려했어요", scores: {condition: 3} },
    { value: "hungry", label: "배고파했어요", scores: {condition: 3} },
    { value: "unwell", label: "아픈 곳이 있었어요", scores: {condition: 3} },
    { value: "unknown", label: "해당 없거나 잘 모르겠어요", scores: {} }
  ]},
  { id: "q-teething", title: "최근 입이나 잇몸에서 이런 모습이 있었나요?", source: "CHLA 1쪽; 지침서 인쇄 230쪽", options: [
    { value: "yes", label: "물건도 씹거나 이가 나며 잇몸이 불편해요", scores: {explore: 3} },
    { value: "no", label: "그런 모습은 없었어요", scores: {} }, { value: "unknown", label: "잘 모르겠어요", scores: {} }
  ]},
  { id: "q-expression", title: "그때 아이는 어떻게 표현했나요?", source: "지침서 인쇄 229쪽; 양육상담 자료집 인쇄 51쪽; CHLA 1쪽", options: [
    { value: "difficult", label: "원하는 것을 말로 전하기 어려워했어요", scores: {frustration: 2} },
    { value: "attention", label: "어른의 관심이나 함께 놀기를 원했어요", scores: {attention: 3} },
    { value: "self", label: "혼자 하거나 직접 고르려 했어요", scores: {control: 2} },
    { value: "unknown", label: "잘 모르겠어요", scores: {} }
  ]},
  { id: "q-change", title: "최근 생활에 달라진 점이 있나요?", source: "양육상담 자료집 인쇄 17쪽; Head Start·NHS 웹 자료", options: [
    { value: "baby", label: "동생이 태어났어요", scores: {change: 3} },
    { value: "move", label: "이사·보호자의 직장 복귀가 있었어요", scores: {change: 3} },
    { value: "nursery", label: "어린이집에 새로 다니기 시작했어요", scores: {change: 3} },
    { value: "none", label: "해당 없거나 잘 모르겠어요", scores: {} }
  ]}
];

// 기타 직접 입력은 원인 점수에 사용하지 않는다.
window.QUESTIONS.forEach((question) => question.options.push({ value: "other", label: "기타(직접 입력)", scores: {} }));
