// Teste simples de Clean URLs
// Verifica se vercel.json possui cleanUrls ativado e se os links internos não usam .html
// Execução: `node tests/clean-urls.test.js`

const fs = require('fs');
const path = require('path');

function fail(msg){
  console.error(`✖ ${msg}`);
  process.exitCode = 1;
}

function pass(msg){
  console.log(`✔ ${msg}`);
}

// 1) vercel.json: cleanUrls true
try{
  const vercelPath = path.join(__dirname, '..', 'vercel.json');
  const json = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  if(json.cleanUrls === true){
    pass('vercel.json: cleanUrls ativado');
  } else {
    fail('vercel.json: cleanUrls NÃO está ativado');
  }
}catch(err){
  fail(`Falha ao ler vercel.json: ${err.message}`);
}

// 2) Links internos sem .html (index.html e lumy-cajamar.html)
const files = ['index.html', 'lumy-cajamar.html'];
const isExternal = (href)=> /^(https?:|mailto:|tel:|#|\/?\?)/.test(href);

files.forEach((file)=>{
  try{
    const p = path.join(__dirname, '..', file);
    const html = fs.readFileSync(p, 'utf8');
    const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let match;
    while((match = anchorRegex.exec(html))){
      const href = match[1];
      if(!isExternal(href)){
        if(/\.html($|[?#])/.test(href)){
          fail(`${file}: link interno usa extensão .html (${href})`);
        }
      }
    }
    pass(`${file}: links internos sem .html`);
  }catch(err){
    fail(`Falha ao ler ${file}: ${err.message}`);
  }
});

// 3) canonical sem .html em lumy-cajamar.html
try{
  const p = path.join(__dirname, '..', 'lumy-cajamar.html');
  const html = fs.readFileSync(p, 'utf8');
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i);
  if(canonicalMatch){
    const href = canonicalMatch[1];
    if(/\.html($|[?#])/.test(href)){
      fail(`Canonical usa .html: ${href}`);
    } else {
      pass('Canonical sem .html em lumy-cajamar.html');
    }
  } else {
    fail('Canonical não encontrado em lumy-cajamar.html');
  }
}catch(err){
  fail(`Falha ao verificar canonical: ${err.message}`);
}

process.on('exit', (code)=>{
  if(code === 0){
    console.log('✅ Testes de Clean URLs concluídos com sucesso');
  } else {
    console.error('❌ Falhas nos testes de Clean URLs');
  }
});