import { NextResponse } from "next/server";
import {
  fetchQueryEmbeddingVector,
  HF_MAX_INPUT_LENGTH,
  HF_TIMEOUT_MS,
} from "@/src/lib/hf-embedding";

type EmbedRequest = {
  text?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EmbedRequest;
    const text = typeof body?.text === "string" ? body.text : "";
    const trimmedText = text.trim();

    if (!trimmedText) {
      return NextResponse.json({ error: "Text input is required." }, { status: 400 });
    }
    if (trimmedText.length > HF_MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Text is too long. Max length is ${HF_MAX_INPUT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Server configuration error: Missing API Token" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HF_TIMEOUT_MS);

    let vector: number[];
    try {
      vector = await fetchQueryEmbeddingVector(token, trimmedText, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    // Final check: Ensure we got the 1024 dimensions your database expects
    if (vector.length !== 1024) {
      console.warn(`Dimension mismatch! Got ${vector.length}, expected 1024.`);
    }

    return NextResponse.json(vector);
  } catch (error: unknown) {
    const isAbort =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (isAbort) {
      return NextResponse.json(
        { error: "Embedding request timed out. Please try again." },
        { status: 504 }
      );
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Internal Route Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
