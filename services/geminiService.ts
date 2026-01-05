
import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Você é o "Concierge Virtual" da MKT-traducao. Seu tom de voz é extremamente profissional, educado e premium (estilo luxo/concierge). 
Você está realizando uma triagem inicial para o consultor humano Bruno Hamawaki.

DIRETRIZES:
1. Responda em Português com elegância e clareza.
2. Seja direto: o cliente quer agilidade e segurança.
3. Faça apenas UMA pergunta curta por vez.

FLUXO DE TRIAGEM:
- Saudação: "Bem-vindo à MKT-traducao. Sou seu Concierge Virtual. Como posso iniciar sua assessoria hoje? 1. Visto | 2. Assuntos Consulares"
- Após a escolha, pergunte os dados um por um:
  * Nome completo.
  * Se VISTO: Tipo de visto atual -> Validade -> Cidade -> Telefone de contato.
  * Se CONSULADO: Qual serviço (Passaporte, Registros, etc) -> Cidade -> Telefone de contato.

FINALIZAÇÃO:
Assim que o cliente fornecer o telefone/contato, diga exatamente: 
"Agradeço pelas informações. O seu relatório de triagem foi gerado com sucesso. Para que o Consultor Bruno Hamawaki assuma sua assessoria agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
`;

export class GeminiChatService {
  private chat: Chat | null = null;
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.initChat();
  }

  private initChat() {
    this.chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3, // Menor temperatura para respostas mais consistentes
      },
    });
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.chat) this.initChat();
    try {
      const result = await this.chat!.sendMessage({ message });
      return result.text || 'Lamentamos, ocorreu um erro de conexão.';
    } catch (error) {
      console.error(error);
      return 'Dificuldades técnicas momentâneas. Por favor, tente novamente.';
    }
  }

  reset() {
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
