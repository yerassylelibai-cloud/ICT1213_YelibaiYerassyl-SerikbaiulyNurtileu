"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadAuthUser, saveAuthUser, type AuthUser } from "@/src/lib/auth-session";
import { getSupabase } from "@/src/lib/supabase";
import {
  buildPreferenceSearchQuery,
  saveKaPrefs,
  type KaPrefs,
} from "@/src/lib/ka-preferences";

type BookMatch = {
  id?: string | number;
  title?: string;
  author?: string;
  content?: string;
  similarity?: number;
  genre?: string;
};

type BookDetails = {
  title: string;
  author: string;
  content: string;
  genre: string;
  subGenre: string;
  year: string;
  pages: string;
  rating: string;
};

type HealthStatus = {
  ok: boolean;
  missing: string[];
};

type Screen = "landing" | "onboarding" | "search" | "auth";

const GENRE_OPTIONS: { id: string; icon: string; label: string }[] = [
  { id: "Классика", icon: "📜", label: "Классика" },
  { id: "Детектив", icon: "🔍", label: "Детектив" },
  { id: "Фэнтези", icon: "🗺️", label: "Фэнтези" },
  { id: "Ғыл.-фантастика", icon: "🚀", label: "Ғылыми-фантастика" },
  { id: "Романтика", icon: "🌹", label: "Романтика" },
  { id: "Философия", icon: "💭", label: "Философия" },
  { id: "Тарих", icon: "🌍", label: "Тарих" },
  { id: "Өзін-өзі дамыту", icon: "⚡", label: "Өзін-өзі дамыту" },
  { id: "Психология", icon: "🧠", label: "Психология" },
];

const MOOD_OPTIONS: { id: string; icon: string; label: string; desc: string }[] = [
  {
    id: "Шабыт іздеудемін",
    icon: "✨",
    label: "Шабыт іздеу",
    desc: "Жаңа идея мен мотивация керек",
  },
  {
    id: "Демалғым келеді",
    icon: "☕",
    label: "Демалу",
    desc: "Жайлы, баяу, тыныш оқылым",
  },
  {
    id: "Білім алғым келеді",
    icon: "🔬",
    label: "Білім алу",
    desc: "Жаңа нәрсе үйрену, ой тереңдету",
  },
  {
    id: "Шытырман оқиға керек",
    icon: "🌪️",
    label: "Шытырман",
    desc: "Тартымды, жылдам оқылатын кітап",
  },
];

const BOOK_GENRES = GENRE_OPTIONS.map((item) => item.label);

const coverPalette = [
  "#C4522A",
  "#6B3FA0",
  "#3D7A6F",
  "#B8962E",
  "#2A5C8A",
  "#7A3B6A",
  "#2E7A5C",
  "#8A5C2A",
];

const scoreAsPercent = (score: number | undefined) =>
  typeof score === "number" ? `${Math.round(score * 100)}%` : null;

function formatPrefsBanner(p: KaPrefs): string {
  const genrePart = p.dk
    ? "жанр: ЖИ таңдайды"
    : p.genres.length > 0
      ? p.genres.join(", ")
      : "жанр көрсетілмеген";
  const moodPart = p.mood.trim() || "—";
  return `${genrePart}. Көңіл-күй: ${moodPart}.`;
}

