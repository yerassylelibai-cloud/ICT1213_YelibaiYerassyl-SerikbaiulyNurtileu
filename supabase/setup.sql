-- Run this in Supabase SQL Editor.
-- It creates the vector extension, books table, and match_books RPC used by the app.
-- Embeddings: intfloat/multilingual-e5-large (1024 dimensions). Re-run embeddings if you
-- previously used a 384-dim model; alter column type alone is not enough.

create extension if not exists vector;

create table if not exists public.books (
  id bigserial primary key,
  title text not null,
  author text,
  description text,
  embedding vector(1024) not null
);

create or replace function public.match_books(
  query_embedding vector(1024),
  match_threshold float default 0.2,
  match_count int default 10
)
returns table (
  id bigint,
  title text,
  author text,
  description text,
  similarity float
)
language sql
stable
as $$
  select
    b.id,
    b.title,
    b.author,
    b.description,
    1 - (b.embedding <=> query_embedding) as similarity
  from public.books b
  where 1 - (b.embedding <=> query_embedding) > match_threshold
  order by b.embedding <=> query_embedding
  limit match_count;
$$;
