// GĐ558: đo KB thô từng module trong một chunk (cần build --sourcemap). Chạy: npx vite build --outDir <tmp> --sourcemap; node scripts/module-sizes.cjs <tmp>/assets/index-*.js
const fs=require('fs'),path=require('path');const {SourceMapConsumer}=require(path.resolve('node_modules/source-map-js'));
const f=process.argv[2];const code=fs.readFileSync(f,'utf8').split('\n');const m=new SourceMapConsumer(JSON.parse(fs.readFileSync(f+'.map','utf8')));
const by={};let last=null,lastL=0,lastC=0;
m.eachMapping(e=>{if(last!==null){ if(e.generatedLine===lastL) by[last]=(by[last]||0)+(e.generatedColumn-lastC); }
 last=e.source||'?';lastL=e.generatedLine;lastC=e.generatedColumn;});
const tot=Object.values(by).reduce((a,b)=>a+b,0);
Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>console.log((v/1024).toFixed(1).padStart(7),'KB',(100*v/tot).toFixed(1)+'%',k.replace(/.*src\//,'src/')));
console.log('total',(tot/1024).toFixed(0),'KB raw');
