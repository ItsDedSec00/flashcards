import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import UploadForm from './components/UploadForm.jsx';
import DeckList from './components/DeckList.jsx';
import StudyMode from './components/StudyMode.jsx';
import QuizMode from './components/QuizMode.jsx';

export default function App() {
  const [view, setView] = useState('home');
  const [decks, setDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDecks = async () => {
    try {
      const res = await fetch('/api/decks');
      setDecks(await res.json());
    } catch (err) {
      console.error('Failed to load decks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDecks(); }, []);

  const openDeck = async (id, mode) => {
    const res = await fetch(`/api/decks/${id}`);
    const deck = await res.json();
    setActiveDeck(deck);
    setView(mode);
  };

  const goHome = () => {
    setView('home');
    setActiveDeck(null);
    loadDecks();
  };

  const handleDelete = async (id) => {
    await fetch(`/api/decks/${id}`, { method: 'DELETE' });
    loadDecks();
  };

  return (
    <div className="app">
      <Header onHome={goHome} showBack={view !== 'home'} />
      <main className="main-content">
        {view === 'home' && (
          <>
            <UploadForm onDeckCreated={loadDecks} />
            <DeckList
              decks={decks}
              loading={loading}
              onStudy={(id) => openDeck(id, 'study')}
              onQuiz={(id) => openDeck(id, 'quiz')}
              onDelete={handleDelete}
            />
          </>
        )}
        {view === 'study' && activeDeck && (
          <StudyMode deck={activeDeck} onBack={goHome} />
        )}
        {view === 'quiz' && activeDeck && (
          <QuizMode deck={activeDeck} onBack={goHome} />
        )}
      </main>
    </div>
  );
}
