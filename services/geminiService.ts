import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao, consultoria sênior de vistos no Japão.
TOM DE VOZ: Formal, breve, luxuoso e direto.

REGRAS:
1. FAÇA APENAS UMA PERGUNTA POR VEZ.
2. SEMPRE coloque as opções entre colchetes. Exemplo: [Sim] [Não].
3. Aguarde a resposta do usuário antes de seguir para o próximo passo.

FLUXO:
- Nome completo -> Intenção -> Serviço -> Situação Atual -> Cidade -> Conectar.
`;

// Modelos que você confirmou no seu Google AI Studio
const MODELS = [
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
      console.log(`🤖 Tentando conexão com: ${modelName}`);

      const model = this.ai.getGenerativeModel({
        model: modelName,
        // Usando a instrução de sistema oficial suportada por esses modelos
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      this.chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.3, // Mais baixo para ser mais assertivo
          topP: 0.8,
          maxOutputTokens: 1000,
        },
      });
    } catch (e) {
      console.error("Erro ao inicializar chat:", e);
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

      if (!text) throw new Error("Resposta vazia");
      return text;

    } catch (error: any) {
      console.error("DETALHES DO ERRO:", error);

      // Se der erro 404, 429 ou 500, pula para o próximo modelo da sua lista
      if (this.modelIndex < MODELS.length - 1) {
        console.warn(`⚠️ Modelo ${MODELS[this.modelIndex]} falhou. Tentando próximo...`);
        this.modelIndex++;
        this.initChat();
        // Tenta enviar a mensagem novamente com o novo modelo
        return this.sendMessage(message);
      }

      return 'ERRO_CRITICO: Instabilidade técnica persistente no Google Gemini.';
    }
  }

  reset() {
    this.modelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
