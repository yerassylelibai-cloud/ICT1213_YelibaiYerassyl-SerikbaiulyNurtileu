/** Сәйкес `files (1)/index.html` — localStorage кілті `kaPrefs`. */

export const KA_PREFS_KEY = "kaPrefs";

export type KaPrefs = {
  genres: string[];
  dk: boolean;
  mood: string;
  savedAt?: number;
};

export function loadKaPrefs(): KaPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KA_PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as KaPrefs;
    if (!p || !Array.isArray(p.genres)) return null;
    return {
      genres: p.genres,
      dk: Boolean(p.dk),
      mood: typeof p.mood === "string" ? p.mood : "",
      savedAt: typeof p.savedAt === "number" ? p.savedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function saveKaPrefs(prefs: KaPrefs): void {
  localStorage.setItem(
    KA_PREFS_KEY,
    JSON.stringify({
      ...prefs,
      savedAt: Date.now(),
    })
  );
}

/** Семантикалық іздеу үшін бір мәтінге біріктіреміз (E5 multilingual). */
export function buildPreferenceSearchQuery(p: KaPrefs): string {
  const genreLine =
    p.dk || p.genres.length === 0
      ? "Қалаған жанрымды нақты айта алмаймын; әртүрлі қызықты кітаптар ұсыныңыз."
      : `Мен мына жанрларды ұнатамын: ${p.genres.join(", ")}.`;
  const moodLine = p.mood.trim() ? `Қазіргі көңіл-күйім: ${p.mood.trim()}.` : "";
  return `${genreLine} ${moodLine} Осы талғамға сай кітаптар ұсыныңыз.`.trim();
}
