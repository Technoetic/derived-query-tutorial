import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LabScreen} from '../src/screens/lab-screen.js';
import {LabStorageService} from '../src/services/lab-storage-service.js';
import {VersionService} from '../src/services/version-service.js';
import {installDom} from './helpers/fake-dom.mjs';

const tutorial=JSON.parse(await readFile(new URL('../data/tutorial.json',import.meta.url),'utf8'));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
class MemoryStorage {
  data=new Map();
  getItem(key){return this.data.get(key)??null;}
  setItem(key,value){this.data.set(key,String(value));}
  removeItem(key){this.data.delete(key);}
}
async function mount(t,memory=new MemoryStorage()){
  const dom=installDom(),root=dom.document.createElement('main'),toasts=[];
  const labStorage=new LabStorageService({storage:memory});
  const screen=new LabScreen({content:{load:async()=>structuredClone(tutorial)},labStorage,toast:message=>toasts.push(message),setTitle(){}},root,{path:'/lab',params:new URLSearchParams()},{path:'/lab',screen:'lab'});
  t.after(()=>{screen.dispose();dom.restore();});await screen.mount();return {screen,root,memory,toasts,labStorage};
}
function type(root,field,id,value){const input=root.querySelector('[data-'+field+'="'+id+'"]');assert.ok(input);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));return input;}
const change=input=>input.dispatchEvent(new Event('change',{bubbles:true}));
const field=(root,name,id='espresso')=>root.querySelector('[data-'+name+'="'+id+'"]');

test('typing during a pending version lookup protects the raw input before change or blur',async t=>{
  const {screen,root}=await mount(t),lookup=deferred();
  const version=new VersionService({baseUrl:'https://example.test/derived-query-tutorial/',loadedBuild:'dq-old',fetcher:()=>lookup.promise});
  const navigation=version.navigation('#/proof',()=>screen.readState());
  type(root,'quantity','espresso','4');lookup.resolve({ok:true,json:async()=>({schema:1,buildId:'dq-new'})});
  assert.equal((await navigation).kind,'protect');assert.equal(screen.readState().dirty,true);assert.equal(field(root,'quantity').value,'4');
});

test('invalid and partial numeric input survives change and rejects saving without becoming a model value',async t=>{
  const {screen,root,memory}=await mount(t),initial=screen.session.snapshot();
  for(const [name,raw]of [['price',''],['quantity','-'],['quantity','1.5'],['quantity','100']]){
    const input=type(root,name,'espresso',raw);change(input);
    assert.equal(field(root,name).value,raw);assert.deepEqual(screen.session.snapshot(),initial);assert.equal(screen.readState().dirty,true);
    await assert.rejects(screen.save());assert.equal(field(root,name).value,raw);assert.equal(memory.data.size,0);
    await screen.discard();assert.equal(screen.readState().dirty,false);
  }
});

test('other actions validate all pending fields atomically and reset cancellation preserves them',async t=>{
  const {screen,root}=await mount(t),initial=screen.session.snapshot();
  type(root,'quantity','espresso','4');type(root,'price','latte','-');
  for(const selector of ['[data-action="add-item"]','[data-remove="latte"]','[data-action="refactor"]']){
    root.querySelector(selector).click();assert.deepEqual(screen.session.snapshot(),initial);assert.equal(field(root,'quantity').value,'4');assert.equal(field(root,'price','latte').value,'-');assert.equal(screen.readState().dirty,true);
  }
  root.querySelector('[data-action="lab-reset"]').click();root.querySelector('[data-reset="cancel"]').click();
  assert.equal(field(root,'quantity').value,'4');assert.equal(field(root,'price','latte').value,'-');assert.equal(screen.readState().dirty,true);
  root.querySelector('[data-action="lab-reset"]').click();root.querySelector('[data-reset="confirm"]').click();
  assert.deepEqual(screen.session.snapshot(),initial);assert.equal(String(field(root,'quantity').value),'2');assert.equal(screen.readState().dirty,false);
});

test('save captures valid buffered input and leaves a newer partial edit protected until explicit discard',async t=>{
  const memory=new MemoryStorage(),write=memory.setItem.bind(memory),gate=deferred();memory.setItem=(key,value)=>gate.promise.then(()=>write(key,value));
  const {screen,root,labStorage}=await mount(t,memory);
  type(root,'quantity','espresso','3');const saving=screen.save();await Promise.resolve();
  assert.equal(screen.readState().saving,true);assert.equal(labStorage.saving,true);
  type(root,'quantity','espresso','-');gate.resolve();await saving;
  assert.equal((await labStorage.loadDraft()).items[0].quantity,3);assert.equal(field(root,'quantity').value,'-');assert.equal(screen.readState().dirty,true);assert.equal(screen.readState().saving,false);
  await screen.discard();assert.equal(String(field(root,'quantity').value),'3');assert.equal(screen.readState().dirty,false);
});

test('a valid change commits the input and correcting a buffer back to its saved value is clean',async t=>{
  const {screen,root}=await mount(t);
  const input=type(root,'quantity','espresso','4');change(input);
  assert.equal(screen.session.snapshot().items[0].quantity,4);assert.match(root.querySelector('[data-testid="expected-total"]').textContent,/18,500/);assert.equal(screen.readState().dirty,true);
  await screen.discard();type(root,'quantity','espresso','');assert.equal(screen.readState().dirty,true);
  type(root,'quantity','espresso','2');assert.equal(screen.readState().dirty,false);
});

test('change keeps the pressed action and keyboard focus alive until the following click',async t=>{
  const {screen,root}=await mount(t),input=type(root,'quantity','espresso','4');
  const add=root.querySelector('[data-action="add-item"]');
  // A pointer presses the action, then blurs/changes the edited field before its
  // mouseup/click. Replacing this button during change makes that click disappear.
  add.dispatchEvent(new Event('mousedown',{bubbles:true}));add.focus();change(input);
  assert.ok(root.querySelector('[data-action="add-item"]')===add,'change replaced the pressed action');assert.ok(document.activeElement===add,'change stole the intended focus');
  add.click();assert.equal(screen.session.snapshot().items.length,3);assert.equal(screen.session.snapshot().items[0].quantity,4);
});

test('a valid pending source edit enables synchronization before blur so one pointer click can apply it',async t=>{
  const {screen,root}=await mount(t),synchronize=root.querySelector('[data-action="synchronize"]');assert.equal(synchronize.disabled,true);
  const input=type(root,'quantity','espresso','4');assert.equal(synchronize.disabled,false);
  synchronize.dispatchEvent(new Event('mousedown',{bubbles:true}));change(input);
  assert.ok(root.querySelector('[data-action="synchronize"]')===synchronize);synchronize.click();
  assert.equal(screen.session.snapshot().items[0].quantity,4);assert.equal(screen.session.total(),18500);assert.equal(screen.session.matches(),true);
});
