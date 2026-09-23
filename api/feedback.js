const MAX_FIELD_LENGTH = 4000;

function boundedString(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST 요청만 지원합니다.' });
  if (process.env.ENABLE_AI_FEEDBACK !== 'true' || !process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    return response.status(503).json({ error: 'AI 피드백이 아직 설정되지 않았어요. Vercel에서 선택적으로 활성화할 수 있습니다.' });
  }

  const body = request.body || {};
  const subject = boundedString(body.subject);
  const question = boundedString(body.question);
  const myAnswer = boundedString(body.myAnswer);
  const correctAnswer = boundedString(body.correctAnswer);
  const reason = boundedString(body.reason);
  const insight = boundedString(body.insight);
  if (!subject || !question || !myAnswer || !correctAnswer || !reason || !insight) {
    return response.status(400).json({ error: '문제와 오답 기록을 모두 채운 뒤 요청해 주세요.' });
  }

  try {
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        store: false,
        max_output_tokens: 220,
        instructions: '당신은 한국 수능 과외 선생님입니다. 사용자가 보낸 문항과 학생의 오답 원인, 풀이 발상을 바탕으로 3문장 이내의 짧고 구체적인 학습 피드백을 한국어로 작성하세요. 정답을 다시 말하는 데 그치지 말고, 다음 풀이에서 바로 적용할 점검 순서나 개념 연결을 제안하세요. 문제 정보가 부족하면 추측하지 말고 부족한 점을 말하세요.',
        input: JSON.stringify({ subject, question, myAnswer, correctAnswer, reason, insight }),
      }),
    });
    const data = await apiResponse.json();
    if (!apiResponse.ok) return response.status(502).json({ error: 'AI 응답을 가져오지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
    const feedback = (data.output || []).flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('\n').trim();
    if (!feedback) return response.status(502).json({ error: 'AI 응답이 비어 있어요. 다시 시도해 주세요.' });
    return response.status(200).json({ feedback });
  } catch {
    return response.status(502).json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
  }
}
