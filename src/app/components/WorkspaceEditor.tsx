import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Type, Sparkles, LayoutGrid, Palette, Layers, 
  Move, ZoomIn, Search, Send, Grid, Wand2, X, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";

// Types for our Mock Editor State
type SlideElement = {
  id: string;
  type: "text" | "box" | "image";
  content?: string;
  style?: Record<string, any>;
  isBentoCard?: boolean;
};

// Design Tokens (Moodboard Themes)
const THEMES = {
  "apple-frost": {
    name: "Apple 霜白",
    bg: "#F5F5F7",
    surface: "#FFFFFF",
    surfaceHighlight: "#F5F5F7",
    textMain: "#1D1D1F",
    textMuted: "#86868B",
    primary: "#0066CC", // Apple blue
    accent: "#FF3B30", 
    radius: "24px",
    border: "1px solid rgba(0,0,0,0.05)",
    shadow: "0 10px 40px rgba(0,0,0,0.04)",
  },
  "morandi-green": {
    name: "莫兰迪绿",
    bg: "#EAECE8",
    surface: "#F4F5F3",
    surfaceHighlight: "#E2E5E0",
    textMain: "#4A5348",
    textMuted: "#889485",
    primary: "#6B7C67",
    accent: "#D4A373",
    radius: "16px",
    border: "1px solid rgba(107,124,103,0.15)",
    shadow: "0 8px 32px rgba(107,124,103,0.08)",
  },
  "cyber-hacker": {
    name: "未来黑客",
    bg: "#0A0A0A",
    surface: "#141414",
    surfaceHighlight: "#1F1F1F",
    textMain: "#F3F4F6",
    textMuted: "#9CA3AF",
    primary: "#10B981", // Emerald
    accent: "#8B5CF6", // Purple
    radius: "8px",
    border: "1px solid rgba(16,185,129,0.3)",
    shadow: "0 0 30px rgba(16,185,129,0.15)",
  }
};
type ThemeKey = keyof typeof THEMES;

// Base Structural Elements (No hardcoded colors, only grid placement)
const INITIAL_BASE_ELEMENTS: SlideElement[] = [
  { id: "bg", type: "box", style: { width: "100%", height: "100%", position: "absolute", zIndex: "0" } },
  { id: "header_title", type: "text", content: "痛点分析：传统设计的瓶颈", style: { fontSize: "48px", fontWeight: "800", position: "absolute", top: "40px", left: "60px", zIndex: "1" } },
  { id: "header_subtitle", type: "text", content: "为什么我们需要一次工具范式的革命？", style: { fontSize: "24px", fontWeight: "500", position: "absolute", top: "110px", left: "60px", zIndex: "1" } },
  
  // Card 1
  { id: "card1_bg", type: "box", isBentoCard: true, style: { position: "absolute", top: "180px", left: "60px", width: "540px", height: "420px", zIndex: "1", padding: "40px" } },
  { id: "card1_num", type: "text", content: "1", style: { fontSize: "24px", fontWeight: "bold", borderRadius: "16px", padding: "12px 24px", position: "absolute", top: "220px", left: "100px", zIndex: "2" } },
  { id: "card1_title", type: "text", content: "效率低下", style: { fontSize: "36px", fontWeight: "bold", position: "absolute", top: "300px", left: "100px", zIndex: "2" } },
  { id: "card1_desc", type: "text", content: "大量重复性的排版修改、图片对齐与字体调整，占用了设计师70%以上的宝贵时间，产生巨大沟通成本。", style: { fontSize: "20px", position: "absolute", top: "360px", left: "100px", width: "460px", lineHeight: "1.6", zIndex: "2" } },
  
  // Card 2
  { id: "card2_bg", type: "box", isBentoCard: true, style: { position: "absolute", top: "180px", left: "640px", width: "420px", height: "195px", zIndex: "1", padding: "30px" } },
  { id: "card2_num", type: "text", content: "2", style: { fontSize: "20px", fontWeight: "bold", borderRadius: "12px", padding: "8px 16px", position: "absolute", top: "210px", left: "670px", zIndex: "2" } },
  { id: "card2_title", type: "text", content: "灵感枯竭", style: { fontSize: "28px", fontWeight: "bold", position: "absolute", top: "210px", left: "740px", zIndex: "2" } },
  { id: "card2_desc", type: "text", content: "面对新的业务需求，往往缺乏创意切入点，难以提供高质量视觉隐喻。", style: { fontSize: "16px", position: "absolute", top: "260px", left: "670px", width: "360px", lineHeight: "1.6", zIndex: "2" } },

  // Card 3
  { id: "card3_bg", type: "box", isBentoCard: true, style: { position: "absolute", top: "405px", left: "640px", width: "420px", height: "195px", zIndex: "1", padding: "30px" } },
  { id: "card3_num", type: "text", content: "3", style: { fontSize: "20px", fontWeight: "bold", borderRadius: "12px", padding: "8px 16px", position: "absolute", top: "435px", left: "670px", zIndex: "2" } },
  { id: "card3_title", type: "text", content: "规范约束", style: { fontSize: "28px", fontWeight: "bold", position: "absolute", top: "435px", left: "740px", zIndex: "2" } },
  { id: "card3_desc", type: "text", content: "难以快速统一大规模资产，组件复用率低，最终输出结果常常存在像素误差。", style: { fontSize: "16px", position: "absolute", top: "485px", left: "670px", width: "360px", lineHeight: "1.6", zIndex: "2" } },
];

