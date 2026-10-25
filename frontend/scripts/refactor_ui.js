const fs = require('fs');
const path = require('path');

const srcDir = path.join('c:', 'Users', 'mateusestudos', 'Desktop', 'SistemaOuroPet', 'frontend', 'src', 'pages');

const files = fs.readdirSync(srcDir);

files.forEach(file => {
  if (file.endsWith('.jsx')) {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove huge wrapper classes and ensure the container has no v-glass-panel
    // e.g., <div className="animais-card v-glass-panel... -> <div className="animais-card">
    // and move v-glass-panel to filters-section
    const cardRegex = /className="([^"]*(?:card|main|container)[^"]*)\bv-glass-panel\b([^"]*)"/g;
    
    // We only want to remove v-glass-panel from the *main* big wrappers.
    // Let's do it manually for known big wrappers
    const wrappers = [
      'animais-card',
      'responsaveis-card',
      'agenda-card-main',
      'financeiro-card-main',
      'estoque-card',
      'internacao-card-main',
      'receituario-card',
      'relatorios-card',
      'vacinas-card'
    ];

    wrappers.forEach(w => {
      // Find the div with this class and v-glass-panel
      const regex = new RegExp(`className="(${w})\\s+v-glass-panel([^"]*)"`, 'g');
      content = content.replace(regex, 'className="$1$2"');
    });

    // Make filters-section or search-bar a v-glass-panel
    content = content.replace(/className="filters-section"/g, 'className="filters-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}');
    content = content.replace(/className="search-section"/g, 'className="search-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}');
    content = content.replace(/className="agenda-toolbar"/g, 'className="agenda-toolbar v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}');
    
    fs.writeFileSync(filePath, content);
  }

  if (file.endsWith('.css') && file !== 'Dashboard.css') {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add standard padding to container
    const containerClassMatch = content.match(/\.([a-z-]+-container)\s*\{/);
    if (containerClassMatch) {
      const containerClass = containerClassMatch[1];
      const regex = new RegExp(`\\.(${containerClass})\\s*\\{([^}]*)\\}`, 's');
      content = content.replace(regex, (match, p1, p2) => {
        let newContent = p2;
        newContent = newContent.replace(/padding:\s*[^;]+;/g, '');
        newContent = newContent.replace(/background:\s*[^;]+;/g, '');
        newContent = `\n  padding: 2rem 3rem;\n  background: transparent;\n  font-family: 'Plus Jakarta Sans', sans-serif;\n  min-height: 100vh;\n` + newContent;
        return `.${p1} {${newContent}}`;
      });
    }

    // Fix backgrounds of main wrappers
    const wrappers = [
      'animais-card',
      'responsaveis-card',
      'agenda-card-main',
      'financeiro-card-main',
      'estoque-card',
      'internacao-card-main',
      'receituario-card',
      'relatorios-card',
      'vacinas-card'
    ];
    
    wrappers.forEach(w => {
      const regex = new RegExp(`\\.(${w})\\s*\\{([^}]*)\\}`, 'sg');
      content = content.replace(regex, (match, p1, p2) => {
        let newContent = p2;
        newContent = newContent.replace(/background:\s*[^;]+;/g, 'background: transparent;');
        newContent = newContent.replace(/border:\s*[^;]+;/g, 'border: none;');
        newContent = newContent.replace(/box-shadow:\s*[^;]+;/g, 'box-shadow: none;');
        return `.${p1} {${newContent}}`;
      });
    });

    // Fix filters-section backgrounds
    const filters = ['filters-section', 'search-section', 'agenda-toolbar'];
    filters.forEach(f => {
      const regex = new RegExp(`\\.(${f})\\s*\\{([^}]*)\\}`, 'sg');
      content = content.replace(regex, (match, p1, p2) => {
        let newContent = p2;
        newContent = newContent.replace(/background:\s*[^;]+;/g, 'background: transparent;');
        newContent = newContent.replace(/margin-bottom:\s*[^;]+;/g, 'margin-bottom: 24px;');
        return `.${p1} {${newContent}}`;
      });
    });

    // Replace all font-families to Plus Jakarta Sans for consistency
    content = content.replace(/font-family:\s*[^;]+;/g, "font-family: 'Plus Jakarta Sans', sans-serif;");

    fs.writeFileSync(filePath, content);
  }
});

console.log("Refactoring complete");
