const fs = require('fs');
const filePath = 'c:\\Nextjs\\easyrasta-project\\easy-rasta\\app\\api\\rider\\routes\\pumps\\route.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace console.log and console.error that are on their own lines (prefixed by whitespace)
// and end with a newline.
content = content.replace(/^[ \t]*console\.(log|error|warn|info)\(.*?\);\r?\n/gm, '');
// Also replace those that don't have a trailing semicolon
content = content.replace(/^[ \t]*console\.(log|error|warn|info)\(.*?$\r?\n/gm, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed console messages from route.js');