// Definition of smooth layouts
const LAYOUT_CONFIGS: Record<string, Record<string, Record<string, any>>> = {
  "bento-asym": {
    "header_title": { top: "40px", left: "60px" },
    "header_subtitle": { top: "110px", left: "60px" },
    "card1_bg": { top: "180px", left: "60px", width: "540px", height: "420px" },
    "card1_num": { top: "220px", left: "100px" },
    "card1_title": { top: "300px", left: "100px" },
    "card1_desc": { top: "360px", left: "100px", width: "460px" },
    "card2_bg": { top: "180px", left: "640px", width: "420px", height: "195px" },
    "card2_num": { top: "210px", left: "670px" },
    "card2_title": { top: "210px", left: "740px" },
    "card2_desc": { top: "260px", left: "670px", width: "360px" },
    "card3_bg": { top: "405px", left: "640px", width: "420px", height: "195px" },
    "card3_num": { top: "435px", left: "670px" },
    "card3_title": { top: "435px", left: "740px" },
    "card3_desc": { top: "485px", left: "670px", width: "360px" },
  },
  "bento-col": {
    "header_title": { top: "40px", left: "60px" },
    "header_subtitle": { top: "110px", left: "60px" },
    "card1_bg": { top: "180px", left: "60px", width: "320px", height: "420px" },
    "card1_num": { top: "210px", left: "90px" },
    "card1_title": { top: "280px", left: "90px" },
    "card1_desc": { top: "330px", left: "90px", width: "260px" },
    "card2_bg": { top: "180px", left: "400px", width: "320px", height: "420px" },
    "card2_num": { top: "210px", left: "430px" },
    "card2_title": { top: "280px", left: "430px" },
    "card2_desc": { top: "330px", left: "430px", width: "260px" },
    "card3_bg": { top: "180px", left: "740px", width: "320px", height: "420px" },
    "card3_num": { top: "210px", left: "770px" },
    "card3_title": { top: "280px", left: "770px" },
    "card3_desc": { top: "330px", left: "770px", width: "260px" },
  },
  "bento-row": {
    "header_title": { top: "40px", left: "60px" },
    "header_subtitle": { top: "110px", left: "60px" },
    "card1_bg": { top: "180px", left: "60px", width: "1000px", height: "125px" },
    "card1_num": { top: "210px", left: "90px" },
    "card1_title": { top: "220px", left: "160px" },
    "card1_desc": { top: "230px", left: "320px", width: "650px" },
    "card2_bg": { top: "325px", left: "60px", width: "1000px", height: "125px" },
    "card2_num": { top: "355px", left: "90px" },
    "card2_title": { top: "365px", left: "160px" },
    "card2_desc": { top: "375px", left: "320px", width: "650px" },
    "card3_bg": { top: "470px", left: "60px", width: "1000px", height: "125px" },
    "card3_num": { top: "500px", left: "90px" },
    "card3_title": { top: "510px", left: "160px" },
    "card3_desc": { top: "520px", left: "320px", width: "650px" },
  }
};

