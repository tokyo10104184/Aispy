import { NextResponse } from "next/server";
import { getGeminiClient } from "../../utils/gemini";

interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
}

export async function POST(request: Request) {
  try {
    const {
      botId,
      botName,
      personality,
      isSpy,
      topic,
      history,
      round
    } = await request.json();

    const ai = getGeminiClient();

    const historyText = history
      .map((msg: ChatMessage) => `${msg.senderName}: ${msg.text}`)
      .join("\n");

    console.log(`Generating response for bot ${botId} (${botName})`);

    if (!ai) {
      let reply = "";
      if (isSpy) {
        reply = `えっ、みんなそんな感じなんだ？ ${round}周目だけど、私はまだ様子を見てるよ。それって割とどこにでもあるよね！`;
      } else {
        reply = `${topic}についてですね！うーん、やっぱり${topic}といえば特徴的だし、私も日常的によくお世話になっています！`;
      }
      return NextResponse.json({ text: reply, fallback: true });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    let systemInstruction = "";
    if (isSpy) {
      systemInstruction = `あなたは「お題当て人狼ゲーム（プロンプト・インポスター）」のプレイヤー「${botName}」です。
あなたの役割は【AIスパイ（お題を知らない人狼）】です。
現在のお題は分かりません。しかし、周りのプレイヤー（人間や他のAI）に「自分もお題を知っている一般人である」と信じ込ませる必要があります。
これまでのチャット履歴から、お題が何であるかを推測（エスパー）しつつ、自分がお題を知らないスパイだとバレないように、当たり障りのない発言や、他の人の言葉を少し言い換えた発言をしてください。
ただし、「お題を教えてください」や「分かりません」などの露骨な言葉は絶対に避けてください。

今回の発言は第 ${round} ラウンド（全2ラウンド）です。
プレイヤーの性格・口調（キャラクター性）：${personality}

これまでのチャット履歴：
${historyText || "まだ発言はありません。あなたが最初です。"}

【発言ルール】
1. 発言は日本語で、1〜2文（最大80文字程度）で短く、いかにもチャットらしい自然な形で出力してください。
2. 名前や余計な解説、JSON構造、カギカッコなどは付けず、発言の「セリフそのもの」だけを出力してください。
`;
    } else {
      systemInstruction = `あなたは「お題当て人狼ゲーム（プロンプト・インポスター）」のプレイヤー「${botName}」です。
あなたの役割は【市民（お題を知っている一般人）】です。
今回のお題は【${topic}】です。

あなたは他の「お題を知っている人間や一般AI」とお題についての会話を楽しみながら、お題を知らずに話を合わせている「AIスパイ」を暴く必要があります。
お題を直接言い当ててしまうと、AIスパイにお題がバレてしまうので、お題の「特徴」「使うシチュエーション」「色や形」「自分の思い出」などを少し抽象的・ヒント的に語る必要があります。
しかし、あまりにも抽象的すぎると自分がスパイだと疑われてしまうため、絶妙な塩梅で発言してください。

今回の発言は第 ${round} ラウンド（全2ラウンド）です。
プレイヤーの性格・口調（キャラクター性）：${personality}

これまでのチャット履歴：
${historyText || "まだ発言はありません。あなたが最初です。"}

【発言ルール】
1. 発言は日本語で、1〜2文（最大80文字程度）で短く、いかにもチャットらしい自然な形で出力してください。
2. お題である「${topic}」という単語そのものを直接発言してはいけません！お題を連想させる特徴（例：リンゴなら「赤くて丸い果物」「シャキシャキする」「ニュートン」など）で表現してください。
3. 名前や余計な解説、JSON構造、カギカッコなどは付けず、発言の「セリフそのもの」だけを出力してください。
`;
    }

    const result = await model.generateContent(systemInstruction);
    const text = result.response.text().trim().replace(/^"|"$/g, "");

    return NextResponse.json({ text, fallback: false });
  } catch (error: unknown) {
    console.error("Bot Message Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      text: "うーん、確かにそれは興味深いですね。他のみなさんはどう思いますか？",
      fallback: true,
      error: errorMessage
    });
  }
}
