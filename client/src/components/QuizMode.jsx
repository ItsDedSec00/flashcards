import { useState, useMemo } from 'react';
import '../styles/Quiz.css';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizMode({ deck, onBack }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const total = deck.cards.length;
  const isFinished = index >= total;
  const card = !isFinished ? deck.cards[index] : null;

  // Pre-generate shuffled options for each card
  const allOptions = useMemo(() => {
    return deck.cards.map((c, i) => {
      let distractors;

      // Use AI-generated wrong answers if available
      if (c.wrongAnswers && c.wrongAnswers.length >= 3) {
        distractors = c.wrongAnswers.slice(0, 3);
      } else {
        // Fallback: use other cards' answers as distractors
        const otherAnswers = deck.cards
          .filter((_, j) => j !== i)
          .map(x => x.answer);
        distractors = shuffle(otherAnswers).slice(0, 3);
        while (distractors.length < 3) {
          distractors.push('Keine der anderen Antworten');
        }
      }

      return shuffle([c.answer, ...distractors]);
    });
  }, [deck.cards]);

  const options = !isFinished ? allOptions[index] : [];

  const handleSelect = (option) => {
    if (showResult) return;
    setSelected(option);
    const correct = option === card.answer;
    setResults(r => [...r, {
      correct,
      skipped: false,
      userAnswer: option,
      correctAnswer: card.answer,
      question: card.question
    }]);
    setShowResult(true);
  };

  const handleSkip = () => {
    setResults(r => [...r, {
      correct: false,
      skipped: true,
      userAnswer: null,
      correctAnswer: card.answer,
      question: card.question
    }]);
    setSkipped(s => s + 1);
    setShowResult(false);
    setSelected(null);
    setIndex(i => i + 1);
  };

  const next = () => {
    setShowResult(false);
    setSelected(null);
    setIndex(i => i + 1);
  };

  if (isFinished) {
    const answered = results.filter(r => !r.skipped);
    const score = results.filter(r => r.correct).length;
    const pct = answered.length > 0 ? Math.round((score / answered.length) * 100) : 0;
    return (
      <div className="quiz-results">
        <h2>Quiz abgeschlossen!</h2>
        <div className="score-display">
          <span className="score-number">{score}/{answered.length}</span>
          <span className={`score-pct ${pct >= 70 ? 'good' : pct >= 40 ? 'ok' : 'poor'}`}>{pct}%</span>
        </div>
        {skipped > 0 && (
          <p className="skipped-info">{skipped} Frage{skipped > 1 ? 'n' : ''} übersprungen</p>
        )}
        <div className="results-list">
          {results.map((r, i) => (
            <div key={i} className={`result-item ${r.correct ? 'correct' : r.skipped ? 'skipped' : 'incorrect'}`}>
              <div className="result-indicator">{r.correct ? '✓' : r.skipped ? '—' : '✗'}</div>
              <div className="result-content">
                <p className="result-question">{r.question}</p>
                {r.skipped
                  ? <p className="result-user">Übersprungen</p>
                  : <p className="result-user">Deine Antwort: {r.userAnswer}</p>
                }
                {!r.correct && <p className="result-correct">Richtig: {r.correctAnswer}</p>}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onBack}>Zurück zu den Decks</button>
      </div>
    );
  }

  return (
    <div className="quiz-mode">
      <div className="quiz-header">
        <h2>{deck.name} — Quiz</h2>
        <span className="quiz-counter">Frage {index + 1} / {total}</span>
      </div>
      <div className="quiz-progress">
        <div className="quiz-progress-bar" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <div className="quiz-card">
        <p className="quiz-question">{card.question}</p>
        <div className="mc-options">
          {options.map((option, i) => {
            let cls = 'mc-option';
            if (showResult) {
              if (option === card.answer) cls += ' mc-correct';
              else if (option === selected) cls += ' mc-wrong';
              else cls += ' mc-dimmed';
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => handleSelect(option)}
                disabled={showResult}
              >
                <span className="mc-letter">{'ABCD'[i]}</span>
                <span className="mc-text">{option}</span>
              </button>
            );
          })}
        </div>
        {!showResult && (
          <button className="btn btn-skip" onClick={handleSkip}>
            Überspringen
          </button>
        )}
        {showResult && (
          <div className={`quiz-feedback ${results.at(-1).correct ? 'correct' : 'incorrect'}`}>
            <p className="feedback-status">
              {results.at(-1).correct ? '✓ Richtig!' : '✗ Falsch'}
            </p>
            <button className="btn btn-primary" onClick={next}>
              {index < total - 1 ? 'Nächste Frage' : 'Ergebnis anzeigen'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
