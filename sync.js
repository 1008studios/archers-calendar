const fs = require('fs');
const preview = fs.readFileSync('components/PreviewCanvas.tsx', 'utf-8');

// Escaping for template string
const escaped = preview
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

const script = `const fs = require('fs');
const content = \`
${escaped}
\`;
fs.writeFileSync('components/PreviewCanvas.tsx', content);
console.log('PreviewCanvas created successfully');
`;

fs.writeFileSync('generate_canvas.js', script);
console.log('generate_canvas.js synchronized from components/PreviewCanvas.tsx');
