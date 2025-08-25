export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
}

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8000';

export async function chatOpenAI(options: {
  question: string;
  history?: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}): Promise<{ output: string }> {
  const body = {
    user_question: options.question,
    chat_history: options.history ?? [],
    model: options.model ?? 'gpt-4o',
    max_tokens: options.maxTokens ?? 2500,
    temperature: options.temperature ?? 0.7,
    stream: Boolean(options.stream),
  };

  // Non-stream simple
  const res = await fetch(`${CHAT_API_URL}/api/chat/openai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return { output: data.output as string };
}

// Streaming SSE via fetch (POST). Retourne un callback pour recevoir les tokens au fil de l’eau.
export async function chatOpenAIStream(options: {
  question: string;
  history?: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  onToken: (t: string) => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;
}) {
  const body = {
    user_question: options.question,
    chat_history: options.history ?? [],
    model: options.model ?? 'gpt-4o',
    max_tokens: options.maxTokens ?? 2500,
    temperature: options.temperature ?? 0.7,
    stream: true,
  };

  try {
    const res = await fetch(`${CHAT_API_URL}/api/chat/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse très simple des lignes SSE "data: ..."
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const payload = line.slice('data:'.length).trim();
            if (payload === '[DONE]') {
              options.onDone?.();
              return;
            }
            options.onToken(payload);
          }
        }
      }
    }

    options.onDone?.();
  } catch (e) {
    options.onError?.(e);
  }
}