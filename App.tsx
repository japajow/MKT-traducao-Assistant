
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppStatus } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [showOptions, setShowOptions] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Configuração única para o Bruno
  const ADMIN_PHONE = "817091225330";
  const ADMIN_NAME = "Bruno Hamawaki";

  const initChat = async () => {
    setStatus(AppStatus.LOADING);
    const response = await geminiService.sendMessage("Olá, iniciar atendimento");
    setMessages([{ role: 'model', text: response, timestamp: new Date() }]);
    setStatus(AppStatus.IDLE);
    setShowOptions(true);
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
    setShowOptions(false);

    const response = await geminiService.sendMessage(textToSend);
    const modelMsg: Message = { role: 'model', text: response, timestamp: new Date() };
    
    if (response.includes("CONECTAR COM CONSULTOR") || response.includes("Bruno Hamawaki")) {
      setIsFinalized(true);
    }

    setMessages(prev => [...prev, modelMsg]);
    setStatus(AppStatus.IDLE);
  }, [input, status]);

  const openWhatsApp = () => {
    let summary = `✨ *MKT TRADUÇÃO - SOLICITAÇÃO PREMIUM*\n\n`;
    summary += `*Consultor Responsável:* ${ADMIN_NAME}\n`;
    summary += `*Status:* Triagem Virtual Concluída\n\n`;
    summary += `*DETALHES DO ATENDIMENTO:*\n`;
    
    messages.forEach((msg, index) => {
      if (index === 0) return;
      if (msg.role === 'model') {
        const clean = msg.text.split("CONECTAR COM CONSULTOR")[0].trim();
        if (clean && !clean.includes("Agradeço imensamente")) {
          summary += `\n📌 _${clean}_\n`;
        }
      } else {
        summary += `➡ *R:* ${msg.text}\n`;
      }
    });

    summary += `\n---\n_Protocolo gerado via MKT Virtual Concierge_`;
    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      {/* Header Premium */}
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-6 py-5 flex items-center justify-between shrink-0 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="gold-gradient w-12 h-12 rounded-full flex items-center justify-center text-[#0f172a] shadow-lg border-2 border-white/10">
              <i className="fa-solid fa-crown text-xl"></i>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0f172a] rounded-full"></div>
          </div>
          <div>
            <h1 className="text-white font-serif-premium text-lg tracking-wide leading-tight">MKT-traducao</h1>
            <p className="text-[#c5a572] text-[10px] uppercase tracking-[0.2em] font-bold">Virtual Concierge Service</p>
          </div>
        </div>
        <button 
          onClick={() => {
            geminiService.reset();
            setMessages([]);
            setIsFinalized(false);
            initChat();
          }}
          className="text-[#c5a572] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5"
        >
          <i className="fa-solid fa-arrow-rotate-left"></i>
        </button>
      </header>

      {/* Área de Mensagens */}
      <main className="flex-1 overflow-hidden relative bg-[#fcfcfc]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-8 space-y-6 no-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className="message-appear">
              <ChatMessage message={msg} />
            </div>
          ))}
          
          {showOptions && status === AppStatus.IDLE && messages.length === 1 && (
            <div className="flex flex-col space-y-4 mt-6 px-4 animate-fade-in">
              <button 
                onClick={() => handleSendMessage("VISTO")}
                className="premium-card w-full p-5 rounded-2xl flex items-center group"
              >
                <div className="w-12 h-12 gold-gradient text-[#0f172a] rounded-xl flex items-center justify-center mr-5 shadow-inner transition-transform group-hover:scale-105">
                  <i className="fa-solid fa-passport text-xl"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-sm uppercase tracking-wider">Assessoria de Visto</p>
                  <p className="text-[11px] text-slate-500">Renovações e Alterações de Status</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[#c5a572] opacity-50"></i>
              </button>

              <button 
                onClick={() => handleSendMessage("CONSULADO")}
                className="premium-card w-full p-5 rounded-2xl flex items-center group"
              >
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mr-5 transition-all group-hover:bg-[#0f172a] group-hover:text-[#c5a572]">
                  <i className="fa-solid fa-building-columns text-xl"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-sm uppercase tracking-wider">Serviços Consulares</p>
                  <p className="text-[11px] text-slate-500">Passaportes e Registros Oficiais</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[#c5a572] opacity-50"></i>
              </button>
            </div>
          )}

          {status === AppStatus.LOADING && (
            <div className="flex justify-start items-center space-x-2 bg-white w-16 px-4 py-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm ml-10">
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      {/* Botão Finalizador - Foco no Bruno */}
      <div className={`px-4 transition-all duration-700 ${isFinalized ? 'max-h-32 py-4' : 'max-h-0 py-0 overflow-hidden'}`}>
        <button 
          onClick={openWhatsApp}
          className="w-full gold-gradient hover:brightness-110 text-[#0f172a] font-bold py-5 rounded-2xl flex items-center justify-center space-x-3 shadow-[0_10px_30px_rgba(197,165,114,0.3)] transition-all active:scale-95"
        >
          <i className="fa-brands fa-whatsapp text-2xl"></i>
          <span className="uppercase tracking-[0.1em]">Conectar com Consultor Bruno</span>
        </button>
      </div>

      {/* Footer / Input */}
      <footer className="p-6 bg-white border-t border-slate-100 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center bg-slate-50 rounded-2xl px-5 py-2 border border-slate-200 focus-within:border-[#c5a572] focus-within:bg-white transition-all shadow-inner"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Atendimento finalizado." : "Digite sua mensagem..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-3 bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
          />
          <button 
            type="submit"
            disabled={!input.trim() || status === AppStatus.LOADING || isFinalized}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all 
              ${!input.trim() || status === AppStatus.LOADING || isFinalized
                ? 'text-slate-300' 
                : 'bg-[#0f172a] text-[#c5a572] shadow-lg hover:scale-105 active:scale-90'}`}
          >
            <i className="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </form>
        <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">EXCELLENCE IN SERVICE</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
