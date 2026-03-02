export default function Header({ onHome, showBack }) {
  return (
    <header className="header">
      <div className="header-inner">
        <button className="logo-btn" onClick={onHome}>
          <span className="logo-icon">🃏</span>
          <span className="logo-text">Lernkarten</span>
        </button>
        {showBack && (
          <button className="back-btn" onClick={onHome}>
            ← Zurück
          </button>
        )}
      </div>
    </header>
  );
}
