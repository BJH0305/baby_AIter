// 베이비 AI터 — AI 답변 서버 함수 (Cloudflare Worker)
// 역할: 웹페이지가 보낸 상담 정보 + 근거 카드로 프롬프트를 만들고, OpenAI를 호출해 답변(JSON)을 돌려준다.
// API 키는 이 코드에 없다. Cloudflare 대시보드의 Secret(OPENAI_API_KEY)에만 넣는다.
// 환경변수: OPENAI_API_KEY(Secret), OPENAI_MODEL(예: 목록에서 고른 mini 모델), ALLOW_ORIGIN(배포한 웹 주소, 미설정 시 *)

const SYSTEM = [
  "너는 영유아 행동 지도 상담을 돕는 도우미다. 부모에게 해요체로 짧고 구체적으로 답한다.",
  "반드시 함께 받은 '근거 카드' 안의 원인과 지도법만 사용한다. 카드에 없는 육아 정보, 통계, 출처를 지어내지 않는다.",
  "진단하지 않는다(질환명, 장애 가능성 언급 금지). 위험 판단은 하지 않는다(level은 green 또는 yellow만).",
  "출력은 JSON 하나만: {\"causes\":[문장 2개 이내], \"methods\":[{\"id\":\"카드id-지도법번호\",\"title\":\"카드의 지도법 문장 그대로\",\"how\":\"이 아이 상황에 맞춘 실천 예시 1문장\",\"why\":\"그 카드의 원인 중 하나\",\"cardId\":\"카드id\"} 3개], \"level\":\"green|yellow\", \"note\":\"부모에게 한 문장\", \"changes\":null 또는 {\"kept\":[id],\"replaced\":[{\"from\":id,\"to\":id}],\"summary\":\"한 문장\"}}",
  "methods의 id는 반드시 '카드id-지도법인덱스'(0부터) 형식이고, title은 해당 카드 methods 문장과 같아야 한다.",
  "이전 기록(history)이 있으면: 효과 good/some인 방법은 유지하고, none인 방법은 카드의 다른 지도법으로 교체하며 changes를 채운다. 없으면 changes는 null.",
  "같은 문제 행동이 2주 이상 계속되면 level을 yellow로 하고 note에 관찰을 권한다."
].join("\n");

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  };
}
const reply = (env, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors(env) });

// 웹에서 받은 값 중 필요한 필드만 남긴다 (프롬프트 주입·과다 사용 방지).
function pickCards(cards) {
  return (Array.isArray(cards) ? cards : []).slice(0, 3).map((c) => ({
    id: String(c.id || "").slice(0, 40),
    title: String(c.title || "").slice(0, 80),
    causes: (c.causes || []).slice(0, 4).map((s) => String(s).slice(0, 120)),
    methods: (c.methods || []).slice(0, 5).map((s) => String(s).slice(0, 160))
  }));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    if (request.method !== "POST") return reply(env, { error: "POST only" }, 405);
    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) return reply(env, { error: "server not configured" }, 500);

    let body;
    try { body = await request.json(); } catch { return reply(env, { error: "bad json" }, 400); }
    const input = body.input || {};
    const cards = pickCards(body.cards);
    if (!cards.length) return reply(env, { error: "no cards" }, 400);
    const user = JSON.stringify({
      상담: {
        대상: String(input.target || "").slice(0, 10),
        상황: String(input.situation || "").slice(0, 40),
        설명: String(input.text || "").slice(0, 300),
        개월수: Number(input.ageMonths) || null
      },
      근거카드: cards,
      이전기록: body.history || null
    }).slice(0, 8000);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }]
      })
    });
    if (!res.ok) return reply(env, { error: "upstream", status: res.status }, 502);
    const data = await res.json();
    try {
      return reply(env, { answer: JSON.parse(data.choices[0].message.content) });
    } catch {
      return reply(env, { error: "parse" }, 502);
    }
  }
};
