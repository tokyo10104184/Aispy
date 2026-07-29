"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Users,
  User,
  Cpu,
  MessageSquare,
  Vote,
  HelpCircle,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  Eye,
  ShieldAlert,
  Volume2,
  VolumeX,
  Plus,
  Minus
} from "lucide-react";
import confetti from "canvas-confetti";

// AI ボットの定義（最大5名のAIキャラを設定可能）
interface BotCharacter {
  id: string;
  name: string;
  personality: string;
  avatar: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

const BOT_CHARACTERS: BotCharacter[] = [
  {
    id: "bot-1",
    name: "サイバーネコ「タマ」",
    personality: "語尾に「〜にゃ」をつけて喋る、好奇心旺盛なネコ型アンドロイド。少しうっかり屋。",
    avatar: "🤖🐱",
    color: "from-pink-500 to-rose-500",
    borderColor: "border-pink-500",
    bgColor: "bg-pink-950/30"
  },
  {
    id: "bot-2",
    name: "熱血ハッカー「ケン」",
    personality: "「限界を突破するぜ！」「マジかよ！」など、勢い重視で語気が強め。裏表のない熱血漢。",
    avatar: "🤖🔥",
    color: "from-orange-500 to-amber-500",
    borderColor: "border-orange-500",
    bgColor: "bg-orange-950/30"
  },
  {
    id: "bot-3",
    name: "ドクター「アイビス」",
    personality: "論理的で冷静沈着。敬語で話し、「データによると…」「確率論的には…」と分析を好むインテリAI。",
    avatar: "🤖👓",
    color: "from-cyan-500 to-blue-500",
    borderColor: "border-cyan-500",
    bgColor: "bg-cyan-950/30"
  },
  {
    id: "bot-4",
    name: "お嬢様AI「セリア」",
    personality: "丁寧なお嬢様口調。「〜ですわ」「ごきげんよう」と優雅に語るが、観察眼は鋭くスパイを徹底追及する。",
    avatar: "🤖🌹",
    color: "from-purple-500 to-violet-500",
    borderColor: "border-purple-500",
    bgColor: "bg-purple-950/30"
  },
  {
    id: "bot-5",
    name: "裏路地の「シャドウ」",
    personality: "ミステリアスで口数が少ない。短い言葉で「…そうか」「影が動いている」などと呟く謎多きダーク系プログラム。",
    avatar: "🤖👥",
    color: "from-gray-500 to-slate-500",
    borderColor: "border-gray-500",
    bgColor: "bg-gray-950/30"
  }
];

interface Player {
  id: string;
  name: string;
  isBot: boolean;
  isSpy: boolean;
  botCharacter?: BotCharacter;
  voteCount: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isBot: boolean;
  avatar: string;
  color: string;
}

interface VoteRecord {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
  reason: string;
}

type PreferredRole = "RANDOM" | "HUMAN" | "SPY";

type GameStage = "SETTINGS" | "REVEAL_ROLE" | "CHAT" | "VOTE" | "VOTE_REVEAL" | "SPY_GUESS" | "GAME_OVER";

export default function Home() {
  // --- ゲーム設定ステート ---
  const [playerName, setPlayerName] = useState("探偵エージェント");
  const [playerCount, setPlayerCount] = useState(4); // 3〜6人
  const [preferredRole, setPreferredRole] = useState<PreferredRole>("RANDOM");
  const [genreType, setGenreType] = useState<"RANDOM" | "CUSTOM">("RANDOM");
  const [customGenre, setCustomGenre] = useState("");

  // --- ゲーム状態ステート ---
  const [stage, setStage] = useState<GameStage>("SETTINGS");
  const [players, setPlayers] = useState<Player[]>([]);
  const [topic, setTopic] = useState("");
  const [myRole, setMyRole] = useState<"HUMAN" | "SPY">("HUMAN");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // ラウンド・ターン管理
  const [currentRound, setCurrentRound] = useState(1);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [activeBotName, setActiveBotName] = useState("");

  // メッセージ入力
  const [userInput, setUserInput] = useState("");

  // 投票・結果管理
  const [userVoteId, setUserVoteId] = useState<string | null>(null);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
  const [tiePlayers, setTiePlayers] = useState<Player[]>([]);

  // 逆当てチャンス管理
  const [spyGuessInput, setSpyGuessInput] = useState("");
  const [spyGuessResult, setSpyGuessResult] = useState<{ isCorrect: boolean; reason: string } | null>(null);
  const [finalWinner, setFinalWinner] = useState<"HUMAN_TEAM" | "SPY_TEAM" | null>(null);

  // その他UIステート
  const [isRoleRevealed, setIsRoleRevealed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // チャット画面スクロール
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isBotThinking]);

