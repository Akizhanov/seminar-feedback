import fs from 'node:fs';
const html=fs.readFileSync('dist/index.html','utf8');
const api=fs.readFileSync('worker/api.js','utf8');
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js','const HTML='+JSON.stringify(html)+';\n'+api);
fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/drizzle',{recursive:true});
