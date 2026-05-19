"use client";

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export function SiteFooter() {
  return (
    <footer className="ka-site-footer">
      <div className="ka-footer-inner">
        <div className="ka-footer-col">
          <p className="ka-footer-label">Авторлар</p>
          <p className="ka-footer-value">Серікбайұлы Нұртілеу | Елібай Ерасыл</p>
          <p className="ka-footer-label">Пән</p>
          <p className="ka-footer-value">АКТ</p>
        </div>
        <div className="ka-footer-col">
          <p className="ka-footer-label">Оқу орны</p>
          <p className="ka-footer-value">
            Нархоз университеті | Цифрлық Технологиялық Мектебі
          </p>
          <p className="ka-footer-label">Мамандық</p>
          <p className="ka-footer-value">
            Data Science and Statistics | Applied Mathematics in Digital Economy
          </p>
        </div>
        <div className="ka-footer-col">
          <p className="ka-footer-label">Жыл</p>
          <p className="ka-footer-value">© 2026</p>
          <p className="ka-footer-label">Электрондық пошта</p>
          <p className="ka-footer-value">
            <a href="mailto:nurtileu.serikbaiuly@narxoz.kz">nurtileu.serikbaiuly@narxoz.kz</a>
            <span className="ka-footer-sep">|</span>
            <a href="mailto:yerassyl.elibai@narxoz.kz">yerassyl.elibai@narxoz.kz</a>
          </p>
        </div>
      </div>
      <button type="button" className="ka-footer-top" onClick={scrollToTop}>
        Жоғарыға ↑
      </button>
    </footer>
  );
}
