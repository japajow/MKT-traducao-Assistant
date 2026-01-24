import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppStatus } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

// --- FUNÇÕES AUXILIARES (DEFINIDAS FORA DO COMPONENTE PARA EVITAR ERROS) ---
const parseOptions = (text: string) => {
  const options: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    options.push(match[1].trim());
  }
  return options;
};

const cleanText = (text: string) => {
  // Remove o conteúdo entre colchetes e os próprios colchetes para o usuário não ver
  return text.replace(/\[([^\]]+)\]/g, '').trim();
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isFinalized, setIsFinalized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ADMIN_PHONE = "817091225330";

  const initChat = async () => {
    setStatus(AppStatus.LOADING);
    const response = await geminiService.sendMessage("Iniciando triagem premium.");
    setMessages([{ role: 'model', text: response, timestamp: new Date() }]);
    setStatus(AppStatus.IDLE);
  };

  useEffect(() => { initChat(); }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || status === AppStatus.LOADING) return;

    setHasError(false);
    const userMsg: Message = { role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus(AppStatus.LOADING);

    const response = await geminiService.sendMessage(textToSend);

    if (response.startsWith("ERRO_CRITICO")) {
      setHasError(true);
      const cleanError = response.replace("ERRO_CRITICO: ", "");
      const modelMsg: Message = { role: 'model', text: cleanError, timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
    } else {
      const modelMsg: Message = { role: 'model', text: response, timestamp: new Date() };
      if (response.includes("CONECTAR COM CONSULTOR")) {
        setIsFinalized(true);
      }
      setMessages(prev => [...prev, modelMsg]);
    }

    setStatus(AppStatus.IDLE);
  }, [input, status]);

  // Pega as opções da última mensagem do robô
  const currentOptions = messages.length > 0 && messages[messages.length - 1].role === 'model'
    ? parseOptions(messages[messages.length - 1].text)
    : [];

  const openWhatsApp = () => {
    let summary = `*MKT TRADUCAO - SOLICITACAO PREMIUM*\n`;
    summary += `------------------------------------\n`;
    messages.forEach((msg) => {
      if (msg.role === 'user') summary += `*R:* ${msg.text}\n`;
    });
    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="gold-gradient w-9 h-9 rounded-full flex items-center justify-center text-[#0f172a]">
            <i className="fa-solid fa-crown text-sm"></i>
          </div>
          <div>
            <h1 className="text-white font-serif text-base font-bold">MKT-traducao</h1>
            <p className="text-[#c5a572] text-[8px] uppercase tracking-widest font-bold">Virtual Concierge</p>
          </div>
        </div>
        <button onClick={() => { geminiService.reset(); setMessages([]); setIsFinalized(false); setHasError(false); initChat(); }} className="text-[#c5a572] hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
        </button>
      </header>

      <main className="flex-1 overflow-hidden relative bg-[#fcfcfc]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-3 py-6 space-y-4 no-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className="message-appear">
              <ChatMessage
                message={{
                  ...msg,
                  text: msg.role === 'model' ? cleanText(msg.text) : msg.text
                }}
              />
            </div>
          ))}

          {/* BOTÕES DE OPÇÃO */}
          {!isFinalized && !hasError && status === AppStatus.IDLE && currentOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 px-1 animate-fade-in ml-10">
              {currentOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(opt)}
                  className="bg-white border-2 border-[#c5a572]/40 text-[#0f172a] text-[12px] font-bold px-5 py-2.5 rounded-full shadow-md hover:bg-[#0f172a] hover:text-[#c5a572] hover:border-[#0f172a] transition-all transform active:scale-95"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {status === AppStatus.LOADING && (
            <div className="flex justify-start items-center space-x-1.5 bg-white w-12 px-3 py-3 rounded-xl rounded-tl-none border border-slate-200 shadow-sm ml-10">
              <div className="w-1 h-1 bg-[#c5a572] rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1 h-1 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      <div className={`px-4 transition-all duration-500 ${(isFinalized || hasError) ? 'max-h-32 py-4 border-t bg-white' : 'max-h-0 py-0 overflow-hidden'}`}>
        <button onClick={openWhatsApp} className={`w-full ${hasError ? 'bg-green-600' : 'gold-gradient'} text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all`}>
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span className="uppercase tracking-wider text-[11px]">Falar com Bruno Hamawaki</span>
        </button>
      </div>

      <footer className="p-3.5 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center bg-slate-50 rounded-xl px-4 py-1 border border-slate-200 focus-within:border-[#c5a572] transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={(isFinalized || hasError) ? "Atendimento via WhatsApp." : "Escreva aqui..."}
            disabled={status === AppStatus.LOADING || isFinalized || hasError}
            className="flex-1 py-2 bg-transparent text-sm text-[#0f172a] outline-none"
          />
          <button type="submit" disabled={!input.trim() || status === AppStatus.LOADING || isFinalized || hasError} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${!input.trim() || status === AppStatus.LOADING || isFinalized || hasError ? 'text-slate-300' : 'bg-[#0f172a] text-[#c5a572]'}`}>
            <i className="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
