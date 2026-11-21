const slides=[...document.querySelectorAll('.slide')];
const labels=JSON.parse(document.getElementById('labels').textContent);
const main=document.querySelector('main'), dialog=document.getElementById('panel');
const byId=id=>document.getElementById(id);
let page=0,step=0,opener=null;
const total=slides.length;
const isMapDeck=slides[0].classList.contains('mapSlide');
const guidePage=slides.findIndex(slide=>slide.classList.contains('family-guide'))+1;
const guidePanels=[...document.querySelectorAll('.family-guide .family-panel')];
const treeNodes = [...document.querySelectorAll('[data-leaf]')];
const treePage = slides.findIndex(slide => slide.dataset.n === 'intro-map') + 1;
const glossaryPage = slides.findIndex(slide => slide.dataset.n === 'intro-terms') + 1;
const termTabs = [...document.querySelectorAll('.gloss-tabs [role="tab"]')];

function selectTerm(index) {
 termTabs.forEach((tab, i) => {
  tab.setAttribute('aria-selected', String(i === index));
  tab.tabIndex = i === index ? 0 : -1;
  byId(tab.getAttribute('aria-controls')).hidden = i !== index;
 });
}
termTabs.forEach((tab, index) => {
 tab.addEventListener('click', () => go(glossaryPage, index));
 tab.addEventListener('keydown', event => {
  const positions = {ArrowRight:(index + 1) % termTabs.length, ArrowLeft:(index + termTabs.length - 1) % termTabs.length, Home:0, End:termTabs.length - 1};
  if (!(event.key in positions)) return;
  event.preventDefault();
  event.stopPropagation();
  const target = positions[event.key];
  go(glossaryPage, target);
  termTabs[target].focus();
 });
});

const treeCards = [...document.querySelectorAll('.route-story')];
const treeOverlay = document.querySelector('.map-focus');
const treeSlide = slides[treePage - 1];
let treeIndex = -1;
let treeTimer = 0;
let chipFlight = null;

function stopTree() {
 clearTimeout(treeTimer);
 chipFlight?.cancel();
 chipFlight = null;
}
function finishTree() {
 stopTree();
 treeIndex = treeCards.length;
 treeSlide.classList.remove('tree-opening', 'tree-root-only');
 treeOverlay.hidden = true;
 treeCards.forEach(card => { card.hidden = true; });
 treeNodes.forEach(node => node.classList.add('revealed'));
}
function showTreeCard(index) {
 stopTree();
 treeSlide.classList.remove('tree-opening', 'tree-root-only');
 treeIndex = index;
 treeCards.forEach((card, i) => { card.hidden = i !== index; });
 treeOverlay.hidden = false;
}
function startTree() {
 finishTree();
 treeIndex = -1;
 treeNodes.forEach(node => node.classList.remove('revealed'));
 treeSlide.classList.add('tree-opening', 'tree-root-only');
 treeTimer = setTimeout(() => {
  treeSlide.classList.remove('tree-root-only');
  treeTimer = setTimeout(() => showTreeCard(0), 1100);
 }, 450);
}
function advanceTree() {
 if (treeIndex < 0) { showTreeCard(0); return; }
 // A second input during the chip's flight should not dismiss the upcoming card.
 if (treeOverlay.hidden) return;
 const source = treeCards[treeIndex].querySelector('mark').getBoundingClientRect();
 treeOverlay.hidden = true;
 const node = treeNodes[treeIndex];
 node.classList.add('revealed');
 const next = treeIndex + 1;
 const land = () => {
  if (next === treeCards.length) finishTree();
  else showTreeCard(next);
 };
 if (matchMedia('(prefers-reduced-motion: reduce)').matches) { land(); return; }
 const chip = node.querySelector('strong');
 const end = chip.getBoundingClientRect();
 chipFlight = chip.animate([
  {transform:`translate(${source.left-end.left}px, ${source.top-end.top}px) scale(1.15)`},
  {transform:'none'}
 ], {duration:380, easing:'ease-out'});
 treeTimer = setTimeout(land, 380);
}

