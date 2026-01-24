import { GoogleGenAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao. Seu tom de voz é de alta costura: formal, breve e impecável.

REGRAS CRÍTICAS:
1. FAÇA APENAS UMA PERGUNTA POR VEZ.
2. SEMPRE coloque as opções entre colchetes. Exemplo: [Sim] [Não].
3. Se o usuário digitar algo fora das opções, peça gentilmente para escolher uma.

FLUXO PADRONIZADO:
Passo 1: Nome Completo.
Passo 2: Intenção: [Visto Permanente] [Visto Comum] [Consulado].
Passo 3: Serviço Específico.
Passo 4: Situação Atual.
Passo 5: Cidade no Japão.
Passo 6: Finalização com a frase: CONECTAR COM CONSULTOR.

FINALIZAÇÃO:
Diga exatamente: "Agradeço pelas informações. O seu relatório de triagem foi gerado. Para que o Consultor Bruno Hamawaki assuma sua assessoria agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
`;

const MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export class GeminiChatService {
  private chat: ChatSession | null = null;
  private ai: GoogleGenAI | null = null;
  private modelIndex = 0;

  constructor() {
    this.setupAI();
  }

  private setupAI() {
    // Para VITE e VERCEL, usamos import.meta.env
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI(apiKey);
      this.initChat();
    }
  }

  private initChat() {
    if (!this.ai) return;
    const model = this.ai.getGenerativeModel({
      model: MODELS[this.modelIndex],
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    this.chat = model.startChat({
      history: [],
      generationConfig: { temperature: 0.2 },
    });
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
      const msg = error.message || "";
      if ((msg.includes("429") || msg.includes("500")) && this.modelIndex < MODELS.length - 1) {
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
