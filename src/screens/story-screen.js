import {el} from '../shared/dom.js';
import {Screen} from './screen.js';
import {button,screenHead,pager,smallLabel} from './widgets.js';
import {storyFrames} from '../shared/learner-values.js';

export class StoryScreen extends Screen {
  render(){this.step=0;this.frames=storyFrames();this.paint();}
  paint(){
    const {tutorial}=this.data,step=tutorial.story.steps[this.step];
    const frame=this.frames[this.step],numbers=[frame.source,frame.read].map(value=>value.toLocaleString('ko-KR')+'원');
    this.root.replaceChildren(el('section',{className:'screen'},[
      screenHead(tutorial.screens.story),
      el('div',{className:'story-switch','aria-label':'이야기 단계'},tutorial.story.steps.map((part,index)=>button('0'+(index+1)+' '+part.title,()=>{this.step=index;this.paint();},{'aria-pressed':this.step===index,'data-story-step':index}))),
      el('div',{className:'story-visual','aria-live':'polite'},[
        el('div',{},[smallLabel('지금 주문의 합계'),el('strong',{className:'story-number',textContent:numbers[0]})]),
        el('span',{className:'connector','aria-hidden':'true',textContent:this.step===1?'≠':'='}),
        el('div',{},[smallLabel(this.step===2?'원본에서 읽은 값':'따로 적어 둔 값'),el('strong',{className:'story-number',textContent:numbers[1]})])
      ]),
      el('section',{className:'story-copy'},[el('h2',{textContent:step.title}),el('p',{textContent:step.body})]),
      el('aside',{className:'note'},[el('strong',{textContent:'여기서 Query는? '}),'필요한 값을 돌려주는 읽기 동작입니다. 이 튜토리얼에서는 주문표를 계산해 합계를 읽습니다. SQL이나 서버 통신이 꼭 필요한 것은 아닙니다.']),pager(this)
    ]));
  }
}
