const UNSAFE_IDS=new Set(['__proto__','constructor','prototype']);
const SAFE_ID=/^[a-z][a-z0-9-]{0,39}$/;
export const ORDER_LIMITS=Object.freeze({maxItems:20,maxPrice:1000000,maxQuantity:99,maxNameLength:60});
export const DEFAULT_ITEMS=Object.freeze([
  Object.freeze({id:'espresso',name:'에스프레소',price:3500,quantity:2}),
  Object.freeze({id:'latte',name:'카페 라테',price:4500,quantity:1})
]);

function insist(condition,message){if(!condition)throw new TypeError(message);}
function plain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}
function keys(value,allowed){return Object.keys(value).every(key=>allowed.includes(key));}
function integer(value,min,max){return Number.isSafeInteger(value)&&value>=min&&value<=max;}
function safeId(value){return typeof value==='string'&&SAFE_ID.test(value)&&!UNSAFE_IDS.has(value);}
function validSavedAt(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&
  Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;}
function sum(items){return items.reduce((total,item)=>total+item.price*item.quantity,0);}
function copy(state){const result={schema:1,mode:state.mode,items:state.items.map(item=>({...item}))};if(state.mode==='stored')result.cachedTotal=state.cachedTotal;return result;}
function initial(){return {schema:1,mode:'stored',items:DEFAULT_ITEMS.map(item=>({...item})),cachedTotal:11500};}
function same(left,right){return JSON.stringify(left)===JSON.stringify(right);}

export function validateLabDraft(value){
  insist(plain(value)&&keys(value,['schema','mode','items','cachedTotal','savedAt'])&&value.schema===1,'저장된 주문 형식이 올바르지 않아요.');
  insist(value.mode==='stored'||value.mode==='query','주문의 계산 방식이 올바르지 않아요.');
  insist(Array.isArray(value.items)&&value.items.length<=ORDER_LIMITS.maxItems,'주문 항목은 최대 20개까지 담을 수 있어요.');
  const ids=new Set();
  for(const item of value.items){
    insist(plain(item)&&keys(item,['id','name','price','quantity']),'주문 항목 형식이 올바르지 않아요.');
    insist(safeId(item.id)&&!ids.has(item.id),'주문 항목 ID가 중복되거나 올바르지 않아요.');ids.add(item.id);
    insist(typeof item.name==='string'&&item.name.trim().length>0&&item.name.length<=ORDER_LIMITS.maxNameLength,'이름은 1~60자로 입력해 주세요.');
    insist(integer(item.price,0,ORDER_LIMITS.maxPrice),'단가는 0~1,000,000 사이의 정수로 입력해 주세요.');
    insist(integer(item.quantity,1,ORDER_LIMITS.maxQuantity),'수량은 1~99 사이의 정수로 입력해 주세요.');
  }
  if(value.mode==='stored')insist(integer(value.cachedTotal,0,ORDER_LIMITS.maxItems*ORDER_LIMITS.maxPrice*ORDER_LIMITS.maxQuantity),'저장된 합계가 올바르지 않아요.');
  else insist(!Object.hasOwn(value,'cachedTotal'),'질의 방식에는 별도로 저장한 합계가 없어요.');
  const result=copy(value);
  if(Object.hasOwn(value,'savedAt')){insist(validSavedAt(value.savedAt),'저장 시각이 올바르지 않아요.');result.savedAt=value.savedAt;}
  return result;
}

