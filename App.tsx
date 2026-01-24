import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppStatus } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const CACHE_KEY = 'mkt_concierge_cache_v4';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isFinalized, setIsFinalized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ADMIN_PHONE = "817091225330";

  const parseOptions = (t: string) => {
    const matches = t.match(/\[([^\]]+)\]/g);
    return matches ? matches.map(m => m.replace(/[\[\]]/g, '')) : [];
  };

  const cleanText = (t: string) => t.replace(/\[([^\]]+)\]/g, '').trim();

  const saveState = (msgs: Message[], finalized: boolean, error: boolean) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      messages: msgs,
      isFinalized: finalized,
      hasError: error,
      timestamp: Date.now()
    }));
  };

  const handleReset = () => {
    localStorage.removeItem(CACHE_KEY);
    setMessages([]);
    setIsFinalized(false);
    setHasError(false);
    geminiService.reset();
    startApp();
  };

  const startApp = async () => {
    setStatus(AppStatus.LOADING);
    const res = await geminiService.sendMessage("Iniciando triagem premium.");
    const firstMsg: Message = { role: 'model', text: res, timestamp: new Date() };
    setMessages([firstMsg]);
    setStatus(AppStatus.IDLE);
    saveState([firstMsg], false, false);
  };

  useEffect(() => {
    const cache = localStorage.getItem(CACHE_KEY);
    if (cache) {
      try {
        const data = JSON.parse(cache);
        const restored = data.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(restored);
        setIsFinalized(data.isFinalized);
        setHasError(data.hasError);
      } catch (e) {
        handleReset();
      }
    } else {
      startApp();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const onSend = useCallback(async (override?: string) => {
    const text = (override || input).trim();
    if (!text || status === AppStatus.LOADING || hasError) return;

    if (text === "Nova Dúvida") {
      handleReset();
      return;
    }

    const userMsg: Message = { role: 'user', text, timestamp: new Date() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setStatus(AppStatus.LOADING);

    const res = await geminiService.sendMessage(text);

    if (res.startsWith("ERRO_CRITICO")) {
      setHasError(true);
      const errModel: Message = { 
        role: 'model', 
        text: "⚠️ Ocorreu uma instabilidade técnica. Vamos continuar pelo WhatsApp para sua comodidade?", 
        timestamp: new Date() 
      };
      setMessages([...history, errModel]);
      saveState([...history, errModel], false, true);
    } else {
      const finalized = isFinalized || res.includes("CONECTAR COM CONSULTOR");
      const modelMsg: Message = { role: 'model', text: res, timestamp: new Date() };
      setMessages([...history, modelMsg]);
      setIsFinalized(finalized);
      saveState([...history, modelMsg], finalized, false);
    }
    setStatus(AppStatus.IDLE);
  }, [input, status, messages, isFinalized, hasError]);

  const currentOptions = messages.length > 0 && messages[messages.length - 1].role === 'model' 
    ? parseOptions(messages[messages.length - 1].text) : [];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-4 flex items-center justify-between shrink-0 z-20 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="gold-gradient w-9 h-9 rounded-full flex items-center justify-center text-[#0f172a]">
            <i className="fa-solid fa-crown text-xs"></i>
          </div>
          <div>
            <h1 className="text-white font-serif text-base font-bold tracking-tight">MKT Concierge</h1>
            <p className="text-[#c5a572] text-[8px] uppercase tracking-[3px] font-black opacity-80">Premium Assistant</p>
          </div>
        </div>
        <button onClick={handleReset} className="text-[#c5a572] hover:bg-white/10 p-2 rounded-full transition-all">
          <i className="fa-solid fa-rotate-right text-sm"></i>
        </button>
      </header>

      <main className="flex-1 overflow-hidden bg-[#f8fafc] relative">
        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6 space-y-6 no-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className="animate-fade-in">
              <ChatMessage message={{ ...msg, text: msg.role === 'model' ? cleanText(msg.text) : msg.text }} />
            </div>
          ))}

          {!hasError && status === AppStatus.IDLE && currentOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 px-1 ml-10">
              {currentOptions.map((opt, i) => (
                <button key={i} onClick={() => onSend(opt)} className="bg-white border-2 border-[#c5a572]/30 text-[#0f172a] text-[12px] font-bold px-5 py-2.5 rounded-full shadow-md hover:bg-[#0f172a] hover:text-[#c5a572] transition-all active:scale-95">
                  {opt}
                </button>
              ))}
            </div>
          )}

          {status === AppStatus.LOADING && (
            <div className="flex justify-start space-x-2 bg-white w-14 px-4 py-3.5 rounded-2xl border border-slate-100 shadow-sm ml-10">
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      <div className={`px-4 bg-white transition-all duration-500 overflow-hidden ${(isFinalized || hasError) ? 'max-h-40 py-4 border-t' : 'max-h-0'}`}>
        <button onClick={() => {
          const summary = messages.filter(m => m.role === 'user').map(m => `*R:* ${m.text}`).join('\n');
          window.open(`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent("*MKT TRADUÇÃO - TRIAGEM*\n\n" + summary)}`, '_blank');
        }} className={`w-full ${hasError ? 'bg-green-600' : 'gold-gradient'} text-[#0f172a] font-black py-4 rounded-2xl flex items-center justify-center space-x-3 shadow-xl uppercase text-[11px] tracking-widest`}>
          <i className="fa-brands fa-whatsapp text-xl text-[#0f172a]"></i>
          <span>{hasError ? 'Atendimento no WhatsApp' : 'Conectar com Bruno Hamawaki'}</span>
        </button>
      </div>

      <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="flex items-center bg-slate-100 rounded-2xl px-4 py-1.5 border border-transparent focus-within:border-[#c5a572]/40 transition-all shadow-inner">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasError ? "Erro técnico. Use o WhatsApp." : isFinalized ? "Triagem concluída." : "Digite sua mensagem..."}
            disabled={status === AppStatus.LOADING || isFinalized || hasError}
            className="flex-1 py-3 bg-transparent text-sm text-[#0f172a] outline-none"
          />
          <button type="submit" disabled={!input.trim() || status === AppStatus.LOADING || isFinalized || hasError} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-[#0f172a] text-[#c5a572] disabled:opacity-10 shadow-lg">
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
