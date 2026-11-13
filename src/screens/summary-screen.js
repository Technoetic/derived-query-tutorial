import {el} from '../shared/dom.js';
import {Screen} from './screen.js';
import {screenHead,pager,routeLink} from './widgets.js';

export class SummaryScreen extends Screen {
  render({tutorial}){
    this.root.replaceChildren(el('section',{className:'screen'},[
      screenHead(tutorial.screens.summary),el('ol',{className:'summary-list'},tutorial.summary.points.map(point=>el('li',{textContent:point}))),
      el('aside',{className:'note'},[el('strong',{textContent:'항상 지워야 하는 값은 아닙니다. '}),'어제 확정한 영수증의 결제액처럼 당시 사실을 보관하는 값은 기록으로 남겨야 합니다. 계산 비용이 실제로 큰 경우의 캐시도 별도의 근거와 관리 전략이 필요합니다.']),
      el('div',{className:'source-links'},tutorial.summary.sources.map(source=>el('a',{href:source.url,target:'_blank',rel:'noopener noreferrer',textContent:source.title+' ↗'}))),
      el('div',{className:'actions',style:'margin-top:32px'},[routeLink('/lab','다시 실험하기 ↗','btn btn-primary'),routeLink('/practice','여섯 문제로 점검하기','btn btn-secondary')]),pager(this)
    ]));
  }
}
