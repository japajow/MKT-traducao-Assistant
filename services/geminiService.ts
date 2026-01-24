import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const RULES = `Você é o Virtual Concierge da MKT-traducao. 
Regras: 1. Uma pergunta por vez. 2. Opções entre colchetes [Sim] [Não]. 
Fluxo: Nome -> Intenção -> Serviço -> Situação -> Cidade.`;

// Usando os nomes que você confirmou no Google AI Studio
const MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro"
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
      const modelName = MODELS[this.modelIndex];
      console.log(`📡 Tentando conexão ESTÁVEL (v1) com: ${modelName}`);

      // FORÇANDO A VERSÃO V1 EXPLICITAMENTE
      const model = this.ai.getGenerativeModel(
        { model: modelName },
        { apiVersion: 'v1' } // <--- ISSO OBRIGA A SAIR DO v1beta
      );

      this.chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: `Instruções: ${RULES}. Responda apenas: Olá! Sou seu Concierge Virtual. Qual seu nome completo?` }],
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
      console.error("Erro na inicialização:", e);
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
      const errorMsg = error.message || "";
      console.error("DETALHE DO ERRO:", errorMsg);
      
      // Se der 404 de novo, pula pro próximo modelo
      if ((errorMsg.includes("404") || errorMsg.includes("not found")) && this.modelIndex < MODELS.length - 1) {
        this.modelIndex++;
        this.initChat();
        return this.sendMessage(message);
      }
      return 'ERRO_CRITICO: Instabilidade técnica no motor do Google.';
    }
  }

  reset() {
    this.modelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
