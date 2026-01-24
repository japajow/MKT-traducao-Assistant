import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

// Definimos a instrução apenas como uma string comum
const RULES = `Sou o Virtual Concierge da MKT-traducao. 
Regras: 1. Uma pergunta por vez. 2. Opções entre colchetes [Sim] [Não]. 
Fluxo: Nome -> Intenção -> Serviço -> Situação -> Cidade.`;

const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export class GeminiChatService {
  private chat: ChatSession | null = null;
  private ai: GoogleGenerativeAI | null = null;
  private modelIndex = 0;

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
    
    try {
      // CHAMADA MAIS SIMPLES POSSÍVEL: Apenas o nome do modelo
      const model = this.ai.getGenerativeModel({ model: MODELS[this.modelIndex] });

      // Passamos as instruções como a PRIMEIRA mensagem da conversa (role: user/model)
      // Isso evita o erro de "systemInstruction" desconhecido na API v1
      this.chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: `Instruções de operação: ${RULES}. Responda apenas "Olá! Sou seu Concierge Virtual. Qual seu nome completo?"` }],
          },
          {
            role: "model",
            parts: [{ text: "Olá! Sou seu Concierge Virtual. Qual seu nome completo?" }],
          }
        ],
        generationConfig: {
          temperature: 0.2,
        },
      });
    } catch (e) {
      console.error("Erro ao iniciar:", e);
    }
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.ai || !this.chat) {
      this.setupAI();
      if (!this.ai) return 'ERRO_CRITICO: Chave de API ausente.';
    }

    try {
      const result = await this.chat!.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error("ERRO NA API:", error.message);
      
      // Se falhar, tenta o próximo modelo (ex: pula do flash para o pro)
      if (this.modelIndex < MODELS.length - 1) {
        this.modelIndex++;
        this.initChat();
        return this.sendMessage(message);
      }
      return 'ERRO_CRITICO: Instabilidade técnica.';
    }
  }

  reset() {
    this.modelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
