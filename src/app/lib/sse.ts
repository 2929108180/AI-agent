/**
 * SSE 流式请求工具 — 解析后端 Server-Sent Events 并分发回调
 */

import type { SlideCard } from "../types";

export interface SSECallbacks {
  onStatus?: (phase: string) => void;
  onToken?: (content: string) => void;
  onOutline?: (slides: SlideCard[]) => void;
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
