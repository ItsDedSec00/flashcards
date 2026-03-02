import { useState, useRef, useEffect } from 'react';
import { uploadPDF, uploadPDFs, saveDeck, listDriveFiles, downloadDriveFile } from '../api.js';
import '../styles/Upload.css';

export default function UploadForm({ onDeckCreated }) {
  const [step, setStep] = useState('upload');
  const [tab, setTab] = useState('drive'); // 'drive' | 'local'
  const [files, setFiles] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveAvailable, setDriveAvailable] = useState(null); // null=loading, true, false
  const [driveLoading, setDriveLoading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [deckName, setDeckName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [cardCount, setCardCount] = useState(15);
  const [rawCount, setRawCount] = useState('15');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [fact, setFact] = useState('');
  const fileRef = useRef(null);

  // Check if Drive is configured and load files
  useEffect(() => {
    setDriveLoading(true);
    listDriveFiles()
      .then((files) => {
        setDriveFiles(files);
        setDriveAvailable(true);
        console.debug('[Lernkarten] Google Drive Dateien geladen:', files.length);
      })
      .catch(() => {
        setDriveAvailable(false);
        setTab('local');
      })
      .finally(() => setDriveLoading(false));
  }, []);

  const reset = () => {
    setStep('upload');
    setFiles([]);
    setExtractedText('');
    setDeckName('');
    setSourceName('');
    setCardCount(15);
    setRawCount('15');
    setError(null);
    setProgress(0);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    setFiles(selected);
    setError(null);
  };

  const handleLocalUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    console.debug('[Lernkarten] PDF-Upload gestartet:', files.map(f => f.name));
    try {
      const result = files.length === 1
        ? await uploadPDF(files[0])
        : await uploadPDFs(files);
      console.debug('[Lernkarten] Text extrahiert:', result.textLength, 'Zeichen');
      setExtractedText(result.text);
      const name = files.length === 1
        ? files[0].name.replace('.pdf', '')
        : `Kombiniert (${files.length} Dateien)`;
      setDeckName(name);
      setSourceName(files.map(f => f.name).join(', '));
      setStep('preview');
    } catch (e) {
      console.error('[Lernkarten] Upload-Fehler:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDriveSelect = async (file) => {
    setLoading(true);
    setError(null);
    console.debug('[Lernkarten] Drive-Datei ausgewählt:', file.name, file.id);
    try {
      const result = await downloadDriveFile(file.id, file.name);
      console.debug('[Lernkarten] Drive-Text extrahiert:', result.textLength, 'Zeichen');
      setExtractedText(result.text);
      setDeckName(file.name.replace('.pdf', ''));
      setSourceName(`Drive: ${file.name}`);
      setStep('preview');
    } catch (e) {
      console.error('[Lernkarten] Drive-Download-Fehler:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Rotate useless facts while generating
  useEffect(() => {
    if (step !== 'generating') return;
    const fetchFact = async () => {
      try {
        const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=de');
        const data = await res.json();
        if (data.text) setFact(data.text);
      } catch { /* ignore, facts are optional */ }
    };
    fetchFact();
    const interval = setInterval(fetchFact, 9000);
    return () => clearInterval(interval);
  }, [step]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setStep('generating');
    setProgress(5);
    setProgressMsg('Verbindung wird hergestellt...');
    setFact('');

    console.debug('[Lernkarten] Kartengenerierung gestartet:', { cardCount, textLength: extractedText.length });

    try {
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText, count: cardCount })
      });

      if (!response.ok) {
        throw new Error(`Server-Fehler: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let cards = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.error) throw new Error(event.error);
          if (event.progress != null) setProgress(event.progress);
          if (event.message) {
            setProgressMsg(event.message);
            console.debug('[Lernkarten]', event.message);
          }
          if (event.phase === 'done') {
            cards = event.cards;
            console.debug('[Lernkarten] Karten erfolgreich generiert:', cards.length, 'Karten');
          }
        }
      }

      if (!cards) throw new Error('Keine Karten empfangen');

      setProgressMsg('Deck wird gespeichert...');
      console.debug('[Lernkarten] Deck wird automatisch gespeichert...');
      await saveDeck(deckName, cards, sourceName);
      console.debug('[Lernkarten] Deck gespeichert!');
      reset();
      onDeckCreated();
    } catch (e) {
      console.error('[Lernkarten] Generierung fehlgeschlagen:', e.message);
      setError(e.message);
      setStep('preview');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="upload-section">
      <h2 className="section-title">Neues Deck erstellen</h2>

      {error && <div className="error-banner">{error}</div>}

      {step === 'upload' && (
        <div className="upload-area">
          {/* Tab switcher */}
          <div className="source-tabs">
            {driveAvailable && (
              <button
                className={`source-tab ${tab === 'drive' ? 'active' : ''}`}
                onClick={() => setTab('drive')}
              >
                Google Drive
              </button>
            )}
            <button
              className={`source-tab ${tab === 'local' ? 'active' : ''}`}
              onClick={() => setTab('local')}
            >
              Eigene Datei
            </button>
          </div>

          {/* Google Drive file list */}
          {tab === 'drive' && (
            <div className="drive-area">
              {driveLoading && <p className="drive-loading">Drive-Dateien werden geladen...</p>}
              {!driveLoading && driveFiles.length === 0 && (
                <p className="drive-empty">Keine PDF-Dateien im geteilten Ordner gefunden.</p>
              )}
              {!driveLoading && driveFiles.length > 0 && (
                <ul className="drive-file-list">
                  {driveFiles.map((f) => (
                    <li key={f.id} className="drive-file-item">
                      <div className="drive-file-info">
                        <span className="drive-file-icon">📄</span>
                        <div>
                          <span className="drive-file-name">{f.name}</span>
                          <span className="drive-file-meta">
                            {f.size ? `${(Number(f.size) / 1024).toFixed(0)} KB` : ''}
                            {f.modifiedTime && ` · ${new Date(f.modifiedTime).toLocaleDateString('de-DE')}`}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleDriveSelect(f)}
                        disabled={loading}
                      >
                        {loading ? '...' : 'Auswählen'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Local file upload */}
          {tab === 'local' && (
            <>
              <div
                className="drop-zone"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  hidden
                />
                <div className="drop-zone-content">
                  <span className="drop-icon">📄</span>
                  <p className="drop-text">
                    {files.length > 0
                      ? `${files.length} PDF${files.length > 1 ? 's' : ''} ausgewählt`
                      : 'Klicken, um PDF-Dateien auszuwählen'}
                  </p>
                  {files.length > 0 && (
                    <ul className="file-list">
                      {files.map((f, i) => (
                        <li key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleLocalUpload}
                disabled={files.length === 0 || loading}
              >
                {loading ? 'Text wird extrahiert...' : 'Text extrahieren'}
              </button>
            </>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="preview-area">
          <div className="preview-header">
            <h3>Vorschau des extrahierten Textes</h3>
            <span className="text-length">{extractedText.length.toLocaleString('de-DE')} Zeichen</span>
          </div>
          <pre className="text-preview">{extractedText.slice(0, 2000)}{extractedText.length > 2000 ? '\n...(gekürzt)' : ''}</pre>
          <div className="generate-controls">
            <label className="count-label">
              Anzahl Karten:
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="3"
                max="30"
                value={rawCount}
                onChange={(e) => setRawCount(e.target.value)}
                onBlur={() => {
                  const n = parseInt(rawCount, 10);
                  const clamped = isNaN(n) ? 15 : Math.max(3, Math.min(30, n));
                  setRawCount(String(clamped));
                  setCardCount(clamped);
                }}
                className="count-input"
              />
            </label>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={reset}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                Karten generieren
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="generating-area">
          <div className="spinner" />
          <p className="generating-title">
            {progress < 40
              ? `Schritt 1 / 2 — Fragen generieren`
              : progress < 100
              ? `Schritt 2 / 2 — Falsche Antworten erstellen`
              : 'Fertig!'}
          </p>
          <div className="gen-progress">
            <div className="gen-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="generating-sub">{progressMsg}</p>
          {fact && (
            <div className="useless-fact">
              <span className="fact-label">Wusstest du?</span>
              <span className="fact-text">{fact}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
