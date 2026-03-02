import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractText } from '../lib/pdfParser.js';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

await fs.mkdir(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

const router = Router();

router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    const text = await extractText(req.file.path);
    await fs.unlink(req.file.path);
    res.json({
      filename: req.file.originalname,
      textLength: text.length,
      text
    });
  } catch (err) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch', upload.array('pdfs', 20), async (req, res) => {
  try {
    const results = await Promise.all(
      req.files.map(async (file) => {
        const text = await extractText(file.path);
        await fs.unlink(file.path);
        return { filename: file.originalname, text };
      })
    );
    const combined = results.map(r => `--- ${r.filename} ---\n${r.text}`).join('\n\n');
    res.json({
      files: results.map(r => r.filename),
      textLength: combined.length,
      text: combined
    });
  } catch (err) {
    if (req.files) {
      await Promise.all(req.files.map(f => fs.unlink(f.path).catch(() => {})));
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