const usernameToEmail = (username: string) =>
  `${username.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@kitap.local`;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function Home() {
  const SUGGESTION_BATCH_SIZE = 12;
  const [screen, setScreen] = useState<Screen | null>(null);
  const [prefStep, setPrefStep] = useState(1);
  const [genres, setGenres] = useState<string[]>([]);
  const [dk, setDk] = useState(false);
  const [mood, setMood] = useState("");
  const [hint1, setHint1] = useState("");
  const [hint2, setHint2] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookMatch[]>([]);
  const [allResults, setAllResults] = useState<BookMatch[]>([]);
  const [resultOffset, setResultOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [prefsBanner, setPrefsBanner] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [savedBookIds, setSavedBookIds] = useState<Set<number>>(new Set());
  const [savedActionPending, setSavedActionPending] = useState<Record<number, boolean>>({});
  const [selectedSearchBook, setSelectedSearchBook] = useState<BookDetails | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const initOnce = useRef(false);
  const helpAudioRef = useRef<HTMLAudioElement>(null);
  const totalResults = useMemo(() => allResults.length, [allResults]);

  const runSemanticSearch = useCallback(async (searchTerm: string) => {
    const searchTrim = searchTerm.trim();
    if (!searchTrim) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: searchTrim }),
      });

      const embedPayload = (await res.json()) as unknown;
      if (!res.ok) {
        const message =
          typeof embedPayload === "object" && embedPayload && "error" in embedPayload
            ? String((embedPayload as { error?: string }).error ?? "")
            : null;
        throw new Error(message ?? `Эмбеддинг сұрауы сәтсіз аяқталды (${res.status}).`);
      }

      if (!Array.isArray(embedPayload)) {
        throw new Error("Эмбеддинг жауабының форматы қате.");
      }

      const queryEmbedding = Array.isArray(embedPayload[0])
        ? (embedPayload[0] as number[])
        : (embedPayload as number[]);
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error("/api/embed қате эмбеддинг қайтарды.");
      }

      const { data, error: rpcError } = await getSupabase().rpc("match_books", {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 120,
      });

      if (rpcError) {
        if (rpcError.message.includes('relation "library" does not exist')) {
          throw new Error(
            "Supabase схемасы әлі орнатылмаған. Supabase SQL редакторында supabase/setup.sql файлындағы SQL орындаңыз."
          );
        }
        throw new Error(rpcError.message);
      }

      const matches = (data as BookMatch[]) ?? [];
      setAllResults(matches);
      setResultOffset(0);
      setResults(matches.slice(0, SUGGESTION_BATCH_SIZE));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Күтпеген іздеу қатесі.";
      setAllResults([]);
      setResultOffset(0);
      setResults([]);
      setError(message);
    } finally {
      setIsSearching(false);
    }
  }, [SUGGESTION_BATCH_SIZE]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as HealthStatus;
        setHealth(payload);
      } catch {
        setHealth(null);
      }
    };

    void checkHealth();
  }, []);

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;
    const restoreSession = async () => {
      const localUser = loadAuthUser();
      if (localUser) setAuthUser(localUser);

      const { data } = await getSupabase().auth.getUser();
      const supaUser = data.user;
      if (supaUser) {
        const username =
          localUser?.username || String(supaUser.user_metadata?.username ?? "").trim() || "user";
        const merged = { id: supaUser.id, username };
        setAuthUser(merged);
        saveAuthUser(merged);
      }
      const requestedScreen = new URLSearchParams(window.location.search).get("screen");
      setScreen(requestedScreen === "search" ? "search" : "landing");
    };
    void restoreSession();
  }, []);

  useEffect(() => {
    if (!isHelpOpen) {
      const audio = helpAudioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return;
    }
    void helpAudioRef.current?.play().catch(() => {});
  }, [isHelpOpen]);

  useEffect(() => {
    const loadSavedBooks = async () => {
      if (!authUser) {
        setSavedBookIds(new Set());
        return;
      }
      const { data, error: loadError } = await getSupabase()
        .from("user_library")
        .select("book_id")
        .eq("user_id", authUser.id)
        .eq("status", "saved");

      if (loadError) {
        setError(loadError.message);
        return;
      }

      const ids = new Set<number>();
      for (const row of data ?? []) {
        const id = Number((row as { book_id?: number | string }).book_id);
        if (Number.isFinite(id)) ids.add(id);
      }
      setSavedBookIds(ids);
    };

    void loadSavedBooks();
  }, [authUser]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSemanticSearch(query);
  };

  const goLanding = () => {
    setScreen("landing");
    setAllResults([]);
    setResultOffset(0);
    setResults([]);
    setError(null);
    setQuery("");
    setPrefsBanner(null);
  };

  const startOnboarding = () => {
    setPrefStep(1);
    setGenres([]);
    setDk(false);
    setMood("");
    setHint1("");
    setHint2("");
    setScreen("onboarding");
  };

  const skipToSearch = () => {
    saveKaPrefs({ genres: [], dk: true, mood: "" });
    setPrefsBanner(null);
    setScreen("search");
    setAllResults([]);
    setResultOffset(0);
    setQuery("");
    setResults([]);
    setError(null);
  };

  const openAuth = () => {
    setAuthMode("login");
    setAuthUsername("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError(null);
    setScreen("auth");
  };

  const openInstructions = () => {
    setIsHelpOpen(true);
  };

  const toggleGenre = (id: string) => {
    setDk(false);
    setGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const toggleDk = () => {
    setGenres([]);
    setDk((d) => !d);
  };

  const selectMood = (id: string) => {
    setMood(id);
  };

  const goStep2 = () => {
    if (!genres.length && !dk) {
      setHint1('Кем дегенде бір жанр таңдаңыз немесе «ЖИ таңдасын» батырмасын басыңыз.');
      return;
    }
    setHint1("");
    setPrefStep(2);
  };

  const goStep1 = () => {
    setPrefStep(1);
    setHint2("");
  };

  const finishPrefs = () => {
    if (!mood) {
      setHint2("Бір көңіл-күй таңдаңыз.");
      return;
    }
    setHint2("");
    const prefs: KaPrefs = { genres: [...genres], dk, mood };
    saveKaPrefs(prefs);
    setPrefsBanner(formatPrefsBanner(prefs));
    setScreen("search");
    const q = buildPreferenceSearchQuery(prefs);
    setQuery(q);
    void runSemanticSearch(q);
  };

  const skipOnboarding = () => {
    saveKaPrefs({ genres: [], dk: true, mood: "" });
    setPrefsBanner(null);
    setScreen("search");
    setAllResults([]);
    setResultOffset(0);
    setQuery("");
    setResults([]);
    setError(null);
  };

  const showDifferentBooks = () => {
    if (allResults.length <= SUGGESTION_BATCH_SIZE) return;
    const nextOffset =
      resultOffset + SUGGESTION_BATCH_SIZE >= allResults.length ? 0 : resultOffset + SUGGESTION_BATCH_SIZE;
    setResultOffset(nextOffset);
    setResults(allResults.slice(nextOffset, nextOffset + SUGGESTION_BATCH_SIZE));
    setSelectedSearchBook(null);
  };

  const applyGenre = (genre: string) => {
    setQuery(genre);
    void runSemanticSearch(genre);
  };

  const openBuyOrReadLink = () => {
    if (!selectedSearchBook) return;
    const searchText = `${selectedSearchBook.title} ${selectedSearchBook.author} купить читать онлайн`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = authUsername.trim();
    const rawEmail = authEmail.trim();
    const password = authPassword.trim();
    if (!username || !password) {
      setAuthError("Логин мен құпиясөзді толтырыңыз.");
      return;
    }
    const email = rawEmail || usernameToEmail(username);
    if (!isValidEmail(email)) {
      setAuthError("Жарамды email енгізіңіз.");
      return;
    }
    if (password.length < 4) {
      setAuthError("Құпиясөз кемінде 4 таңбадан тұруы керек.");
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === "register") {
        const { data: signUpData, error: signUpError } = await getSupabase().auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });
        if (signUpError) {
          console.log("Full Error:", signUpError);
          setAuthError(signUpError.message);
          return;
        }
        if (!signUpData.user) {
          setAuthError("Тіркелу аяқталмады. Email баптауларын тексеріңіз.");
          return;
        }
        const registeredUser = { id: signUpData.user.id, username };
        setAuthUser(registeredUser);
        saveAuthUser(registeredUser);
      } else {
        const { data: signInData, error: loginError } = await getSupabase().auth.signInWithPassword({
          email,
          password,
        });
        if (loginError || !signInData.user) {
          setAuthError(loginError?.message ?? "Логин немесе құпиясөз қате.");
          return;
        }
      }

      const { data: userPayload } = await getSupabase().auth.getUser();
      const current = userPayload.user;
      if (!current) throw new Error("Auth user табылмады.");
      const user = {
        id: current.id,
        username: username || String(current.user_metadata?.username ?? "").trim() || "user",
      };
      setAuthUser(user);
      saveAuthUser(user);
      setScreen("search");
      setAuthUsername("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message ?? "")
          : "";
      setAuthError(message || "Кіру кезінде қате шықты.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const toggleSavedBook = async (book: BookMatch) => {
    if (!authUser) {
      setError("Кітапты сақтау үшін аккаунтқа кіріңіз.");
      return;
    }

    const numericBookId = Number(book.id);
    if (!Number.isFinite(numericBookId)) {
      setError("Бұл кітапты сақтау мүмкін болмады (book_id табылмады).");
      return;
    }

    setSavedActionPending((prev) => ({ ...prev, [numericBookId]: true }));
    setError(null);
    try {
      if (savedBookIds.has(numericBookId)) {
        const { error: deleteError } = await getSupabase()
          .from("user_library")
          .delete()
          .eq("user_id", authUser.id)
          .eq("book_id", numericBookId)
          .eq("status", "saved");
        if (deleteError) throw deleteError;

        setSavedBookIds((prev) => {
          const next = new Set(prev);
          next.delete(numericBookId);
          return next;
        });
        return;
      }

      const { data: existingRow, error: existingError } = await getSupabase()
        .from("user_library")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("book_id", numericBookId)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existingRow?.id) {
        const { error: updateError } = await getSupabase()
          .from("user_library")
          .update({ status: "saved" })
          .eq("id", existingRow.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await getSupabase().from("user_library").insert({
          user_id: authUser.id,
          book_id: numericBookId,
          status: "saved",
        });
        if (insertError) throw insertError;
      }

      setSavedBookIds((prev) => {
        const next = new Set(prev);
        next.add(numericBookId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сақтау кезінде қате шықты.");
    } finally {
      setSavedActionPending((prev) => ({ ...prev, [numericBookId]: false }));
    }
  };

  const normalizeDetails = (book: BookMatch, raw?: Record<string, unknown> | null): BookDetails => ({
    title: String(raw?.["Атауы"] ?? raw?.title ?? book.title ?? "Атаусыз"),
    author: String(raw?.["Автор"] ?? raw?.author ?? book.author ?? ""),
    content: String(raw?.["Қысқаша сипаттама"] ?? raw?.content ?? book.content ?? "Сипаттама жоқ."),
    genre: String(raw?.["Жанр"] ?? raw?.genre ?? book.genre ?? "—"),
    subGenre: String(raw?.["Ішкі жанр"] ?? raw?.sub_genre ?? raw?.subgenre ?? "—"),
    year: String(raw?.["Жыл"] ?? raw?.year ?? "—"),
    pages: String(raw?.["Беттер саны"] ?? raw?.pages ?? raw?.page_count ?? "—"),
    rating: String(raw?.["Рейтинг"] ?? raw?.rating ?? "—"),
  });

  const openSearchDetails = async (book: BookMatch) => {
    const numericBookId = Number(book.id);
    if (!Number.isFinite(numericBookId)) {
      setSelectedSearchBook(normalizeDetails(book, null));
      return;
    }

    const { data, error: libraryError } = await getSupabase()
      .from("Library")
      .select("*")
      .eq("id", numericBookId)
      .maybeSingle();

    if (libraryError) {
      setSelectedSearchBook(normalizeDetails(book, null));
      return;
    }

    setSelectedSearchBook(normalizeDetails(book, (data as Record<string, unknown> | null) ?? null));
  };

  if (screen === null) {
    return <div className="ka-boot" aria-hidden />;
  }

  if (screen === "landing") {
    return (
      <div className="ka-land">
        <div className="ka-land-bg" aria-hidden />
        <div className="ka-land-inner">
          <div className="ka-land-books" aria-hidden>
            <div className="ka-land-book" style={{ background: "#C4522A" }}>
              📖
            </div>
            <div className="ka-land-book" style={{ background: "#6B3FA0" }}>
              📚
            </div>
            <div className="ka-land-book" style={{ background: "#3D7A6F" }}>
              🌿
            </div>
            <div className="ka-land-book" style={{ background: "#B8962E" }}>
              ✨
            </div>
          </div>
          <h1 className="ka-land-h1">
            Кітап<em>Әлемі</em>
          </h1>
          <p className="ka-land-sub">
            Талғамыңызды сұраймыз да, мағыналық іздеу арқылы сізге сай кітаптарды ұсынамыз.
          </p>
          <div className="ka-land-btns">
            <button type="button" className="ka-btn-primary" onClick={startOnboarding}>
              📚 Бастау →
            </button>
            {!authUser ? (
              <button type="button" className="ka-btn-ghost-light" onClick={openAuth}>
                Кіру / Тіркелу
              </button>
            ) : null}
            <button type="button" className="ka-btn-ghost-light" onClick={skipToSearch}>
              Бірден ақылды іздеуге өту
            </button>
            <Link href="/zhobaly-akparat" className="ka-btn-ghost-light ka-land-info-link">
              Жоба туралы
            </Link>
          </div>
          <button type="button" className="ka-help-fab" onClick={openInstructions} aria-label="Нұсқаулық">
            ?
          </button>
        </div>
        {isHelpOpen ? (
          <div className="ka-modal-backdrop" onClick={() => setIsHelpOpen(false)} role="presentation">
            <section
              className="ka-modal ka-help-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Сайт нұсқаулығы"
              onClick={(event) => event.stopPropagation()}
            >
              <h3>Нұсқаулық</h3>
              <p className="ka-modal-desc">
                Кітап Әлемі платформасында навигация, іздеу және сақтауды жылдам үйрену үшін қысқа
                нұсқаулық:
              </p>
              <div className="ka-help-audio">
                <p className="ka-help-audio-label">Аудионұсқаулық</p>
                <audio
                  ref={helpAudioRef}
                  className="ka-help-audio-player"
                  controls
                  src="/audio/salem-kitap-alemi.m4a"
                  preload="metadata"
                >
                  Сіздің браузеріңіз аудионы қолдамайды.
                </audio>
              </div>
              <div className="ka-help-list">
                <p>
                  <strong>Бастау</strong> — талғамды баптау қадамын ашады.
                </p>
                <p>
                  <strong>Бірден ақылды іздеуге өту</strong> — онбордингті өткізіп, іздеу бетіне өтеді.
                </p>
                <p>
                  <strong>Іздеу</strong> батырмасы — енгізілген мәтін бойынша мағыналық сәйкестіктерді табады.
                </p>
                <p>
                  <strong>Жанр батырмалары</strong> — бір басуда сол жанр бойынша іздеуді іске қосады.
                </p>
                <p>
                  <strong>Сақтау</strong> — кітапты жеке сақталған тізімге қосады.
                </p>
                <p>
                  <strong>Сақталған</strong> бөлімі — бұрын сақталған кітаптарды көру және өшіру.
                </p>
                <p>
                  <strong>Профиль</strong> бөлімі — аккаунт деректері мен күннің дәйексөзі.
                </p>
                <p>
                  <strong>Кітапты оқу/сатып алу</strong> — Google-де кітап атауы мен автор бойынша жаңа
                  бет ашады.
                </p>
              </div>
              <div className="ka-modal-actions">
                <button type="button" className="ka-link-btn" onClick={() => setIsHelpOpen(false)}>
                  Түсіндім
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  if (screen === "onboarding") {
    return (
      <div className="ka-page">
        <header className="ka-nav">
          <button type="button" className="ka-nav-logo bg-transparent border-0 cursor-pointer p-0" onClick={goLanding}>
            Кітап<em>Әлемі</em>
          </button>
          {health ? (
            <span className={`ka-health ${health.ok ? "ok" : "warn"}`}>
              {health.ok
                ? "Жүйе дайын"
                : `Қоршам орта: ${health.missing.length} айнымалы жетіспейді`}
            </span>
          ) : null}
        </header>

        <div className="ka-onboard">
          <div className="ka-pdots">
            <div className={`ka-pdot ${prefStep === 1 ? "act" : ""}`} />
            <div className={`ka-pdot ${prefStep === 2 ? "act" : ""}`} />
          </div>

          {prefStep === 1 ? (
            <>
              <div className="ka-prefs-head">
                <div className="ka-prefs-tag">1 / 2 — Жанрлар</div>
                <h2 className="ka-prefs-title">
                  Қандай кітаптар <em>ұнайды?</em>
                </h2>
                <p className="ka-prefs-sub">
                  Бірнеше жанр таңдаңыз — жүйе сізге сай кітаптарды іздейді.
                </p>
              </div>
              <div className="ka-genre-grid">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`ka-g-card ${genres.includes(g.id) ? "sel" : ""}`}
                    onClick={() => toggleGenre(g.id)}
                  >
                    <span className="ka-g-chk">✓</span>
                    <span className="ka-g-ico">{g.icon}</span>
                    <div className="ka-g-nm">{g.label}</div>
                  </button>
                ))}
                <button
                  type="button"
                  className={`ka-g-card dk ${dk ? "sel" : ""}`}
                  onClick={toggleDk}
                >
                  <span className="ka-g-chk">✓</span>
                  <span className="ka-g-ico" style={{ fontSize: "1.3rem", margin: 0 }}>
                    🎲
                  </span>
                  <div className="ka-g-nm">Білмеймін — ЖИ таңдасын</div>
                </button>
              </div>
              {hint1 ? <div className="ka-phint">{hint1}</div> : null}
              <div className="ka-pnav">
                <button type="button" className="ka-pskip" onClick={skipOnboarding}>
                  Өткізу
                </button>
                <button type="button" className="ka-btn-next" onClick={goStep2}>
                  Келесі →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="ka-prefs-head">
                <div className="ka-prefs-tag">2 / 2 — Көңіл-күй</div>
                <h2 className="ka-prefs-title">
                  Қазір қалай <em>сезінесіз?</em>
                </h2>
                <p className="ka-prefs-sub">Оқу ниетіңізге сай кітап ұсынамыз.</p>
              </div>
              <div className="ka-mood-grid">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`ka-m-card ${mood === m.id ? "sel" : ""}`}
                    onClick={() => selectMood(m.id)}
                  >
                    <span className="ka-m-em">{m.icon}</span>
                    <span className="ka-m-lbl">{m.label}</span>
                    <span className="ka-m-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
              {hint2 ? <div className="ka-phint">{hint2}</div> : null}
              <div className="ka-pnav">
                <button type="button" className="ka-btn-back" onClick={goStep1}>
                  ← Артқа
                </button>
                <button type="button" className="ka-btn-next" onClick={finishPrefs}>
                  Дайын ✓
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (screen === "auth") {
    return (
      <div className="ka-page">
        <header className="ka-nav">
          <button type="button" className="ka-nav-logo bg-transparent border-0 cursor-pointer p-0" onClick={goLanding}>
            Кітап<em>Әлемі</em>
          </button>
        </header>
        <main className="ka-search-wrap">
          <section className="ka-auth-wrap">
            <h1 className="ka-title">{authMode === "login" ? "Аккаунтқа кіру" : "Тіркелу"}</h1>
            <p className="ka-subtitle">Аккаунтпен кіріп, кітаптарды профильге сақтай аласыз.</p>

            <form onSubmit={handleAuthSubmit} className="ka-auth-form">
              <div className="ka-auth-row">
                <input
                  className="ka-auth-input"
                  type="text"
                  value={authUsername}
                  onChange={(event) => setAuthUsername(event.target.value)}
                  placeholder="Логин"
                />
              </div>
              <div className="ka-auth-row">
                <input
                  className="ka-auth-input"
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="Email (мысалы: user@example.com)"
                />
              </div>
              <div className="ka-auth-row">
                <input
                  className="ka-auth-input"
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Құпиясөз"
                />
              </div>
              {authError ? <div className="ka-error">{authError}</div> : null}
              <button className="ka-btn-next" type="submit" disabled={isAuthLoading}>
                {isAuthLoading
                  ? "Күтіңіз..."
                  : authMode === "login"
                    ? "Кіру"
                    : "Тіркелу"}
              </button>
            </form>

            <button
              type="button"
              className="ka-link-btn"
              onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
            >
              {authMode === "login"
                ? "Аккаунт жоқ па? Тіркелу"
                : "Аккаунт бар ма? Кіру"}
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="ka-page">
      <header className="ka-nav">
        <button type="button" className="ka-nav-logo bg-transparent border-0 cursor-pointer p-0" onClick={goLanding}>
          Кітап<em>Әлемі</em>
        </button>
      </header>

      <main className="ka-search-wrap">
        <h1 className="ka-title">Семантикалық кітап іздеу</h1>
        <p className="ka-subtitle">
          Талғамыңызды жоғарыда жаңарта
          аласыз немесе төменде еркін сұрау жазыңыз.
        </p>

        {prefsBanner ? (
          <div className="ka-prefs-banner">
            <strong>Талғамыңыз:</strong> {prefsBanner} Нәтижелер осы сұрау бойынша ұсынылған.
          </div>
        ) : null}

        <form onSubmit={handleSearch} className="ka-search-box">
          <span className="ka-search-icon">🔍</span>
          <input
            className="ka-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Мысалы: философиялық тақырыптарға арналған антиутопиялық ғылыми фантастика"
          />
          <button className="ka-search-btn" type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? "Ізделуде…" : "Іздеу"}
          </button>
        </form>
        <div className="ka-popular-row">
          {BOOK_GENRES.map((genre) => (
            <button key={genre} type="button" className="ka-pop-chip" onClick={() => applyGenre(genre)}>
              {genre}
            </button>
          ))}
        </div>
        {allResults.length > SUGGESTION_BATCH_SIZE ? (
          <button type="button" className="ka-link-btn" onClick={showDifferentBooks}>
            Тағы 12 кітап ұсыну
          </button>
        ) : null}

        {error ? <div className="ka-error">{error}</div> : null}

        <div className="ka-result-head">
          <h2>Нәтижелер</h2>
          <span>
            {totalResults === 0 ? "Сәйкестік жоқ" : `${totalResults} сәйкес нәтиже`}
          </span>
        </div>

        <section className="ka-grid">
          {!isSearching && !results.length && !error ? (
            <div className="ka-empty">
              <span className="ka-empty-emoji">📚</span>
              <h3>Кітапханаңыздан іздеңіз</h3>
              <p>
                Тақырып, көңіл-күй, автор стилі немесе кілт сөз енгізіңіз — мағыналық сәйкестіктер
                көрсетіледі.
              </p>
            </div>
          ) : null}

          {results.map((book, index) => {
            const score = scoreAsPercent(book.similarity);
            const color = coverPalette[index % coverPalette.length];
            const numericBookId = Number(book.id);
            const canSave = Number.isFinite(numericBookId);
            const isSaved = canSave && savedBookIds.has(numericBookId);
            const isPending = canSave ? Boolean(savedActionPending[numericBookId]) : false;
            return (
              <article
                key={`${book.id ?? book.title ?? "кітап"}-${index}`}
                className="ka-card ka-saved-card"
                role="button"
                tabIndex={0}
                onClick={() => void openSearchDetails(book)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void openSearchDetails(book);
                  }
                }}
              >
                <div className="ka-cover" style={{ background: `${color}22` }}>
                  <div className="ka-cover-spine" style={{ background: color }} />
                  <span>📖</span>
                </div>
                <div className="ka-card-content">
                  <p className="ka-genre" style={{ color }}>
                    {book.genre ?? "Сәйкес кітап"}
                  </p>
                  <h3>{book.title ?? "Атаусыз"}</h3>
                  <p className="ka-author">
                    {book.author ? `авторы: ${book.author}` : "Авторы белгісіз"}
                  </p>
                  <p className="ka-desc">{book.content ?? "Сипаттама жоқ."}</p>
                  <div className="ka-foot">
                    <span className="ka-score">
                      {score ? `Ұқсастық ${score}` : "Ұқсастық —"}
                    </span>
                    <button
                      type="button"
                      className={`ka-save-btn ${isSaved ? "saved" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void toggleSavedBook(book);
                      }}
                      disabled={!canSave || isPending}
                    >
                      {isPending ? "..." : isSaved ? "Сақталған" : "Сақтау"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="ka-bottom-nav" aria-label="Төменгі виджеттер">
          <Link href="/?screen=search" className="ka-bottom-item active">
            <span className="ka-bottom-icon" aria-hidden>
              🔎
            </span>
            <span>Іздеу</span>
          </Link>
          <Link href="/saved" className="ka-bottom-item">
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
      {selectedSearchBook ? (
        <div className="ka-modal-backdrop" onClick={() => setSelectedSearchBook(null)} role="presentation">
          <section
            className="ka-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Кітап туралы толық ақпарат"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Атауы: {selectedSearchBook.title}</h3>
            <p className="ka-author">Автор: {selectedSearchBook.author || "Авторы белгісіз"}</p>
            <p className="ka-modal-desc">Қысқаша сипаттама: {selectedSearchBook.content}</p>
            <div className="ka-modal-meta">
              <p>Жанр: {selectedSearchBook.genre}</p>
              <p>Ішкі жанр: {selectedSearchBook.subGenre}</p>
              <p>Жыл: {selectedSearchBook.year}</p>
              <p>Беттер саны: {selectedSearchBook.pages}</p>
              <p>Рейтинг: {selectedSearchBook.rating}</p>
            </div>
            <div className="ka-modal-actions">
              <button type="button" className="ka-link-btn" onClick={openBuyOrReadLink}>
                Кітапты оқу/сатып алу
              </button>
              <button type="button" className="ka-link-btn" onClick={() => setSelectedSearchBook(null)}>
                Жабу
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
