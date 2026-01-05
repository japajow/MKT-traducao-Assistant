
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
    const response = await geminiService.sendMessage("Iniciando atendimento virtual para triagem.");
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

  // Lógica para mostrar opções: detecta se o robô perguntou como auxiliar hoje (após o nome)
  const shouldShowOptions = () => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'model') return false;
    const text = lastMsg.text.toLowerCase();
    return (text.includes("como posso auxiliá-lo") || 
            text.includes("escolha uma das opções") || 
            text.includes("opções abaixo"));
  };

  const openWhatsApp = () => {
    let summary = `*MKT TRADUCAO - SOLICITACAO PREMIUM*\n`;
    summary += `------------------------------------\n`;
    summary += `*Consultor:* ${ADMIN_NAME}\n`;
    summary += `*Status:* Triagem Virtual Concluida\n\n`;
    summary += `*DADOS DA TRIAGEM:*\n`;
    
    messages.forEach((msg, index) => {
      if (index === 0) return; // Pula saudação técnica
      if (msg.role === 'model') {
        const clean = msg.text.split("CONECTAR COM CONSULTOR")[0].trim();
        // Apenas adiciona perguntas relevantes, não textos de boas vindas longos
        if (clean && !clean.includes("Agradeço") && clean.length > 5 && !clean.includes("Muito prazer")) {
          const lines = clean.split('\n');
          const lastQuestion = lines[lines.length - 1].trim();
          summary += `\n*P:* ${lastQuestion || clean}\n`;
        }
      } else {
        summary += `*R:* ${msg.text}\n`;
      }
    });

    summary += `\n------------------------------------\n`;
    summary += `_Enviado via MKT Virtual Concierge_`;

    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-200">
      {/* Header Premium Compacto */}
      <header className="bg-[#0f172a] border-b border-[#c5a572]/30 px-5 py-3 flex items-center justify-between shrink-0 shadow-xl z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="gold-gradient w-9 h-9 rounded-full flex items-center justify-center text-[#0f172a] shadow-lg border border-white/10">
              <i className="fa-solid fa-crown text-sm"></i>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0f172a] rounded-full"></div>
          </div>
          <div>
            <h1 className="text-white font-serif-premium text-base tracking-wide leading-tight">MKT-traducao</h1>
            <p className="text-[#c5a572] text-[8px] uppercase tracking-[0.2em] font-bold">Virtual Concierge</p>
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
          <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
        </button>
      </header>

      {/* Área de Mensagens */}
      <main className="flex-1 overflow-hidden relative bg-[#fcfcfc]">
        <div ref={scrollRef} className="h-full overflow-y-auto px-3 py-6 space-y-4 no-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className="message-appear">
              <ChatMessage message={msg} />
            </div>
          ))}
          
          {shouldShowOptions() && status === AppStatus.IDLE && (
            <div className="flex flex-col space-y-2 mt-4 px-1 animate-fade-in">
              <button 
                onClick={() => handleSendMessage("VISTO PERMANENTE")}
                className="premium-card w-full p-3.5 rounded-xl flex items-center group border-l-4 border-l-[#c5a572] shadow-sm"
              >
                <div className="w-9 h-9 gold-gradient text-[#0f172a] rounded-lg flex items-center justify-center mr-3.5 shadow-inner">
                  <i className="fa-solid fa-infinity text-base"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-[11px] uppercase tracking-wider">Visto Permanente</p>
                  <p className="text-[9px] text-slate-500">Analise de Elegibilidade (Eijuu)</p>
                </div>
                <i className="fa-solid fa-star text-[#c5a572] text-[8px] animate-pulse"></i>
              </button>

              <button 
                onClick={() => handleSendMessage("VISTO COMUM")}
                className="premium-card w-full p-3.5 rounded-xl flex items-center group shadow-sm"
              >
                <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mr-3.5 group-hover:bg-[#0f172a] group-hover:text-[#c5a572] transition-colors">
                  <i className="fa-solid fa-passport text-base"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-[11px] uppercase tracking-wider">Visto Comum</p>
                  <p className="text-[9px] text-slate-500">Renovacoes e Alteracoes</p>
                </div>
              </button>

              <button 
                onClick={() => handleSendMessage("CONSULADO")}
                className="premium-card w-full p-3.5 rounded-xl flex items-center group shadow-sm"
              >
                <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mr-3.5 group-hover:bg-[#0f172a] group-hover:text-[#c5a572] transition-colors">
                  <i className="fa-solid fa-building-columns text-base"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[#0f172a] text-[11px] uppercase tracking-wider">Consulado</p>
                  <p className="text-[9px] text-slate-500">Passaportes e Registros</p>
                </div>
              </button>
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

      {/* Botão Finalizador - Foco no Bruno */}
      <div className={`px-4 transition-all duration-500 ease-in-out ${isFinalized ? 'max-h-24 py-3 border-t border-slate-100 bg-white shadow-inner' : 'max-h-0 py-0 overflow-hidden'}`}>
        <button 
          onClick={openWhatsApp}
          className="w-full gold-gradient hover:brightness-105 text-[#0f172a] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 border border-[#0f172a]/10"
        >
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span className="uppercase tracking-wider text-[11px]">Conectar com Bruno Hamawaki</span>
        </button>
      </div>

      {/* Footer / Input Compacto */}
      <footer className="p-3.5 bg-white border-t border-slate-100 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center bg-slate-50 rounded-xl px-4 py-1 border border-slate-200 focus-within:border-[#c5a572] focus-within:bg-white transition-all"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Triagem concluida." : "Escreva aqui..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-2 bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
          />
          <button 
            type="submit"
            disabled={!input.trim() || status === AppStatus.LOADING || isFinalized}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all 
              ${!input.trim() || status === AppStatus.LOADING || isFinalized
                ? 'text-slate-300' 
                : 'bg-[#0f172a] text-[#c5a572] shadow-sm'}`}
          >
            <i className="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
        <div className="mt-2 text-center">
            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-[0.3em]">Excellence in Service</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
