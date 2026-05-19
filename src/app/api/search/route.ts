import { getSupabase } from "@/src/lib/supabase";
import { fetchQueryEmbeddingVector, HF_MAX_INPUT_LENGTH } from "@/src/lib/hf-embedding";

type SearchRequest = {
  query?: string;
  limit?: number;
};

export async function POST(request: Request) {
  try {
    const { query, limit = 8 } = (await request.json()) as SearchRequest;

    if (!query?.trim()) {
      return Response.json({ error: "Please enter a search query." }, { status: 400 });
    }

    const trimmed = query.trim();
    if (trimmed.length > HF_MAX_INPUT_LENGTH) {
      return Response.json(
        { error: `Query is too long. Max length is ${HF_MAX_INPUT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const huggingFaceToken = process.env.HUGGINGFACE_TOKEN;
    if (!huggingFaceToken) {
      return Response.json(
        { error: "HUGGINGFACE_TOKEN is not configured on the server." },
        { status: 500 }
      );
    }

    const embedding = await fetchQueryEmbeddingVector(huggingFaceToken, trimmed);

    const { data, error } = await getSupabase().rpc("match_books", {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: limit,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ results: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
