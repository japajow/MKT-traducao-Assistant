const RULES = `Você é o Virtual Concierge da MKT-traducao. 
Regras: 1. Uma pergunta por vez. 2. Opções entre colchetes [Sim] [Não]. 
Fluxo: Nome -> Intenção -> Serviço -> Situação -> Cidade.`;

const MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

export class GeminiChatService {
  private history: any[] = [];
  private modelIndex = 0;

  constructor() {
    this.reset();
  }

  async sendMessage(userMessage: string): Promise<string> {
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey) {
      return "ERRO_CRITICO: Chave de API (VITE_API_KEY) não configurada na Vercel.";
    }

    // Adiciona a mensagem do usuário ao histórico
    this.history.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    try {
      const modelName = MODELS[this.modelIndex];
      // URL DIRETA DA API ESTÁVEL V1
      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: this.history,
          generationConfig: {
            temperature: 0.4,
            topP: 0.8,
            maxOutputTokens: 1000,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Erro na resposta do Google");
      }

      const botResponse = data.candidates[0].content.parts[0].text;

      // Adiciona a resposta do bot ao histórico para manter o contexto
      this.history.push({
        role: "model",
        parts: [{ text: botResponse }]
      });

      return botResponse;

    } catch (error: any) {
      console.error("ERRO NA API DIRETA:", error.message);

      // Se der erro 404 (Modelo não encontrado) ou 429 (Cota), tenta o próximo modelo
      if ((error.message.includes("404") || error.message.includes("429")) && this.modelIndex < MODELS.length - 1) {
        console.warn(`Tentando próximo modelo devido a erro: ${error.message}`);
        this.modelIndex++;
        return this.sendMessage(userMessage);
      }

      return `ERRO_CRITICO: ${error.message}`;
    }
  }

  reset() {
    this.modelIndex = 0;
    // Reinicia o histórico com as regras de negócio
    this.history = [
      {
        role: "user",
        parts: [{ text: `Instruções de Sistema: ${RULES}. Responda apenas: Olá! Sou seu Concierge Virtual. Qual seu nome completo?` }]
      },
      {
        role: "model",
        parts: [{ text: "Olá! Sou seu Concierge Virtual. Qual seu nome completo?" }]
      }
    ];
  }
}

export const geminiService = new GeminiChatService();
