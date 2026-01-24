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
Passo 3: Perguntar o Serviço Específico dentro da escolha.
Passo 4: Perguntar a "Situação Atual".
Passo 5: Perguntar a Província/Cidade onde reside no Japão.
Passo 6: Finalização.

FINALIZAÇÃO:
Diga exatamente: "Agradeço pelas informações. O seu relatório de triagem foi gerado. Para que o Consultor Bruno Hamawaki assuma sua assessoria agora mesmo, por favor, clique no botão 'CONECTAR COM CONSULTOR' abaixo."
`;

// LISTA DE MODELOS POR ORDEM DE PRIORIDADE
const AVAILABLE_MODELS = [
  'gemini-1.5-flash-latest', // 1º: Mais rápido e estável
  'gemini-1.5-flash',        // 2º: Alternativa direta
  'gemini-1.5-pro-latest',   // 3º: Mais inteligente (porém mais lento/caro)
  'gemini-1.0-pro'           // 4º: Último recurso
];

export class GeminiChatService {
  private chat: Chat | null = null;
  private ai: GoogleGenAI | null = null;
  private currentModelIndex = 0; // Começa pelo primeiro da lista

  constructor() {
    this.setupAI();
  }

  private setupAI() {
    const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.initChat();
    }
  }

  private initChat() {
    if (!this.ai) return;
    
    // Pega o modelo baseado no índice atual
    const modelName = AVAILABLE_MODELS[this.currentModelIndex];
    console.log(`🤖 Iniciando chat com modelo: ${modelName}`);

    this.chat = this.ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendMessage(message: string): Promise<string> {
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
      
      // Se o erro for limite de cota (429) ou erro interno do servidor (500)
      if (errorMessage.includes("429") || errorMessage.includes("500") || errorMessage.includes("503")) {
        
        // Verifica se ainda temos modelos na lista para tentar
        if (this.currentModelIndex < AVAILABLE_MODELS.length - 1) {
          this.currentModelIndex++; // Pula para o próximo modelo
          console.warn(`⚠️ Limite atingido no modelo anterior. Trocando para: ${AVAILABLE_MODELS[this.currentModelIndex]}`);
          
          this.initChat(); // Reinicia o chat com o novo modelo
          await this.delay(1000); // Espera 1 segundo
          return this.sendMessage(message); // Tenta enviar a mensagem novamente
        }
      }

      // Se todos os modelos falharem, retorna o erro crítico que o App.tsx já sabe tratar
      console.error("❌ Todos os modelos falharam.");
      return 'ERRO_CRITICO: Instabilidade em todos os serviços de IA.';
    }
  }

  reset() {
    this.currentModelIndex = 0; // Volta para o modelo mais rápido no reset
    this.initChat();
  }
}

export const geminiService = new GeminiChatService();
