const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const raiz=path.resolve(__dirname,'..');
const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let nome;try{nome=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const arquivo=path.resolve(raiz,'.'+(nome.endsWith('/')?nome+'index.html':nome));
  if(!arquivo.startsWith(raiz+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(arquivo,(erro,dados)=>{if(erro){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':tipos[path.extname(arquivo)]||'application/octet-stream','Cache-Control':'no-store'});res.end(dados);});
}).listen(8766,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8766'));
