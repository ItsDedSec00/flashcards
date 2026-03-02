import { useState, useEffect, useCallback } from 'react';
import Flashcard from './Flashcard.jsx';

export default function StudyMode({ deck, onBack }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = deck.cards[index];
  const total = deck.cards.length;

  const go = useCallback((dir) => {
    setFlipped(false);
    setIndex(i => Math.max(0, Math.min(total - 1, i + dir)));
  }, [total]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped(f => !f);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [go]);

  return (
    <div className="study-mode">
      <div className="study-header">
        <h2>{deck.name}</h2>
        <span className="study-counter">{index + 1} / {total}</span>
      </div>
      <div className="study-progress">
        <div className="study-progress-bar" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <Flashcard
        question={card.question}
        answer={card.answer}
        flipped={flipped}
        onFlip={() => setFlipped(f => !f)}
      />
      <div className="study-nav">
        <button className="btn btn-secondary" onClick={() => go(-1)} disabled={index === 0}>
          ← Zurück
        </button>
        <button className="btn btn-secondary" onClick={() => go(1)} disabled={index === total - 1}>
          Weiter →
        </button>
      </div>
      <p className="study-hint">Pfeiltasten zum Navigieren, Leertaste zum Umdrehen</p>
    </div>
  );
}
