
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, BookMarked, PenTool, MessageSquare, Speaker, Volume2, Save, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowRight, Share2, Send, Eraser } from 'lucide-react';
import * as gemini from './services/geminiService';
import { WordResult, TabType, SavedWord, SentenceAnalysis, ChatMessage } from './types';
import { ArticleBadge } from './components/ArticleBadge';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<WordResult | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [checkerInput, setCheckerInput] = useState('');
  const [checkerResult, setCheckerResult] = useState<SentenceAnalysis | null>(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<string | null>(null);

  // Initialize Chat Session
  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = gemini.startChatSession();
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  // Load saved words from local storage
  useEffect(() => {
    const saved = localStorage.getItem('german_words');
    if (saved) {
      setSavedWords(JSON.parse(saved));
    }
  }, []);

  const saveToLocal = (words: SavedWord[]) => {
    localStorage.setItem('german_words', JSON.stringify(words));
    setSavedWords(words);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSearch = async (wordToSearch?: string) => {
    const term = wordToSearch || searchInput.trim();
    if (!term) return;
    
    setLoading(true);
    setSearchResult(null);
    setResultImage(null);
    
    try {
      const result = await gemini.searchWord(term);
      setSearchResult(result);
      gemini.generateImage(result.img_prompt).then(setResultImage);
    } catch (error) {
      showToast("দুঃখিত, কোনো তথ্য পাওয়া যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!searchResult) return;
    const isAlreadySaved = savedWords.some(w => w.word.toLowerCase() === searchResult.word.toLowerCase());
    if (isAlreadySaved) {
      showToast("এটি ইতিমধ্যে আপনার নোটবুকে আছে।");
      return;
    }
    const newWord: SavedWord = {
      ...searchResult,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    saveToLocal([newWord, ...savedWords]);
    showToast("নোটবুকে সেভ হয়েছে!");
  };

  const handleDelete = (id: string) => {
    saveToLocal(savedWords.filter(w => w.id !== id));
    showToast("নোটবুক থেকে মুছে ফেলা হয়েছে।");
  };

  const handleSpeak = async (text: string) => {
    const audioData = await gemini.generateSpeech(text);
    if (audioData) {
      const binaryString = atob(audioData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const dataInt16 = new Int16Array(bytes.buffer);
      const frameCount = dataInt16.length;
      const buffer = audioCtx.createBuffer(1, frameCount, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  };

  const handleCheck = async () => {
    if (!checkerInput.trim()) return;
    setLoading(true);
    try {
      const res = await gemini.checkSentence(checkerInput);
      setCheckerResult(res);
    } catch (e) {
      showToast("চেকিং সফল হয়নি।");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !chatSessionRef.current) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      text: chatInput,
      timestamp: Date.now(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userMessage.text });
      const aiMessage: ChatMessage = {
        role: 'model',
        text: response.text || "দুঃখিত, আমি উত্তর দিতে পারছি না।",
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      showToast("টিউটরের সাথে যোগাযোগ করা যাচ্ছে না।");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    chatSessionRef.current = gemini.startChatSession();
    setChatMessages([]);
    showToast("চ্যাট পরিষ্কার করা হয়েছে।");
  };

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            {toast}
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
              <span className="font-bold text-xl">G</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-800 leading-none">Smart German</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI Language Tutor</p>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-6 text-sm font-semibold text-slate-500 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('search')} 
              className={`flex items-center gap-2 px-3 py-5 transition-all whitespace-nowrap border-b-2 ${activeTab === 'search' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}
            >
              <Search size={18} />
              <span className="hidden sm:inline">সার্চ</span>
            </button>
            <button 
              onClick={() => setActiveTab('notebook')} 
              className={`flex items-center gap-2 px-3 py-5 transition-all whitespace-nowrap border-b-2 ${activeTab === 'notebook' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}
            >
              <BookMarked size={18} />
              <span className="hidden sm:inline">নোটবুক</span>
            </button>
            <button 
              onClick={() => setActiveTab('checker')} 
              className={`flex items-center gap-2 px-3 py-5 transition-all whitespace-nowrap border-b-2 ${activeTab === 'checker' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}
            >
              <PenTool size={18} />
              <span className="hidden sm:inline">বাক্য যাচাই</span>
            </button>
            <button 
              onClick={() => setActiveTab('assistant')} 
              className={`flex items-center gap-2 px-3 py-5 transition-all whitespace-nowrap border-b-2 ${activeTab === 'assistant' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}
            >
              <MessageSquare size={18} />
              <span className="hidden sm:inline">AI চ্যাটবট</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        
        {activeTab === 'search' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2 py-4">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">জার্মান শিখুন স্মার্টলি</h2>
              <p className="text-slate-500 text-lg">AI ডিকশনারি, ব্যাকরণ এবং কথোপকথনের সেরা মাধ্যম</p>
            </div>

            <div className="relative max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 flex gap-2">
                <input 
                  type="text" 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="যেকোনো জার্মান শব্দ লিখুন..." 
                  className="flex-1 px-6 py-4 rounded-2xl border-none focus:ring-0 text-lg outline-none"
                />
                <button 
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold py-4 px-8 rounded-2xl transition-all active:scale-95 shadow-lg shadow-sky-100 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                  খুঁজুন
                </button>
              </div>
            </div>

            {searchResult && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border-2 border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 flex gap-3">
                      <button onClick={handleSave} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center transition-all"><Save size={20} /></button>
                      <button onClick={() => handleSpeak(searchResult.word)} className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:scale-110 transition-all border border-sky-100 shadow-sm"><Volume2 size={20} /></button>
                    </div>
                    <div className="space-y-6">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200">{searchResult.type}</span>
                      <div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <ArticleBadge article={searchResult.article} />
                          <h3 className="text-5xl font-black text-slate-800 tracking-tight">{searchResult.word}</h3>
                        </div>
                        <p className="text-3xl font-bold text-sky-600">{searchResult.meaning_bn}</p>
                        <p className="text-slate-400 font-medium mt-1">English: {searchResult.meaning_en}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 bg-indigo-50/50 rounded-2xl border-2 border-indigo-100">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center justify-between">বহুবচন / কনজুগেশন <button onClick={() => handleSpeak(searchResult.plural_or_conjugation)}><Speaker size={12}/></button></h4>
                          <p className="text-lg font-bold text-indigo-900">{searchResult.plural_or_conjugation}</p>
                          <p className="text-sm text-indigo-500/70 italic mt-1">{searchResult.plural_meaning_bn}</p>
                        </div>
                        <div className="p-5 bg-amber-50/50 rounded-2xl border-2 border-amber-100">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center justify-between">প্রতিশব্দ <button onClick={() => handleSpeak(searchResult.synonym)}><Speaker size={12}/></button></h4>
                          <p className="text-lg font-bold text-amber-900">{searchResult.synonym}</p>
                          <p className="text-sm text-amber-500/70 italic mt-1">{searchResult.synonym_meaning_bn}</p>
                        </div>
                      </div>
                      <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Share2 size={60} /></div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">উদাহরণ বাক্য</h4>
                        <div className="flex items-start gap-3">
                           <div className="flex-1">
                             <p className="text-xl font-bold leading-relaxed">{searchResult.example_de}</p>
                             <p className="text-sky-400 mt-2">{searchResult.example_bn}</p>
                           </div>
                           <button onClick={() => handleSpeak(searchResult.example_de)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"><Volume2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-4 shadow-sm h-full flex flex-col">
                    <div className="flex-1 bg-slate-50 rounded-[1.5rem] flex items-center justify-center overflow-hidden min-h-[300px] border border-slate-200">
                      {resultImage ? <img src={resultImage} alt={searchResult.word} className="w-full h-full object-cover animate-in zoom-in duration-1000" /> : <div className="text-center p-8 space-y-4"><Loader2 className="animate-spin mx-auto text-sky-400" size={32} /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ইমেজ তৈরি হচ্ছে...</p></div>}
                    </div>
                    <div className="mt-4 p-4 text-center"><p className="text-sm text-slate-500 italic">“ছবি দেখে শিখলে মস্তিষ্ক দ্রুত তথ্য মনে রাখতে পারে”</p></div>
                  </div>
                </div>
              </div>
            )}
            {!searchResult && !loading && (
               <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>সবাই যা শিখছে</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Haus', 'Auto', 'Lernen', 'Sprache', 'Essen', 'Schule', 'Arbeit', 'Zeit'].map(w => (
                      <button key={w} onClick={() => { setSearchInput(w); handleSearch(w); }} className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-all shadow-sm">{w}</button>
                    ))}
                  </div>
               </div>
            )}
          </div>
        )}

        {activeTab === 'notebook' && (
          <div className="animate-in slide-in-from-right duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">আমার নোটবুক</h2>
                <p className="text-slate-500">আপনার সেভ করা সব শব্দ এখানে থাকবে</p>
              </div>
              <div className="bg-sky-100 text-sky-700 px-4 py-2 rounded-2xl text-sm font-black border border-sky-200">{savedWords.length}টি শব্দ</div>
            </div>
            {savedWords.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300"><BookMarked size={40} /></div>
                <h3 className="text-xl font-bold text-slate-400">আপনার নোটবুক এখন খালি</h3>
                <button onClick={() => setActiveTab('search')} className="text-sky-600 font-bold flex items-center gap-1 mx-auto hover:gap-3 transition-all">নতুন শব্দ খুঁজতে এখানে যান <ArrowRight size={18} /></button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedWords.map(word => (
                  <div key={word.id} className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm group hover:border-sky-400 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-baseline gap-1"><span className="text-xs font-serif-italic text-slate-400">{word.article}</span><h4 className="text-xl font-bold text-slate-800">{word.word}</h4></div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleSpeak(word.word)} className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg"><Volume2 size={16}/></button>
                        <button onClick={() => handleDelete(word.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-700">{word.meaning_bn}</p>
                    <p className="text-sm text-slate-400 mb-4">{word.meaning_en}</p>
                    <button onClick={() => { setSearchResult(word); setActiveTab('search'); }} className="w-full py-2 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-sky-600 hover:text-white transition-all">বিস্তারিত দেখুন</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'checker' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-right duration-300 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">বাক্য ও ব্যাকরণ যাচাই</h2>
              <p className="text-slate-500">আপনার জার্মান বাক্যটি সঠিক কিনা তা এআই দিয়ে পরীক্ষা করুন</p>
            </div>
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border-2 border-slate-100 space-y-6">
              <textarea rows={4} value={checkerInput} onChange={(e) => setCheckerInput(e.target.value)} placeholder="উদাহরণ: Ich bin gehen nach Hause." className="w-full bg-slate-50 rounded-2xl p-6 border-none focus:ring-2 focus:ring-sky-500 outline-none resize-none text-xl" />
              <button onClick={handleCheck} disabled={loading || !checkerInput} className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" /> : <PenTool size={20} />}বিশ্লেষণ করুন</button>
            </div>
            {checkerResult && (
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`p-6 flex items-center justify-between ${checkerResult.isCorrect ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center gap-3">
                    {checkerResult.isCorrect ? <CheckCircle2 className="text-emerald-500" size={32} /> : <AlertCircle className="text-amber-500" size={32} />}
                    <div>
                      <h4 className={`font-black text-xl ${checkerResult.isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>{checkerResult.isCorrect ? 'বাক্যটি সঠিক!' : 'সংশোধন প্রয়োজন'}</h4>
                      <p className="text-sm opacity-70">ব্যাকরণগত নির্ভুলতা: {checkerResult.score}%</p>
                    </div>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">মূল বাক্য</span>
                      <p className="text-xl text-slate-500 line-through decoration-red-400 decoration-2">{checkerInput}</p>
                    </div>
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1 block">সঠিক রূপ</span>
                        <p className="text-2xl font-black text-emerald-900">{checkerResult.corrected}</p>
                        <p className="text-emerald-600 mt-1">অর্থ: {checkerResult.meaning}</p>
                      </div>
                      <button onClick={() => handleSpeak(checkerResult.corrected)} className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm hover:scale-105 transition-all"><Volume2 size={24} /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">ব্যাখ্যা (Bengali)</span>
                    <p className="text-slate-700 leading-relaxed text-lg">{checkerResult.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Improved AI Chatbot View */}
        {activeTab === 'assistant' && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right duration-300 h-[calc(100vh-14rem)] flex flex-col">
            <div className="flex-1 bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl mb-6 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">জার্মান স্মার্ট টিউটর</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Chatbot (Gemini 3 Pro)</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={clearChat}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Clear Chat"
                >
                  <Eraser size={20} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 no-scrollbar bg-slate-50/30">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-200">
                      <MessageSquare size={40} />
                    </div>
                    <div className="max-w-xs">
                      <h4 className="text-lg font-bold text-slate-800 mb-2">আপনার টিউটর কথা বলার জন্য প্রস্তুত</h4>
                      <p className="text-sm text-slate-500">ব্যাকরণ, শব্দার্থ বা সংস্কৃতি সম্পর্কে যেকোনো প্রশ্ন করুন। আমি আপনার সাথে চ্যাট করতে প্রস্তুত।</p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-sm ${msg.role === 'user' ? 'bg-sky-600 text-white' : 'bg-indigo-600 text-white'}`}>
                        {msg.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm border ${msg.role === 'user' ? 'bg-sky-50 border-sky-100 rounded-tr-none text-slate-800' : 'bg-white border-slate-100 rounded-tl-none text-slate-700'}`}>
                        <div className="prose prose-sm max-w-none">
                          {msg.text.split('\n').map((line, idx) => (
                            <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{line}</p>
                          ))}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-2 block opacity-60 uppercase font-bold tracking-tighter">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                   <div className="flex items-center gap-3 text-indigo-600 font-bold animate-pulse px-4">
                     <div className="flex gap-1">
                       <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                       <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                       <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                     </div>
                     টিউটর লিখছেন...
                   </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="bg-slate-50 rounded-2xl p-2 flex gap-2 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-all shadow-inner">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="আপনার প্রশ্নটি এখানে লিখুন..."
                    className="flex-1 bg-transparent px-4 py-3 outline-none text-slate-700 font-medium placeholder:text-slate-400"
                    disabled={loading}
                  />
                  <button 
                    onClick={handleSendChatMessage}
                    disabled={loading || !chatInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold p-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center justify-center"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-50 shadow-2xl">
        <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center p-2 ${activeTab === 'search' ? 'text-sky-600' : 'text-slate-400'}`}>
          <Search size={24} /><span className="text-[10px] font-bold mt-1">সার্চ</span>
        </button>
        <button onClick={() => setActiveTab('notebook')} className={`flex flex-col items-center p-2 ${activeTab === 'notebook' ? 'text-sky-600' : 'text-slate-400'}`}>
          <BookMarked size={24} /><span className="text-[10px] font-bold mt-1">নোটবুক</span>
        </button>
        <button onClick={() => setActiveTab('checker')} className={`flex flex-col items-center p-2 ${activeTab === 'checker' ? 'text-sky-600' : 'text-slate-400'}`}>
          <PenTool size={24} /><span className="text-[10px] font-bold mt-1">যাচাই</span>
        </button>
        <button onClick={() => setActiveTab('assistant')} className={`flex flex-col items-center p-2 ${activeTab === 'assistant' ? 'text-sky-600' : 'text-slate-400'}`}>
          <MessageSquare size={24} /><span className="text-[10px] font-bold mt-1">টিউটর</span>
        </button>
      </div>
    </div>
  );
};

export default App;
