import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Copy, RefreshCw, PenSquare, LayoutGrid, Plus, Sparkles, AlignLeft, Bot, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import type { SlideCard } from "../types";

// 开发阶段默认大纲（后端未连接时的占位数据）
const DEFAULT_OUTLINE: SlideCard[] = [
  {
    id: "slide-1",
    title: "封面：AI与未来设计",
    type: "cover",
    content: ["主标题：人工智能驱动的设计革命", "副标题：从效率工具到协同创作者", "演讲人：资深设计师"],
    visual: "极简暗黑风，中央放置发光AI芯片图形",
    color: "bg-amber-100",
  },
  {
    id: "slide-2",
    title: "目录：议程概览",
    type: "agenda",
    content: ["1. 背景：设计工具演进史", "2. 现状：生成式AI的突破", "3. 实践：AI设计工作流", "4. 展望：未来的人机共创"],
    visual: "左侧大号数字标题，右侧四宫格导航排版",
    color: "bg-blue-100",
  },
  {
    id: "slide-3",
    title: "痛点分析：传统设计的瓶颈",
    type: "content",
    content: ["效率低下：大量重复性修改与沟通成本", "灵感枯竭：面对新需求缺乏创意切入点", "规范约束：难以快速统一大规模资产"],
    visual: "三个带图标的悬浮卡片（便当盒），形成阶梯状排列",
    color: "bg-green-100",
  },
  {
    id: "slide-4",
    title: "核心方案：AI自动化生成工作流",
    type: "content",
    content: ["需求解析 (NLP) -> 结构生成 (LLM) -> 视觉排版 (Layout Gen) -> 资产输出 (SVG/Code)"],
    visual: "清晰的四个节点流程图，附带闪烁的发光连接线",
    color: "bg-purple-100",
  },
  {
    id: "slide-5",
    title: "案例展示：智能PPT生成工具",
    type: "showcase",
    content: ["从纯文本到可交互的高保真PPT只需要10秒钟。", "核心技术：Bento Grid 排版算法 + SVG 智能组装"],
    visual: "左图右文结构，左侧展示应用界面，右侧强调两个核心数据指标",
    color: "bg-rose-100",
  },
  {
    id: "slide-6",
    title: "结尾：拥抱变化，而非被替代",
    type: "ending",
    content: ["AI 不会替代设计师，只会替代不用 AI 的设计师。", "让我们共同开启下一代设计之旅。"],
    visual: "全屏背景图配合大号居中引用文案，增加品牌Logo",
    color: "bg-indigo-100",
  },
];

interface StickyOutlinePanelProps {
  initialOutline: SlideCard[];
  onOutlineChange?: (slides: SlideCard[]) => void;
}

