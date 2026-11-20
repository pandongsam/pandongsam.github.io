(() => {
  const $=id=>document.getElementById(id);
  const profileKey='pandong.admissions.v4',tutorialKey='pandong.admissions.introSeen';
  let currentProfile=null,storeOK=true;
  try{
    const saved=JSON.parse(localStorage.getItem(profileKey));
    if(saved?.version===4&&saved.profile&&saved.exam)currentProfile=saved;
  }catch{}
  let r=currentProfile,draftCategory='',draftSchool='',draftId='';
  const save=()=>{try{localStorage.setItem(profileKey,JSON.stringify(r));}catch{storeOK=false;}};
  let seenHint=false;
  try{seenHint=localStorage.getItem(tutorialKey)==='1';}catch{}
  function dismissHint(){
    seenHint=true;
    try{localStorage.setItem(tutorialKey,'1');}catch{}
  }
  const blankEntry=()=>({school:Array(5).fill(2),exam:Array(6).fill(2),answers:[]});
  let entry=blankEntry();
  try{
    const draft=JSON.parse(sessionStorage.getItem('pandong.entryDraft12'));
    if(draft?.school?.length===5&&draft.exam?.length===6&&Array.isArray(draft.answers))entry=draft;
  }catch{}
  function saveDraft(){try{sessionStorage.setItem('pandong.entryDraft12',JSON.stringify(entry));}catch{}}
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn=(label,act,cls='',value='',disabled=false)=>'<button type="button" class="'+cls+'" data-act="'+act+'" data-v="'+esc(value)+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
  const next=(label,act,disabled=false)=>'<div class="actionbar">'+btn(label+'　→',act,'primary','',disabled)+'</div>';
  const head=(k,title,desc='')=>'<div class="eyebrow">'+k+'</div><h1 id="stageTitle" tabindex="-1">'+title+'</h1>'+(desc?'<p class="lead">'+desc+'</p>':'');
  const schoolNames=['국어','영어','수학','사회','과학'];
  const schoolOrder=[0,1,2,3,4], examOrder=[0,2,1,5,3,4];
  const questions=[
    ["평소 시험 성적은?", "상위권", "중상위권", "중위권", "하위권"],
    ["어느 시험이 더 편해요?", "학교 시험", "모의고사", "비슷해요"],
    ["국어와 수학 중 더 편한 건?", "국어", "수학", "비슷해요"],
    ["긴 영어 지문을 읽으면?", "잘 읽혀요", "시간이 걸려요", "자주 막혀요"],
    ["더 자신 있는 탐구는?", "사회", "과학", "비슷해요"],
    ["시험 종료 5분 전에는?", "검토 중", "마지막 문제 푸는 중", "여러 문제 남음"],
    ["낯선 수학 문제를 보면?", "풀이가 떠올라요", "조금 풀어봐야 해요", "시작이 막막해요"],
    ["국어 지문의 핵심은?", "바로 보여요", "다시 읽으면 보여요", "자주 놓쳐요"],
    ["한국사 사건의 순서는?", "잘 떠올라요", "가끔 헷갈려요", "많이 헷갈려요"],
    ["수업 중 궁금한 게 생기면?", "직접 찾아봐요", "선생님께 물어요", "일단 넘어가요"],
    ["내 풀이를 말로 설명하면?", "바로 설명해요", "준비하면 잘해요", "말로는 어려워요"],
    ["내 생각을 글로 쓰면?", "근거까지 잘 써요", "생각은 정리돼요", "쓰는 게 어려워요"]
  ];
  function gradeGroup(exam){
    const title=exam?'수능':'내신',key=exam?'exam':'school',max=exam?9:5;
    const fields=(exam?examOrder:schoolOrder).map(i=>{
      const name=(exam?Game.mockSubjects:schoolNames)[i],value=entry[key][i];
      const numbers=Array.from({length:max},(_,j)=>'<span aria-hidden="true" data-number="'+(j+1)+'" class="'+(value===j+1?'current':'')+'">'+(j+1)+'</span>').join('');
      return '<div class="gradeColumn"><div class="gradeSubject">'+name.replace('통합','통합<wbr>')+'</div>'+
        '<div class="gradeReel" tabindex="0" role="spinbutton" aria-label="'+title+' '+name+' 등급" aria-valuemin="1" aria-valuemax="'+max+'" aria-valuenow="'+value+'" aria-valuetext="'+value+'등급" data-grade="'+key+'" data-index="'+i+'">'+numbers+'</div></div>';
    });
    return '<fieldset class="gradeInput"><legend>'+title+' <small>'+max+'등급제</small></legend><div style="--subjects:'+fields.length+'">'+fields.join('')+'</div></fieldset>';
  }
  function setReelValue(reel,value){
    const clamped=Math.max(1,Math.min(Number(reel.getAttribute('aria-valuemax')),value));
    reel.scrollTop=(clamped-1)*reel.firstElementChild.offsetHeight;
    syncReel(reel);
  }
  function syncReel(reel){
    const height=reel.firstElementChild.offsetHeight;
    if(!height)return;
    const value=Math.max(1,Math.min(reel.children.length,1+Math.round(reel.scrollTop/height)));
    if(Number(reel.getAttribute('aria-valuenow'))!==value){
      reel.setAttribute('aria-valuenow',value);reel.setAttribute('aria-valuetext',value+'등급');
      for(const el of reel.children)el.classList.toggle('current',Number(el.dataset.number)===value);
    }
    const list=entry[reel.dataset.grade],i=Number(reel.dataset.index);
    if(list[i]!==value){list[i]=value;saveDraft();}
  }
  function activateReels(){
    for(const reel of $('manualGrades').querySelectorAll('.gradeReel')){
      setReelValue(reel,entry[reel.dataset.grade][Number(reel.dataset.index)]);
      reel.addEventListener('scroll',()=>syncReel(reel),{passive:true});
      reel.addEventListener('keydown',event=>{
        const current=Number(reel.getAttribute('aria-valuenow'));
        const keys={ArrowUp:current-1,ArrowDown:current+1,Home:1,End:reel.children.length};
        if(!(event.key in keys))return;
        event.preventDefault();setReelValue(reel,keys[event.key]);
      });
      reel.addEventListener('click',event=>{
        const number=event.target.closest('[data-number]');
        if(number)setReelValue(reel,Number(number.dataset.number));
      });
      // Trackpads send small pixel deltas; a mouse notch should advance just one grade.
      let remainder=0,lastWheel=0;
      reel.parentElement.addEventListener('wheel',event=>{
        if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
        event.preventDefault();
        const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?reel.clientHeight:1);
        if(event.timeStamp-lastWheel>220||Math.sign(delta)!==Math.sign(remainder))remainder=0;
        lastWheel=event.timeStamp;remainder+=delta;
        if(Math.abs(remainder)<18)return;
        setReelValue(reel,Number(reel.getAttribute('aria-valuenow'))+Math.sign(remainder));
        remainder=0;
      },{passive:false});
    }
  }
  function renderEntry(route,focus){
    let title,content,back='#',counter='';
    if(route==='manual'){
      title='과목별 등급을 입력하세요';
      content='<p class="gradeHint">숫자를 위아래로 밀거나 휠을 돌려 등급을 맞추세요.</p><form id="manualGrades">'+gradeGroup(false)+gradeGroup(true)+'<button class="primary" type="submit">성적표 보기 →</button></form>';
    }else if(route==='generate'){
      title='성적을 어떻게 만들까요?';
      content='<div class="entryOptions">'+btn('전부 랜덤 생성','randomGrades','entryOption')+
        '<a class="entryOption" href="#quiz1">성향으로 성적 만들기<small>12문항 · 시뮬레이션용 예상 성적</small></a></div>';
    }else{
      const i=Number(route.slice(4))-1,q=questions[i];
      title=q[0];back=i?'#quiz'+i:'#generate';counter='<span>'+(i+1)+' / '+questions.length+'</span>';
      content='<div class="entryOptions quizOptions">'+q.slice(1).map((label,j)=>
        '<button data-act="quizAnswer" data-v="'+j+'" aria-pressed="'+(entry.answers[i]===j)+'">'+label+'</button>').join('')+'</div>';
    }
    $('entryStep').innerHTML='<div class="entryNav"><a aria-label="뒤로가기" href="'+back+'">← 뒤로</a>'+counter+'</div>'+
      '<h1 tabindex="-1" id="entryTitle">'+title+'</h1>'+content;
    if(route==='manual')activateReels();
    if(focus)$('entryTitle').focus({preventScroll:true});
  }
  function beginProfile(mode,input){
    currentProfile=Game.makeProfile(mode,input);
    r=currentProfile;draftCategory='';draftSchool='';draftId='';
    save();entry=blankEntry();saveDraft();location.replace('#play');
  }
  function gradesTable(exam){
    const order=exam?examOrder:schoolOrder, names=exam?Game.mockSubjects:schoolNames,grades=exam?r.exam.grades:r.profile.grades;
    const cols=order.map(i=>'<th scope="col">'+names[i].replace('통합','통합<wbr>')+'</th>').join('');
    const values=order.map(i=>'<td>'+grades[i]+'</td>').join('');
    return '<table><caption>'+(exam?'수능':'내신')+' <small>'+(exam?'9':'5')+'등급제</small></caption><thead><tr>'+cols+'</tr></thead><tbody><tr>'+values+'</tr></tbody></table>';
  }
  function showGrades(){
    $('gradeTables').innerHTML=gradesTable(false)+gradesTable(true);
    $('gradeContinue').textContent=r.pendingReport?'닫고 원서 쓰기':'닫기';
    if(!$('gradeDialog').open)$('gradeDialog').showModal();
    $('gradeContinue').focus();
  }
  $('gradeDialog').addEventListener('close',()=>{
    if(location.hash!=='#play'||!r.profile||!r.pendingReport)return;
    r.pendingReport=false;save();$('stageTitle')?.focus({preventScroll:true});
  });
  function help(){
    const resume=location.hash!=='#play'&&currentProfile?'<p><a href="#play">현재 회차 이어보기 →</a></p>':'';
    dialog('이용 도움말','<h3>어떻게 지원하나요?</h3><p>성적표를 닫고 전형과 대학을 고르세요. 수시 원서는 최대 다섯 장, 정시는 가·나·다군에 한 장씩 담을 수 있습니다.</p><h3>왜 수능 성적을 먼저 보나요?</h3><p>같은 성적으로 원서 전략의 차이를 비교하는 시뮬레이션입니다. 실제 수시는 수능 성적 발표 전에 지원합니다.</p><p>성향 문답은 가상 성적을 만드는 문답입니다. 학생부·면접·논술 역량과 경쟁 조건은 한 회차 동안 고정됩니다.</p>'+resume);
  }
  document.addEventListener('submit',e=>{
    if(e.target.id!=='manualGrades')return;
    e.preventDefault();
    for(const reel of e.target.querySelectorAll('.gradeReel'))syncReel(reel);
    beginProfile('manual',entry);
  });
  function art(id,cl=''){return '<div aria-hidden="true" class="art '+cl+'" style="--ax:'+(id%3*50)+'%;--ay:'+Math.floor(id/3)*50+'%"></div>';}
  function map(){
    const phases=[['early','수시 원서'],['fill','수시 결과'],['late','정시 원서'],['lateResults','정시 결과'],['register','등록'],['ending','지원 결과']];
      const pos=r.phase==='best'?5:phases.findIndex(([phase])=>phase===r.phase);
      $('atlas').innerHTML='<div class="scene">'+art(pos>=4?8:6,'landscape')+'</div><div class="profileTools">'+btn('내 성적표','grades','gradeLink')+btn('처음부터','restart','resetmap')+'</div><ol class="profileRoad">'+phases.map(([phase,label],i)=>'<li '+(i===pos?'aria-current="step"':'')+'>'+label+'</li>').join('')+'</ol>';
  }
  function src(c,late){
    const pages=late?c.latePages:c.pages;
    return '<span class="fine">'+c.name+' 2028학년도 대학입학전형 시행계획 · '+(c.name==='조선대'?(late?'20~21쪽':'15쪽')+', 모집인원표':pages+'쪽')+(c.quotaNote?' · 모집단위별 인원표':'')+'</span>';
  }
const earlyCase=id=>earlyById.get(id);
  const caseTitle=(c,late)=>late?(c.lateMajor||c.major):c.major;
  const caseTrack=(c,late)=>late?c.group+'군 · '+c.late:c.early;
  function availableCases(late){
    return late?RegularCases.filter(c=>c.group===draftCategory):EarlyCases.filter(c=>Game.category(c)===draftCategory);
  }
  function blocked(c,late){
    return late?r.late.some(id=>regularById.get(id).group===c.group):Game.earlyConflict(r,c);
  }
  function schoolRows(search=''){
    const late=r.phase==='late',cases=availableCases(late).slice().sort(compareAdmissionOrder);
    const names=[...new Set(cases.map(c=>c.name))];
    return names.map(name=>{
      const tracks=cases.filter(c=>c.name===name),first=tracks[0];
      const majors=[...new Set(tracks.map(c=>caseTitle(c,late)))].join(' · ');
      if(!(name+majors+first.campus).includes(search.trim()))return '';
      const used=tracks.every(c=>blocked(c,late));
      return '<button class="schoolRow" data-act="chooseSchool" data-v="'+esc(name)+'" '+(used?'disabled':'')+'><span><b>'+name+'</b><small>'+majors+'</small></span><span>'+(used?'선택 완료':tracks.length>1?'선택 ›':'')+'</span></button>';
    }).join('')||'<p class="muted">검색 결과가 없습니다.</p>';
  }
  function selectSchool(name){
    const late=r.phase==='late',rows=availableCases(late).filter(c=>c.name===name);
    const remaining=rows.filter(c=>!blocked(c,late));
    if(!remaining.length)return;
    draftSchool=name;
    if(remaining.length===1){chooseCase(remaining[0],late);return;}
    const buttons=rows.map(c=>'<button class="schoolRow" data-act="track" data-v="'+esc(c.id)+'" '+(blocked(c,late)?'disabled':'')+'><span><b>'+caseTitle(c,late)+'</b><small>'+caseTrack(c,late)+'</small></span></button>').join('');
    dialog(name+' 모집단위 선택',btn('← 대학 목록','schools','quiet')+'<div class="schoolRows">'+buttons+'</div>');
    $('drawer').querySelector('[data-act=track]:not(:disabled)')?.focus();
  }
  function openSchools(){
    if(!draftCategory)return;
    $('drawer').classList.add('schoolSheet');
    dialog(draftCategory+(r.phase==='late'?'군':'')+' 대학 선택','<label class="sheetSearch">대학·학과·지역 검색<input type="search" id="schoolSearch" autocomplete="off" placeholder="예: 인천, 기계공학"></label><div class="schoolRows" id="schoolRows">'+schoolRows()+'</div>');
    if(!matchMedia('(max-width:800px)').matches)$('schoolSearch').focus();
  }
  function applications(late){
    const limit=late?3:Game.EARLY_LIMIT;
    const picked=late?r.late.map(n=>regularById.get(n)):r.early.map(earlyCase);
    const categories=late?['가','나','다']:['학생부교과','학생부종합','논술'];
    const c=earlyCase(draftId);
    const summary=head('2030학년도　/　대입 지원',late?'정시 원서함':'수시 원서함',!late&&!seenHint?'전형을 고른 뒤 대학을 선택하세요.':'');
    let picker='';
    if(picked.length<limit){
      picker='<div class="wizard"><h2>'+(late?'모집군 선택':'전형 선택')+'</h2><div class="routes">'+categories.map(t=>{
        const used=late&&picked.some(c=>c.group===t);
        return '<button data-act="category" data-v="'+t+'" aria-pressed="'+(t===draftCategory)+'" '+(used?'disabled':'')+'>'+t+(late?'군':'')+(used?' · 담음':'')+'</button>';
      }).join('')+'</div>';
      if(draftCategory)picker+='<button id="schoolPicker" class="schoolTrigger" aria-haspopup="dialog" data-act="schools"><span>학교 선택</span><b>'+esc(draftSchool||'대학을 선택하세요')+'　⌄</b></button>';
      if(c?.name==='경희대'&&!r.referred){
        picker+=r.replay?'<p class="fine">이 학생은 학교장 추천을 받지 않아 이 원서를 담을 수 없습니다.</p>':btn('학교장 추천을 받은 학생으로 원서 담기','allowReferral','primary');
      }
      picker+='</div>';
    }
    const basket='<section class="basket"><div class="sectionhead"><h2>내 원서</h2><b>'+picked.length+' / '+limit+'장</b></div>'+
      (picked.length?picked.map(c=>'<div class="basketline"><div><strong>'+c.name+' '+caseTitle(c,late)+'</strong><small>'+caseTrack(c,late)+'</small></div><div>'+btn('상세','caseDetails','quiet',c.id)+btn('삭제','removeCase','quiet',c.id)+'</div></div>').join(''):'<p class="muted">담은 원서가 없습니다.</p>')+'</section>';
    return summary+picker+basket+(picked.length>limit?'<p>이전 버전에서 담은 원서를 다섯 장 이하로 정리하면 제출할 수 있습니다.</p>':'')+(picked.length?next((late?'정시':'수시')+' 원서 '+picked.length+'장 제출',late?'submitLate':'submitEarly',picked.length>limit):'<div class="actionbar skipAction">'+btn(late?'정시 지원 건너뛰기':'수시 없이 정시 준비하기',late?'submitLate':'submitEarly','thin')+'</div>');
  }
  let toastTimer;
  function chooseCase(c,late){
    if(!c||blocked(c,late))return;
    if($('drawer').open)$('drawer').close();
    if(!late&&c.name==='경희대'&&!r.referred){
      draftId=c.id;render();$('desk').querySelector('[data-act="allowReferral"]')?.focus({preventScroll:true});return;
    }
    if(late){
      Game.toggleLate(r,c.id);
      draftCategory='';
    }else Game.addEarly(r,c.id);
    draftSchool='';draftId='';render();
    clearTimeout(toastTimer);
    const toast=$('addedNotice');
    toast.textContent=c.name+' '+caseTitle(c,late)+' · 원서함에 담았습니다.';
    toastTimer=setTimeout(()=>{toast.textContent='';},2300);
    const id=c.id;
    $('desk').querySelector('[data-act="caseDetails"][data-v="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});
  }
  function regularBasis(c,sourceUrl){
    const b=regularBenchmarks[c.id];
    const link=(year,label)=>'<a href="'+sourceUrl.replace('searchSyr=2025','searchSyr='+(year+1))+'" target="_blank" rel="noopener">'+year+'학년도 공개표</a> · '+label;
    const scalar=(v,average)=>c.name==='세명대'?'최종합격자 80% 지점 '+v+' / 1,000점':
      (average?'국어·수학·탐구 공개값 평균':c.name==='가천대'?'대학 공개 70% 지점':'등록자 70% 지점 평균 백분위')+' '+v.toFixed(2);
    const lines=[];
    if(b.y24!=null)lines.push(link(2024,scalar(b.y24,b.avg24)));
    if(b.y25!=null)lines.push(link(2025,b.sum25?'백분위 합 70% 지점 '+Math.round(b.y25*3)+' / 300점 (영역 평균 '+b.y25.toFixed(2)+')':scalar(b.y25,false)));
    if(b.subjects25){
      const [k,m,q1,q2,e]=b.subjects25;
      const inquiry=b.inquiryAverage?'탐구 평균 '+q1:b.oneInquiry?'탐구 '+q1:'탐구 '+q1+'·'+q2;
      lines.push(link(2025,'등록자 70% 지점 성적 · 국어 '+k+', 수학 '+m+', '+inquiry+', 영어 '+e+'등급'));
    }
    if(b.note)lines.push(b.note);
    lines.push('입력한 등급을 점수로 추정하고 과거 입결을 참고해 모의 기준선을 정합니다. 과목별 자료는 모집단위 반영 방식으로 다시 계산합니다. 실제 합격선은 해마다 달라집니다.');
    return lines.map(line=>'<p class="fine">'+line+'</p>').join('');
  }
  function caseDetails(id){
    const late=r.phase==='late',c=late?regularById.get(id):earlyCase(id);
    if(!c)return;
    const sourceUrl='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&amp;searchSyr=2025&amp;unvCd='+c.adigaCode;
    const measure=c.name==='세명대'?'교과 환산등급 80%컷':'최종등록자 교과등급 70%컷';
    const earlyBasis=c.baseId?(c.schoolCut?'2024학년도 해당 모집단위 '+measure+' '+c.schoolCut+' · 과거 전형 참고':'이 모집단위는 공개 비교값이 부족해 대학의 시뮬레이션 기준선을 적용합니다.'):(AdmissionCalibration.early[c.id]?.basis||'시뮬레이션 추정 경쟁선');
    const basis=late?regularBasis(c,sourceUrl):'<p class="fine">'+earlyBasis+' <a href="'+sourceUrl+'" target="_blank" rel="noopener">어디가 공개표</a></p>';
    const description=late?c.lateRule||'대학별 수능 반영 영역과 환산 방법은 시행계획을 확인하세요.':c.rule;
    dialog(c.name+' '+caseTitle(c,late),'<h3>'+caseTrack(c,late)+'</h3><p>'+description+'</p><p>'+(late?'고교 졸업예정 및 해당 수능 응시':c.minimum)+'</p><p>'+src(c,late)+'</p>'+basis+'<p><a href="'+PlanSources[c.name]+'" target="_blank" rel="noopener">2028 시행계획 자료</a></p>');
  }
  function notices(rows){
    return rows.length?rows.map(x=>'<div class="notice"><div><b>'+x.name+' '+x.major+'</b><small>'+x.kind+'</small>'+(x.reason?'<small class="decisionReason">'+x.reason+'</small>':'')+'</div><strong class="'+(x.accepted?'success':'')+'">'+x.status+'</strong>'+(x.wait?'<p>예비 '+x.position+'번 · '+x.moved+'번까지 충원</p>':'')+'</div>').join(''):'<p class="muted">제출한 원서가 없습니다.</p>';
  }
  function outcomePage(){
    const late=r.phase==='lateResults',rows=Game.results(r,late),accepted=rows.some(x=>x.accepted);
    const note=late?'가상 지원자의 성적과 충원 이동을 반영했습니다.':accepted?'수시 최초·충원 합격자는 등록 여부와 관계없이 정시에 지원할 수 없습니다.':'수시 합격이 없어 정시 원서를 낼 수 있습니다.';
    return head('2030학년도　/　합격 발표',late?'정시 최종 결과':'수시 최종 결과',note)+notices(rows)+next(late||accepted?'등록 선택하기':'정시 원서함 열기',late||accepted?'register':'late');
  }
  function register(){
    const accepted=[...Game.results(r),...Game.results(r,true)].filter(x=>x.accepted);
    const offers=[...new Map(accepted.map(x=>[x.name+' '+x.major,x])).values()];
    return head('2030학년도　/　최종 등록',offers.length?'등록할 대학을 선택하세요.':'이번 원서 접수가 끝났습니다.',offers.length?'합격한 모집단위 중 한 곳에 등록할 수 있습니다.':'이번 회차를 마치면 같은 성적에서 가능했던 다른 전형을 비교할 수 있습니다.')+
    (offers.length?'<div class="registerActions">'+btn('등록 포기','enroll','thin','')+
      '<div class="offers">'+offers.map(x=>btn(x.name+' '+x.major+'　등록 →','enroll','offer',x.name+' '+x.major)).join('')+'</div></div>':
      next('결과 정리하기','enroll'));
  }
function ending(){
    const rows=[...Game.results(r),...Game.results(r,true)];
    return head('2030학년도　/　내 지원 결과',r.registered?esc(r.registered)+' 등록':'미등록으로 마쳤습니다.',
      '원서 선택만 바꾸면 어떤 대학과 전형에서 합격할 수 있었을까요?')+
      notices(rows)+'<div class="actionbar resultActions">'+btn('입시선택으로 돌아가기','editApplications')+
      btn('최선의 선택 보기 →','best','primary')+'</div>';
  }
  const offerTitle=x=>x.row.name+' '+x.row.major;
  const offerTrack=x=>(x.late?'정시':'수시')+' · '+x.row.kind;
  const rankLabel=c=>c.order===null?'입결 비교 제외':'참여 대학 중 입결 '+c.order+'위 · '+c.admissionPercentile.toFixed(2);
  function offerCard(label,x,extra=''){
    return '<section class="offerCard"><small>'+label+'</small><h2>'+(x?offerTitle(x):'합격 사례 없음')+'</h2>'+
      (x?'<p>'+offerTrack(x)+'</p><b>'+x.row.status+' · '+rankLabel(x.c)+'</b>':'')+extra+'</section>';
  }
  function strategyReason(x){
    const c=x.c;
    const school=Game.mean(r.profile.grades).toFixed(1);
    if(x.late){
      const exam=r.exam.grades.map((v,i)=>Game.mockSubjects[i]+' '+v+'등급').join(' · ');
      return '<p><b>성적 반영</b>　'+exam+'. 이 성적을 '+c.group+'군 '+c.name+' '+x.row.major+'에 반영하면 '+x.row.status+'입니다. '+Game.subjectReason(c,r)+'</p>'+
        '<p><b>원서 전략</b>　'+(Game.results(r).some(y=>y.accepted)?
        '이번에는 수시 합격으로 정시 원서함이 닫혔습니다. 이 결과를 얻는 한 가지 경로는 수시를 건너뛰고 해당 군에 지원하는 것입니다.':
        '수시를 건너뛰거나 수시 합격이 없는 경우에 열리는 경로입니다. '+c.group+'군의 한 장을 이 모집단위에 배정합니다.')+'</p>';
    }
    const factor={교과:'교과 성적 중심',서류:'교과 성적과 학생부 탐구 기록',면접:'교과 성적·학생부 기록·면접',논술:'모의 논술 점수와 해당 대학의 반영 비율'}[c.kind];
      const minimum=c.minimum.includes('없음')?'수능최저가 없는 전형입니다.':'이번 수능 등급으로 '+c.minimum+' 조건을 충족했습니다.';
      return '<p><b>성적 반영</b>　내신 평균 '+school+'등급입니다. '+c.name+' '+c.early+'의 평가 요소는 '+factor+'입니다. 이번 결과는 '+x.row.status+'입니다.</p><p><b>지원 조건</b>　'+minimum+'</p>';
  }
function decisionDifference(x){
    if(x.applied)return '내가 제출한 원서에 이 전형이 포함되어 있습니다.';
    if(x.late){
      const earlyOffer=Game.results(r).find(o=>o.accepted);
      if(earlyOffer)return '내 원서에서는 '+earlyOffer.name+' '+earlyOffer.kind+'에 '+earlyOffer.status+'해 정시 지원이 마감됐습니다.';
      const occupied=r.late.map(n=>regularById.get(n)).find(c=>c.group===x.c.group);
      return occupied?'내가 제출한 '+x.c.group+'군 원서는 '+occupied.name+' '+(occupied.lateMajor||occupied.major)+'였습니다. 같은 군의 한 장을 바꾸면 비교 결과에 도달합니다.':
        '내가 비워 둔 '+x.c.group+'군에 지원할 기회가 있었습니다.';
    }
    const sameSchool=Game.results(r).find(o=>o.name===x.c.name);
    if(sameSchool)return '나는 같은 대학의 '+sameSchool.major+' '+sameSchool.kind+'을 선택해 '+sameSchool.status+' 결과를 받았습니다. 비교 원서는 '+x.row.major+' '+x.row.kind+'입니다.';
    const missed=Game.results(r).filter(o=>o.status==='최저 미충족').length;
    if(missed)return '내 수시 원서 중 '+missed+'장은 수능최저를 충족하지 못했습니다. 아래 전형에서는 이 학생이 지원 조건을 충족했습니다.';
    return r.early.length===Game.EARLY_LIMIT?'수시 다섯 장을 모두 사용했습니다. 한 장을 이 전형으로 바꾸면 같은 학생부로 다른 결과를 얻을 수 있었습니다.':
      '내 수시 원서에는 이 전형이 없었습니다. 남은 원서 한 장으로 지원할 수 있었습니다.';
  }


  function bestPage(){
    const {best,actual,otherMajors,equivalent,routes}=Game.compareStrategies(r);
    const same=best&&actual&&actual.c.order===best.c.order;
    const comparison=!best?'이번 성적과 경쟁 조건에서는 지원 가능한 사례를 모두 확인해도 합격 결과가 없습니다.':
      best.c.order===null?'합격 가능한 대학은 있습니다. 해당 대학은 같은 기준의 입결 비교가 어려워 사례로만 표시합니다.':
      same?'입결 기준으로 가장 높은 대학에 합격하는 원서를 이미 선택했습니다.':
      actual&&actual.c.order===null?'내 합격 대학에는 비교값이 없습니다. 같은 성적으로 가능한 다른 대학의 입결을 함께 확인하세요.':
      actual?'합격 가능한 대학이 시뮬레이션 내 입결 '+actual.c.order+'위에서 '+best.c.order+'위로, '+(actual.c.order-best.c.order)+'계단 달라질 수 있었습니다.':
      '내 원서에서는 합격이 없었지만, 같은 성적으로 합격할 수 있었던 전형이 있습니다.';
    const routeList=routes.map(({route,top,tested})=>'<li><strong>'+route+'</strong><div>'+(top?'<b>'+offerTitle(top)+'</b><small>'+top.row.kind+' · '+top.row.status+'</small>':'<span>합격 사례 없음</span>')+'</div><small>'+tested+'개 검토</small></li>').join('');
    const alternatives=equivalent.filter(x=>x!==best).map(x=>offerTitle(x)+' · '+offerTrack(x)+' ('+x.row.status+')');
    return head('2030학년도　/　지원 전략 비교','같은 성적, 최선의 선택',comparison)+
      '<div class="strategyPair">'+offerCard(actual?.c.order===null?'내가 낸 원서의 합격 사례':'내가 낸 원서 중 최고 합격',actual,'<p class="registration">최종 등록 · '+esc(r.registered||'미등록')+'</p>')+
      offerCard(best?.c.order===null?'전체 원서에서 가능한 합격 사례':'전체 원서 중 최고 합격',best)+'</div>'+
      (best?'<section class="strategyReason"><h2>이 전형을 선택했다면</h2><p><b>내 선택과의 차이</b>　'+decisionDifference(best)+'</p>'+strategyReason(best)+
        (alternatives.length?'<p><b>같은 순위의 다른 선택</b>　'+alternatives.join(' / ')+'</p>':'')+'</section>':'')+
      (otherMajors.length?'<details class="majorAlternatives"><summary>내가 지원한 대학의 다른 합격 가능 학과</summary><ul>'+otherMajors.map(x=>'<li><b>'+offerTitle(x)+'</b> · '+offerTrack(x)+' · '+x.row.status+'</li>').join('')+'</ul></details>':'')+
      '<h2 class="routeHeading">전형별로 어디까지 가능했을까요?</h2><ul class="routeResults">'+routeList+'</ul>'+
      '<p class="fine basis">수시는 고3 1학기까지의 학생부와 저장된 추천 자격을, 정시는 수시 합격이 없는 경로를 적용했습니다. 성적·경쟁자·충원은 이번 회차와 같습니다. 2024 정시 일반전형 모집단위별 70%컷 백분위의 중앙값으로 대학을 비교합니다. ‘최선’은 이 지표가 가장 높은 합격 사례입니다. 개별 학과의 합격선은 다를 수 있습니다. 각 행은 따로 선택했을 때의 사후 결과입니다.</p>'+
      '<div class="actionbar resultActions">'+btn('내 지원 결과로 돌아가기','ending','thin')+
      btn('입시설명회 참석하기','openInvite','primary')+'</div>';
  }
  function render(focus=false){
    $('desk').dataset.phase=r?.phase;
    map();const fn={early:()=>applications(false),fill:outcomePage,late:()=>applications(true),lateResults:outcomePage,register,ending,best:bestPage};
    $('desk').innerHTML=fn[r.phase]();save();
    $('persist').textContent=storeOK?'이 기기에 자동 저장':'이 브라우저는 자동 저장을 지원하지 않습니다.';
    if(focus){window.scrollTo(0,0);$('stageTitle')?.focus({preventScroll:true});}
  }
  function dialog(title,html){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=html;if(!$('drawer').open)$('drawer').showModal();}
  function sources(){
    dialog('공식 전형과 시뮬레이션의 가정','<p>2026년 중3 학생이 2030학년도에 지원하는 가상 상황입니다. 대학 사례는 2028학년도 시행계획을 사용합니다. 2030학년도 실제 전형은 해당 연도 모집요강을 확인하세요.</p><p>학생은 국내 일반고 전 과정을 이수하고 수능 6개 과목에 응시합니다. 수시는 학생부교과·학생부종합·논술 사례에서 게임용 원서 5장을 고릅니다. 실제 일반대학 수시 지원 한도는 원칙적으로 6회입니다. 같은 대학의 복수지원 가능 여부는 해당 연도 모집요강을 확인하세요.</p><p>대학별 반영 구조를 등급 기반 내부 점수로 근사합니다. 실제 표준점수·가감점과 다른 모의 점수입니다. 자동 생성 학생은 같은 과목의 내신과 수능을 연동하고 두 대학 이상에 합격 가능한 경로를 확인합니다. 내부 점수와 경쟁선·지원자·예비 이동은 시뮬레이션에서 생성합니다. 공개 입시결과가 있는 사례는 원서 상세에 과거 연도와 지표를 적었습니다. 게임의 경쟁선과 합격 결과는 모의 수치입니다. 정시 모의 기준선은 모집단위별 2024·2025학년도 공개 자료를 기준으로 합니다. 한 학년도만 비교할 수 있으면 그 해의 값을 사용합니다. 교과·서류평가의 영향은 입력한 내신 등급으로 추정합니다. 새 회차의 학생부·면접·논술 역량은 성적표를 만들 때 함께 정해지며, 다시 지원할 때도 같습니다.</p><p class="fine">자료 · 교육부 「2028 대학입시제도 개편 확정안」, 한국대학교육협의회 「2028학년도 대학입학전형기본사항」.</p><details class="rankBasis"><summary>대학 정렬 기준과 입결 자료</summary><p>대입정보포털 어디가의 2024학년도 정시 일반전형 결과를 사용합니다. 각 대학이 공개한 모집단위별 최종등록자 70%컷 백분위를 한 줄당 한 값으로 집계한 중앙값입니다. 모집인원으로 가중하지 않으며 대학별 반영 과목과 방식은 다를 수 있습니다.</p><p>조선대는 세 영역 공개값의 평균을 사용했습니다. 강원대 사례는 통합 전 국립강릉원주대 자료입니다. 경북대는 백분위 합의 산출 기준을 동일하게 확인하기 어려웠고, 세명대는 80%컷 환산점수만 공개해 두 대학은 입결 비교에서 제외했습니다.</p>'+Admissions.slice().sort(compareAdmissionOrder).map(c=>'<p class="fine"><a href="https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&amp;searchSyr=2025&amp;unvCd='+c.adigaCode+'" target="_blank" rel="noopener">'+c.name+' 공개표</a> · '+rankLabel(c)+(c.rankSample?' · 모집단위 '+c.rankSample+'건':'')+'</p>').join('')+'</details>'+Admissions.map(c=>'<p><b>'+c.name+'</b><br>'+EarlyCases.filter(track=>track.name===c.name).map(track=>track.major+' · '+track.early+' · '+src(track,false)).join('<br>')+'<br>'+RegularCases.filter(track=>track.name===c.name).map(track=>track.group+'군 '+caseTitle(track,true)+' · '+src(track,true)).join('<br>')+'</p>').join(''));
  }
  const invite=$('seminarInvite');
  const hiddenDayKey='pandong.seminar.hiddenDay';
  let hiddenDay='',inviteOpener=null;
  function closeInvite(){
    invite.close();
    (inviteOpener?.isConnected?inviteOpener:$('stageTitle'))?.focus({preventScroll:true});
    inviteOpener=null;
  }
  function showInvite(opener=null){
    if(location.hash!=='#play'||r.phase!=='best')return;
    let savedDay;
    try{savedDay=localStorage.getItem(hiddenDayKey);}catch{}
    const today=new Date().toDateString();
    if(!opener&&(savedDay===today||hiddenDay===today)){
      if(invite.open&&!inviteOpener)closeInvite();
      return;
    }
    if(!invite.open){inviteOpener=opener;invite.showModal();}
  }
  $('dismissInvite').addEventListener('click',closeInvite);
  $('hideInviteToday').addEventListener('click',()=>{
    hiddenDay=new Date().toDateString();
    try{localStorage.setItem(hiddenDayKey,hiddenDay);}catch{}
    closeInvite();
  });
  window.addEventListener('storage',event=>{
    if(event.key===hiddenDayKey&&invite.open)showInvite();
  });
  invite.addEventListener('cancel',event=>event.preventDefault());
  window.addEventListener('pageshow',event=>{if(event.persisted)showInvite();});
  function navigate(phase){
    draftCategory='';draftSchool='';draftId='';r.phase=phase;
    render(true);showInvite();
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-act]');if(!el)return;
    const act=el.dataset.act,v=el.dataset.v,phase=r?.phase;
    if(act==='openInvite'){showInvite(el);return;}
    if(act==='help'){help();return;}
    if(act==='randomGrades'){beginProfile('random');return;}
    if(act==='quizAnswer'){
      const index=Number(location.hash.slice(5))-1;
      if(!questions[index])return;
      entry.answers[index]=Number(v);saveDraft();
      if(index===questions.length-1)beginProfile('quiz',entry.answers);
      else location.hash='quiz'+(index+2);
      return;
    }
    if(act==='grades'){showGrades();return;}
    if(act==='closeGrades'){$('gradeDialog').close();return;}
    if(act==='category'){
      if(r.profile&&r.phase==='early')dismissHint();
      draftCategory=v;draftSchool='';draftId='';render();openSchools();return;
    }
    if(act==='schools'){openSchools();return;}
    if(act==='chooseSchool'){selectSchool(v);return;}
    if(act==='track'){chooseCase((phase==='late'?regularById:earlyById).get(v),phase==='late');return;}
    if(act==='allowReferral'&&!r.replay&&earlyCase(draftId)?.name==='경희대'){
      r.referred=true;r.checkpoint.referred=true;chooseCase(earlyCase(draftId),false);return;
    }
    if(act==='caseDetails'){caseDetails(v);return;}
    if(act==='removeCase'){
      if(phase==='late'&&r.late.includes(v)){Game.toggleLate(r,v);draftCategory='';}
      else if(phase==='early')Game.removeEarly(r,v);
      draftSchool='';draftId='';render();return;
    }
    if(act==='sources'){sources();return;} if(act==='close'){$('drawer').close();return;}
    if(act==='restart'){dialog('새 학생으로 시작할까요?','<p>이 기기의 현재 성적표와 지원 비교 기록을 새 학생의 기록으로 교체합니다.</p>'+btn('현재 학생 유지','close','thin')+' '+btn('새 학생 만들기','confirmRestart','primary'));return;}
    if(act==='confirmRestart'){$('drawer').close();entry=blankEntry();saveDraft();location.hash='';return;}
    switch(act){
      case 'submitEarly':Game.submitEarly(r);break;
      case 'submitLate':navigate('lateResults');return;
      case 'enroll':Game.saveEnding(r,v);break;
      case 'editApplications':if(phase==='ending'){Game.editApplications(r);navigate(r.phase);}return;
      case 'best':if(phase==='ending')navigate('best');return;
      case 'ending':if(phase==='best')navigate('ending');return;
      case 'fill':case 'register':case 'late':navigate(act);return;
      default:return;
    }
    navigate(r.phase);
  });
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='schoolSearch'){$('schoolRows').innerHTML=schoolRows(t.value);return;}
  });
  $('drawer').addEventListener('close',()=>{
    if($('drawer').classList.contains('schoolSheet')){
      $('drawer').classList.remove('schoolSheet');
      if(!draftSchool)$('schoolPicker')?.focus({preventScroll:true});
    }
  });
  function displayEntry(focus){
    let route=location.hash.slice(1);
    const quizRoute=/^quiz(?:[1-9]|1[0-2])$/.test(route);
    if(quizRoute&&Number(route.slice(4))>entry.answers.length+1){
      location.replace('#quiz'+(entry.answers.length+1));return;
    }
    const playing=route==='play'&&!!currentProfile;
    const step=route==='generate'||route==='manual'||quizRoute;
    for(const modal of document.querySelectorAll('dialog[open]'))modal.close();
    $('welcome').hidden=playing||step;
    $('entryStep').hidden=!step;
    $('gameScreen').hidden=!playing;
    $('gameFooter').hidden=!playing;
    if(playing){
      r=currentProfile;render(focus);
      if(r.pendingReport)showGrades();else showInvite();
    }else if(step){renderEntry(route,focus);}
    else if(focus)$('welcomeTitle').focus({preventScroll:true});
    if(focus)window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',()=>displayEntry(true));
  displayEntry(false);
})();
