const RULES = `Você é o Virtual Concierge da MKT-traducao, consultoria sênior de vistos no Japão. 
Regras: 1. Uma pergunta por vez. 2. Opções entre colchetes [Sim] [Não]. 
Fluxo: Nome -> Intenção -> Serviço -> Situação -> Cidade.`;

// Usaremos os nomes EXATOS que você confirmou no seu painel
const MODELS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest"
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
      return "ERRO_CRITICO: Chave de API não configurada na Vercel.";
    }

    this.history.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    try {
      const modelName = MODELS[this.modelIndex];
      
      // MUDANÇA CRÍTICA: Usando v1beta explicitamente como o Google pediu no seu erro
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: this.history,
          // Movendo a instrução de sistema para o campo oficial do v1beta
          systemInstruction: {
            parts: [{ text: RULES }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Se o modelo "latest" falhar, tentamos o próximo modelo da lista
        if (data.error?.status === "NOT_FOUND" && this.modelIndex < MODELS.length - 1) {
            this.modelIndex++;
            return this.sendMessage(userMessage);
        }
        throw new Error(data.error?.message || "Erro desconhecido");
      }

      const botResponse = data.candidates[0].content.parts[0].text;

      this.history.push({
        role: "model",
        parts: [{ text: botResponse }]
      });

      return botResponse;

    } catch (error: any) {
      console.error("ERRO NO CONCIERGE:", error.message);
      return `ERRO_CRITICO: ${error.message}`;
    }
  }

  reset() {
    this.modelIndex = 0;
    this.history = []; // No v1beta com systemInstruction, o histórico começa vazio
  }
}

export const geminiService = new GeminiChatService();
