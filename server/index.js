import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRouter from './routes/upload.js';
import generateRouter from './routes/generate.js';
import decksRouter from './routes/decks.js';
import driveRouter from './routes/drive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

app.use('/api/upload', uploadRouter);
app.use('/api/generate', generateRouter);
app.use('/api/decks', decksRouter);
app.use('/api/drive', driveRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
