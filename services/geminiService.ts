import { GoogleGenAI, ChatSession } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
Você é o "Virtual Concierge" da MKT-traducao. Seu tom de voz é de alta costura: formal, breve e impecável.

REGRAS CRÍTICAS:
1. NUNCA faça duas perguntas ao mesmo tempo.
2. NUNCA use (A), (B) ou 1. para opções.
3. SEMPRE que houver opções de escolha, coloque-as entre colchetes. Exemplo: [Sim] [Não] ou [Visto Permanente] [Consulado].
4. Se o usuário digitar algo que não seja uma das opções quando elas forem oferecidas, peça gentilmente para ele escolher uma das opções.

FLUXO PADRONIZADO PARA TODOS OS SERVIÇOS:
Passo 1: Saudação e pedir Nome Completo.
Passo 2: Perguntar qual a intenção principal: [Visto Permanente] [Visto Comum] [Consulado].
Passo 3: Perguntar o Serviço Específico dentro da escolha:
   - Se Permanente: [Cônjuge de Japonês] [Descendente] [Trabalho/Longa Permanência]
   - Se Comum: [Renovação de Visto] [Troca de Categoria] [Certificado de Elegibilidade]
   - Se Consulado: [Passaporte] [Registro Civil] [Procuração/Outros]
Passo 4: Perguntar a "Situação Atual":
   - Se Visto: [Tenho 1 ano] [Tenho 3 anos] [Tenho 5 anos]
   - Se Consulado: [Já tenho os documentos] [Não sei quais documentos preciso]
Passo 5: Perguntar a Província/Cidade onde reside no Japão.
Passo 6: Finalização.

FINALIZAÇÃO:
Diga exatamente: "Agradeço pelas informações. O seu relatório de triagem foi gerado. Para que o Consultor Bruno Hamawaki assuma sua assessoria agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
`;

const AVAILABLE_MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.0-pro'
];

export class GeminiChatService {
  private chat: ChatSession | null = null;
  private ai: GoogleGenAI | null = null;
  private currentModelIndex = 0;

  constructor() {
    this.setupAI();
  }

  private setupAI() {
    // Busca a chave de API (VITE_API_KEY para ambiente Vite)
    const apiKey = import.meta.env.VITE_API_KEY;
    
    if (apiKey) {
      this.ai = new GoogleGenAI(apiKey);
      this.initChat();
    } else {
      console.error("API_KEY não configurada no ambiente.");
    }
  }

  private initChat() {
    if (!this.ai) return;
    
    const modelName = AVAILABLE_MODELS[this.currentModelIndex];
    console.log(`Tentando usar o modelo: ${modelName}`);

    const model = this.ai.getGenerativeModel({
      model: modelName,
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
      if (!this.ai) return 'ERRO_CRITICO: Chave de API ausente.';
    }

    try {
      const result = await this.chat!.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      const errorMessage = error.message || "";
      
      // Se atingir o limite (429) ou erro de servidor, troca o modelo
      if (errorMessage.includes("429") || errorMessage.includes("500") || errorMessage.includes("fetch")) {
        if (this.currentModelIndex < AVAILABLE_MODELS.length - 1) {
          this.currentModelIndex++;
          this.initChat();
          return this.sendMessage(message); // Tenta novamente com novo modelo
        }
      }
      return 'ERRO_CRITICO: Instabilidade técnica momentânea.';
    }
  }

  reset() {
    this.currentModelIndex = 0;
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
