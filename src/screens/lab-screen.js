import {el,uniqueId} from '../shared/dom.js';
import {Screen} from './screen.js';
import {OrderSession,validateLabDraft} from '../tutorial/order-model.js';
import {button,screenHead,pager,smallLabel} from './widgets.js';

const money=value=>value.toLocaleString('ko-KR')+'원';
const comparisonCopy=(query,match)=>({
  title:query?'✓ 원본과 연결된 합계':match?'✓ 두 값이 같습니다':'! 원본과 합계가 어긋났어요',
  description:query?'주문을 다시 바꿔 보세요. 읽는 값도 원본을 따라갑니다.':match?'주문을 바꿔 어긋남을 확인하거나, Query 방식으로 교체할 수 있어요.':'먼저 누락된 합계 갱신을 고친 뒤, 정상 결과를 유지하며 Query로 교체해 보세요.'
});
export class LabScreen extends Screen {
  constructor(...args){super(...args);this.session=null;this.saving=false;this.savePromise=null;this.saveError=null;this.renderSequence=0;this.buffers=new Map();this.inputError=null;}
  readState(){return {dirty:!!this.session?.dirty||this.buffers.size>0,saving:this.saving};}
  async render(){
    const sequence=++this.renderSequence;let draft=null;this.notice='';
    if(!this.ctx.labStorage.available)this.notice='브라우저 저장소를 사용할 수 없어요. 저장 없이 지금 실험할 수 있어요.';
    else try{draft=await this.ctx.labStorage.loadDraft(validateLabDraft);if(draft)this.notice='이 브라우저에 저장한 실험을 가져왔어요.';}
    catch{this.notice='이전에 저장한 실험을 읽지 못했어요. 새 실험으로 시작합니다. 저장하면 이전 기록을 바꿉니다.';}
    if(this.closed||sequence!==this.renderSequence)return;
    this.session=new OrderSession(draft);this.paint();
  }
  bufferInput(id,field,raw){
    const key=id+':'+field,item=this.session.snapshot().items.find(item=>item.id===id);
    if(raw===String(item[field]))this.buffers.delete(key);else this.buffers.set(key,{id,field,raw});
    this.inputError=null;this.saveError=null;this.root.querySelector('[data-'+field+'="'+id+'"]')?.removeAttribute('aria-invalid');this.refreshPendingActions();this.refreshStatus();
  }
  bufferedDraft(){
    const next=this.session.snapshot();
    for(const {id,field,raw}of this.buffers.values()){
      if(!/^\d+$/.test(raw))throw new TypeError('가격과 수량을 빈칸 없이 정수로 입력해 주세요.');
      next.items.find(item=>item.id===id)[field]=Number(raw);
    }
    return validateLabDraft(next);
  }
  refreshPendingActions(){
    let preview;
    try{preview=new OrderSession(this.bufferedDraft());}
    catch{this.root.querySelector('[data-action="synchronize"]').disabled=true;this.root.querySelector('[data-action="refactor"]').disabled=true;return;}
    const query=preview.mode==='query',match=preview.matches();
    this.root.querySelector('[data-action="synchronize"]').disabled=query||match;
    this.root.querySelector('[data-action="refactor"]').disabled=!query&&!match;
  }
  // Check the complete proposed order before changing the model. Empty and partial
  // strings remain editable text; in particular, an empty price must never become 0.
  flushInputs({focusError=true}={}){
    if(!this.buffers.size)return false;
    const patches=new Map();
    try{
      const next=this.bufferedDraft();
      for(const {id,field,raw}of this.buffers.values()){
        const item=next.items.find(item=>item.id===id);
        if(!patches.has(id))patches.set(id,{});patches.get(id)[field]=item[field];
      }
    }catch(error){
      this.inputError=error;
      for(const {id,field}of this.buffers.values())this.root.querySelector('[data-'+field+'="'+id+'"]')?.setAttribute('aria-invalid','true');
      if(focusError){const first=this.buffers.values().next().value;this.root.querySelector('[data-'+first.field+'="'+first.id+'"]')?.focus();}throw error;
    }
    for(const [id,patch]of patches)this.session.updateItem(id,patch);
    this.buffers.clear();this.inputError=null;return true;
  }
  change(action,focus=null){
    try{this.flushInputs();action();this.saveError=null;this.paint();if(focus)this.root.querySelector(focus)?.focus();}
    catch(error){this.ctx.toast(error.message||'값을 확인해 주세요.');if(this.buffers.size)this.refreshStatus();else this.paint();}
  }
  commitInput(id,field,raw){
    this.bufferInput(id,field,raw);
    // Blur/change runs between a pointer press and its click. Keep the pressed
    // button and keyboard target alive; only refresh values inside existing nodes.
    try{this.flushInputs({focusError:false});this.refreshComparison();}
    catch(error){this.ctx.toast(error.message||'값을 확인해 주세요.');this.refreshStatus();}
  }
  refreshComparison(){
    const query=this.session.mode==='query',match=this.session.matches(),copy=comparisonCopy(query,match);
    const current=this.root.querySelector('[data-testid="current-total"]');current.textContent=money(this.session.total());current.parentNode.className='total-card '+(query?'query':match?'':'stale');
    this.root.querySelector('[data-testid="expected-total"]').textContent=money(this.session.expectedTotal());
    const feedback=this.root.querySelector('[data-testid="lab-feedback"]');feedback.dataset.match=String(match);feedback.querySelector('strong').textContent=copy.title;feedback.querySelector('p').textContent=copy.description;
    this.refreshPendingActions();
    for(const item of this.session.snapshot().items)this.root.querySelector('[data-line-total="'+item.id+'"]').textContent=money(item.price*item.quantity);
    this.refreshStatus();
  }
  paint(){
    const {tutorial}=this.data,snapshot=this.session.snapshot(),query=this.session.mode==='query',match=this.session.matches(),copy=comparisonCopy(query,match);
    this.status=el('p',{className:'save-status','data-testid':'lab-save-status',role:'status'});
    this.saveButton=button('이 브라우저에 저장',()=>this.save().catch(()=>{}),{'data-action':'lab-save'});
    this.root.replaceChildren(el('section',{className:'screen lab-screen'},[
      screenHead(tutorial.screens.lab),this.notice?el('p',{className:'notice',role:'status',textContent:this.notice}):null,
      el('div',{className:'lab-toolbar'},[el('div',{className:'mode-label'},[el('span',{className:'tag',textContent:query?'QUERY MODE':'STORED MODE'}),el('strong',{textContent:query?'합계를 읽을 때 계산합니다':'합계를 따로 적어 둡니다'})]),button('실험 초기화',()=>this.confirmReset(),{className:'btn btn-ghost btn-small','data-action':'lab-reset'})]),
      el('div',{className:'lab-grid'},[
        el('section',{className:'panel','aria-label':'원본 주문표'},[
          smallLabel('SOURCE / 원본 주문표'),
          snapshot.items.length?el('div',{className:'order-items'},snapshot.items.map(item=>this.item(item))):el('p',{textContent:'주문이 비어 있어요. 아래에서 음료를 추가해 보세요.'}),
          el('div',{className:'actions lab-actions'},[button('음료 추가 +',()=>this.change(()=>this.session.addItem()),{'data-action':'add-item',disabled:snapshot.items.length>=20})]),
          el('p',{className:'lab-note',textContent:'가격이나 수량을 바꾼 뒤 입력칸 밖을 누르세요. 빈칸이나 정수가 아닌 값은 고친 뒤 저장할 수 있어요. 저장 방식에서는 주문표만 바꾸고 합계 메모의 갱신을 빠뜨린 상황을 재현합니다.'})
        ]),
        el('section',{className:'totals-stack','aria-label':'현재 합계 비교','aria-live':'polite'},[
          el('div',{className:'total-card '+(query?'query':match?'':'stale')},[
            smallLabel(query?'QUERY / 읽은 합계':'STORED / 메모된 합계'),
            el('strong',{'data-testid':'current-total',textContent:money(this.session.total())}),
            el('small',{textContent:query?'중복 합계 필드 없이 원본에서 구했어요.':'원본을 바꾸어도 이 숫자는 저절로 바뀌지 않아요.'})
          ]),
          el('div',{className:'total-card'},[smallLabel('SOURCE / 원본으로 계산'),el('strong',{'data-testid':'expected-total',textContent:money(this.session.expectedTotal())}),el('small',{textContent:'지금 주문표로 구한 비교 기준입니다.'})]),
          el('div',{className:'lab-feedback','data-match':String(match),'data-testid':'lab-feedback'},[
            el('strong',{textContent:copy.title}),el('p',{textContent:copy.description})
          ])
        ])
      ]),
      el('div',{className:'lab-footer'},[
        el('div',{className:'actions'},[
          button('① 메모 합계 맞추기',()=>this.change(()=>this.session.synchronize()),{disabled:query||match,'data-action':'synchronize'}),
          button(query?'저장 방식으로 돌아가기':'② Query로 바꾸기',()=>this.change(()=>query?this.session.restartStored():this.session.refactor()),{className:'btn btn-primary',disabled:!query&&!match,'data-action':'refactor'})
        ]),this.saveButton,this.status
      ]),
      el('aside',{className:'note'},[el('strong',{textContent:'버그 수정과 리팩토링을 나눠 보기. '}),'어긋난 메모를 맞추는 것은 누락된 갱신을 고치는 일입니다. 그다음 정상 결과를 유지하며 중복 합계 필드를 없애는 과정을 리팩토링으로 비교합니다.']),pager(this)
    ]));this.refreshStatus();
  }
  item(item){
    const priceId=uniqueId('price'),quantityId=uniqueId('quantity');
    const number=(field,id,min,max)=>el('input',{type:'text',inputmode:'numeric',pattern:'[0-9]*',id,min,max,value:this.buffers.get(item.id+':'+field)?.raw??String(item[field]),['data-'+field]:item.id,'aria-label':item.name+' '+(field==='price'?'가격':'수량'),
      oninput:event=>this.bufferInput(item.id,field,event.target.value),
      onchange:event=>this.commitInput(item.id,field,event.target.value)});
    return el('div',{className:'order-item'},[
      el('div',{},[el('h3',{textContent:item.name}),el('span',{className:'order-line-total','data-line-total':item.id,textContent:money(item.price*item.quantity)})]),
      el('label',{for:priceId},['가격 (원)',number('price',priceId,0,1000000)]),
      el('label',{for:quantityId},['수량',number('quantity',quantityId,1,99)]),
      button('×',()=>this.change(()=>this.session.removeItem(item.id)),{className:'item-remove','aria-label':item.name+' 주문 삭제','data-remove':item.id})
    ]);
  }
  refreshStatus(){
    if(!this.session||!this.status)return;
    let state='idle',message='저장 버튼을 누르면 이 실험을 다시 열 수 있어요.';
    if(this.saving){state='saving';message='실험을 저장하는 중…';}
    else if(this.inputError){state='error';message=this.inputError.message;}
    else if(this.saveError){state='error';message='저장하지 못했어요. 실험은 그대로 있으니 다시 시도해 주세요.';}
    else if(this.readState().dirty){state='dirty';message='저장하지 않은 실험 변경이 있어요.';}
    else if(this.session.savedAt){state='saved';message='이 브라우저에 저장했어요.';}
    this.status.dataset.state=state;this.status.textContent=message;this.saveButton.disabled=this.saving||!this.ctx.labStorage.available;
  }
  async save(){
    if(!this.session)return;
    try{if(this.flushInputs())this.paint();}catch(error){this.refreshStatus();throw error;}
    const snapshot=this.session.snapshot(),savedAt=new Date().toISOString(),previous=this.savePromise;
    const operation=Promise.resolve().then(async()=>{
      if(previous)await previous.catch(()=>{});if(this.closed)return;
      this.saveError=null;
      try{await this.ctx.labStorage.saveDraft({...snapshot,savedAt});this.session.markSaved(snapshot,savedAt);}
      catch(error){this.saveError=error;throw error;}
      finally{if(this.savePromise===operation){this.savePromise=null;this.saving=false;}if(!this.closed)this.refreshStatus();}
    });this.savePromise=operation;this.saving=true;this.refreshStatus();return operation;
  }
  async discard(){if(this.savePromise)await this.savePromise.catch(()=>{});this.buffers.clear();this.inputError=null;this.session?.discardChanges();this.saveError=null;if(!this.closed)this.paint();}
  confirmReset(){
    const id=uniqueId('lab-reset'),dialog=el('dialog',{className:'modal','aria-labelledby':id},[
      el('div',{className:'modal-card'},[el('p',{className:'eyebrow',textContent:'A FRESH ORDER'}),el('h2',{id,textContent:'처음 주문으로 돌아갈까요?'}),el('p',{textContent:'현재 실험을 처음 상태로 돌립니다. 이미 저장한 기록은 다시 저장할 때 바뀝니다.'}),el('div',{className:'actions'},[
        button('처음 주문으로',()=>{close();this.buffers.clear();this.inputError=null;this.change(()=>this.session.reset());},{className:'btn btn-primary','data-reset':'confirm'}),button('그대로 두기',()=>close(),{'data-reset':'cancel'})])])
    ]);
    const close=()=>{dialog.close();dialog.remove();};dialog.addEventListener('cancel',event=>{event.preventDefault();close();});this.root.append(dialog);dialog.showModal();dialog.querySelector('[data-reset="cancel"]').focus();
  }
}
