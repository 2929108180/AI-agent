// @ts-ignore
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Code, Eye, Presentation, FileCode2, TerminalSquare, Copy, CheckCircle2 } from "lucide-react";

export function SVGExportPanel() {
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  // A simulated SVG string output for Slide 3
  const mockSvgCode = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1920" height="1080" fill="#F8FAFC"/>
  
  <!-- Header -->
  <text fill="#0F172A" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="64" font-weight="bold" letter-spacing="0em"><tspan x="120" y="150">痛点分析：传统设计的瓶颈</tspan></text>
  <text fill="#64748B" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="28" font-weight="500" letter-spacing="0em"><tspan x="120" y="210">为什么我们需要一次工具范式的革命？</tspan></text>
  <line x1="120" y1="260" x2="1800" y2="260" stroke="#E2E8F0" stroke-width="4"/>

  <!-- Main Box (Efficiency) -->
  <rect x="120" y="320" width="1080" height="640" rx="40" fill="url(#paint0_linear)"/>
  <rect x="120" y="320" width="1080" height="640" rx="40" stroke="#E2E8F0" stroke-opacity="0.6" stroke-width="2"/>
  <rect x="180" y="380" width="80" height="80" rx="24" fill="#FFE4E6"/>
  <text fill="#E11D48" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="40" font-weight="bold" letter-spacing="0em"><tspan x="208" y="435">1</tspan></text>
  <text fill="#1E293B" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="48" font-weight="bold" letter-spacing="0em"><tspan x="180" y="530">效率低下</tspan></text>
  <text fill="#475569" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="32" font-weight="normal" letter-spacing="0em"><tspan x="180" y="600">大量重复性的排版修改、图片对</tspan></text>
  <text fill="#475569" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="32" font-weight="normal" letter-spacing="0em"><tspan x="180" y="650">齐与字体调整，占用了设计师</tspan></text>
  <text fill="#475569" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="32" font-weight="normal" letter-spacing="0em"><tspan x="180" y="700">70%以上的宝贵时间...</tspan></text>

  <!-- Graphic Placeholder -->
  <rect x="180" y="760" width="960" height="140" rx="20" fill="white" fill-opacity="0.5" stroke="white" stroke-width="2"/>
  <circle cx="660" cy="830" r="30" fill="#E11D48" fill-opacity="0.1"/>

  <!-- Top Right Box (Inspiration) -->
  <rect x="1240" y="320" width="680" height="300" rx="40" fill="url(#paint1_linear)"/>
  <rect x="1240" y="320" width="680" height="300" rx="40" stroke="#E0E7FF" stroke-width="2"/>
  <rect x="1280" y="360" width="60" height="60" rx="16" fill="#C7D2FE"/>
  <text fill="#4338CA" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="32" font-weight="bold" letter-spacing="0em"><tspan x="1302" y="402">2</tspan></text>
  <text fill="#1E293B" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="36" font-weight="bold" letter-spacing="0em"><tspan x="1360" y="405">灵感枯竭</tspan></text>
  <text fill="#475569" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="24" font-weight="normal" letter-spacing="0em"><tspan x="1360" y="460">面对新的业务需求，往往缺乏创意切入</tspan></text>
  <text fill="#475569" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="24" font-weight="normal" letter-spacing="0em"><tspan x="1360" y="500">点，难以在短时间内提供高质量...</tspan></text>

  <!-- Bottom Right Box (Constraint) -->
  <rect x="1240" y="660" width="680" height="300" rx="40" fill="url(#paint2_linear)"/>
  <rect x="1240" y="660" width="680" height="300" rx="40" stroke="#D1FAE5" stroke-width="2"/>
  <rect x="1280" y="700" width="60" height="60" rx="16" fill="#A7F3D0"/>
  <text fill="#065F46" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="32" font-weight="bold" letter-spacing="0em"><tspan x="1302" y="742">3</tspan></text>
  <text fill="#1E293B" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="36" font-weight="bold" letter-spacing="0em"><tspan x="1360" y="745">规范约束</tspan></text>
  <text fill="#475569" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="24" font-weight="normal" letter-spacing="0em"><tspan x="1360" y="800">难以快速统一大规模资产，组件复用</tspan></text>
  <text fill="#475569" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="24" font-weight="normal" letter-spacing="0em"><tspan x="1360" y="840">率低，最终输出结果常常存在...</tspan></text>

  <!-- Gradients -->
  <defs>
    <linearGradient id="paint0_linear" x1="120" y1="320" x2="1200" y2="960" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8FAFC"/>
      <stop offset="1" stop-color="#F1F5F9"/>
    </linearGradient>
    <linearGradient id="paint1_linear" x1="1240" y1="320" x2="1920" y2="620" gradientUnits="userSpaceOnUse">
      <stop stop-color="#EEF2FF"/>
      <stop offset="1" stop-color="#EFF6FF"/>
    </linearGradient>
    <linearGradient id="paint2_linear" x1="1240" y1="660" x2="1920" y2="960" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ECFDF5"/>
      <stop offset="1" stop-color="#F0FDFA"/>
    </linearGradient>
  </defs>
</svg>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(mockSvgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-200">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-8 py-4 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <TerminalSquare className="text-emerald-500" size={24} />
          <h2 className="text-lg font-bold text-white tracking-wide">SVG 生成引擎</h2>
        </div>

        <div className="flex bg-neutral-800 rounded-lg p-1 border border-neutral-700">
          <button
            onClick={() => setViewMode("preview")}
            className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${
              viewMode === "preview"
                ? "bg-neutral-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Eye size={16} /> 视觉预览
          </button>
          <button
            onClick={() => setViewMode("code")}
            className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${
              viewMode === "code"
                ? "bg-neutral-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Code size={16} /> SVG 代码
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
            <Presentation size={18} /> 全屏演示
          </button>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-900/50 border border-emerald-500/50">
            <Download size={18} /> 下载 PPTX / SVG
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-hidden relative p-8">
        <AnimatePresence mode="wait">
          {viewMode === "preview" ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full flex items-center justify-center bg-neutral-900/50 rounded-2xl border border-neutral-800"
            >
              {/* This mimics exactly what the SVG renders */}
              <div
                className="w-full max-w-[1200px] aspect-video bg-white shadow-2xl overflow-hidden relative origin-center"
                style={{ transform: "scale(0.9)" }}
                dangerouslySetInnerHTML={{ __html: mockSvgCode }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full h-full relative"
            >
              <div className="absolute top-4 right-6 flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-mono transition-colors border border-neutral-700"
                >
                  {copied ? (
                    <><CheckCircle2 size={16} className="text-emerald-500"/> 已复制</>
                  ) : (
                    <><Copy size={16}/> 复制代码</>
                  )}
                </button>
                <button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-mono transition-colors border border-neutral-700">
                  <FileCode2 size={16} /> 保存为 .svg
                </button>
              </div>
              <pre className="w-full h-full bg-[#1e1e1e] p-6 rounded-xl overflow-auto text-sm leading-relaxed font-mono custom-scrollbar text-[#d4d4d4] border border-neutral-800 shadow-inner">
                <code className="block whitespace-pre">
                  {/* Very basic syntax highlighting simulation */}
                  {mockSvgCode.split('\n').map((line, i) => {
                    const escapedLine = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const coloredLine = escapedLine
                      .replace(/("[^"]*")/g, '<span class="text-orange-300">$1</span>')
                      .replace(/([a-zA-Z-]+)=/g, '<span class="text-indigo-300">$1</span>=')
                      .replace(/&lt;(\/?)([a-zA-Z0-9-]+)/g, '<span class="text-blue-400">&lt;$1$2</span>')
                      .replace(/&gt;/g, '<span class="text-blue-400">&gt;</span>');
                    return (
                      <div key={i} className="hover:bg-white/5 px-2 -mx-2 rounded flex">
                        <span className="text-neutral-600 inline-block w-8 shrink-0 select-none border-r border-neutral-700 mr-4 text-right pr-2">{i + 1}</span>
                        <span className="break-all" dangerouslySetInnerHTML={{ __html: coloredLine }} />
                      </div>
                    );
                  })}
                </code>
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
