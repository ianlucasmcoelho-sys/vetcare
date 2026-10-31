const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.resolve(root, '../management/public');
fs.mkdirSync(path.join(root, 'ui'), { recursive: true });
for (const filename of ['index.html', 'app.js', 'styles.css']) {
  let content = fs.readFileSync(path.join(source, filename), 'utf8');
  if (filename === 'index.html') content = content.replace('href="/styles.css"', 'href="./styles.css"').replace('src="/app.js"', 'src="./app.js"').replaceAll('href="/"', 'href="app://vetcare/index.html"');
  fs.writeFileSync(path.join(root, 'ui', filename), content);
}
console.log('Interface desktop preparada a partir do painel VetCare.');
