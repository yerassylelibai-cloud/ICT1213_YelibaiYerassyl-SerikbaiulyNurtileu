/**
 * Shared Hugging Face embedding config for E5 (1024-dim).
 * Must match `vector(1024)` in supabase/setup.sql and stored book embeddings.
 */
const MODEL_ID = "intfloat/multilingual-e5-large";

export const HF_FEATURE_EXTRACTION_URL = `https://router.huggingface.co/hf-inference/models/${MODEL_ID}/pipeline/feature-extraction`;

export const HF_MAX_INPUT_LENGTH = 2000;

export const HF_TIMEOUT_MS = 20000;

export const formatQueryForSearch = (text: string) => `query: ${text}`;

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number");

export const extractVector = (payload: unknown): number[] | null => {
  if (!Array.isArray(payload)) return null;
  if (isNumberArray(payload)) return payload;
  const [first] = payload;
  if (isNumberArray(first)) return first;
  return null;
};

export async function fetchQueryEmbeddingVector(
  token: string,
  rawText: string,
  options?: { signal?: AbortSignal }
): Promise<number[]> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("Text input is required.");
  }
  if (trimmed.length > HF_MAX_INPUT_LENGTH) {
    throw new Error(`Text is too long. Max length is ${HF_MAX_INPUT_LENGTH} characters.`);
  }

  const response = await fetch(HF_FEATURE_EXTRACTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: formatQueryForSearch(trimmed),
      options: {
        wait_for_model: true,
        use_cache: true,
      },
    }),
    signal: options?.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HuggingFace request failed (${response.status}): ${body}`);
  }

  const payload: unknown = await response.json();
  const vector = extractVector(payload);
  if (!vector) {
    throw new Error("Failed to parse vector from model response");
  }

  return vector;
}
