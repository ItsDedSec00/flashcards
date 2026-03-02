const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'arcee-ai/trinity-large-preview:free';

export async function generateCards(text, count = 10, model = DEFAULT_MODEL) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in .env file');

  const truncated = text.slice(0, 12000);

  const systemPrompt = `Du bist ein Lernkarten-Generator. Erstelle aus dem gegebenen Lernmaterial genau ${count} Frage-Antwort-Paare auf Deutsch.

Regeln:
- Jede Frage soll ein bestimmtes Konzept, eine Tatsache oder Definition prüfen
- Antworten sollen kurz und prägnant sein (maximal 1-3 Sätze)
- Decke die wichtigsten Themen des Materials ab
- Variiere die Fragetypen: Definitionen, Vergleiche, Ursache/Wirkung, Anwendungen
- Erstelle KEINE Fragen über Seitenzahlen, Überschriften oder Formatierungsartefakte
- Alle Fragen und Antworten MÜSSEN auf Deutsch sein
- Erstelle zu jeder Frage genau 3 falsche Antworten ("wrongAnswers"), die plausibel klingen aber eindeutig falsch sind
- Die falschen Antworten sollen thematisch zum Lernmaterial passen und ähnlich lang wie die richtige Antwort sein

Antworte NUR mit einem gültigen JSON-Array, keine Markdown-Blöcke, keine Erklärung:
[{"question": "...", "answer": "...", "wrongAnswers": ["...", "...", "..."]}, ...]`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Flashcard App'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Erstelle ${count} Lernkarten auf Deutsch aus diesem Material:\n\n${truncated}` }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error?.message || `OpenRouter returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Strip markdown fences if the model wrapped the response
  const cleaned = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON');
  }

  // Handle wrapped objects like { "flashcards": [...] }
  if (!Array.isArray(parsed)) {
    const key = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    if (key) parsed = parsed[key];
    else throw new Error('Model did not return an array of flashcards');
  }

  return parsed.map((card, i) => {
    if (!card.question || !card.answer) {
      throw new Error(`Card ${i} missing question or answer`);
    }
    const result = { question: card.question.trim(), answer: card.answer.trim() };
    if (Array.isArray(card.wrongAnswers) && card.wrongAnswers.length >= 3) {
      result.wrongAnswers = card.wrongAnswers.slice(0, 3).map(w => w.trim());
    }
    return result;
  });
}
