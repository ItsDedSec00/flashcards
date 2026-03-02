export default function DeckList({ decks, loading, onStudy, onQuiz, onDelete }) {
  if (loading) {
    return <section className="deck-section"><p className="loading-text">Decks werden geladen...</p></section>;
  }

  if (decks.length === 0) {
    return (
      <section className="deck-section">
        <h2 className="section-title">Deine Decks</h2>
        <p className="empty-text">Noch keine Decks vorhanden. Lade eine PDF hoch, um dein erstes Deck zu erstellen!</p>
      </section>
    );
  }

  return (
    <section className="deck-section">
      <h2 className="section-title">Deine Decks</h2>
      <div className="deck-grid">
        {decks.map((deck) => (
          <div key={deck.id} className="deck-card">
            <div className="deck-card-body">
              <h3 className="deck-name">{deck.name}</h3>
              <p className="deck-meta">
                {deck.cardCount} Karten
                {deck.source && <span> &middot; {deck.source}</span>}
              </p>
              <p className="deck-date">
                {new Date(deck.createdAt).toLocaleDateString('de-DE')}
              </p>
            </div>
            <div className="deck-card-actions">
              <button className="btn btn-sm btn-study" onClick={() => onStudy(deck.id)}>Lernen</button>
              <button className="btn btn-sm btn-quiz" onClick={() => onQuiz(deck.id)}>Quiz</button>
              <button className="btn btn-sm btn-delete" onClick={() => onDelete(deck.id)}>Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
