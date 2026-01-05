
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

  const WHATSAPP_NUMBER = "817091225330";

  const initChat = async () => {
    setStatus(AppStatus.LOADING);
    const response = await geminiService.sendMessage("Olá");
    setMessages([
      { role: 'model', text: response, timestamp: new Date() }
    ]);
    setStatus(AppStatus.IDLE);
    setShowOptions(true);
  };

  useEffect(() => {
    initChat();
  }, []);

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
    
    // Detectar se a conversa foi finalizada
    if (response.includes("ENVIAR DADOS AO WHATSAPP") || response.includes("Muito obrigado pelas informações")) {
      setIsFinalized(true);
    }

    setMessages(prev => [...prev, modelMsg]);
    setStatus(AppStatus.IDLE);
  }, [input, status, messages]);

  const openWhatsApp = () => {
    let summary = "📋 *NOVO ATENDIMENTO - MKT-TRADUCAO*\n\n";
    summary += "*Histórico da Triagem:*\n";
    
    // Mapeia o diálogo para que o consultor veja pergunta e resposta
    messages.forEach((msg, index) => {
      if (index === 0) return; // Pula a saudação inicial do bot
      
      if (msg.role === 'model') {
        // Formata as perguntas do bot (limpa o texto do botão)
        const cleanText = msg.text.split("ENVIAR DADOS AO WHATSAPP")[0].trim();
        if (cleanText && !cleanText.includes("Muito obrigado pelas informações")) {
          summary += `\n🤖 _${cleanText}_\n`;
        }
      } else {
        // Formata as respostas do usuário
        summary += `✅ *R:* ${msg.text}\n`;
      }
    });

    summary += "\n---\n_Enviado via Assistente Virtual MKT_";

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-slate-100">
      {/* Header Compacto */}
      <header className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="bg-red-600 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md">
              <i className="fa-solid fa-passport text-lg"></i>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">MKT-traducao</h1>
            <p className="text-[11px] text-green-600 font-semibold flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
              Online agora
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            geminiService.reset();
            setMessages([]);
            setIsFinalized(false);
            initChat();
          }}
          className="text-slate-400 hover:text-red-600 transition-colors p-2"
        >
          <i className="fa-solid fa-rotate-right text-sm"></i>
        </button>
      </header>

      {/* Área de Mensagens */}
      <main className="flex-1 overflow-hidden relative bg-slate-50/30">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto px-4 py-6 space-y-4 no-scrollbar"
        >
          {messages.map((msg, idx) => (
            <div key={idx} className="message-appear">
              <ChatMessage message={msg} />
            </div>
          ))}
          
          {/* Opções Iniciais Visuais */}
          {showOptions && status === AppStatus.IDLE && messages.length === 1 && (
            <div className="flex flex-col space-y-3 mt-4 px-2">
              <button 
                onClick={() => handleSendMessage("VISTO")}
                className="quick-option-btn w-full bg-white border-2 border-slate-100 hover:border-red-500 hover:bg-red-50 p-4 rounded-2xl flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mr-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <i className="fa-solid fa-id-card"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">Opção 1: VISTO</p>
                    <p className="text-xs text-slate-500">Renovação, troca ou solicitação</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-red-500"></i>
              </button>

              <button 
                onClick={() => handleSendMessage("CONSULADO")}
                className="quick-option-btn w-full bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 p-4 rounded-2xl flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">Opção 2: CONSULADO</p>
                    <p className="text-xs text-slate-500">Passaporte, Registros e Procurações</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-blue-500"></i>
              </button>
            </div>
          )}

          {status === AppStatus.LOADING && (
            <div className="flex justify-start items-center space-x-2 bg-white w-16 px-3 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm ml-10">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          )}
        </div>
      </main>

      {/* Botão do WhatsApp (Dinâmico) */}
      <div className={`px-4 transition-all duration-500 ease-in-out ${isFinalized ? 'max-h-24 py-2 opacity-100' : 'max-h-0 py-0 opacity-0 overflow-hidden'}`}>
        <button 
          onClick={openWhatsApp}
          className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 shadow-lg transform transition-transform active:scale-95"
        >
          <i className="fa-brands fa-whatsapp text-2xl"></i>
          <span>ENVIAR DADOS AO WHATSAPP</span>
        </button>
      </div>

      {/* Input de Mensagem */}
      <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center bg-slate-100 rounded-2xl px-4 py-1 border border-transparent focus-within:border-red-200 focus-within:bg-white transition-all"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFinalized ? "Triagem concluída." : "Responda aqui..."}
            disabled={status === AppStatus.LOADING || isFinalized}
            className="flex-1 py-3 bg-transparent text-sm text-slate-700 outline-none"
          />
          <button 
            type="submit"
            disabled={!input.trim() || status === AppStatus.LOADING || isFinalized}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all 
              ${!input.trim() || status === AppStatus.LOADING || isFinalized
                ? 'text-slate-300' 
                : 'bg-red-600 text-white shadow-md active:scale-90'}`}
          >
            <i className="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </form>
        <div className="flex justify-center mt-2">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Powered by MKT-traducao</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
