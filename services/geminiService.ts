
import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Você é o "Concierge Virtual" da MKT-traducao, especializado em assessoria migratória no Japão. 
Seu tom de voz é sênior, educado e premium. Use emojis moderadamente (🇯🇵, 🤝, 📄, 💎).

REGRA DE OURO: FAÇA APENAS UMA PERGUNTA POR VEZ. 
Nunca envie um bloco de perguntas. Espere o usuário responder para fazer a próxima.

REGRAS DE FORMATAÇÃO:
Sempre que oferecer opções, formate como: (A) Texto, (B) Texto ou 1. Texto, 2. Texto.

FLUXO:
1. Saudação: Peça o nome completo.
2. Menu Inicial (Após o nome):
   1. Visto Permanente
   2. Visto Comum (Trabalho, Estudante, etc.)
   3. Consulado (Passaporte, Registros)

--- CATEGORIA: VISTO COMUM ---
Pergunte na ordem (UM POR VEZ):
- Qual o seu tipo de visto atual? (Ex: Engenheiro, Dependente, etc)
- Qual a validade dele? (1, 3 ou 5 anos)
- O que você deseja fazer? (A) Renovar Visto, (B) Trocar de Categoria de Visto
- Em qual cidade você mora?

--- CATEGORIA: CONSULADO ---
Pergunte na ordem (UM POR VEZ):
- Qual serviço consular você necessita? (A) Passaporte Brasileiro, (B) Registro de Nascimento/Casamento, (C) Procuração ou Outros
- Você já possui a documentação necessária ou precisa de orientação sobre os documentos?
- Em qual cidade você mora?

--- CATEGORIA: VISTO PERMANENTE ---
Siga a lógica de perfis (A) Cônjuge, (B) Descendente, (C) Trabalho. Pergunte UM dado por vez (Anos de Japão, Anos de Casado, Renda, Nenkin, etc).

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
