"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearAuthUser, loadAuthUser, type AuthUser } from "@/src/lib/auth-session";
import { getSupabase } from "@/src/lib/supabase";

const DAILY_QUOTES: { text: string; author: string }[] = [
  { text: "Кітап - ойға қанат, жүрекке жарық.", author: "Абай Құнанбайұлы" },
  { text: "Оқу - адамды биікке бастайтын тыныш күш.", author: "Ыбырай Алтынсарин" },
  { text: "Бір жақсы кітап - үнсіз ұстаз.", author: "Шоқан Уәлиханов" },
  { text: "Білімді адам ғана еркін ойлайды.", author: "Ахмет Байтұрсынұлы" },
  { text: "Әр бет - жаңа әлемге ашылған есік.", author: "Мұхтар Әуезов" },
  { text: "Кітаппен дос болғанның ойы терең болады.", author: "Сәкен Сейфуллин" },
  { text: "Таңдаған кітабың - өзіңе қойған сұрағың.", author: "Мағжан Жұмабаев" },
  { text: "Оқу - болашаққа салынған ең сенімді көпір.", author: "Әлихан Бөкейхан" },
  { text: "Кітап оқыған жүрек жұқарады, ойы нұрланады.", author: "Міржақып Дулатов" },
  { text: "Жақсы сөз бен жақсы кітап адамды емдейді.", author: "Бейімбет Майлин" },
  { text: "Күн сайын аздап оқу - үлкен жеңістің бастауы.", author: "Жүсіпбек Аймауытов" },
  { text: "Білімге апарар ең қысқа жол - тұрақты оқу.", author: "Ғабит Мүсірепов" },
  { text: "Кітап - уақытпен сөйлесудің ең көркем жолы.", author: "Ғабиден Мұстафин" },
  { text: "Ойлау мәдениеті оқудан басталады.", author: "Әбіш Кекілбайұлы" },
  { text: "Бір ойлы сөйлем өмір бағытын өзгерте алады.", author: "Оралхан Бөкей" },
  { text: "Оқыған сайын адам өзін тереңірек таниды.", author: "Төлен Әбдік" },
  { text: "Кітап - үнсіз, бірақ шын дос.", author: "Уильям Шекспир" },
  { text: "Оқырман болу - өзіңді күнде жаңарту.", author: "Лев Толстой" },
  { text: "Ұлы идеялар қарапайым беттен басталады.", author: "Федор Достоевский" },
  { text: "Кітапхана - адамзат жадының жүрегі.", author: "Хорхе Луис Борхес" },
  { text: "Бүгін оқығаның ертеңгі шешіміңе әсер етеді.", author: "Стивен Кови" },
  { text: "Әр кітаптан кейін сен бұрынғы адам емессің.", author: "Эрих Мария Ремарк" },
  { text: "Оқу - жалғыздықты мағыналы етеді.", author: "Харуки Мураками" },
  { text: "Кітап ақылды ғана емес, мінезді де тәрбиелейді.", author: "Марк Твен" },
  { text: "Сабырмен оқылған парақ үлкен ой тудырады.", author: "Эмиль Золя" },
  { text: "Оқу - еркіндіктің ішкі формасы.", author: "Альбер Камю" },
  { text: "Кітаптан тапқан ойың өзіңді табуға көмектеседі.", author: "Пауло Коэльо" },
  { text: "Кішкентай әдет - күн сайын оқу.", author: "Джеймс Клир" },
  { text: "Жүрекке жақын кітап уақытқа бағынбайды.", author: "Антуан де Сент-Экзюпери" },
  { text: "Білім - бөліскен сайын көбейетін байлық.", author: "Конфуций" },
];
const TODAY_EPOCH_DAY = Math.floor(new Date().getTime() / 86400000);

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const quoteOfDay = useMemo(() => {
    const idx = TODAY_EPOCH_DAY % DAILY_QUOTES.length;
    return DAILY_QUOTES[idx];
  }, []);

  useEffect(() => {
    const loadSaved = async () => {
      const localUser = loadAuthUser();
      const { data } = await getSupabase().auth.getUser();
      const authUser = data.user;

      if (!authUser && !localUser) {
        setAuthUser(null);
        setIsLoading(false);
        return;
      }

      const user = authUser
        ? {
            id: authUser.id,
            username: localUser?.username || String(authUser.user_metadata?.username ?? "").trim() || "user",
          }
        : localUser!;
      setAuthUser(user);
      setUserEmail(authUser?.email ?? "");

      setIsLoading(false);
    };

    void loadSaved();
  }, []);

  const logout = () => {
    void getSupabase().auth.signOut();
    clearAuthUser();
    setAuthUser(null);
  };

  if (isLoading) {
    return <div className="ka-boot" aria-hidden />;
  }

  if (!authUser) {
    return (
      <div className="ka-page">
        <header className="ka-nav">
          <Link href="/" className="ka-nav-logo">
            Кітап<em>Әлемі</em>
          </Link>
          <span className="ka-profile-top-tag">👤 Профиль</span>
        </header>
        <main className="ka-profile-wrap">
          <section className="ka-profile-widget">
            <h1 className="ka-title">Профиль</h1>
            <p className="ka-subtitle">Профильді толық ашу үшін аккаунтқа кіріңіз.</p>
            <div className="ka-profile-account-actions">
              <Link href="/" className="ka-profile-btn ka-profile-btn-primary">
                🔐 Кіру
              </Link>
            </div>
          </section>
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
        <span className="ka-profile-top-tag">👤 Профиль</span>
      </header>
      <main className="ka-profile-wrap">
        <section className="ka-profile-hero">
          <div className="ka-profile-avatar">👤</div>
          <h1 className="ka-profile-name">{authUser.username}</h1>
          <p className="ka-profile-email">{userEmail || `${authUser.username}@kitap.local`}</p>
        </section>

        <section className="ka-profile-widget ka-quote-featured">
          <h2 className="ka-profile-widget-title">🌟 Күннің дәйексөзі</h2>
          <div className="ka-quote-box">
            <p className="ka-quote-text">{`"${quoteOfDay?.text ?? "Кітап - білім бұлағы."}"`}</p>
            <p className="ka-quote-author">— {quoteOfDay?.author ?? "Халық даналығы"}</p>
          </div>
        </section>

        <section className="ka-profile-widget">
          <h2 className="ka-profile-widget-title">👤 Аккаунт</h2>
          <div className="ka-profile-account-actions">
            <button type="button" className="ka-profile-btn ka-profile-btn-danger" onClick={logout}>
              🚪 Шығу
            </button>
          </div>
        </section>

        <section className="ka-bottom-nav" aria-label="Төменгі виджеттер">
          <Link href="/?screen=search" className="ka-bottom-item">
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
          <Link href="/profile" className="ka-bottom-item active">
            <span className="ka-bottom-icon" aria-hidden>
              👤
            </span>
            <span>Профиль</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
