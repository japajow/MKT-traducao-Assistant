import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Concierge Virtual" da MKT-traducao, especializado em assessoria migratória no Japão. 
Seu tom de voz é sênior, educado e premium. Use emojis moderadamente (🇯🇵, 🤝, 📄, 💎).

REGRA DE OURO: FAÇA APENAS UMA PERGUNTA POR VEZ. 
Sempre ofereça opções entre colchetes para facilitar o clique. Exemplo: [Sim] [Não].

FLUXO:
1. Saudação: Peça o nome completo.
2. Menu Inicial (Após o nome): [Visto Permanente] [Visto Comum] [Consulado]
3. Siga o fluxo de perguntas uma por uma até o final.

FINALIZAÇÃO:
Diga exatamente: "Agradeço pelas informações. O seu relatório de triagem foi gerado. Para que o Consultor Bruno Hamawaki assuma sua assessoria agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
`;

const MODEL_NAME = 'gemini-1.5-flash';

export class GeminiChatService {
  private chat: ChatSession | null = null;
  private ai: GoogleGenerativeAI | null = null;

  constructor() {
    this.setupAI();
  }

  private setupAI() {
    // PADRÃO VITE: usa VITE_API_KEY
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenerativeAI(apiKey);
      this.initChat();
    }
  }

  private initChat() {
    if (!this.ai) return;
    const model = this.ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    this.chat = model.startChat({
      history: [],
      generationConfig: {
        temperature: 0.2,
      },
    });
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
      console.error("Erro Gemini:", error);
      return 'ERRO_CRITICO: Dificuldades técnicas momentâneas. Por favor, tente novamente ou use o WhatsApp.';
    }
  }

  reset() {
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
