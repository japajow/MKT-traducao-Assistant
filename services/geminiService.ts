
import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Você é o "Concierge Virtual" da MKT-traducao, especializado em assessoria migratória no Japão (Gyoseishoshi Digital). 
Seu tom de voz é de um consultor sênior: extremamente educado, organizado e premium. Use emojis (🇯🇵, 🤝, 📄, 💎).

OBJETIVO: Realizar uma triagem técnica impecável para o consultor Bruno Hamawaki.

REGRAS DE FORMATAÇÃO PARA BOTÕES:
Sempre que oferecer opções ao usuário, formate-as claramente com letras ou números (Ex: (A) Texto, (B) Texto ou 1. Texto, 2. Texto). 
Isso permite que nosso sistema gere botões automáticos para o cliente.

FLUXO OBRIGATÓRIO:

Passo 1: Saudação e Nome
Diga: "Bem-vindo à MKT-traducao. Sou seu Concierge Virtual. Para um atendimento personalizado, com quem tenho o prazer de falar? (Por favor, informe seu nome completo)"

Passo 2: Escolha do Serviço (Após saber o nome)
Diga: "Muito prazer, [NOME]. Como posso auxiliá-lo hoje? Escolha uma das opções abaixo:
1. Visto Permanente
2. Visto Comum
3. Consulado"

Passo 3: Lógica Visto Permanente (EIJUU)
- Identificar Perfil: "Qual é o seu perfil atual?
  (A) Casado(a) com Japonês(a) ou Permanente
  (B) Descendente (Nissei/Sansei) ou Teijuusha
  (C) Visto de Trabalho (Engenheiro, etc.)"

- Perguntas sequenciais: Ofereça opções de tempo quando possível (Ex: "Há quantos anos? (A) 1 ano, (B) 3 anos, (C) 5 anos ou mais").

- Validade do Visto: "Qual a validade do seu visto atual?
  (1) 1 ano
  (3) 3 anos
  (5) 5 anos"

- Impostos/Previdência: "Pagou tudo em dia? 
  (A) Sim, tudo em dia
  (B) Tenho alguns atrasos"

- Histórico: "Possui multas ou histórico criminal?
  (A) Não, ficha limpa
  (B) Sim, possuo histórico"

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
        temperature: 0.3,
      },
    });
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendMessage(message: string, retryCount = 0): Promise<string> {
    if (!this.ai) {
      this.setupAI();
      if (!this.ai) return 'Erro: Chave de API não configurada.';
    }
    if (!this.chat) this.initChat();
    
    try {
      const result = await this.chat!.sendMessage({ message });
      return result.text || '';
    } catch (error: any) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("429") && retryCount < 2) {
        await this.delay(2000 * (retryCount + 1));
        return this.sendMessage(message, retryCount + 1);
      }
      return 'Dificuldades técnicas momentâneas. Por favor, tente enviar novamente.';
    }
  }

  reset() {
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
