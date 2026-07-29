import { NextResponse } from "next/server";
import { getGeminiClient } from "../../utils/gemini";

interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
}

interface Player {
  id: string;
  name: string;
  isBot: boolean;
}

export async function POST(request: Request) {
  let requestBotId = "";
  let requestPlayers: Player[] = [];
  try {
    const {
      botId,
      botName,
      personality,
      isSpy,
      topic,
      history,
      players
    } = await request.json();

    requestBotId = botId || "";
    requestPlayers = players || [];

    const ai = getGeminiClient();

    const historyText = history
      .map((msg: ChatMessage) => `${msg.senderName}: ${msg.text}`)
      .join("\n");

    const playersListText = requestPlayers
      .map((p: Player) => `- ID: ${p.id}, 名前: ${p.name}`)
      .join("\n");

    if (!ai) {
      const otherPlayers = requestPlayers.filter((p: Player) => p.id !== requestBotId);
      const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      return NextResponse.json({
        voteTargetId: randomTarget ? randomTarget.id : "",
        reason: "なんとなく一番怪しいと感じました。",
        fallback: true
      });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const prompt = `あなたは「お題当て人狼ゲーム（プロンプト・インポスター）」のAIプレイヤー「${botName}」です。
現在、会話（2ラウンド）が終了し、投票の時間になりました。
あなたは、プレイヤー全員の会話を振り返り、「お題を知らずに話を合わせていたスパイ」だと思う人（1名）に投票しなければなりません。

あなた自身の役割：${isSpy ? "AIスパイ（お題を知りません）" : `市民（お題は「${topic}」です）`}
あなたの性格・口調（キャラクター性）：${personality}

【投票方針】
1. あなたが【市民】の場合：
   お題「${topic}」に対して、的外れなことを言っている、あるいはあまりにも抽象的すぎて話を合わせているだけに見えるプレイヤーを鋭く見抜いて投票してください。
2. あなたが【AIスパイ】の場合：
   自分がスパイであることがバレないよう、かつ市民同士で仲間割れを起こさせるように、もっともらしく「怪しい」と言い訳ができる誰か（他の人間や一般AIプレイヤー）をターゲットに投票してください。※自分（${requestBotId}）には絶対に投票しないでください！

これまでのチャット履歴：
${historyText}

投票対象となる全プレイヤーリスト（ここから必ず1名を選んでください。自分自身は選べません！）：
${playersListText}

出力は以下のJSON形式のみ（余計な説明やMarkdownのバックティックスなどは一切なし）で返してください。
{
  "voteTargetId": "投票するプレイヤーのID (例: player-1)",
  "reason": "怪しいと思った理由（あなたの口調「${personality}」に合わせた1〜2文）"
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    if (text.startsWith("```json")) {
      text = text.replace(/```json|```/g, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/```/g, "").trim();
    }

    const data = JSON.parse(text);

    const otherPlayers = requestPlayers.filter((p: Player) => p.id !== requestBotId);
    const validIds = otherPlayers.map((p: Player) => p.id);
    if (!data.voteTargetId || !validIds.includes(data.voteTargetId)) {
      const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      data.voteTargetId = randomTarget ? randomTarget.id : "";
    }

    return NextResponse.json({
      voteTargetId: data.voteTargetId,
      reason: data.reason || "話の流れから、この人が怪しいと思いました。",
      fallback: false
    });
  } catch (error: unknown) {
    console.error("Bot Vote Error:", error);
    const otherPlayers = requestPlayers.filter((p: Player) => p.id !== requestBotId);
    const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      voteTargetId: randomTarget ? randomTarget.id : "",
      reason: "お互いの発言の矛盾を考慮して、この人に投票します。",
      fallback: true,
      error: errorMessage
    });
  }
}
