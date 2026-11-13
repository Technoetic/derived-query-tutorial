import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PracticeSession,validateDraft} from '../src/tutorial/practice-model.js';
const config=JSON.parse(await readFile(new URL('../data/practice.json',import.meta.url),'utf8'));
const savedAt='2026-11-14T00:00:00.000Z';

test('six exercise answers are graded independently and unknown IDs cannot enter a draft',()=>{
  const session=new PracticeSession(config);assert.deepEqual(session.summary(),{correct:0,wrong:0,unanswered:6,total:6});
  session.select(config.items[0].id,config.items[0].answer);const wrong=config.items[1].choices.find(choice=>choice.id!==config.items[1].answer).id;session.select(config.items[1].id,wrong);
  assert.deepEqual(session.summary(),{correct:1,wrong:1,unanswered:4,total:6});assert.throws(()=>session.select('unknown','a'));assert.throws(()=>session.select(config.items[0].id,'unknown'));
});

test('a delayed save records its captured answers and leaves later notes dirty',()=>{
  const session=new PracticeSession(config);session.select(config.items[0].id,config.items[0].answer);const pending=session.snapshot();
  session.setNote('원본에서 현재 합계를 구한다.');session.markSaved(pending,savedAt);assert.equal(session.dirty,true);session.discardChanges();assert.deepEqual(session.snapshot(),pending);assert.equal(session.dirty,false);
  session.reset();assert.equal(session.summary().unanswered,6);assert.equal(session.dirty,true);
});

test('notes remain text, are bounded and snapshots cannot mutate a session',()=>{
  const session=new PracticeSession(config);session.setNote('<img src=x onerror=alert(1)>');assert.equal(session.snapshot().note,'<img src=x onerror=alert(1)>');
  assert.throws(()=>session.setNote('x'.repeat(1001)));const snapshot=session.snapshot();snapshot.answers[config.items[0].id]=config.items[0].answer;assert.equal(session.summary().correct,0);
  assert.throws(()=>validateDraft({schema:1,answers:{unknown:'choice'},note:''},config));assert.throws(()=>validateDraft(JSON.parse('{"schema":1,"answers":{"__proto__":"yes"},"note":""}'),config));
});
