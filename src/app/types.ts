/** 前后端共享类型定义 */

export interface SlideCard {
  id: string;
  title: string;
  type: string;        // "cover" | "agenda" | "content" | "showcase" | "ending"
  content: string[];
  visual: string;
  color: string;       // Tailwind bg color class, e.g. "bg-amber-100"
}

export type GenerationPhase =
  | "idle"
  | "searching"
  | "parsing"
  | "generating"
  | "complete"
  | "error";
