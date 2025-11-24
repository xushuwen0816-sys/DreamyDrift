import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, Sparkles, MessageSquareHeart, Loader2, Settings, Key, X, Check } from 'lucide-react';
import { getData, addDumpEntry, clearDumpEntries } from '../services/storageService';
import { generateComfortingResponse } from '../services/geminiService';
import { DumpEntry } from '../types';

const DumpBox: React.FC = () => {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<DumpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempKey, setTempKey] = useState('');

  // Track if we've shown the "No Key" reminder in this session
  const hasShownMissingKeyReminder = useRef(false);

  useEffect(() => {
    const data = getData();
    const today = new Date().toISOString().split('T')[0];
    
    // Load entries
    if (data.lastDumpDate !== today) {
       const cleared = clearDumpEntries();
       setEntries(cleared.dumpEntries);
    } else {
       setEntries(data.dumpEntries);
    }

    // Load API Key
    const savedKey = localStorage.getItem('dreamy_drift_api_key');
    if (savedKey) {
        setApiKey(savedKey);
        setTempKey(savedKey);
    }
  }, []);

  const saveApiKey = () => {
      localStorage.setItem('dreamy_drift_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowSettings(false);
      // Reset reminder flag if they added a key, so if they remove it later, they get reminded again
      if (tempKey.trim()) hasShownMissingKeyReminder.current = false;
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    
    const userText = text;
    setText('');
    setLoading(true);

    const tempId = Date.now().toString();
    const tempEntry: DumpEntry = { id: tempId, text: userText, timestamp: Date.now() };
    
    // 1. Save User Entry immediately
    let currentData = addDumpEntry(tempEntry);
    setEntries(currentData.dumpEntries);

    // 2. Check API Key logic
    if (!apiKey) {
        // If no key, only show the reminder once per session
        if (!hasShownMissingKeyReminder.current) {
             const reminderEntry: DumpEntry = { 
                 id: (Date.now() + 1).toString(), 
                 text: "", // Placeholder, we only use aiResponse field effectively for "Left side"
                 timestamp: Date.now(),
                 aiResponse: "我在听。（由于未配置 API Key，小精灵无法回复，但烦恼已记录。）"
             };
             currentData = addDumpEntry(reminderEntry);
             setEntries(currentData.dumpEntries);
             hasShownMissingKeyReminder.current = true;
        }
        // If already shown, do nothing else (quietly record)
        setLoading(false);
        return;
    }

    // 3. If Key exists, call AI
    try {
        const aiResponse = await generateComfortingResponse(userText, apiKey);
        // Update the user's entry with response? 
        // Actually, the original logic added a NEW entry for response usually? 
        // In the previous code: "const finalEntry: DumpEntry = { ...tempEntry, aiResponse };"
        // It updated the user's entry to include the response. 
        
        // Let's stick to that pattern: Update the recently added entry to include the AI response.
        // We need to find it in the fresh data structure.
        // Since addDumpEntry puts it at index 0, let's grab it.
        
        // Wait, `addDumpEntry` appends to array top.
        // Instead of modifying, let's just update the entry in storage.
        // But `addDumpEntry` creates a new array.
        
        // Simplified: Create a new entry that holds the response? 
        // Looking at `DumpBox` render: 
        // {entry.aiResponse && ( ... )} is rendered *under* the user message in the same block.
        // So we must update the `tempEntry`.
        
        // Update the entry in local state + storage
        const updatedEntry = { ...tempEntry, aiResponse };
        
        // We need a way to update a specific entry in storage. 
        // storageService doesn't have `updateEntry`.
        // We'll just overwrite the top entry since we just added it.
        // Or better, just use `addDumpEntry` again? No, that adds duplicate.
        
        // Let's manually update storage for this specific case
        const freshData = getData();
        const entryIndex = freshData.dumpEntries.findIndex(e => e.id === tempId);
        if (entryIndex !== -1) {
            freshData.dumpEntries[entryIndex] = updatedEntry;
            localStorage.setItem('dreamy_drift_data_v1', JSON.stringify(freshData));
            setEntries(freshData.dumpEntries);
        }
    } catch (e) {
        console.error(e);
    }
    
    setLoading(false);
  };

  return (
    // Changed from fixed calculation to h-full to fit the new flex container
    <div className="flex flex-col h-full relative">
       {/* Settings Modal / Panel */}
       {showSettings && (
           <div className="absolute inset-0 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm rounded-3xl p-6 flex flex-col justify-center animate-fade-in">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                       <Key className="w-5 h-5 text-warm-500" />
                       配置树洞精灵
                   </h3>
                   <button onClick={() => setShowSettings(false)} className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full">
                       <X className="w-5 h-5 text-stone-500" />
                   </button>
               </div>
               
               <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
                   如果你希望得到 AI 的暖心回复，请在此处填入你的 Google Gemini API Key。<br/>
                   <span className="text-xs opacity-70">如果不填，这里将作为一个安静的记录树洞，不会有回应。</span>
               </p>

               <input 
                   type="password" 
                   value={tempKey}
                   onChange={(e) => setTempKey(e.target.value)}
                   placeholder="在此粘贴 API Key (以 AIza 开头)"
                   className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-warm-400 outline-none text-stone-700 dark:text-stone-200"
               />

               <div className="flex gap-3">
                   <button 
                       onClick={saveApiKey}
                       className="flex-1 bg-warm-500 hover:bg-warm-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                   >
                       <Check className="w-5 h-5" />
                       保存配置
                   </button>
               </div>

               <div className="mt-6 text-center">
                   <a 
                       href="https://aistudio.google.com/app/apikey" 
                       target="_blank" 
                       rel="noreferrer"
                       className="text-xs text-blue-500 hover:underline"
                   >
                       没有 Key? 去 Google AI Studio 免费申请 &rarr;
                   </a>
               </div>
           </div>
       )}

       <div className="bg-stone-800 dark:bg-stone-900 text-white p-6 rounded-3xl mb-4 shadow-lg relative overflow-hidden transition-colors flex-shrink-0">
          <div className="relative z-10 flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-stone-400" />
                    情绪垃圾桶
                </h2>
                <p className="text-stone-400 text-sm">
                    这里是你的专属树洞。<br/>
                    倒出所有的不开心、愤怒或焦虑。
                    <br/>
                    <span className="block mt-2 text-xs opacity-70 bg-stone-700 dark:bg-stone-800 w-fit px-2 py-1 rounded">
                    * 内容将在次日自动清空
                    </span>
                </p>
            </div>
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md transition-all text-warm-100"
                title="配置 API Key"
            >
                <Settings className={`w-5 h-5 ${!apiKey ? 'animate-pulse text-warm-300' : ''}`} />
            </button>
          </div>
          {/* Background Decor */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-warm-900 rounded-full opacity-20 blur-3xl"></div>
       </div>

       {/* Chat/List Area */}
       <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 min-h-0">
          {entries.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 opacity-50">
                 <MessageSquareHeart className="w-12 h-12 mb-2" />
                 <p>大脑空空，好梦相伴...</p>
                 {!apiKey && <p className="text-xs mt-2 text-stone-400">(点击右上角配置 AI 即可开启回复)</p>}
             </div>
          )}

          {entries.slice().reverse().map((entry) => (
              <div key={entry.id} className="animate-fade-in-up">
                  {/* User Message */}
                  {entry.text && (
                      <div className="flex justify-end mb-2">
                          <div className="bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-100 dark:border-stone-600 rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] text-sm shadow-sm">
                              {entry.text}
                          </div>
                      </div>
                  )}

                  {/* AI Response */}
                  {entry.aiResponse && (
                      <div className="flex justify-start mb-6">
                          <div className="bg-warm-50 dark:bg-stone-800 text-stone-800 dark:text-warm-100 border border-warm-100 dark:border-stone-700 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] text-sm shadow-sm flex gap-3">
                              <Sparkles className="w-4 h-4 text-warm-400 flex-shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{entry.aiResponse}</span>
                          </div>
                      </div>
                  )}
              </div>
          ))}
          
          {loading && (
              <div className="flex justify-start">
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl px-4 py-3 text-xs text-stone-400 dark:text-stone-500 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {apiKey ? '精灵正在思考...' : '正在记录...'}
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
       </div>

       {/* Input Area */}
       <div className="relative flex-shrink-0">
          <textarea
             value={text}
             onChange={(e) => setText(e.target.value)}
             placeholder="写下你的烦恼..."
             className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-warm-200 dark:focus:ring-stone-600 resize-none shadow-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600"
             rows={3}
             onKeyDown={(e) => {
                 if(e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSend();
                 }
             }}
          />
          <button 
             onClick={handleSend}
             disabled={loading || !text.trim()}
             className="absolute right-3 bottom-3 p-2 bg-stone-800 dark:bg-stone-700 text-white rounded-xl disabled:opacity-50 hover:bg-stone-700 dark:hover:bg-stone-600 transition-colors"
          >
              <Send className="w-5 h-5" />
          </button>
       </div>
    </div>
  );
};

export default DumpBox;