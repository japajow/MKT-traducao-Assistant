import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao, consultoria sênior de vistos no Japão.
TOM DE VOZ: Formal, breve e luxuoso.
REGRAS: 
1. Faça apenas UMA pergunta por vez. 
2. Use colchetes para opções: [Sim] [Não].
`;

// Lista de modelos na ordem de tentativa (VERSÃO ESTÁVEL v1)
const MODELS = [
  "gemini-1.5-flash", 
  "gemini-1.5-pro",
  "gemini-1.0-pro"
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
      // Inicializamos a IA sem passar a versão aqui
      this.ai = new GoogleGenerativeAI(apiKey);
      this.initChat();
    }
  }

  private initChat() {
    if (!this.ai) return;

    try {
      const modelName = MODELS[this.modelIndex];
      console.log(`🚀 Conectando ao Google v1 (Estável) - Modelo: ${modelName}`);

      // FORÇAMENTO EXPLÍCITO DA VERSÃO v1
      // Passamos a versão v1 como segundo argumento para ignorar o v1beta
      const model = this.ai.getGenerativeModel(
        { model: modelName, systemInstruction: SYSTEM_INSTRUCTION },
        { apiVersion: 'v1' } 
      );

      this.chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          maxOutputTokens: 1000,
        },
      });
    } catch (e) {
      console.error("Erro ao configurar chat:", e);
    }
  }

  async sendMessage(message: string): Promise<string> {
    // Diagnóstico rápido
    if (!import.meta.env.VITE_API_KEY) return 'ERRO_CRITICO: Chave VITE_API_KEY não encontrada no Vercel.';

    if (!this.ai || !this.chat) {
      this.setupAI();
      if (!this.ai) return 'ERRO_CRITICO: Falha na inicialização da IA.';
    }

    try {
      const result = await this.chat!.sendMessage(message);
      const response = await result.response;
      return response.text();

    } catch (error: any) {
      const msg = error.message || "";
      console.error("DETALHES DO ERRO GOOGLE:", msg);

      // Se der 404 (Not Found) mesmo no v1, tentamos o próximo modelo
      if (msg.includes("404") || msg.includes("not found")) {
        if (this.modelIndex < MODELS.length - 1) {
          this.modelIndex++;
          this.initChat();
          return this.sendMessage(message);
        }
      }

      // Erro de Cota ou Região
      if (msg.includes("429")) return 'ERRO_CRITICO: Muitas mensagens. Aguarde 1 minuto.';
      if (msg.includes("location")) return 'ERRO_CRITICO: O Google não atende a região deste servidor.';

      return 'ERRO_CRITICO: Instabilidade técnica no motor do Google.';
    }
  }

  reset() {
    this.modelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
