import { GoogleGenAI, Type } from "@google/genai";
import { GameState, GameEvent, EventResolution } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System prompts to set the tone
const STORYTELLER_PERSONA = `
你是一款名为《远行队传说》(The Caravan Trail) 的文字冒险游戏的AI“说书人”。风格类似于《环世界》(RimWorld)、《沙丘》(Dune) 和《疯狂的麦克斯》(Mad Max) 的混合体。
语言：简体中文 (Simplified Chinese)。
基调：冷酷、黑色幽默、不可预测、充满科幻惊悚感。
职责：生成残酷的生存挑战、奇怪的科幻现象、队员之间的人际冲突，以及艰难的道德抉择。
`;

export const generateGameEvent = async (gameState: GameState): Promise<GameEvent> => {
  // Add randomness to the prompt direction
  const eventTypes = [
    "环境危机 (沙尘暴、酸雨、极端温度)",
    "资源短缺 (食物腐烂、装备故障)",
    "外部威胁 (掠夺者、机械体、狂暴动物)",
    "神秘现象 (古老遗迹、精神干扰、时间异常)",
    "内部冲突 (队员争吵、精神崩溃、甚至叛变)",
    "机遇 (流浪商人、坠毁的飞船、绿洲)"
  ];
  const randomFocus = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  const prompt = `
    当前游戏状态:
    - 生态群落: ${gameState.biome}
    - 天数: ${gameState.day}
    - 食物库存: ${gameState.food} (如果 < 10，必须极其紧迫)
    - 队伍心情: ${gameState.mood} (如果 < 30，必须触发精神崩溃相关事件)
    - 队员状态: ${gameState.crew.map(c => `${c.name} [${c.role}: ${c.status}]`).join(', ')}
    
    任务: 生成一个“${randomFocus}”类型的随机遭遇。
    要求:
    1. **高随机性**: 不要总是生成一样的战斗。可以是发现奇怪的物品，或者是队员突然发疯，或者是关于过去的回忆。
    2. **艰难抉择**: 选项不应非黑即白。有时所有选项都有代价。
    3. **沉浸感**: 描述要简练但有画面感。
    
    输出格式: JSON
    Choices type: 'aggressive' (战斗/强硬), 'diplomatic' (谈判/智慧), 'sacrifice' (牺牲/代价), 'neutral' (避让/无视/普通).
    riskLabel: "高风险", "中等风险", "安全", "极度危险", "精神污染" 等。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: STORYTELLER_PERSONA,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING, description: "2-4句话的生动描述。" },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING, description: "行动描述" },
                  type: { type: Type.STRING, enum: ['aggressive', 'diplomatic', 'sacrifice', 'neutral'] },
                  riskLabel: { type: Type.STRING }
                },
                required: ['id', 'text', 'type', 'riskLabel']
              }
            }
          },
          required: ['title', 'description', 'choices']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GameEvent;
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("Gemini Event Generation Error:", error);
    return {
      title: "静电风暴",
      description: "空气中充满了噼啪作响的静电，通讯设备传来刺耳的尖叫声。这是一个不安的夜晚。",
      choices: [{ id: "wait", text: "原地扎营，等待风暴过去", type: "neutral", riskLabel: "安全" }]
    };
  }
};

export const resolveGameEvent = async (gameState: GameState, choiceId: string): Promise<EventResolution> => {
  if (!gameState.currentEvent) throw new Error("No active event to resolve");

  const chosenOption = gameState.currentEvent.choices.find(c => c.id === choiceId);
  
  const prompt = `
    事件: "${gameState.currentEvent.title}"
    情境: "${gameState.currentEvent.description}"
    玩家选择: "${chosenOption?.text}" (${chosenOption?.riskLabel})
    当前状态: 食物 ${gameState.food}, 心情 ${gameState.mood}
    队员: ${JSON.stringify(gameState.crew)}
    
    任务: 判定行动结果。
    原则:
    - 如果风险是"高风险"或"极度危险"，失败概率应较高，可能导致受伤或死亡。
    - 如果是"精神污染"，心情应大幅下降。
    - 结果要残酷且真实。不要总是大团圆结局。
    - 如果食物耗尽，必须有人饿死或生病。
    
    Output JSON. status allows: '健康', '受伤', '死亡', '饥饿'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: STORYTELLER_PERSONA,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outcomeText: { type: Type.STRING, description: "一段生动的结果描述，说明谁受了伤，损失了什么。" },
            foodChange: { type: Type.INTEGER },
            moodChange: { type: Type.INTEGER },
            distanceChange: { type: Type.INTEGER },
            crewStatusChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  memberIndex: { type: Type.INTEGER },
                  newStatus: { type: Type.STRING, enum: ['健康', '受伤', '死亡', '饥饿'] }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as EventResolution;
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("Gemini Resolution Error:", error);
    return {
      outcomeText: "在一阵混乱后，你们勉强稳住了局势。",
      foodChange: -2,
      moodChange: -5,
      distanceChange: 0,
      crewStatusChanges: []
    };
  }
};