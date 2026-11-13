import test from 'node:test';
import assert from 'node:assert/strict';
import {StorageService,DRAFT_KEY} from '../src/services/storage-service.js';
import {LabStorageService,LAB_DRAFT_KEY} from '../src/services/lab-storage-service.js';
import {OrderSession} from '../src/tutorial/order-model.js';
const savedAt='2026-11-14T00:00:00.000Z';
const draft=()=>({schema:1,mode:'stored',items:[{id:'espresso',name:'에스프레소',price:3500,quantity:2}],cachedTotal:7000,savedAt});
class MemoryStorage {
  data=new Map();
  getItem(key){return this.data.get(key)??null;}
  setItem(key,value){this.data.set(key,String(value));}
  removeItem(key){this.data.delete(key);}
}

test('lab and practice drafts have distinct app-owned keys and ignore prior tutorial learner data',async()=>{
  const memory=new MemoryStorage();memory.setItem('rename-field-tutorial:lab-draft:v1','previous learner data');memory.setItem('rename-field-tutorial:practice-draft:v1','previous practice');
  const lab=new LabStorageService({storage:memory}),practice=new StorageService({storage:memory});
  assert.equal(LAB_DRAFT_KEY,'derived-query-tutorial:lab-draft:v1');assert.notEqual(LAB_DRAFT_KEY,DRAFT_KEY);
  assert.equal(await lab.loadDraft(),null);assert.equal(await practice.loadDraft(),null);
  await lab.saveDraft(draft());await practice.saveDraft({schema:1,answers:{},note:'내 브라우저 메모',savedAt});
  assert.deepEqual(await lab.loadDraft(),draft());assert.equal((await practice.loadDraft()).note,'내 브라우저 메모');
  await lab.clearDraft();assert.equal(await lab.loadDraft(),null);assert.equal((await practice.loadDraft()).note,'내 브라우저 메모');
  assert.equal(memory.getItem('rename-field-tutorial:lab-draft:v1'),'previous learner data');assert.equal(memory.getItem('rename-field-tutorial:practice-draft:v1'),'previous practice');
});

test('lab storage preserves a pure-query snapshot and rejects foreign shapes without erasing them',async()=>{
  const memory=new MemoryStorage(),service=new LabStorageService({storage:memory});
  const query={...draft(),mode:'query'};delete query.cachedTotal;
  await service.saveDraft(query);const restored=await service.loadDraft();assert.deepEqual(restored,query);assert.equal(Object.hasOwn(restored,'cachedTotal'),false);
  restored.items[0].quantity=99;assert.deepEqual(await service.loadDraft(),query);
  const foreign=JSON.stringify({schema:1,newName:'name',producer:true,receipt:true,report:true});memory.setItem(LAB_DRAFT_KEY,foreign);
  await assert.rejects(service.loadDraft());assert.equal(memory.getItem(LAB_DRAFT_KEY),foreign);assert.ok(service.lastError);
});

test('an embedding caller can override the lab key and validator without losing queue behavior',async()=>{
  const memory=new MemoryStorage();const validate=value=>{if(value?.answer!==42)throw new TypeError('expected 42');return {answer:value.answer};};
  const service=new LabStorageService({storage:memory,key:'embedded-lab',validate});
  await service.saveDraft({answer:42});assert.equal(memory.data.has(LAB_DRAFT_KEY),false);assert.deepEqual(await service.loadDraft(),{answer:42});
  await assert.rejects(service.saveDraft({answer:43}),/expected 42/);assert.deepEqual(await service.loadDraft(),{answer:42});
});

test('forwarded optional overrides keep the lab defaults when no key or validator was supplied',async()=>{
  for(const absent of [undefined,null]){
    const memory=new MemoryStorage(),service=new LabStorageService({storage:memory,key:absent,validate:absent});
    await service.saveDraft(draft());assert.equal(memory.data.has(LAB_DRAFT_KEY),true);assert.equal(memory.data.has(DRAFT_KEY),false);assert.deepEqual(await service.loadDraft(),draft());
  }
});

test('saving a captured lab revision leaves edits made during the pending write dirty',async()=>{
  const memory=new MemoryStorage();let finish;const gate=new Promise(resolve=>{finish=resolve;});const write=memory.setItem.bind(memory);memory.setItem=(key,value)=>gate.then(()=>write(key,value));
  const service=new LabStorageService({storage:memory}),session=new OrderSession();
  const item=session.snapshot().items[0];session.updateItem(item.id,{quantity:item.quantity+1});
  const captured=session.snapshot();const saving=service.saveDraft({...captured,savedAt});assert.equal(service.saving,true);
  session.updateItem(item.id,{quantity:item.quantity+2});finish();await saving;session.markSaved(captured,savedAt);
  assert.equal(service.saving,false);assert.equal(session.dirty,true);assert.equal((await service.loadDraft()).items[0].quantity,item.quantity+1);assert.equal(session.snapshot().items[0].quantity,item.quantity+2);
  session.discardChanges();assert.equal(session.snapshot().items[0].quantity,item.quantity+1);assert.equal(session.dirty,false);
});
