
import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        {isModel && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0f172a] flex items-center justify-center mr-2 shadow-lg border border-[#c5a572]/30">
            <i className="fa-solid fa-robot text-[#c5a572] text-[10px]"></i>
          </div>
        )}
        
        <div className={`px-4 py-3 rounded-2xl shadow-sm text-[13px] leading-relaxed relative
          ${isModel 
            ? 'bg-white text-slate-700 rounded-tl-none border border-slate-200' 
            : 'bg-[#0f172a] text-white rounded-tr-none border border-[#c5a572]/20'}`}>
          <div className="whitespace-pre-wrap">{message.text}</div>
          <div className={`text-[8px] mt-1.5 flex items-center font-bold uppercase tracking-widest ${isModel ? 'text-slate-400' : 'text-[#c5a572]'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
