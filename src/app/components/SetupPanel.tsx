import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, UploadCloud, X, Wand2, Target, AlignLeft, FileText, ArrowRight,
  Lightbulb, FileBox, Loader2, Undo2, RefreshCw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { fetchSSE } from "../lib/sse";
import type { SlideCard, GenerationPhase } from "../types";

interface SetupPanelProps {
  onComplete: (slides: SlideCard[]) => void;
}

export function SetupPanel({ onComplete }: SetupPanelProps) {
  const [hasReference, setHasReference] = useState<boolean>(false);
  const [topic, setTopic] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{name: string, size: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 受控状态
  const [audience, setAudience] = useState("professional");
  const [length, setLength] = useState("standard");

  // 生成状态
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>("idle");
  const [streamedText, setStreamedText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // AI 润色状态
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishHistory, setPolishHistory] = useState<string[]>([]);
  const isPolished = polishHistory.length > 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedFile({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB"
      });
      setReferenceText("");
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit = generationPhase === "idle" || generationPhase === "error"
    ? (hasReference
        ? (uploadedFile !== null || referenceText.trim().length > 10)
        : topic.trim().length > 2)
    : false;

  const isGenerating = generationPhase !== "idle" && generationPhase !== "error" && generationPhase !== "complete";

  const handleSubmit = async () => {
    const abort = new AbortController();
    abortRef.current = abort;
    setStreamedText("");
    setGenerationPhase("searching");

    try {
      let url: string;
      let body: object | FormData;

      if (hasReference && uploadedFile && fileInputRef.current?.files?.[0]) {
        url = "/api/v1/ingestion/track-b";
        const formData = new FormData();
        formData.append("file", fileInputRef.current.files[0]);
        if (referenceText.trim()) formData.append("reference_text", referenceText);
        formData.append("audience", audience);
        formData.append("length", length);
        body = formData;
      } else if (hasReference) {
        url = "/api/v1/ingestion/track-b/text";
        body = { reference_text: referenceText, audience, length };
      } else {
        url = "/api/v1/ingestion/track-a";
        body = { topic, audience, length };
      }

      await fetchSSE(url, body, {
        onStatus: (phase) => setGenerationPhase(phase as GenerationPhase),
        onToken: (content) => setStreamedText((prev) => prev + content),
        onOutline: (slides) => {
          setGenerationPhase("complete");
          onComplete(slides);
        },
        onError: (msg) => {
          setGenerationPhase("error");
          console.error("SSE error:", msg);
        },
        onDone: () => {
          // 如果还没收到 outline 事件，保持当前状态
        },
      }, abort.signal);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setGenerationPhase("error");
        console.error("Fetch error:", err);
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setGenerationPhase("idle");
    setStreamedText("");
  };

  const handlePolish = async (instruction?: string) => {
    const textToPolish = hasReference ? referenceText : topic;
    if (!textToPolish.trim() || isPolishing) return;
    setIsPolishing(true);

    // Save current topic to history for Undo
    setPolishHistory(prev => [...prev, textToPolish]);

    let polished = "";
    try {
      const payload = instruction ? { topic: textToPolish, audience, instruction } : { topic: textToPolish, audience };
      // Sending additional instruction if provided (simulated backend support)
      await fetchSSE("/api/v1/ingestion/polish", payload, {
        onToken: (content) => {
          polished += content;
          if (hasReference) setReferenceText(polished);
          else setTopic(polished);
        },
        onDone: () => setIsPolishing(false),
        onError: () => setIsPolishing(false),
      });
    } catch {
      setIsPolishing(false);
    }
  };

  const handleUndoPolish = () => {
    if (polishHistory.length > 0) {
      const prevTopic = polishHistory[polishHistory.length - 1];
      if (hasReference) setReferenceText(prevTopic);
      else setTopic(prevTopic);
      setPolishHistory(prev => prev.slice(0, -1));
    }
  };

  const phaseLabel: Record<string, string> = {
    searching: "正在搜索背景资料...",
    parsing: "正在解析文档...",
    generating: "AI 架构师正在构思大纲...",
  };

  const buttonText = () => {
    if (generationPhase === "error") return "生成失败，点击重试";
    if (!hasReference) return "开始头脑风暴大纲";
    return "提取核心知识并生成大纲";
  };

  const currentTrackLabel = hasReference ? "Track B / Doc to PPT" : "Track A / Zero to One";

  const panelMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.12 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-auto max-w-[1320px] px-5 py-10 sm:px-8 lg:py-14 xl:px-10"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] overflow-hidden">
        <div className="absolute left-[10%] top-10 h-44 w-44 rounded-full bg-indigo-100/60" />
        <div className="absolute right-[14%] top-12 h-48 w-48 rounded-full bg-emerald-100/60" />
        <div className="absolute inset-x-[10%] top-24 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
      </div>

      <div className="mb-12 flex flex-col items-center text-center">
        <div className="mb-5 inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
          <Wand2 className="h-5 w-5 text-indigo-600" />
        </div>
        <h1 className="mb-4 max-w-4xl text-4xl font-extrabold tracking-[-0.04em] text-neutral-900 sm:text-5xl lg:text-[3.6rem] lg:leading-[1.03]">
          创建全新的演示文稿
        </h1>
        <p className="max-w-3xl text-base leading-8 text-neutral-500 sm:text-lg">
          告诉 AI 您的出发点。如果您只有大概想法，AI 将为您发散结构；如果您已有详细资料，AI 将精准提取知识。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.5fr)_360px] xl:items-start">

        {/* Left Column: Generation Modes & Input */}
        <div className="flex min-w-0 flex-col gap-6">

          {/* Main Choice */}
          <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-7 lg:p-8">
            <h3 className="text-base font-semibold text-neutral-800 mb-4">您有现成的参考资料吗？</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                onClick={() => {
                  if (isGenerating) return;
                  setHasReference(false);
                  if (audience === "auto") setAudience("professional");
                }}
                className={`group relative min-h-[188px] overflow-hidden rounded-[28px] border p-6 text-left transition-all duration-300 ${
                  !hasReference
                    ? "border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-500/10"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {!hasReference && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-indigo-100/60 to-transparent transition-all"></div>}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-colors ${!hasReference ? 'bg-indigo-100 text-indigo-600 ring-indigo-200' : 'bg-neutral-100 text-neutral-500 ring-neutral-200'}`}>
                  <Lightbulb size={20} />
                </div>
                <div className={`font-semibold text-base mb-1 ${!hasReference ? 'text-indigo-900' : 'text-neutral-700'}`}>从零开始发散</div>
                <div className="text-xs text-neutral-500 leading-relaxed">只需输入一句话主题或大纲思路，由大模型为您策划结构。</div>
              </button>

              <button
                onClick={() => {
                  if (isGenerating) return;
                  setHasReference(true);
                  setAudience("auto");
                }}
                className={`group relative min-h-[188px] overflow-hidden rounded-[28px] border p-6 text-left transition-all duration-300 ${
                  hasReference
                    ? "border-emerald-400 bg-emerald-50 shadow-md ring-2 ring-emerald-500/10"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {hasReference && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-emerald-100/60 to-transparent transition-all"></div>}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-colors ${hasReference ? 'bg-emerald-100 text-emerald-600 ring-emerald-200' : 'bg-neutral-100 text-neutral-500 ring-neutral-200'}`}>
                  <FileBox size={20} />
                </div>
                <div className={`font-semibold text-base mb-1 ${hasReference ? 'text-emerald-900' : 'text-neutral-700'}`}>基于已有资料提炼</div>
                <div className="text-xs text-neutral-500 leading-relaxed">上传文档或粘贴长篇草稿，AI 将提取知识防止幻觉。</div>
              </button>
            </div>
          </div>

          {/* Dynamic Input Area Based on Choice */}
          <div className="relative min-h-[420px] overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.98))]" />
            <AnimatePresence mode="wait">
              {!hasReference ? (
                <motion.div
                  key="no-ref"
                  {...panelMotion}
                  className="relative flex h-full w-full flex-col"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-2">
                      <AlignLeft size={18} className="text-indigo-500" />
                      <h3 className="font-semibold text-neutral-800">一句话简述您的需求</h3>
                    </div>
                  </div>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isGenerating}
                    placeholder="例如：我要做一场介绍全新 AI 智能咖啡机的产品发布会。受众是科技极客和咖啡爱好者。核心卖点是：豆种智能识别、微米级研磨、全息温控..."
                    className="min-h-[320px] flex-1 w-full resize-none bg-transparent px-6 py-7 text-base leading-8 text-neutral-700 outline-none placeholder-neutral-400 disabled:opacity-50 sm:px-8"
                  />
                  <div className="flex min-h-[72px] items-center justify-between border-t border-neutral-100 bg-neutral-50 px-4 py-3 sm:px-6">
                    {/* Undo Button */}
                    <AnimatePresence>
                      {isPolished && (
                        <motion.button 
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          onClick={handleUndoPolish}
                          disabled={isPolishing || isGenerating}
                          className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 disabled:opacity-50 overflow-hidden px-2 whitespace-nowrap"
                        >
                          <Undo2 size={14} /> 撤销
                        </motion.button>
                      )}
                    </AnimatePresence>
                    
                    {/* Action buttons */}
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                       {isPolishing ? (
                          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm">
                             <Loader2 size={16} className="animate-spin" /> AI 思考中...
                          </div>
                       ) : !isPolished ? (
                          <button
                            onClick={() => handlePolish()}
                            disabled={!topic.trim() || isGenerating}
                            className="flex items-center gap-1.5 rounded-2xl border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Sparkles size={16} /> AI 润色扩写
                          </button>
                       ) : (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm"
                          >
                             <button onClick={() => handlePolish("更详尽")} disabled={isGenerating} className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1">✨ 更详尽</button>
                             <button onClick={() => handlePolish("更精简")} disabled={isGenerating} className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1">🔪 更精简</button>
                             <button onClick={() => handlePolish("更具煽动性")} disabled={isGenerating} className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1">🎯 煽动性</button>
                             <div className="w-px h-4 bg-neutral-200 self-center mx-1"></div>
                             <button onClick={() => handlePolish()} disabled={isGenerating} className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1">
                               <RefreshCw size={14} /> 换个说法
                             </button>
                          </motion.div>
                       )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="has-ref"
                  {...panelMotion}
                  className="relative flex h-full w-full flex-col bg-neutral-50/20"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-emerald-500" />
                      <h3 className="font-semibold text-neutral-800">提供您的参考资料</h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                    {/* File Upload Section */}
                    <div>
                      {!uploadedFile ? (
                        <div
                          onClick={() => !isGenerating && fileInputRef.current?.click()}
                          className="group flex w-full cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-neutral-300 bg-white p-10 transition-colors hover:border-emerald-400 hover:bg-emerald-50/60"
                        >
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100 transition-transform group-hover:scale-110">
                            <UploadCloud size={24} strokeWidth={2} />
                          </div>
                          <p className="text-sm font-semibold text-neutral-800 mb-1">点击上传文档 (PDF / Word / PPT)</p>
                          <p className="text-xs text-neutral-400">我们将解析文档并为您重组为结构化演示大纲</p>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.docx,.txt,.md,.pptx"
                            onChange={handleFileUpload}
                          />
                        </div>
                      ) : (
                        <div className="flex w-full items-center justify-between rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-500 shadow-sm">
                              <FileText size={24} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-neutral-800 text-sm">{uploadedFile.name}</h4>
                              <p className="text-xs text-neutral-500 mt-0.5">{uploadedFile.size} · 已就绪</p>
                            </div>
                          </div>
                          <button
                            onClick={removeFile}
                            disabled={isGenerating}
                            className="text-neutral-400 hover:text-rose-500 p-2 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 px-1">
                      <div className="flex-1 h-px bg-neutral-200"></div>
                      <span className="text-xs font-medium text-neutral-400 tracking-widest">+ (可选配合补充说明)</span>
                      <div className="flex-1 h-px bg-neutral-200"></div>
                    </div>

                    {/* Text Paste Section */}
                    <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white transition-all focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400">
                      <textarea
                        value={referenceText}
                        onChange={(e) => setReferenceText(e.target.value)}
                        disabled={isGenerating}
                        placeholder={uploadedFile ? "+ 在此补充附加要求或具体文本说明（可选）..." : "直接在此粘贴您的长篇草稿、会议纪要或参考文章..."}
                        className="min-h-[210px] flex-1 w-full resize-none bg-transparent p-5 text-sm leading-7 text-neutral-700 outline-none placeholder-neutral-400"
                      />
                      {/* Action Bar for Polish */}
                      <div className="flex min-h-[58px] items-center justify-between rounded-b-[28px] border-t border-neutral-100 bg-neutral-50 p-3">
                        {/* Undo Button */}
                        <AnimatePresence>
                          {isPolished && (
                            <motion.button 
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              onClick={handleUndoPolish}
                              disabled={isPolishing || isGenerating}
                              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 disabled:opacity-50 overflow-hidden px-2 whitespace-nowrap"
                            >
                              <Undo2 size={14} /> 撤销
                            </motion.button>
                          )}
                        </AnimatePresence>
                        
                        {/* Action buttons */}
                        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                           {isPolishing ? (
                              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                                 <Loader2 size={14} className="animate-spin" /> AI 思考中...
                              </div>
                           ) : !isPolished ? (
                              <button
                                onClick={() => handlePolish()}
                                disabled={!referenceText.trim() || isGenerating}
                                className="flex items-center gap-1.5 rounded-2xl border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Sparkles size={14} /> AI 润色扩写
                              </button>
                           ) : (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-wrap overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm"
                              >
                                 <button onClick={() => handlePolish("更详尽")} disabled={isGenerating} className="px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1">✨ 更详尽</button>
                                 <button onClick={() => handlePolish("更精简")} disabled={isGenerating} className="px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1">🔪 更精简</button>
                                 <button onClick={() => handlePolish("更具煽动性")} disabled={isGenerating} className="px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1">🎯 煽动性</button>
                                 <div className="w-px h-3 bg-neutral-200 self-center mx-1"></div>
                                 <button onClick={() => handlePolish()} disabled={isGenerating} className="px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1">
                                   <RefreshCw size={12} /> 换个说法
                                 </button>
                              </motion.div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Settings & CTA */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-6">
          <div className={`rounded-[24px] border px-4 py-4 ${hasReference ? "border-emerald-100 bg-emerald-50/80" : "border-indigo-100 bg-indigo-50/80"}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">Current track</div>
            <div className={`mt-2 text-sm font-semibold ${hasReference ? "text-emerald-800" : "text-indigo-800"}`}>{currentTrackLabel}</div>
            <div className="mt-1 text-xs leading-6 text-neutral-500">
              {hasReference ? "Use source material for a more grounded outline." : "Start from a topic and let the model expand the structure."}
            </div>
          </div>

          <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              <div className="border-b border-neutral-100 pb-3">
                <h3 className="font-semibold text-neutral-800">目标与规格</h3>
                <p className="mt-1 text-xs text-neutral-500">精细控制生成结果的调性</p>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <Target size={16} className="text-indigo-500" /> 汇报对象 (Audience)
                </label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="h-[44px] w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm transition-colors outline-none focus:ring-1 focus:ring-indigo-500 data-[state=open]:border-indigo-500 data-[state=open]:ring-1 data-[state=open]:ring-indigo-500">
                    <SelectValue placeholder="请选择汇报对象" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-neutral-200 bg-white p-1 shadow-xl">
                    {hasReference && (
                      <SelectItem value="auto" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">
                        <div className="flex items-center gap-2 font-semibold text-indigo-600"><Sparkles size={14}/> 智能匹配 (根据内容推断)</div>
                      </SelectItem>
                    )}
                    <SelectItem value="professional" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">专业同行 / 专家 (严谨深究)</SelectItem>
                    <SelectItem value="investor" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">投资人 / 高管 (ROI导向)</SelectItem>
                    <SelectItem value="consumer" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">大众消费者 (情绪共鸣)</SelectItem>
                    <SelectItem value="internal" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">内部员工 / 培训 (清晰结构)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <FileText size={16} className="text-indigo-500" /> 预期篇幅 (Length)
                </label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger className="h-[44px] w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm transition-colors outline-none focus:ring-1 focus:ring-indigo-500 data-[state=open]:border-indigo-500 data-[state=open]:ring-1 data-[state=open]:ring-indigo-500">
                    <SelectValue placeholder="请选择预期篇幅" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-neutral-200 bg-white p-1 shadow-xl">
                    <SelectItem value="short" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">电梯演讲 (约 5-8 页)</SelectItem>
                    <SelectItem value="standard" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">标准汇报 (约 12-15 页)</SelectItem>
                    <SelectItem value="long" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">深度路演 (约 20-30 页)</SelectItem>
                    <SelectItem value="conference" className="cursor-pointer rounded-lg hover:bg-neutral-50 focus:bg-emerald-50 focus:text-emerald-700">大型会议演讲 (约 35-45 页)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs leading-relaxed text-blue-800">
                  基于您的选择，后台引擎将会调用 <strong className="font-semibold">{!hasReference ? "Prompt 1-A" : "Prompt 1-B"}</strong> 链路，进行对应的结构抽象计算。
                </p>
              </div>
            </div>
          </div>

          {isGenerating ? (
            <button
              onClick={handleCancel}
              className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-neutral-900 py-4 font-bold text-white shadow-xl transition-all duration-300 hover:bg-neutral-700"
            >
              <X size={18} /> 取消生成
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[22px] py-4 font-bold transition-all duration-300 ${
                canSubmit
                  ? (generationPhase === "error"
                      ? "bg-rose-600 text-white shadow-xl hover:-translate-y-0.5 hover:shadow-rose-600/30"
                      : !hasReference
                        ? "bg-indigo-600 text-white shadow-xl hover:-translate-y-0.5 hover:shadow-indigo-600/30"
                        : "bg-emerald-600 text-white shadow-xl hover:-translate-y-0.5 hover:shadow-emerald-600/30")
                  : "cursor-not-allowed bg-neutral-100 text-neutral-400"
              }`}
            >
              {canSubmit && <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 ease-out group-hover:translate-y-0"></div>}
              {buttonText()}
              <ArrowRight size={18} className={canSubmit ? "transition-transform group-hover:translate-x-1" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* Streaming Preview Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 text-neutral-300 p-6 rounded-t-3xl shadow-2xl z-50 max-h-[40vh] overflow-hidden flex flex-col border-t border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-indigo-400" size={20} />
                <span className="text-sm font-medium text-indigo-300">
                  {phaseLabel[generationPhase] || "处理中..."}
                </span>
              </div>
              <button
                onClick={handleCancel}
                className="text-neutral-500 hover:text-white p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed opacity-70">
                {streamedText || "等待响应..."}
                <span className="animate-pulse text-indigo-400">|</span>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
