import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {validateTutorial,validatePractice,validateCode,validateBundle} from '../src/tutorial/content-model.js';

const load=async name=>JSON.parse(await readFile(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
const [tutorial,practice,code]=await Promise.all(['tutorial','practice','code'].map(load));
const clone=value=>structuredClone(value);

test('the complete public content bundle supports every screen and six answerable exercises',()=>{
  const bundle=validateBundle({tutorial,practice,code});
  assert.deepEqual(bundle.tutorial.routes.map(route=>route.path),['/','/story','/lab','/proof','/practice','/code','/summary']);
  assert.equal(bundle.practice.items.length,6);assert.equal(bundle.practice.draft.noteMaxLength,1000);
  for(const item of bundle.practice.items)assert.equal(item.choices.filter(choice=>choice.id===item.answer).length,1);
  assert.equal(bundle.code.output,11000);bundle.practice.items[0].title='changed';assert.notEqual(practice.items[0].title,'changed');
});

test('tutorial data rejects missing screens, duplicate routes, unsafe sources and malformed text',()=>{
  for(const mutate of [value=>{delete value.screens.lab;},value=>{value.routes[1].path='/';},value=>{value.summary.sources[0].url='javascript:alert(1)';},value=>{value.story.steps[0].body=3;}]){
    const invalid=clone(tutorial);mutate(invalid);assert.throws(()=>validateTutorial(invalid));
  }
});

test('practice data rejects duplicate or unsafe IDs, invalid answers and unsupported note limits',()=>{
  for(const mutate of [value=>{value.items[0].id='__proto__';},value=>{value.items[1].id=value.items[0].id;},value=>{value.items[0].answer='absent';},value=>{value.items[0].choices[1].id=value.items[0].choices[0].id;},value=>{value.draft.noteMaxLength=1001;}]){
    const invalid=clone(practice);mutate(invalid);assert.throws(()=>validatePractice(invalid));
  }
});

test('code content rejects non-line arrays and nonfinite outputs without executing any code',()=>{
  assert.doesNotThrow(()=>validateCode(code));
  for(const invalid of [{...code,before:'class Order {}'},{...code,after:[null]},{...code,output:Infinity}])assert.throws(()=>validateCode(invalid));
});

test('the trusted static before and after examples actually produce the advertised result',()=>{
  for(const lines of [code.before,code.after]){
    const logged=[];
    runInNewContext(lines.join('\n'),{console:{log:value=>logged.push(value)}},{timeout:100});
    assert.deepEqual(logged,[11000]);
  }
});
