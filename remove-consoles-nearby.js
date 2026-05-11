const fs = require('fs');
const filePath = 'c:\\Nextjs\\easyrasta-project\\easy-rasta\\app\\api\\rider\\routes\\nearby\\route.js';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/^[ \t]*console\.(log|error|warn|info)\(.*?\);\r?\n/gm, '');
content = content.replace(/^[ \t]*console\.(log|error|warn|info)\(.*?$\r?\n/gm, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed console messages from nearby/route.js');
