import {el} from '../shared/dom.js';
import {Screen} from './screen.js';
import {runProofCases} from '../tutorial/order-model.js';
import {button,screenHead,pager} from './widgets.js';

export class ProofScreen extends Screen {
  render(){this.cases=runProofCases();this.active=0;this.paint();}
  paint(){
    const chosen=this.cases[this.active],money=value=>value.toLocaleString('ko-KR')+'원';
    this.root.replaceChildren(el('section',{className:'screen'},[
      screenHead(this.data.tutorial.screens.proof),
      el('div',{className:'proof-switch','aria-label':'비교할 상황'},this.cases.map((item,index)=>button(item.label,()=>{this.active=index;this.paint();},{'aria-pressed':this.active===index,'data-proof-case':index}))),
      el('p',{className:'notice',textContent:chosen.description}),
      el('div',{className:'proof-case','data-testid':'proof-results'},chosen.steps.map(step=>el('section',{className:'proof-row'},[
        el('div',{},[el('h3',{textContent:step.label}),el('p',{className:'pass-marker',textContent:step.matches?'✓ 같은 결과':'! 결과 확인이 필요합니다'})]),
        el('dl',{className:'proof-values'},[['기존 저장 방식',step.before],['Query 방식',step.after],['기대 결과',step.expected]].map(([label,value])=>el('div',{},[el('dt',{textContent:label}),el('dd',{textContent:money(value)})])))
      ]))),
      el('aside',{className:'note'},[el('strong',{textContent:'무엇과 비교했을까요? '}),'여기서 기존 방식은 합계 갱신이 정상인 구현입니다. 이미 틀어진 값과 비교해 결과가 달라지는 것을 리팩토링의 성공이라고 부르지 않습니다.']),pager(this)
    ]));
  }
}
