// @ts-ignore
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Maximize2, MousePointer2, Grid, Layers, Type, Image as ImageIcon } from "lucide-react";

const SLIDES = [
  { id: 1, title: "封面", type: "cover" },
  { id: 2, title: "目录", type: "bento-4" },
  { id: 3, title: "痛点", type: "bento-3-asym" },
  { id: 4, title: "方案", type: "bento-hero" },
  { id: 5, title: "案例", type: "bento-split" },
  { id: 6, title: "结尾", type: "ending" },
];

export function BentoLayoutPanel() {
  const [activeSlide, setActiveSlide] = useState(3);

  return (
    <div className="flex h-full bg-neutral-100 overflow-hidden">
      {/* Sidebar - Slide Thumbnails */}
      <div className="w-64 bg-white border-r border-neutral-200 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
          <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            排版策划 (Bento Grid)
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            选择对应的版式结构以预览大纲映射效果
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {SLIDES.map((slide, index) => (
            <motion.div
              key={slide.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveSlide(slide.id)}
              className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                activeSlide === slide.id
                  ? "border-indigo-600 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]"
                  : "border-transparent hover:border-neutral-300"
              }`}
            >
              <div className="aspect-video bg-neutral-100 p-2 flex items-center justify-center relative">
                <div className="absolute top-2 left-2 w-5 h-5 rounded-md bg-black/40 text-white text-[10px] font-bold flex items-center justify-center backdrop-blur-sm">
                  {index + 1}
                </div>
                {/* Mini representation of grid */}
                <div className="w-2/3 h-2/3 flex gap-1 items-center justify-center opacity-60">
                  <Grid size={24} className="text-neutral-400" />
                </div>
              </div>
              <div
                className={`text-xs font-medium py-2 px-3 text-center ${
                  activeSlide === slide.id ? "bg-indigo-50 text-indigo-700" : "bg-white text-neutral-600"
                }`}
              >
                {slide.title}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 p-8 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-sm font-medium hover:bg-neutral-50 flex items-center gap-2 transition-colors">
              <Grid size={16} /> 切换版式
            </button>
            <button className="px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-sm font-medium hover:bg-neutral-50 flex items-center gap-2 transition-colors">
              <MousePointer2 size={16} /> 微调网格
            </button>
          </div>
          <button className="p-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Maximize2 size={20} />
          </button>
        </div>

        {/* 16:9 Canvas Container */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* A fake presentation canvas */}
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-[1000px] aspect-video bg-white shadow-2xl rounded-2xl overflow-hidden p-8 ring-1 ring-black/5"
          >
            <AnimatePresence mode="wait">
              {activeSlide === 3 && <BentoLayoutAsym key="slide-3" />}
              {activeSlide !== 3 && <BentoLayoutPlaceholder key={`slide-${activeSlide}`} slide={activeSlide} />}
            </AnimatePresence>
          </motion.div>
        </div>
        <p className="text-center text-sm text-neutral-400 mt-6 animate-pulse">
          提示：在此阶段您可以自由调整「便当盒」的宽高比例与模块对应关系。
        </p>
      </div>
    </div>
  );
}

// A detailed Bento Grid Example (Asymmetric 3-box)
function BentoLayoutAsym() {
  return (
    <div className="w-full h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex-shrink-0 flex items-end justify-between border-b-2 border-neutral-100 pb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-neutral-900 tracking-tight">痛点分析：传统设计的瓶颈</h1>
          <p className="text-lg text-neutral-500 mt-2 font-medium">为什么我们需要一次工具范式的革命？</p>
        </div>
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
          <Type size={24} />
        </div>
      </div>

      {/* Bento Grid Content */}
      <div className="flex-1 grid grid-cols-12 grid-rows-2 gap-6 pb-2">
        {/* Large Main Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-7 row-span-2 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-8 border border-neutral-200/60 shadow-inner flex flex-col justify-between group cursor-pointer hover:shadow-md transition-shadow"
        >
          <div>
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <span className="text-2xl font-bold">1</span>
            </div>
            <h2 className="text-3xl font-bold text-neutral-800 mb-4">效率低下</h2>
            <p className="text-neutral-600 text-lg leading-relaxed">
              大量重复性的排版修改、图片对齐与字体调整，占用了设计师70%以上的宝贵时间，产生巨大沟通成本。
            </p>
          </div>
          <div className="h-32 bg-white/50 rounded-xl border border-white mt-8 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-rose-500/5 mix-blend-overlay"></div>
            <ImageIcon size={32} className="text-rose-200" />
          </div>
        </motion.div>

        {/* Top Right Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="col-span-5 row-span-1 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-6 border border-indigo-100 shadow-inner group cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-center"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-indigo-200 text-indigo-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <span className="text-xl font-bold">2</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-800">灵感枯竭</h2>
          </div>
          <p className="text-neutral-600 text-sm leading-relaxed pl-14">
            面对新的业务需求，往往缺乏创意切入点，难以在短时间内提供高质量的视觉隐喻。
          </p>
        </motion.div>

        {/* Bottom Right Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="col-span-5 row-span-1 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-100 shadow-inner group cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-center"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <span className="text-xl font-bold">3</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-800">规范约束</h2>
          </div>
          <p className="text-neutral-600 text-sm leading-relaxed pl-14">
            难以快速统一大规模资产，组件复用率低，最终输出结果常常存在像素级误差。
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// Fallback layout for other slides
function BentoLayoutPlaceholder({slide, key}: { slide: number, key?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300">
      <div className="text-center">
        <Grid size={48} className="mx-auto text-neutral-300 mb-4" />
        <h2 className="text-2xl font-bold text-neutral-400">页面 {slide} 便当排版渲染中...</h2>
        <p className="text-neutral-400 mt-2">支持拖拽与缩放区块</p>
      </div>
    </div>
  );
}
