import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao. Seu tom de voz é sênior, formal e breve.

REGRAS CRÍTICAS:
1. FAÇA APENAS UMA PERGUNTA POR VEZ.
2. NUNCA use listas numeradas ou letras para opções.
3. SEMPRE coloque as opções entre colchetes. Exemplo: [Sim] [Não].
4. Se o usuário fugir do assunto, peça gentilmente para escolher uma das opções.

FLUXO PADRONIZADO:
Passo 1: Nome Completo.
Passo 2: Intenção: [Visto Permanente] [Visto Comum] [Consulado].
Passo 3: Serviço Específico dentro da escolha anterior.
Passo 4: Situação Atual.
Passo 5: Província/Cidade de residência.
Passo 6: Finalização.

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
