import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

await fs.mkdir(DATA_DIR, { recursive: true });

const router = Router();

router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const decks = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(async (f) => {
        const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8');
        const deck = JSON.parse(raw);
        return {
          id: deck.id,
          name: deck.name,
          cardCount: deck.cards.length,
          createdAt: deck.createdAt,
          source: deck.source
        };
      })
    );
    res.json(decks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${req.params.id}.json`), 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ error: 'Deck not found' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, cards, source } = req.body;
    const id = uuidv4().slice(0, 8);
    const deck = {
      id,
      name,
      source: source || 'manual',
      cards: cards.map((c, i) => ({
        id: `${id}-${i}`,
        question: c.question,
        answer: c.answer,
        wrongAnswers: c.wrongAnswers || []
      })),
      createdAt: new Date().toISOString()
    };
    await fs.writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(deck, null, 2));
    res.status(201).json(deck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await fs.unlink(path.join(DATA_DIR, `${req.params.id}.json`));
    res.json({ deleted: true });
  } catch {
    res.status(404).json({ error: 'Deck not found' });
  }
});

export default router;
