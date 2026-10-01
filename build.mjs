import { build } from 'esbuild';
await build({entryPoints:['src/main.tsx'],bundle:true,minify:true,platform:'browser',format:'iife',jsx:'automatic',target:['es2022'],define:{'process.env.NODE_ENV':'"production"'},outfile:'public/app.js',legalComments:'linked'});
await build({entryPoints:['src/chat.ts'],bundle:true,platform:'node',format:'cjs',target:['node22'],outfile:'chat.cjs',legalComments:'linked'});
console.log('Night Atlas rebuilt. Run npm start.');
