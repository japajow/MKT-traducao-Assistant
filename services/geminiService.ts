
import { GoogleGenAI, Chat } from "@google/genai";

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

const MODEL_NAME = 'gemini-flash-lite-latest';

export class GeminiChatService {
  private chat: Chat | null = null;
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.setupAI();
  }

  private setupAI() {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.initChat();
    }
  }

  private initChat() {
    if (!this.ai) return;
    this.chat = this.ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Menor temperatura para evitar respostas misturadas
      },
    });
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendMessage(message: string, retryCount = 0): Promise<string> {
    if (!this.ai) {
      this.setupAI();
      if (!this.ai) return 'ERRO_CRITICO: Chave de API não configurada.';
    }
    if (!this.chat) this.initChat();

    try {
      const result = await this.chat!.sendMessage({ message });
      return result.text || '';
    } catch (error: any) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("429") && retryCount < 2) {
        await this.delay(2000);
        return this.sendMessage(message, retryCount + 1);
      }
      return 'ERRO_CRITICO: Dificuldades técnicas momentâneas. Por favor, tente enviar novamente ou fale diretamente com o consultor.';
    }
  }

  reset() {
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
