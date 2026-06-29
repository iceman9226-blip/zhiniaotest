import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { analyzeImage, compareDesignAndDev } from "./services/geminiService";
import { AnalysisResult, Dimension, HistoryItem, User, ComparisonResult } from "./types";
import FileUpload from "./components/FileUpload";
import DualFileUpload from "./components/DualFileUpload";
import AnalysisDashboard from "./components/AnalysisDashboard";
import ComparisonDashboard from "./components/ComparisonDashboard";
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

const compressForHistory = (base64Str: string | null): Promise<string | null> => {
  if (!base64Str) return Promise.resolve(null);
  if (base64Str.length < 50 * 1024) return Promise.resolve(base64Str);
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const MAX_DIM = 480; // Small size for history thumbnail to avoid API payload limits
      if (width > height && width > MAX_DIM) {
        height *= MAX_DIM / width;
        width = MAX_DIM;
      } else if (height > MAX_DIM) {
        width *= MAX_DIM / height;
        height = MAX_DIM;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.5)); // 0.5 quality is perfect for preview thumbnails
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>("home");
  const [appMode, setAppMode] = useState<'usability' | 'ui-qa'>('usability');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [devPreview, setDevPreview] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [reportTitle, setReportTitle] = useState("分析报告");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [gradientPos, setGradientPos] = useState(50);
  const [userDescription, setUserDescription] = useState("");

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { showToast } = useToast();

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsUserMenuOpen(false);
    setView("home");
    showToast("已退出登录", "info");
  };

  const handleApiError = (err: any) => {
    if (err.status === 401 || err.message?.includes("Unauthorized")) {
      handleLogout();
      showToast("会话已过期，请重新登录", "error");
      return true;
    }
    if (err.status === 500 && err.supabaseError) {
      showToast(`数据库错误: ${err.supabaseError}`, "error");
      return true;
    }
    return false;
  };

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
          if (!handleApiError({ status: response.status, ...err })) {
            showToast(err.error || "加载历史记录失败", "error");
          }
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

  const saveToHistory = async (newResult: AnalysisResult | null, imagePreview: string, overrideMode?: 'usability' | 'ui-qa', compData?: ComparisonResult, devImagePreview?: string) => {
    // Compress both image previews for history payload reduction
    const compressedPreview = await compressForHistory(imagePreview);
    const compressedDevPreview = devImagePreview ? await compressForHistory(devImagePreview) : undefined;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      previewUrl: compressedPreview || imagePreview,
      devPreviewUrl: compressedDevPreview || devImagePreview,
      result: newResult as AnalysisResult,
      comparisonResult: compData,
      mode: overrideMode || appMode,
    };

    if (!user) {
      try {
        const newHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem("pem_history_guest", JSON.stringify(newHistory));
        setHistory(newHistory);
      } catch (e) {
        console.error("Failed to save to localStorage", e);
        showToast("图片过大，无法保存到本地历史记录。建议登录后保存。", "error");
        // Still update state so it's visible in current session
        setHistory(prev => [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
      }
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
        setHistory(prev => [data.item, ...prev]);
      } else {
        const err = await response.json();
        if (!handleApiError({ status: response.status, ...err })) {
          showToast(err.error || "保存历史记录失败", "error");
        }
      }
    } catch (e) {
      console.error("Failed to save history", e);
      showToast("保存历史记录失败，请检查网络", "error");
    }
  };

  const handleCompareStart = async (designBase64: string, devBase64: string, mimeType: string) => {
    setPreview(`data:${mimeType};base64,${designBase64}`); // Use design as preview
    setDevPreview(`data:${mimeType};base64,${devBase64}`);
    setView("analyzing");
    setComparisonResult(null);
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
      const data = await compareDesignAndDev(designBase64, devBase64, mimeType);
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(() => {
        setComparisonResult(data);
        saveToHistory(null, `data:${mimeType};base64,${designBase64}`, 'ui-qa', data, `data:${mimeType};base64,${devBase64}`);
        setView("result");
        showToast("走查完成", "success");
      }, 500);
    } catch (error: any) {
      clearInterval(interval);
      showToast(error.message || "走查失败，请稍后重试。", "error");
      setView("home");
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
        if (!handleApiError({ status: response.status, ...err })) {
          showToast(err.error || "删除记录失败", "error");
        }
      }
    } catch (e) {
      console.error("Failed to delete history", e);
      showToast("删除记录失败，请检查网络", "error");
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setDevPreview(item.devPreviewUrl || null);
    if (item.mode === 'ui-qa' && item.comparisonResult) {
      setComparisonResult(item.comparisonResult);
      setAppMode('ui-qa');
    } else {
      setResult(item.result);
      setAppMode('usability');
    }
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
      const data = await analyzeImage(base64, mimeType, sourceUrl, userDescription);
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(() => {
        setResult(data);
        saveToHistory(data, previewUrl);
        setView("result");
        setUserDescription("");
        showToast("分析完成", "success");
      }, 500);
    } catch (error: any) {
      clearInterval(interval);
      showToast(error.message || "分析失败，请稍后重试。", "error");
      setPreview(null);
      setView("home");
    }
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
        {view === 'home' && (
          <div className="absolute top-[-300px] w-[1200px] h-[800px] opacity-40">
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#FF8839_0deg,#8b5cf6_120deg,#ec4899_240deg,#FF8839_360deg)] animate-[spin_10s_linear_infinite] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-[100px]"></div>
          </div>
        )}
      </div>

      {/* Lightbox (Keep Dark Overlay for Focus) */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 cursor-pointer">
            <X />
          </button>
          <img
            src={lightboxImage}
            className="max-w-full max-h-full object-contain rounded-lg border border-slate-700 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Nav */}
      <nav className="bg-white/70 backdrop-blur-xl border-b border-white fixed top-0 left-0 right-0 z-50">
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

          <div className="flex-1 hidden md:flex justify-center items-center">
            <div className="relative p-1 bg-slate-900/5 backdrop-blur-xl rounded-full border border-white/40 flex items-center shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]">
              <div className="relative flex items-center">
                <button
                  onClick={() => { setAppMode('usability'); setView("home"); }}
                  className={`relative z-10 px-5 py-1.5 rounded-full text-sm font-bold transition-colors duration-300 ${appMode === 'usability' ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  易用性评估
                </button>
                <button
                  onClick={() => { setAppMode('ui-qa'); setView("home"); }}
                  className={`relative z-10 px-5 py-1.5 rounded-full text-sm font-bold transition-colors duration-300 ${appMode === 'ui-qa' ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  UI 还原度走查
                </button>
                
                {/* Active Highlight - Liquid Glass Animation */}
                <motion.div
                  className="absolute inset-0 z-0 bg-gradient-to-br from-[#FF8839] to-[#FF6B00] rounded-full shadow-lg shadow-[#FF8839]/20"
                  initial={false}
                  animate={{
                    x: appMode === 'usability' ? 0 : '100%',
                    width: '50%'
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("history")}
              className={`p-2 rounded-full transition-all active:scale-95 ${view === "history" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
              title="历史记录"
            >
              <Clock className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView("help")}
              className={`p-2 rounded-full transition-all active:scale-95 ${view === "help" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
              title="帮助文档"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Auth Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 text-slate-800 transition-all active:scale-95"
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
                      className="fixed inset-0 z-10 cursor-pointer"
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
                className="flex items-center gap-1.5 text-slate-800 text-sm font-bold transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" /> 登录 / 注册
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative mt-16">
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
              {appMode === 'usability' ? 'B端产品易用性度量' : 'UI 设计还原度走查'}
            </h1>
            <p className="text-xl text-black/60 max-w-2xl mx-auto leading-relaxed">
              {appMode === 'usability' 
                ? '上传高保真原型图，AI 将基于 6 项关键易用性指标进行深度启发式评估。' 
                : '上传设计原稿与实际开发环境截图，AI 自动检测视觉和布局差异。'}
            </p>
            <div className="max-w-4xl mx-auto mt-12 bg-white/50 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-2xl shadow-slate-200/50">
              {appMode === 'usability' ? (
                <FileUpload onFileSelect={handleFileSelect} isAnalyzing={false} />
              ) : (
                <DualFileUpload onCompareStart={handleCompareStart} isAnalyzing={false} />
              )}
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

        {view === "help" && <HelpView onBack={() => setView("home")} />}

        {view === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-20 min-h-[520px] animate-in fade-in duration-500">
            {/* The Cinematic Scanner Container (Element 2: Background Grid) */}
            <div className="relative w-full max-w-xl aspect-[1.4] md:aspect-[1.618] flex flex-col items-center justify-center p-8 mb-10 overflow-hidden rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] bg-white/40 backdrop-blur-xl">
              
              {/* Grid Backdrop Frame */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                {/* Tech Grid Pattern */}
                <div 
                  className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,136,57,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,136,57,0.06)_1px,transparent_1px)] bg-[size:24px_24px]"
                />
                
                {/* Center Radial Soft Vignette */}
                <div className="absolute inset-0 bg-radial-gradient from-white/90 via-white/40 to-transparent" />

                {/* Element 2: Horizontal neon-orange scanning line moving top-to-bottom across grid with ease-in-out */}
                <motion.div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF8839] via-50% to-transparent shadow-[0_0_16px_5px_rgba(255,136,57,0.45)] z-10"
                  animate={{
                    top: ["0%", "100%", "0%"]
                  }}
                  transition={{
                    duration: 3.5,
                    ease: "easeInOut",
                    repeat: Infinity
                  }}
                />
              </div>

              {/* Element 1: Center Circular Orbit with Numeric Percentage & Photon */}
              <div className="relative z-20 flex items-center justify-center">
                
                {/* Razor-thin Orbit Ring */}
                <div className="relative w-56 h-56 rounded-full border border-[#FF8839]/20 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                  
                  {/* Subtle soft glowing back-halo */}
                  <div className="absolute inset-0 rounded-full bg-radial-gradient from-[#FF8839]/5 to-transparent blur-lg" />

                  {/* Linear rotating photon ring container */}
                  <motion.div 
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 4,
                      ease: "linear",
                      repeat: Infinity
                    }}
                  >
                    {/* Glowing Photon Particle exact-centered on orbit boundary */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-gradient-to-r from-[#FF8839] to-[#FF6B00] rounded-full shadow-[0_0_12px_4px_rgba(255,136,57,0.7)] border-2 border-white" />
                  </motion.div>

                  {/* Inner breathing Glass Orb holding the numeric percentage */}
                  <div className="absolute inset-2.5 bg-white/75 backdrop-blur-2xl rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.04),inset_0_2px_4px_rgba(255,255,255,0.85)] border border-white/60 flex flex-col items-center justify-center">
                    
                    {/* Element 1 (Center) Breathing scale effect */}
                    <motion.div
                      className="flex flex-col items-center justify-center text-center"
                      animate={{
                        scale: [1, 1.03, 1],
                        opacity: [0.95, 1, 0.95]
                      }}
                      transition={{
                        duration: 2.5,
                        ease: "easeInOut",
                        repeat: Infinity
                      }}
                    >
                      <span className="text-6xl font-extrabold tracking-tight text-slate-800 tabular-nums">
                        {Math.round(progress)}<span className="text-3xl font-medium text-slate-400 ml-0.5">%</span>
                      </span>
                      
                      {/* Premium Technical Subtext */}
                      <span className="text-[10px] font-bold text-[#FF8839] uppercase tracking-[0.25em] font-mono mt-1">
                        Analyzing
                      </span>
                    </motion.div>

                  </div>

                </div>

              </div>

            </div>

            {/* Tech-SaaS Description text */}
            <div className="text-center space-y-2 relative z-20">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {appMode === 'usability' ? 'UI 易用性智能评估中' : '界面设计还原度走查中'}
              </h2>
              <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                {appMode === 'usability' 
                  ? '正在扫描视觉层级、操作热区与核心认知负荷因子...' 
                  : '正在逐像素对齐设计规范，计算布局偏差与样式差异...'}
              </p>
            </div>
          </div>
        )}

        {view === "result" && (result || comparisonResult) && (
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
                  {appMode === 'usability' ? (reportTitle || "UI 易用性分析报告") : "UI设计还原度走查报告"}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              <div className="lg:col-span-1 sticky top-24 flex gap-4 overflow-x-auto lg:flex-col pb-2 lg:pb-0">
                <div
                  className="bg-white p-3 rounded-2xl border border-slate-200 shadow-lg cursor-pointer group flex-shrink-0 w-64 lg:w-auto"
                  onClick={() => setLightboxImage(preview)}
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100 relative">
                    <img
                      src={preview!}
                      className="max-w-full max-h-full object-contain mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    {appMode === 'ui-qa' && (
                       <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">设计稿</div>
                    )}
                  </div>
                  <div className="mt-3 text-center text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-[#FF8839] transition-colors font-semibold">
                    {appMode === 'usability' ? '预览原稿' : '预览设计图'}
                  </div>
                </div>
                
                {appMode === 'ui-qa' && devPreview && (
                  <div
                    className="bg-white p-3 rounded-2xl border border-slate-200 shadow-lg cursor-pointer group flex-shrink-0 w-64 lg:w-auto"
                    onClick={() => setLightboxImage(devPreview)}
                  >
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100 relative">
                      <img
                        src={devPreview}
                        className="max-w-full max-h-full object-contain mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                       <div className="absolute bottom-2 right-2 bg-[#FF8839]/90 text-white text-xs px-2 py-1 rounded shadow-sm">开发截图</div>
                    </div>
                    <div className="mt-3 text-center text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-[#FF8839] transition-colors font-semibold">
                      预览开发图
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-3">
                {appMode === 'usability' && result && <AnalysisDashboard result={result} />}
                {appMode === 'ui-qa' && comparisonResult && <ComparisonDashboard result={comparisonResult} />}
              </div>
            </div>
            {appMode === 'usability' && preview && result && (
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
