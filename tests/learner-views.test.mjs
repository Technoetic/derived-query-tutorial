import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {storyFrames,codeCalculation} from '../src/shared/learner-values.js';

test('story visual values follow the same espresso quantity change described in the lesson',()=>{
  assert.deepEqual(storyFrames(),[
    {source:11500,read:11500,mode:'stored'},
    {source:15000,read:11500,mode:'stored'},
    {source:15000,read:15000,mode:'query'}
  ]);
});
test('the calculation disclosure derives its addends from the adjacent trusted code rather than an unrelated same-sum example',async()=>{
  const code=JSON.parse(await readFile(new URL('../data/code.json',import.meta.url),'utf8'));
  assert.equal(codeCalculation(code.before),'3,500원 + 3,500원 + 4,000원 = 11,000원');
  assert.equal(codeCalculation(['order.add(10);','order.add(20);']),'10원 + 20원 = 30원');
  assert.equal(codeCalculation(['arbitraryProgram();']),null);
});
