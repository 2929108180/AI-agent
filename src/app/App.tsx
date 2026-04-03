// @ts-ignore
import React, { useState } from "react";
import { LayoutDashboard, FileText, MonitorPlay, ChevronRight, Check, Play, Download, Monitor } from "lucide-react";
import { LandingPage } from "./components/LandingPage";
import { SetupPanel } from "./components/SetupPanel";
import { StickyOutlinePanel } from "./components/StickyOutlinePanel";
import { WorkspaceEditor } from "./components/WorkspaceEditor"; // Integrated Editor & Layout
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import type { SlideCard, SetupSession } from "./types";

type Step = 1 | 2 | 3;

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [outline, setOutline] = useState<SlideCard[]>([]);
  const [setupSession, setSetupSession] = useState<SetupSession | null>(null);
  const [enrichedIndices, setEnrichedIndices] = useState<number[]>([]);

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  const steps = [
    { id: 1, name: "需求分析与导入", icon: <FileText size={18} /> },
    { id: 2, name: "智能大纲架构", icon: <LayoutDashboard size={18} /> },
    { id: 3, name: "高保真生成与微调", icon: <MonitorPlay size={18} /> },
  ];

  const handleSetupComplete = (slides: SlideCard[], session: SetupSession) => {
    setOutline(slides);
    setSetupSession(session);
    setEnrichedIndices([]);
    setCurrentStep(2);
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as Step);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  // 处于编辑态（全画幅沉浸模式）
  const isEditor = currentStep === 3;

  return (
    <div className={`flex flex-col h-screen font-sans ${isEditor ? 'bg-[#111111] text-white' : 'bg-neutral-50/50 text-neutral-900'}`}>
      {/* 极简顶栏 */}
      <header className={`flex items-center justify-between px-6 py-4 shrink-0 border-b backdrop-blur-md transition-colors duration-300 ${
        isEditor ? 'bg-[#161616]/90 border-white/5' : 'bg-white/80 border-neutral-200/80'
      }`}>
        <button
          onClick={() => {
            setHasStarted(false);
            setCurrentStep(1);
          }}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center text-white font-bold shadow-sm ring-1 ring-black/10">
            A
          </div>
          <span className={`font-semibold tracking-tight ${isEditor ? 'text-neutral-200' : 'text-neutral-800'}`}>
            AI PPT Studio
          </span>
        </button>

        {/* 导航进度条 */}
        <div className="hidden md:flex items-center gap-2">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? (isEditor ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-neutral-900 text-white shadow-sm")
                      : isCompleted
                      ? (isEditor ? "text-neutral-400 hover:text-neutral-200 cursor-pointer" : "text-neutral-500 cursor-pointer hover:bg-neutral-100")
                      : (isEditor ? "text-neutral-600" : "text-neutral-400")
                  }`}
                  onClick={() => isCompleted && setCurrentStep(step.id as Step)}
                >
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-xs transition-colors ${
                      isActive
                        ? (isEditor ? "bg-white text-black" : "bg-white/20 text-white")
                        : isCompleted
                        ? (isEditor ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-100 text-neutral-500")
                        : (isEditor ? "bg-neutral-800 text-neutral-500" : "bg-neutral-100 text-neutral-400")
                    }`}
                  >
                    {isCompleted ? <Check size={12} strokeWidth={3} /> : step.id}
                  </div>
                  <span>{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-[2px] rounded-full transition-colors ${
                      isCompleted
                        ? (isEditor ? "bg-white/20" : "bg-neutral-300")
                        : (isEditor ? "bg-neutral-800" : "bg-neutral-200")
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {currentStep > 1 && !isEditor && (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all"
            >
              返回修改
            </button>
          )}
          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 rounded-xl transition-all flex items-center gap-2"
            >
              下一步 <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2.5 text-sm font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all shadow-sm border border-neutral-700 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0">
                    <Play size={16} className="text-emerald-400" /> 播放演示
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#1A1A1A] border-neutral-800 text-white rounded-xl shadow-2xl p-1">
                  <DropdownMenuItem
                    onClick={() => window.dispatchEvent(new CustomEvent('start-presentation', { detail: { fromCurrent: false } }))}
                    className="hover:bg-white/10 cursor-pointer rounded-lg text-sm"
                  >
                    <MonitorPlay size={14} className="mr-2 text-neutral-400" /> 从第一页放映
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.dispatchEvent(new CustomEvent('start-presentation', { detail: { fromCurrent: true } }))}
                    className="hover:bg-white/10 cursor-pointer rounded-lg text-sm"
                  >
                    <Monitor size={14} className="mr-2 text-neutral-400" /> 从当前页放映
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0">
                    <Download size={16} /> 导出或下载
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-[#1A1A1A] border-neutral-800 text-white rounded-xl shadow-2xl p-1">
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer rounded-lg text-sm">导出为 PDF</DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer rounded-lg text-sm">导出为 PPTX</DropdownMenuItem>
                  <div className="h-px bg-neutral-800 my-1"></div>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer rounded-lg text-sm text-neutral-400">导出为 图片(PNG)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          <div className={currentStep === 1 ? "block" : "hidden"}>
            <SetupPanel onComplete={handleSetupComplete} />
          </div>
          <div className={currentStep === 2 ? "block" : "hidden"}>
            <StickyOutlinePanel
              initialOutline={outline}
              onOutlineChange={setOutline}
              setupSession={setupSession}
              enrichedIndices={enrichedIndices}
              onEnrichedIndicesChange={setEnrichedIndices}
            />
          </div>
          <div className={currentStep === 3 ? "block h-full" : "hidden h-full"}>
            <WorkspaceEditor outline={outline} isActive={currentStep === 3} skipEnrichIndices={enrichedIndices} />
          </div>
        </div>
      </main>
    </div>
  );
}
