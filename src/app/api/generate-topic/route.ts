import { NextResponse } from "next/server";
import { getGeminiClient } from "../../utils/gemini";

const FALLBACK_TOPICS = [
  "リンゴ", "富士山", "すし（寿司）", "コンビニエンスストア", "スマートフォン",
  "サッカー", "ラーメン", "映画館", "カラオケ", "ドラえもん", "タクシー", "図書館"
];

export async function POST(request: Request) {
  try {
    const { genre } = await request.json();
    const ai = getGeminiClient();

    if (!ai) {
      const randomTopic = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
      return NextResponse.json({ topic: randomTopic, fallback: true });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    let prompt = `あなたは「お題当て人狼ゲーム」のお題作成器です。
プレイヤー全員（AIと人間）が会話でお題について語り、誰が「お題を知らないスパイ（AIスパイ）」かを見抜くゲームです。
お題は「誰もが知っているが、多角的な表現ができる身近な名詞・概念」にしてください。
（例：リンゴ、猫、ラーメン、東京タワー、スマートフォン、カラオケ、遠足、サウナ、など）

`;

    if (genre && genre.trim() !== "") {
      prompt += `今回は、ユーザーから指定されたジャンル、またはキーワード「${genre}」に関連するお題を1つ生成してください。\n`;
    } else {
      prompt += "ジャンルは指定されていません。完全ランダムで面白いお題を1つ生成してください。\n";
    }

    prompt += `
出力は以下のJSON形式のみ（余計な説明やMarkdownのバックティックスなどは一切なし）で返してください。
{
  "topic": "生成されたお題"
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    if (text.startsWith("```json")) {
      text = text.replace(/```json|```/g, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/```/g, "").trim();
    }

    const data = JSON.parse(text);
    return NextResponse.json({ topic: data.topic, fallback: false });
  } catch (error: unknown) {
    console.error("Generate Topic Error:", error);
    const randomTopic = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ topic: randomTopic, fallback: true, error: errorMessage });
  }
}
