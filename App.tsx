import React, { useState, useEffect } from "react";
import { analyzeImage } from "./services/geminiService";
import { AnalysisResult, Dimension, HistoryItem, User } from "./types";
import FileUpload from "./components/FileUpload";
import AnalysisDashboard from "./components/AnalysisDashboard";
import HistoryView from "./components/HistoryView";
import AuthModal from "./components/AuthModal";
import HelpView from "./components/HelpView";
import ChatBot from "./components/ChatBot";
import FlyingIcons from "./components/FlyingIcons";
import { authService } from "./services/authService";
import { useToast } from "./components/Toast";
import {
  Layout,
  Sparkles,
  Loader2,
  BarChart3,
  Clock,
  Home,
  ArrowLeft,
  Edit2,
  X,
  ZoomIn,
  LogIn,
  User as UserIcon,
  LogOut,
  HelpCircle,
  MousePointerClick,
  Lightbulb,
  Eye,
} from "lucide-react";

type ViewState = "home" | "analyzing" | "result" | "history" | "help";

const MAX_HISTORY_ITEMS = 5;

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>("home");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [reportTitle, setReportTitle] = useState("分析报告");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gradientPos, setGradientPos] = useState(50);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { showToast } = useToast();

  // Initialize Auth
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Load history based on User (Data Isolation)
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        // Guest mode
        const saved = localStorage.getItem("pem_history_guest");
        if (saved) {
          setHistory(JSON.parse(saved));
        } else {
          setHistory([]);
        }
        return;
      }

      try {
        const response = await fetch('/api/history', {
          headers: { 'x-user-id': user.id }
        });
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        } else {
          const err = await response.json();
          showToast(err.error || "加载历史记录失败", "error");
        }
      } catch (e) {
        console.error("Failed to load history", e);
        showToast("加载历史记录失败，请检查网络", "error");
      }
    };

    fetchHistory();
  }, [user, showToast]); // Re-run when user changes

  useEffect(() => {
    if (result) setReportTitle(result.title || "分析报告");
  }, [result]);

  const saveToHistory = async (newResult: AnalysisResult, imagePreview: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      previewUrl: imagePreview,
      result: newResult,
    };

    if (!user) {
      const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
      setHistory(updatedHistory);
      localStorage.setItem("pem_history_guest", JSON.stringify(updatedHistory));
      return;
    }

    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(newItem)
      });
      if (response.ok) {
        const data = await response.json();
        setHistory([data.item, ...history]);
      } else {
        const err = await response.json();
        showToast(err.error || "保存历史记录失败", "error");
      }
    } catch (e) {
      console.error("Failed to save history", e);
      showToast("保存历史记录失败，请检查网络", "error");
    }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      localStorage.setItem("pem_history_guest", JSON.stringify(updated));
      showToast("记录已删除", "success");
      return;
    }

    try {
      const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (response.ok) {
        setHistory(history.filter((item) => item.id !== id));
        showToast("记录已删除", "success");
      } else {
        const err = await response.json();
        showToast(err.error || "删除记录失败", "error");
      }
    } catch (e) {
      console.error("Failed to delete history", e);
      showToast("删除记录失败，请检查网络", "error");
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setResult(item.result);
    setPreview(item.previewUrl);
    setView("result");
  };

  const handleFileSelect = async (
    base64: string,
    previewUrl: string,
    sourceUrl?: string,
    mimeType: string = "image/jpeg",
  ) => {
    setPreview(previewUrl);
    setView("analyzing");
    setResult(null);
    setProgress(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      setProgress((prev) => {
        const elapsed = Date.now() - startTime;
        const newProgress = 95 * (1 - Math.exp(-elapsed / 8000));
        return Math.min(newProgress, 95);
      });
    }, 100);

    try {
      const data = await analyzeImage(base64, mimeType, sourceUrl);
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(() => {
        setResult(data);
        saveToHistory(data, previewUrl);
        setView("result");
        showToast("分析完成", "success");
      }, 500);
    } catch (error: any) {
      clearInterval(interval);
      showToast(error.message || "分析失败，请稍后重试。", "error");
      setPreview(null);
      setView("home");
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsUserMenuOpen(false);
    setView("home");
    showToast("已退出登录", "info");
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 selection:bg-[#FF8839]/20">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
      />

      {/* Vercel-style Animated SVG Background */}
      <div className="fixed inset-0 -z-10 bg-slate-50 pointer-events-none overflow-hidden flex justify-center">
        {/* Grid - White lines on very light slate background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        {/* Rotating Glow - Larger and more obvious deformation */}
        <div className="absolute top-[-300px] w-[1200px] h-[800px] opacity-40">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#FF8839_0deg,#8b5cf6_120deg,#ec4899_240deg,#FF8839_360deg)] animate-[spin_10s_linear_infinite] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-[100px]"></div>
        </div>
      </div>

      {/* Lightbox (Keep Dark Overlay for Focus) */}
      {isLightboxOpen && preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20">
            <X />
          </button>
          <img
            src={preview}
            className="max-w-full max-h-full object-contain rounded-lg border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Nav */}
      <nav className="bg-white/70 backdrop-blur-xl border-b border-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView("home")}
          >
            {/* Original Logo (No invert) */}
            <img
              src="https://static.zhi-niao.com/static/images/logo_text-175361a7.png"
              alt="logo"
              className="h-10 opacity-90"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setView("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "history" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              <Clock className="w-4 h-4" /> 历史记录
            </button>
            <button
              onClick={() => setView("help")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "help" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              <HelpCircle className="w-4 h-4" /> 帮助文档
            </button>

            {/* Auth Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md border border-white/50 text-slate-800 transition-all shadow-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#FF8839] to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {user.name}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white/80 backdrop-blur-xl border border-white/50 rounded-xl shadow-xl z-20 py-1 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="px-4 py-2 border-b border-slate-100/50">
                        <p className="text-xs text-slate-400">已登录账号</p>
                        <p className="text-sm text-slate-900 truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-white/50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> 退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md border border-white/50 text-slate-800 text-sm font-bold transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4" /> 登录 / 注册
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        {view === "home" && (
          <div 
            className="text-center mb-16 animate-in fade-in slide-in-from-bottom-6 duration-1000"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              setGradientPos((x / rect.width) * 100);
            }}
          >
            <h1 
              className="inline-block text-5xl font-extrabold text-black/90 mb-6 tracking-tight transition-all duration-75 ease-out"
            >
              B端产品易用性度量
            </h1>
            <p className="text-xl text-black/60 max-w-2xl mx-auto leading-relaxed">
              上传高保真原型图，AI 将基于 6 项关键易用性指标进行深度启发式评估。
            </p>
            <div className="max-w-3xl mx-auto mt-12 bg-white/50 backdrop-blur-xl rounded-2xl p-2 border border-white shadow-2xl shadow-slate-200/50">
              <FileUpload onFileSelect={handleFileSelect} isAnalyzing={false} />
            </div>

            {/* Show login hint if guest */}
            {!user && (
              <div className="mt-6 text-sm text-slate-500 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                当前为访客模式，记录仅保存在本地。{" "}
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-[#FF8839] hover:underline font-medium"
                >
                  登录
                </button>{" "}
                以同步数据。
              </div>
            )}
          </div>
        )}

        {view === "history" && (
          <HistoryView
            history={history}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteHistory}
            onBack={() => setView("home")}
            currentUser={user}
          />
        )}

        {view === "help" && <HelpView />}

        {view === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in">
            <div className="relative w-48 h-48 mb-8">
              {/* Flying Icons */}
              <FlyingIcons />

              <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#FF8839"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className="text-5xl font-bold text-slate-800">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">
              深度分析中...
            </h2>
            <p className="text-slate-500 mt-4">
              正在扫描视觉层级、操作路径与信息密度
            </p>
          </div>
        )}

        {view === "result" && result && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView("history")}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                title="返回历史记录"
              >
                <ArrowLeft />
              </button>
              <div className="flex items-center flex-1 max-w-2xl">
                <h1 className="text-2xl font-bold text-slate-900 truncate px-3 py-1.5">
                  {reportTitle || "UI 易用性分析报告"}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              <div className="lg:col-span-1 sticky top-24">
                <div
                  className="bg-white p-3 rounded-2xl border border-slate-200 shadow-lg cursor-zoom-in group"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100">
                    <img
                      src={preview!}
                      className="max-w-full max-h-full object-contain mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="mt-3 text-center text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-[#FF8839] transition-colors">
                    预览原稿
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3">
                <AnalysisDashboard result={result} />
              </div>
            </div>
            {preview && (
              <ChatBot 
                base64Image={preview.split(',')[1]} 
                mimeType={preview.split(';')[0].split(':')[1]} 
                analysisResult={result} 
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
