import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, UploadCloud, X, Wand2, Target, AlignLeft, FileText, ArrowRight,
  Lightbulb, FileBox, Loader2,
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

  const handlePolish = async () => {
    if (!topic.trim() || isPolishing) return;
    setIsPolishing(true);

    let polished = "";
    try {
      await fetchSSE("/api/v1/ingestion/polish", { topic, audience }, {
        onToken: (content) => {
          polished += content;
          setTopic(polished);
        },
        onDone: () => setIsPolishing(false),
        onError: () => setIsPolishing(false),
      });
    } catch {
      setIsPolishing(false);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto py-10 px-6 sm:px-8"
    >
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50/50 rounded-2xl mb-4 border border-indigo-100">
          <Wand2 className="text-indigo-600 w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
          创建全新的演示文稿
        </h1>
        <p className="text-base text-neutral-500 max-w-2xl leading-relaxed">
          告诉 AI 您的出发点。如果您只有大概想法，AI 将为您发散结构；如果您已有详细资料，AI 将精准提取知识。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Generation Modes & Input */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Main Choice */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
            <h3 className="text-base font-semibold text-neutral-800 mb-4">您有现成的参考资料吗？</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => !isGenerating && setHasReference(false)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden group ${
                  !hasReference
                    ? "border-indigo-500 bg-indigo-50/30 ring-4 ring-indigo-500/10"
                    : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {!hasReference && <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-[100px] -z-10 transition-all"></div>}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${!hasReference ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-500'}`}>
                  <Lightbulb size={20} />
                </div>
                <div className={`font-semibold text-base mb-1 ${!hasReference ? 'text-indigo-900' : 'text-neutral-700'}`}>从零开始发散</div>
                <div className="text-xs text-neutral-500 leading-relaxed">只需输入一句话主题或大纲思路，由大模型为您策划结构。</div>
              </button>

              <button
                onClick={() => !isGenerating && setHasReference(true)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden group ${
                  hasReference
                    ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10"
                    : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {hasReference && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-[100px] -z-10 transition-all"></div>}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${hasReference ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-500'}`}>
                  <FileBox size={20} />
                </div>
                <div className={`font-semibold text-base mb-1 ${hasReference ? 'text-emerald-900' : 'text-neutral-700'}`}>基于已有资料提炼</div>
                <div className="text-xs text-neutral-500 leading-relaxed">上传文档或粘贴长篇草稿，AI 将提取知识防止幻觉。</div>
              </button>
            </div>
          </div>

          {/* Dynamic Input Area Based on Choice */}
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden relative min-h-[320px]">
            <AnimatePresence mode="wait">
              {!hasReference ? (
                <motion.div
                  key="no-ref"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full absolute inset-0"
                >
                  <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
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
                    className="flex-1 w-full p-6 text-neutral-700 text-base leading-relaxed outline-none resize-none bg-transparent placeholder-neutral-400 disabled:opacity-50"
                  />
                  <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex justify-end">
                    <button
                      onClick={handlePolish}
                      disabled={!topic.trim() || isPolishing || isGenerating}
                      className="text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                      {isPolishing ? (
                        <><Loader2 size={16} className="animate-spin" /> 润色中...</>
                      ) : (
                        <><Sparkles size={16} /> AI 润色扩写</>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="has-ref"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full absolute inset-0 bg-neutral-50/30"
                >
                  <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-emerald-500" />
                      <h3 className="font-semibold text-neutral-800">提供您的参考资料</h3>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
                    {/* File Upload Section */}
                    <div>
                      {!uploadedFile ? (
                        <div
                          onClick={() => !isGenerating && fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-neutral-300 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-2xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer group bg-white"
                        >
                          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
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
                        <div className="w-full border border-emerald-200 bg-emerald-50/50 rounded-2xl p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-500">
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

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-neutral-200"></div>
                      <span className="text-xs font-medium text-neutral-400 uppercase tracking-widest">OR</span>
                      <div className="flex-1 h-px bg-neutral-200"></div>
                    </div>

                    {/* Text Paste Section */}
                    <div className={`flex-1 flex flex-col rounded-2xl border transition-all ${uploadedFile ? 'opacity-50 pointer-events-none border-neutral-200 bg-neutral-50' : 'border-neutral-200 bg-white focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 shadow-sm'}`}>
                      <textarea
                        value={referenceText}
                        onChange={(e) => setReferenceText(e.target.value)}
                        disabled={!!uploadedFile || isGenerating}
                        placeholder="直接在此粘贴您的长篇草稿、会议纪要或参考文章..."
                        className="flex-1 w-full min-h-[140px] p-4 text-sm text-neutral-700 leading-relaxed outline-none resize-none bg-transparent placeholder-neutral-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Settings & CTA */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 space-y-6 flex-1">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="font-semibold text-neutral-800">目标与规格</h3>
              <p className="text-xs text-neutral-500 mt-1">精细控制生成结果的调性</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                <Target size={16} className="text-indigo-500" /> 汇报对象 (Audience)
              </label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="w-full bg-neutral-50 border border-neutral-200 rounded-xl h-[42px] px-3 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner data-[state=open]:ring-1 data-[state=open]:ring-indigo-500 data-[state=open]:border-indigo-500">
                  <SelectValue placeholder="请选择汇报对象" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-neutral-200 shadow-xl bg-white p-1">
                  <SelectItem value="professional" className="rounded-lg cursor-pointer hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">专业同行 / 专家 (严谨深究)</SelectItem>
                  <SelectItem value="investor" className="rounded-lg cursor-pointer hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">投资人 / 高管 (ROI导向)</SelectItem>
                  <SelectItem value="consumer" className="rounded-lg cursor-pointer hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">大众消费者 (情绪共鸣)</SelectItem>
                  <SelectItem value="internal" className="rounded-lg cursor-pointer hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">内部员工 / 培训 (清晰结构)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                <FileText size={16} className="text-indigo-500" /> 预期篇幅 (Length)
              </label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger className="w-full bg-neutral-50 border border-neutral-200 rounded-xl h-[42px] px-3 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner data-[state=open]:ring-1 data-[state=open]:ring-indigo-500 data-[state=open]:border-indigo-500">
                  <SelectValue placeholder="请选择预期篇幅" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-neutral-200 shadow-xl bg-white p-1">
                  <SelectItem value="short" className="rounded-lg cursor-pointer hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">电梯演讲 (约 5-8 页)</SelectItem>
                  <SelectItem value="standard" className="rounded-lg cursor-pointer hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">标准汇报 (约 12-15 页)</SelectItem>
                  <SelectItem value="long" className="rounded-lg cursor-pointer hover:bg-neutral-50 focus:bg-indigo-50 focus:text-indigo-700">深度路演 (约 20-30 页)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mt-auto">
               <p className="text-xs text-blue-800 leading-relaxed">
                 基于您的选择，后台引擎将会调用 <strong className="font-semibold">{!hasReference ? 'Prompt 1-A' : 'Prompt 1-B'}</strong> 链路，进行对应的结构抽象计算。
               </p>
            </div>
          </div>

          {/* Submit / Cancel Buttons */}
          {isGenerating ? (
            <button
              onClick={handleCancel}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 bg-neutral-800 text-white shadow-xl hover:bg-neutral-700"
            >
              <X size={18} /> 取消生成
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group ${
                canSubmit
                  ? (generationPhase === "error"
                      ? "bg-rose-600 text-white shadow-xl hover:shadow-rose-600/30 hover:-translate-y-0.5"
                      : !hasReference
                        ? "bg-indigo-600 text-white shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-0.5"
                        : "bg-emerald-600 text-white shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5")
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              }`}
            >
              {canSubmit && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>}
              {buttonText()}
              <ArrowRight size={18} className={canSubmit ? "group-hover:translate-x-1 transition-transform" : ""} />
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
            className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-xl text-neutral-300 p-6 rounded-t-3xl shadow-2xl z-50 max-h-[40vh] overflow-hidden flex flex-col border-t border-white/10"
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
