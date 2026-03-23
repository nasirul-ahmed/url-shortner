const mjml2html = require('mjml');
const fs = require('fs');
const path = require('path');

const templateDir = path.join(__dirname, '../src/templates');

fs.readdirSync(templateDir).forEach(file => {
  if (file.endsWith('.mjml')) {
    const mjmlContent = fs.readFileSync(path.join(templateDir, file), 'utf8');
    const { html } = mjml2html(mjmlContent);
    
    // Save as .ejs so we can still use EJS variables like <%= name %>
    const outputName = file.replace('.mjml', '.ejs');
    fs.writeFileSync(path.join(templateDir, outputName), html);
    console.log(`✅ Compiled: ${file} -> ${outputName}`);
  }
});