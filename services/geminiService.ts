import { GameState, GameEvent, EventResolution } from "../types";

// PackyAPI 网关配置（OpenAI 兼容风格）
// 如果官方文档给出的 baseUrl 或路径不同，请按文档修改下面常量。
const PACKY_API_KEY = process.env.API_KEY;
const PACKY_BASE_URL = "https://api.packyapi.com/v1";
const MODEL_NAME = "gemini-2.5-flash"; // 与你在 Packy 后台选择的模型名称保持一致

// 叙事风格设定
const STORYTELLER_PERSONA = `
你是一款名为《远行队传说》(The Caravan Trail) 的文字冒险游戏的 AI “说书人”。
风格类似于《环世界》(RimWorld)、《沙丘》(Dune) 和《疯狂的麦克斯》(Mad Max) 的混合体。
语言：简体中文。
基调：冷酷、黑色幽默、不可预测、充满科幻惊悚感。
职责：生成残酷的生存挑战、奇怪的科幻现象、队员之间的人际冲突，以及艰难的道德抉择。
`;

// 调用 PackyAPI（OpenAI 兼容 /chat/completions）的辅助函数
async function callPacky(prompt: string): Promise<string> {
  if (!PACKY_API_KEY) {
    throw new Error("Packy API key (process.env.API_KEY) is missing");
  }

  const response = await fetch(`${PACKY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PACKY_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: STORYTELLER_PERSONA },
        { role: "user", content: prompt },
      ],
      // 如果 Packy 文档支持 OpenAI 的 response_format，可以在这里强制要求 JSON：
      // response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("PackyAPI error", response.status, text);
    throw new Error(`PackyAPI error ${response.status}`);
  }

  const data: any = await response.json();
  const message = data?.choices?.[0]?.message?.content;

  if (!message) {
    throw new Error("Empty response from PackyAPI");
  }

  if (typeof message === "string") return message;

  // 兼容 content 为数组的情况
  if (Array.isArray(message)) {
    const first = message[0] as any;
    if (typeof first === "string") return first;
    if (first && typeof first.text === "string") return first.text;
  }

  throw new Error("Unsupported message format from PackyAPI");
}

export const generateGameEvent = async (gameState: GameState): Promise<GameEvent> => {
  const eventTypes = [
    "环境危机 (沙尘暴、酸雨、极端温度)",
    "资源短缺 (食物腐烂、装备故障)",
    "外部威胁 (掠夺者、机械体、狂暴动物)",
    "神秘现象 (古老遗迹、精神干扰、时间异常)",
    "内部冲突 (队员争吵、精神崩溃、甚至叛变)",
    "机遇 (流浪商人、坠毁的飞船、绿洲)",
  ];
  const randomFocus = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  const prompt = `
当前游戏状态：
- 生态群落: ${gameState.biome}
- 天数: ${gameState.day}
- 食物库存: ${gameState.food} (如果 < 10，必须极其紧张)
- 队伍心情: ${gameState.mood} (如果 < 30，必须触发精神崩溃相关事件)
- 队员状态: ${gameState.crew
    .map((c) => `${c.name} [${c.role}: ${c.status}]`)
    .join(", ")}

任务: 生成一个「${randomFocus}」类型的随机遭遇。
要求:
1. 高随机性：不要总是生成一样的战斗，可以是发现奇怪的物品、队员突然发疯、或关于过去的回忆。
2. 艰难抉择：选项不应非黑即白，有时所有选项都有代价。
3. 沉浸感：描述要简练但有画面感。

严格按照下面 JSON 结构输出（不要输出多余文字）：
{
  "title": "事件标题",
  "description": "2-4句话的生动描述",
  "choices": [
    {
      "id": "choice_1",
      "text": "行动描述",
      "type": "aggressive | diplomatic | sacrifice | neutral",
      "riskLabel": "风险标签（如：高风险 / 中等风险 / 安全 / 极度危险 / 精神污染）"
    }
  ]
}
`;

  try {
    const text = await callPacky(prompt);
    return JSON.parse(text) as GameEvent;
  } catch (error) {
    console.error("Gemini Event Generation Error:", error);
    return {
      title: "静电风暴",
      description:
        "空气中充满了噼啪作响的静电，通讯设备传来刺耳的尖叫声。这是一个不安的夜晚。",
      choices: [
        {
          id: "wait",
          text: "原地扎营，等待风暴过去。",
          type: "neutral",
          riskLabel: "安全",
        },
      ],
    };
  }
};

export const resolveGameEvent = async (
  gameState: GameState,
  choiceId: string
): Promise<EventResolution> => {
  if (!gameState.currentEvent) throw new Error("No active event to resolve");

  const chosenOption = gameState.currentEvent.choices.find((c) => c.id === choiceId);

  const prompt = `
事件: "${gameState.currentEvent.title}"
情境: "${gameState.currentEvent.description}"
玩家选择: "${chosenOption?.text}" (${chosenOption?.riskLabel})
当前状态: 食物 ${gameState.food}, 心情 ${gameState.mood}
队员: ${JSON.stringify(gameState.crew)}

任务: 判定行动结果。
原则:
- 如果风险为「高风险」或「极度危险」，失败概率应较高，可能导致受伤或死亡。
- 如果风险为「精神污染」，心情应大幅下降。
- 结果要残酷且真实，不要总是大团圆结局。
- 如果食物耗尽，必须有人饿死或生病。

严格按照下面 JSON 结构输出（不要输出多余文字）：
{
  "outcomeText": "一段生动的结果描述，说明谁受了伤、损失了什么",
  "foodChange": -3,
  "moodChange": -10,
  "distanceChange": 0,
  "crewStatusChanges": [
    { "memberIndex": 0, "newStatus": "健康 | 受伤 | 死亡 | 饥饿" }
  ]
}
`;

  try {
    const text = await callPacky(prompt);
    return JSON.parse(text) as EventResolution;
  } catch (error) {
    console.error("Gemini Resolution Error:", error);
    return {
      outcomeText: "在一阵混乱后，你们勉强稳住了局势。",
      foodChange: -2,
      moodChange: -5,
      distanceChange: 0,
      crewStatusChanges: [],
    };
  }
};

