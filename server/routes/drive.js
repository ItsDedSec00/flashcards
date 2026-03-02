import { Router } from 'express';
import { extractText } from '../lib/pdfParser.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

const router = Router();

// GET /api/drive/files — list PDFs in the shared folder
router.get('/files', async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!apiKey || !folderId) {
    return res.status(501).json({ error: 'Google Drive ist nicht konfiguriert (GOOGLE_API_KEY / GOOGLE_DRIVE_FOLDER_ID fehlt)' });
  }

  try {
    const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;
    const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=files(id,name,size,modifiedTime)&orderBy=name&pageSize=100`;

    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Drive API Fehler: ${response.status}`);
    }

    const data = await response.json();
    res.json(data.files || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drive/download — download a PDF from Drive and extract text
router.post('/download', async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const { fileId, fileName } = req.body;

  if (!apiKey) {
    return res.status(501).json({ error: 'GOOGLE_API_KEY nicht konfiguriert' });
  }

  if (!fileId) {
    return res.status(400).json({ error: 'fileId ist erforderlich' });
  }

  const tmpPath = path.join(uploadDir, `drive-${Date.now()}.pdf`);

  try {
    const url = `${DRIVE_API}/files/${fileId}?alt=media&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Download fehlgeschlagen: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tmpPath, buffer);

    const text = await extractText(tmpPath);
    await fs.unlink(tmpPath);

    res.json({
      filename: fileName || fileId,
      textLength: text.length,
      text
    });
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

export default router;
