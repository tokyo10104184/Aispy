import { NextResponse } from "next/server";
import { getGeminiClient } from "../../utils/gemini";

export async function POST(request: Request) {
  let requestTopic = "";
  let requestGuess = "";
  try {
    const { topic, guess } = await request.json();
    requestTopic = topic || "";
    requestGuess = guess || "";

    if (!requestGuess.trim()) {
      return NextResponse.json({ isCorrect: false, reason: "推測が空欄です。" });
    }

    const ai = getGeminiClient();

    if (!ai) {
      const cleanTopic = requestTopic.trim().toLowerCase().replace(/[\s　、。]/g, "");
      const cleanGuess = requestGuess.trim().toLowerCase().replace(/[\s　、。]/g, "");
      const isCorrect = cleanTopic.includes(cleanGuess) || cleanGuess.includes(cleanTopic);
      return NextResponse.json({
        isCorrect,
        reason: isCorrect
          ? `「${requestGuess}」は「${requestTopic}」とほぼ同じ意味、または部分的に一致していると判定されました（簡易判定）。`
          : `「${requestGuess}」は「${requestTopic}」とは異なると判定されました（簡易判定）。`,
        fallback: true
      });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const prompt = `あなたは「お題当て人狼ゲーム（プロンプト・インポスター）」の勝敗判定器です。
ゲームの正解のお題「${requestTopic}」に対して、スパイ（人狼）が「${requestGuess}」という推測を行いました。

この推測「${requestGuess}」が、お題「${requestTopic}」と【実質的に同じ意味・概念を指しているか】を判定してください。
表記の揺れ（漢字・ひらがな・カタカナ・英語）、あるいは類義語（例：「すし」と「お寿司」など）は同一とみなしてください。また、「スマホ」と「スマートフォン」のような略称も同一とみなします。

判定基準：
- 完全に異なる場合は false
- 実質的に指している対象が同じ、または非常に近い場合は true

出力は以下のJSON形式のみ（余計な説明やMarkdownのバックティックスなどは一切なし）で返してください。
{
  "isCorrect": true または false,
  "reason": "なぜそう判定したかの1文の解説（日本語）"
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    if (text.startsWith("```json")) {
      text = text.replace(/```json|```/g, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/```/g, "").trim();
    }

    const data = JSON.parse(text);

    return NextResponse.json({
      isCorrect: !!data.isCorrect,
      reason: data.reason || "AIによる判定が行われました。",
      fallback: false
    });
  } catch (error: unknown) {
    console.error("Bot Guess Error:", error);
    const cleanTopic = requestTopic.trim().toLowerCase().replace(/[\s　、。]/g, "");
    const cleanGuess = requestGuess.trim().toLowerCase().replace(/[\s　、。]/g, "");
    const isCorrect = cleanTopic.includes(cleanGuess) || cleanGuess.includes(cleanTopic);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      isCorrect,
      reason: `（エラーフォールバック）「${requestGuess}」と「${requestTopic}」の簡易文字列比較結果です。`,
      fallback: true,
      error: errorMessage
    });
  }
}
