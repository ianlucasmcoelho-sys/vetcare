import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.join(__dirname, 'frontend/src/pages');
const COMP_DIR = path.join(__dirname, 'frontend/src/components');

const replacements = [
  { regex: /background(?:-color)?:\s*(?:#ffffff|#fff|white)/gi, val: 'background-color: var(--bg-card)' },
  { regex: /background(?:-color)?:\s*#f8fafc/gi, val: 'background-color: var(--bg-primary)' },
  { regex: /background(?:-color)?:\s*(?:#f1f5f9|#fafcff)/gi, val: 'background-color: var(--bg-hover)' },
  { regex: /color:\s*(?:#1e293b|#1a2a3a|#0f172a)/gi, val: 'color: var(--text-primary)' },
  { regex: /color:\s*(?:#475569|#64748b|#94a3b8)/gi, val: 'color: var(--text-secondary)' },
  { regex: /border(?:-color)?:\s*(?:#e2e8f0|#eef2f6|#f1f5f9|#cbd5e1)/gi, val: 'border-color: var(--border-color)' },
  { regex: /linear-gradient\(to bottom, #fafcff, #ffffff\)/gi, val: 'var(--bg-card)' },
  { regex: /linear-gradient\(135deg, #f8fafc, #ffffff\)/gi, val: 'var(--bg-card)' }
];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const r of replacements) {
        if (r.regex.test(content)) {
          content = content.replace(r.regex, r.val);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Fixed: ${file}`);
      }
    }
  }
}

console.log('🚀 Iniciando correção de Dark Mode...');
processDir(PAGES_DIR);
processDir(COMP_DIR);
processDir(path.join(__dirname, 'frontend/src'));
console.log('✨ Correção concluída!');
