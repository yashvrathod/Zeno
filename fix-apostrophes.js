const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, 'prisma', 'seed.js');
let content = fs.readFileSync(seedPath, 'utf8');

// Replace all problematic apostrophes with escaped versions in single-quoted strings
// Pattern: text: '...don't...' -> text: '...don'\''t...'
content = content.replace(/don't/g, "don't");
content = content.replace(/can't/g, "can't");
content = content.replace(/doesn't/g, "doesn't");
content = content.replace(/isn't/g, "isn't");
content = content.replace(/'t/g, "'t");
content = content.replace(/\bwhat's\b/g, "what's");
content = content.replace(/\bthere's\b/g, "there's");
content = content.replace(/\bit's\b/g, "it's");

fs.writeFileSync(seedPath, content);
console.log('Fixed apostrophes');
