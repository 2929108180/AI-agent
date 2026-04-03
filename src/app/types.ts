/** 前后端共享类型定义 */

export interface SlideCard {
  id: string;
  title: string;
  type: string;        // "cover" | "agenda" | "content" | "showcase" | "ending"
  content: string[];
  visual: string;
  color: string;       // Tailwind bg color class, e.g. "bg-amber-100"
}

export interface InterviewAnswer {
  question: string;
  answer: string;
}

export interface SetupSession {
  mode: "track-a" | "track-b";
  topic: string;
  referenceText: string;
  audience: string;
  length: string;
  customAudience: string;
  customAudienceNote: string;
  interviewContext: string;
  interviewAnswers: InterviewAnswer[];
  sourceLabel: string;
}

export type GenerationPhase =
  | "idle"
  | "searching"
  | "parsing"
  | "analyzing"    // AI 智能推断受众
  | "generating"
  | "complete"
  | "error";
