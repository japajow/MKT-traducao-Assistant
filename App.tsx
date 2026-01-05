
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
    const response = await geminiService.sendMessage("Olá, gostaria de iniciar meu atendimento personalizado.");
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
    
    if (response.includes("CONECTAR COM CONSULTOR") || response.includes("Bruno Hamawaki")) {
      setIsFinalized(true);
    }

    setMessages(prev => [...prev, modelMsg]);
    setStatus(AppStatus.IDLE);
  }, [input, status]);

  // Lógica para mostrar opções: se a última mensagem do modelo pergunta "Como posso auxiliá-lo hoje?"
  const shouldShowOptions = () => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    return lastMsg.role === 'model' && 
           (lastMsg.text.includes("Como posso auxiliá-lo hoje?") || 
            lastMsg.text.includes("escolha uma das opções"));
  };

  const openWhatsApp = () => {
    let summary = `*MKT TRADUCAO - SOLICITACAO PREMIUM*\n`;
    summary += `------------------------------------\n`;
    summary += `*Consultor:* ${ADMIN_NAME}\n`;
    summary += `*Status:* Triagem Virtual Concluida\n\n`;
    summary += `*DADOS DA TRIAGEM:*\n`;
    
    messages.forEach((msg, index) => {
      if (index === 0) return;
      if (msg.role === 'model') {
        const clean = msg.text.split("CONECTAR COM CONSULTOR")[0].trim();
        if (clean && !clean.includes("Agradeço") && clean.length > 5) {
          const lines = clean.split('\n');
          const lastLine = lines[lines.length - 1].trim();
          summary += `\n*P:* ${lastLine || clean}\n`;
        }
      } else {
        summary += `*R:* ${msg.text}\n`;
      }
    });

    summary += `\n------------------------------------\n`;
    summary += `_Protocolo MKT Virtual Concierge_`;

    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      {/* Header Premium */}
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-3 flex items-center justify-between shrink-0 shadow-xl z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="gold-gradient w-10 h-10 rounded-full flex items-center justify-center text-[#0f172a] shadow-lg border-2 border-white/10">
              <i className="fa-solid fa-crown text-base"></i>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#0f172a] rounded-full"></div>
          </div>
          <div>
            <h1 className="text-white font-serif-premium text-base tracking-wide leading-tight">MKT-traducao</h1>
            <p className="text-[#c5a572] text-[9px] uppercase tracking-[0.2em] font-bold">Virtual Concierge</p>
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
          title="Reiniciar"
        >
          <i className="fa-solid fa-arrow-rotate-left text-sm"></i>
        </button>
      </header>

      {/* Área de Mensagens */}
      <main className="flex-1 overflow-hidden relative bg-[#fcfcfc]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6 space-y-5 no-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className="message-appear">
              <ChatMessage message={msg} />
            </div>
          ))}
          
          {shouldShowOptions() && status === AppStatus.IDLE && (
            <div className="flex flex-col space-y-3 mt-4 px-2 animate-fade-in">
              <button 
                onClick={() => handleSendMessage("VISTO PERMANENTE")}
                className="premium-card w-full p-4 rounded-xl flex items-center group border-l-4 border-l-[#c5a572]"
              >
                <div className="w-10 h-10 gold-gradient text-[#0f172a] rounded-lg flex items-center justify-center mr-4 shadow-inner">
                  <i className="fa-solid fa-infinity text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-[12px] uppercase tracking-wider">Visto Permanente</p>
                  <p className="text-[10px] text-slate-500">Analise de Elegibilidade (Eijuu)</p>
                </div>
                <i className="fa-solid fa-star text-[#c5a572] text-[10px] animate-pulse"></i>
              </button>

              <button 
                onClick={() => handleSendMessage("VISTO COMUM")}
                className="premium-card w-full p-4 rounded-xl flex items-center group"
              >
                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mr-4 group-hover:bg-[#0f172a] group-hover:text-[#c5a572] transition-colors">
                  <i className="fa-solid fa-passport text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-[12px] uppercase tracking-wider">Visto Comum</p>
                  <p className="text-[10px] text-slate-500">Renovacoes e Alteracoes</p>
                </div>
              </button>

              <button 
                onClick={() => handleSendMessage("CONSULADO")}
                className="premium-card w-full p-4 rounded-xl flex items-center group"
              >
                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mr-4 group-hover:bg-[#0f172a] group-hover:text-[#c5a572] transition-colors">
                  <i className="fa-solid fa-building-columns text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-[12px] uppercase tracking-wider">Consulado</p>
                  <p className="text-[10px] text-slate-500">Passaportes e Registros</p>
                </div>
              </button>
            </div>
          )}

          {status === AppStatus.LOADING && (
            <div className="flex justify-start items-center space-x-2 bg-white w-14 px-3 py-3 rounded-xl rounded-tl-none border border-slate-200 shadow-sm ml-10">
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#c5a572] rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      {/* Botão Finalizador */}
      <div className={`px-4 transition-all duration-500 ease-in-out ${isFinalized ? 'max-h-24 py-3 border-t border-slate-100 bg-white' : 'max-h-0 py-0 overflow-hidden'}`}>
        <button 
          onClick={openWhatsApp}
          className="w-full gold-gradient hover:brightness-110 text-[#0f172a] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 border border-[#0f172a]/10"
        >
          <i className="fa-brands fa-whatsapp text-xl"></i>
          <span className="uppercase tracking-wider text-[11px] sm:text-xs">Falar com Consultor Bruno</span>
        </button>
      </div>

      {/* Footer / Input */}
      <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center bg-slate-50 rounded-xl px-4 py-1.5 border border-slate-200 focus-within:border-[#c5a572] focus-within:bg-white transition-all shadow-inner"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Triagem concluida." : "Sua mensagem..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-2 bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
          />
          <button 
            type="submit"
            disabled={!input.trim() || status === AppStatus.LOADING || isFinalized}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all 
              ${!input.trim() || status === AppStatus.LOADING || isFinalized
                ? 'text-slate-300' 
                : 'bg-[#0f172a] text-[#c5a572] shadow-md hover:scale-105 active:scale-90'}`}
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
        <div className="mt-3 text-center">
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.3em]">Excellence in Service</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
