import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao. Tom de voz sênior e formal.
REGRAS:
1. FAÇA APENAS UMA PERGUNTA POR VEZ.
2. SEMPRE coloque as opções entre colchetes. Exemplo: [Sim] [Não].
3. Aguarde a resposta do usuário antes de seguir.
`;

// Lista de modelos que você confirmou no AI Studio
const MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-002",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro-002"
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
      console.log(`🤖 Conectando ao modelo: ${modelName} (Versão estável v1)`);

      // A MUDANÇA ESTÁ AQUI: Forçamos a apiVersion para 'v1'
      const model = this.ai.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
      }, { apiVersion: 'v1' }); // <--- ISSO RESOLVE O ERRO 404 DO v1beta

      this.chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
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
      console.error("DETALHES DO ERRO:", error);

      // Se der erro 404 (Not Found), tenta o próximo modelo da lista
      if (error.message?.includes("404") || error.message?.includes("not found")) {
        if (this.modelIndex < MODELS.length - 1) {
          console.warn(`⚠️ O modelo ${MODELS[this.modelIndex]} não respondeu no v1. Tentando o próximo...`);
          this.modelIndex++;
          this.initChat();
          return this.sendMessage(message);
        }
      }

      return 'ERRO_CRITICO: Instabilidade técnica no Google Cloud.';
    }
  }

  reset() {
    this.modelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
