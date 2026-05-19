"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAuthUser, type AuthUser } from "@/src/lib/auth-session";
import { getSupabase } from "@/src/lib/supabase";

type SavedBookRow = {
  id: number;
  book_id: number;
  books: Record<string, unknown> | Record<string, unknown>[] | null;
};

type SavedBookView = {
  rowId: number;
  title: string;
  author: string;
  content: string;
  genre: string;
  subGenre: string;
  year: string;
  pages: string;
  rating: string;
};

export default function SavedPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [savedBooks, setSavedBooks] = useState<SavedBookRow[]>([]);
  const [selectedBook, setSelectedBook] = useState<SavedBookView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeBook = (row: SavedBookRow): SavedBookView => {
    const raw = row.books;
    const b = Array.isArray(raw) ? (raw[0] ?? {}) : (raw ?? {});
    return {
      rowId: row.id,
      title: String(b["Атауы"] ?? b.book_title ?? b.name ?? b.book_name ?? b.title_kk ?? "Атаусыз"),
      author: String(b["Автор"] ?? b.author_name ?? b.writer ?? ""),
      content: String(b["Қысқаша сипаттама"] ?? b.description ?? b.summary ?? b.about ?? "Сипаттама жоқ."),
      genre: String(b["Жанр"] ?? b.genre ?? "—"),
      subGenre: String(b["Ішкі жанр"] ?? b.sub_genre ?? b.subgenre ?? "—"),
      year: String(b["Жыл"] ?? b.year ?? "—"),
      pages: String(b["Беттер саны"] ?? b.pages ?? b.page_count ?? "—"),
      rating: String(b["Рейтинг"] ?? b.rating ?? "—"),
    };
  };

  useEffect(() => {
    const loadSaved = async () => {
      const localUser = loadAuthUser();
      const { data } = await getSupabase().auth.getUser();
      const supaUser = data.user;

      if (!supaUser && !localUser) {
        setAuthUser(null);
        setIsLoading(false);
        return;
      }

      const user = supaUser
        ? {
            id: supaUser.id,
            username: localUser?.username || String(supaUser.user_metadata?.username ?? "").trim() || "user",
          }
        : localUser!;

      setAuthUser(user);
      setError(null);
      setIsLoading(true);

      const { data: rows, error: loadError } = await getSupabase()
        .from("user_library")
        .select("id, book_id, books:book_id(*)")
        .eq("user_id", user.id)
        .eq("status", "saved")
        .order("id", { ascending: false });

      if (loadError) {
        setError(loadError.message);
        setIsLoading(false);
        return;
      }

      setSavedBooks((rows as SavedBookRow[]) ?? []);
      setIsLoading(false);
    };

    void loadSaved();
  }, []);

  const removeSavedBook = async (rowId: number) => {
    const { error: deleteError } = await getSupabase().from("user_library").delete().eq("id", rowId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSavedBooks((prev) => prev.filter((item) => item.id !== rowId));
    setSelectedBook((prev) => (prev?.rowId === rowId ? null : prev));
  };

  const openBuyOrReadLink = () => {
    if (!selectedBook) return;
    const searchText = `${selectedBook.title} ${selectedBook.author} купить читать онлайн`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) return <div className="ka-boot" aria-hidden />;

  if (!authUser) {
    return (
      <div className="ka-page">
        <header className="ka-nav">
          <Link href="/" className="ka-nav-logo">
            Кітап<em>Әлемі</em>
          </Link>
        </header>
        <main className="ka-search-wrap">
          <h1 className="ka-title">🔖 Сақталған</h1>
          <p className="ka-subtitle">Сақталған кітаптарды көру үшін аккаунтқа кіріңіз.</p>
          <Link href="/?screen=auth" className="ka-link-btn">
            🔐 Кіру
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="ka-page">
      <header className="ka-nav">
        <Link href="/" className="ka-nav-logo">
          Кітап<em>Әлемі</em>
        </Link>
      </header>
      <main className="ka-search-wrap">
        <h1 className="ka-title">🔖 Сақталған</h1>
        <p className="ka-subtitle">{savedBooks.length ? `${savedBooks.length} кітап сақталған` : "Сақталған кітаптар жоқ"}</p>
        {error ? <div className="ka-error">{error}</div> : null}
        <section className="ka-grid">
          {!savedBooks.length ? (
            <div className="ka-empty">
              <span className="ka-empty-emoji">📭</span>
              <h3>Тізім бос</h3>
              <p>Іздеу бетінен кітаптарды сақтаңыз.</p>
            </div>
          ) : null}

          {savedBooks.map((row) => {
            const book = normalizeBook(row);
            return (
              <article
                key={row.id}
                className="ka-card ka-saved-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBook(book)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedBook(book);
                  }
                }}
              >
                <div className="ka-cover" style={{ background: "#6B3FA022" }}>
                  <div className="ka-cover-spine" style={{ background: "#6B3FA0" }} />
                  <span>📖</span>
                </div>
                <div className="ka-card-content">
                  <p className="ka-genre" style={{ color: "#6B3FA0" }}>
                    Saved
                  </p>
                  <h3>{book.title}</h3>
                  <p className="ka-author">{book.author || "Авторы белгісіз"}</p>
                  <div className="ka-foot">
                    <button
                      type="button"
                      className="ka-save-btn saved"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeSavedBook(row.id);
                      }}
                    >
                      Өшіру
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="ka-bottom-nav" aria-label="Төменгі виджеттер">
          <Link href="/?screen=search" className="ka-bottom-item">
            <span className="ka-bottom-icon" aria-hidden>
              🔎
            </span>
            <span>Іздеу</span>
          </Link>
          <Link href="/saved" className="ka-bottom-item active">
            <span className="ka-bottom-icon" aria-hidden>
              🎟️
            </span>
            <span>Сақталған</span>
          </Link>
          <Link href="/profile" className="ka-bottom-item">
            <span className="ka-bottom-icon" aria-hidden>
              👤
            </span>
            <span>Профиль</span>
          </Link>
        </section>
      </main>

      {selectedBook ? (
        <div className="ka-modal-backdrop" onClick={() => setSelectedBook(null)} role="presentation">
          <section
            className="ka-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Кітап туралы толық ақпарат"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Атауы: {selectedBook.title}</h3>
            <p className="ka-author">Автор: {selectedBook.author || "Авторы белгісіз"}</p>
            <p className="ka-modal-desc">Қысқаша сипаттама: {selectedBook.content}</p>
            <div className="ka-modal-meta">
              <p>Жанр: {selectedBook.genre}</p>
              <p>Ішкі жанр: {selectedBook.subGenre}</p>
              <p>Жыл: {selectedBook.year}</p>
              <p>Беттер саны: {selectedBook.pages}</p>
              <p>Рейтинг: {selectedBook.rating}</p>
            </div>
            <div className="ka-modal-actions">
              <button
                type="button"
                className="ka-save-btn saved"
                onClick={() => void removeSavedBook(selectedBook.rowId)}
              >
                Өшіру
              </button>
              <button type="button" className="ka-link-btn" onClick={openBuyOrReadLink}>
                Кітапты оқу/сатып алу
              </button>
              <button type="button" className="ka-link-btn" onClick={() => setSelectedBook(null)}>
                Жабу
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
