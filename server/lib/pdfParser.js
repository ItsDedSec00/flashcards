import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

export async function extractText(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}
