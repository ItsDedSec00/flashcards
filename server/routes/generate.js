import { Router } from 'express';
import { generateCards } from '../lib/openrouter.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { text, count = 10, model } = req.body;

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

export default router;
