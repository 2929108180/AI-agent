import React from "react";
import { motion } from "motion/react";
import { Sparkles, ArrowRight, Layers, Workflow, CheckCircle2 } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  // Simple fade-up animation variant
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F5F5F7] overflow-hidden flex flex-col text-[#1D1D1F] font-sans">
      {/* Background Subtle Gradient Mesh */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Nav */}
      <header className="relative z-10 px-8 lg:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center text-white font-bold shadow-sm ring-1 ring-black/10">
            A
          </div>
          <span className="font-semibold tracking-tight text-xl">AI PPT Studio</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-neutral-500">
          <a href="#" className="hover:text-neutral-900 transition-colors">产品特征</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">解决方案</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">定价</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">开发者 API</a>
        </nav>
        <button 
          onClick={onStart}
          className="px-5 py-2 text-sm font-semibold text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-full transition-all shadow-sm"
        >
          登录 / 注册
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-16 pb-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold tracking-wide uppercase mb-8 shadow-sm">
            <Sparkles size={14} /> 全新渲染架构 Beta 现已发布
          </motion.div>

          <motion.h1 
            variants={fadeUp}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8"
            style={{ 
              background: 'linear-gradient(to bottom right, #111111 30%, #555555 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            重塑演示文稿的 <br className="hidden md:block" /> 诞生范式。
          </motion.h1>

          <motion.p 
            variants={fadeUp}
            className="text-lg md:text-xl text-neutral-500 max-w-2xl leading-relaxed mb-12 font-medium"
          >
            告别繁琐的排版与对齐。只需输入一句话，或直接上传现成的长篇文档。AI 引擎将自动提炼逻辑，基于纯粹的 JSON 布局协议，为您瞬间渲染出极具高级感的高保真成品。
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-bold text-white bg-neutral-900 hover:bg-black shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              免费体验极速工作流
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 shadow-sm transition-all duration-300 flex items-center justify-center gap-2">
              观看架构演示视频
            </button>
          </motion.div>
        </motion.div>

        {/* High-end Bento Features Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full"
        >
          {/* Feature 1 */}
          <div className="bg-white/60 backdrop-blur-xl border border-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">防幻觉知识提炼</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              独立的 Doc-to-PPT 链路。上传长篇研报，模型将严格受限于文档上下文进行提炼，彻底告别 AI 凭空捏造（Anti-Hallucination）。
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/60 backdrop-blur-xl border border-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Workflow size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">数据驱动渲染引擎</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              摒弃写死的前端模板。后端动态返回 JSON 网格结构，前端基于 Framer Motion 引擎计算出像素级完美的流体自适应排版。
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/60 backdrop-blur-xl border border-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">全全局视觉变量</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              内置顶级设计师的审美预设 (Design Tokens)。一键切换“莫兰迪绿”或“未来黑客”主题，组件级响应，极简克制而不失华丽。
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-xs font-medium text-neutral-400 border-t border-black/5 mt-auto">
        &copy; {new Date().getFullYear()} AI PPT Studio Architecture. Designed for Senior Minds.
      </footer>
    </div>
  );
}
