export function safeJsonParse<T = unknown>(raw: string | null | undefined): T | null {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  const candidates = new Set<string>();
  const cleaned = raw.replace(/^\uFEFF/, '').trim();

  candidates.add(cleaned);

  const trimmedTrailingGarbage = cleaned.replace(/[\u0000-\u001F\u007F]+$/g, '');
  if (trimmedTrailingGarbage !== cleaned) {
    candidates.add(trimmedTrailingGarbage);
  }

  const lastJsonBoundary = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  if (lastJsonBoundary > 0) {
    candidates.add(cleaned.slice(0, lastJsonBoundary + 1));
  }

  const compacted = cleaned.replace(/,\s*([}\]])/g, '$1');
  if (compacted !== cleaned) {
    candidates.add(compacted);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // tenta o próximo corte sem interromper o carregamento
    }
  }

  return null;
}

export async function fetchJsonSafely<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(input, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(30000),
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const parsed = safeJsonParse<T>(text);

    if (parsed === null) {
      throw new Error('JSON quebrado ou truncado');
    }

    return parsed;
  } catch (error) {
    console.error('Erro ao decodificar JSON seguro:', error);
    return null;
  }
}
