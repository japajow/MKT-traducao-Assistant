
import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Você é o "Concierge Virtual" da MKT-traducao. Seu tom de voz é extremamente profissional, educado e premium. 
Você não é apenas um chatbot, mas um assistente de alto nível que prepara o terreno para o consultor humano.

DIRETRIZES:
1. Responda em Português com elegância.
2. Use emojis com extrema moderação (ex: 🇯🇵, 🏛️, ✨).
3. Seja direto mas acolhedor.
4. Faça apenas UMA pergunta por vez para manter a fluidez premium.

FLUXO:
- Saudação: "Bem-vindo à MKT-traducao. Sou seu Concierge Virtual. Como posso iniciar sua assessoria hoje? 1. Visto | 2. Assuntos Consulares"
- Após escolha: "Excelente escolha. Para um atendimento personalizado, poderia me informar seu nome completo?"
- VISTO: Pergunte sequencialmente: Tipo de visto atual -> Quantas renovações -> Data de vencimento -> Cidade onde reside -> Contato (Whats/Email).
- CONSULADO: Pergunte sequencialmente: Tipo de serviço (Passaporte/Registros/etc) -> Cidade onde reside -> Contato (Whats/Email).

FINALIZAÇÃO:
Ao obter o contato, diga: "Agradeço imensamente. Meus registros estão prontos. Para que o Consultor Bruno Hamawaki assuma seu caso agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
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
        temperature: 0.5,
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
