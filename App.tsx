
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppStatus } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isFinalized, setIsFinalized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ADMIN_PHONE = "817091225330";
  const ADMIN_NAME = "Bruno Hamawaki";

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

    const userMsg: Message = { role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus(AppStatus.LOADING);

    const response = await geminiService.sendMessage(textToSend);
    const modelMsg: Message = { role: 'model', text: response, timestamp: new Date() };
    
    if (response.includes("CONECTAR COM CONSULTOR")) {
      setIsFinalized(true);
    }

    setMessages(prev => [...prev, modelMsg]);
    setStatus(AppStatus.IDLE);
  }, [input, status]);

  // Função para extrair botões do texto da IA
  const parseOptions = (text: string) => {
    const options: string[] = [];
    
    // Procura por (A), (B), (C) ou 1., 2., 3. seguidos de texto
    const regexOptions = /(?:\(|\b)([A-C1-5])(?:\.|\))\s*([^\n\r(]+)/gi;
    let match;
    while ((match = regexOptions.exec(text)) !== null) {
      options.push(match[0].trim());
    }

    // Se não achou padrões complexos, busca palavras-chave simples
    if (options.length === 0) {
      if (text.toLowerCase().includes("sim") && text.toLowerCase().includes("não")) {
        options.push("Sim", "Não");
      }
      if (text.toLowerCase().includes("1 ano") && text.toLowerCase().includes("3 anos")) {
        options.push("1 ano", "3 anos", "5 anos");
      }
    }

    return options;
  };

  const currentOptions = messages.length > 0 && messages[messages.length - 1].role === 'model' 
    ? parseOptions(messages[messages.length - 1].text) 
    : [];

  const openWhatsApp = () => {
    let summary = `*MKT TRADUCAO - SOLICITACAO PREMIUM*\n`;
    summary += `------------------------------------\n`;
    summary += `*Consultor:* ${ADMIN_NAME}\n\n`;
    
    messages.forEach((msg, index) => {
      if (index === 0) return;
      if (msg.role === 'user') summary += `*R:* ${msg.text}\n`;
    });

    summary += `\n------------------------------------\n`;
    summary += `_Triagem via MKT Concierge_`;

    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-3 flex items-center justify-between shrink-0 shadow-xl z-10">
        <div className="flex items-center space-x-3">
          <div className="gold-gradient w-9 h-9 rounded-full flex items-center justify-center text-[#0f172a]">
            <i className="fa-solid fa-crown text-sm"></i>
          </div>
          <div>
            <h1 className="text-white font-serif-premium text-base">MKT-traducao</h1>
            <p className="text-[#c5a572] text-[8px] uppercase tracking-widest font-bold">Virtual Concierge</p>
          </div>
        </div>
        <button onClick={() => { geminiService.reset(); setMessages([]); setIsFinalized(false); initChat(); }} className="text-[#c5a572] hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
        </button>
      </header>

      <main className="flex-1 overflow-hidden relative bg-[#fcfcfc]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-3 py-6 space-y-4 no-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className="message-appear">
              <ChatMessage message={msg} />
            </div>
          ))}
          
          {/* BOTÕES DINÂMICOS */}
          {!isFinalized && status === AppStatus.IDLE && currentOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 px-1 animate-fade-in ml-10">
              {currentOptions.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleSendMessage(opt)}
                  className="bg-white border border-[#c5a572]/40 text-[#0f172a] text-[11px] font-semibold px-4 py-2.5 rounded-full shadow-sm hover:bg-[#0f172a] hover:text-[#c5a572] hover:border-[#0f172a] transition-all active:scale-95"
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

      <div className={`px-4 transition-all duration-500 ${isFinalized ? 'max-h-24 py-3 border-t bg-white' : 'max-h-0 py-0 overflow-hidden'}`}>
        <button onClick={openWhatsApp} className="w-full gold-gradient text-[#0f172a] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95">
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span className="uppercase tracking-wider text-[11px]">Conectar com Bruno Hamawaki</span>
        </button>
      </div>

      <footer className="p-3.5 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center bg-slate-50 rounded-xl px-4 py-1 border border-slate-200 focus-within:border-[#c5a572] transition-all">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Triagem concluída." : "Escolha uma opção ou escreva..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-2 bg-transparent text-sm text-[#0f172a] outline-none"
          />
          <button type="submit" disabled={!input.trim() || status === AppStatus.LOADING || isFinalized} className={`w-8 h-8 rounded-lg flex items-center justify-center ${!input.trim() || status === AppStatus.LOADING || isFinalized ? 'text-slate-300' : 'bg-[#0f172a] text-[#c5a572]'}`}>
            <i className="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
