import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import {
  Type, Sparkles, LayoutGrid, Palette, Layers,
  Move, ZoomIn, Search, Send, Grid, Wand2, X, ChevronLeft, ChevronRight, Loader2, RefreshCw
} from "lucide-react";
import { fetchSSE } from "../lib/sse";
import type { SlideCard } from "../types";

// ─── Types ───
type SlideElement = {
  id: string;
  type: "text" | "box" | "image";
  content?: string;
  style?: Record<string, any>;
  isBentoCard?: boolean;
};

type SlideProgressStatus = "idle" | "loading" | "done" | "error";

interface WorkspaceEditorProps {
  outline: SlideCard[];
  isActive?: boolean;            // 当前是否为活跃 Step（Step 3）
  skipEnrichIndices?: number[];
}

// ─── Design Tokens (Themes) ───
const THEMES = {
  "apple-frost": {
    name: "Apple 霜白",
    bg: "#F5F5F7", surface: "#FFFFFF", surfaceHighlight: "#F5F5F7",
    textMain: "#1D1D1F", textMuted: "#86868B",
    primary: "#0066CC", accent: "#FF3B30", radius: "24px",
    border: "1px solid rgba(0,0,0,0.05)", shadow: "0 10px 40px rgba(0,0,0,0.04)",
  },
  "morandi-green": {
    name: "莫兰迪绿",
    bg: "#EAECE8", surface: "#F4F5F3", surfaceHighlight: "#E2E5E0",
    textMain: "#4A5348", textMuted: "#889485",
    primary: "#6B7C67", accent: "#D4A373", radius: "16px",
    border: "1px solid rgba(107,124,103,0.15)", shadow: "0 8px 32px rgba(107,124,103,0.08)",
  },
  "cyber-hacker": {
    name: "未来黑客",
    bg: "#0A0A0A", surface: "#141414", surfaceHighlight: "#1F1F1F",
    textMain: "#F3F4F6", textMuted: "#9CA3AF",
    primary: "#10B981", accent: "#8B5CF6", radius: "8px",
    border: "1px solid rgba(16,185,129,0.3)", shadow: "0 0 30px rgba(16,185,129,0.15)",
  }
};
type ThemeKey = keyof typeof THEMES;

// ─── Theme Application ───
const applyThemeToElements = (elements: SlideElement[], themeKey: ThemeKey): SlideElement[] => {
  const theme = THEMES[themeKey];
  return elements.map(el => {
    const newStyle = { ...el.style };
    if (el.id === "bg") {
      newStyle.backgroundColor = theme.bg;
    } else if (el.id === "header_title") {
      newStyle.color = theme.textMain;
    } else if (el.id === "header_subtitle") {
      newStyle.color = theme.textMuted;
    } else if (el.id?.startsWith("info_")) {
      newStyle.color = theme.textMuted;
    } else if (el.id?.startsWith("divider_")) {
      newStyle.backgroundColor = theme.surfaceHighlight;
    } else if (el.isBentoCard) {
      newStyle.backgroundColor = theme.surface;
      newStyle.border = theme.border;
      newStyle.borderRadius = theme.radius;
      newStyle.boxShadow = theme.shadow;
    } else if (el.id?.endsWith("_num")) {
      newStyle.color = theme.primary;
      newStyle.backgroundColor = theme.surfaceHighlight;
    } else if (el.id?.endsWith("_title")) {
      newStyle.color = theme.textMain;
    } else if (el.id?.endsWith("_desc")) {
      newStyle.color = theme.textMuted;
    }
    return { ...el, style: newStyle };
  });
};

const cloneElementsForCache = (elements: SlideElement[]): SlideElement[] =>
  elements.map((el) => ({
    ...el,
    style: el.style ? { ...el.style } : {},
  }));

const parsePx = (value: unknown): number => {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
};

