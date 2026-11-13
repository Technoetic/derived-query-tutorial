const ROUTES=['/','/story','/lab','/proof','/practice','/code','/summary'];
const SCREENS=['home','story','lab','proof','practice','code','summary'];
const UNSAFE_IDS=new Set(['__proto__','constructor','prototype']);
function insist(condition,message){if(!condition)throw new TypeError(message);}
function plain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}
function shape(value,keys){return plain(value)&&Object.keys(value).every(key=>keys.includes(key))&&keys.every(key=>Object.hasOwn(value,key));}
function text(value,max=3000){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
function id(value){return typeof value==='string'&&/^[a-z][a-z0-9-]{0,59}$/.test(value)&&!UNSAFE_IDS.has(value);}
function clone(value){return JSON.parse(JSON.stringify(value));}
function secureUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}}

export function validateTutorial(value){
  insist(shape(value,['schema','meta','routes','screens','story','summary'])&&value.schema===1,'튜토리얼 형식이 올바르지 않아요.');
  insist(shape(value.meta,['appTitle','htmlTitle','tagline','description'])&&Object.values(value.meta).every(item=>text(item)),'튜토리얼 소개를 읽을 수 없어요.');
  insist(Array.isArray(value.routes)&&value.routes.length===ROUTES.length,'화면 경로가 올바르지 않아요.');
  for(let index=0;index<ROUTES.length;index++){
    const route=value.routes[index];insist(shape(route,['path','title','shortTitle'])&&route.path===ROUTES[index]&&text(route.title,100)&&text(route.shortTitle,40),'화면 경로가 중복되거나 올바르지 않아요.');
  }
  insist(shape(value.screens,SCREENS),'화면 설명이 빠져 있어요.');
  for(const name of SCREENS)insist(shape(value.screens[name],['eyebrow','title','lead'])&&Object.values(value.screens[name]).every(item=>text(item)),'화면 설명이 올바르지 않아요.');
  insist(shape(value.story,['steps'])&&Array.isArray(value.story.steps)&&value.story.steps.length===3,'이야기 단계가 올바르지 않아요.');
  for(const step of value.story.steps)insist(shape(step,['title','body'])&&text(step.title)&&text(step.body),'이야기 내용을 읽을 수 없어요.');
  insist(shape(value.summary,['points','sources'])&&Array.isArray(value.summary.points)&&value.summary.points.length>0&&value.summary.points.every(item=>text(item)),'정리 내용을 읽을 수 없어요.');
  insist(Array.isArray(value.summary.sources)&&value.summary.sources.length>0,'출처가 빠져 있어요.');
  for(const source of value.summary.sources)insist(shape(source,['title','url'])&&text(source.title)&&secureUrl(source.url),'출처 링크가 올바르지 않아요.');
  return clone(value);
}

export function validatePractice(value){
  insist(shape(value,['schema','draft','items'])&&value.schema===1,'연습 형식이 올바르지 않아요.');
  insist(shape(value.draft,['noteMaxLength'])&&Number.isInteger(value.draft.noteMaxLength)&&value.draft.noteMaxLength>0&&value.draft.noteMaxLength<=1000,'메모 길이 설정이 올바르지 않아요.');
  insist(Array.isArray(value.items)&&value.items.length===6,'연습은 여섯 문항이어야 해요.');
  const ids=new Set();
  for(const item of value.items){
    insist(shape(item,['id','title','story','question','choices','answer','explanation'])&&id(item.id)&&!ids.has(item.id),'문항 ID가 중복되거나 올바르지 않아요.');ids.add(item.id);
    insist(['title','story','question','explanation'].every(key=>text(item[key])),'문항 내용을 읽을 수 없어요.');
    insist(Array.isArray(item.choices)&&item.choices.length>=2&&item.choices.length<=5,'선택지 수가 올바르지 않아요.');
    const choices=new Set();
    for(const choice of item.choices){insist(shape(choice,['id','label'])&&id(choice.id)&&!choices.has(choice.id)&&text(choice.label),'선택지 ID 또는 내용이 올바르지 않아요.');choices.add(choice.id);}
    insist(choices.has(item.answer),'정답이 선택지에 없어요.');
  }
  return clone(value);
}

export function validateCode(value){
  insist(shape(value,['schema','before','after','output','explanation'])&&value.schema===1,'코드 예제 형식이 올바르지 않아요.');
  for(const name of ['before','after'])insist(Array.isArray(value[name])&&value[name].length>0&&value[name].length<=100&&value[name].every(line=>typeof line==='string'&&line.length<=500),'코드 예제의 줄 형식이 올바르지 않아요.');
  insist(Number.isSafeInteger(value.output)&&value.output>=0&&text(value.explanation),'코드 결과 설명이 올바르지 않아요.');
  return clone(value);
}

export function validateBundle(value){
  insist(shape(value,['tutorial','practice','code']),'콘텐츠 묶음을 읽을 수 없어요.');
  return {tutorial:validateTutorial(value.tutorial),practice:validatePractice(value.practice),code:validateCode(value.code)};
}
