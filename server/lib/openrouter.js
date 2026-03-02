const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'arcee-ai/trinity-large-preview:free';

// ─── helpers ────────────────────────────────────────────────────────────────

function parseJsonResponse(content) {
  const cleaned = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
  let parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    const key = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    if (key) parsed = parsed[key];
    else throw new Error('Model did not return an array');
  }
  return parsed;
}

async function callOpenRouter(messages, { model = DEFAULT_MODEL, temperature = 0.3, max_tokens = 4000 } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in .env file');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Flashcard App'
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error?.message || `OpenRouter returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Run async tasks in batches of `concurrency` at a time
async function mapConcurrent(items, fn, concurrency = 3) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// ─── Step 1: generate questions + correct answers ────────────────────────────

async function generateCardQuestions(text, count, model) {
  const truncated = text.slice(0, 12000);

  const systemPrompt = `Du bist ein Lernkarten-Generator. Erstelle aus dem gegebenen Lernmaterial genau ${count} Frage-Antwort-Paare auf Deutsch.

Regeln:
- Jede Frage soll ein bestimmtes Konzept, eine Tatsache oder Definition prüfen
- Antworten sollen kurz und prägnant sein (maximal 1-3 Sätze)
- Decke die wichtigsten Themen des Materials ab
- Variiere die Fragetypen: Definitionen, Vergleiche, Ursache/Wirkung, Anwendungen
- Erstelle KEINE Fragen über Seitenzahlen, Überschriften oder Formatierungsartefakte
- Alle Fragen und Antworten MÜSSEN auf Deutsch sein

Antworte NUR mit einem gültigen JSON-Array, keine Markdown-Blöcke, keine Erklärung:
[{"question": "...", "answer": "..."}, ...]`;

  const content = await callOpenRouter(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Erstelle ${count} Lernkarten auf Deutsch aus diesem Material:\n\n${truncated}` }
    ],
    { model, temperature: 0.3, max_tokens: 4000 }
  );

  const parsed = parseJsonResponse(content);

  return parsed.map((card, i) => {
    if (!card.question || !card.answer) throw new Error(`Card ${i} missing question or answer`);
    return { question: card.question.trim(), answer: card.answer.trim() };
  });
}

// ─── Step 2: generate 3 plausible wrong answers for a single card ────────────

async function generateWrongAnswers(question, answer, model) {
  const prompt = `Du hilfst dabei, Multiple-Choice-Fragen zu erstellen.

Frage: ${question}
Richtige Antwort: ${answer}

Erstelle genau 3 falsche Antwortoptionen auf Deutsch, die:
- Plausibel klingen und leicht mit der richtigen Antwort verwechselt werden könnten
- Ähnlich lang und im gleichen Stil wie die richtige Antwort sind
- Zum gleichen Fachgebiet gehören und inhaltlich verwandt sind
- Faktisch falsch sind, aber NICHT offensichtlich oder absurd falsch
- Sich klar voneinander unterscheiden

Antworte NUR mit einem JSON-Array aus genau 3 Strings, keine Erklärung:
["falsche Antwort 1", "falsche Antwort 2", "falsche Antwort 3"]`;

  const content = await callOpenRouter(
    [{ role: 'user', content: prompt }],
    { model, temperature: 0.7, max_tokens: 400 }
  );

  const parsed = parseJsonResponse(content);
  if (!Array.isArray(parsed) || parsed.length < 3) throw new Error('Invalid wrong answers response');
  return parsed.slice(0, 3).map(w => String(w).trim());
}

// ─── Named exports for streaming route ───────────────────────────────────────
export { generateCardQuestions, generateWrongAnswers, mapConcurrent };

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateCards(text, count = 15, model = DEFAULT_MODEL) {
  // Step 1: generate all card questions + correct answers
  const cards = await generateCardQuestions(text, count, model);

  // Step 2: generate 3 focused wrong answers per card, 3 at a time
  const cardsWithDistractors = await mapConcurrent(
    cards,
    async (card) => {
      try {
        const wrongAnswers = await generateWrongAnswers(card.question, card.answer, model);
        return { ...card, wrongAnswers };
      } catch {
        // If distractor generation fails, return card without them
        // (QuizMode falls back to other cards' answers)
        return card;
      }
    },
    3
  );

  return cardsWithDistractors;
}
