/**
 * SSE 流式请求工具 — 解析后端 Server-Sent Events 并分发回调
 */

import type { SlideCard } from "../types";

export interface SSECallbacks {
  onResponse?: (response: Response) => void;
  onStatus?: (phase: string) => void;
  onToken?: (content: string) => void;
  onOutline?: (slides: SlideCard[]) => void;
  onSvgChunk?: (content: string) => void;
  onSvgComplete?: (svg: string) => void;
  onEnrichProgress?: (data: { index: number; total: number; status: string; title: string; slide?: SlideCard }) => void;
  onEnrichComplete?: (slides: SlideCard[]) => void;
  onInterviewQuestions?: (data: { questions: any[]; context: string }) => void;
  // 渐进式管道事件
  onPipelineStart?: (data: { total: number; theme: string }) => void;
  onSlideStart?: (data: { index: number; total: number; title: string; type: string }) => void;
  onSlidePhase?: (data: { index: number; phase: string; label: string }) => void;
  onSlideEnriched?: (data: { index: number; slide: SlideCard }) => void;
  onSlideLayout?: (data: { index: number; elements: any[] }) => void;
  onSlideComplete?: (data: { index: number; total: number; title: string; slide: SlideCard; elements: any[]; svg: string }) => void;
  onPipelineComplete?: (data: { total: number }) => void;
  onPipelineCancelled?: (data: { completed: number }) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export async function fetchSSE(
  url: string,
  body: object | FormData,
  callbacks: SSECallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const isFormData = body instanceof FormData;

  const response = await fetch(url, {
    method: "POST",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    body: isFormData ? body : JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    callbacks.onError?.(`请求失败 (HTTP ${response.status})`);
    return;
  }

  callbacks.onResponse?.(response);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!; // 保留不完整的行

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          switch (currentEvent) {
            case "status":
              callbacks.onStatus?.(data.phase);
              break;
            case "token":
              callbacks.onToken?.(data.content);
              break;
            case "outline":
              callbacks.onOutline?.(data.slides);
              break;
            case "svg_chunk":
              callbacks.onSvgChunk?.(data.content);
              callbacks.onToken?.(data.content); // 兼容：也触发 onToken
              break;
            case "svg_complete":
              callbacks.onSvgComplete?.(data.svg);
              break;
            case "enrich_progress":
              callbacks.onEnrichProgress?.(data);
              break;
            case "enrich_complete":
              callbacks.onEnrichComplete?.(data.slides);
              break;
            case "interview_questions":
              callbacks.onInterviewQuestions?.(data);
              break;
            case "pipeline_start":
              callbacks.onPipelineStart?.(data);
              break;
            case "slide_start":
              callbacks.onSlideStart?.(data);
              break;
            case "slide_phase":
              callbacks.onSlidePhase?.(data);
              break;
            case "slide_enriched":
              callbacks.onSlideEnriched?.(data);
              break;
            case "slide_layout":
              callbacks.onSlideLayout?.(data);
              break;
            case "slide_complete":
              callbacks.onSlideComplete?.(data);
              break;
            case "pipeline_complete":
              callbacks.onPipelineComplete?.(data);
              break;
            case "pipeline_cancelled":
              callbacks.onPipelineCancelled?.(data);
              break;
            case "error":
              callbacks.onError?.(data.message);
              break;
            case "done":
              callbacks.onDone?.();
              break;
          }
        } catch {
          // 忽略 JSON 解析错误
        }
      }
    }
  }
}
