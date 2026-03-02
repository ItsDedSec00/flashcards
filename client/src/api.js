export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('pdf', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function uploadPDFs(files) {
  const formData = new FormData();
  for (const file of files) formData.append('pdfs', file);
  const res = await fetch('/api/upload/batch', { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function generateCards(text, count = 10, model) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, count, model })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function listDriveFiles() {
  const res = await fetch('/api/drive/files');
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function downloadDriveFile(fileId, fileName) {
  const res = await fetch('/api/drive/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, fileName })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function saveDeck(name, cards, source) {
  const res = await fetch('/api/decks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, cards, source })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
