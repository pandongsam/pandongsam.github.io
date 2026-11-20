const Game = (() => {
  const subjects = ['국어','영어','수학','통합사회','통합과학'];
  const mockSubjects = [...subjects,'한국사'];
  const bound=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  function noise(seed,key) {
    let h=2166136261;
    for (const c of seed+'|'+key) h=Math.imul(h^c.charCodeAt(0),16777619);
    h=Math.imul(h^(h>>>16),0x85ebca6b); h=Math.imul(h^(h>>>13),0xc2b2ae35);
    return ((h^(h>>>16))>>>0)/4294967296;
  }
const EARLY_LIMIT = 5;
  const category = c => ({교과:'학생부교과',서류:'학생부종합',면접:'학생부종합',논술:'논술'})[c.kind];
  function earlyConflict(r,c){
    return r.early.some(id=>{
      const other=earlyById.get(id);
      return other?.name===c.name&&other.early===c.early;
    });
  }
  function addEarly(r,id){
    if(r.phase!=='early'||r.early.length>=EARLY_LIMIT||r.early.includes(id))return;
    const c=earlyById.get(id);
    if(!c||earlyConflict(r,c)||(c.name==='경희대'&&!r.referred))return;
    r.early.push(id);
  }
  function removeEarly(r,id){
    if(r.phase==='early')r.early=r.early.filter(item=>item!==id);
  }
  const relative=(p,cuts)=>1+cuts.filter(c=>p<c).length;
  const percentile=score=>bound(100/(1+Math.exp(-(score-64)/10.5)),0,100);
  const schoolGrade=v=>relative(percentile(v),[90,66,34,10]);
  function mockGrade(v,i){
    if(i===1)return bound(1+Math.ceil((90-v)/10),1,9);
    if(i===5)return bound(1+Math.ceil((40-Math.round(v/2))/5),1,9);
    return relative(percentile(v),[96,89,77,60,40,23,11,4]);
  }
  // Internal scores sit inside the same grade bands used by the admission model.
  const scoreBands=new Map();
  function gradeBand(grade, subject, school) {
    const gradeOf=school?schoolGrade:score=>mockGrade(score,subject);
    const key=[school,subject,grade].join('/');
    if(!scoreBands.has(key))scoreBands.set(key,Array.from({length:101},(_,n)=>n).filter(score=>gradeOf(score)===grade));
    return scoreBands.get(key);
  }
  function scoreInBand(grade, subject, school, seed) {
    const band=gradeBand(grade,subject,school);
    if(!band.length)throw new RangeError('등급 범위를 확인하세요.');
    const fraction=.25+.5*noise(seed,(school?'school':'exam')+'-band-'+subject);
    return band[Math.floor(fraction*band.length)];
  }
  const pairedBands=[[1,4],[1,5],[3,7],[5,9],[6,9]];
  function makeProfile(mode,input,seed=crypto.getRandomValues(new Uint32Array(1))[0]){
    const draw=key=>noise(seed,key);
    const quiz=mode==='quiz'?input:null;
    const base=quiz?[88,77,65,53][quiz[0]]+(draw('base')-.5)*8:42+draw('base')*55;
    const skew=quiz?[4,-4,0][quiz[1]]:(draw('skew')-.5)*12;
    const language=quiz?[4,-4,0][quiz[2]]:0,inquiry=quiz?[6,-6,0][quiz[4]]:0;
    const signal=index=>quiz?[5,0,-5][quiz[index]]:0;
    const strengths=[language+signal(7),signal(3),-language+signal(6),inquiry,-inquiry,signal(8)]
      .map((v,i)=>base+v+(draw('subject'+i)-.5)*14);
    function candidate(lift){
      const grades=mode==='manual'?input.school.slice():strengths.slice(0,5).map((v,i)=>schoolGrade(bound(v+skew+lift+(draw('school'+i)-.5)*7)));
      const examGrades=mode==='manual'?input.exam.slice():strengths.map((v,i)=>{
        const grade=mockGrade(bound(v-skew+lift+(quiz?[3,0,-4][quiz[5]]:0)+(draw('exam'+i)-.5)*8),i);
        return i===5?grade:bound(grade,...pairedBands[grades[i]-1]);
      });
      if(grades.length!==5||examGrades.length!==6)throw new RangeError('과목별 등급을 확인하세요.');
      const school=grades.map((g,i)=>scoreInBand(g,i,true,seed));
      const scores=examGrades.map((g,i)=>scoreInBand(g,i,false,seed));
      const hidden={};
      ['record','speak','write'].forEach((key,i)=>{
        const answer=quiz?[[9,5,-6],[9,3,-7],[10,3,-7]][i][quiz[i+9]]:0;
        hidden[key]=Math.round(bound(.48*mean(school)+.22*mean(scores)+21+answer+(draw(key)-.5)*24));
      });
      return {version:4,balanceVersion:2,programModel:1,seed,phase:'early',profile:{grades,school,hidden},
        exam:{grades:examGrades,scores},early:[],late:[],referred:false,replay:false,checkpoint:{referred:false},pendingReport:true};
    }
    if(mode==='manual')return candidate(0);
    for(const lift of [0,3,6,9,12,15,24,65]){
      const run=candidate(lift);
      const accepted=new Set();
      for(const c of RegularCases){
        if(outcome(run,c,true).accepted)accepted.add(c.name);
        if(accepted.size>=2)return run;
      }
      for(const c of EarlyCases){
        if(c.name!=='경희대'&&outcome(run,c,false).accepted)accepted.add(c.name);
        if(accepted.size>=2)return run;
      }
    }
    throw new Error('생성된 지원 경로를 확인할 수 없습니다.');
  }
  function minMet(c,g){
    const [k,e,m,s,p,h]=g, t=Math.min(s,p), v=[k,m,e,t].sort((a,b)=>a-b);
    if(c.baseId==='부산대')return m+Math.min(k,e,t)<=5;
    if(c.baseId==='아주대')return v[0]+v[1]<=5;
    if(c.baseId==='경북대')return v[0]+v[1]<=7;
    switch(c.id){
      case 'inha-essay':
      case '아주대':return v[0]+v[1]<=6;
      case 'knu-grades':
      case 'knu-essay':return v[0]+v[1]<=5;
      case 'gachon-grades':{
        const best=[k,e,m,s,p].sort((a,b)=>a-b);
        return best[0]+best[1]<=6;
      }
      case 'donga-grades':return v[0]<=4;
      case 'yonsei-essay':return k+m+t<=6&&e<=3&&h<=4;
      case 'korea-essay':return k+m+e+t<=8&&h<=4;
    }
    switch(c.name){
      case '경희대':return v[0]+v[1]<=5&&h<=5;
      case '경북대':return v[0]+v[1]<=6;
      case '부산대':return v[0]+v[1]+v[2]<=7;
      case '건국대':return [...v,h].sort((a,b)=>a-b).slice(0,3).reduce((a,b)=>a+b,0)<=8;
      case '연세대':return Math.min(k+Math.min(m,s,p),m+Math.min(s,p))<=4&&e<=3&&h<=4;
      default:return true;
    }
  }
  function earlyScore(c,profile,modern){
    const academic=mean(profile.school), {record,speak,write}=profile.hidden;
    if(c.name==='부산대'||c.id==='knu-grades')return .80*academic+.20*(.65*academic+.35*record);
    if(c.name==='경희대')return .70*academic+.30*(.65*academic+.35*record);
    if(c.kind==='교과')return academic;
    if(c.kind==='논술'){
      const exam=.42*academic+.58*write;
      const weight=c.essayWeight??(modern&&c.id==='inha-essay' ? .9 : 1);
      return weight*exam+(1-weight)*academic;
    }
    const document=.70*academic+.30*record;
    if(c.kind!=='면접')return document;
    const share=({'아주대':.3,'동아대':.4,'서울대':.5,'연세대':.3,'가천대':.5,'인천대':.4,'충남대':1/3,'국립공주대':.3,'전북대':.2,'인하대':.3,'전남대':.3})[c.name]??.3;
    return (1-share)*document+share*speak;
  }
  // Spread each integer band over its national relative-grade percentile interval.
  const percentileEdges=[100,96,89,77,60,40,23,11,4,0];
  function gradePercentile(score){
    const grade=mockGrade(score,0),band=gradeBand(grade,0,false);
    const fraction=(score-band[0]+.5)/band.length;
    return percentileEdges[grade]+fraction*(percentileEdges[grade-1]-percentileEdges[grade]);
  }
  function examComponent(c,k,m,s,p,englishGrade,historyGrade=1){
    const natural=['자연','공학'].includes(c.lateField||c.field),t=Math.max(s,p);
    // Approximate English grade points when the university-specific conversion is unavailable.
    const e=[100,95,85,70,55,40,25,15,5][englishGrade-1];
    switch(c.name){
      case '아주대':return natural?.2*k+.4*m+.1*e+.05*s+.25*p:.25*k+.35*m+.15*e+.2*s+.05*p;
      case '부산대':return natural?.2*k+.3*m+.2*e+.075*s+.225*p:.3*k+.25*m+.2*e+.1875*s+.0625*p;
      case '경북대':return natural?(2*k+3*m+e+s+2*p)/9:(3*k+2*m+e+2*s+p)/9;
      case '서울대':{
        const englishPenalty=[0,.5,2,4,6,8,10,12,14][englishGrade-1];
        return (100*k+120*m+(natural?30:50)*s+(natural?50:30)*p)/300-englishPenalty/3;
      }
      case '연세대':return (3*k+2*m+e+2*s+p)/9;
      case '경희대':return .35*k+.35*m+.3*t;
      case '고려대':{
        const math=natural?240:200,inquiry=natural?200:160;
        const english=[0,1,3,6,12,15,18,21,24][englishGrade-1];
        const history=[0,0,0,0,.2,.4,.6,.8,2][historyGrade-1];
        const weighted=200*k+math*m+inquiry*(s+p)/2;
        // Percentile proxy on a 100-point scale; absolute-grade penalties come from the 1,000-point scale.
        return weighted/(200+math+inquiry)-(english+history)/10;
      }
      case '강원대':return mean([k,e,m,s,p].sort((a,b)=>b-a).slice(0,3));
      case '가천대':{
        const top=[k,e,m,s,p].sort((a,b)=>b-a);
        return (5*top[0]+4*top[1]+3*top[2]+2*top[3])/14;
      }
      case '세명대':{
        const converted=[100,95,80,55,35,25,20,10,5][englishGrade-1];
        return mean([k,converted,m,s,p].sort((a,b)=>b-a).slice(0,2));
      }
      case '한남대':{
        const rest=[natural?k:m,e,t].sort((a,b)=>b-a);
        return ((natural?m:k)+rest[0]+rest[1])/3;
      }
      case '국립공주대':{
        const core=[k,e,t].sort((a,b)=>b-a);
        return c.lateMajor==='수학교육과'?(m+core[0]+core[1])/3:mean([...core,m].sort((a,b)=>b-a).slice(0,3));
      }
      case '전남대':return .4*k+.3*m+.1*e+.1*(s+p);
      case '충남대':return .4*k+.3*m+.15*(s+p)-[0,2,5,8,11,14,18,22,26][englishGrade-1]/3;
      case '전북대':return natural?.2*k+.3*m+.2*e+.05*s+.25*p:.3*k+.2*m+.2*e+.2*s+.1*p;
      case '제주대':return (natural?.2*k+.3*m:.3*k+.2*m)+.2*e+.3*t;
      case '인하대':return natural?.25*k+.35*m+.1*e+.15*(s+p):.35*k+.25*m+.15*e+.125*(s+p);
      case '경상국립대':
      case '충북대':return natural?.2*k+.3*m+.2*e+.1*s+.2*p:.3*k+.2*m+.2*e+.2*s+.1*p;
      case '동아대':return .25*(k+m+e)+.125*(s+p);
      case '인천대':return (natural?.25*k+.35*m:.35*k+.25*m)+.2*e+.2*t;
      case '국립군산대':return (natural?.2*k+.3*m:.3*k+.2*m)+.3*e+.1*(s+p);
      case '건국대':return .45*Math.max(k,m)+.35*Math.min(k,m)+.10*e+.10*t;
      case '조선대':return c.lateMajor==='약학과'?.25*k+.35*m+.15*e+.25*p:.25*k+.3*m+.25*e+.2*t;
      default:return natural?.20*k+.15*e+.35*m+.10*s+.20*p:.30*k+.18*e+.24*m+.18*s+.10*p;
    }
  }
  function benchmarkRange(c){
    const b=regularBenchmarks[c.id],scale=c.name==='세명대'?10:1;
    const values=[b.y24,b.y25].filter(Number.isFinite).map(v=>v/scale);
    if(b.subjects25){
      const [k,m,q1,q2,eng]=b.subjects25;
      // Before the reform, inquiry subjects were electives, not integrated social/science.
      // Preserve the two scores for best-of rules; use their mean for unequal subject weights.
      const avg=(q1+q2)/2;
      const bestOf=['경희대','건국대','국립공주대','강원대','한남대','인천대'].includes(c.name);
      let social=bestOf?q1:avg,science=bestOf?q2:avg;
      if(c.name==='조선대'&&c.lateMajor==='약학과')science=Math.max(q1,q2);
      values.push(examComponent(c,k,m,social,science,eng));
    }
    return [Math.min(...values),Math.max(...values)];
  }
  const regularRanges=new Map(RegularCases.map(c=>[c.id,benchmarkRange(c)]));
  function lateScore(c,scores,profile){
    const [k,e,m,s,p,h]=scores;
    const exam=examComponent(c,gradePercentile(k),gradePercentile(m),gradePercentile(s),
      gradePercentile(p),mockGrade(e,1),mockGrade(h,5));
    const share=({'서울대':.4,'연세대':.1,'경북대':.1,'부산대':.2,'충남대':.15})[c.name]||0;
    if(!share)return exam;
    // A grade-based proxy for document review, centred on an applicant at this program's exam benchmark.
    const referenceGrade=1+(100-mean(regularRanges.get(c.id)))/20;
    const schoolGradeMean=mean(profile.grades);
    return bound(exam+share*2.5*(referenceGrade-schoolGradeMean));
  }
  function subjectReason(c,run){
    const scores=run.exam.scores;
    const full=lateScore(c,scores,run.profile);
    let greatest=0,subject='';
    for(let i=0;i<5;i++){
      const adjusted=scores.slice();
      adjusted[i]=65;
      const difference=full-lateScore(c,adjusted,run.profile);
      if(difference>greatest){greatest=difference;subject=mockSubjects[i];}
    }
    return greatest>.05?'이 모집단위의 반영 방식에서 '+subject+' 성적이 내부 기준점 대비 총점을 가장 많이 높였습니다.':'이 모집단위는 이번 성적의 영역별 반영점수를 합산해 평가합니다.';
  }
  function toggleLate(r,id){
    const c=regularById.get(id),list=r.late;
    if(!c||r.phase!=='late')return;
    if(list.includes(id)){list.splice(list.indexOf(id),1);return;}
    if(list.some(n=>regularById.get(n).group===c.group))return;
    list.push(id);
  }
  function editApplications(r){
    if(r.phase!=='ending')return;
    r.referred=r.checkpoint.referred;
    r.registered=null;
    r.replay=true;
    r.phase='early';
  }
  function submitEarly(r){
    if(r.phase!=='early'||r.early.length>EARLY_LIMIT)return;
    if(results(r).some(row=>row.accepted))r.late=[];
    r.phase=r.early.length?'fill':'late';
  }
  function outcome(r,c,late){
    const key=c.id,modern=r.balanceVersion===2;
    const earlyBase=AdmissionCalibration.early[c.baseId||key];
    const target=(modern&&earlyBase?earlyBase.target:c.target)+(c.earlyShift||0);
    const score=late?lateScore(c,r.exam.scores,r.profile):earlyScore(c,r.profile,modern);
    const draw=key+(late?'정시':'수시');
    // Selective pools share part of the same cohort. Drawing each in isolation
    // would inflate the chance that at least one of three schools offers a place.
    const selective=modern&&['서울대','연세대','고려대'].includes(c.name);
    const localPool=noise(r.seed,draw+'pool');
    const pool=selective ? .55*noise(r.seed,'selective-cohort')+.45*localPool : localPool;
    const cuts=late&&regularRanges.get(key);
    const cutoff=cuts?cuts[0]+pool*(cuts[1]-cuts[0]):target+(pool-.5)*10;
    const margin=score-cutoff;
    const passes=late||minMet(c,r.exam.grades);
    const step=cuts ? 0.35 : 1;
    const waiting=passes&&margin<0&&margin>=-6*step;
    const moved=1+Math.floor(noise(r.seed,draw+'moves')*(selective?2:5)),position=Math.max(1,Math.ceil(-margin/step));
    const status=!passes?'최저 미충족':margin>=0?'최초합격':waiting&&position<=moved?'충원합격':waiting?'예비 종료':'불합격';
    const scale=late&&c.name==='세명대'?10:1;
    const unit=scale===10?' / 1,000점':' / 100점';
    const reason=late?'모의 환산점수 '+(score*scale).toFixed(2)+' · 이번 회차 모의 기준선 '+(cutoff*scale).toFixed(2)+unit:!late&&c.kind==='논술'&&!['최초합격','충원합격'].includes(status)?(!passes?'수능최저 미충족':(c.minimum.includes('없음')?'수능최저 없음':'수능최저 충족')+' · 논술전형 총점 부족'):'';
    return {reason,name:c.name,major:late?(c.lateMajor||c.major):c.major,kind:late?c.group+'군 '+c.late:c.early,status,wait:waiting,position,moved,accepted:['최초합격','충원합격'].includes(status)};
  }
  const results=(r,late=false)=>(late?r.late:r.early).map(id=>outcome(r,late?regularById.get(id):earlyById.get(id),late));
  function saveEnding(r,name){
    r.registered=name;r.phase='ending';
  }
function compareStrategies(r){
    // Each case draws its own competitors. A single early application, or skipping
    // early admissions and filing one regular application, makes each offer reachable.
    const scenarios=[];
    function evaluate(c,late){
      const row=outcome(r,c,late);
      const applied=late?r.late.includes(c.id):r.early.includes(c.id);
      scenarios.push({c,row,late,applied,route:late?'정시':category(c)});
    }
    EarlyCases.filter(c=>c.name!=='경희대'||r.checkpoint.referred).forEach(c=>evaluate(c,false));
    RegularCases.forEach(c=>evaluate(c,true));
    const offers=scenarios.filter(x=>x.row.accepted).sort((a,b)=>
      compareAdmissionOrder(a.c,b.c) || Number(b.applied)-Number(a.applied) ||
      Number(b.row.status==='최초합격')-Number(a.row.status==='최초합격'));
    const best=offers[0];
    const actual=offers.find(x=>x.applied);
    const appliedSchools=new Set(scenarios.filter(x=>x.applied).map(x=>x.c.name));
    const otherMajors=offers.filter(x=>!x.applied&&appliedSchools.has(x.c.name)&&
      !scenarios.some(p=>p.applied&&p.c.name===x.c.name&&p.row.major===x.row.major));
    return {best,actual,otherMajors,equivalent:best?.c.order!=null?offers.filter(x=>x.c.order===best.c.order):[],
      routes:['학생부교과','학생부종합','논술','정시'].map(route=>({
        route,top:offers.find(x=>x.route===route),tested:scenarios.filter(x=>x.route===route).length
      }))};
  }
  return {makeProfile,subjectReason,subjects,mockSubjects,submitEarly,saveEnding,compareStrategies,results,toggleLate,editApplications,category,addEarly,removeEarly,earlyConflict,EARLY_LIMIT,minMet,mean};
})();
