import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao. Seu tom de voz é sênior, formal e breve.
FAÇA APENAS UMA PERGUNTA POR VEZ. Sempre coloque as opções entre colchetes. Exemplo: [Sim] [Não].
`;

// Lista de modelos atualizada (testando versões estáveis primeiro)
const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-pro'
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
      // Inicialização robusta
      this.ai = new GoogleGenerativeAI(apiKey);
      this.initChat();
    }
  }

  private initChat() {
    if (!this.ai) return;
    try {
      const model = this.ai.getGenerativeModel({
        model: MODELS[this.modelIndex],
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      this.chat = model.startChat({
        history: [],
        generationConfig: { 
          temperature: 0.7, // Aumentado levemente para evitar travamentos
          maxOutputTokens: 500 
        },
      });
    } catch (e) {
      console.error("Erro ao inicializar o modelo:", MODELS[this.modelIndex], e);
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
      const text = response.text();
      
      if (!text) throw new Error("Resposta vazia da IA");
      return text;

    } catch (error: any) {
      // ESTE LOG É IMPORTANTE: Veja o erro no Console do Navegador (F12)
      console.error("ERRO DETALHADO DO GEMINI:", error);

      const errorStatus = error?.status || "";
      const errorMsg = error?.message || "";

      // Se for erro de cota (429) ou erro de modelo, tenta o próximo
      if ((errorMsg.includes("429") || errorMsg.includes("not found") || errorMsg.includes("500")) && this.modelIndex < MODELS.length - 1) {
        console.warn("Tentando próximo modelo...");
        this.modelIndex++;
        this.initChat();
        return this.sendMessage(message);
      }

      // Se for erro de segurança ou região (403/Forbidden)
      if (errorMsg.includes("403") || errorMsg.includes("location")) {
        return 'ERRO_CRITICO: Este serviço de IA não está disponível na sua região ou a chave está bloqueada.';
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
