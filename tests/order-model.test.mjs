import test from 'node:test';
import assert from 'node:assert/strict';
import {OrderSession,validateLabDraft,runProofCases} from '../src/tutorial/order-model.js';

const savedAt='2026-11-14T00:00:00.000Z';
const initial=()=>({schema:1,mode:'stored',items:[{id:'espresso',name:'에스프레소',price:3500,quantity:2},{id:'latte',name:'카페 라테',price:4500,quantity:1}],cachedTotal:11500});

test('a source edit exposes stale stored data and must be repaired before refactoring',()=>{
  const order=new OrderSession();
  order.updateItem('espresso',{quantity:3});
  assert.equal(order.total(),11500);assert.equal(order.expectedTotal(),15000);assert.equal(order.matches(),false);
  const stale=order.snapshot();assert.throws(()=>order.refactor(),/맞춘|일치|동기/);assert.deepEqual(order.snapshot(),stale);
  order.synchronize();assert.equal(order.total(),15000);assert.equal(order.matches(),true);
  order.refactor();assert.equal(order.mode,'query');assert.equal(order.total(),15000);assert.equal(Object.hasOwn(order.snapshot(),'cachedTotal'),false);
  order.updateItem('latte',{price:4000});assert.equal(order.total(),14500);assert.equal(order.matches(),true);
});

test('query reads have no side effects and source mutations remain encapsulated',()=>{
  const order=new OrderSession();order.refactor();const snapshot=order.snapshot();
  snapshot.items[0].quantity=99;assert.equal(order.total(),11500);
  const before=order.snapshot();for(let i=0;i<10;i++)assert.equal(order.total(),11500);
  assert.deepEqual(order.snapshot(),before);assert.equal(order.dirty,true);
  order.markSaved(before,savedAt);assert.equal(order.dirty,false);order.total();assert.equal(order.dirty,false);
});

test('add, remove, empty, restart and reset preserve the two modes semantics',()=>{
  const order=new OrderSession();order.addItem({id:'cookie',name:'쿠키',price:3000,quantity:1});
  assert.equal(order.total(),11500);assert.equal(order.expectedTotal(),14500);
  order.synchronize();order.refactor();order.removeItem('latte');assert.equal(order.total(),10000);
  order.removeItem('espresso');order.removeItem('cookie');assert.equal(order.total(),0);
  order.addItem();assert.equal(order.total(),3000);assert.equal(order.snapshot().items.length,1);
  order.restartStored();assert.equal(order.mode,'stored');assert.equal(order.snapshot().cachedTotal,3000);
  order.reset();assert.deepEqual(order.snapshot(),initial());assert.equal(order.dirty,false);
});

test('invalid edits and drafts fail atomically instead of silently coercing money or counts',()=>{
  const order=new OrderSession();const before=order.snapshot();
  for(const patch of [{quantity:0},{quantity:1.5},{quantity:'2'},{quantity:100},{price:-1},{price:NaN},{price:Infinity},{price:1000001},{price:'3500'},{name:''},{id:'renamed'},{constructor:1}]){
    assert.throws(()=>order.updateItem('espresso',patch));assert.deepEqual(order.snapshot(),before);
  }
  assert.throws(()=>order.updateItem('unknown',{quantity:1}));assert.throws(()=>order.removeItem('unknown'));
  for(const id of ['espresso','__proto__','constructor','prototype','unsafe id','UPPER'])assert.throws(()=>order.addItem({id,name:'음료',price:1000,quantity:1}));
  const malformed=[{...initial(),schema:2},{...initial(),mode:'cache'},{...initial(),extra:1},{...initial(),cachedTotal:-1},{...initial(),cachedTotal:1.5},{...initial(),savedAt:'tomorrow'},
    {...initial(),items:[initial().items[0],initial().items[0]]},{schema:1,mode:'query',items:initial().items,cachedTotal:11500}];
  for(const value of malformed)assert.throws(()=>validateLabDraft(value));
  assert.deepEqual(order.snapshot(),before);
});

test('a saved older revision never marks later edits clean, and discard restores exactly what was saved',()=>{
  const order=new OrderSession();order.updateItem('espresso',{quantity:3});const pending=order.snapshot();
  order.synchronize();order.refactor();order.markSaved(pending,savedAt);
  assert.equal(order.dirty,true);assert.equal(order.savedAt,savedAt);order.discardChanges();
  assert.deepEqual(order.snapshot(),pending);assert.equal(order.dirty,false);assert.equal(order.matches(),false);
  const restored=new OrderSession({...pending,savedAt});assert.equal(restored.savedAt,savedAt);assert.equal(restored.dirty,false);
});

test('draft validation clones the saved state and retains intentional stale totals',()=>{
  const draft={...initial(),cachedTotal:500,savedAt};const valid=validateLabDraft(draft);
  draft.items[0].price=0;assert.equal(valid.items[0].price,3500);assert.equal(valid.cachedTotal,500);assert.equal(valid.savedAt,savedAt);
  const query=validateLabDraft({schema:1,mode:'query',items:[],savedAt});assert.deepEqual(query,{schema:1,mode:'query',items:[],savedAt});
});

test('proof runs compare a correctly maintained cache and a query across source changes',()=>{
  const cases=runProofCases();assert.equal(cases.length,4);
  assert.deepEqual(cases.map(item=>item.steps.map(row=>row.expected)),[[11500,15000,8000],[11500,11000,12000],[11500,14500,10000],[11500,4500,0,3500]]);
  for(const item of cases){assert.ok(item.label);assert.ok(item.description);for(const row of item.steps){assert.ok(row.label);assert.equal(row.before,row.expected);assert.equal(row.after,row.expected);assert.equal(row.query,row.after);assert.equal(row.matches,true);}}
  cases[0].steps[0].before=-1;assert.equal(runProofCases()[0].steps[0].before,11500);
});
