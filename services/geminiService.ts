const RULES = `Você é o Concierge da MKT-traducao. Responda brevemente. Uma pergunta por vez. Opções em colchetes [Sim] [Não].`;

export class GeminiChatService {
  private history: any[] = [];

  constructor() {
    this.reset();
  }

  async sendMessage(userMessage: string): Promise<string> {
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey) return "ERRO: Configure a VITE_API_KEY na Vercel.";

    this.history.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    try {
      // USANDO v1 (ESTÁVEL) e o modelo padrão absoluto
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: this.history,
          systemInstruction: {
            parts: [{ text: RULES }]
          },
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 800,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Se der 404 aqui, a chave está sem permissão no Google Cloud
        if (response.status === 404) {
            return "ERRO_CRITICO: O Google não reconheceu este modelo. Verifique se a API Generativa está ativa no seu console do Google Cloud.";
        }
        throw new Error(data.error?.message || "Erro na API");
      }

      const botResponse = data.candidates[0].content.parts[0].text;

      this.history.push({
        role: "model",
        parts: [{ text: botResponse }]
      });

      return botResponse;

    } catch (error: any) {
      console.error("FALHA:", error.message);
      return `ERRO_CRITICO: ${error.message}`;
    }
  }

  reset() {
    this.history = [];
  }
}

export const geminiService = new GeminiChatService();
