
import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[90%] sm:max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        {isModel && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mr-2 border border-red-100">
            <i className="fa-solid fa-headset text-red-600 text-[10px]"></i>
          </div>
        )}
        
        <div className={`px-4 py-3 rounded-2xl shadow-sm text-[13.5px] leading-relaxed relative
          ${isModel 
            ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100' 
            : 'bg-red-600 text-white rounded-tr-none'}`}>
          <div className="whitespace-pre-wrap">{message.text}</div>
          <div className={`text-[9px] mt-1.5 flex items-center ${isModel ? 'text-slate-400' : 'text-red-100'}`}>
            <i className={`fa-regular fa-clock mr-1 text-[8px]`}></i>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
