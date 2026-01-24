import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppStatus } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const STORAGE_KEY = 'mkt_concierge_history';

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

  // --- FUNÇÃO PARA SALVAR NO LOCALSTORAGE ---
  const saveHistory = (msgs: Message[], finalized: boolean) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: msgs,
      isFinalized: finalized,
      timestamp: new Date().getTime()
    }));
  };

  // --- FUNÇÃO PARA RESETAR TUDO ---
  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setIsFinalized(false);
    setHasError(false);
    geminiService.reset();
    initChat("Iniciando nova triagem premium.");
  };

  const initChat = async (prompt: string = "Iniciando triagem premium.") => {
    setStatus(AppStatus.LOADING);
    const response = await geminiService.sendMessage(prompt);
    const newMsg: Message = { role: 'model', text: response, timestamp: new Date() };
    const updatedMessages = [newMsg];
    setMessages(updatedMessages);
    setStatus(AppStatus.IDLE);
    saveHistory(updatedMessages, false);
  };

  // --- CARREGAR HISTÓRICO AO INICIAR ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setMessages(parsed.messages);
      setIsFinalized(parsed.isFinalized);

      // Se ele já tinha terminado antes, o robô dá as boas vindas novamente
      if (parsed.isFinalized) {
        const welcomeBack: Message = { 
          role: 'model', 
          text: "Seja bem-vindo de volta! Vejo que já concluímos uma triagem anteriormente. Gostaria de revisar algo ou tem uma [Nova Dúvida]?", 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, welcomeBack]);
      }
    } else {
      initChat();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || status === AppStatus.LOADING) return;

    // Se o usuário clicar em "Nova Dúvida", limpamos o chat
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
      const modelMsg: Message = { role: 'model', text: response.replace("ERRO_CRITICO: ", ""), timestamp: new Date() };
      const finalMsgs = [...newMessages, modelMsg];
      setMessages(finalMsgs);
      saveHistory(finalMsgs, false);
    } else {
      let finalizedState = isFinalized;
      if (response.includes("CONECTAR COM CONSULTOR")) {
        finalizedState = true;
        setIsFinalized(true);
      }
      const modelMsg: Message = { role: 'model', text: response, timestamp: new Date() };
      const finalMsgs = [...newMessages, modelMsg];
      setMessages(finalMsgs);
      saveHistory(finalMsgs, finalizedState);
    }

    setStatus(AppStatus.IDLE);
  }, [input, status, messages, isFinalized]);

  const currentOptions = messages.length > 0 && messages[messages.length - 1].role === 'model'
    ? parseOptions(messages[messages.length - 1].text)
    : [];

  const openWhatsApp = () => {
    let summary = `*MKT TRADUCAO - SOLICITACAO PREMIUM*\n`;
    summary += `------------------------------------\n`;
    messages.forEach((msg) => {
      if (msg.role === 'user') summary += `*R:* ${msg.text}\n`;
    });
    window.open(`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(summary)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="gold-gradient w-9 h-9 rounded-full flex items-center justify-center text-[#0f172a]">
            <i className="fa-solid fa-crown text-sm"></i>
          </div>
          <div>
            <h1 className="text-white font-serif text-base font-bold">MKT Concierge</h1>
            <p className="text-[#c5a572] text-[8px] uppercase tracking-widest font-bold tracking-[3px]">Intelligent Assistant</p>
          </div>
        </div>
        <button onClick={handleReset} title="Nova Consulta" className="text-[#c5a572] hover:text-white transition-colors bg-white/5 p-2 rounded-lg">
          <i className="fa-solid fa-plus text-xs"></i>
        </button>
      </header>

      <main className="flex-1 overflow-hidden relative bg-[#fcfcfc]">
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
            <div className="flex justify-start items-center space-x-1.5 bg-white w-12 px-3 py-3 rounded-xl border border-slate-200 shadow-sm ml-10">
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      <div className={`px-4 transition-all duration-500 ${(isFinalized || hasError) ? 'max-h-40 py-4 border-t bg-slate-50' : 'max-h-0 py-0 overflow-hidden'}`}>
        <button onClick={openWhatsApp} className="w-full gold-gradient text-[#0f172a] font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xl active:scale-95 transition-all">
          <i className="fa-brands fa-whatsapp text-xl"></i>
          <span className="uppercase tracking-wider text-xs">Conectar com Bruno Hamawaki</span>
        </button>
      </div>

      <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center bg-slate-100 rounded-2xl px-4 py-1.5 border border-transparent focus-within:border-[#c5a572]/50 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Triagem concluída." : "Digite sua mensagem..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-2 bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
          />
          <button type="submit" disabled={!input.trim() || status === AppStatus.LOADING || isFinalized} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-[#0f172a] text-[#c5a572] disabled:opacity-20">
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
