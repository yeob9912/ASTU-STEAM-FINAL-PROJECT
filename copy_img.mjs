import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = 'C:\\Users\\CLB\\.gemini\\antigravity\\brain\\2e9f49ab-1d71-4b1d-a7c1-64076367e71c\\media__1783841523502.png';
const dst = path.join(__dirname, 'frontend', 'public', 'astu_gate.png');

fs.copyFileSync(src, dst);
console.log('Image copied to:', dst);
