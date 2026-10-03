// Run against an isolated running demo server: BOARD_URL=http://127.0.0.1:8880 node --test tests/board-contract.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.BOARD_URL;
test('six bounded images with matching signatures and no remote sources', async () => {
 const paths = await fs.readdir('src/web/assets'); assert.equal(paths.length, 6);
 for (const path of paths) { const bytes = await fs.readFile(`src/web/assets/${path}`); assert.ok(bytes.length <= 220*1024); const a=JSON.parse(bytes); assert.ok(['image/png','image/jpeg'].includes(a.mime)); assert.equal(Buffer.from(a.data,'base64').subarray(0,a.mime==='image/png'?8:3).toString('hex'),a.mime==='image/png'?'89504e470d0a1a0a':'ffd8ff'); }
 const html = await fs.readFile('src/web/index.html','utf8'); assert.doesNotMatch(html, /(?:src|href)=["']https?:/); assert.doesNotMatch(html, /innerHTML/);
});
test('actual server notes, raw images and error contracts', {skip:!base}, async () => {
 assert.equal((await fetch(base+'/')).status,200);
 assert.equal((await fetch(base+'/.env')).status,404);
 assert.equal((await fetch(base+'/package.json')).status,404);
 assert.equal((await fetch(base+'/health')).status,200);
 for (const text of ['', 'x'.repeat(501)]) assert.equal((await fetch(base+'/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})).status,400);
 const text=`board-contract ${Date.now()} <img onerror=alert(1)>`;
 const note=await (await fetch(base+'/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})).json();
 assert.ok((await (await fetch(base+'/api/notes')).json()).some(n=>n.id===note.id && n.text===text));
 const a=JSON.parse(await fs.readFile('src/web/assets/flow.json')); const bytes=Buffer.from(a.data,'base64');
 const response=await fetch(base+'/api/images',{method:'POST',headers:{'Content-Type':a.mime},body:bytes}); assert.equal(response.status,201); const saved=await response.json();
 assert.deepEqual(Buffer.from(await (await fetch(base+saved.url)).arrayBuffer()),bytes);
 assert.equal((await fetch(base+'/api/images/00000000-0000-0000-0000-000000000000.png')).status,404);
 assert.equal((await fetch(base+'/api/images',{method:'POST',headers:{'Content-Type':'text/plain'},body:'bad'})).status,415);
 assert.equal((await fetch(base+'/api/images',{method:'POST',headers:{'Content-Type':'image/png'},body:Buffer.alloc(5*1024*1024+1)})).status,413);
});
