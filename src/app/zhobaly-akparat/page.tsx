"use client";

import Link from "next/link";

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export default function ProjectInfoPage() {
  return (
    <div className="ka-page">
      <header className="ka-nav">
        <Link href="/" className="ka-nav-logo">
          Кітап<em>Әлемі</em>
        </Link>
        <span className="ka-info-nav-tag">Жоба туралы</span>
      </header>

      <main className="ka-info-page">
        <h1 className="ka-title">Жоба туралы ақпарат</h1>
        <p className="ka-subtitle">
          Бұл бетте «Кітап Әлемі» веб-жобасының авторлары мен оқу орны туралы мәлімет берілген.
        </p>

        <section className="ka-info-card" aria-labelledby="info-authors">
          <h2 id="info-authors" className="ka-info-card-title">
            Авторлар
          </h2>
          <p className="ka-info-line">Серікбайұлы Нұртілеу | Елібай Ерасыл</p>
        </section>

        <section className="ka-info-card" aria-labelledby="info-subject">
          <h2 id="info-subject" className="ka-info-card-title">
            Пән
          </h2>
          <p className="ka-info-line">АКТ</p>
        </section>

        <section className="ka-info-card" aria-labelledby="info-uni">
          <h2 id="info-uni" className="ka-info-card-title">
            Оқу орны
          </h2>
          <p className="ka-info-line">Нархоз университеті | Цифрлық Технологиялық Мектебі</p>
        </section>

        <section className="ka-info-card" aria-labelledby="info-major">
          <h2 id="info-major" className="ka-info-card-title">
            Мамандық
          </h2>
          <p className="ka-info-line">
            Data Science and Statistics | Applied Mathematics in Digital Economy
          </p>
        </section>

        <section className="ka-info-card" aria-labelledby="info-year">
          <h2 id="info-year" className="ka-info-card-title">
            Жыл
          </h2>
          <p className="ka-info-line">© 2026</p>
        </section>

        <section className="ka-info-card" aria-labelledby="info-email">
          <h2 id="info-email" className="ka-info-card-title">
            Электрондық пошта
          </h2>
          <p className="ka-info-line ka-info-emails">
            <a href="mailto:nurtileu.serikbaiuly@narxoz.kz">nurtileu.serikbaiuly@narxoz.kz</a>
            <span className="ka-footer-sep">|</span>
            <a href="mailto:yerassyl.elibai@narxoz.kz">yerassyl.elibai@narxoz.kz</a>
          </p>
        </section>

        <button type="button" className="ka-info-top-btn" onClick={scrollToTop}>
          Жоғарыға ↑
        </button>

        <p className="ka-info-back">
          <Link href="/">← Басты бетке оралу</Link>
        </p>
      </main>
    </div>
  );
}
