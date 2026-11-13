import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const APP=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function walk(root){const files=[];for(const item of await readdir(root,{withFileTypes:true})){const full=path.join(root,item.name);if(item.isDirectory())files.push(...await walk(full));else files.push(full);}return files;}

async function fixture(t){
  const root=await mkdtemp(path.join(tmpdir(),'derived-query-build-'));
  await Promise.all(['src','scripts','assets','data','index.html','package.json'].map(name=>cp(path.join(APP,name),path.join(root,name),{recursive:true})));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const {build}=await import(pathToFileURL(path.join(root,'scripts/build.mjs')).href);
  return {root,build};
}

test('a build embeds the loaded identity and emits a complete matching module and style graph',async t=>{
  const {build}=await fixture(t);const report=await build({outDir:'dist-a'});assert.match(report.buildId,/^dq-[a-f\d]{12}$/);
  const html=await readFile(path.join(report.out,'index.html'),'utf8');assert.match(html,new RegExp('name="app-build" content="'+report.buildId+'"'));
  assert.ok(!/__[A-Z_]+__/.test(html));assert.ok(html.includes('./assets/main.'+report.buildId+'.js'));assert.ok(html.includes('./assets/app.'+report.buildId+'.css'));assert.ok(html.includes('./assets/dq-mark.'+report.buildId+'.svg'));
  const version=JSON.parse(await readFile(path.join(report.out,'version.json'),'utf8'));assert.equal(version.buildId,report.buildId);
  const modules=(await walk(path.join(report.out,'assets'))).filter(file=>file.endsWith('.js'));assert.equal(modules.length,report.modules);
  for(const file of modules){
    assert.ok(file.endsWith('.'+report.buildId+'.js'));
    const source=await readFile(file,'utf8');
    for(const match of source.matchAll(/\b(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
      assert.ok(match[1].endsWith('.'+report.buildId+'.js'),match[1]);await readFile(path.resolve(path.dirname(file),match[1]));
    }
  }
  const css=await readFile(path.join(report.out,'assets','app.'+report.buildId+'.css'),'utf8');assert.ok(css.length>100);
});

test('fresh lesson data changes independently while changed executable source creates a new graph identity',async t=>{
  const {root,build}=await fixture(t);const first=await build({outDir:'dist-a'});
  const dataPath=path.join(root,'data','tutorial.json');const tutorial=JSON.parse(await readFile(dataPath,'utf8'));tutorial.meta.appTitle+=' · 자료 개정';await writeFile(dataPath,JSON.stringify(tutorial));
  const dataOnly=await build({outDir:'dist-data'});assert.equal(dataOnly.buildId,first.buildId);
  assert.equal(JSON.parse(await readFile(path.join(dataOnly.out,'data','tutorial.json'),'utf8')).meta.appTitle,tutorial.meta.appTitle);
  const entryPath=path.join(root,'src','main.js');await writeFile(entryPath,(await readFile(entryPath,'utf8'))+'\n// Independent build identity verification.\n');
  const changed=await build({outDir:'dist-b'});assert.notEqual(changed.buildId,first.buildId);
  const html=await readFile(path.join(changed.out,'index.html'),'utf8');assert.ok(html.includes('main.'+changed.buildId+'.js'));assert.ok(!html.includes('main.'+first.buildId+'.js'));
});
