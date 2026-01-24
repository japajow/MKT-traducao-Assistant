const RULES = `Instruções de Sistema: Você é o Concierge da MKT-traducao. 
1. Responda de forma breve e formal. 
2. Faça apenas UMA pergunta por vez. 
3. Use colchetes para opções: [Sim] [Não]. 
4. Siga o fluxo: Nome -> Intenção -> Serviço -> Situação -> Cidade.`;

export class GeminiChatService {
  private history: any[] = [];

  constructor() {
    this.reset();
  }

  async sendMessage(userMessage: string): Promise<string> {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) return "ERRO: Chave de API ausente na Vercel.";

    // Adiciona a fala do usuário ao histórico
    this.history.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    try {
      // URL ESTÁVEL V1
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: this.history, // Enviamos apenas o histórico (sem o campo systemInstruction que causa o erro 400)
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Erro desconhecido");
      }

      const botResponse = data.candidates[0].content.parts[0].text;

      // Salva a resposta da IA no histórico
      this.history.push({
        role: "model",
        parts: [{ text: botResponse }]
      });

      return botResponse;

    } catch (error: any) {
      console.error("FALHA NO MOTOR:", error.message);
      return `ERRO_CRITICO: ${error.message}`;
    }
  }

  reset() {
    // Iniciamos o histórico com as REGRAS injetadas como uma conversa prévia
    // Isso garante que a IA siga as regras sem precisar do campo proibido
    this.history = [
      {
        role: "user",
        parts: [{ text: RULES + " Responda apenas: 'Olá! Sou seu Concierge Virtual. Qual seu nome completo?'" }]
      },
      {
        role: "model",
        parts: [{ text: "Olá! Sou seu Concierge Virtual. Qual seu nome completo?" }]
      }
    ];
  }
}

export const geminiService = new GeminiChatService();