// ─── Component ───
export function WorkspaceEditor({ outline, isActive = false, skipEnrichIndices = [] }: WorkspaceEditorProps) {
  // 多幻灯片状态
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [resolvedSlides, setResolvedSlides] = useState<Record<number, SlideCard>>({});
  const [slidesCache, setSlidesCache] = useState<Record<number, SlideElement[]>>({});
  const [isLoadingSlide, setIsLoadingSlide] = useState(false);
  const [slideProgress, setSlideProgress] = useState<Record<number, SlideProgressStatus>>({});
  const [pipelineStarted, setPipelineStarted] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const pipelineAbortRef = React.useRef<AbortController | null>(null);
  const [pipelineId, setPipelineId] = useState("");
  const outlineIdRef = React.useRef<string>("");  // 追踪 outline 是否真的变了

  // 当前幻灯片元素
  const [elements, setElements] = useState<SlideElement[]>([]);

  // SVG 设计稿模式
  const [viewMode, setViewMode] = useState<"draft" | "design">("draft");
  const [svgCache, setSvgCache] = useState<Record<number, string>>({});
  const [isRenderingSvg, setIsRenderingSvg] = useState(false);
  const [renderingSlideIndex, setRenderingSlideIndex] = useState<number | null>(null);
  const [renderProgress, setRenderProgress] = useState("");
  const [isProgressPanelCollapsed, setIsProgressPanelCollapsed] = useState(true);

  // 编辑器状态
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("apple-frost");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"design" | "ai">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [zoom, setZoom] = useState(0.75);
  const [activeLayout, setActiveLayout] = useState("ai-dynamic");
  const [isAiLayoutComputing, setIsAiLayoutComputing] = useState(false);

  // AI 输入框 ref（用于聚焦）
  const aiInputRef = React.useRef<HTMLTextAreaElement>(null);

  // 动态快捷指令
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // 演示模式
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentationSlide, setPresentationSlide] = useState(0);

  const currentSlide = resolvedSlides[currentSlideIndex] ?? outline[currentSlideIndex];
  const selectedElement = elements.find(e => e.id === selectedId);
  const isDarkMode = activeTheme === 'cyber-hacker';
  const totalSlides = outline.length;
  const completedSlides = Object.values(slideProgress).filter((status) => status === "done").length;
  const progressPercent = totalSlides === 0 ? 0 : Math.round((completedSlides / totalSlides) * 100);
  const allSlidesReady = totalSlides > 0 && completedSlides === totalSlides;
  const activeGeneratingIndex = outline.findIndex((_, index) => slideProgress[index] === "loading");
  const isCurrentSlideRendering = isRenderingSvg && renderingSlideIndex === currentSlideIndex;

  // 收集当前页面所有可见文本（用于 AI 上下文）
  const getAllTexts = (): string[] => {
    return elements.filter(el => el.type === "text" && el.content).map(el => el.content!);
  };

  const persistSlideElements = useCallback((index: number, nextElements: SlideElement[]) => {
    setSlidesCache((prev) => ({
      ...prev,
      [index]: cloneElementsForCache(nextElements),
    }));
  }, []);

  const runPipeline = useCallback(async (options?: { skipEnrich?: boolean; skipDesign?: boolean; force?: boolean }) => {
    const skipEnrich = options?.skipEnrich ?? (skipEnrichIndices.length === outline.length && outline.length > 0);
    const skipDesign = options?.skipDesign ?? false;
    const force = options?.force ?? false;

    if (outline.length === 0) return;
    if (!force && (isPipelineRunning || pipelineStarted)) return;

    // 取消之前正在跑的管道
    pipelineAbortRef.current?.abort();
    const abort = new AbortController();
    pipelineAbortRef.current = abort;

    if (force) {
      setResolvedSlides({});
      setSlidesCache({});
      setSvgCache({});
      setElements([]);
      setSlideProgress({});
      setViewMode(skipDesign ? "draft" : "design");
    }

    setPipelineStarted(true);
    setIsPipelineRunning(true);
    setIsLoadingSlide(true);
    setIsProgressPanelCollapsed(false);

    try {
      await fetchSSE("/api/v1/pipeline/run", {
        slides: outline,
        theme: activeTheme,
        skip_enrich: skipEnrich,
        skip_design: skipDesign,
        skip_enrich_indices: skipEnrichIndices,
      }, {
        onResponse: (response) => {
          const id = response.headers.get("X-Pipeline-Id") || "";
          setPipelineId(id);
        },
        onPipelineStart: () => {
          setSlideProgress(() => {
            const next: Record<number, SlideProgressStatus> = {};
            outline.forEach((_, index) => {
              next[index] = "idle";
            });
            return next;
          });
        },
        onSlideStart: ({ index }) => {
          setSlideProgress((prev) => ({ ...prev, [index]: "loading" }));
        },
        onSlidePhase: ({ index, label }) => {
          setSlideProgress((prev) => ({ ...prev, [index]: "loading" }));
          if (index === currentSlideIndex) {
            setRenderProgress(label);
            setIsLoadingSlide(true);
          }
        },
        onSlideEnriched: ({ index, slide }) => {
          setResolvedSlides((prev) => ({ ...prev, [index]: slide }));
        },
        onSlideLayout: ({ index, elements }) => {
          const typedElements = elements as SlideElement[];
          persistSlideElements(index, typedElements);
          if (index === currentSlideIndex) {
            setElements(applyThemeToElements(typedElements, activeTheme));
            setIsLoadingSlide(false);
          }
        },
        onSlideComplete: ({ index, slide, elements, svg }) => {
          const typedElements = elements as SlideElement[];
          setResolvedSlides((prev) => ({ ...prev, [index]: slide }));
          persistSlideElements(index, typedElements);
          if (svg) {
            setSvgCache((prev) => ({ ...prev, [index]: svg }));
          }
          setSlideProgress((prev) => ({ ...prev, [index]: "done" }));
          if (index === currentSlideIndex) {
            setElements(applyThemeToElements(typedElements, activeTheme));
            setIsLoadingSlide(false);
          }
        },
        onPipelineComplete: () => {
          setIsPipelineRunning(false);
          setIsLoadingSlide(false);
          setRenderProgress("");
          setPipelineId("");
        },
        onError: (msg) => {
          console.error("Pipeline error:", msg);
          setIsPipelineRunning(false);
          setIsLoadingSlide(false);
          setRenderProgress("");
          setPipelineId("");
        },
        onDone: () => {
          setIsPipelineRunning(false);
          setIsLoadingSlide(false);
          setRenderProgress("");
          setPipelineId("");
        },
      }, abort.signal);
    } catch (err: any) {
      if (err?.name === "AbortError") return; // 被取消的管道，静默忽略
      console.error("Pipeline failed:", err);
      setIsPipelineRunning(false);
      setIsLoadingSlide(false);
      setRenderProgress("");
      setPipelineId("");
    }
  }, [activeTheme, currentSlideIndex, isPipelineRunning, outline, persistSlideElements, pipelineStarted, skipEnrichIndices]);

  const handleStopPipeline = async () => {
    if (!window.confirm("此操作会停止所有生成，是否继续？")) return;

    try {
      await fetch(`/api/v1/pipeline/stop${pipelineId ? `?pipeline_id=${pipelineId}` : ""}`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Stop pipeline request failed:", err);
    } finally {
      pipelineAbortRef.current?.abort();
      setIsPipelineRunning(false);
      setIsLoadingSlide(false);
      setIsRenderingSvg(false);
      setRenderingSlideIndex(null);
      setRenderProgress("已停止生成");
      setPipelineId("");
    }
  };

  // outline 真正变化时才重置（用内容指纹而非引用比较）
  const outlineFingerprint = outline.map(s => s.id).join(",");

  useEffect(() => {
    // outline 内容没变就不重置
    if (outlineIdRef.current === outlineFingerprint) return;
    outlineIdRef.current = outlineFingerprint;

    // 只有 outline 真正改变（比如重新生成大纲）才重置
    if (outlineFingerprint) {
      // 取消正在跑的管道
      pipelineAbortRef.current?.abort();

      setResolvedSlides({});
      setSlidesCache({});
      setSvgCache({});
      setElements([]);
      setSlideProgress({});
      setPipelineStarted(false);
      setIsPipelineRunning(false);
      setIsLoadingSlide(false);
      setCurrentSlideIndex(0);
      setSelectedId(null);
      setViewMode("draft");
    }
  }, [outlineFingerprint]);

  // 管道只在 Step 3 激活且重置后自动启动一次
  useEffect(() => {
    if (!isActive) return;  // 不在 Step 3 不触发
    if (!pipelineStarted && outline.length > 0 && outlineIdRef.current === outlineFingerprint) {
      runPipeline();
    }
  }, [pipelineStarted, outlineFingerprint, isActive]);

  useEffect(() => {
    if (outline.length === 0) {
      setSlideProgress({});
      return;
    }

    setSlideProgress((prev) => {
      const next: Record<number, SlideProgressStatus> = {};
      outline.forEach((_, index) => {
        next[index] = prev[index] ?? "idle";
      });
      return next;
    });
  }, [outline]);

  // ─── 选中元素时加载动态快捷建议 ───
  useEffect(() => {
    if (!selectedId || !selectedElement || selectedElement.type !== "text") {
      setQuickSuggestions([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);
    setQuickSuggestions([]);

    fetch("/api/v1/layout/ai-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        element_id: selectedId,
        element_content: selectedElement.content || "",
        slide_title: currentSlide?.title || "",
        slide_type: currentSlide?.type || "content",
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setQuickSuggestions(data.suggestions || []);
          setIsLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuickSuggestions(["使表达更有力", "精简为核心要点", "补充数据支撑", "调整为专业术语"]);
          setIsLoadingSuggestions(false);
        }
      });

    return () => { cancelled = true; };
  }, [selectedId]);

  // ─── 从后端获取幻灯片元素 ───
  const loadSlideElements = useCallback(async (index: number) => {
    // 先检查缓存
    if (slidesCache[index]) {
      setSlideProgress(prev => ({ ...prev, [index]: "done" }));
      setElements(applyThemeToElements(slidesCache[index], activeTheme));
      return;
    }

    const slide = outline[index];
    if (!slide) return;

    setIsLoadingSlide(true);
    setSelectedId(null);
    setSlideProgress(prev => ({ ...prev, [index]: "loading" }));

    try {
      const resp = await fetch("/api/v1/layout/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide, theme: activeTheme }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const rawElements: SlideElement[] = data.elements || [];

      // 缓存原始元素（无主题色）
      setSlidesCache(prev => ({ ...prev, [index]: rawElements }));
      setSlideProgress(prev => ({ ...prev, [index]: "done" }));
      // 应用主题色后渲染
      setElements(applyThemeToElements(rawElements, activeTheme));
    } catch (err) {
      console.error("Failed to load slide:", err);
      setSlideProgress(prev => ({ ...prev, [index]: "error" }));
      // 兜底：显示空画布 + 标题
      setElements(applyThemeToElements([
        { id: "bg", type: "box", style: { width: "100%", height: "100%", position: "absolute", zIndex: "0" } },
        { id: "header_title", type: "text", content: outline[index]?.title || "加载失败",
          style: { fontSize: "48px", fontWeight: "800", position: "absolute", top: "280px", left: "120px", width: "1040px", textAlign: "center", zIndex: "1" } },
      ], activeTheme));
    } finally {
      setIsLoadingSlide(false);
    }
  }, [outline, activeTheme, slidesCache]);

  // Step 3 主链路改为统一走 pipeline/run

  // 后台静默加载（不影响当前显示）
  const loadSlideInBackground = async (index: number) => {
    if (slidesCache[index]) {
      setSlideProgress(prev => ({ ...prev, [index]: "done" }));
      return;
    }
    const slide = outline[index];
    if (!slide) return;

    setSlideProgress(prev => ({ ...prev, [index]: "loading" }));

    try {
      const resp = await fetch("/api/v1/layout/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide, theme: activeTheme }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const rawElements: SlideElement[] = data.elements || [];
      setSlidesCache(prev => ({ ...prev, [index]: rawElements }));
      setSlideProgress(prev => ({ ...prev, [index]: "done" }));
    } catch {
      setSlideProgress(prev => ({ ...prev, [index]: "error" }));
      // 静默失败，用户点击时会重试
    }
  };

  // 切换幻灯片
  const handleSlideChange = (index: number) => {
    // 保存当前编辑到缓存
    setSlidesCache(prev => ({ ...prev, [currentSlideIndex]: elements.map(el => {
      const cleaned = { ...el, style: { ...el.style } };
      // 移除主题色，保留结构样式
      return cleaned;
    }) }));
    setCurrentSlideIndex(index);
    setSelectedId(null);
    if (slidesCache[index]) {
      setElements(applyThemeToElements(slidesCache[index], activeTheme));
      setIsLoadingSlide(false);
    } else if (pipelineStarted) {
      setElements([]);
      setIsLoadingSlide(true);
    } else {
      loadSlideElements(index);
    }
  };

  // 主题切换 → 重新应用主题色
  useEffect(() => {
    if (elements.length > 0) {
      // 从缓存拿原始元素重新应用主题
      const rawElements = slidesCache[currentSlideIndex];
      if (rawElements) {
        setElements(applyThemeToElements(rawElements, activeTheme));
      } else {
        setElements(prev => applyThemeToElements(prev, activeTheme));
      }
    }
  }, [activeTheme]);

  useEffect(() => {
    const rawElements = slidesCache[currentSlideIndex];
    if (rawElements) {
      setElements(applyThemeToElements(rawElements, activeTheme));
      setIsLoadingSlide(false);
    } else if (pipelineStarted) {
      setElements([]);
      setIsLoadingSlide(true);
    }
  }, [activeTheme, currentSlideIndex, pipelineStarted, slidesCache]);

  // ─── AI 重排版（调用后端） ───
  const handleAiComputeLayout = async () => {
    if (!currentSlide) return;
    setIsAiLayoutComputing(true);

    try {
      const resp = await fetch("/api/v1/layout/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide: currentSlide, theme: activeTheme }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const rawElements: SlideElement[] = data.elements || [];

      setSlidesCache(prev => ({ ...prev, [currentSlideIndex]: rawElements }));
      setElements(applyThemeToElements(rawElements, activeTheme));
      setActiveLayout("ai-dynamic");
    } catch (err) {
      console.error("AI layout failed:", err);
    } finally {
      setIsAiLayoutComputing(false);
    }
  };

  // ─── 生成 SVG 设计稿 ───
  const handleRenderDesign = async (slideIndex?: number) => {
    const idx = slideIndex ?? currentSlideIndex;
    const slide = resolvedSlides[idx] ?? outline[idx];
    if (!slide) return;

    setIsRenderingSvg(true);
    setRenderingSlideIndex(idx);
    setRenderProgress("正在渲染设计稿...");

    let svgBuffer = "";
    let svgCompleted = false;
    try {
      await fetchSSE("/api/v1/render/svg", {
        slide,
        theme: activeTheme,
      }, {
        onStatus: () => setRenderProgress("AI 设计师正在创作..."),
        onSvgChunk: (content) => {
          svgBuffer += content;
          setRenderProgress(`渲染中 (${svgBuffer.length} 字)...`);
        },
        onSvgComplete: (svg) => {
          svgCompleted = true;
          setSvgCache(prev => ({ ...prev, [idx]: svg }));
          setViewMode("design");
          setIsRenderingSvg(false);
          setRenderingSlideIndex(null);
          setRenderProgress("");
        },
        onDone: () => {
          // 如果没有 svg_complete 事件，用累积的 buffer
          if (!svgCompleted && svgBuffer.includes("<svg")) {
            const svgStart = svgBuffer.indexOf("<svg");
            const svgEnd = svgBuffer.lastIndexOf("</svg>") + 6;
            const cleanSvg = svgBuffer.slice(svgStart, svgEnd > 6 ? svgEnd : undefined);
            setSvgCache(prev => ({ ...prev, [idx]: cleanSvg }));
            setViewMode("design");
          }
          setIsRenderingSvg(false);
          setRenderingSlideIndex(null);
          setRenderProgress("");
        },
        onError: (msg) => {
          console.error("SVG render error:", msg);
          setIsRenderingSvg(false);
          setRenderingSlideIndex(null);
          setRenderProgress("");
        },
      });
    } catch (err) {
      console.error("Render failed:", err);
      setIsRenderingSvg(false);
      setRenderingSlideIndex(null);
      setRenderProgress("");
    }
  };

  // ─── 手动编辑 ───
  const handleContentChange = (newContent: string) => {
    if (!selectedId) return;
    setElements(elements.map(e => e.id === selectedId ? { ...e, content: newContent } : e));
  };

  const handleElementDragEnd = useCallback((elementId: string, info: PanInfo) => {
    if (viewMode !== "draft") return;
    if (Math.abs(info.offset.x) < 4 && Math.abs(info.offset.y) < 4) return;

    setElements((prev) => {
      const next = prev.map((el) => {
        if (el.id !== elementId || el.id === "bg") return el;

        const nextTop = parsePx(el.style?.top) + info.offset.y;
        const nextLeft = parsePx(el.style?.left) + info.offset.x;

        return {
          ...el,
          style: {
            ...el.style,
            top: `${Math.round(nextTop)}px`,
            left: `${Math.round(nextLeft)}px`,
          },
        };
      });

      persistSlideElements(currentSlideIndex, next);
      return next;
    });
  }, [currentSlideIndex, persistSlideElements, viewMode]);

  // ─── AI 元素编辑（上下文感知 SSE） ───
  const handleAiEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || !selectedId || !selectedElement) return;

    setIsAiLoading(true);

    let newContent = "";
    try {
      await fetchSSE("/api/v1/layout/ai-edit", {
        element_id: selectedId,
        element_content: selectedElement.content || "",
        instruction: aiPrompt,
        slide_title: currentSlide?.title || "",
        slide_type: currentSlide?.type || "content",
        all_texts: getAllTexts(),
      }, {
        onToken: (content) => {
          newContent += content;
          setElements(prev => prev.map(el =>
            el.id === selectedId ? { ...el, content: newContent } : el
          ));
        },
        onDone: () => {
          setIsAiLoading(false);
          setAiPrompt("");
        },
        onError: () => setIsAiLoading(false),
      });
    } catch {
      setIsAiLoading(false);
    }
  };

  // ─── 演示模式 ───
  useEffect(() => {
    const handler = (e: any) => {
      setIsPresenting(true);
      setPresentationSlide(e.detail.fromCurrent ? currentSlideIndex : 0);
    };
    window.addEventListener('start-presentation', handler);
    return () => window.removeEventListener('start-presentation', handler);
  }, [currentSlideIndex]);

  useEffect(() => {
    if (!isPresenting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPresenting(false);
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setPresentationSlide(s => Math.min(totalSlides - 1, s + 1));
      }
      if (e.key === 'ArrowLeft') {
        setPresentationSlide(s => Math.max(0, s - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, totalSlides]);

  // 演示模式下按需加载幻灯片
  useEffect(() => {
    if (isPresenting && !slidesCache[presentationSlide] && !pipelineStarted) {
      loadSlideElements(presentationSlide);
    }
  }, [presentationSlide, isPresenting, pipelineStarted]);

  const getPresentationElements = (index: number): SlideElement[] => {
    const cached = slidesCache[index];
    if (cached) return applyThemeToElements(cached, activeTheme);
    return [];
  };

  // ─── Render ───
  return (
    <>
      {/* ── Presentation Mode ── */}
      <AnimatePresence>
        {isPresenting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-y-0 left-0 w-[15vw] cursor-pointer z-50 hover:bg-white/5 transition-colors flex items-center justify-start px-4 text-white/0 hover:text-white/50" onClick={() => setPresentationSlide(s => Math.max(0, s - 1))}>
               <ChevronLeft size={48} />
            </div>
            <div className="absolute inset-y-0 right-0 w-[15vw] cursor-pointer z-50 hover:bg-white/5 transition-colors flex items-center justify-end px-4 text-white/0 hover:text-white/50" onClick={() => setPresentationSlide(s => Math.min(totalSlides - 1, s + 1))}>
               <ChevronRight size={48} />
            </div>

            <div className="w-[1280px] h-[720px] shrink-0 bg-neutral-900 flex items-center justify-center shadow-2xl relative" style={{ transform: `scale(calc(min(100vw / 1280, 100vh / 720)))` }}>
              <div className="absolute inset-0 w-full h-full bg-white shadow-2xl overflow-hidden origin-center rounded-sm">
                {getPresentationElements(presentationSlide).length > 0 ? (
                  getPresentationElements(presentationSlide).map((el) => (
                    <div key={el.id} style={{ ...el.style, pointerEvents: 'none' }}>
                      {el.content}
                    </div>
                  ))
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="text-sm">加载中...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40">
              {outline.map((_, i) => (
                <div key={i} onClick={() => setPresentationSlide(i)} className={`w-2 h-2 rounded-full cursor-pointer transition-all ${presentationSlide === i ? 'bg-white scale-150' : 'bg-white/30 hover:bg-white/50'}`} />
              ))}
            </div>

            <button onClick={() => setIsPresenting(false)} className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors">
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Editor ── */}
      <div className={`flex h-full w-full ${isDarkMode ? 'bg-[#111111]' : 'bg-[#E5E5E5]'} overflow-hidden select-none font-sans transition-colors duration-500`}>

      {/* ── Left Sidebar: Real Slide Thumbnails ── */}
      <div className={`w-[260px] border-r flex flex-col shrink-0 z-10 shadow-2xl transition-colors duration-500 ${isDarkMode ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-300 bg-[#F5F5F5]'}`}>
        <div className={`p-4 border-b flex items-center justify-between transition-colors duration-500 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-300'}`}>
          <h3 className={`font-semibold flex items-center gap-2 text-sm tracking-wide ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>
            <Layers size={16} className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'} />
            幻灯片 ({totalSlides})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {outline.map((slide, i) => (
            <div
              key={slide.id}
              onClick={() => handleSlideChange(i)}
              className={`relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 ${
                i === currentSlideIndex
                  ? (isDarkMode ? "ring-2 ring-indigo-500 bg-[#222]" : "ring-2 ring-blue-500 bg-white shadow-sm")
                  : (isDarkMode ? "hover:bg-[#1A1A1A]" : "hover:bg-neutral-200")
              } p-2`}
            >
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className={`text-xs font-mono ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>{i + 1}</span>
                <span className={`text-xs font-medium truncate flex-1 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {slide.title.replace("封面：", "").replace("目录：", "").slice(0, 20)}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-neutral-800 text-neutral-500' : 'bg-neutral-100 text-neutral-400'}`}>
                  {slide.type}
                </span>
              </div>
              <div className={`aspect-video rounded-md overflow-hidden relative border opacity-80 group-hover:opacity-100 transition-opacity ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
              }`}>
                {slidesCache[i] ? (
                  <div className="absolute inset-0 pointer-events-none origin-top-left" style={{ transform: 'scale(0.14)', width: '1280px', height: '720px' }}>
                    {applyThemeToElements(slidesCache[i], activeTheme).map(el => (
                      <div key={el.id} style={el.style}>{el.content}</div>
                    ))}
                  </div>
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                    <LayoutGrid size={16} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Center: Canvas ── */}
      <div
        className={`flex-1 relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-200'}`}
        style={{
          backgroundImage: isDarkMode
            ? 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)'
            : 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
      >
        {/* Toolbar */}
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 backdrop-blur-md border rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl z-20 transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E]/90 border-white/10 text-neutral-400' : 'bg-white/90 border-neutral-200 text-neutral-500'
        }`}>
          <button className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-100 hover:text-neutral-900'}`}><Move size={18} /></button>
          <button className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-100 hover:text-neutral-900'}`}><Type size={18} /></button>
          <div className={`w-px h-5 mx-2 ${isDarkMode ? 'bg-white/10' : 'bg-neutral-200'}`}></div>
          <button className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-100 hover:text-neutral-900'}`}><Search size={18} /></button>
        </div>

        {/* Zoom Controls */}
        <div className={`absolute bottom-6 left-6 backdrop-blur-md border rounded-xl flex items-center gap-1 p-1.5 shadow-2xl z-20 transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E]/90 border-white/10 text-neutral-400' : 'bg-white/90 border-neutral-200 text-neutral-500'
        }`}>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}><ZoomIn size={16} className="rotate-180" /></button>
          <span className={`text-xs font-mono w-12 text-center ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}><ZoomIn size={16} /></button>
        </div>

        {/* Slide Info Badge */}
        <div className={`absolute top-6 right-6 backdrop-blur-md border rounded-xl px-4 py-2 shadow-2xl z-20 transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E]/90 border-white/10 text-neutral-400' : 'bg-white/90 border-neutral-200 text-neutral-500'
        }`}>
          <span className="text-xs font-mono">{currentSlideIndex + 1} / {totalSlides}</span>
        </div>

        {/* Progress Panel */}
        {totalSlides > 0 && (
          isProgressPanelCollapsed ? (
            <button
              type="button"
              onClick={() => setIsProgressPanelCollapsed(false)}
              className={`absolute bottom-6 right-6 z-30 rounded-full border px-4 py-2 text-xs font-semibold shadow-2xl transition-colors ${
                isDarkMode ? 'border-white/10 bg-[#171717]/95 text-neutral-200 hover:bg-[#222]' : 'border-neutral-200 bg-white/95 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              生成进度 {completedSlides}/{totalSlides}
            </button>
          ) : (
          <div className={`absolute bottom-6 right-6 z-30 w-[320px] rounded-2xl border p-4 shadow-2xl xl:right-8 ${
            isDarkMode ? 'border-white/10 bg-[#171717]/95 text-neutral-200' : 'border-neutral-200 bg-white/95 text-neutral-800'
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{allSlidesReady ? "生成完成" : "生成进度"}</div>
                <div className={`mt-1 text-xs ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  {completedSlides} / {totalSlides}
                </div>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                allSlidesReady
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : isDarkMode
                  ? 'bg-white/10 text-neutral-300'
                  : 'bg-neutral-100 text-neutral-600'
              }`}>
                {allSlidesReady ? "✓ 100%" : `${progressPercent}%`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsProgressPanelCollapsed(true)}
              className={`absolute top-3 right-3 rounded-lg px-2 py-1 text-[11px] transition-colors ${
                isDarkMode ? 'text-neutral-500 hover:bg-white/10 hover:text-white' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
              }`}
            >
              收起
            </button>
            {isPipelineRunning && (
              <button
                type="button"
                onClick={handleStopPipeline}
                className={`mb-4 w-full rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                    : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                }`}
              >
                停止所有生成
              </button>
            )}

            <div className="mb-4 space-y-2">
              {outline.map((slide, index) => {
                const status = slideProgress[index] ?? "idle";
                const clickable = status === "done";
                const marker =
                  status === "done" ? "✅" :
                  status === "loading" ? "⏳" :
                  status === "error" ? "⚠️" : "⬜";

                return (
                  <button
                    key={slide.id}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && handleSlideChange(index)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors ${
                      clickable
                        ? (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-neutral-100')
                        : 'cursor-default'
                    }`}
                  >
                    <span className="shrink-0 text-sm">{marker}</span>
                    <span className={`truncate ${status === "loading" ? 'font-medium' : ''}`}>{slide.title}</span>
                    {status === "loading" && activeGeneratingIndex === index && (
                      <span className={`ml-auto text-[11px] ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        生成中...
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-neutral-200'}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  allSlidesReady ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          )
        )}

        {/* Canvas */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div className="w-[1280px] h-[720px] relative overflow-hidden origin-center rounded-sm transition-all duration-700 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
            {isLoadingSlide || isCurrentSlideRendering ? (
              <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
                <Loader2 className={`animate-spin mb-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} size={40} />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {isCurrentSlideRendering ? (renderProgress || "AI 设计师正在创作...") : "AI 正在生成排版..."}
                </p>
              </div>
            ) : viewMode === "design" && svgCache[currentSlideIndex] ? (
              /* ── SVG 设计稿视图 ── */
              <div
                className="w-full h-full bg-white"
                dangerouslySetInnerHTML={{ __html: svgCache[currentSlideIndex] }}
              />
            ) : (
              /* ── 策划稿视图（JSON 元素） ── */
              elements.map((el) => {
                const isSelected = selectedId === el.id;

                if (el.id === "bg") {
                  return <motion.div key={el.id} style={el.style} onClick={() => setSelectedId(null)} />;
                }

                return (
                  <motion.div
                    key={el.id}
                    drag={viewMode === "draft" && el.id !== "bg"}
                    dragMomentum={false}
                    dragElastic={0}
                    onDragEnd={(_, info) => handleElementDragEnd(el.id, info)}
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
                            onClick={() => {
                              setActiveTab('ai');
                              // 聚焦输入框
                              setTimeout(() => aiInputRef.current?.focus(), 100);
                            }}
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
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Right Sidebar ── */}
      <div className={`w-[340px] border-l flex flex-col shrink-0 z-10 shadow-2xl transition-colors duration-500 ${
        isDarkMode ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-300 bg-white'
      }`}>
        {!selectedElement ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className={`p-5 border-b transition-colors duration-500 ${isDarkMode ? 'border-neutral-800 bg-[#111]' : 'border-neutral-100 bg-neutral-50/50'}`}>
              <h3 className={`text-base font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>全局设定</h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'}`}>AI 引擎渲染：一键计算全新布局与视觉情绪。</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
              {/* 策划稿/设计稿 切换 */}
              <div className="space-y-4">
                <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-800'}`}>
                  <Layers size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                  视图模式
                </div>
                <div className={`flex rounded-xl p-1 ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
                  <button
                    onClick={() => setViewMode("draft")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      viewMode === "draft"
                        ? (isDarkMode ? "bg-white/10 text-white" : "bg-white text-neutral-900 shadow-sm")
                        : (isDarkMode ? "text-neutral-500" : "text-neutral-500")
                    }`}
                  >
                    策划稿
                  </button>
                  <button
                  onClick={() => {
                      setIsProgressPanelCollapsed(false);
                      if (svgCache[currentSlideIndex]) {
                        setViewMode("design");
                      } else {
                        handleRenderDesign();
                      }
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      viewMode === "design"
                        ? (isDarkMode ? "bg-indigo-600 text-white" : "bg-indigo-600 text-white shadow-sm")
                        : (isDarkMode ? "text-neutral-500" : "text-neutral-500")
                    }`}
                  >
                    设计稿
                  </button>
                </div>
              </div>

              {/* 生成设计稿 */}
              <div className="space-y-4">
                <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-800'}`}>
                  <Wand2 size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                  AI 设计引擎
                </div>
                {isPipelineRunning && (
                  <button
                    onClick={handleStopPipeline}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all border ${
                      isDarkMode
                        ? 'border-rose-700/60 text-rose-300 hover:text-white hover:border-rose-500'
                        : 'border-rose-200 text-rose-600 hover:text-rose-700 hover:border-rose-400'
                    }`}
                  >
                    <X size={14} /> 停止所有生成
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsProgressPanelCollapsed(false);
                    handleRenderDesign();
                  }}
                  disabled={isCurrentSlideRendering || isLoadingSlide}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md relative overflow-hidden group ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white hover:opacity-90'
                      : 'bg-gradient-to-r from-rose-600 to-orange-500 text-white hover:opacity-90'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  {isCurrentSlideRendering ? (
                    <><Loader2 size={16} className="animate-spin" /> {renderProgress || "渲染中..."}</>
                  ) : (
                    <><Sparkles size={16} /> 生成本页设计稿</>
                  )}
                </button>
                <button
                  onClick={handleAiComputeLayout}
                  disabled={isAiLayoutComputing || isLoadingSlide}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all border ${
                    isDarkMode
                      ? 'border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'
                      : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-400'
                  }`}
                >
                  {isAiLayoutComputing ? (
                    <><Loader2 size={14} className="animate-spin" /> 重排版中...</>
                  ) : (
                    <><Grid size={14} /> 重新生成本页策划稿</>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm("将重新生成全部策划稿，并覆盖当前排版结果。是否继续？")) return;
                    runPipeline({ skipEnrich: true, skipDesign: true, force: true });
                  }}
                  disabled={isPipelineRunning}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all border ${
                    isDarkMode
                      ? 'border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'
                      : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-400'
                  }`}
                >
                  {isPipelineRunning ? (
                    <><Loader2 size={14} className="animate-spin" /> 全量策划稿生成中...</>
                  ) : (
                    <><RefreshCw size={14} /> 重新生成全部策划稿</>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm("将重新生成全部设计稿，并覆盖现有设计稿缓存。是否继续？")) return;
                    runPipeline({ skipEnrich: false, skipDesign: false, force: true });
                  }}
                  disabled={isPipelineRunning}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all border ${
                    isDarkMode
                      ? 'border-rose-700/60 text-rose-300 hover:text-white hover:border-rose-500'
                      : 'border-rose-200 text-rose-600 hover:text-rose-700 hover:border-rose-400'
                  }`}
                >
                  {isPipelineRunning ? (
                    <><Loader2 size={14} className="animate-spin" /> 全量设计稿生成中...</>
                  ) : (
                    <><Sparkles size={14} /> 生成全部设计稿</>
                  )}
                </button>
              </div>

              {/* Design Tokens */}
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
                        AI 仅针对选中区域进行润色，绝不破坏现有排版结构。
                      </p>
                    </div>
                  </div>

                  {selectedElement.type === 'text' && (
                     <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>场景化快捷指令</label>
                        <div className="flex flex-wrap gap-2">
                           {isLoadingSuggestions ? (
                             <div className={`flex items-center gap-2 px-3 py-2 text-xs ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                               <Loader2 size={12} className="animate-spin" /> 分析中...
                             </div>
                           ) : (
                             quickSuggestions.map((cmd, idx) => (
                               <button
                                 key={idx}
                                 onClick={() => {
                                   setAiPrompt(cmd);
                                   setTimeout(() => aiInputRef.current?.focus(), 50);
                                 }}
                                 className={`text-xs border px-3 py-2 rounded-lg transition-all ${
                                   isDarkMode
                                     ? 'bg-[#1A1A1A] hover:bg-[#252525] border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white'
                                     : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-900'
                                 }`}
                               >
                                 {cmd}
                               </button>
                             ))
                           )}
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
                        ref={aiInputRef}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={selectedElement?.content
                          ? `针对「${selectedElement.content.slice(0, 20)}...」输入调整想法...`
                          : "输入您的调整想法..."}
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
