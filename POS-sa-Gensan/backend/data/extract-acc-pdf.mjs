import fs from 'fs';
import { PDFParse } from 'pdf-parse';

const pdfPath = new URL('./PH-ACC-Price1.pdf', import.meta.url);
const buf = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data: buf });

const textResult = await parser.getText();
fs.writeFileSync(new URL('./PH-ACC-Price1.txt', import.meta.url), textResult.text);
console.log('pages', textResult.total, 'chars', textResult.text.length);
console.log('--- first 12000 chars ---');
console.log(textResult.text.slice(0, 12000));

try {
  const tableResult = await parser.getTable();
  fs.writeFileSync(
    new URL('./PH-ACC-Price1-tables.json', import.meta.url),
    JSON.stringify(tableResult, null, 2)
  );
  console.log('tables saved, count:', tableResult?.pages?.length ?? 0);
} catch (e) {
  console.log('getTable failed:', e.message);
}

await parser.destroy();
