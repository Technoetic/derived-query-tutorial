import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {createStaticServer,bind,listen,portInUse,PREFIX,DEFAULT_PORT} from '../scripts/server.mjs';

async function fixture(t){
  const root=await mkdtemp(path.join(tmpdir(),'derived-query-server-'));
  await mkdir(path.join(root,'assets'));await mkdir(path.join(root,'data'));
  await Promise.all([
    writeFile(path.join(root,'index.html'),'<html lang="ko">QUERY / CAFE</html>'),
    writeFile(path.join(root,'version.json'),'{"schema":1,"buildId":"dq-fixture"}'),
    writeFile(path.join(root,'assets','main.dq-fixture.js'),'export const loadedBuild="dq-fixture";'),
    writeFile(path.join(root,'data','tutorial.json'),'{"revision":1}')
  ]);
  const server=createStaticServer({root});await bind(server,0);
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});});
  return {server,origin,url:origin+PREFIX};
}

test('the project prefix serves a real entry and does not hide unknown assets, APIs or paths',async t=>{
  assert.equal(PREFIX,'/derived-query-tutorial/');assert.equal(DEFAULT_PORT,8896);
  const {origin,url}=await fixture(t);
  const root=await fetch(origin+'/',{redirect:'manual'});assert.equal(root.status,302);assert.equal(root.headers.get('location'),PREFIX);
  const page=await fetch(url+'#/proof');assert.equal(page.status,200);assert.match(await page.text(),/QUERY \/ CAFE/);
  for(const suffix of ['assets/missing.js','assets/missing.css','assets/missing.svg','api/orders','story']){
    const response=await fetch(url+suffix);assert.equal(response.status,404,suffix);assert.match(response.headers.get('content-type'),/^text\/plain/);assert.equal(await response.text(),'Not found');
  }
  assert.equal((await fetch(origin+'/another-app/')).status,404);
});

test('entry, version and data remain fresh while build assets are immutable and revalidate by ETag',async t=>{
  const {url}=await fixture(t);
  for(const suffix of ['','version.json','data/tutorial.json']){
    const response=await fetch(url+suffix);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  const asset=await fetch(url+'assets/main.dq-fixture.js');assert.equal(asset.status,200);assert.match(asset.headers.get('cache-control'),/immutable/);assert.match(asset.headers.get('content-type'),/^text\/javascript/);
  const unchanged=await fetch(url+'assets/main.dq-fixture.js',{headers:{'If-None-Match':asset.headers.get('etag')}});assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');
  const head=await fetch(url+'assets/main.dq-fixture.js',{method:'HEAD'});assert.equal(head.status,200);assert.ok(Number(head.headers.get('content-length'))>0);assert.equal(await head.text(),'');
  const post=await fetch(url,{method:'POST'});assert.equal(post.status,405);assert.equal(post.headers.get('allow'),'GET, HEAD');
});

test('the port probe prevents binding over an already listening application',async t=>{
  const occupied=createServer();await bind(occupied,0);
  const port=occupied.address().port;t.after(()=>new Promise(resolve=>occupied.close(resolve)));
  assert.equal(await portInUse(port),true);
  const candidate=createStaticServer();await assert.rejects(listen(candidate,port),/already in use/);assert.equal(candidate.listening,false);
});
