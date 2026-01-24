import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppStatus } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const STORAGE_KEY = 'mkt_cache_v10';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isFinalized, setIsFinalized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ADMIN_PHONE = "817091225330";

  // Utilitários para limpar texto e pegar opções
  const parseOptions = (text: string) => {
    const options: string[] = [];
    const regex = /\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      options.push(match[1].trim());
    }
    return options;
  };

  const cleanText = (text: string) => text.replace(/\[([^\]]+)\]/g, '').trim();

  const initChat = async () => {
    setStatus(AppStatus.LOADING);
    const response = await geminiService.sendMessage("Iniciando triagem premium.");
    setMessages([{ role: 'model', text: response, timestamp: new Date() }]);
    setStatus(AppStatus.IDLE);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        setIsFinalized(parsed.isFinalized);
      } catch (e) { initChat(); }
    } else {
      initChat();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, isFinalized }));
    }
  }, [messages, isFinalized]);

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
    } else {
      if (response.includes("CONECTAR COM CONSULTOR")) setIsFinalized(true);
      const modelMsg: Message = { role: 'model', text: response, timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
    }
    setStatus(AppStatus.IDLE);
  }, [input, status, messages, isFinalized]);

  const currentOptions = messages.length > 0 && messages[messages.length - 1].role === 'model' 
    ? parseOptions(messages[messages.length - 1].text) 
    : [];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200 font-sans">
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-4 flex items-center justify-between shrink-0 shadow-xl z-10">
        <div className="flex items-center space-x-3">
          <div className="gold-gradient w-9 h-9 rounded-full flex items-center justify-center text-[#0f172a] shadow-lg">
            <i className="fa-solid fa-crown text-sm"></i>
          </div>
          <div>
            <h1 className="text-white font-serif text-base font-bold">MKT Concierge</h1>
            <p className="text-[#c5a572] text-[8px] uppercase tracking-[2px] font-black">Virtual Assistant</p>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} className="text-[#c5a572] hover:text-white p-2">
          <i className="fa-solid fa-rotate-right text-xs"></i>
        </button>
      </header>

      <main className="flex-1 overflow-hidden relative bg-[#fcfcfc]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6 space-y-6 no-scrollbar">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={{...msg, text: msg.role === 'model' ? cleanText(msg.text) : msg.text}} />
          ))}
          
          {!isFinalized && !hasError && status === AppStatus.IDLE && currentOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 px-1 ml-10 animate-fade-in">
              {currentOptions.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleSendMessage(opt)}
                  className="bg-white border-2 border-[#c5a572]/30 text-[#0f172a] text-[12px] font-bold px-5 py-2.5 rounded-full shadow-sm hover:bg-[#0f172a] hover:text-[#c5a572] transition-all transform active:scale-95"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {status === AppStatus.LOADING && (
            <div className="flex space-x-2 bg-white w-14 px-4 py-4 rounded-2xl border border-slate-100 shadow-sm ml-10">
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      <div className={`px-4 transition-all duration-500 ${(isFinalized || hasError) ? 'max-h-32 py-4 border-t bg-white' : 'max-h-0 overflow-hidden'}`}>
        <button onClick={() => window.open(`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent("Olá! Concluí minha triagem no site.")}`, '_blank')} className="w-full gold-gradient text-[#0f172a] font-black py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xl active:scale-95 transition-all uppercase text-xs tracking-widest">
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span>Conectar com Bruno Hamawaki</span>
        </button>
      </div>

      <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center bg-slate-100 rounded-2xl px-4 py-1.5 border border-transparent focus-within:border-[#c5a572]/40 transition-all shadow-inner">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Triagem concluída." : "Digite sua mensagem..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-3 bg-transparent text-sm text-[#0f172a] outline-none"
          />
          <button type="submit" disabled={!input.trim() || status === AppStatus.LOADING || isFinalized} className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0f172a] text-[#c5a572] shadow-lg disabled:opacity-20">
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
