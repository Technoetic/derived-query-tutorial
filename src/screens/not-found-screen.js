import {el} from '../shared/dom.js';
import {Screen} from './screen.js';
import {routeLink} from './widgets.js';
export class NotFoundScreen extends Screen {
  render(){this.ctx.setTitle('화면을 찾을 수 없어요 · QUERY / CAFE');this.root.replaceChildren(el('section',{className:'state-panel'},[el('p',{className:'eyebrow',textContent:'LOST IN THE CAFE'}),el('h1',{textContent:'이 주문표는 없어요.'}),el('p',{textContent:'주소를 확인하거나 처음부터 이어가 주세요.'}),routeLink('/','처음으로 돌아가기','btn btn-primary')]));}
}
