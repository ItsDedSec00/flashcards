import '../styles/Flashcard.css';

export default function Flashcard({ question, answer, flipped, onFlip }) {
  return (
    <div className="flashcard-container" onClick={onFlip}>
      <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <span className="card-label">Frage</span>
          <p className="card-text">{question}</p>
          <span className="card-hint">Klicken zum Aufdecken</span>
        </div>
        <div className="flashcard-face flashcard-back">
          <span className="card-label">Antwort</span>
          <p className="card-text">{answer}</p>
          <span className="card-hint">Klicken zum Zurückdrehen</span>
        </div>
      </div>
    </div>
  );
}
