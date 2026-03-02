import { Router } from 'express';
import { generateCards, generateCardQuestions, generateWrongAnswers, mapConcurrent } from '../lib/openrouter.js';

const router = Router();

// ─── Standard (non-streaming) endpoint ───────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { text, count = 15, model } = req.body;
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Text too short to generate meaningful cards (minimum 50 characters)' });
    }
    const cards = await generateCards(text, count, model);
    res.json({ cards });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── Streaming SSE endpoint ───────────────────────────────────────────────────
router.post('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const { text, count = 15, model } = req.body;

  if (!text || text.trim().length < 50) {
    send({ error: 'Text zu kurz für sinnvolle Karten (mindestens 50 Zeichen)' });
    return res.end();
  }

  try {
    // Phase 1: generate questions + answers
    send({ progress: 5, phase: 'questions', message: 'Fragen werden generiert...' });
    const cards = await generateCardQuestions(text, count, model);
    send({ progress: 40, phase: 'questions_done', message: `${cards.length} Fragen erstellt`, count: cards.length });

    // Phase 2: generate wrong answers per card, 3 at a time
    let done = 0;
    const result = await mapConcurrent(
      cards,
      async (card) => {
        try {
          const wrongAnswers = await generateWrongAnswers(card.question, card.answer, model);
          done++;
          const progress = 40 + Math.round((done / cards.length) * 55);
          send({ progress, phase: 'distractors', message: `Falsche Antworten: ${done}/${cards.length}`, done, total: cards.length });
          return { ...card, wrongAnswers };
        } catch {
          done++;
          const progress = 40 + Math.round((done / cards.length) * 55);
          send({ progress, phase: 'distractors', message: `Falsche Antworten: ${done}/${cards.length}`, done, total: cards.length });
          return card;
        }
      },
      3
    );

    send({ progress: 100, phase: 'done', cards: result });
    res.end();
  } catch (err) {
    send({ error: err.message });
    res.end();
  }
});

export default router;