const applyThemeToElements = (elements: SlideElement[], themeKey: ThemeKey) => {
  const theme = THEMES[themeKey];
  return elements.map(el => {
    let newStyle = { ...el.style };
    
    // Inject Theme Tokens (Dynamic Color Application)
    if (el.id === "bg") {
      newStyle.backgroundColor = theme.bg;
    } else if (el.id === "header_title") {
      newStyle.color = theme.textMain;
    } else if (el.id === "header_subtitle") {
      newStyle.color = theme.textMuted;
    } else if (el.isBentoCard) {
      newStyle.backgroundColor = theme.surface;
      newStyle.border = theme.border;
      newStyle.borderRadius = theme.radius;
      newStyle.boxShadow = theme.shadow;
    } else if (el.id.endsWith("_num")) {
      newStyle.color = theme.primary;
      newStyle.backgroundColor = theme.surfaceHighlight;
    } else if (el.id.endsWith("_title")) {
      newStyle.color = theme.textMain;
    } else if (el.id.endsWith("_desc")) {
      newStyle.color = theme.textMuted;
    }

    return { ...el, style: newStyle };
  });
};

export function WorkspaceEditor() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("apple-frost");
  const [elements, setElements] = useState<SlideElement[]>(INITIAL_BASE_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"design" | "ai">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [zoom, setZoom] = useState(0.85);
  const [activeLayout, setActiveLayout] = useState("bento-asym");
  const [isAiLayoutComputing, setIsAiLayoutComputing] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentationSlide, setPresentationSlide] = useState(1);

  useEffect(() => {
    const handler = (e: any) => {
      setIsPresenting(true);
      setPresentationSlide(e.detail.fromCurrent ? 3 : 1);
    };
    window.addEventListener('start-presentation', handler);
    return () => window.removeEventListener('start-presentation', handler);
  }, []);

  useEffect(() => {
    if (!isPresenting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPresenting(false);
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setPresentationSlide(s => Math.min(5, s + 1));
      }
      if (e.key === 'ArrowLeft') {
        setPresentationSlide(s => Math.max(1, s - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting]);

  // Re-apply theme dynamically whenever the theme string changes
  useEffect(() => {
    setElements(prev => applyThemeToElements(prev, activeTheme));
  }, [activeTheme]);

  const selectedElement = elements.find(e => e.id === selectedId);

  // Standard Template Application
  const handleApplyLayout = (layoutId: string) => {
    setActiveLayout(layoutId);
    const layoutConfig = LAYOUT_CONFIGS[layoutId];
    if (layoutConfig) {
      setElements(elements.map(el => {
        if (layoutConfig[el.id]) {
          return { ...el, style: { ...el.style, ...layoutConfig[el.id] } };
        }
        return el;
      }));
    }
  };

  // 模拟基于后端的动态 JSON 渲染 (AI Layout Calculation)
  const handleAiComputeLayout = () => {
    setIsAiLayoutComputing(true);
    
    // Simulate API Delay
    setTimeout(() => {
      // Mocking a payload that a backend AI would return as dynamic grid areas
      const randomLayouts = [
        {
          card1_bg: { top: "180px", left: "60px", width: "600px", height: "420px" },
          card1_num: { top: "220px", left: "100px" },
          card1_title: { top: "300px", left: "100px" },
          card1_desc: { top: "360px", left: "100px", width: "520px" },
          card2_bg: { top: "180px", left: "680px", width: "380px", height: "200px" },
          card2_num: { top: "210px", left: "710px" },
          card2_title: { top: "210px", left: "780px" },
          card2_desc: { top: "260px", left: "710px", width: "320px" },
          card3_bg: { top: "400px", left: "680px", width: "380px", height: "200px" },
          card3_num: { top: "430px", left: "710px" },
          card3_title: { top: "430px", left: "780px" },
          card3_desc: { top: "480px", left: "710px", width: "320px" },
        },
        {
          card1_bg: { top: "180px", left: "60px", width: "490px", height: "220px" },
          card1_num: { top: "210px", left: "90px" },
          card1_title: { top: "210px", left: "160px" },
          card1_desc: { top: "260px", left: "90px", width: "430px" },
          card2_bg: { top: "180px", left: "570px", width: "490px", height: "220px" },
          card2_num: { top: "210px", left: "600px" },
          card2_title: { top: "210px", left: "670px" },
          card2_desc: { top: "260px", left: "600px", width: "430px" },
          card3_bg: { top: "420px", left: "60px", width: "1000px", height: "180px" },
          card3_num: { top: "450px", left: "90px" },
          card3_title: { top: "450px", left: "160px" },
          card3_desc: { top: "500px", left: "90px", width: "900px" },
        },
        {
          card2_bg: { top: "180px", left: "60px", width: "420px", height: "195px" },
          card2_num: { top: "210px", left: "90px" },
          card2_title: { top: "210px", left: "160px" },
          card2_desc: { top: "260px", left: "90px", width: "360px" },
          card3_bg: { top: "405px", left: "60px", width: "420px", height: "195px" },
          card3_num: { top: "435px", left: "90px" },
          card3_title: { top: "435px", left: "160px" },
          card3_desc: { top: "485px", left: "90px", width: "360px" },
          card1_bg: { top: "180px", left: "500px", width: "560px", height: "420px" },
          card1_num: { top: "220px", left: "540px" },
          card1_title: { top: "300px", left: "540px" },
          card1_desc: { top: "360px", left: "540px", width: "480px" },
        }
      ];
      
      const randomPayload = randomLayouts[Math.floor(Math.random() * randomLayouts.length)];
      setActiveLayout("ai-dynamic");
      
      setElements(elements.map(el => {
        if (randomPayload[el.id as keyof typeof randomPayload]) {
          return { ...el, style: { ...el.style, ...randomPayload[el.id as keyof typeof randomPayload] } };
        }
        return el;
      }));
      
      setIsAiLayoutComputing(false);
    }, 1200);
  };

  const handleContentChange = (newContent: string) => {
    if (!selectedId) return;
    setElements(elements.map(e => e.id === selectedId ? { ...e, content: newContent } : e));
  };

  const handleAiEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || !selectedId || !selectedElement) return;

    setIsAiLoading(true);
    setTimeout(() => {
      let newContent = selectedElement.content || "";
      if (aiPrompt.includes("冲击力") || aiPrompt.includes("精简")) {
        newContent = "效率黑洞：排版耗时超70%，沟通成本指数级膨胀。";
      } else {
        newContent = "✨ [AI改写] " + aiPrompt.slice(0, 10) + "...";
      }
      setElements(elements.map(el => el.id === selectedId ? { ...el, content: newContent } : el));
      setIsAiLoading(false);
      setAiPrompt("");
    }, 1500);
  };

  const isDarkMode = activeTheme === 'cyber-hacker';

  return (
    <>
      <AnimatePresence>
        {isPresenting && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
          >
            {/* Click Zones */}
            <div className="absolute inset-y-0 left-0 w-[15vw] cursor-pointer z-50 hover:bg-white/5 transition-colors flex items-center justify-start px-4 text-white/0 hover:text-white/50" onClick={() => setPresentationSlide(s => Math.max(1, s - 1))}>
               <ChevronLeft size={48} />
            </div>
            <div className="absolute inset-y-0 right-0 w-[15vw] cursor-pointer z-50 hover:bg-white/5 transition-colors flex items-center justify-end px-4 text-white/0 hover:text-white/50" onClick={() => setPresentationSlide(s => Math.min(5, s + 1))}>
               <ChevronRight size={48} />
            </div>

            {/* Canvas scaled to fit */}
            <div className="w-[1120px] h-[630px] shrink-0 bg-neutral-900 flex items-center justify-center shadow-2xl relative" style={{ transform: `scale(calc(min(100vw / 1120, 100vh / 630)))` }}>
              {presentationSlide === 3 ? (
                <div className="absolute inset-0 w-full h-full bg-white shadow-2xl relative overflow-hidden origin-center rounded-sm">
                  {elements.map((el) => {
                    if (el.id === "bg") return <div key={el.id} style={el.style} />;
                    return (
                      <div
                        key={el.id}
                        style={{ ...el.style, pointerEvents: 'none' }}
                      >
                        {el.content}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-white">
                  <h1 className="text-6xl font-bold opacity-50 mb-6">幻灯片 {presentationSlide}</h1>
                  <p className="text-neutral-500">（演示预演占位符，真实开发将渲染其他页面）</p>
                </div>
              )}
            </div>

            {/* Bottom Progress */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${presentationSlide === i ? 'bg-white scale-125' : 'bg-white/30'}`} />
              ))}
            </div>

            {/* Close */}
            <button 
              onClick={() => setIsPresenting(false)}
              className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex h-full w-full ${isDarkMode ? 'bg-[#111111]' : 'bg-[#E5E5E5]'} overflow-hidden select-none font-sans transition-colors duration-500`}>
      
      {/* Left Sidebar: Slide Thumbnails */}
      <div className={`w-[260px] border-r flex flex-col shrink-0 z-10 shadow-2xl transition-colors duration-500 ${isDarkMode ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-300 bg-[#F5F5F5]'}`}>
        <div className={`p-4 border-b flex items-center justify-between transition-colors duration-500 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-300'}`}>
          <h3 className={`font-semibold flex items-center gap-2 text-sm tracking-wide ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>
            <Layers size={16} className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'} />
            幻灯片大纲
          </h3>
          <button className={`${isDarkMode ? 'text-neutral-500 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'} transition-colors`}>
            <LayoutGrid size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className={`relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 ${
                i === 3 
                  ? (isDarkMode ? "ring-2 ring-indigo-500 bg-[#222]" : "ring-2 ring-blue-500 bg-white shadow-sm") 
                  : (isDarkMode ? "hover:bg-[#1A1A1A]" : "hover:bg-neutral-200")
              } p-2`}
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`text-xs font-mono ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>{i}</span>
                <span className={`text-xs font-medium truncate ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {i === 3 ? "痛点分析：传统设计的..." : `Slide ${i}`}
                </span>
              </div>
              <div className={`aspect-video rounded-md overflow-hidden relative shadow-sm border opacity-80 group-hover:opacity-100 transition-opacity ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
              }`}>
                {i === 3 && (
                  <div className="absolute inset-0 p-2 pointer-events-none transform scale-[0.25] origin-top-left flex flex-col gap-2">
                    <div className={`w-48 h-6 rounded ${isDarkMode ? 'bg-neutral-600' : 'bg-neutral-300'}`}></div>
                    <div className="flex gap-2 h-32">
                      <div className={`w-1/2 h-full rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-blue-100'}`}></div>
                      <div className="w-1/2 flex flex-col gap-2">
                         <div className={`h-1/2 rounded-xl ${isDarkMode ? 'bg-teal-500/20' : 'bg-green-100'}`}></div>
                         <div className={`h-1/2 rounded-xl ${isDarkMode ? 'bg-rose-500/20' : 'bg-red-100'}`}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center Workspace: Infinite Canvas */}
      <div 
        className={`flex-1 relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-200'}`}
        style={{
          backgroundImage: isDarkMode 
            ? 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)'
            : 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelectedId(null);
        }}
      >
        {/* Toolbar */}
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 backdrop-blur-md border rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl z-20 transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E]/90 border-white/10 text-neutral-400' : 'bg-white/90 border-neutral-200 text-neutral-500'
        }`}>
          <button className={`p-2.5 rounded-full transition-colors tooltip-trigger relative group ${isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-100 hover:text-neutral-900'}`}>
            <Move size={18} />
          </button>
          <button className={`p-2.5 rounded-full transition-colors tooltip-trigger relative group ${isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-100 hover:text-neutral-900'}`}>
            <Type size={18} />
          </button>
          <div className={`w-px h-5 mx-2 ${isDarkMode ? 'bg-white/10' : 'bg-neutral-200'}`}></div>
          <button className={`p-2.5 rounded-full transition-colors tooltip-trigger relative group ${isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-100 hover:text-neutral-900'}`}>
            <Search size={18} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className={`absolute bottom-6 left-6 backdrop-blur-md border rounded-xl flex items-center gap-1 p-1.5 shadow-2xl z-20 transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E]/90 border-white/10 text-neutral-400' : 'bg-white/90 border-neutral-200 text-neutral-500'
        }`}>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}><ZoomIn size={16} className="rotate-180" /></button>
          <span className={`text-xs font-mono w-12 text-center ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}><ZoomIn size={16} /></button>
        </div>

        {/* Canvas Area */}
        <div 
          className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
          onPointerDown={(e) => {
             if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          {/* The Slide Container */}
          <div className="w-[1120px] h-[630px] relative overflow-hidden origin-center rounded-sm transition-all duration-700 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
            {elements.map((el) => {
              const isSelected = selectedId === el.id;
              
              if (el.id === "bg") {
                return <motion.div layout key={el.id} style={el.style} onClick={() => setSelectedId(null)} transition={{ type: "spring", bounce: 0, duration: 0.6 }} />;
              }

              return (
                <motion.div
                  key={el.id}
                  layout
                  transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(el.id);
                    if (el.type === 'text') setActiveTab('ai');
                  }}
                  className={`cursor-pointer transition-shadow ${
                    isSelected ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent shadow-2xl z-50" : "hover:ring-2 hover:ring-indigo-300/50 hover:shadow-lg"
                  }`}
                  style={{
                    ...el.style,
                    pointerEvents: 'auto',
                    transition: 'color 0.6s, background-color 0.6s, border-color 0.6s, border-radius 0.6s, box-shadow 0.6s'
                  }}
                >
                  {el.content}
                  
                  {/* Floating Selection Controls */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute -top-14 left-0 border rounded-xl shadow-2xl p-1.5 flex gap-1 z-[60] ${
                          isDarkMode ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-neutral-200'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          onClick={() => setActiveTab('ai')}
                          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors ${
                            isDarkMode ? 'hover:bg-white/10 text-indigo-400' : 'hover:bg-neutral-100 text-indigo-600'
                          }`}
                        >
                          <Sparkles size={14} /> AI 润色
                        </button>
                        <div className={`w-px h-4 self-center mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-neutral-200'}`}></div>
                        <button className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? 'hover:bg-white/10 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-500'
                        }`}>
                          <Palette size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar: Contextual Properties & AI Copilot OR Layout Moodboard */}
      <div className={`w-[340px] border-l flex flex-col shrink-0 z-10 shadow-2xl transition-colors duration-500 ${
        isDarkMode ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-300 bg-white'
      }`}>
        {!selectedElement ? (
          /* GLOBAL LAYOUT & THEME PANEL */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className={`p-5 border-b transition-colors duration-500 ${isDarkMode ? 'border-neutral-800 bg-[#111]' : 'border-neutral-100 bg-neutral-50/50'}`}>
              <h3 className={`text-base font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>全局设定</h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'}`}>纯抽象引擎渲染：无需写死模板，一键计算全新布局与视觉情绪。</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
              
              {/* Dynamic Backend AI Layout Generation */}
              <div className="space-y-4">
                <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-800'}`}>
                  <Wand2 size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> 
                  生成式排版 (AI Computed Layout)
                </div>
                <button 
                  onClick={handleAiComputeLayout}
                  disabled={isAiLayoutComputing}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md relative overflow-hidden group ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  {isAiLayoutComputing ? (
                    <><Loader2 size={16} className="animate-spin" /> 后端 JSON 引擎计算中...</>
                  ) : (
                    <><Sparkles size={16} /> ✨ AI 智能计算重排版</>
                  )}
                </button>
                <p className="text-[10px] text-center opacity-50 mt-1">模拟基于后端的动态 JSON 网格渲染</p>
              </div>

              {/* Classic Layouts Section */}
              <div className="space-y-4">
                <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-800'}`}>
                  <Grid size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> 
                  经典预设结构 (Presets)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Grid Buttons */}
                  <button onClick={() => handleApplyLayout("bento-asym")} className={`p-3 rounded-xl border text-left transition-all ${activeLayout === "bento-asym" ? (isDarkMode ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/20" : "border-blue-500 bg-blue-50 ring-1 ring-blue-500/20") : (isDarkMode ? "border-neutral-800 hover:border-neutral-600 bg-[#1A1A1A]" : "border-neutral-200 hover:border-neutral-300 bg-white")}`}>
                    <div className="w-full h-16 flex gap-1 mb-2 opacity-80">
                       <div className="flex-1 bg-indigo-400 rounded-sm"></div>
                       <div className="flex-1 flex flex-col gap-1">
                          <div className="flex-1 bg-teal-400 rounded-sm"></div>
                          <div className="flex-1 bg-emerald-400 rounded-sm"></div>
                       </div>
                    </div>
                    <span className={`text-xs font-medium block text-center ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>不对称便当</span>
                  </button>

                  <button onClick={() => handleApplyLayout("bento-col")} className={`p-3 rounded-xl border text-left transition-all ${activeLayout === "bento-col" ? (isDarkMode ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/20" : "border-blue-500 bg-blue-50 ring-1 ring-blue-500/20") : (isDarkMode ? "border-neutral-800 hover:border-neutral-600 bg-[#1A1A1A]" : "border-neutral-200 hover:border-neutral-300 bg-white")}`}>
                    <div className="w-full h-16 flex gap-1 mb-2 opacity-80">
                       <div className="flex-1 bg-neutral-400 rounded-sm"></div>
                       <div className="flex-1 bg-neutral-400 rounded-sm"></div>
                       <div className="flex-1 bg-neutral-400 rounded-sm"></div>
                    </div>
                    <span className={`text-xs font-medium block text-center ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>均分三栏</span>
                  </button>
                </div>
              </div>

              {/* Design Tokens Theme Section */}
              <div className="space-y-4">
                <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-800'}`}>
                  <Palette size={16} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} /> 
                  全局视觉变量 (Design Tokens)
                </div>
                <div className="space-y-2">
                   {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, theme]) => (
                      <div 
                        key={key} 
                        onClick={() => setActiveTheme(key)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          activeTheme === key 
                            ? (isDarkMode ? "border-indigo-500 bg-indigo-500/10" : "border-blue-500 bg-blue-50") 
                            : (isDarkMode ? "border-neutral-800 hover:bg-[#1A1A1A]" : "border-neutral-200 hover:bg-neutral-50")
                      }`}>
                         <span className={`text-xs font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>{theme.name}</span>
                         <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full border border-black/10" style={{ background: theme.bg }}></div>
                            <div className="w-3 h-3 rounded-full border border-black/10" style={{ background: theme.primary }}></div>
                         </div>
                      </div>
                   ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* CONTEXTUAL ELEMENT EDIT PANEL */
          <>
            <div className={`flex border-b p-2 gap-1 transition-colors duration-500 ${isDarkMode ? 'border-neutral-800 bg-[#111]' : 'border-neutral-100 bg-neutral-50'}`}>
              <button onClick={() => setActiveTab("design")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === "design" ? (isDarkMode ? "bg-white/10 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm border border-neutral-200") : (isDarkMode ? "text-neutral-500 hover:bg-white/5" : "text-neutral-500 hover:bg-neutral-100")}`}>
                属性配置
              </button>
              <button onClick={() => setActiveTab("ai")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === "ai" ? (isDarkMode ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" : "bg-blue-600 text-white shadow-md shadow-blue-500/20") : (isDarkMode ? "text-neutral-500 hover:bg-white/5" : "text-neutral-500 hover:bg-neutral-100")}`}>
                <Sparkles size={14} /> AI 助理
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {activeTab === "design" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>排版微调</h4>
                    <span className="text-xs font-mono text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 uppercase">{selectedElement.type}</span>
                  </div>
                  
                  {selectedElement.type === "text" && (
                    <div className="space-y-5">
                      <div>
                        <label className={`text-xs font-medium mb-2 block ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>文本内容 (手动编辑)</label>
                        <textarea
                          value={selectedElement.content || ""}
                          onChange={(e) => handleContentChange(e.target.value)}
                          className={`w-full border rounded-xl p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none h-28 leading-relaxed shadow-inner custom-scrollbar ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-xs font-medium mb-2 block ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>字号</label>
                          <select className={`w-full border rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500 transition-colors appearance-none ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'}`}>
                            <option>{selectedElement.style?.fontSize}</option>
                            <option>16px</option>
                            <option>24px</option>
                            <option>32px</option>
                            <option>48px</option>
                          </select>
                        </div>
                        <div>
                          <label className={`text-xs font-medium mb-2 block ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>字重</label>
                          <select className={`w-full border rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500 transition-colors appearance-none ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'}`}>
                            <option>{selectedElement.style?.fontWeight || "normal"}</option>
                            <option>bold</option>
                            <option>500</option>
                            <option>normal</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedElement.isBentoCard && (
                    <div className="space-y-5">
                       <div>
                        <label className={`text-xs font-medium mb-2 block ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>容器背景</label>
                        <div className={`flex items-center gap-3 border rounded-xl p-2 shadow-inner ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-200'}`}>
                          <div className={`w-8 h-8 rounded-lg border shadow-sm ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'}`} style={{ background: selectedElement.style?.backgroundColor || '#fff' }}></div>
                          <span className={`text-xs font-mono flex-1 truncate ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{selectedElement.style?.backgroundColor || '#FFFFFF'}</span>
                        </div>
                      </div>
                      <div>
                        <label className={`text-xs font-medium mb-2 block ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>圆角曲率</label>
                        <input type="range" className="w-full accent-indigo-500" defaultValue="32" max="64" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "ai" && (
                <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className={`flex items-start gap-3 border p-4 rounded-xl shadow-inner ${isDarkMode ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border-indigo-500/30' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'}`}>
                    <Sparkles className={isDarkMode ? 'text-indigo-400 shrink-0 mt-0.5' : 'text-blue-600 shrink-0 mt-0.5'} size={18} />
                    <div>
                      <h4 className={`text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-indigo-300' : 'text-blue-800'}`}>上下文感知引擎</h4>
                      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        AI 将感知当前的“{activeLayout}”排版结构，并仅针对选中的区域进行润色，绝不破坏现有结构。
                      </p>
                    </div>
                  </div>
                  
                  {selectedElement.type === 'text' && (
                     <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>快捷指令 (Prompts)</label>
                        <div className="flex flex-wrap gap-2">
                           {["使语气更具冲击力", "精简为一句话", "翻译为英文专业术语", "扩展三点细节"].map(cmd => (
                             <button 
                               key={cmd}
                               onClick={() => setAiPrompt(cmd)}
                               className={`text-xs border px-3 py-2 rounded-lg transition-all ${
                                 isDarkMode 
                                   ? 'bg-[#1A1A1A] hover:bg-[#252525] border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white' 
                                   : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-900'
                               }`}
                             >
                               {cmd}
                             </button>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className={`mt-auto pt-6 border-t relative ${isDarkMode ? 'border-neutral-800/50' : 'border-neutral-200'}`}>
                    {isAiLoading && (
                      <div className={`absolute inset-0 z-10 backdrop-blur-md flex items-center justify-center rounded-xl ${isDarkMode ? 'bg-[#161616]/80' : 'bg-white/80'}`}>
                        <div className="flex flex-col items-center gap-3">
                           <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                             <Sparkles className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} size={24} />
                           </motion.div>
                           <span className={`text-xs font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>魔法重写中...</span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleAiEdit} className="relative group">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="输入您的调整想法..."
                        className={`w-full border rounded-xl p-4 pr-12 text-sm outline-none resize-none h-32 custom-scrollbar transition-all shadow-inner ${
                          isDarkMode 
                            ? 'bg-[#1A1A1A] border-neutral-800 group-focus-within:border-indigo-500/50 text-white placeholder-neutral-600' 
                            : 'bg-white border-neutral-200 group-focus-within:border-indigo-500 text-neutral-900 placeholder-neutral-400'
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAiEdit(e);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!aiPrompt.trim()}
                        className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${
                          aiPrompt.trim() 
                            ? (isDarkMode ? "bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 hover:-translate-y-0.5" : "bg-indigo-600 text-white shadow-md hover:bg-indigo-500 hover:-translate-y-0.5") 
                            : (isDarkMode ? "bg-neutral-800 text-neutral-600" : "bg-neutral-100 text-neutral-400")
                        }`}
                      >
                        <Send size={16} className={aiPrompt.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
