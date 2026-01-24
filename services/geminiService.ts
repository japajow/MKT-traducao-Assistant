import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao. Seu tom de voz é de alta costura: formal, breve e impecável.

REGRAS CRÍTICAS:
1. NUNCA faça duas perguntas ao mesmo tempo.
2. SEMPRE coloque as opções entre colchetes. Exemplo: [Sim] [Não] ou [Visto Permanente] [Consulado].
3. Se o usuário digitar algo fora das opções, peça gentilmente para escolher uma.

FLUXO: Nome Completo -> Intenção -> Serviço -> Situação -> Cidade -> Finalização.

FINALIZAÇÃO:
Diga exatamente: "Agradeço pelas informações. O seu relatório de triagem foi gerado. Para que o Consultor Bruno Hamawaki assuma sua assessoria agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
`;

const AVAILABLE_MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest'
];

export class GeminiChatService {
  private chat: ChatSession | null = null;
  private ai: GoogleGenerativeAI | null = null;
  private currentModelIndex = 0;

  constructor() {
    this.setupAI();
  }

  private setupAI() {
    // Vite usa import.meta.env
    const apiKey = import.meta.env.VITE_API_KEY;
    
    if (apiKey) {
      // CORREÇÃO: GoogleGenerativeAI recebe a string direto, não um objeto
      this.ai = new GoogleGenerativeAI(apiKey);
      this.initChat();
    } else {
      console.error("VITE_API_KEY não encontrada!");
    }
  }

  private initChat() {
    if (!this.ai) return;
    
    const modelName = AVAILABLE_MODELS[this.currentModelIndex];
    console.log(`🤖 Iniciando modelo: ${modelName}`);

    try {
      // CORREÇÃO: Forçando a apiVersion para 'v1' para evitar o erro 404 do v1beta
      const model = this.ai.getGenerativeModel(
        { model: modelName, systemInstruction: SYSTEM_INSTRUCTION },
        { apiVersion: 'v1' }
      );

      this.chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      });
    } catch (e) {
      console.error("Erro ao iniciar chat:", e);
    }
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.ai || !this.chat) {
      this.setupAI();
      if (!this.ai) return 'ERRO_CRITICO: Chave de API não configurada no Vercel.';
    }

    try {
      const result = await this.chat!.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      const msg = error.message || "";
      console.error("Erro na API:", msg);
      
      // Se for erro de limite ou modelo não encontrado, tenta o próximo
      if ((msg.includes("429") || msg.includes("404") || msg.includes("500")) && this.currentModelIndex < AVAILABLE_MODELS.length - 1) {
        this.currentModelIndex++;
        this.initChat();
        return this.sendMessage(message);
      }

      return 'ERRO_CRITICO: Instabilidade técnica nos serviços de IA.';
    }
  }

  reset() {
    this.currentModelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
