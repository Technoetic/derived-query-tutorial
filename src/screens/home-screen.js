import {el} from '../shared/dom.js';
import {Screen} from './screen.js';
import {button,routeLink} from './widgets.js';

const money=value=>value.toLocaleString('ko-KR')+'원';
export class HomeScreen extends Screen {
  render({tutorial}){
    this.quantity=1;
    this.fresh=el('strong',{'data-testid':'hero-fresh',textContent:money(11500)});
    this.stored=el('div',{className:'memo'},[el('label',{textContent:'따로 적어 둔 합계'}),el('strong',{textContent:money(11500)})]);
    this.rowQuantity=el('span',{textContent:'4,500 × 1'});
    this.receiptTotal=el('strong',{textContent:'11,500'});
    this.explanation=el('p',{textContent:'라테를 한 잔 더 주문하면?'});
    const action=button('라테 한 잔 추가 +',()=>{
      this.quantity=this.quantity===3?1:this.quantity+1;
      const current=7000+4500*this.quantity;
      this.rowQuantity.textContent='4,500 × '+this.quantity;
      this.receiptTotal.textContent=current.toLocaleString('ko-KR');this.fresh.textContent=money(current);
      this.stored.classList.toggle('is-stale',current!==11500);
      this.explanation.textContent=current===11500?'처음 주문으로 돌아왔어요.':'주문은 바뀌었는데, 메모는 그대로예요.';
      action.textContent=this.quantity===3?'처음 주문으로 ↻':'라테 한 잔 추가 +';
    },{className:'btn btn-accent','data-action':'hero-add'});
    const receipt=el('div',{className:'receipt','aria-label':'현재 카페 주문표'},[
      el('div',{className:'receipt-head'},[el('b',{textContent:'Your order.'}),el('span',{textContent:'TABLE 01 / CAFE'})]),
      el('div',{className:'receipt-row'},[el('span',{textContent:'에스프레소'}),el('span',{textContent:'3,500 × 2'})]),
      el('div',{className:'receipt-row'},[el('span',{textContent:'카페라테'}),this.rowQuantity]),
      el('div',{className:'receipt-total'},[el('span',{textContent:'지금 주문의 합계'}),this.receiptTotal])
    ]);
    this.root.replaceChildren(el('section',{className:'hero'},[
      el('div',{className:'hero-grid'},[
        el('div',{className:'hero-copy'},[
          el('p',{className:'eyebrow'},[el('span',{className:'live-dot','aria-hidden':'true'}),'REFACTORING, ONE ORDER AT A TIME']),
          el('h1',{},[el('span',{className:'serif',lang:'en',textContent:'Less to remember.'}),el('span',{textContent:'원본은 하나.'}),el('span',{textContent:'합계는 지금.'})]),
          el('p',{className:'lead',textContent:'주문은 바뀌었는데, 합계 메모는 그대로라면? 따로 적어 둔 계산값을 내려놓고, 필요할 때 원본에서 구하는 작은 변화를 체험해 보세요.'}),
          el('div',{className:'actions'},[routeLink('/story','주문표로 시작하기 →','btn btn-primary'),routeLink('/lab','바로 실험하기 ↗','btn btn-ghost')]),
          el('p',{className:'concept-tag',textContent:'Replace Derived Variable with Query'})
        ]),
        el('div',{className:'hero-stage'},[
          el('div',{className:'stage-kicker'},[el('span',{textContent:'LIVE ORDER / 01'}),el('span',{textContent:'터치해서 바꿔 보세요'})]),receipt,
          el('div',{className:'memo-versus','aria-live':'polite'},[this.stored,el('div',{className:'memo is-live'},[el('label',{textContent:'원본에서 지금 구한 합계'}),this.fresh])]),
          el('div',{className:'stage-action'},[this.explanation,action])
        ])
      ]),
      el('div',{className:'section-intro'},[el('h2',{textContent:'작은 카페에서 배우는 여섯 단계'}),el('span',{textContent:'LEARN · TRY · CHECK'})]),
      el('div',{className:'learning-strip'},tutorial.routes.filter(route=>route.path!=='/').map((route,index)=>routeLink(route.path,'','lesson-card',[
        el('span',{className:'n',textContent:String(index+1).padStart(2,'0')}),el('strong',{textContent:route.shortTitle}),el('span',{className:'arrow','aria-hidden':'true',textContent:'↗'})
      ])))
    ]));
  }
}
