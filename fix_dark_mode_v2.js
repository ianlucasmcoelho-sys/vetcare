import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const replacements = [
  // Backgrounds
  { regex: /background(?:-color)?:\s*(?:#ffffff|#fff|white|#fafcff)/gi, val: 'background-color: var(--bg-card)' },
  { regex: /background(?:-color)?:\s*(?:#f8fafc|#f5f7fa)/gi, val: 'background-color: var(--bg-primary)' },
  { regex: /background(?:-color)?:\s*(?:#f1f5f9|#fafcff|#fafbff)/gi, val: 'background-color: var(--bg-hover)' },
  
  // Text
  { regex: /color:\s*(?:#1e293b|#1a2a3a|#0f172a|#1e2c3a)/gi, val: 'color: var(--text-primary)' },
  { regex: /color:\s*(?:#475569|#64748b|#94a3b8)/gi, val: 'color: var(--text-secondary)' },
  
  // Borders
  { regex: /border(?:-color)?:\s*(?:#e2e8f0|#eef2f6|#f1f5f9|#cbd5e1)/gi, val: 'border-color: var(--border-color)' },
  
  // Gradients common in cards
  { regex: /background:\s*linear-gradient\(.*?(?:#fafcff|#ffffff|#f8fafc).*?\)/gi, val: 'background-color: var(--bg-card)' }
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
      // Fix broken variables like var(--bg-card)beb
      if (/var\(--bg-card\)beb/g.test(content)) {
        content = content.replace(/var\(--bg-card\)beb/g, 'var(--bg-hover)');
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Refined: ${file}`);
      }
    }
  }
}

console.log('🚀 Iniciando refino profundo de Dark Mode...');
processDir(path.join(__dirname, 'frontend/src'));
console.log('✨ Refino concluído!');
