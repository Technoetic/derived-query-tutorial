import {el} from '../shared/dom.js';
import {Screen} from './screen.js';
import {screenHead,pager,codeView,button} from './widgets.js';
import {codeCalculation} from '../shared/learner-values.js';

export class CodeScreen extends Screen {
  needs(){return ['tutorial','code'];}
  render({tutorial,code}){
    const detail=el('p',{className:'notice',textContent:codeCalculation(code.before)??code.explanation,hidden:true});
    this.root.replaceChildren(el('section',{className:'screen'},[
      screenHead(tutorial.screens.code),el('div',{className:'code-pair'},[codeView(code.before,'변경 전 · 합계를 별도로 보관'),codeView(code.after,'변경 후 · 읽을 때 원본으로 계산')]),
      el('div',{className:'output-bar'},[el('div',{},[el('p',{className:'label',textContent:'SAME INPUT · SAME OUTPUT'}),el('strong',{textContent:code.output.toLocaleString('ko-KR')+'원'})]),button('계산 펼쳐 보기',event=>{detail.hidden=!detail.hidden;event.currentTarget.setAttribute('aria-expanded',String(!detail.hidden));},{'aria-expanded':'false','data-action':'explain-output'})]),detail,
      el('p',{className:'lead',textContent:code.explanation}),el('aside',{className:'note'},'total을 읽는 창구는 유지하고, 그 안에서 별도 합계 필드 대신 원본 가격 목록을 더합니다. 읽기 동작은 원본 주문을 바꾸지 않습니다.'),pager(this)
    ]));
  }
}
