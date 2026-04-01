const mjml2html = require('mjml');
const fs = require('fs');
const path = require('path');

const srcTemplateDir = path.join(__dirname, '../src/templates');
const distTemplateDir = path.join(__dirname, '../dist/templates');

if (!fs.existsSync(distTemplateDir)) {
  fs.mkdirSync(distTemplateDir, { recursive: true });
}

fs.readdirSync(srcTemplateDir).forEach(file => {
  if (file.endsWith('.mjml')) {
    const mjmlPath = path.join(srcTemplateDir, file);
    const mjmlContent = fs.readFileSync(mjmlPath, 'utf8');
    
    const { html, errors } = mjml2html(mjmlContent, {
      validationLevel: 'soft',
    });

    const outputName = file.replace('.mjml', '.ejs');
    const outputPath = path.join(distTemplateDir, outputName);

    fs.writeFileSync(outputPath, html);
    
    console.log(`${file} -> dist/templates/${outputName}`);
  }
});