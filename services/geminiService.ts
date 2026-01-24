import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao, consultoria sênior de vistos no Japão.
TOM DE VOZ: Formal, breve e luxuoso.
REGRAS: 
1. Faça apenas UMA pergunta por vez. 
2. Use colchetes para opções: [Sim] [Não].
3. SEMPRE siga o fluxo: Nome -> Intenção -> Serviço -> Situação -> Cidade.
`;

const AVAILABLE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro'
];

export class GeminiChatService {
  private chat: ChatSession | null = null;
  private ai: GoogleGenerativeAI | null = null;
  private currentModelIndex = 0;

  constructor() {
    this.setupAI();
  }

  private setupAI() {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenerativeAI(apiKey);
      this.initChat();
    }
  }

  private initChat() {
    if (!this.ai) return;
    
    const modelName = AVAILABLE_MODELS[this.currentModelIndex];
    console.log(`🤖 Conectando ao modelo estável: ${modelName}`);

    try {
      // Removemos o systemInstruction daqui para evitar o erro 400
      const model = this.ai.getGenerativeModel({ model: modelName });

      // Injetamos a regra DIRETO no histórico inicial
      this.chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: `Instruções Críticas: ${SYSTEM_INSTRUCTION}. Responda apenas "Entendido, sou seu Concierge Virtual. Como posso ajudar?".` }],
          },
          {
            role: "model",
            parts: [{ text: "Entendido, sou seu Concierge Virtual. Como posso ajudar?" }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      });
    } catch (e) {
      console.error("Erro ao iniciar chat:", e);
    }
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.ai || !this.chat) {
      this.setupAI();
      if (!this.ai) return 'ERRO_CRITICO: Chave de API não configurada.';
    }

    try {
      const result = await this.chat!.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      const msg = error.message || "";
      console.error("Erro detalhado:", msg);
      
      // Fallback para o próximo modelo se o atual falhar
      if (this.currentModelIndex < AVAILABLE_MODELS.length - 1) {
        this.currentModelIndex++;
        this.initChat();
        return this.sendMessage(message);
      }

      return 'ERRO_CRITICO: Instabilidade técnica nos serviços de IA.';
    }
  }

  reset() {
    this.currentModelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
