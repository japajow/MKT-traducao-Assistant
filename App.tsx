import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppStatus } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const STORAGE_KEY = 'mkt_concierge_cache_v1';

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
  if (!text) return "";
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

  // Salva o estado atual com segurança
  const saveToStorage = (msgs: Message[], finalized: boolean) => {
    try {
      const data = JSON.stringify({
        messages: msgs,
        isFinalized: finalized,
        lastUpdate: new Date().getTime()
      });
      localStorage.setItem(STORAGE_KEY, data);
    } catch (e) {
      console.error("Erro ao salvar no storage", e);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setIsFinalized(false);
    setHasError(false);
    geminiService.reset();
    initChat();
  };

  const initChat = async () => {
    setStatus(AppStatus.LOADING);
    const response = await geminiService.sendMessage("Iniciando triagem premium.");
    const newMsg: Message = { role: 'model', text: response, timestamp: new Date() };
    setMessages([newMsg]);
    setStatus(AppStatus.IDLE);
    saveToStorage([newMsg], false);
  };

  // EFEITO DE CARREGAMENTO INICIAL (BLINDADO)
  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        initChat();
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.messages)) {
          // Converte as strings de volta para objetos Date (evita tela branca)
          const validMessages = parsed.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          
          setMessages(validMessages);
          setIsFinalized(parsed.isFinalized);

          // Se já finalizou, verifica se precisa mandar a mensagem de boas-vindas novamente
          if (parsed.isFinalized && validMessages[validMessages.length - 1].text.indexOf("Nova Dúvida") === -1) {
            const welcomeMsg: Message = {
              role: 'model',
              text: "Seja bem-vindo de volta! Gostaria de revisar algo ou tem uma [Nova Dúvida]?",
              timestamp: new Date()
            };
            const updated = [...validMessages, welcomeMsg];
            setMessages(updated);
            saveToStorage(updated, true);
          }
        } else {
          initChat();
        }
      } catch (e) {
        console.error("Erro ao carregar cache. Resetando...");
        handleReset();
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || status === AppStatus.LOADING) return;

    if (textToSend === "Nova Dúvida") {
      handleReset();
      return;
    }

    setHasError(false);
    const userMsg: Message = { role: 'user', text: textToSend, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStatus(AppStatus.LOADING);

    const response = await geminiService.sendMessage(textToSend);

    if (response.startsWith("ERRO_CRITICO")) {
      setHasError(true);
      const errorMsg: Message = { role: 'model', text: "Desculpe, tive um problema técnico. Vamos continuar pelo WhatsApp?", timestamp: new Date() };
      const finalMsgs = [...newMessages, errorMsg];
      setMessages(finalMsgs);
      saveToStorage(finalMsgs, false);
    } else {
      let isNowFinalized = isFinalized || response.includes("CONECTAR COM CONSULTOR");
      const modelMsg: Message = { role: 'model', text: response, timestamp: new Date() };
      const finalMsgs = [...newMessages, modelMsg];
      setMessages(finalMsgs);
      setIsFinalized(isNowFinalized);
      saveToStorage(finalMsgs, isNowFinalized);
    }

    setStatus(AppStatus.IDLE);
  }, [input, status, messages, isFinalized]);

  const currentOptions = messages.length > 0 && messages[messages.length - 1].role === 'model'
    ? parseOptions(messages[messages.length - 1].text)
    : [];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="gold-gradient w-9 h-9 rounded-full flex items-center justify-center text-[#0f172a] shadow-lg">
            <i className="fa-solid fa-crown text-sm"></i>
          </div>
          <div>
            <h1 className="text-white font-serif text-base font-bold tracking-tight">MKT Concierge</h1>
            <p className="text-[#c5a572] text-[8px] uppercase tracking-[3px] font-black opacity-80">AI Intelligent Service</p>
          </div>
        </div>
        <button onClick={handleReset} title="Reiniciar" className="text-[#c5a572] hover:bg-white/10 p-2 rounded-full transition-all">
          <i className="fa-solid fa-rotate-right text-sm"></i>
        </button>
      </header>

      <main className="flex-1 overflow-hidden relative bg-[#f8fafc]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6 space-y-6 no-scrollbar">
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

          {status === AppStatus.IDLE && currentOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 px-1 animate-fade-in ml-10">
              {currentOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(opt)}
                  className="bg-white border-2 border-[#c5a572]/30 text-[#0f172a] text-[12px] font-bold px-5 py-2.5 rounded-full shadow-md hover:bg-[#0f172a] hover:text-[#c5a572] hover:border-[#0f172a] transition-all transform active:scale-95 shadow-[#c5a572]/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {status === AppStatus.LOADING && (
            <div className="flex justify-start items-center space-x-2 bg-white w-14 px-4 py-3.5 rounded-2xl border border-slate-100 shadow-sm ml-10">
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      <div className={`px-4 bg-white transition-all duration-500 overflow-hidden ${isFinalized ? 'max-h-32 py-4 border-t border-slate-100' : 'max-h-0'}`}>
        <button onClick={() => {
            const summary = messages.filter(m => m.role === 'user').map(m => `*R:* ${m.text}`).join('\n');
            window.open(`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent("*MKT TRADUÇÃO - TRIAGEM*\n\n" + summary)}`, '_blank');
        }} className="w-full gold-gradient text-[#0f172a] font-black py-4 rounded-2xl flex items-center justify-center space-x-3 shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest">
          <i className="fa-brands fa-whatsapp text-xl"></i>
          <span>Falar com Bruno Hamawaki</span>
        </button>
      </div>

      <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center bg-slate-100 rounded-2xl px-4 py-1.5 border border-transparent focus-within:border-[#c5a572]/40 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Triagem finalizada..." : "Escreva sua mensagem..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-3 bg-transparent text-sm text-[#0f172a] outline-none"
          />
          <button type="submit" disabled={!input.trim() || status === AppStatus.LOADING || isFinalized} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-[#0f172a] text-[#c5a572] disabled:opacity-10 shadow-lg">
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