const chapterStarts=[1,3,6,12,41,46,60,64];
const chapterLabels=['표지와 목차','00 시작하기 전에','2028 인원 분석','5등급제 실시에 따른 변화','논서술형 평가 역량 변화','통합형 수능에 따른 변화','마무리','2부 중학생 학부모 진학 안내'];
function route(){
 const m=location.hash.match(/^#(\d+)(?:\.(\d+))?$/);
 // The former combined deck opened Part 2 at pages 80–85.
 const requested=m?Number(m[1]):1;
 const formerMapPage=requested-79;
 if(!isMapDeck&&formerMapPage>=1&&formerMapPage<=Number(document.body.dataset.formerMapCount)){
  const target=new URL(document.body.dataset.mapUrl,location.href);
  target.hash=String(formerMapPage)+(m[2]?'.'+m[2]:'');
  location.replace(target.href);return;
 }
 const n=Math.max(1,Math.min(total,requested>=76 && requested<=79 ? requested-16 : requested));
 const steps=n===glossaryPage?termTabs.length:n===guidePage?guidePanels.length:isMapDeck?journey[n-1].steps.length:1;
 const s=Math.max(0,Math.min(steps-1,m?Number(m[2]||1)-1:0));
 show(n,s);
}
function go(n,s=0){
 if(n<1||n>total)return;
 const hash='#'+n+(s?'.'+(s+1):'');
 if(location.hash===hash)route();else location.hash=hash;
}
const autoButton=byId('parentAuto');
let autoPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
let autoTimer;
function scheduleParentPage(){
 clearTimeout(autoTimer);
 if(!autoButton)return;
 const hasNext=slides[page-1]?.classList.contains('parent-chapter')&&page<total;
 autoButton.hidden=!hasNext;
 autoButton.textContent=autoPaused?'자동 넘김 시작':'자동 넘김 일시정지';
 if(hasNext&&!autoPaused&&!document.hidden&&!dialog.open){
  autoTimer=setTimeout(()=>go(page+1),20000);
 }
}
autoButton?.addEventListener('click',()=>{autoPaused=!autoPaused;scheduleParentPage()});
document.addEventListener('visibilitychange',scheduleParentPage);
dialog.addEventListener('close',scheduleParentPage);
function show(n,s){
 const previousStep=step;
 const prevPage=page,oldCenter=isMapDeck&&prevPage>0?slides[prevPage-1].querySelector('.station.selected circle'):null;
 const xy=oldCenter&&[Number(oldCenter.getAttribute('cx')),Number(oldCenter.getAttribute('cy'))];
 if(!page)slides.forEach((item,i)=>{item.hidden=i!==n-1});
 else if(page!==n)slides[page-1].hidden=true;
 page=n;step=s;const slide=slides[n-1];slide.hidden=false;
 if(n===guidePage){
  guidePanels.forEach((panel,i)=>{panel.hidden=i!==s});
  slide.querySelectorAll('[data-step]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===s)));
 }
 if (prevPage === treePage && n !== treePage) finishTree();
 if (treePage && n === treePage && prevPage !== n) startTree();
 if (glossaryPage && n === glossaryPage) selectTerm(s);
 const cueRoot = n === guidePage ? guidePanels[s] : slide;
 if (!isMapDeck && (prevPage !== n || previousStep !== s)) {
  const previousRoot = prevPage === guidePage ? guidePanels[previousStep] : slides[prevPage - 1];
  previousRoot?.classList.remove('cue-active');
  cueRoot.classList.add('cue-active');
 }
 if(isMapDeck){
  slide.innerHTML=sceneHTML(n-1,s);
  drawRoute(slide.querySelector("svg"),n-1,s,prevPage===n?previousStep:null);
  if(xy&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
   const marker=slide.querySelector('.station.selected circle'),cx=Number(marker.getAttribute('cx')),cy=Number(marker.getAttribute('cy'));
   marker.animate([{transform:'translate('+(xy[0]-cx)+'px,'+(xy[1]-cy)+'px)'},{transform:'translate(0,0)'}],{duration:540,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
 }
 byId('count').textContent=n+' / '+total;byId('progress').style.width=(n/total*100)+'%';
 byId('part').textContent=slide.classList.contains('parent-chapter')?'2부　중학생 학부모 진학 안내':!isMapDeck?'1부　대교협 설명회':'2부　학부모 대입 지도';
 byId('prev').disabled=n===1;byId('next').disabled=n===total;
 byId('announce').textContent=n+'장. '+labels[n-1];
 document.title=labels[n-1]+(isMapDeck?' · 2부 학부모 대입 지도':' · 2028 대입 설명회');
 if(prevPage!==n){main.scrollTo(0,0);slide.querySelector('.content')?.scrollTo(0,0)}
 if(dialog.open)dialog.close();
 scheduleParentPage();
}
function showContents(){
 opener=document.activeElement;
 dialog.className='toc';
 byId('paneltitle').textContent='발표 목차';
 const inside=byId('panelbody');inside.replaceChildren();
  if(!isMapDeck){
   const chapters=document.createElement('select');chapters.setAttribute('aria-label','장별 바로 이동');
   chapterLabels.forEach((label,i)=>chapters.add(new Option(label,chapterStarts[i])));
   chapters.value=chapterStarts.filter(k=>k<=page).at(-1);
   chapters.onchange=()=>go(Number(chapters.value));inside.append(chapters);
  }
  const list=document.createElement('div');list.className='tocLinks';
  labels.forEach((label,i)=>{let a=document.createElement('a');a.href='#'+(i+1);a.innerHTML='<b>'+String(i+1).padStart(2,'0')+'</b>';a.append(document.createTextNode(label));if(i+1===page)a.setAttribute('aria-current','page');list.append(a)});inside.append(list);
 clearTimeout(autoTimer);dialog.showModal();dialog.scrollTop=0;
}
function finishTermAnimation() {
 const panel = byId(termTabs[step].getAttribute('aria-controls'));
 const running = panel.getAnimations({subtree: true}).filter(animation => animation.playState === 'running');
 for (const animation of running) animation.finish();
 return running.length > 0;
}
function advance(direction){
 if (direction > 0 && page === glossaryPage && finishTermAnimation()) return;
 if (direction > 0 && page === treePage && treeIndex < treeCards.length) { advanceTree(); return; }
 if (page === glossaryPage && step + direction >= 0 && step + direction < termTabs.length) {
  go(page, step + direction); return;
 }
 if (glossaryPage && page === glossaryPage + 1 && direction < 0) {
  go(glossaryPage, termTabs.length - 1); return;
 }
 if(page===guidePage&&step+direction>=0&&step+direction<guidePanels.length){go(page,step+direction);return}
 if(guidePage&&page===guidePage+1&&direction<0){go(guidePage,guidePanels.length-1);return}
 go(page+direction);
}
byId('prev').onclick=()=>advance(-1);byId('next').onclick=()=>advance(1);
byId('toc').onclick=showContents;
byId('closepanel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>opener?.focus());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();if(e.target.closest('.tocLinks a,.jumpParts a'))dialog.close()});
main.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)go(page,Number(b.dataset.step))});
window.addEventListener('hashchange',route);
window.addEventListener('keydown',e=>{
 if(dialog.open||e.altKey||e.metaKey||e.ctrlKey||e.target.matches('input,select,textarea'))return;
 const next=e.key==='ArrowRight'||e.key==='PageDown'||(e.key===' '&&!e.target.closest('button,a'));
 if(next){e.preventDefault();advance(1)}
 else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();advance(-1)}
 else if(isMapDeck&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();go(page,Math.max(0,Math.min(journey[page-1].steps.length-1,step+(e.key==='ArrowDown'?1:-1))))}
 else if(e.key==='Home'||e.key==='End'){e.preventDefault();go(e.key==='Home'?1:total)}
 else if(e.key.toLowerCase()==='m'){showContents()}
});
// Wide tables scroll independently on phones. Restore the original DOM for desktop and print.
const phoneLayout = matchMedia('screen and (pointer: coarse) and (max-width: 700px), screen and (pointer: coarse) and (orientation: landscape) and (max-height: 550px) and (max-width: 1000px)');
function preparePhoneLayout() {
 if (isMapDeck) return;
 if (!phoneLayout.matches) {
  main.querySelectorAll('.phone-scroll').forEach(box => box.replaceWith(box.firstElementChild));
  main.querySelectorAll('.phone-row-label').forEach(cell => cell.classList.remove('phone-row-label'));
  return;
 }
 main.querySelectorAll('.slide table, .slide .chart, .slide .grade-rows').forEach(item => {
  if (item.tagName === 'TABLE') {
   for (const section of [item.tHead, ...item.tBodies].filter(Boolean)) {
    let occupied = 0;
    for (const row of section.rows) {
     if (occupied > 0) { occupied--; continue; }
     const label = row.cells[0];
     if (!label) continue;
     occupied = label.rowSpan - 1;
     if (label.tagName === 'TH' && label.colSpan === 1 && !item.matches('.cohorts')) {
      label.classList.add('phone-row-label');
     }
    }
   }
  }
  if (item.parentElement.matches('.aligned-scroll, .phone-scroll')) return;
  const box = document.createElement('div');
  box.className = 'phone-scroll';
  item.before(box);
  box.append(item);
 });
}
if (!isMapDeck) {
 preparePhoneLayout();
 phoneLayout.addEventListener('change', preparePhoneLayout);
}

let touch=null;
main.addEventListener('touchstart',e=>{
 const t=e.touches[0],p=e.target.closest(!isMapDeck && phoneLayout.matches ? '.phone-scroll, .aligned-scroll, .content' : '.content');
 touch=e.touches.length===1&&!main.classList.contains('zoom')&&!(p&&p.scrollWidth>p.clientWidth+3)?[t.clientX,t.clientY]:null;
},{passive:true});
main.addEventListener('touchend',e=>{if(!touch||e.changedTouches.length!==1)return;const t=e.changedTouches[0],dx=t.clientX-touch[0],dy=t.clientY-touch[1];touch=null;if(Math.abs(dx)>75&&Math.abs(dx)>Math.abs(dy)*1.8)advance(dx<0?1:-1)},{passive:true});
route();
