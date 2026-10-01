'use strict';
if(Number(process.versions.node.split('.')[0])<22){console.error('Night Atlas needs Node.js 22 or newer. Install the LTS version from https://nodejs.org/');process.exit(1);}
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
try { process.loadEnvFile(path.join(__dirname,'.env')); }
catch (error) { if(error.code!=='ENOENT'){ console.error('Could not read .env. Check the file format.'); process.exit(1); } }
const {POST}=require('./chat.cjs');
const assets={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/app.css':['app.css','text/css; charset=utf-8'],'/favicon.svg':['favicon.svg','image/svg+xml']};
let port=4786;
function fail(res,status,message){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));}
const server=http.createServer(async(req,res)=>{
 const host=req.headers.host;
 if(host!==`127.0.0.1:${port}`&&host!==`localhost:${port}`){fail(res,403,'Open Night Atlas using the address shown in the launcher.');return;}
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
 const url=new URL(req.url,`http://${host}`);
 if(req.method==='POST'&&url.pathname==='/api/chat'){
  if(req.headers.origin!==url.origin){fail(res,403,'Please send questions from your local Night Atlas page.');return;}
  if(!String(req.headers['content-type']).startsWith('application/json')){fail(res,415,'A JSON request is required.');return;}
  try{
   const chunks=[];let bytes=0;
   for await(const chunk of req){bytes+=chunk.length;if(bytes>24000){fail(res,413,'That message is too long.');req.resume();return;}chunks.push(chunk);}
   const result=await POST(new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:url.origin},body:Buffer.concat(chunks).toString('utf8')}));
   res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await result.text());
  }catch{if(!res.headersSent)fail(res,500,'The request could not be completed. Please try again.');else res.end();}
  return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){fail(res,405,'Method not allowed.');return;}
 const asset=assets[url.pathname];
 if(!asset){fail(res,404,'Page not found.');return;}
 try{const data=fs.readFileSync(path.join(__dirname,'public',asset[0]));res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}
 catch{fail(res,500,'A required file is missing. Extract the entire ZIP folder and try again.');}
});
server.requestTimeout=60000;
server.on('error',error=>{if(error.code==='EADDRINUSE'&&port<4796){port++;server.listen(port,'127.0.0.1');}else{console.error('Could not start Night Atlas:',error.message);process.exitCode=1;}});
server.on('listening',()=>{
 const url=`http://127.0.0.1:${port}`;
 console.log('\nNIGHT ATLAS - PC EDITION\n\nOpen '+url+' in your browser.\nKeep this window open while using the app. Press Ctrl+C to stop.\n\nSky calculations work offline. Gemma uses the API key in your backend .env file.\n');
 if(!process.env.GEMMA_API_KEY || process.env.GEMMA_API_KEY.trim()==='YOUR_GEMMA_API_KEY_HERE') console.log('Gemma setup: run Setup-Gemma.bat, save your key, then restart Night Atlas.\n');
 if(process.argv.includes('--open')){
  const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
  const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
  execFile(command,args,()=>{});
 }
});
server.listen(port,'127.0.0.1');