export class OrderSession {
  constructor(draft=null){
    const restored=draft===null?initial():validateLabDraft(draft);
    this._state=copy(restored);this._saved=copy(restored);this.savedAt=restored.savedAt??null;
  }
  snapshot(){return copy(this._state);}
  updateItem(id,patch){
    insist(plain(patch)&&keys(patch,['name','price','quantity']),'바꿀 수 있는 값은 이름, 단가, 수량이에요.');
    const next=this.snapshot(),item=next.items.find(item=>item.id===id);insist(!!item,'알 수 없는 주문 항목이에요.');
    Object.assign(item,patch);this._state=copy(validateLabDraft(next));return this.snapshot();
  }
  addItem(item){
    const next=this.snapshot();
    if(item===undefined){let index=1;while(next.items.some(item=>item.id==='item-'+index))index++;item={id:'item-'+index,name:'추가 음료',price:3000,quantity:1};}
    insist(plain(item),'추가할 주문 항목이 올바르지 않아요.');next.items.push({...item});
    this._state=copy(validateLabDraft(next));return this.snapshot();
  }
  removeItem(id){
    const next=this.snapshot(),index=next.items.findIndex(item=>item.id===id);insist(index!==-1,'알 수 없는 주문 항목이에요.');
    next.items.splice(index,1);this._state=copy(validateLabDraft(next));return this.snapshot();
  }
  synchronize(){if(this.mode==='stored')this._state.cachedTotal=this.expectedTotal();return this.snapshot();}
  refactor(){
    insist(this.matches(),'먼저 저장된 합계와 현재 주문의 합계를 맞춘 뒤 바꿔 주세요.');
    this._state={schema:1,mode:'query',items:this._state.items.map(item=>({...item}))};return this.snapshot();
  }
  restartStored(){this._state={schema:1,mode:'stored',items:this._state.items.map(item=>({...item})),cachedTotal:this.expectedTotal()};return this.snapshot();}
  reset(){this._state=initial();return this.snapshot();}
  total(){return this.mode==='stored'?this._state.cachedTotal:this.expectedTotal();}
  expectedTotal(){return sum(this._state.items);}
  matches(){return this.total()===this.expectedTotal();}
  markSaved(snapshot,savedAt){const saved=validateLabDraft({...snapshot,savedAt});this._saved=copy(saved);this.savedAt=savedAt;}
  discardChanges(){this._state=copy(this._saved);return this.snapshot();}
  get dirty(){return !same(this._state,this._saved);}
  get mode(){return this._state.mode;}
}

// The proof's old implementation correctly maintains its stored derivation.
// The lab deliberately omits that maintenance so learners can see the risk.
class MaintainedOrder {
  constructor(){this.items=DEFAULT_ITEMS.map(item=>({...item}));this.cachedTotal=11500;}
  update(id,patch){const item=this.items.find(item=>item.id===id);this.cachedTotal-=item.price*item.quantity;Object.assign(item,patch);this.cachedTotal+=item.price*item.quantity;}
  add(item){this.items.push({...item});this.cachedTotal+=item.price*item.quantity;}
  remove(id){const index=this.items.findIndex(item=>item.id===id);const [item]=this.items.splice(index,1);this.cachedTotal-=item.price*item.quantity;}
  total(){return this.cachedTotal;}
}
class QueryOrder {
  constructor(){this.items=DEFAULT_ITEMS.map(item=>({...item}));}
  update(id,patch){Object.assign(this.items.find(item=>item.id===id),patch);}
  add(item){this.items.push({...item});}
  remove(id){this.items.splice(this.items.findIndex(item=>item.id===id),1);}
  total(){return sum(this.items);}
}

export function runProofCases(){
  const espresso={id:'espresso',name:'에스프레소',price:3500,quantity:1};
  const cookie={id:'cookie',name:'쿠키',price:3000,quantity:1};
  const definitions=[
    {id:'quantity',label:'수량을 바꿀 때',description:'수량이 늘어도 줄어도 같은 합계를 반환해요.',steps:[['처음 주문',null,11500],['에스프레소 3잔',order=>order.update('espresso',{quantity:3}),15000],['에스프레소 1잔',order=>order.update('espresso',{quantity:1}),8000]]},
    {id:'price',label:'단가를 바꿀 때',description:'현재 주문의 단가가 바뀌는 경우를 확인해요.',steps:[['처음 주문',null,11500],['라테 4,000원',order=>order.update('latte',{price:4000}),11000],['라테 5,000원',order=>order.update('latte',{price:5000}),12000]]},
    {id:'add-remove',label:'항목을 더하고 뺄 때',description:'항목 추가와 삭제에서도 전후 결과가 같아요.',steps:[['처음 주문',null,11500],['쿠키 1개 추가',order=>order.add(cookie),14500],['라테 삭제',order=>order.remove('latte'),10000]]},
    {id:'empty',label:'주문이 비었을 때',description:'마지막 항목을 지우면 0원이고, 다시 담으면 새 합계가 나와요.',steps:[['처음 주문',null,11500],['에스프레소 삭제',order=>order.remove('espresso'),4500],['라테 삭제',order=>order.remove('latte'),0],['에스프레소 1잔 추가',order=>order.add(espresso),3500]]}
  ];
  return definitions.map(({steps,...description})=>{
    const old=new MaintainedOrder(),query=new QueryOrder();
    return {...description,steps:steps.map(([label,act,expected])=>{act?.(old);act?.(query);const before=old.total(),after=query.total();return {label,before,after,expected,query:after,matches:before===expected&&after===expected};})};
  });
}
