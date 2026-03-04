import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import { AnalysisResult } from '../types';
import { sendChatMessage, ChatMessage } from '../services/geminiService';
import Markdown from 'react-markdown';

interface ChatBotProps {
  base64Image: string;
  mimeType: string;
  analysisResult: AnalysisResult;
}

const ChatBot: React.FC<ChatBotProps> = ({ base64Image, mimeType, analysisResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const userMsg = text || input.trim();
    if (!userMsg || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const stream = sendChatMessage(userMsg, messages, base64Image, mimeType, analysisResult);
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullResponse;
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev, 
        { role: 'model', text: `**Error:** ${error.message || 'Failed to get response.'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const presetPrompts = [
    "请给出更具体的优化建议",
    "这个设计违反了哪些可用性原则？",
    "如何改进视觉层级？"
  ];

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#FF8839] hover:bg-[#e67a33] text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 group overflow-hidden border-2 border-white"
          title="Ask Nielsen"
        >
          <img 
            src="https://nimg.ws.126.net/?url=http%3A%2F%2Fspider.ws.126.net%2Fa51f9638ba088baf086f6559b2f080ff.jpeg&thumbnail=660x2147483647&quality=80&type=jpg" 
            alt="Jakob Nielsen"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image fails
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
            }}
          />
          <span className="absolute right-16 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            咨询 Nielsen 专家
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-8 right-8 w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300 font-sans">
          {/* Header */}
          <div className="bg-white text-slate-900 border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                <img 
                  src="https://nimg.ws.126.net/?url=http%3A%2F%2Fspider.ws.126.net%2Fa51f9638ba088baf086f6559b2f080ff.jpeg&thumbnail=660x2147483647&quality=80&type=jpg" 
                  alt="Jakob Nielsen"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-bold text-sm">Jakob Nielsen</div>
                <div className="text-[10px] text-slate-400">可用性专家</div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 mt-4 text-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="w-16 h-16 mx-auto rounded-full overflow-hidden mb-3 border-2 border-white shadow-md">
                   <img 
                    src="https://nimg.ws.126.net/?url=http%3A%2F%2Fspider.ws.126.net%2Fa51f9638ba088baf086f6559b2f080ff.jpeg&thumbnail=660x2147483647&quality=80&type=jpg" 
                    alt="Jakob Nielsen"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-medium text-slate-900 mb-1">你好！我是 Jakob Nielsen。</p>
                <p className="mb-4">我将基于 10 大可用性原则，为您提供专业的界面改进建议。请问有什么可以帮您？</p>
                
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {presetPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(prompt)}
                      className="text-xs bg-white border border-slate-200 hover:border-[#FF8839] hover:text-[#FF8839] px-3 py-1.5 rounded-full transition-colors shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-slate-100 ${msg.role === 'user' ? 'bg-blue-100' : 'bg-white'}`}>
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-blue-600" />
                  ) : (
                    <img 
                      src="https://nimg.ws.126.net/?url=http%3A%2F%2Fspider.ws.126.net%2Fa51f9638ba088baf086f6559b2f080ff.jpeg&thumbnail=660x2147483647&quality=80&type=jpg" 
                      alt="Nielsen"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                  {msg.role === 'user' ? (
                    msg.text
                  ) : (
                    <div className="markdown-body prose prose-sm prose-slate max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-100">
                   <img 
                      src="https://nimg.ws.126.net/?url=http%3A%2F%2Fspider.ws.126.net%2Fa51f9638ba088baf086f6559b2f080ff.jpeg&thumbnail=660x2147483647&quality=80&type=jpg" 
                      alt="Nielsen"
                      className="w-full h-full object-cover"
                    />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF8839]" />
                  <span className="text-xs text-slate-500">正在思考...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Nielsen about usability..."
                className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-[#FF8839] focus:ring-2 focus:ring-[#FF8839]/20 rounded-full pl-4 pr-12 py-2.5 text-sm transition-all outline-none"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-1.5 bg-[#FF8839] text-white rounded-full disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
