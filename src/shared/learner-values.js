import {OrderSession} from '../tutorial/order-model.js';

const money=value=>value.toLocaleString('ko-KR')+'원';

export function storyFrames(){
  const order=new OrderSession();
  const frame=()=>({source:order.expectedTotal(),read:order.total(),mode:order.mode});
  const frames=[frame()];
  order.updateItem('espresso',{quantity:3});
  frames.push(frame());
  order.synchronize();order.refactor();
  frames.push(frame());
  return frames;
}

// The adjacent example is trusted static content; never execute code strings.
export function codeCalculation(lines){
  const prices=lines.map(line=>line.match(/^\s*order\.add\((\d+)\);\s*$/)).filter(Boolean).map(match=>Number(match[1]));
  if(!prices.length||prices.some(price=>!Number.isSafeInteger(price)))return null;
  const total=prices.reduce((sum,price)=>sum+price,0);
  if(!Number.isSafeInteger(total))return null;
  return prices.map(money).join(' + ')+' = '+money(total);
}