export function StickyOutlinePanel({ initialOutline, onOutlineChange }: StickyOutlinePanelProps) {
  const [outline, setOutline] = useState<SlideCard[]>(
    initialOutline.length > 0 ? initialOutline : DEFAULT_OUTLINE
  );
  const [isJsonView, setIsJsonView] = useState(false);

  // AI Add Page State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSlide, setPreviewSlide] = useState<SlideCard | null>(null);

  // 同步上游
  useEffect(() => {
    onOutlineChange?.(outline);
  }, [outline]);

  // 更新 initialOutline 变化时同步
  useEffect(() => {
    if (initialOutline.length > 0) {
      setOutline(initialOutline);
    }
  }, [initialOutline]);

  const handleGenerate = () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setPreviewSlide(null);

    // Mock AI intelligent layout parsing
    setTimeout(() => {
      setPreviewSlide({
        id: `slide-${Date.now()}`,
        title: "智能提取的核心要点",
        type: "content",
        content: [
          "基于您的需求文本提炼的关键信息一",
          "基于您的需求文本提炼的关键信息二",
          "支持多层级结构的逻辑梳理"
        ],
        visual: "左侧大段文本，右侧展示相关概念的可视化图表或图标",
        color: "bg-teal-100",
      });
      setIsGenerating(false);
    }, 1500);
  };

  const handleAddSlide = () => {
    if (previewSlide) {
      setOutline([...outline, previewSlide]);
      setIsDialogOpen(false);
      // reset state after closing animation
      setTimeout(() => {
        setPreviewSlide(null);
        setInputText("");
      }, 300);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8 max-w-7xl mx-auto min-h-full flex flex-col"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <RefreshCw className="text-indigo-600 animate-[spin_3s_linear_infinite]" size={24} />
            内容大纲梳理 (便利贴法)
          </h2>
          <p className="text-neutral-500 mt-2 text-sm">
            基于专家模型生成的结构化大纲，您可以自由修改这些便利贴卡片，作为排版的骨架。
          </p>
        </div>
        <div className="flex gap-3 bg-white p-1 rounded-xl shadow-sm border border-neutral-200">
          <button
            onClick={() => setIsJsonView(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              !isJsonView ? "bg-indigo-50 text-indigo-700" : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <LayoutGrid size={16} /> 便利贴视图
          </button>
          <button
            onClick={() => setIsJsonView(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isJsonView ? "bg-indigo-50 text-indigo-700" : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <Copy size={16} /> JSON 源数据
          </button>
        </div>
      </div>

      {!isJsonView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
          {outline.map((slide, index) => (
            <motion.div
              key={slide.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`relative ${slide.color} p-6 rounded-sm shadow-md rotate-1 hover:rotate-0 transition-transform duration-300 group`}
              style={{
                boxShadow: "3px 5px 15px rgba(0,0,0,0.08)",
                clipPath: "polygon(0 0, 100% 0, 100% 90%, 95% 100%, 0 100%)",
              }}
            >
              {/* Folded corner effect */}
              <div
                className="absolute bottom-0 right-0 w-8 h-8 opacity-40 mix-blend-multiply"
                style={{
                  background: "linear-gradient(to top left, rgba(0,0,0,0.2) 50%, transparent 50%)",
                }}
              />

              <div className="flex justify-between items-start mb-4 border-b border-black/10 pb-2">
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider bg-white/40 px-2 py-1 rounded">
                  Slide {index + 1} · {slide.type}
                </span>
                <button className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-black transition-opacity">
                  <PenSquare size={16} />
                </button>
              </div>

              <h3 className="font-bold text-lg text-neutral-900 leading-tight mb-3">
                {slide.title}
              </h3>

              <ul className="space-y-2 mb-4">
                {slide.content.map((pt, i) => (
                  <li key={i} className="text-sm text-neutral-800 leading-relaxed flex gap-2">
                    <span className="text-black/40 mt-[2px]">-</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-3 border-t border-black/10">
                <p className="text-xs font-medium text-neutral-600 italic">
                  🎨 视觉：{slide.visual}
                </p>
              </div>
            </motion.div>
          ))}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-2 border-dashed border-neutral-300 bg-transparent hover:bg-neutral-50 rounded-xl flex items-center justify-center p-6 min-h-[240px] cursor-pointer text-neutral-400 hover:text-indigo-600 transition-colors"
              >
                <div className="text-center space-y-2 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                    <Plus size={24} className="text-neutral-500" />
                  </div>
                  <p className="font-medium text-sm">自主添加/AI智能生成</p>
                  <p className="text-xs text-neutral-400">快速粘贴需求生成卡片</p>
                </div>
              </motion.div>
            </DialogTrigger>

            <DialogContent className="w-[90vw] h-[80vh] flex flex-col overflow-hidden p-0 gap-0 border-0 shadow-2xl bg-white" style={{ maxWidth: "1000px" }}>
              {/* Header */}
              <div className="p-6 border-b border-neutral-100 flex items-center gap-3 bg-white">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <DialogTitle className="text-xl">AI智能添加页面</DialogTitle>
                  <DialogDescription className="text-neutral-500 mt-1">
                    直接粘贴您的长文本需求，AI将自动提取关键结构并在右侧预览呈现。
                  </DialogDescription>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-neutral-50/50">
                {/* Left Input */}
                <div className="flex-1 p-6 flex flex-col border-r border-neutral-200 bg-white">
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-neutral-700">
                    <AlignLeft size={16} className="text-indigo-500" />
                    粘贴需求文本
                  </div>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="例如：接下来我想讲一下我们在2024年的销售数据，Q1增长了15%，Q2因为市场活动增长了30%..."
                    className="flex-1 w-full resize-none rounded-xl border border-neutral-200 p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow text-neutral-700 text-sm leading-relaxed"
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleGenerate}
                      disabled={!inputText.trim() || isGenerating}
                      className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                        !inputText.trim() || isGenerating
                          ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          AI深度解析中...
                        </>
                      ) : (
                        <>
                          <Bot size={18} />
                          AI 智能排版为大纲
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Preview */}
                <div className="flex-1 p-6 flex flex-col bg-neutral-100/50">
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-neutral-700">
                    <LayoutGrid size={16} className="text-indigo-500" />
                    生成预览窗口
                  </div>
                  <div className="flex-1 flex items-center justify-center rounded-xl bg-neutral-200/50 p-6 overflow-y-auto">
                    {isGenerating ? (
                      <div className="text-center flex flex-col items-center gap-4 text-neutral-400">
                        <RefreshCw className="w-8 h-8 animate-[spin_3s_linear_infinite]" />
                        <p className="text-sm">正在提炼核心内容与层级关系...</p>
                      </div>
                    ) : previewSlide ? (
                      <div
                        className={`relative ${previewSlide.color} p-6 rounded-sm shadow-xl w-full max-w-[320px] mx-auto`}
                        style={{
                          boxShadow: "3px 5px 25px rgba(0,0,0,0.1)",
                          clipPath: "polygon(0 0, 100% 0, 100% 90%, 95% 100%, 0 100%)",
                        }}
                      >
                        <div
                          className="absolute bottom-0 right-0 w-8 h-8 opacity-40 mix-blend-multiply"
                          style={{
                            background: "linear-gradient(to top left, rgba(0,0,0,0.2) 50%, transparent 50%)",
                          }}
                        />
                        <div className="flex justify-between items-start mb-4 border-b border-black/10 pb-2">
                          <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider bg-white/40 px-2 py-1 rounded">
                            NEW · {previewSlide.type}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-neutral-900 leading-tight mb-3">
                          {previewSlide.title}
                        </h3>
                        <ul className="space-y-2 mb-4">
                          {previewSlide.content.map((pt: string, i: number) => (
                            <li key={i} className="text-sm text-neutral-800 leading-relaxed flex gap-2">
                              <span className="text-black/40 mt-[2px]">-</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 pt-3 border-t border-black/10">
                          <p className="text-xs font-medium text-neutral-600 italic">
                            🎨 视觉：{previewSlide.visual}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-neutral-400 bg-white/50 border border-neutral-200 border-dashed rounded-xl w-full h-full flex flex-col items-center justify-center gap-3">
                        <PenSquare className="w-8 h-8 opacity-50" />
                        <p className="text-sm">尚未生成内容<br/>在左侧输入需求并点击生成</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddSlide}
                  disabled={!previewSlide}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    previewSlide
                      ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  <Plus size={16} /> 确认添加到大纲
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="flex-1 bg-[#1e1e1e] rounded-xl overflow-hidden shadow-inner border border-neutral-800 relative">
          <button className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg backdrop-blur-sm transition-colors flex items-center gap-2 text-sm">
            <Copy size={16} /> 复制大纲
          </button>
          <pre className="p-6 text-[#9cdcfe] font-mono text-sm leading-relaxed overflow-x-auto h-full">
            <span className="text-[#c586c0]">const</span>{" "}
            <span className="text-[#4fc1ff]">pptOutline</span>{" "}
            <span className="text-[#d4d4d4]">=</span>{" "}
            {JSON.stringify(outline, null, 2)}
          </pre>
        </div>
      )}
    </motion.div>
  );
}
