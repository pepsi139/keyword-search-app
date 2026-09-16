import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

function extractJsonArray(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    }
  } catch {
    // 모델이 JSON 형식을 어겼을 때는 빈 배열로 흡수한다 (LLM 후보는 있으면 좋은 보조 기능이라 실패해도 전체 파이프라인은 계속 진행)
  }
  return [];
}

/**
 * 실제 블로그 글에서 뽑은 대표 키워드 목록에 없는, 이 카테고리 경로에서
 * 검색될 법한 하위 키워드 후보를 LLM에게 추가로 제안받는다.
 */
export async function generateLlmKeywordCandidates(
  categoryPath: string[],
  collectedKeywords: string[],
  count = 10,
): Promise<string[]> {
  const pathLabel = categoryPath.filter(Boolean).join(" > ");
  const collectedLabel = collectedKeywords.slice(0, 60).join(", ") || "(없음)";

  const prompt = `너는 한국 블로그 마케팅 키워드 리서치 전문가야.

카테고리 경로: ${pathLabel}

아래는 실제 블로그 글 제목에서 빈도 기반으로 뽑아낸 대표 키워드 목록이야:
${collectedLabel}

위 목록에는 없지만, 이 카테고리 경로와 관련해서 사람들이 네이버에 검색할 만한
더 구체적인 하위 키워드(롱테일 키워드)를 ${count}개 제안해줘.

규칙:
- 이미 나온 목록과 중복되거나 의미가 거의 같은 키워드는 제외
- 실제 검색될 법한 자연스러운 한국어 키워드만 (2~4단어)
- 설명 없이 키워드 문자열만 담은 JSON 배열로만 응답 (예: ["키워드1", "키워드2"])`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return extractJsonArray(text).slice(0, count);
}
