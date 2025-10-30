const fs = require('fs');
const filePath = './api/data.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar todos los await sql`...` simples (sin variables)
content = content.replace(/await sql`([^`$]+)`/g, (match, query) => {
  return `await sql.query('${query.replace(/'/g, "\\'")}')`;
});

// Reemplazar BEGIN, COMMIT, ROLLBACK
content = content.replace(/await sql\.query\('BEGIN'\)/g, "await sql.query('BEGIN')");
content = content.replace(/await sql\.query\('COMMIT'\)/g, "await sql.query('COMMIT')");
content = content.replace(/await sql\.query\('ROLLBACK'\)/g, "await sql.query('ROLLBACK')");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Reemplazos completados');
