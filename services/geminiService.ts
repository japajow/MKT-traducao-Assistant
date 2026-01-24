import { GoogleGenAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao. Seu tom de voz é sênior, formal e breve.

REGRAS CRÍTICAS:
1. FAÇA APENAS UMA PERGUNTA POR VEZ.
2. NUNCA use listas numeradas (1, 2, 3) ou letras (A, B, C) para opções.
3. SEMPRE coloque as opções entre colchetes. Exemplo: [Sim] [Não] ou [Visto Permanente] [Consulado].
4. Se o usuário fugir do assunto, peça gentilmente para escolher uma das opções.

FLUXO PADRONIZADO:
Passo 1: Peça o Nome Completo.
Passo 2: Intenção: [Visto Permanente] [Visto Comum] [Consulado].
Passo 3: Serviço Específico dentro da escolha anterior.
Passo 4: Situação Atual (Validade de visto ou posse de documentos).
Passo 5: Província/Cidade de residência.
Passo 6: Finalização Padrão.

FINALIZAÇÃO:
Diga exatamente: "Agradeço pelas informações. O seu relatório de triagem foi gerado. Para que o Consultor Bruno Hamawaki assuma sua assessoria agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
`;

// Lista de modelos para fallback (se um falhar, tenta o outro)
const MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest'
];

export class GeminiChatService {
  private chat: ChatSession | null = null;
  private ai: GoogleGenAI | null = null;
  private modelIndex = 0;

  constructor() {
    this.initAI();
  }

  private initAI() {
    const key = import.meta.env.VITE_API_KEY;
    if (key) {
      this.ai = new GoogleGenAI(key);
      this.startNewChat();
    }
  }

  private startNewChat() {
    if (!this.ai) return;
    const model = this.ai.getGenerativeModel({
      model: MODELS[this.modelIndex],
      systemInstruction: SYSTEM_INSTRUCTION
    });
    this.chat = model.startChat({
      history: [],
      generationConfig: { temperature: 0.2 }
    });
  }

  async sendMessage(msg: string): Promise<string> {
    if (!this.chat) {
      this.initAI();
      if (!this.chat) return "ERRO_CRITICO: Chave de API não configurada.";
    }

    try {
      const result = await this.chat.sendMessage(msg);
      return result.response.text();
    } catch (err: any) {
      const errorMsg = err.message || "";
      // Se for erro de limite (429) ou servidor (500), tenta outro modelo
      if ((errorMsg.includes("429") || errorMsg.includes("500")) && this.modelIndex < MODELS.length - 1) {
        this.modelIndex++;
        this.startNewChat();
        return this.sendMessage(msg);
      }
      return "ERRO_CRITICO: Instabilidade técnica.";
    }
  }

  reset() {
    this.modelIndex = 0;
    this.startNewChat();
  }
}

export const geminiService = new GeminiChatService();
