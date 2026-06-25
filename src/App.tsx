import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  RotateCw, 
  Search, 
  Facebook, 
  MoreHorizontal, 
  ThumbsUp, 
  MessageSquare, 
  Send,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Loader2,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchLatestAINews, generateFacebookPost, generateAIImage, AIUpdate, GeneratedPost, FALLBACK_AI_NEWS } from './lib/gemini';

export default function App() {
  const [news, setNews] = useState<AIUpdate[]>(FALLBACK_AI_NEWS);
  const [loadingNews, setLoadingNews] = useState(false);
  const [generatingPost, setGeneratingPost] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<AIUpdate | null>(FALLBACK_AI_NEWS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [tone, setTone] = useState<'professional' | 'enthusiastic' | 'informative' | 'minimalist' | 'visionary' | 'analytical'>('informative');
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async (force: boolean = false) => {
    setLoadingNews(true);
    try {
      const updates = await fetchLatestAINews(force);
      setNews(updates);
      if (updates.length > 0 && (!selectedTopic || !updates.some(u => u.title === selectedTopic.title))) {
        setSelectedTopic(updates[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleGenerate = async () => {
    const topic = customTopic || selectedTopic?.title;
    const url = customUrl || selectedTopic?.url;
    const summaryContext = customTopic || selectedTopic?.summary;
    
    if (!topic) return;

    setGeneratingPost(true);
    setPost(null); 
    try {
      const result = await generateFacebookPost(topic, tone, url, summaryContext);
      setPost(result);
      
      setGeneratingImage(true);
      try {
        const imageUrl = await generateAIImage(result.suggestedImagePrompt);
        setPost(prev => prev ? { ...prev, imageUrl } : null);
      } catch (err) {
        console.error("Image generation failed", err);
      } finally {
        setGeneratingImage(false);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingPost(false);
    }
  };

  const handleCopy = () => {
    if (post) {
      const fullContent = `${post.title}\n\n${post.content}`;
      navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyTitle = () => {
    if (post) {
      navigator.clipboard.writeText(post.title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    }
  };

  const handleCopyContent = () => {
    if (post) {
      navigator.clipboard.writeText(post.content);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  const handleCopyImage = async () => {
    if (post?.imageUrl) {
      try {
        setCopiedImage(false);
        
        // We prepare our Promise of the png blob inside a synchronous wrapper. This maintains
        // the active user gesture window during clipboard write in modern browsers!
        const imagePromise = (async () => {
          const url = post.imageUrl!.startsWith("data:")
            ? post.imageUrl!
            : `/api/proxy-image?url=${encodeURIComponent(post.imageUrl!)}`;

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image via proxy: ${response.statusText}`);
          }
          const blob = await response.blob();

          // Standardize everything to PNG for standard OS clipboard rendering
          if (blob.type === "image/png") {
            return blob;
          }

          // Otherwise, convert any other format to PNG via the canvas
          return new Promise<Blob>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            const objectUrl = URL.createObjectURL(blob);

            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Canvas context is unavailable"));
                return;
              }
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => {
                URL.revokeObjectURL(objectUrl);
                if (b) {
                  resolve(b);
                } else {
                  reject(new Error("Canvas toBlob output is empty"));
                }
              }, "image/png");
            };

            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error("Failed to load processed blob into Image element"));
            };

            img.src = objectUrl;
          });
        })();

        try {
          // 1. Direct synchronous Promise-based Clipboard write.
          // This ensures the write starts while the onClick call stack is active and verified as user-triggered.
          const clipboardItem = new ClipboardItem({
            "image/png": imagePromise
          });
          await navigator.clipboard.write([clipboardItem]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        } catch (promiseWriteError) {
          console.warn("Promise-based ClipboardItem rejected/unsupported. Retrying with resolved blob:", promiseWriteError);

          // 2. Sequential fallback: Wait for the promise to resolve, then try writing.
          const finalBlob = await imagePromise;
          const clipboardItem = new ClipboardItem({
            "image/png": finalBlob
          });
          await navigator.clipboard.write([clipboardItem]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        }

      } catch (err: any) {
        console.warn("Direct binary image copy failed. Falling back to copy link as text:", err);
        try {
          // If binary clipboard operations are explicitly sandboxed/blocked by the browser frame, 
          // perform a text copy of the image URL to provide the user with the direct link.
          await navigator.clipboard.writeText(post.imageUrl);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        } catch (fallbackErr) {
          console.error("All copy strategies failed:", fallbackErr);
        }
      }
    }
  };

  const handleDownloadImage = () => {
    if (post?.imageUrl) {
      const link = document.createElement('a');
      link.href = post.imageUrl;
      link.download = `ai-architect-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRegenerateImage = async () => {
    if (!post) return;
    setGeneratingImage(true);
    try {
      const imageUrl = await generateAIImage(post.suggestedImagePrompt);
      setPost(prev => prev ? { ...prev, imageUrl } : null);
    } catch (err) {
      console.error("Image generation failed", err);
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans text-slate-900 overflow-hidden bg-slate-100">
      {/* Navigation */}
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">AI</div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">FeedGen <span className="text-blue-600">AI</span></h1>
        </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Connected to Global AI Intelligence
          </div>
          <button 
            onClick={() => loadNews(true)}
            disabled={loadingNews}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
            title="Refresh AI News Feed"
          >
            <RotateCw className={`w-5 h-5 ${loadingNews ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Column: News & Settings */}
        <section className="w-1/3 flex flex-col gap-5 min-w-[320px]">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Newspaper className="w-4 h-4 text-blue-500" />
              Latest AI Developments
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">Updated just now</span>
              <button 
                onClick={() => loadNews(true)}
                disabled={loadingNews}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-all disabled:opacity-50 shadow-sm border border-transparent hover:border-slate-200"
                title="Refresh Feed"
              >
                <RotateCw className={`w-3 h-3 ${loadingNews ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {loadingNews && news.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse h-24" />
              ))
            ) : news.length > 0 ? (
              news.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    setSelectedTopic(item);
                    setCustomTopic('');
                    setCustomUrl('');
                  }}
                  className={`p-3 bg-white rounded-xl shadow-sm cursor-pointer transition-all border-2 ${
                    selectedTopic?.title === item.title 
                      ? 'border-blue-500 ring-4 ring-blue-50' 
                      : 'border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-bold tracking-widest ${
                        item.importance === 'high' ? 'text-red-500' :
                        item.importance === 'medium' ? 'text-amber-500' :
                        'text-blue-500'
                      }`}>
                        {item.importance}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">· {item.date}</span>
                    </div>
                    <ChevronRight className={`w-3 h-3 ${selectedTopic?.title === item.title ? 'text-blue-500' : 'text-slate-300'}`} />
                  </div>
                  <h3 className="font-semibold text-[13px] text-slate-800 leading-tight mb-1">{item.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">{item.summary}</p>
                  <div className="flex items-center gap-1 text-[9px] text-blue-600 font-bold overflow-hidden whitespace-nowrap opacity-60">
                    <LinkIcon className="w-2.5 h-2.5" />
                    <span className="truncate">{item.url}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400 font-medium">Feed empty</p>
              </div>
            )}

            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custom Context</span>
              </div>
              <div className="flex flex-col gap-2">
                <textarea 
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    setSelectedTopic(null);
                  }}
                  placeholder="Paste news details manually..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none shadow-inner"
                />
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <LinkIcon className="w-3 h-3 text-slate-400 shrink-0" />
                  <input 
                    type="text"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setSelectedTopic(null);
                    }}
                    placeholder="Reference URL (Optional)"
                    className="w-full text-xs outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Settings Footer */}
          <div className="p-4 bg-slate-800 rounded-xl text-white shadow-lg shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Architect Parameters</div>
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-semibold flex justify-between uppercase tracking-wider opacity-60">
                    Tone & Approach
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['informative', 'enthusiastic', 'professional', 'minimalist', 'visionary', 'analytical'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border ${
                          tone === t 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                            : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              <button
                disabled={(!selectedTopic && !customTopic) || generatingPost}
                onClick={handleGenerate}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                {generatingPost ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>Generate Content</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Preview */}
        <section className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <Sparkles className="text-blue-600 w-5 h-5" />
                <span className="text-sm font-bold text-slate-700">Architect's Post Preview</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCopy}
                disabled={!post}
                className="p-2 hover:bg-slate-200 rounded-md text-slate-500 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center items-start scroll-smooth">
            <AnimatePresence mode="wait">
              {post ? (
                <motion.div
                  key="post"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[500px] bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden"
                >
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
                      GN
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold leading-tight">Facebook Post Generator ni Darren</span>
                        <div className="bg-blue-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                          <Check className="text-white w-2.5 h-2.5" />
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        Just moments ago · <Search className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <button className="ml-auto p-1.5 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="px-4 py-4 text-[15px] leading-relaxed text-slate-800 font-sans tracking-tight space-y-4">
                    {/* Title Section */}
                    <div className="bg-slate-50/85 hover:bg-slate-50 border border-slate-200/60 p-3 rounded-lg relative transition-all group/title">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Post Title</span>
                        <button
                          onClick={handleCopyTitle}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-medium flex items-center gap-1 shrink-0 transition-all opacity-80 hover:opacity-100 active:scale-95 cursor-pointer"
                          title="Copy Title"
                        >
                          {copiedTitle ? (
                            <>
                              <Check className="w-3 h-3 text-green-500" />
                              <span className="text-[10px] text-green-600 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px]">Copy Title</span>
                            </>
                          )}
                        </button>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug select-all">
                        {post.title}
                      </h4>
                    </div>

                    {/* Caption Section */}
                    <div className="bg-slate-50/85 hover:bg-slate-50 border border-slate-200/60 p-3 rounded-lg relative transition-all group/content">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Caption / Post Body</span>
                        <button
                          onClick={handleCopyContent}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-medium flex items-center gap-1 shrink-0 transition-all opacity-80 hover:opacity-100 active:scale-95 cursor-pointer"
                          title="Copy Caption"
                        >
                          {copiedContent ? (
                            <>
                              <Check className="w-3 h-3 text-green-500" />
                              <span className="text-[10px] text-green-600 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px]">Copy Caption</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap text-slate-800 select-all leading-relaxed break-words">
                        {post.content}
                      </div>
                    </div>
                  </div>

                  {/* Image Area */}
                  <div className="mt-2 bg-slate-100 border-y border-slate-200 flex flex-col relative group">
                    {generatingImage ? (
                      <div className="h-64 bg-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">Synthesizing Visuals...</span>
                      </div>
                    ) : post.imageUrl ? (
                      <>
                        <img 
                          src={post.imageUrl} 
                          alt="AI Generated" 
                          referrerPolicy="no-referrer"
                          className="w-full aspect-video object-cover"
                          onError={(e) => {
                            // If Pollinations or Gemini URL fails to load in browser, fall back to beautiful Unsplash AI art
                            const target = e.currentTarget;
                            if (!target.src.includes('images.unsplash.com')) {
                              const fallbackImages = [
                                'photo-1618005182384-a83a8bd57fbe', // Abstract sleek digital neural flows
                                'photo-1620712943543-bcc4688e7485', // Cool AI Processor
                                'photo-1677442136019-21780efad99a', // Futuristic AI Neural Network
                                'photo-1639762681485-074b7f938ba0'  // Cyber-mesh abstract tech geometry
                              ];
                              const randomIndex = Math.floor(Math.random() * fallbackImages.length);
                              target.src = `https://images.unsplash.com/${fallbackImages[randomIndex]}?q=80&w=1024&auto=format&fit=crop`;
                            }
                          }}
                        />
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={handleCopyImage}
                            className={`p-2 rounded-lg backdrop-blur-md shadow-lg border border-white/20 transition-all ${
                              copiedImage ? 'bg-green-500 text-white' : 'bg-white/80 text-slate-700 hover:bg-white'
                            }`}
                            title="Copy Image"
                          >
                            {copiedImage ? <Check className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={handleDownloadImage}
                            className="p-2 bg-white/80 hover:bg-white text-slate-700 rounded-lg backdrop-blur-md shadow-lg border border-white/20 transition-all"
                            title="Download Image"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={handleRegenerateImage}
                            className="p-2 bg-white/80 hover:bg-white text-slate-700 rounded-lg backdrop-blur-md shadow-lg border border-white/20 transition-all"
                            title="Regenerate Image"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="h-64 bg-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <Sparkles className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">Image Generation Prompt</span>
                        <p className="text-[10px] text-slate-500 p-4 text-center">"{post.suggestedImagePrompt}"</p>
                        <button 
                          onClick={handleRegenerateImage}
                          className="mb-4 text-blue-600 font-bold text-xs hover:underline"
                        >
                          Retry Generation
                        </button>
                      </div>
                    )}
                    <div className="p-3 bg-slate-50">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">GEMINI-VISUAL-CORE</div>
                      <div className="text-sm font-bold text-slate-800">Visual Synthesis Active</div>
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between border-b border-slate-200 mx-3">
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1.5">
                        <div className="w-4.5 h-4.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                          <ThumbsUp className="text-white w-2.5 h-2.5" />
                        </div>
                        <div className="w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                          <Sparkles className="text-white w-2.5 h-2.5" />
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 ml-1.5 font-medium">You and 124 others</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">42 Shares</div>
                  </div>

                  <div className="flex p-1 text-slate-500 font-bold text-[13px]">
                    <div className="flex-1 py-2.5 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer transition-colors rounded-md active:scale-95">
                      <ThumbsUp className="w-4 h-4" /> Like
                    </div>
                    <div className="flex-1 py-2.5 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer transition-colors rounded-md active:scale-95">
                      <MessageSquare className="w-4 h-4" /> Comment
                    </div>
                    <div className="flex-1 py-2.5 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer transition-colors rounded-md active:scale-95">
                      <Send className="w-4 h-4 translate-x-0.5" /> Share
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center max-w-sm space-y-4 py-20"
                >
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-lg border border-slate-200 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-slate-200" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Architect's Canvas</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Select a breakthrough from the Intelligence Feed or provide custom context to generate a professional social summary.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