  // 効果音再生
  const playSound = useCallback((type: "click" | "reveal" | "message" | "thinking" | "vote" | "success" | "fail") => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "click") {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else if (type === "reveal") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === "message") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === "thinking") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === "vote") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === "success") {
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start();
        osc.stop(now + 0.5);
      } else if (type === "fail") {
        const now = audioCtx.currentTime;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.setValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start();
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn("Audio feedback error:", e);
    }
  }, [soundEnabled]);

  // --- ゲーム初期化・お題生成 ---
  const startGame = async () => {
    playSound("click");
    setIsLoadingTopic(true);
    setIsApiLoading(true);

    try {
      // 1. お題生成API呼び出し
      const response = await fetch("/api/generate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: genreType === "CUSTOM" ? customGenre : "" })
      });
      const data = await response.json();
      const generatedTopic = data.topic || "リンゴ";
      setTopic(generatedTopic);

      // 2. プレイヤー陣営決定
      const botsNeeded = playerCount - 1;
      const selectedBots = [...BOT_CHARACTERS]
        .sort(() => Math.random() - 0.5)
        .slice(0, botsNeeded);

      // 自分の役割決定
      let playerIsSpy = false;
      if (preferredRole === "SPY") {
        playerIsSpy = true;
      } else if (preferredRole === "HUMAN") {
        playerIsSpy = false;
      } else {
        playerIsSpy = Math.random() < 1 / playerCount; // ランダムなら確率でスパイ
      }

      setMyRole(playerIsSpy ? "SPY" : "HUMAN");

      // スパイの選出（プレイヤーがスパイでない場合、BOTの1人がスパイになる）
      let spyIndex = -1;
      if (!playerIsSpy) {
        spyIndex = Math.floor(Math.random() * botsNeeded);
      }

      const generatedPlayers: Player[] = [];
      const userPlayer: Player = {
        id: "player-user",
        name: playerName || "あなた",
        isBot: false,
        isSpy: playerIsSpy,
        voteCount: 0
      };
      generatedPlayers.push(userPlayer);

      selectedBots.forEach((bot, index) => {
        generatedPlayers.push({
          id: bot.id,
          name: bot.name,
          isBot: true,
          isSpy: !playerIsSpy && index === spyIndex,
          botCharacter: bot,
          voteCount: 0
        });
      });

      // プレイ順序をランダムにシャッフルする
      const shuffledPlayers = [...generatedPlayers].sort(() => Math.random() - 0.5);
      setPlayers(shuffledPlayers);

      // 初期化ステート
      setChatMessages([]);
      setCurrentRound(1);
      setTurnIndex(0);
      setIsRoleRevealed(false);
      setUserVoteId(null);
      setVotes([]);
      setEliminatedPlayer(null);
      setTiePlayers([]);
      setSpyGuessInput("");
      setSpyGuessResult(null);
      setFinalWinner(null);

      // 役割確認画面へ
      setStage("REVEAL_ROLE");
      playSound("reveal");
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoadingTopic(false);
      setIsApiLoading(false);
    }
  };

  // ターン開始・ターン進行ロジック
  const startChatStage = () => {
    playSound("click");
    setStage("CHAT");
  };

  // ボットが喋るロジック
  const processBotTurn = useCallback(async (botPlayer: Player) => {
    if (isBotThinking) return;
    setIsBotThinking(true);
    setActiveBotName(botPlayer.name);
    playSound("thinking");

    try {
      const response = await fetch("/api/bot-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: botPlayer.id,
          botName: botPlayer.name,
          personality: botPlayer.botCharacter?.personality || "",
          isSpy: botPlayer.isSpy,
          topic: topic,
          history: chatMessages.map(m => ({
            senderId: m.senderId,
            senderName: m.senderName,
            text: m.text
          })),
          round: currentRound
        })
      });

      const data = await response.json();
      const messageText = data.text || "うーん、ちょっと今考え中だにゃ。";

      // メッセージをチャット欄に追加
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        senderId: botPlayer.id,
        senderName: botPlayer.name,
        text: messageText,
        isBot: true,
        avatar: botPlayer.botCharacter?.avatar || "🤖",
        color: botPlayer.botCharacter?.color || "from-slate-500 to-slate-500"
      };

      setChatMessages(prev => [...prev, botMsg]);
      playSound("message");

      // ターンを進める、または次のラウンド、または投票へ
      setIsBotThinking(false);
      setTurnIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex < players.length) {
          return nextIndex;
        } else {
          // 1周終了
          setCurrentRound(prevRound => {
            if (prevRound === 1) {
              return 2;
            } else {
              setStage("VOTE");
              playSound("reveal");
              return prevRound;
            }
          });
          return 0;
        }
      });
    } catch (error) {
      console.error("Bot turn error:", error);
      setIsBotThinking(false);
    }
  }, [chatMessages, currentRound, players, topic, isBotThinking, playSound]);

  // 自動ボットターン処理
  useEffect(() => {
    if (stage !== "CHAT" || isApiLoading) return;

    const currentPlayer = players[turnIndex];
    if (!currentPlayer) return;

    if (currentPlayer.isBot) {
      // ボットのターン
      const timer = setTimeout(() => {
        processBotTurn(currentPlayer);
      }, 1200); // 1.2秒後に入力思考アニメーション開始
      return () => clearTimeout(timer);
    } else {
      // プレイヤーのターン
      setIsBotThinking(false);
    }
  }, [stage, turnIndex, players, isApiLoading, processBotTurn]);

  // プレイヤーがメッセージを送信する
  const handleSendMessage = () => {
    if (!userInput.trim() || isBotThinking) return;

    const userPlayer = players.find(p => !p.isBot);
    if (!userPlayer) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: userPlayer.id,
      senderName: userPlayer.name,
      text: userInput,
      isBot: false,
      avatar: "👤",
      color: "from-indigo-500 to-blue-600"
    };

    setChatMessages(prev => [...prev, newMsg]);
    playSound("message");
    setUserInput("");

    // ターンを進める
    setTurnIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < players.length) {
        return nextIndex;
      } else {
        // 1周終了
        setCurrentRound(prevRound => {
          if (prevRound === 1) {
            return 2;
          } else {
            setStage("VOTE");
            playSound("reveal");
            return prevRound;
          }
        });
        return 0;
      }
    });
  };

  // --- ボット投票シミュレーション & 集計 ---
  const handleVoteAndProcessAll = async (targetId: string) => {
    playSound("click");
    setUserVoteId(targetId);
    setIsApiLoading(true);

    const userPlayer = players.find(p => !p.isBot);
    const userTarget = players.find(p => p.id === targetId);

    const initialVotes: VoteRecord[] = [];
    if (userPlayer && userTarget) {
      initialVotes.push({
        voterId: userPlayer.id,
        voterName: userPlayer.name,
        targetId: targetId,
        targetName: userTarget.name,
        reason: "一番怪しいと思ったため。"
      });
    }

    // 他の全ボットの投票を並列で呼び出す
    const botPlayers = players.filter(p => p.isBot);
    const votePromises = botPlayers.map(async (bot) => {
      try {
        const response = await fetch("/api/bot-vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: bot.id,
            botName: bot.name,
            personality: bot.botCharacter?.personality || "",
            isSpy: bot.isSpy,
            topic: topic,
            history: chatMessages.map(m => ({
              senderId: m.senderId,
              senderName: m.senderName,
              text: m.text
            })),
            players: players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot }))
          })
        });
        const data = await response.json();
        const target = players.find(p => p.id === data.voteTargetId);
        return {
          voterId: bot.id,
          voterName: bot.name,
          targetId: data.voteTargetId,
          targetName: target ? target.name : "不明",
          reason: data.reason || "怪しいと感じました。"
        };
      } catch (error) {
        console.error("Bot vote failed:", error);
        const otherPlayers = players.filter(p => p.id !== bot.id);
        const rand = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        return {
          voterId: bot.id,
          voterName: bot.name,
          targetId: rand ? rand.id : "",
          targetName: rand ? rand.name : "不明",
          reason: "直感で投票します。"
        };
      }
    });

    const allBotVotes = await Promise.all(votePromises);
    const allVotes = [...initialVotes, ...allBotVotes];
    setVotes(allVotes);

    // 得票数のカウント
    const voteCounts: { [key: string]: number } = {};
    players.forEach(p => { voteCounts[p.id] = 0; });
    allVotes.forEach(v => {
      if (voteCounts[v.targetId] !== undefined) {
        voteCounts[v.targetId]++;
      }
    });

    // プレイヤーオブジェクトに得票数を反映
    const updatedPlayers = players.map(p => ({
      ...p,
      voteCount: voteCounts[p.id] || 0
    }));
    setPlayers(updatedPlayers);

    // 最大得票プレイヤーの判定
    let maxVotes = -1;
    let tie: Player[] = [];

    updatedPlayers.forEach(p => {
      if (p.voteCount > maxVotes) {
        maxVotes = p.voteCount;
        tie = [p];
      } else if (p.voteCount === maxVotes) {
        tie.push(p);
      }
    });

    if (tie.length === 1) {
      setEliminatedPlayer(tie[0]);
    } else {
      setTiePlayers(tie);
      const chosen = tie[Math.floor(Math.random() * tie.length)];
      setEliminatedPlayer(chosen);
    }

    setIsApiLoading(false);
    setStage("VOTE_REVEAL");
    playSound("reveal");
  };

  // --- 投票結果発表後の処理：スパイ当てか否か ---
  const handleProceedAfterReveal = async () => {
    playSound("click");
    if (!eliminatedPlayer) return;

    if (eliminatedPlayer.isSpy) {
      // スパイが捕まった場合！ → スパイに「お題の逆当てチャンス」を与える
      setStage("SPY_GUESS");
    } else {
      // スパイ以外（市民）が捕まってしまった場合 → スパイ側の勝利確定！
      setFinalWinner("SPY_TEAM");
      playSound("fail");
      setStage("GAME_OVER");
    }
  };

  // 勝利の紙吹雪
  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  // --- スパイ（人間、またはAI）のお題推測処理 ---
  const handleSpyGuess = async () => {
    if (eliminatedPlayer?.isBot) {
      // AIボットがスパイだった場合の「自動推測」
      setIsApiLoading(true);
      try {
        const response = await fetch("/api/bot-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: eliminatedPlayer.id,
            botName: eliminatedPlayer.name,
            personality: `${eliminatedPlayer.botCharacter?.personality || ""}。お題が何であるか、これまでの会話履歴から単語を1つ、ズバリ自信を持って推測してください。`,
            isSpy: true,
            topic: "???",
            history: chatMessages.map(m => ({
              senderId: m.senderId,
              senderName: m.senderName,
              text: m.text
            })),
            round: "投票後のお題推測"
          })
        });

        const botMsgData = await response.json();
        const guessedWord = botMsgData.text.replace(/[「」『』"']/g, "").slice(0, 15);
        setSpyGuessInput(guessedWord);

        const checkResponse = await fetch("/api/bot-guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, guess: guessedWord })
        });
        const checkData = await checkResponse.json();

        setSpyGuessResult({
          isCorrect: checkData.isCorrect,
          reason: checkData.reason || `AIスパイは「${guessedWord}」と推測しました。`
        });

        if (checkData.isCorrect) {
          setFinalWinner("SPY_TEAM");
          playSound("fail");
        } else {
          setFinalWinner("HUMAN_TEAM");
          playSound("success");
          triggerConfetti();
        }
      } catch (error) {
        console.error("AI spy guess error:", error);
        setSpyGuessInput("不明な単語");
        setSpyGuessResult({ isCorrect: false, reason: "推測に失敗しました。" });
        setFinalWinner("HUMAN_TEAM");
        playSound("success");
      } finally {
        setIsApiLoading(false);
        setStage("GAME_OVER");
      }
    } else {
      // 人間プレイヤー自身がスパイだった場合の「手動推測」
      if (!spyGuessInput.trim()) return;
      setIsApiLoading(true);
      try {
        const response = await fetch("/api/bot-guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, guess: spyGuessInput })
        });
        const data = await response.json();

        setSpyGuessResult({
          isCorrect: data.isCorrect,
          reason: data.reason || `あなたの推測「${spyGuessInput}」が判定されました。`
        });

        if (data.isCorrect) {
          setFinalWinner("SPY_TEAM");
          playSound("success");
          triggerConfetti();
        } else {
          setFinalWinner("HUMAN_TEAM");
          playSound("fail");
        }
      } catch (error) {
        console.error("Human spy guess error:", error);
        const isCorrect = spyGuessInput.trim() === topic.trim();
        setSpyGuessResult({
          isCorrect,
          reason: `判定エラーにより簡易一致判定（${isCorrect ? "正解" : "不正解"}）になりました。`
        });
        setFinalWinner(isCorrect ? "SPY_TEAM" : "HUMAN_TEAM");
      } finally {
        setIsApiLoading(false);
        setStage("GAME_OVER");
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* 共通ネオン風ヘッダー */}
      <header className="border-b border-cyan-500/30 bg-slate-900/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-[0_1px_20px_rgba(6,182,212,0.15)]">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-indigo-600 p-2 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <ShieldAlert className="w-6 h-6 text-slate-950 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-200 to-indigo-400 bg-clip-text text-transparent tracking-wider">
              PROMPT IMPOSTER
            </h1>
            <p className="text-xs text-cyan-400/70 font-mono tracking-widest uppercase">
              AI Spy Detective Game
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {stage !== "SETTINGS" && (
            <div className="hidden md:flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-xs font-mono text-cyan-300">
                お題: {myRole === "SPY" && stage !== "GAME_OVER" ? "???" : topic}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playSound("click");
            }}
            className="p-2.5 rounded-xl border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all duration-300 group"
            title={soundEnabled ? "音量をミュート" : "音量を有効化"}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>
      </header>

      {/* メインゲームコンテナ */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-6 justify-center">

        {/* =======================================
            STAGE 1: SETTINGS (ゲーム設定画面)
            ======================================= */}
        {stage === "SETTINGS" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center mb-8">
              <span className="px-3 py-1 text-xs font-mono tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 rounded-full uppercase">
                🤖 AIスパイを暴け
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold mt-3 text-slate-100 tracking-tight">
                プロンプト・インポスター
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
                複数のプレイヤーの中に1人だけ混ざっている「お題を知らないAI」を会話で見つけ出す、スリリングな推理チャットゲーム！
              </p>
            </div>

            <div className="space-y-6">
              {/* プレイヤー名 */}
              <div>
                <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                  1. あなたのコードネーム
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                    placeholder="プレイヤー名を入力..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-2xl pl-12 pr-4 py-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                  />
                </div>
              </div>

              {/* 参加人数設定 */}
              <div>
                <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                  2. 参加人数 (あなた + AIボット)
                </label>
                <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => {
                      playSound("click");
                      setPlayerCount(Math.max(3, playerCount - 1));
                    }}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:text-cyan-400 rounded-xl transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center font-mono font-bold text-lg flex justify-center items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <span>{playerCount} 人プレイ</span>
                    <span className="text-xs text-slate-500">
                      (ボット: {playerCount - 1}人)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      playSound("click");
                      setPlayerCount(Math.min(6, playerCount + 1));
                    }}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:text-cyan-400 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 役割希望 */}
              <div>
                <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                  3. あなたの陣営希望
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "RANDOM" as PreferredRole, label: "ランダム", desc: "運を天に任せる", icon: HelpCircle },
                    { id: "HUMAN" as PreferredRole, label: "市民", desc: "お題を知っている", icon: CheckCircle },
                    { id: "SPY" as PreferredRole, label: "AIスパイ", desc: "お題を知らない", icon: AlertTriangle }
                  ].map((role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        playSound("click");
                        setPreferredRole(role.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        preferredRole === role.id
                          ? "border-cyan-500 bg-cyan-950/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <role.icon className={`w-4 h-4 mb-1.5 ${preferredRole === role.id ? "text-cyan-400" : "text-slate-500"}`} />
                      <div className="text-xs font-bold font-mono">{role.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{role.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* お題の生成ジャンル */}
              <div>
                <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                  4. お題の生成オプション
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => {
                      playSound("click");
                      setGenreType("RANDOM");
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      genreType === "RANDOM"
                        ? "border-cyan-500 bg-cyan-950/20 text-cyan-300"
                        : "border-slate-800 bg-slate-950/60 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">完全おまかせ</span>
                  </button>
                  <button
                    onClick={() => {
                      playSound("click");
                      setGenreType("CUSTOM");
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      genreType === "CUSTOM"
                        ? "border-cyan-500 bg-cyan-950/20 text-cyan-300"
                        : "border-slate-800 bg-slate-950/60 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">ジャンル・キーワード指定</span>
                  </button>
                </div>

                {genreType === "CUSTOM" && (
                  <div className="relative animate-fadeIn">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={customGenre}
                      onChange={(e) => setCustomGenre(e.target.value.slice(0, 30))}
                      placeholder="例：食べ物、ゲーム、日本の地名、エモい言葉など..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* ゲーム開始ボタン */}
              <button
                onClick={startGame}
                disabled={isLoadingTopic}
                className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-sm py-4 px-6 rounded-2xl shadow-[0_4px_25px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingTopic ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    <span>Geminiがお題を考えています...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-slate-950" />
                    <span>ゲームを開始する</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* =======================================
            STAGE 2: REVEAL_ROLE (役割確認画面)
            ======================================= */}
        {stage === "REVEAL_ROLE" && (
          <div className="max-w-md w-full mx-auto bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative text-center backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

            <span className="px-3 py-1 text-[10px] font-mono tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 rounded-full uppercase">
              DECRYPTING AGENT ROLE
            </span>
            <h3 className="text-xl font-bold mt-4 mb-6">配属された役割の確認</h3>

            {/* ロールカードのフリップ効果風 */}
            <div className="perspective-1000 my-8">
              {!isRoleRevealed ? (
                <button
                  onClick={() => {
                    setIsRoleRevealed(true);
                    playSound("reveal");
                  }}
                  className="w-full h-64 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-dashed border-cyan-500/50 rounded-2xl flex flex-col justify-center items-center group cursor-pointer hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                >
                  <Eye className="w-12 h-12 text-cyan-400 animate-pulse group-hover:scale-110 transition-transform mb-3" />
                  <span className="text-sm font-bold text-slate-300">タップして機密ファイルを開く</span>
                  <span className="text-xs text-slate-500 mt-1">あなたの役割とお題が書き込まれています</span>
                </button>
              ) : (
                <div className={`w-full h-64 rounded-2xl border-2 p-6 flex flex-col justify-between items-center transition-all duration-500 bg-slate-950/90 shadow-[0_0_30px_rgba(6,182,212,0.15)] ${
                  myRole === "SPY" ? "border-rose-500/70 shadow-rose-950/20" : "border-cyan-500/70"
                }`}>
                  <div className="flex flex-col items-center">
                    {myRole === "SPY" ? (
                      <>
                        <div className="bg-rose-500/20 text-rose-400 p-3 rounded-full mb-3">
                          <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h4 className="text-2xl font-black text-rose-400 tracking-wider">AIスパイ (インポスター)</h4>
                        <p className="text-xs text-slate-400 mt-2 max-w-xs">
                          あなたはお題を知りません。周囲の会話をよく観察し、話を合わせながらスパイだとバレないように騙し通してください！
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="bg-cyan-500/20 text-cyan-400 p-3 rounded-full mb-3">
                          <CheckCircle className="w-10 h-10" />
                        </div>
                        <h4 className="text-2xl font-black text-cyan-400 tracking-wider">市民 (探偵エージェント)</h4>
                        <p className="text-xs text-slate-400 mt-2 max-w-xs">
                          あなたはお題を知っています。AIスパイに直接お題の言葉を当てられないように注意しながら、それとなく語ってください。
                        </p>
                      </>
                    )}
                  </div>

                  <div className="w-full bg-slate-900 border border-slate-800 py-3 px-4 rounded-xl">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase">あなたの秘密のお題</span>
                    <span className={`text-lg font-bold ${myRole === "SPY" ? "text-rose-400/90" : "text-cyan-300"}`}>
                      {myRole === "SPY" ? "極秘（不明）" : topic}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isRoleRevealed && (
              <button
                onClick={startChatStage}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <span>捜査チャットルームに入る</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        )}

        {/* =======================================
            STAGE 3: CHAT (捜査チャットルーム画面)
            ======================================= */}
        {stage === "CHAT" && (
          <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-3xl h-[80vh] overflow-hidden shadow-2xl backdrop-blur-sm">

            {/* チャット情報バー */}
            <div className="bg-slate-950/80 border-b border-slate-800 p-4 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-cyan-950/60 text-cyan-400 border border-cyan-800 rounded-full">
                  ラウンド {currentRound} / 2
                </span>
                <span className="text-xs text-slate-400">
                  各プレイヤー2回ずつ発言
                </span>
              </div>
              <div className="text-xs font-mono text-cyan-300">
                お題ヒント: {myRole === "SPY" ? "【極秘：会話から推測せよ】" : `【${topic}】`}
              </div>
            </div>

            {/* チャット履歴エリア */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                  <p>捜査チャットが始まりました。</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {players[turnIndex]?.isBot ? `${players[turnIndex]?.name}の発言を待っています...` : "あなたの発言順です。"}
                  </p>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] animate-fadeIn ${
                    msg.senderId === "player-user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* アバター */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0 bg-gradient-to-tr ${msg.color}`}>
                    {msg.avatar}
                  </div>

                  {/* メッセージ本文 */}
                  <div>
                    <div className={`text-[10px] text-slate-500 font-mono mb-0.5 ${
                      msg.senderId === "player-user" ? "text-right" : ""
                    }`}>
                      {msg.senderName} {msg.senderId === "player-user" && "(あなた)"}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.senderId === "player-user"
                        ? "bg-cyan-500 text-slate-950 rounded-tr-none font-medium"
                        : "bg-slate-950/80 border border-slate-800 text-slate-100 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}

              {/* ボット入力中のインジケーター */}
              {isBotThinking && (
                <div className="flex gap-3 max-w-[80%] mr-auto items-center animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0">
                    🤖
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-mono mb-0.5">{activeBotName}</div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* 下部入力コントロール */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800">
              {players[turnIndex] && !players[turnIndex].isBot ? (
                // プレイヤーの送信番
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value.slice(0, 100))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    placeholder={
                      myRole === "SPY"
                        ? "スパイだとバレないようにそれっぽいチャットを送信..."
                        : `お題「${topic}」をボットに直接言わずに特徴を送信...`
                    }
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded-xl px-4 py-3 text-sm text-slate-100"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>送信</span>
                    <Send className="w-4 h-4 fill-slate-950" />
                  </button>
                </div>
              ) : (
                // ボットの送信待ち
                <div className="text-center text-xs text-slate-500 font-mono py-3 bg-slate-900/40 rounded-xl border border-slate-800/40 animate-pulse">
                  {players[turnIndex] ? (
                    <span>【{players[turnIndex].name}】が分析発言を構成中... 🔍</span>
                  ) : (
                    <span>通信中...</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =======================================
            STAGE 4: VOTE (投票画面)
            ======================================= */}
        {stage === "VOTE" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative backdrop-blur-sm">
            <div className="text-center mb-6">
              <span className="px-3 py-1 text-[10px] font-mono tracking-widest text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-full uppercase">
                EMERGENCY VOTING
              </span>
              <h2 className="text-2xl font-extrabold mt-3 text-slate-100">
                AIスパイ投票
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                2回の会話が終わりました。この会話の中で「お題を知らずに話を合わせていた」と思う人物（スパイ）を1人選んで投票してください。
              </p>
            </div>

            {/* チャット履歴を読み返せるセクション（アコーディオン的） */}
            <details className="mb-6 border border-slate-800 bg-slate-950/40 rounded-xl overflow-hidden">
              <summary className="p-3 text-xs font-mono text-cyan-400 cursor-pointer hover:bg-slate-900 transition-all select-none flex justify-between items-center">
                <span>💬 チャット履歴の確認を開く</span>
                <span className="text-slate-500 text-[10px]">タップで開閉</span>
              </summary>
              <div className="p-4 space-y-2 max-h-60 overflow-y-auto text-xs border-t border-slate-900 bg-slate-950/60">
                {chatMessages.map(m => (
                  <div key={m.id} className="flex gap-2">
                    <span className="font-bold font-mono text-cyan-500 shrink-0">{m.senderName}:</span>
                    <span className="text-slate-300">{m.text}</span>
                  </div>
                ))}
              </div>
            </details>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {players
                .filter(p => p.id !== "player-user") // 自分以外に投票可能
                .map((p) => {
                  const bot = p.botCharacter;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleVoteAndProcessAll(p.id)}
                      disabled={isApiLoading}
                      className="group relative p-5 bg-slate-950/80 border border-slate-800 hover:border-rose-500/50 rounded-2xl text-left transition-all hover:bg-slate-900 flex items-center gap-4 disabled:opacity-50"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md shrink-0 bg-gradient-to-tr ${bot?.color || "from-slate-700 to-slate-800"}`}>
                        {bot?.avatar || "🤖"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-200 group-hover:text-rose-400 transition-colors truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {bot?.personality}
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 group-hover:border-rose-500/50 p-2 rounded-xl transition-all">
                        <Vote className="w-5 h-5 text-slate-500 group-hover:text-rose-400" />
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* =======================================
            STAGE 5: VOTE_REVEAL (投票結果発表画面)
            ======================================= */}
        {stage === "VOTE_REVEAL" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative text-center backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

            <span className="px-3 py-1 text-[10px] font-mono tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 rounded-full uppercase">
              VOTING RESULTS
            </span>
            <h2 className="text-2xl font-extrabold mt-3 text-slate-100">
              投票結果の発表
            </h2>

            {/* 投票先明細 */}
            <div className="my-8 max-w-md mx-auto bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-left space-y-3">
              <h4 className="text-xs font-mono text-cyan-400 border-b border-slate-800 pb-2">投票内訳</h4>
              {votes.map((v, idx) => (
                <div key={idx} className="text-xs flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                  <div>
                    <span className="font-bold text-slate-300">{v.voterName}</span>
                    <span className="text-slate-500 mx-1">→</span>
                    <span className="font-bold text-rose-400">{v.targetName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">「{v.reason}」</div>
                </div>
              ))}
            </div>

            {/* 被投票数グラフ */}
            <div className="my-8 space-y-3 max-w-md mx-auto">
              <h4 className="text-xs font-mono text-slate-400 text-left">得票グラフ</h4>
              {players.map((p) => {
                const percentage = (p.voteCount / players.length) * 100;
                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold">{p.name} {p.id === "player-user" && "(あなた)"}</span>
                      <span className="font-mono text-cyan-400">{p.voteCount} 票</span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full bg-gradient-to-r ${userVoteId === p.id ? "from-rose-500 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "from-cyan-500 to-indigo-500"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 結果テキスト */}
            <div className="my-8 p-6 bg-slate-950/50 border border-slate-800 rounded-2xl max-w-md mx-auto">
              {tiePlayers.length > 1 && (
                <div className="text-xs text-amber-400 font-mono mb-2">
                  ※得票数が同数（{tiePlayers[0].voteCount}票）のため、決議によりランダムに追放者を選出しました。
                </div>
              )}
              <p className="text-slate-400 text-sm">
                最も怪しいと投票されたのは...
              </p>
              <h3 className="text-2xl font-black text-rose-400 mt-2 mb-1">
                {eliminatedPlayer?.name}
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-2 uppercase tracking-widest">
                正体デコード結果
              </p>
              <div className="mt-3 text-lg font-bold">
                {eliminatedPlayer?.isSpy ? (
                  <span className="text-rose-500 flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-5 h-5" />
                    【AIスパイ（人狼）】でした！
                  </span>
                ) : (
                  <span className="text-cyan-400 flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-5 h-5" />
                    市民（お題を知っている一般人）でした...
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleProceedAfterReveal}
              className="w-full max-w-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-4 px-6 rounded-2xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
            >
              <span>次に進む</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* =======================================
            STAGE 6: SPY_GUESS (スパイのお題逆当てチャンス画面)
            ======================================= */}
        {stage === "SPY_GUESS" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative text-center backdrop-blur-sm max-w-lg w-full mx-auto">
            <span className="px-3 py-1 text-[10px] font-mono tracking-widest text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-full uppercase">
              SPY REVERSAL CHANCE
            </span>
            <h2 className="text-2xl font-black mt-3 text-slate-100">
              お題の逆当てチャンス！
            </h2>
            <p className="text-xs text-slate-400 mt-2 mb-6">
              スパイは暴かれましたが、市民が話していた「お題」を当てることができれば、スパイの【大逆転勝利】となります。
            </p>

            {eliminatedPlayer?.isBot ? (
              // ボットがスパイだった場合の演出
              <div className="space-y-6">
                <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-2xl shrink-0">
                      {eliminatedPlayer.botCharacter?.avatar || "🤖"}
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-200">{eliminatedPlayer.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 italic">
                    「フフフ、バレてしまっては仕方がないにゃ。でも、みんなの会話からお題は完全に分かったにゃ！」
                  </p>
                </div>

                <button
                  onClick={handleSpyGuess}
                  disabled={isApiLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isApiLoading ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      <span>AIスパイがお題を考察中...</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-5 h-5 fill-slate-950" />
                      <span>AIスパイに推測をさせる</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              // 人間プレイヤー自身がスパイだった場合
              <div className="space-y-6">
                <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl text-left">
                  <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                    あなた（スパイ）のお題推測
                  </label>
                  <input
                    type="text"
                    value={spyGuessInput}
                    onChange={(e) => setSpyGuessInput(e.target.value.slice(0, 20))}
                    placeholder="お題の単語を入力..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    ※漢字・ひらがな・カタカナの揺れはAIが同一と判定します。もっとも近いと思う単語を1つお書きください。
                  </p>
                </div>

                <button
                  onClick={handleSpyGuess}
                  disabled={isApiLoading || !spyGuessInput.trim()}
                  className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isApiLoading ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      <span>Geminiが判定中...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>回答を送信する</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* =======================================
            STAGE 7: GAME_OVER (ゲームオーバー画面)
            ======================================= */}
        {stage === "GAME_OVER" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative text-center backdrop-blur-sm max-w-xl w-full mx-auto overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500" />

            {/* 勝敗判定表示 */}
            <div className="my-6">
              {finalWinner === "HUMAN_TEAM" ? (
                <div>
                  <div className="inline-flex bg-cyan-500/20 text-cyan-400 p-4 rounded-full mb-3 shadow-[0_0_20px_rgba(6,182,212,0.2)] animate-bounce">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-black text-cyan-400 tracking-wider">
                    市民チームの勝利！
                  </h2>
                  <p className="text-sm text-slate-400 mt-2">
                    AIスパイを暴き、お題の逆当てを防ぐことに成功しました！
                  </p>
                </div>
              ) : (
                <div>
                  <div className="inline-flex bg-rose-500/20 text-rose-400 p-4 rounded-full mb-3 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse">
                    <ShieldAlert className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-black text-rose-400 tracking-wider">
                    スパイチームの勝利！
                  </h2>
                  <p className="text-sm text-slate-400 mt-2">
                    AIスパイが正体を隠し通すか、お題を的中させました！
                  </p>
                </div>
              )}
            </div>

            {/* お題詳細 */}
            <div className="my-8 p-6 bg-slate-950/80 border border-slate-800 rounded-2xl text-left space-y-4">
              <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                今回のゲーム捜査記録
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">正解のお題</span>
                  <span className="text-lg font-bold text-cyan-300">{topic}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">スパイプレイヤー</span>
                  <span className="text-lg font-bold text-rose-400">
                    {players.find(p => p.isSpy)?.name}
                  </span>
                </div>
              </div>

              {spyGuessInput && (
                <div className="border-t border-slate-900 pt-3">
                  <span className="block text-[10px] text-slate-500 uppercase">スパイの最終推測</span>
                  <span className="text-sm font-bold text-slate-300">「{spyGuessInput}」</span>
                  {spyGuessResult && (
                    <p className="text-xs text-slate-400 mt-1 italic leading-relaxed">
                      判定理由: {spyGuessResult.reason}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ゲームプレイヤー一覧 */}
            <div className="my-6 text-left">
              <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
                プレイヤーの陣営と結果
              </h4>
              <div className="space-y-2">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex justify-between items-center ${
                      p.isSpy
                        ? "border-rose-900/30 bg-rose-950/10 text-rose-300"
                        : "border-slate-800 bg-slate-950/40 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.botCharacter?.avatar || "👤"}</span>
                      <span className="text-xs font-bold">{p.name} {p.id === "player-user" && "(あなた)"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                        得票数: {p.voteCount}
                      </span>
                      <span className={`text-xs font-bold ${p.isSpy ? "text-rose-400" : "text-cyan-400"}`}>
                        {p.isSpy ? "AIスパイ" : "市民"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* もう一度遊ぶ */}
            <button
              onClick={() => {
                playSound("click");
                setStage("SETTINGS");
              }}
              className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>もう一度遊ぶ</span>
            </button>
          </div>
        )}

      </div>

      {/* 共通フッター */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-600 font-mono">
        <div>
          © {new Date().getFullYear()} PROMPT IMPOSTER — POWERED BY GEMINI 3.5 FLASH-LITE
        </div>
      </footer>
    </main>
  );
}
