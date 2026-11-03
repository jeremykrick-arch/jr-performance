const JR_RENDERED_VIDEOS={};
'use strict';
// Compatibility with older iOS Safari releases.
if(typeof globalThis.structuredClone!=='function'){globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));}
const DAYS=['Monday','Thursday','Saturday'], WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DEFAULT_SCHEDULE=[
{id:'mon-gym',day:'Monday',time:'Flexible',name:'Functional lower-body strength + acceleration',type:'workout'},
{id:'tue-pitch',day:'Tuesday',time:'4:30 PM',name:'Pitching with Coach Taylor',type:'baseball'},
{id:'wed-practice',day:'Wednesday',time:'7:15 PM',name:'Team practice',type:'baseball'},
{id:'thu-gym',day:'Thursday',time:'Before 7:00 PM',name:'Upper-body strength + stability',type:'workout'},
{id:'thu-hit',day:'Thursday',time:'7:00 PM',name:'Hitting with Dan Kennon',type:'baseball'},
{id:'fri-recover',day:'Friday',time:'Flexible',name:'Recovery and mobility',type:'recovery'},
{id:'sat-gym',day:'Saturday',time:'Flexible',name:'Total-body strength + lateral and rotational power',type:'workout'},
{id:'sun-practice',day:'Sunday',time:'11:00 AM',name:'Team practice',type:'baseball'}];

// Every-other-Tuesday pitching cycle. Default first lesson: Tuesday, Nov 3, 2026.
// The anchor can be changed in Settings later without modifying workout history.
const PITCH_ANCHOR_DEFAULT='2026-11-03';
const PROGRAM_START='2026-11-02';
function programDayDate(w,d){const offset={Monday:0,Thursday:3,Saturday:5}[d]||0;const x=new Date(PROGRAM_START+'T12:00:00');x.setDate(x.getDate()+(w-1)*7+offset);return dateKeyLocal(x)}
function programWeekForDate(dateStr){const x=new Date(dateStr+'T12:00:00'),start=new Date(PROGRAM_START+'T12:00:00');return Math.max(1,Math.min(12,Math.floor((x-start)/604800000)+1))}

function pitchingAnchor(){return /^\d{4}-\d{2}-\d{2}$/.test(db.settings.pitchAnchor||'')?db.settings.pitchAnchor:PITCH_ANCHOR_DEFAULT}
function pitchingOnDate(dateStr){if(!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))return false;const date=new Date(dateStr+'T12:00:00'),anchor=new Date(pitchingAnchor()+'T12:00:00');if(date.getDay()!==2||anchor.getDay()!==2)return false;const weeks=Math.round((date-anchor)/604800000);return weeks%2===0}
function pitchingWeek(w){const monday=programDayDate(w,'Monday');return pitchingOnDate(scheduleDateForDay(monday,'Tuesday'))} // Align workload with actual pitching calendar.
function scheduleDateForDay(reference,weekday){const d=new Date(reference+'T12:00:00'),offset=(d.getDay()+6)%7;d.setDate(d.getDate()-offset+(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(weekday)));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function setPitchAnchor(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T12:00:00').getDay()!==2){toast('Select a Tuesday for the first pitching lesson.');return}db.settings.pitchAnchor=value;save();render();toast('Pitching schedule updated')}

const KEY='jr-performance-v1';
const base={sessions:{},tests:{},start:'',notes:{},readiness:{},baseball:{},schedule:DEFAULT_SCHEDULE,settings:{rest:90,autoRest:true,week:1},extraEvents:[]};
let db=structuredClone(base);try{let saved=JSON.parse(localStorage.getItem(KEY)||'{}');db={...db,...saved,settings:{...base.settings,...saved.settings},schedule:Array.isArray(saved.schedule)?saved.schedule:DEFAULT_SCHEDULE};}catch(e){console.warn('Unable to load saved workouts',e)}
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const ev of db.schedule){if(ev.id==='mon-gym'&&ev.name==='Lower-body strength + acceleration')ev.name='Functional lower-body strength + acceleration';if(ev.id==='sat-gym'&&ev.name==='Total-body strength + rotational power')ev.name='Total-body strength + lateral and rotational power';if(ev.id==='sat-gym'&&ev.name==='Total-body strength + agility')ev.name='Total-body strength + lateral and rotational power';}
let offsznAuthRole=null;
let tab='home',workoutFocus=false,week=Math.max(1,Math.min(12,Number(db.settings.week)||programWeekForDate(localWorkoutDate()))),day='Monday',view='athlete',selectedDate=new Date().toISOString().slice(0,10),restRemaining=0,restInterval=null,toastTimer=null,syncTimer=null,authToken=null,authUser=null;
function save(){db.settings.week=week;try{localStorage.setItem(offsznActiveDataKey||KEY,JSON.stringify(db))}catch(e){toast('Storage full. Export a backup.')}if(offsznSyncEnabled)offsznQueueSync()}
function session(w,d){const x=db.sessions?.[`${w}-${d}`];return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}function ensureSession(w,d){if(!db.sessions||typeof db.sessions!=='object'||Array.isArray(db.sessions))db.sessions={};const k=`${w}-${d}`;if(!db.sessions[k]||typeof db.sessions[k]!=='object'||Array.isArray(db.sessions[k]))db.sessions[k]={};return db.sessions[k]}function finished(w,d){return !!session(w,d).finished}
function target(w,e){let [n,r]=[e[2],e[3]];if(pitchingWeek(w)&&e&&['10-yard acceleration sprint','Broad jump','Trap bar deadlift','Bulgarian split squat'].includes(e[0]))n=Math.min(n,2);if(['Trap bar deadlift','Barbell front squat','Dumbbell bench press'].includes(e[0])){if(w===4)return[2,8];if(w===8)return[2,6];if(w===12)return[2,5];if(w>=9)return[3,6];if(w>=5)return[3,8]}if([4,8,12].includes(w)&&e[1]!=='Warm-up')n=Math.max(1,Math.ceil(n*.65));return[n,r]}
function phase(w){return[4,8,12].includes(w)?'Recovery / Assessment':w<=3?'Foundation & Muscle':w<=7?'Strength Development':'Strength & Power'}
function localWorkoutDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function today(){return WEEKDAYS[new Date().getDay()]}
function completedCount(){return Object.values(db.sessions).filter(x=>x.finished).length}
function sessionCompletion(w,d){let done=0,total=0;for(let {exercise:e,index:i} of orderedWorkoutExercises(d,w)){if(movementStatus(i,w,d)!=="active")continue;let [n]=target(w,e);n+=Number(session(w,d).extraSets?.[e[0]]||0);total+=n;done+=(session(w,d).items?.[e[0]]?.sets||[]).slice(0,n).filter(x=>(x&&x.done)).length}return[done,total]}
function latest(w,d,name){for(let i=w-1;i>=1;i--){let a=session(i,d).items?.[name]?.sets||[];let valid=a.filter(x=>(x&&x.done)&&Number((x&&x.reps))>0);if(valid.length)return{week:i,sets:valid,s:session(i,d)}}return null}
function best(name,exclude){let b=0;for(let w=1;w<=12;w++)for(let d of DAYS){let sets=session(w,d).items?.[name]?.sets||[];sets.forEach((x,j)=>{if(exclude&&exclude.w===w&&exclude.d===d&&exclude.j===j)return;if((x&&x.done)&&Number((x&&x.reps))>0&&Number((x&&x.weight))>b)b=Number((x&&x.weight))})}return b}
function readiness(w,d){return db.readiness[`${w}-${d}`]||{}}
function readinessState(w,d){let r=readiness(w,d);let recentPain=Object.entries(db.baseball).some(([date,entries])=>{let age=(Date.now()-new Date(date+'T12:00:00').getTime())/86400000;return age>=-1&&age<=3&&entries.some(x=>(x&&x.pain)==='Yes')});if(r.pain==='yes'||recentPain)return{level:'red',label:'Pain reported',message:'Do not train through pain. Skip painful movements and ask a parent/qualified clinician about persistent or throwing-related pain.'};if(r.energy===''||r.energy==null||r.sleep===''||r.sleep==null||r.soreness===''||r.soreness==null)return{level:'unknown',label:'Check in first',message:'A quick check-in helps tailor today’s training.'};if(+r.energy<=2||+r.sleep<=2||+r.soreness>=4)return{level:'yellow',label:'Light session recommended',message:'Reduce load and/or sets, avoid hard sprinting if fatigued, and focus on quality. Modified training counts.'};return{level:'green',label:'Ready to train',message:'Follow the planned workout, keep 2–3 reps in reserve, and adjust if anything hurts.'}}
function suggestion(w,d,name){if(!['Barbell front squat','Trap bar deadlift','Dumbbell bench press'].includes(name))return null;let state=readinessState(w,d);if(state.level==='red')return{tone:'danger',title:'Hold — pain reported',detail:'No weight increase. Skip painful exercises and seek guidance.'};if([4,8,12].includes(w))return{tone:'amber',title:'Recovery week',detail:'Reduce volume and keep the load comfortable; no increase.'};if(state.level==='yellow')return{tone:'amber',title:'Keep it light',detail:'Consider reducing weight by ~5–10% and/or removing a set.'};let prior=latest(w,d,name);if(!prior)return{tone:'neutral',title:'Establish a baseline',detail:'Choose a comfortable, well-controlled working weight.'};let sets=prior.sets;let prevTarget=target(prior.week,exercises[d].find(e=>e[0]===name)||['','Strength',3,8])[1];let loads=sets.map(s=>Number(s.weight)).filter(x=>x>0);if(!loads.length)return{tone:'neutral',title:'Technique first',detail:'Log a working weight to enable suggestions.'};let lastLoad=loads[loads.length-1];let allGood=sets.length>=target(prior.week,exercises[d].find(e=>e[0]===name)||['','Strength',3,8])[0]&&sets.every(s=>Number(s.reps)>=prevTarget)&&prior.s.technique==='good'&&+readiness(prior.week,d).energy>=3&&+readiness(prior.week,d).soreness<=3&&readiness(prior.week,d).pain!=='yes';if(allGood&&state.level==='green'){let increment=name==='Dumbbell bench press'?2.5:5;return{tone:'green',title:`Consider ${lastLoad+increment} lb`,detail:`Last: ${lastLoad} lb. Small optional increase (+${increment} lb) if supervised technique stays excellent. Use available plates.`}}return{tone:'amber',title:`Repeat ~${lastLoad} lb`,detail:'Keep or reduce the load until all target reps are comfortable with good technique.'}}
function toast(msg){let el=$('toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),3200)}
let settingsReturnTab='home',settingsSection='';
function openSettings(){if(tab!=='settings')settingsReturnTab=tab==='profile'?'home':tab;settingsSection='';tab='settings';workoutFocus=false;render();window.scrollTo(0,0)}
function closeSettings(){settingsSection='';tab=settingsReturnTab;render();window.scrollTo(0,0)}
function settingsOpen(section){if(tab!=='settings'){settingsReturnTab=tab;tab='settings'}settingsSection=section;render();window.scrollTo(0,0)}
function openProgramBuilder(){settingsOpen('builder')}
function nav(t){if(t==='settings'){openSettings();return}tab=t;if(t!=='train')workoutFocus=false;render();window.scrollTo(0,0)}
function focusWorkout(){workoutFocus=true;day=DAYS.includes(day)?day:'Saturday';nav('train')}
function exitWorkout(){workoutFocus=false;render();window.scrollTo(0,0)}
function renderHeaderAthlete(){const p=profileData(),name=(p.name||'JR').trim()||'JR',avatar=$('headerAvatar'),label=$('headerAthleteName');if(!avatar||!label)return;label.textContent=name.toUpperCase()+' · ATHLETIC DEVELOPMENT';avatar.replaceChildren();if(p.photo){const img=document.createElement('img');img.src=p.photo;img.alt=name+' profile photo';avatar.appendChild(img)}else{avatar.textContent=name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}}
// Original, dependency-free outline icons inspired by contemporary fitness-app UI patterns.
const ICON_PATHS={
 home:'<path d="M4 4.5H20V12L12 21L4 12Z"/>',
 train:'<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
 library:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/>',
 progress:'<path d="M4 19V5M4 19h17M7 15l5-5 3 3 5-7"/><path d="M16 6h4v4"/>',
 schedule:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h3M15 14h2"/>',
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 measurements:'<path d="M4 5h16v14H4zM8 5v4m4-4v3m4-3v4M8 15l2 2 5-5"/>',
 parent:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 15a4 4 0 0 1 5 4v1"/>',
 backup:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 baseball:'<circle cx="12" cy="12" r="9"/><path d="M6 5c5 4 5 10 0 14M18 5c-5 4-5 10 0 14"/>',
 recovery:'<path d="M12 21c-6-3-9-7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-3 9-9 12z"/>',
 swap:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
 play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
 favorite:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.5l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>'
};
function uiIcon(name,cls=''){return `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]||ICON_PATHS.home}</svg>`}
function render(){if(tab!=='settings')$('app').classList.remove('off-settings-contrast');let items=[['home','home','Home'],['train','train','Train'],['library','library','Movements'],['progress','progress','Progress'],['schedule','schedule','Schedule']];$('bottomNav').classList.toggle('settings-hidden',false);$('bottomNav').innerHTML=items.map(([id,icon,label])=>`<button class="${tab===id?'active':''}" aria-label="${label}" aria-current="${tab===id?'page':'false'}" onclick="nav('${id}')"><span class="ico">${uiIcon(icon)}</span><span class="nav-label">${label}</span></button>`).join('');renderHeaderAthlete();const gear=$('headerSettings');if(gear){gear.classList.toggle('selected',tab==='settings');gear.setAttribute('aria-label',tab==='settings'?'Close settings':'Open settings')} $('headerDate').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});({home:renderHome,train:safeRenderTrain,schedule:renderSchedule,progress:renderProgress,library:renderLibrary,profile:renderProfile,settings:renderSettingsPage})[tab]();renderTimer()}

// Smart Weight Progression v8.5. Estimates are derived from submaximal working sets.
const PRIMARY_STRENGTH=['Barbell back squat','Barbell front squat','Trap bar deadlift','Barbell strict press','Dumbbell bench press'];
function strengthProfiles(){db.strengthProfiles??={};return db.strengthProfiles}
function estimateMax(weight,reps){let w=Number(weight),r=Number(reps);return w>0&&r>=1&&r<=12?Math.round(w*(1+r/30)*10)/10:null}
function strengthProfile(name){return strengthProfiles()[name]||{}}
function saveStrengthProfile(name){let id=PRIMARY_STRENGTH.indexOf(name),w=Number($('spWeight'+id)?.value),r=Number($('spReps'+id)?.value),manual=Number($('spMax'+id)?.value);if(w<0||manual<0||!Number.isFinite(w)||!Number.isFinite(manual)||!Number.isInteger(r)||r<1||r>12){toast('Use 1–12 controlled reps and nonnegative weights');return}if(!w&&!manual){delete strengthProfiles()[name]}else strengthProfiles()[name]={weight:w,reps:r,manualMax:manual||null};save();renderStrengthSettings();toast('Strength baseline saved')}
function strengthMax(name){let p=strengthProfile(name);return p.manualMax||estimateMax(p.weight,p.reps)}
function roundLoad(value){let step=Math.max(0.5,Number(db.settings.loadIncrement)||5);return Math.max(0,Math.round(value/step)*step)}
function loadPct(w){return [0,.60,.625,.65,.55,.65,.675,.70,.60,.70,.725,.75,.60][w]||.60}
function weightAdvice(name,w=week,d=day){let r=readinessState(w,d),deload=[4,8,12].includes(w);if(r.level==='red')return{value:null,note:'Pain reported: do not auto-load; seek coach/clinical guidance.'};let prev=latest(w,d,name),p=strengthMax(name),isMain=PRIMARY_STRENGTH.includes(name);let priorLoaded=prev?.sets?.filter(x=>Number((x&&x.weight))>0)||[];let previous=priorLoaded[priorLoaded.length-1];let value=null,source='';if(isMain&&p){value=roundLoad(p*loadPct(w));source=`${Math.round(loadPct(w)*100)}% of estimated ${Math.round(p)} lb max`;}else if(previous){value=Number(previous.weight);source='Last completed working weight';if(!deload&&r.level==='green'&&prev?.s?.technique==='good'&&prev.sets.every(x=>(x&&x.done)&&Number((x&&x.reps))>=target(prev.week,activeExercises(d,w).find(e=>e[0]===name)||['','Strength',3,8])[1])){value+=name.toLowerCase().includes('dumbbell')?2.5:5;source='Optional small increase after controlled sets';}value=roundLoad(value)}if(value!==null&&r.level==='yellow'){value=roundLoad(value*.9);source+=' · reduced for readiness'}if(value!==null&&deload&&!isMain){value=roundLoad(value*.85);source+=' · deload'}return{value,note:source||'Enter a baseline in Settings or complete a working set first.'}}
function prefillWorkoutWeights(){let changed=false;for(let {exercise:e,index:i} of orderedWorkoutExercises()){if(movementStatus(i)!=="active")continue;let [n,reps]=target(week,e),name=e[0],a=weightAdvice(name);if(a.value==null||!Number.isFinite(a.value)||a.value<=0)continue;let sess=ensureSession(week,day);sess.items??={};sess.items[name]??={sets:[]};for(let j=0;j<n;j++){let row=sess.items[name].sets[j];if(!row){row={weight:a.value,reps:reps,done:false,autoSuggested:true};sess.items[name].sets[j]=row;changed=true;}else if(row.weight===undefined||row.weight===''){if(!row.done){row.weight=a.value;row.autoSuggested=true;changed=true;}}}}if(changed)save()}
function renderStrengthSettings(){let inc=Number(db.settings.loadIncrement)||5;$('app').innerHTML=`<div class="card strength-profile"><button class="secondary small" onclick="settingsOpen('')">← Settings</button><span class="v7-kicker">SMART WEIGHT PROGRESSION</span><h1>STRENGTH PROFILE</h1><p>Enter a comfortable, supervised working set (1–12 reps), or an existing estimated max. No actual one-rep-max test is needed.</p><label>Available weight increments (lb)<select onchange="db.settings.loadIncrement=Number(this.value);save();renderStrengthSettings()">${[2.5,5,10].map(x=>`<option value="${x}" ${inc===x?'selected':''}>${x} lb</option>`).join('')}</select></label>${PRIMARY_STRENGTH.map((name,i)=>{let x=strengthProfile(name),estimated=strengthMax(name);return `<section class="strength-entry"><h3>${esc(name)}</h3><div class="strength-inputs"><label>Working weight (lb)<input type="number" id="spWeight${i}" min="0" step="0.5" inputmode="decimal" value="${esc((x&&x.weight)??'')}"></label><label>Controlled reps<input type="number" id="spReps${i}" min="1" max="12" step="1" inputmode="numeric" value="${esc((x&&x.reps)??8)}"></label><label>Optional estimated max (lb)<input type="number" id="spMax${i}" min="0" step="0.5" inputmode="decimal" value="${esc(x.manualMax??'')}"></label></div><div class="strength-entry-footer"><span>Estimated max: <b>${estimated?Math.round(estimated)+' lb':'Not set'}</b></span><button class="small" onclick="saveStrengthProfile('${name}')">Save</button></div></section>`}).join('')}<div class="notice">Training loads are starting estimates, not targets to force. Keep reps controlled, stop for pain, and follow coaching guidance. Deload weeks: 4, 8, 12.</div></div>`}
function renderSettingsPage(){
 $('app').classList.add('off-settings-contrast');
 const p=profileData();
 if(settingsSection){
  if(settingsSection==='trainingHub'||settingsSection==='familyHub'||settingsSection==='accountHub'||settingsSection==='helpHub'){
   const hub=settingsSection;
   const blocks={
    trainingHub:{title:'Training Program',subtitle:'Your personalized plan and training tools',rows:[['train','Athlete Setup','Goals, position and equipment','onboarding'],['train','Program Builder','Create or update your program','builder'],['train','Strength Profile','Working weights and progressions','strength'],['measurements','Height & Weight','Growth and measurements','growth'],['clock','Event Reminders','Training and calendar alerts','reminders']]},
    familyHub:{title:'Parent & Athlete Linking',subtitle:'Connect and manage your family',rows:[['parent','Parent Account & Linking','Invitations and connected accounts','parentAccount'],['parent','Parent Overview','Training consistency and recovery','parent']]},
    accountHub:{title:'Account & Cloud Sync',subtitle:'Manage sign-in, synchronization and backups',rows:[['profile','Athlete Account','Sign in and cloud synchronization','account'],['backup','Backup & Restore','Export, import and backups','data']]},
    helpHub:{title:'Help & About',subtitle:'OFFSZN support and app information',rows:[]}
   };
   const h=blocks[hub];
   $('app').innerHTML=`<section class="settings-page off-settings-simple"><button class="off-detail-back" onclick="settingsOpen('')">← Settings</button><div class="off-simple-heading"><h1>${h.title}</h1><p>${h.subtitle}</p></div><div class="off-simple-menu">${h.rows.map(r=>settingsRow(...r)).join('')}</div>${hub==='helpHub'?'<div class="off-simple-help"><strong>OFFSZN</strong><p>Baseball strength, speed and athletic development.</p><p>Version 8.65</p><p>For account or workout support, contact your OFFSZN administrator.</p></div>':''}</section>`;
   return;
  }
  if(settingsSection==='edit')profileEdit();
  else if(settingsSection==='workout')profileSettings();
  else if(settingsSection==='strength')renderStrengthSettings();
  else if(settingsSection==='data')renderData();
  else if(settingsSection==='growth')renderGrowth();
  else if(settingsSection==='parent')renderParent();
  else if(settingsSection==='reminders')renderRemindersSettings();
  else if(settingsSection==='builder')renderProgramBuilder();
  else if(settingsSection==='onboarding')renderAthleteOnboarding();
  else if(settingsSection==='account')renderAthleteAccount();
  else if(settingsSection==='parentAccount')renderParentAccount();
  else {settingsSection='';return renderSettingsPage()}
  const app=$('app');
  const first=app.querySelector('button');
  if(first&&first.classList.contains('secondary')&&first.textContent.includes('←'))first.remove();
  const heading=({edit:'Athlete details',workout:'Workout preferences',strength:'Strength profile',data:'Backups & data',growth:'Measurements',parent:'Parent overview',reminders:'Event reminders',builder:'Program builder',onboarding:'Athlete setup',account:'Athlete account',parentAccount:'Parent account'})[settingsSection]||'Settings';
  app.insertAdjacentHTML('afterbegin',`<button class="off-detail-back" onclick="settingsOpen('')">← Settings</button><div class="off-settings-subnav"><span>SETTINGS</span><span aria-hidden="true">/</span><strong>${heading}</strong></div>`);
  return;
 }
 const initials=(p.name||'').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'AT';
 const age=p.dob?Math.max(0,Math.floor((Date.now()-new Date(p.dob).getTime())/31557600000)):null;
 const details=[age!==null&&Number.isFinite(age)?`Age ${age}`:null,p.position||null].filter(Boolean).join(' · ')||'Baseball Athlete';
 $('app').innerHTML=`<section class="settings-page off-settings-simple">
 <div class="off-simple-top"><h1>Settings</h1><span>OFFSZN</span></div>
 <button class="off-simple-profile" onclick="settingsOpen('edit')"><span class="off-simple-avatar">${p.photo?`<img src="${esc(p.photo)}" alt="Athlete photo">`:esc(initials)}</span><span class="off-simple-profile-text"><strong>Athlete Profile</strong><small>${esc(p.name||'Athlete')} · ${esc(details)}</small><em>Edit Profile</em></span><span class="off-simple-arrow">›</span></button>
 <section class="off-simple-section"><h2>TRAINING</h2><div class="off-simple-menu">
 ${settingsRow('clock','Workout Preferences','Schedule, equipment, rest timer','workout')}
 ${settingsRow('train','Training Program','Goals and program builder','trainingHub')}
 </div></section>
 <section class="off-simple-section"><h2>ACCOUNT & FAMILY</h2><div class="off-simple-menu">
 ${settingsRow('parent','Parent & Athlete Linking','Connect and manage family accounts','familyHub')}
 ${settingsRow('backup','Account & Cloud Sync','Sign-in, backup and synchronization','accountHub')}
 </div></section>
 <section class="off-simple-section"><h2>SUPPORT</h2><div class="off-simple-menu">
 ${settingsRow('profile','Help & About','Support, privacy, app version','helpHub')}
 </div></section>
 </section>`;
}
function offFilterSettings(value){
 const q=String(value||'').trim().toLowerCase();
 let found=0;
 document.querySelectorAll('.off-settings-group').forEach(group=>{
  let visible=0;
  group.querySelectorAll('.settings-row').forEach(row=>{
   const match=!q||row.textContent.toLowerCase().includes(q);
   row.hidden=!match;
   if(match){visible++;found++}
  });
  group.hidden=visible===0;
 });
 const empty=document.getElementById('offSettingsEmpty');
 if(empty)empty.hidden=found!==0;
 const clear=document.getElementById('offSettingsClear');
 if(clear)clear.hidden=!q;
}
function offClearSettingsSearch(){
 const input=document.getElementById('offSettingsSearch');
 if(input){input.value='';offFilterSettings('');input.focus()}
}
function settingsRow(icon,title,desc,section){return `<button class="settings-row" onclick="settingsOpen('${section}')"><span class="settings-row-icon">${uiIcon(icon)}</span><span class="settings-row-copy"><strong>${title}</strong><small>${desc}</small></span><span class="settings-chevron">›</span></button>`}
function scheduleDay(d,dateStr){return db.schedule.filter(e=>e.day===d&&(e.id!=='tue-pitch'||!dateStr||pitchingOnDate(dateStr)))}
function icon(type){return uiIcon(type==='workout'?'train':type==='baseball'?'baseball':'recovery')}
function openScheduledWorkout(workoutDay){
 if(!DAYS.includes(workoutDay))return;
 day=workoutDay;
 workoutFocus=true;
 try{nav('train')}catch(err){showTrainRecovery(err)}
}
function selectScheduleCalendarDate(dateString,weekday){
 selectedDate=dateString;
 if(DAYS.includes(weekday)&&scheduleDay(weekday).some(e=>e.type==='workout'))openScheduledWorkout(weekday);
 else render();
}
function eventHTML(e,linkWorkout=false){
 const gym=linkWorkout&&e.type==='workout'&&DAYS.includes(e.day);
 const inner=`<div class="event-icon">${icon(e.type)}</div><div class="event-body"><b>${esc(e.name)}</b><small>${esc(e.time)} · ${esc(e.day)}</small></div><span class="pill ${e.type==='workout'?'':'gray'}">${e.type==='workout'?'GYM':e.type==='baseball'?'BASEBALL':'REST'}</span>${gym?'<span class="schedule-workout-arrow" aria-hidden="true">→</span>':''}`;
 return gym?`<button type="button" class="event schedule-workout-link" onclick="openScheduledWorkout('${e.day}')" aria-label="Open ${esc(e.day)} workout in Train">${inner}</button>`:`<div class="event">${inner}</div>`;
}

// Athletic development: dated performance testing, independent of workout sessions.
const ATHLETIC_METRICS=[
 ['10-yard sprint','sec','lower','Speed'],['30-yard sprint','sec','lower','Speed'],['5-10-5 shuttle','sec','lower','Agility'],
 ['Vertical jump','in','higher','Power'],['Broad jump','in','higher','Power'],['Rotational medicine ball throw','ft','higher','Power'],
 ['Exit velocity','mph','higher','Baseball'],['Pitch velocity','mph','higher','Baseball'],['Body weight','lb','neutral','Development'],['Height','in','neutral','Development']
];
function athleticEntries(){if(!Array.isArray(db.athleticEntries))db.athleticEntries=[];return db.athleticEntries}
function athleticMetric(name){return ATHLETIC_METRICS.find(m=>m[0]===name)}
function athleticSeries(name){return athleticEntries().filter(x=>x.metric===name&&Number.isFinite(Number(x.value))&&Number(x.value)>0&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)).sort((a,b)=>a.date.localeCompare(b.date))}
function athleticChange(name){const rows=athleticSeries(name),meta=athleticMetric(name);if(rows.length<2)return 'Baseline needed';const first=Number(rows[0].value),last=Number(rows[rows.length-1].value),diff=last-first;if(Math.abs(diff)<.0001)return 'No change';const improved=meta[2]==='lower'?diff<0:meta[2]==='higher'?diff>0:null;return `${diff>0?'+':''}${diff.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} ${meta[1]}${improved===null?'':improved?' · Improving':' · Review'}`}
function athleticLatest(name){const r=athleticSeries(name);return r.length?r[r.length-1]:null}
function athleticChart(name){const rows=athleticSeries(name).slice(-12);if(rows.length<2)return '<p class="mini">Add at least two dated results to see a trend.</p>';const vals=rows.map(r=>Number(r.value)),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(max-min,.01);const pts=vals.map((v,i)=>`${20+(i/(vals.length-1))*300},${115-((v-min)/span)*90}`).join(' ');return `<svg class="ath-chart" viewBox="0 0 340 145" role="img" aria-label="${esc(name)} results over time"><line x1="20" y1="116" x2="320" y2="116" stroke="#525761"/><polyline fill="none" stroke="#facc15" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>${vals.map((v,i)=>`<circle cx="${20+i/(vals.length-1)*300}" cy="${115-((v-min)/span)*90}" r="4" fill="#facc15"/>`).join('')}<text x="20" y="138" fill="#cbd0d7" font-size="10">${esc(rows[0].date)}</text><text x="320" y="138" fill="#cbd0d7" font-size="10" text-anchor="end">${esc(rows[rows.length-1].date)}</text></svg>`}
function athleticAdd(){const metric=$('athMetric')?.value,date=$('athDate')?.value,value=Number($('athValue')?.value),note=String($('athNote')?.value||'').trim().slice(0,120);if(!athleticMetric(metric)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(value)||value<=0||value>10000){toast('Enter a valid date and positive result.');return}athleticEntries().push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),metric,date,value,note});save();render();toast('Athletic test recorded')}
function athleticRemove(id){offsznConfirm('Remove test result?','This athletic test entry will be permanently removed.',()=>{db.athleticEntries=athleticEntries().filter(x=>x.id!==id);save();render()},true)}
function athleticDashboard(){const metrics=ATHLETIC_METRICS,recorded=metrics.filter(m=>athleticLatest(m[0]));const recent=[...athleticEntries()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);return `<section class="card athletic-dashboard"><div class="ath-head"><div><small>ATHLETE DEVELOPMENT</small><h2>Baseball performance dashboard</h2><p class="mini">Track speed, power and on-field results. Re-test about every four weeks under similar conditions.</p></div><span class="ath-count">${recorded.length}/${metrics.length} tracked</span></div><div class="ath-kpis">${['10-yard sprint','Broad jump','Exit velocity','Pitch velocity'].map(name=>{const last=athleticLatest(name),meta=athleticMetric(name);return `<div class="ath-kpi"><small>${esc(name)}</small><strong>${last?esc(last.value):'—'}<em>${last?esc(meta[1]):''}</em></strong><span>${esc(athleticChange(name))}</span></div>`}).join('')}</div><details class="ath-entry" ${recorded.length?'':'open'}><summary>＋ Record a performance test</summary><div class="ath-form"><label>Metric<select id="athMetric">${metrics.map(m=>`<option value="${esc(m[0])}">${esc(m[0])} (${esc(m[1])})</option>`).join('')}</select></label><label>Test date<input id="athDate" type="date" value="${localWorkoutDate()}"></label><label>Result<input id="athValue" type="number" inputmode="decimal" min="0.01" step="any" placeholder="Enter result"></label><label>Optional note<input id="athNote" maxlength="120" placeholder="Equipment or testing conditions"></label><button type="button" onclick="athleticAdd()">Save Result</button></div></details><h3>Performance trends</h3><div class="ath-metric-grid">${metrics.map(m=>{let last=athleticLatest(m[0]);return `<details class="ath-metric"><summary><span><b>${esc(m[0])}</b><small>${esc(m[3])} · ${esc(athleticChange(m[0]))}</small></span><strong>${last?esc(last.value)+' '+esc(m[1]):'Not tested'}</strong></summary>${athleticChart(m[0])}</details>`}).join('')}</div><h3>Recent test results</h3>${recent.length?`<div class="ath-history">${recent.map(r=>`<div><span><b>${esc(r.metric)}</b><small>${esc(r.date)}${r.note?' · '+esc(r.note):''}</small></span><strong>${esc(r.value)} ${esc(athleticMetric(r.metric)?.[1]||'')}</strong><button class="secondary small" aria-label="Remove test" onclick="athleticRemove('${esc(r.id)}')">×</button></div>`).join('')}</div>`:'<p class="mini">No tests recorded yet. Start with a baseline, then compare future results.</p>'}<p class="mini">Testing is optional; avoid max-effort throwing or lifting tests without appropriate coaching and recovery.</p></section>`}
function athleticHomePreview(){const names=['10-yard sprint','Broad jump','Exit velocity'];return `<section class="ath-home-panel" aria-label="Athletic performance"><div class="ath-home-heading"><h2>ATHLETIC PERFORMANCE</h2><button type="button" onclick="nav('progress')" aria-label="View all athletic performance metrics">View all <span aria-hidden="true">→</span></button></div><div class="ath-home-grid">${names.map(n=>{const last=athleticLatest(n);const change=athleticChange(n);return `<button type="button" class="ath-home-tile" onclick="nav('progress')" aria-label="View ${esc(n)} in athletic performance dashboard"><small>${esc(n)}</small><strong>${last?esc(last.value):'—'}${last?` <em>${esc(athleticMetric(n)[1])}</em>`:''}</strong><span class="ath-home-trend">${last?esc(change):'Record baseline →'}</span></button>`}).join('')}</div></section>`}

function renderHome(){
 const d=today(),w=week,next=DAYS.find(x=>!finished(w,x))||'Monday',pick=DAYS.includes(d)?d:next,count=completedCount(),pct=Math.round(count/36*100),state=readinessState(w,pick),profile=profileData();
 const date=new Date(),weekStart=new Date(date);weekStart.setDate(date.getDate()-((date.getDay()+6)%7));
 // Show four Monday-Sunday weeks in a horizontally swipeable date strip.
 const strip=Array.from({length:28},(_,i)=>{let dt=new Date(weekStart);dt.setDate(weekStart.getDate()+i);let wd=WEEKDAYS[dt.getDay()],isToday=dt.toDateString()===date.toDateString(),gym=DAYS.includes(wd);let yyyy=dt.getFullYear(),mm=String(dt.getMonth()+1).padStart(2,'0'),dd=String(dt.getDate()).padStart(2,'0');return `<button type="button" class="week-day ${isToday?'today':''}" onclick="selectedDate='${yyyy}-${mm}-${dd}';nav('schedule')" aria-label="${esc(wd)} ${dt.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}"><span>${wd.slice(0,1)}</span><b>${dt.getDate()}</b><i class="${gym?'gym':''}"></i></button>`}).join('');
 const label={Monday:'Lower body + acceleration',Thursday:'Upper body + shoulder stability',Saturday:'Total body + rotational power'};
 $('app').innerHTML=`<div class="v7-greeting"><div><div class="v7-kicker">YOUR TRAINING SPACE</div><h1>LET'S GET<br><em>STRONGER.</em></h1><p>Hey, ${esc((profile.name||'JR').split(' ')[0])}. Keep building, one session at a time.</p></div><button class="v7-round" aria-label="Athlete profile" onclick="nav('profile')">↗</button></div>
 <div class="v7-hero offszn-featured-session"><div class="v7-hero-top"><span class="v7-label">NEXT SESSION</span><span class="v7-chip">WEEK ${w} / 12</span></div><div class="v7-hero-mark offszn-brand-mark" aria-hidden="true">OFF<span>SZN</span></div><h2>${esc(label[pick])}</h2><p>${esc(pick)} · ${esc(phase(w))} · ${exercises[pick].length} movements</p><button class="v7-primary" onclick="day='${pick}';focusWorkout()">${finished(w,pick)?'REVIEW WORKOUT':'START WORKOUT'} <span>↗</span></button></div>
 <section class="offszn-home-actions" aria-label="Quick actions"><button onclick="nav('train')"><span class="offszn-quick-icon">↗</span><b>Train</b><small>Today’s workout</small></button><button onclick="openProgramBuilder()"><span class="offszn-quick-icon">✦</span><b>Build</b><small>Training blueprint</small></button><button onclick="nav('progress')"><span class="offszn-quick-icon">▥</span><b>Progress</b><small>Your results</small></button></section><div class="v7-section-title"><h2>UPCOMING DATES</h2><button onclick="nav('schedule')">Full schedule ↗</button></div><p class="jr-calendar-hint">Swipe left to see future dates →</p><div class="v7-week-strip" role="group" aria-label="Upcoming four weeks of training dates">${strip}</div>
 <div class="v7-stats"><div class="v7-stat"><span>WORKOUTS DONE</span><strong>${count}<small>/36</small></strong><div class="v7-stat-track"><i style="width:${pct}%"></i></div></div><div class="v7-stat"><span>PROGRAM WEEK</span><strong>${w}<small>/12</small></strong><p>${esc(phase(w))}</p></div></div>
 <div class="v7-section-title"><h2>YOUR TRAINING</h2><button onclick="nav('progress')">See progress ↗</button></div><div class="v7-stack">${DAYS.map(x=>`<button class="v7-session-row" onclick="day='${x}';nav('train')"><span class="v7-session-icon">${x==='Monday'?'01':x==='Thursday'?'02':'03'}</span><span><b>${esc(label[x])}</b><small>${x} · ${finished(w,x)?'Completed':'Ready when you are'}</small></span><span class="v7-chevron">↗</span></button>`).join('')}</div>
 <div class="v7-section-title"><h2>RECOVERY & TOOLS</h2></div><button class="v7-tool" onclick="day='${pick}';nav('train')"><span><b>${esc(state.label)}</b><small>${esc(state.message)}</small></span><span>↗</span></button><div class="v7-tool-grid"><button onclick="nav('library')">${uiIcon('library')} <b>Movement library</b><small>Technique guides</small></button><button onclick="nav('profile')">${uiIcon('profile')} <b>Athlete profile</b><small>Settings & backups</small></button></div>${athleticHomePreview()}`;
}
function weekSelector(){return `<label>WEEK<select onchange="week=+this.value;save();render()">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${week===i+1?'selected':''}>Week ${i+1}</option>`).join('')}</select></label>`}
// Readiness panel visibility is UI-only; it never alters the athlete's readiness data.
const READY_UI_KEY='jr-performance-readiness-ui-v1';
function readyUiState(){try{return JSON.parse(localStorage.getItem(READY_UI_KEY)||'{}')||{}}catch{return {}}}
function readyUiSave(state){try{localStorage.setItem(READY_UI_KEY,JSON.stringify(state))}catch{}}
function readyUiDate(){let n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`}
function readyUiKey(){return `${readyUiDate()}|${week}|${day}`}
function readyUiMode(){let state=readyUiState();return state[readyUiKey()]||'open'}
function setReadyUiMode(mode){let state=readyUiState();let key=readyUiKey();if(mode==='open')delete state[key];else state[key]=mode;for(let k of Object.keys(state))if(!k.startsWith(readyUiDate()+'|'))delete state[k];readyUiSave(state);render()}
// Smart Movement Library v8: session-scoped swaps preserve the programmed plan.
const movementByName=name=>MOVEMENT_CATALOG.find(x=>x.name===name);
function swapMap(w=week,d=day){const swaps=session(w,d).swaps;return swaps&&typeof swaps==='object'&&!Array.isArray(swaps)?swaps:{}}
function activeExercises(d=day,w=week){let swaps=swapMap(w,d);return [...exercises[d],...(session(w,d).addedMovements||[])].map((e,i)=>{let replacement=swaps[i];if(!replacement)return e;let meta=typeof replacement==='string'?movementByName(replacement):null;return meta?[replacement,meta.category,e[2],e[3],e[4],`Substituted for ${e[0]}. Use coach-approved technique and appropriate loading.`]:e})}
// v8.6: per-session movement order and reversible skip/remove state.
function movementStatus(i,w=week,d=day){return (session(w,d).movementStatus&&typeof session(w,d).movementStatus==='object'?session(w,d).movementStatus[i]:null)||'active'}
function movementOrder(w=week,d=day){const count=activeExercises(d,w).length, saved=session(w,d).movementOrder;let order=Array.isArray(saved)?saved.filter(i=>Number.isInteger(i)&&i>=0&&i<count):[];return [...new Set([...order,...Array.from({length:count},(_,i)=>i)])]}
function orderedWorkoutExercises(d=day,w=week){const all=activeExercises(d,w);return movementOrder(w,d).map(index=>({exercise:all[index],index}))}
function changeMovementStatus(i,status){if(!activeExercises()[i])return;let s=ensureSession(week,day);const current=movementStatus(i);if(status!=='active'&&current==='active'){const name=activeExercises()[i][0];if(s.items?.[name]?.sets?.some(x=>(x&&x.done))&&!confirm('This movement has completed sets. They will be preserved, but excluded from today’s completion count. Continue?'))return} s.movementStatus??={};if(status==='active')delete s.movementStatus[i];else s.movementStatus[i]=status;save();render();toast(status==='active'?'Movement restored':status==='skipped'?'Skipped for today':'Removed from this workout')}
function resetMovementOrder(){let s=ensureSession(week,day);delete s.movementOrder;save();render();toast('Original order restored')}
function moveMovement(from,to){if(from===to||!activeExercises()[from]||!activeExercises()[to])return;const order=movementOrder(),a=order.indexOf(from),b=order.indexOf(to);if(a<0||b<0)return;order.splice(a,1);order.splice(b,0,from);ensureSession(week,day).movementOrder=order;save();render();toast('Movement order saved')}
let movementDrag=null;
function movementDragStart(event,i){if(event.type==='pointerdown'&&event.button!==0)return;const handle=event.currentTarget;movementDrag={id:i,pointerId:event.pointerId,handle,startY:event.clientY,moved:false};handle.setPointerCapture?.(event.pointerId);handle.closest('.workout-card')?.classList.add('movement-dragging');event.preventDefault()}
function movementDragMove(event){if(!movementDrag||event.pointerId!==movementDrag.pointerId)return;let target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-movement-index]');document.querySelectorAll('.movement-drop-target').forEach(el=>el.classList.remove('movement-drop-target'));if(target&&Number(target.dataset.movementIndex)!==movementDrag.id){target.classList.add('movement-drop-target');movementDrag.over=Number(target.dataset.movementIndex)}else movementDrag.over=null;movementDrag.moved=true}
function movementDragEnd(event){if(!movementDrag||event.pointerId!==movementDrag.pointerId)return;const {id,over}=movementDrag;movementDrag=null;document.querySelectorAll('.movement-drop-target,.movement-dragging').forEach(el=>el.classList.remove('movement-drop-target','movement-dragging'));if(over!=null)moveMovement(id,over)}
function swappedFrom(i){return swapMap()[i]||null}
function swapExercise(i,name){let base=activeExercises()[i],entry=movementByName(name);if(!base||!entry)return;let s=ensureSession(week,day);s.swaps??={};let old=activeExercises()[i][0];if(old===name){closeSwap();return}if(s.items?.[old]?.sets?.some(x=>(x&&x.done))&&!confirm('This exercise already has logged sets. Switching will keep those records but show a new exercise. Continue?'))return;if(name===base[0])delete s.swaps[i];else s.swaps[i]=name;save();closeSwap();render();toast(name===base[0]?'Original exercise restored':'Exercise swapped for this workout')}
function resetSwap(i){if(exercises[day]?.[i])swapExercise(i,exercises[day][i][0]);else toast("Added movements have no original swap") }
function closeSwap(){document.getElementById('swapOverlay')?.remove()}
function openSwap(i){const original=activeExercises()[i],current=activeExercises()[i],base=movementByName(original[0]);if(!base){toast('No swap matches available for this movement');return}window.swapIndex=i;window.swapQuery='';window.swapEquipment='All';window.swapMode='recommended';drawSwap()}
function drawSwap(){const i=window.swapIndex,original=activeExercises()[i],base=movementByName(original[0]);if(!base)return;let old=document.getElementById('swapOverlay');if(old)old.remove();let overlay=document.createElement('div');overlay.id='swapOverlay';overlay.className='video-overlay swap-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Swap exercise');overlay.innerHTML=`<div class="video-sheet swap-sheet"><div class="swap-header"><div><span class="v7-kicker">WORKOUT / EXERCISE SWAP</span><h2>Replace ${esc(original[0])}</h2><p class="mini">Only changes Week ${week} · ${esc(day)}. Your original plan stays intact.</p></div><button class="secondary small" onclick="closeSwap()">✕ Close</button></div><div class="swap-controls"><button class="${window.swapMode==='recommended'?'':'secondary'}" onclick="window.swapMode='recommended';drawSwap()">Recommended</button><button class="${window.swapMode==='all'?'':'secondary'}" onclick="window.swapMode='all';drawSwap()">All movements</button></div><label class="v71-search-label">SEARCH<input type="search" placeholder="Search movements" value="${esc(window.swapQuery||'')}" oninput="window.swapQuery=this.value;updateSwapResults()"></label><label class="v71-search-label">EQUIPMENT<select onchange="window.swapEquipment=this.value;updateSwapResults()">${['All',...new Set(MOVEMENT_CATALOG.map(x=>x.equipment))].map(e=>`<option ${window.swapEquipment===e?'selected':''}>${esc(e)}</option>`).join('')}</select></label><div id="swapResults"></div><div class="notice">Match the movement goal and technique, not just the muscle group. If JR reports pain, do not use exercise swaps to train through it; consult his coach or clinician.</div></div>`;overlay.onclick=e=>{if(e.target===overlay)closeSwap()};document.body.appendChild(overlay);updateSwapResults()}
function updateSwapResults(){let i=window.swapIndex,original=exercises[day][i],base=movementByName(original[0]),query=(window.swapQuery||'').toLowerCase(),eq=window.swapEquipment||'All',recommended=window.swapMode!=='all';let choices=MOVEMENT_CATALOG.filter(x=>(!recommended||(x.pattern===base.pattern&&x.objective===base.objective))&&(eq==='All'||x.equipment===eq)&&(!query||`${x.name} ${x.category} ${x.equipment}`.toLowerCase().includes(query)));choices.sort((a,b)=>Number(b.name===original[0])-Number(a.name===original[0])||a.name.localeCompare(b.name));let targetEl=$('swapResults');if(!targetEl)return;targetEl.innerHTML=`<div class="v71-result-count">${choices.length} ${recommended?'MATCHED':'AVAILABLE'} EXERCISES</div>${choices.map(x=>`<button class="swap-choice" onclick="swapExercise(${i},decodeURIComponent('${encodeURIComponent(x.name)}'))"><span><b>${esc(x.name)}</b><small>${esc(x.equipment)} · ${esc(x.category)} · TECHNIQUE GUIDE</small></span><span>${x.name===original[0]?'ORIGINAL':'SWAP →'}</span></button>`).join('')||'<p class="mini">No matching exercises. Try All movements or another equipment filter.</p>'}`}
function favoriteMovement(name){db.favorites??=[];let idx=db.favorites.indexOf(name);if(idx>=0)db.favorites.splice(idx,1);else db.favorites.push(name);save();updateLibraryResults()}
function safeWorkoutCounts(w,d){
 let done=0,total=0;
 const list=activeExercises(d,w);
 for(let i=0;i<list.length;i++){
  try{
   if(movementStatus(i,w,d)!=='active')continue;
   const e=activeExercises(d,w)[i];if(!e)continue;
   const n=target(w,e)[0]+Number(session(w,d).extraSets?.[e[0]]||0);total+=n;
   const sets=session(w,d).items?.[e[0]]?.sets||[];
   done+=sets.slice(0,n).filter(x=>x&&(x&&x.done)).length;
  }catch(err){console.error('Workout count failed',d,i,err)}
 }
 return [done,total];
}
function safeWorkoutCards(){
 try{return renderOrderedMovements()}
 catch(err){
  console.error('Workout layout failed; showing original movement list',err);
  const list=Array.isArray(exercises[day])?exercises[day]:[];
  return `<div class="card"><p class="mini">The customized movement layout could not load. Original movements are shown below.</p><details><summary>Technical details</summary><pre>${esc(String(err&&err.stack||err))}</pre></details></div>`+list.map((e,i)=>safeExerciseHTML(e,i)).join('');
 }
}
function renderTrain(){
 if(!DAYS.includes(day))day='Monday';
 const s=ensureSession(week,day);if(!s.date){s.date=localWorkoutDate();save()}
 // Weight prefill is optional: never let a suggestion block the workout.
 try{prefillWorkoutWeights()}catch(err){console.error('Optional weight prefill failed',err)}
 const r=readiness(week,day),state=readinessState(week,day),counts=safeWorkoutCounts(week,day),done=counts[0],total=counts[1],mode=readyUiMode();
 $('app').innerHTML=`${db.activeBlueprint?`<div class="card"><span class="v7-kicker">YOUR PERSONALIZED BLUEPRINT</span><h2>${esc(db.activeBlueprint.goal)} · ${esc(db.activeBlueprint.days)} DAYS/WEEK</h2><p class="mini">Blueprint saved to your athlete profile. The workout tracker below still uses the original 12-week exercise schedule until a personalized workout engine is implemented.</p><button class="secondary small" onclick="settingsOpen('builder')">View blueprint</button></div>`:''}<div class="v7-workout-heading"><span class="v7-kicker">TRAINING SESSION</span><h1>${day==='Monday'?'LOWER BODY':day==='Thursday'?'UPPER BODY':'TOTAL BODY'} <em>${day==='Monday'?'& SPEED':day==='Thursday'?'& STABILITY':'& POWER'}</em></h1><p>Week ${week} of 12 · ${phase(week)} · Starts Nov 2, 2026</p></div><div class="card hero offszn-workout-control"><div class="offszn-session-meta"><span class="offszn-session-tag">SESSION CONTROL</span><span class="offszn-session-tag offszn-session-tag-muted">${done} / ${total} SETS COMPLETE</span></div><div class="row">${weekSelector()}<label>WORKOUT DATE<input type="date" value="${esc(s.date||programDayDate(week,day))}" onchange="setSession('date',this.value)"></label></div><div class="tabrow offszn-workout-days" role="group" aria-label="Select workout day">${DAYS.map(d=>`<button class="${day===d?'':'secondary'}" onclick="day='${d}';render()">${d}</button>`).join('')}</div><div class="progresslabel offszn-progress-label"><small>SESSION PROGRESS</small><b>${done}/${total}</b></div><div class="bar"><span style="width:${total?done/total*100:0}%"></span></div><div class="offszn-rest-heading">REST TIMER <span>CHOOSE A DURATION</span></div><div class="actionrow offszn-rest-actions"><button class="secondary" onclick="startRest(90)">90s rest</button><button class="secondary" onclick="startRest(120)">2m rest</button><button class="secondary" onclick="startRest(180)">3m rest</button></div></div>${day==='Monday'?`<div class="card pitch-week-note"><b>${pitchingWeek(week)?'⚾ Pitching week · lighter Monday':'💪 Non-pitching week · normal Monday'}</b><p class="mini">${pitchingWeek(week)?'Tuesday pitching: limit accelerations, jumps, trap-bar deadlifts and split squats to 2 sets. Skip step-ups if fatigued; keep 2–3 reps in reserve.':'No Tuesday pitching planned: follow the normal strength prescription while keeping excellent technique.'}</p></div>`:''}<div class="readiness-launch offszn-readiness-launch"><button type="button" class="secondary small" onclick="openReadinessPopup()">✦ Readiness check <span class="readiness-status">${esc(state.label)}</span></button></div>${safeWorkoutCards()}<div class="card offszn-add-movement"><button type="button" class="wide secondary" onclick="openAddMovement()">＋ Add movement to workout</button></div><div class="card finish-rating-card offszn-workout-finish"><span class="v7-kicker">POST-SESSION CHECK-IN</span><h2>Finish workout</h2><p class="mini">How did today’s session feel?</p><div class="session-stars" role="group" aria-label="Rate this workout from 1 to 5 stars">${Array.from({length:5},(_,i)=>`<button type="button" class="session-star ${Number(s.rating||0)>i?'selected':''}" aria-label="${i+1} star${i?'s':''}" aria-pressed="${Number(s.rating||0)===i+1}" onclick="setWorkoutRating(${i+1})">★</button>`).join('')}</div><p class="rating-caption" aria-live="polite">${['Tap a star to rate your session','Very difficult','Challenging','Okay','Good session','Excellent session'][Number(s.rating||0)]}</p><button class="wide finish-workout-button" onclick="finishWorkout()">${s.finished?'✓ Workout finished · Reopen':'✓ Finish workout'}</button><p class="mini">Your rating is saved with this workout and tracked in Progress.</p></div>`;
 maybeOpenReadinessPopup();
}
// Readiness appears once per workout date and can be reopened from the compact button.
const JR_READY_POPUP_KEY='jr-performance-readiness-popup-v1';
function readinessPopupId(){const s=session(week,day);return `${week}|${day}|${s.date||localWorkoutDate()}`;}
function readinessPopupSeen(){try{return JSON.parse(localStorage.getItem(JR_READY_POPUP_KEY)||'{}')}catch(e){return {}}}
function markReadinessPopupSeen(){try{const seen=readinessPopupSeen();seen[readinessPopupId()]=true;localStorage.setItem(JR_READY_POPUP_KEY,JSON.stringify(seen))}catch(e){}}
function maybeOpenReadinessPopup(){if(!readinessPopupSeen()[readinessPopupId()])openReadinessPopup();}
function closeReadinessPopup(){const el=document.getElementById('jrReadinessOverlay');if(el)el.remove();}
function readinessPopupChange(key,value){db.readiness[`${week}-${day}`]??={};db.readiness[`${week}-${day}`][key]=value;save();render();openReadinessPopup();}
function openReadinessPopup(){
 closeReadinessPopup();markReadinessPopupSeen();
 const r=readiness(week,day),state=readinessState(week,day);
 const fields=[['energy','Energy (1 low–5 high)',[1,2,3,4,5]],['sleep','Sleep quality (1–5)',[1,2,3,4,5]],['soreness','Muscle soreness (0–5)',[0,1,2,3,4,5]]];
 const controls=fields.map(([key,label,values])=>`<label>${label}<select onchange="readinessPopupChange('${key}',this.value)"><option value="">Choose</option>${values.map(v=>`<option value="${v}" ${String(r[key])===String(v)?'selected':''}>${v}</option>`).join('')}</select></label>`).join('');
 const overlay=document.createElement('div');overlay.id='jrReadinessOverlay';overlay.className='jr-readiness-overlay';
 overlay.innerHTML=`<div class="jr-readiness-sheet" role="dialog" aria-modal="true" aria-labelledby="jrReadinessTitle"><div class="jr-readiness-title"><div><small>BEFORE YOUR WORKOUT</small><h2 id="jrReadinessTitle">60-second readiness check</h2></div><button type="button" class="jr-readiness-close" onclick="closeReadinessPopup()" aria-label="Close readiness check">×</button></div><p class="mini">How are you feeling today?</p><div class="jr-readiness-fields">${controls}<label>Any pain (especially arm)?<select onchange="readinessPopupChange('pain',this.value)"><option value="">Choose</option><option value="no" ${r.pain==='no'?'selected':''}>No</option><option value="yes" ${r.pain==='yes'?'selected':''}>Yes</option></select></label></div><div class="notice ${state.level==='red'?'danger':state.level==='green'?'good':''}">${esc(state.message)}</div><button type="button" class="jr-readiness-done" onclick="closeReadinessPopup()">Continue to workout</button></div>`;
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeReadinessPopup()});document.body.appendChild(overlay);
}
function recoverCurrentWorkoutLayout(){
 if(!confirm('Restore the original movement layout for Week '+week+' '+day+'? Logged sets and workout ratings will be kept.'))return;
 const s=ensureSession(week,day);
 delete s.movementOrder;delete s.movementStatus;delete s.swaps;
 save();jrCardOpen={};jrCardMenu={};jrCardDetails={};
 try{render()}catch(err){showTrainRecovery(err)}
}
function showTrainRecovery(err){
 console.error('OFFSZN Train render failed',err);
 const app=$('app');if(!app)return;
 app.innerHTML=`<div class="card"><span class="v7-kicker">WORKOUT RECOVERY</span><h1>Can't load ${esc(day)} workout</h1><p>Your logged sets are still saved. An exercise or workout-rendering error occurred. Other sections of the app should remain available.</p><button onclick="recoverCurrentWorkoutLayout()">Restore original movement layout</button><p class="mini">This keeps your logged sets, ratings and strength profile.</p><details><summary>Technical details</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(err?.message||String(err))}</pre></details><div class="actionrow"><button class="secondary" onclick="nav('home')">Home</button><button class="secondary" onclick="nav('schedule')">Schedule</button></div></div>`;
}
function safeRenderTrain(){try{renderTrain()}catch(err){showTrainRecovery(err)}}
// Isolate movement rendering so a single malformed card cannot crash the workout.
function safeExerciseHTML(exercise,index){
 try{return exerciseHTML(exercise,index)}
 catch(err){
  console.error('OFFSZN movement failed', {day:day,week:week,index:index,name:exercise&&exercise[0]},err);
  return `<section class="card workout-card movement-render-error"><h3>${esc(exercise&&exercise[0]||'Movement')}</h3><p class="mini">This movement could not load. Other movements are still available.</p><button type="button" class="secondary small" onclick="changeMovementStatus(${index},'skipped')">Skip for today</button><details><summary>Technical details</summary><pre>${esc(String(err&&err.stack||err))}</pre></details></section>`;
 }
}
function renderOrderedMovements(){const rows=orderedWorkoutExercises();const removed=rows.filter(({index})=>movementStatus(index)==='removed');return `<div class="movement-order-toolbar"><div><b>YOUR MOVEMENTS</b><small>Hold ☰ and drag to change today's order</small></div></div>${rows.filter(({index})=>movementStatus(index)!=='removed').map(({exercise,index})=>movementStatus(index)==='skipped'?`<section class="card movement-skipped" data-movement-index="${index}"><div class="movement-skip-row"><span class="movement-drag-handle" aria-hidden="true">☰</span><div><small>SKIPPED TODAY</small><b>${esc(exercise[0])}</b></div><button class="secondary small" onclick="changeMovementStatus(${index},'active')">Restore</button></div></section>`:safeExerciseHTML(exercise,index)).join('')}${removed.length?`<details class="card movement-removed"><summary>Removed from this workout (${removed.length})</summary>${removed.map(({exercise,index})=>`<div class="movement-removed-row"><span>${esc(exercise[0])}</span><button class="secondary small" onclick="changeMovementStatus(${index},'active')">Restore</button></div>`).join('')}</details>`:''}`}
// Compact workout cards: transient UI state is intentionally separate from logged training data.
let jrCardOpen={};let jrCardMenu={};let jrCardDetails={};
function cardKey(i){return `${week}-${day}-${i}`}
function cardExpanded(i,complete){let k=cardKey(i);if(Object.prototype.hasOwnProperty.call(jrCardOpen,k))return jrCardOpen[k];if(complete)return false;let first=orderedWorkoutExercises().find(({exercise,index})=>movementStatus(index)==='active'&&(session(week,day).items?.[exercise[0]]?.sets||[]).filter(x=>(x&&x.done)).length<target(week,exercise)[0]);return !!first&&first.index===i}
function toggleWorkoutCard(i){let k=cardKey(i),e=activeExercises()[i],n=target(week,e)[0]+Number(session(week,day).extraSets?.[e[0]]||0),sets=session(week,day).items?.[e[0]]?.sets||[];jrCardOpen[k]=!cardExpanded(i,sets.slice(0,n).filter(x=>(x&&x.done)).length>=n);render()}
function toggleWorkoutMenu(i){let k=cardKey(i);jrCardMenu[k]=!jrCardMenu[k];render()}
function toggleWorkoutDetails(i){let k=cardKey(i);jrCardDetails[k]=!jrCardDetails[k];render()}
function exerciseHTML(e,i){let [n,reps]=target(week,e);n+=Number(session(week,day).extraSets?.[e[0]]||0);let s=session(week,day).items?.[e[0]]||{},last=latest(week,day,e[0]),sg=suggestion(week,day,e[0]),advice=weightAdvice(e[0]);let completed=(s.sets||[]).slice(0,n).filter(x=>(x&&x.done)).length,complete=completed===n,open=cardExpanded(i,complete),key=cardKey(i),prev=last?last.sets.map(x=>`${(x&&x.weight)||'—'} × ${(x&&x.reps)}`).slice(0,3).join(' / '):'—';let suggested=advice.value!=null?`${esc(advice.value)} lb`:'Set weight';
return `<section class="card workout-card compact-workout-card ${complete?'movement-complete':''}" data-movement-index="${i}"><div class="compact-card-top"><button type="button" class="movement-drag-handle compact-drag" aria-label="Drag to reorder ${esc(e[0])}" title="Hold and drag to reorder" onpointerdown="movementDragStart(event,${i})" onpointermove="movementDragMove(event)" onpointerup="movementDragEnd(event)" onpointercancel="movementDragEnd(event)">☰</button><button type="button" class="compact-card-title" aria-expanded="${open}" onclick="toggleWorkoutCard(${i})"><strong>${esc(e[0])}</strong><span>${n} × ${reps} · ${suggested} · ${completed}/${n} done</span></button><button type="button" class="compact-chevron" aria-label="${open?'Collapse':'Expand'} ${esc(e[0])}" aria-expanded="${open}" onclick="toggleWorkoutCard(${i})">${open?'⌃':'⌄'}</button><button type="button" class="compact-more" aria-label="More options for ${esc(e[0])}" aria-expanded="${!!jrCardMenu[key]}" onclick="toggleWorkoutMenu(${i})">⋯</button></div>${jrCardMenu[key]?`<div class="compact-options"><button type="button" onclick="openSwap(${i})">⇄ Swap</button><button type="button" onclick="changeMovementStatus(${i},'skipped')">Skip today</button><button type="button" onclick="changeMovementStatus(${i},'removed')">Remove</button><button type="button" onclick="toggleWorkoutDetails(${i})">${jrCardDetails[key]?'Hide':'View'} details</button>${swappedFrom(i)?`<button type="button" onclick="resetSwap(${i})">Restore original</button>`:''}</div>`:''}${open?`<div class="compact-card-body"><div class="compact-set-head"><span>SET</span><span>PREVIOUS</span><span>WEIGHT</span><span>REPS</span><span>DONE</span></div>${Array.from({length:n},(_,j)=>{let v=s.sets?.[j]||{},old=last?.sets?.[j],previous=old?`${old.weight||'—'}×${old.reps||'—'}`:'—';return `<div class="compact-set-row ${v.done?'done':''}"><span>${j+1}</span><span class="compact-previous">${esc(previous)}</span><input type="number" min="0" step="any" inputmode="decimal" aria-label="${esc(e[0])} set ${j+1} weight" placeholder="—" value="${esc(v.weight??'')}" oninput="setValue(${i},${j},'weight',this.value)"><input type="number" min="0" step="any" inputmode="decimal" aria-label="${esc(e[0])} set ${j+1} reps" placeholder="${reps}" value="${esc(v.reps??'')}" oninput="setValue(${i},${j},'reps',this.value)"><button class="set-check-button ${v.done?'checked':''}" aria-pressed="${v.done?'true':'false'}" aria-label="Mark set ${j+1} ${v.done?'incomplete':'complete'}" onclick="toggleSet(${i},${j})"><svg class="set-check-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.4 4.4L19 7.3"/></svg></button></div>`}).join('')}<div class="compact-card-actions"><button type="button" class="secondary" onclick="addWorkoutSet(${i})">＋ Add set</button></div>${jrCardDetails[key]?`<div class="compact-details"><p>${esc(e[5]||'')}</p><p><b>Previous:</b> ${esc(prev)}</p><p><b>Weight guidance:</b> ${esc(advice.note)}</p>${sg?`<p><b>${esc(sg.title)}:</b> ${esc(sg.detail)}</p>`:''}<div class="compact-load-tools"><button onclick="adjustLoad(${i},-5)">−5 lb</button><button onclick="adjustLoad(${i},5)">+5 lb</button><button onclick="copyPrevious(${i})">↻ Last</button></div></div>`:''}</div>`:''}</section>`}


function addWorkoutSet(i){const e=activeExercises()[i];if(!e)return;let ss=ensureSession(week,day);ss.extraSets??={};ss.extraSets[e[0]]=Math.min(12,Number(ss.extraSets[e[0]]||0)+1);const rows=ss.items?.[e[0]]?.sets||[],first=rows.find(x=>x&&x.weight!==''&&x.weight!=null);if(first){let n=target(week,e)[0]+ss.extraSets[e[0]];let row=ensureSet(i,n-1);row.weight=first.weight;row.reps=target(week,e)[1]}jrCardOpen[cardKey(i)]=true;save();render();compactNotice('Set added')}
function openAddMovement(){document.getElementById('addMovementOverlay')?.remove();const overlay=document.createElement('div');overlay.id='addMovementOverlay';overlay.className='beta-overlay';overlay.innerHTML=`<div class="beta-sheet" role="dialog" aria-modal="true" aria-label="Add workout movement"><div class="row"><h2>Add movement</h2><button class="secondary small" onclick="closeAddMovement()">✕</button></div><input id="betaMovementSearch" type="search" placeholder="Search movements" oninput="drawAddMovementResults()" aria-label="Search movements"><div id="betaMovementResults" class="beta-movement-results"></div></div>`;overlay.onclick=e=>{if(e.target===overlay)closeAddMovement()};document.body.appendChild(overlay);drawAddMovementResults();document.getElementById('betaMovementSearch')?.focus()}
function closeAddMovement(){document.getElementById('addMovementOverlay')?.remove()}
function drawAddMovementResults(){const el=document.getElementById('betaMovementResults');if(!el)return;const q=(document.getElementById('betaMovementSearch')?.value||'').toLowerCase().trim(),existing=new Set(activeExercises().map(x=>x[0]));let choices=MOVEMENT_CATALOG.filter(m=>!existing.has(m.name)&&(!q||m.name.toLowerCase().includes(q))).slice(0,45);el.innerHTML=choices.map(m=>`<button type="button" class="beta-movement-option" onclick="addWorkoutMovement(decodeURIComponent('${encodeURIComponent(m.name)}'))"><b>${esc(m.name)}</b><small>${esc(m.category)} · ${esc(m.equipment)}</small><span>＋</span></button>`).join('')||'<p>No matching movements.</p>'}
function addWorkoutMovement(name){const m=movementByName(name);if(!m)return;const ss=ensureSession(week,day);ss.addedMovements??=[];if(activeExercises().some(e=>e[0]===name))return;ss.addedMovements.push([name,m.category,3,m.pattern==='sprint'?1:8,'',`Added to this workout. Confirm safe technique and appropriate intensity with a coach.`]);save();closeAddMovement();render();compactNotice('Movement added')}
function compactNotice(message){document.querySelector('.beta-toast')?.remove();const el=document.createElement('div');el.className='beta-toast';el.setAttribute('role','status');el.textContent=message;document.body.appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),250)},1700)}
let betaAudioContext=null;function betaBeep(){try{betaAudioContext??=new (window.AudioContext||window.webkitAudioContext)();if(betaAudioContext.state==='suspended')betaAudioContext.resume();let osc=betaAudioContext.createOscillator(),gain=betaAudioContext.createGain();osc.type='sine';osc.frequency.value=880;gain.gain.setValueAtTime(.12,betaAudioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,betaAudioContext.currentTime+.13);osc.connect(gain);gain.connect(betaAudioContext.destination);osc.start();osc.stop(betaAudioContext.currentTime+.14)}catch(e){}}
function showWorkoutComplete(){document.querySelector('.beta-complete-overlay')?.remove();let el=document.createElement('div');el.className='beta-complete-overlay';el.innerHTML=`<div class="beta-complete-sheet" role="dialog" aria-modal="true"><div class="beta-complete-ring">✓</div><span>OFFSZN / SESSION COMPLETE</span><h2>WORK PUT IN.</h2><p>Another day stronger. Your workout is saved.</p><button onclick="this.closest('.beta-complete-overlay').remove()">Continue</button></div>`;document.body.appendChild(el);el.onclick=e=>{if(e.target===el)el.remove()}}
function setSession(k,v){ensureSession(week,day)[k]=v;save()}
function setReady(k,v){db.readiness[`${week}-${day}`]??={};db.readiness[`${week}-${day}`][k]=v;save();render()}
function ensureSet(i,j){let e=activeExercises()[i][0],s=ensureSession(week,day);s.items??={};s.items[e]??={sets:[]};return s.items[e].sets[j]??={}}
function setValue(i,j,k,v){let row=ensureSet(i,j),previous=row[k];row[k]=v===''?'':Number(v);if(k==='weight'&&j===0&&v!==''&&previous!==row[k]){let name=activeExercises()[i][0],rows=ensureSession(week,day).items[name].sets;for(let x=1;x<target(week,activeExercises()[i])[0]+Number(session(week,day).extraSets?.[name]||0);x++){let other=ensureSet(i,x);if(!other.done&&(other.weight==null||other.weight===''||other.autoSuggested||other.weight===previous)){other.weight=row[k];other.autoSuggested=false;const input=document.querySelector(`input[aria-label=\"${CSS.escape(name)} set ${x+1} weight\"]`);if(input)input.value=row[k]}}}save()}
function toggleSet(i,j){let e=activeExercises()[i],v=ensureSet(i,j),was=!!v.done,oldBest=best(e[0],{w:week,d:day,j});if(v.reps==null||v.reps==='')v.reps=target(week,e)[1];v.done=!was;if(v.done&&Array.from({length:target(week,e)[0]+Number(session(week,day).extraSets?.[e[0]]||0)},(_,idx)=>ensureSet(i,idx)).every(row=>row.done))jrCardOpen[cardKey(i)]=false;save();if(!was&&Number(v.weight)>oldBest&&Number(v.weight)>0&&Number(v.reps)>0)toast(`🏆 NEW PR! ${e[0]} — ${v.weight} lb`);else if(!was)compactNotice('✓ Set saved');if(!was&&db.settings.autoRest)startRest(Number(db.settings.rest)||90);render()}
function adjustLoad(i,delta){let e=activeExercises()[i],n=target(week,e)[0],s=ensureSession(week,day);let sets=s.items?.[e[0]]?.sets||[],prev=latest(week,day,e[0]);let load=sets.find(x=>(x&&x.weight)!==''&&(x&&x.weight)!=null)?.weight??prev?.sets.find(x=>(x&&x.weight)!==''&&(x&&x.weight)!=null)?.weight??0;load=Math.max(0,Number(load)+delta);for(let j=0;j<n;j++){let v=ensureSet(i,j);if(!v.done)v.weight=load}save();render()}
function copyPrevious(i){let e=activeExercises()[i],prev=latest(week,day,e[0]);if(!prev){toast('No earlier set data yet');return}let n=target(week,e)[0];for(let j=0;j<n;j++){let v=ensureSet(i,j),a=prev.sets[j]||prev.sets[prev.sets.length-1];if(!v.done&&a){v.weight=a.weight??'';v.reps=a.reps??''}}save();render();toast('Previous values copied')}
function setWorkoutRating(n){let s=ensureSession(week,day);s.rating=Math.max(1,Math.min(5,Number(n)||1));save();render()}
function finishWorkout(){let s=ensureSession(week,day);if(!s.finished&&!s.rating){toast('Select a star rating before finishing.');return}if(!s.finished&&readinessState(week,day).level==='red'&&!confirm('Pain was reported. Do not train through pain. Mark this as a modified/recovery session?'))return;s.finished=!s.finished;if(s.finished&&s.rating)s.technique=s.rating>=4?'good':'needs-work';save();render();if(s.finished)showWorkoutComplete();else compactNotice('Workout reopened')}
function openDemo(i){const e=activeExercises()[i];if(!e){toast('Movement unavailable');return}if(['Leg curl','Landmine press','Hammer curl','Triceps pressdown','Bulgarian split squat','Dumbbell step-up','Slider hamstring curl'].includes(e[0])&&!JR_RENDERED_VIDEOS[e[0]]){showMovementGuideFallback(e[0],e[5]||'Ask a qualified coach for a demonstration.');return}try{showExerciseVideo(e[0])}catch(err){console.error('Movement demo error',err);showMovementGuideFallback(e[0],e[5]||'Ask a qualified coach for a demonstration.')}}
function showMovementGuideFallback(name,cue){document.getElementById('videoOverlay')?.remove();const overlay=document.createElement('div');overlay.id='videoOverlay';overlay.className='video-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.innerHTML=`<div class="video-sheet"><div class="row"><span class="pill gray">MOVEMENT GUIDE</span><button class="secondary small" type="button" onclick="closeExerciseVideo()">✕ Close</button></div><h2>${esc(name)}</h2><p>${esc(cue)}</p><p class="mini">An exercise-specific video is not available. Review technique with a qualified coach.</p></div>`;overlay.onclick=event=>{if(event.target===overlay)closeExerciseVideo()};document.body.appendChild(overlay)}
function startRest(sec){clearInterval(restInterval);restRemaining=sec;renderTimer();restInterval=setInterval(()=>{restRemaining--;if(restRemaining>=1&&restRemaining<=3)betaBeep();renderTimer();if(restRemaining<=0){clearInterval(restInterval);toast('⏱ Rest complete');if(navigator.vibrate)navigator.vibrate([150,90,150])}},1000)}
function stopRest(){clearInterval(restInterval);restRemaining=0;renderTimer()}
function renderTimer(){let el=$('timerDock');if(!el)return;if(restRemaining<=0){el.classList.add('hidden');return}el.classList.remove('hidden');el.innerHTML=`<div class="row"><div><small>REST TIMER</small><br><strong>${Math.floor(restRemaining/60)}:${String(restRemaining%60).padStart(2,'0')}</strong></div><div class="actionrow"><button class="small secondary" onclick="restRemaining+=30;renderTimer()">+30s</button><button class="small" onclick="stopRest()">Done</button></div></div>`}
function calendarGrid(dateStr){let dt=new Date(dateStr+'T12:00:00'),year=dt.getFullYear(),month=dt.getMonth(),first=(new Date(year,month,1).getDay()+6)%7,last=new Date(year,month+1,0).getDate();let html='<div class="row"><button class="small secondary calendar-nav-arrow" aria-label="Change calendar month" onclick="moveMonth(-1)">‹</button><b>'+dt.toLocaleDateString(undefined,{month:'long',year:'numeric'})+'</b><button class="small secondary calendar-nav-arrow" aria-label="Change calendar month" onclick="moveMonth(1)">›</button></div><div class="calendar-grid">';html+=['M','T','W','T','F','S','S'].map(d=>'<small>'+d+'</small>').join('');for(let i=0;i<first;i++)html+='<span></span>';for(let n=1;n<=last;n++){let date=year+'-'+String(month+1).padStart(2,'0')+'-'+String(n).padStart(2,'0'),weekday=WEEKDAYS[new Date(date+'T12:00:00').getDay()],has=scheduleDay(weekday,date).length>0||db.extraEvents.some(e=>e.date===date),selected=date===dateStr;html+='<button class="cal-day '+(selected?'chosen':'')+'" onclick="selectScheduleCalendarDate(\''+date+'\',\''+weekday+'\')">'+n+(has?'<i>•</i>':'')+'</button>'}return html+'</div>'}
function moveMonth(n){let dt=new Date(selectedDate+'T12:00:00');dt.setDate(1);dt.setMonth(dt.getMonth()+n);selectedDate=dt.toISOString().slice(0,10);render()}
function renderSchedule(){let schedule=db.schedule;let d=selectedDate;let weekday=WEEKDAYS[new Date(d+'T12:00:00').getDay()];let extra=db.extraEvents.filter(x=>x.date===d);$('app').innerHTML=`<div class="card hero"><span class="pill">BASEBALL + TRAINING</span><h1>YOUR <span class="accent">SCHEDULE</span></h1><p>Everything in one place. Record pitching and hitting workload to inform recovery.</p><label>Choose a date<input type="date" value="${esc(d)}" onchange="selectedDate=this.value;render()"></label></div><div class="card">${calendarGrid(d)}</div><div class="card"><div class="jr-schedule-day-header"><h2>${esc(weekday)} · ${esc(d)}</h2><button type="button" class="jr-add-activity-icon" onclick="openOneTimeActivity()" aria-label="Add one-time activity for ${esc(d)}" title="Add one-time activity"><svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>${scheduleDay(weekday,d).map(e=>eventHTML(e,true)).join('')||'<p>No repeating activities.</p>'}${extra.map(x=>`<div class="event"><div class="event-body"><b>${esc(x.name)}</b><small>${esc(x.time)}</small></div><button class="small secondary" onclick="downloadEventCalendar('${esc(x.id)}','extra')">+ Calendar</button><button class="small secondary" onclick="removeEvent('${esc(x.id)}')">Remove</button></div>`).join('')}</div><div class="card"><h2>Pitching cycle</h2><p class="mini">Coach Taylor is scheduled every other Tuesday at 4:30 PM. Select a Tuesday that has a lesson to align the calendar.</p><label>Pitching Tuesday anchor<input type="date" value="${esc(pitchingAnchor())}" onchange="setPitchAnchor(this.value)"></label><p class="mini">${pitchingOnDate(scheduleDateForDay(d,'Tuesday'))?'Pitching lesson this week':'No pitching lesson this week'} · Monday lifting uses the selected program week’s pitching/recovery emphasis.</p></div><div class="card"><h2>Weekly lineup</h2>${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(x=>`<div class="daybox"><b>${x}</b>${scheduleDay(x,scheduleDateForDay(d,x)).map(e=>eventHTML(e,true)).join('')||'<p class="mini">No activity</p>'}</div>`).join('')}</div><div class="card"><h2>Baseball workload log</h2><p class="mini">Use this after lessons or practice. The app flags reported pain but does not diagnose injuries.</p><label>Log date<input type="date" id="baseballDate" value="${esc(d)}" onchange="selectedDate=this.value;render()"></label><div class="grid" style="margin-top:10px"><label>Activity<select id="bbActivity"><option>Pitching</option><option>Practice</option><option>Hitting</option><option>Game</option></select></label><label>Pitch count (if known)<input type="number" min="0" id="bbPitches" placeholder="Optional"></label><label>Throwing effort (1–5)<select id="bbEffort"><option value="">Not recorded</option>${[1,2,3,4,5].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Arm discomfort?<select id="bbPain"><option>No</option><option>Yes</option></select></label></div><label style="display:block;margin-top:10px">Notes<textarea id="bbNotes" placeholder="Lesson notes, throwing workload, arm feel..."></textarea></label><button onclick="addBaseballLog()">Save baseball log</button><div style="margin-top:12px">${Object.entries(db.baseball).filter(([date])=>date===d).flatMap(([date,arr])=>arr.map((x,i)=>`<div class="event"><div class="event-body"><b>${esc(x.activity)}</b><small>${esc(date)} · ${x.pitches||'—'} pitches · arm discomfort: ${esc((x&&x.pain))}</small><small>${esc(x.notes||'')}</small></div><button class="small secondary" onclick="removeBaseballLog('${esc(date)}',${i})">✕</button></div>`)).join('')||'<small>No logs for this date.</small>'}</div></div><div class="card"><h2>Edit repeating schedule</h2><p class="mini">Changes are saved locally. The training week starts Monday, with workouts Monday, Thursday, and Saturday.</p>${schedule.map(e=>`<div class="event"><div class="event-body"><b>${esc(e.day)} — ${esc(e.name)}</b><small>${esc(e.time)}</small></div><button class="small secondary" onclick="downloadEventCalendar('${esc(e.id)}','recurring')">+ Calendar</button><button class="small secondary" onclick="editEvent('${esc(e.id)}')">Edit</button></div>`).join('')}<button class="secondary" onclick="addRecurring()">+ Add repeating activity</button></div>`}
function openOneTimeActivity(){
 closeOneTimeActivity();
 const overlay=document.createElement('div');
 overlay.className='jr-activity-overlay';overlay.id='jrActivityOverlay';
 overlay.setAttribute('role','presentation');
 overlay.innerHTML=`<section class="jr-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="jrActivityTitle"><div class="jr-activity-dialog-header"><div><small>ONE-TIME EVENT</small><h2 id="jrActivityTitle">Add activity</h2><p>${esc(selectedDate)}</p></div><button type="button" class="jr-activity-close" onclick="closeOneTimeActivity()" aria-label="Close">✕</button></div><form id="jrActivityForm" onsubmit="event.preventDefault();addEvent()"><label>Activity<input id="newEventName" name="activity" autocomplete="off" maxlength="120" placeholder="Tournament / game" required></label><label>Time<input id="newEventTime" name="time" placeholder="9:00 AM" autocomplete="off"></label><div class="jr-activity-actions"><button type="button" class="secondary" onclick="closeOneTimeActivity()">Cancel</button><button type="submit">Add activity</button></div></form></section>`;
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeOneTimeActivity()});
 document.body.appendChild(overlay);
 const input=overlay.querySelector('#newEventName');if(input)input.focus({preventScroll:true});
}
function closeOneTimeActivity(){const overlay=document.getElementById('jrActivityOverlay');if(overlay)overlay.remove()}
function addEvent(){
 const nameEl=$('newEventName'),timeEl=$('newEventTime');
 if(!nameEl)return;
 const name=nameEl.value.trim(),time=timeEl?timeEl.value.trim():'';
 if(!name){nameEl.focus();return toast('Enter an activity name')}
 db.extraEvents.push({id:String(Date.now()),date:selectedDate,name,time});
 save();closeOneTimeActivity();render();toast('Activity added');
}

function removeEvent(id){db.extraEvents=db.extraEvents.filter(e=>e.id!==id);save();render()}
function editEvent(id){let e=db.schedule.find(x=>x.id===id);if(!e)return;let name=prompt('Activity',e.name);if(name===null||!name.trim())return;let time=prompt('Time',e.time);if(time===null)return;e.name=name.trim();e.time=time.trim();save();render()}
function addRecurring(){let name=prompt('Repeating activity name');if(!name?.trim())return;let dayName=prompt('Day of week (e.g., Tuesday)','Tuesday');if(!WEEKDAYS.includes(dayName))return toast('Enter a valid weekday');let time=prompt('Time','Flexible');db.schedule.push({id:'custom-'+Date.now(),day:dayName,name:name.trim(),time:time||'Flexible',type:'baseball'});save();render()}
function addBaseballLog(){let d=$('baseballDate').value,entry={activity:$('bbActivity').value,pitches:$('bbPitches').value,effort:$('bbEffort').value,pain:$('bbPain').value,notes:$('bbNotes').value};db.baseball[d]??=[];db.baseball[d].push(entry);save();render();toast('Baseball workload saved')}
function removeBaseballLog(d,i){db.baseball[d].splice(i,1);save();render()}
const BADGES=[['🏁','First Workout','Complete 1 workout',()=>completedCount()>=1],['🔥','Full Week','Complete all 3 workouts in any week',()=>Array.from({length:12},(_,i)=>DAYS.every(d=>finished(i+1,d))).some(Boolean)],['🏅','12-Week Finisher','Complete all 36 workouts',()=>completedCount()===36],['💪','Strength PR','Log a weighted personal best',()=>['Barbell back squat','Barbell front squat','Barbell strict press'].some(n=>best(n)>0)],['⚡','Speed Progress','Improve 10-yard sprint time',()=>testImproved('10-yard sprint')],['🚀','Explosive Progress','Improve a jump measurement',()=>testImproved('Vertical jump')||testImproved('Broad jump')],['🧠','Smart Training','Complete a readiness check',()=>Object.values(db.readiness).some(r=>r.energy&&r.sleep&&r.soreness!==''&&r.soreness!=null)],['🛡️','Recovery Matters','Complete a recovery-week workout',()=>[4,8,12].some(w=>DAYS.some(d=>finished(w,d)))] ];
function testImproved(name){let t=db.tests[name]||{},a=Number(t[1]),b=Number(t[12]||t[6]);if(!a||!b)return false;return ['10-yard sprint','20-yard sprint','5-10-5 shuttle'].includes(name)?b<a:b>a}
function renderProgress(){let done=completedCount();let rated=Object.values(db.sessions).filter(s=>s.finished&&Number(s.rating)>=1&&Number(s.rating)<=5);let avg=rated.length?(rated.reduce((n,s)=>n+Number(s.rating),0)/rated.length).toFixed(1):'—';$('app').innerHTML=`${athleticDashboard()}<div class="card session-rating-summary"><div class="row"><div><small>SESSION EXPERIENCE</small><h2>Workout ratings</h2></div><div class="rating-average">${avg}<span> / 5 ★</span></div></div><p class="mini">${rated.length} completed workout${rated.length===1?'':'s'} rated. Ratings reflect how each session felt, not lifting performance.</p><div class="rating-history">${rated.slice(-8).reverse().map(s=>`<span class="rating-history-pill" title="${esc(s.date||'Workout')}">${esc(s.date||'Workout')} · ${'★'.repeat(Number(s.rating))}</span>`).join('')||'<span class="mini">Finish a workout to start tracking ratings.</span>'}</div></div><div class="card hero"><span class="pill">YOUR DEVELOPMENT</span><h1>PROGRESS <span class="accent">REPORT</span></h1><p>Celebrate consistency, strength, speed, and movement quality—not just lifting more.</p><div class="grid"><div><small>WORKOUTS</small><div class="metric">${done}/36</div></div><div><small>BADGES EARNED</small><div class="metric">${BADGES.filter(b=>b[3]()).length}/${BADGES.length}</div></div></div></div><div class="card"><h2>Strength trends</h2><label>Exercise<select id="chartLift" onchange="drawChart()">${['Barbell back squat','Barbell front squat','Barbell strict press','Trap bar deadlift','Dumbbell bench press'].map(x=>`<option>${x}</option>`).join('')}</select></label><canvas class="chart" id="liftChart" width="700" height="270" aria-label="Strength progress chart"></canvas><p class="mini">Highest logged weight for completed sets in each week.</p></div><div class="card"><h2>Athletic performance scorecard</h2><p class="mini">Enter baseline, Week 6, and Week 12 results. Lower sprint times and higher jumps indicate improvement.</p><div class="scroll"><table><tr><th>TEST</th><th>W1</th><th>W6</th><th>W12</th><th>CHANGE</th></tr>${tests.map(t=>`<tr><td>${esc(t[0])}<br><small>${esc(t[1])}</small></td>${[1,6,12].map(w=>`<td><input type="number" min="0" step="any" inputmode="decimal" aria-label="${esc(t[0])} week ${w}" value="${esc(db.tests[t[0]]?.[w]??'')}" oninput="setTest('${esc(t[0])}',${w},this.value)"></td>`).join('')}<td id="test-${tests.indexOf(t)}">${testDelta(t)}</td></tr>`).join('')}</table></div></div><div class="card"><h2>Achievements</h2><div class="badge-grid">${BADGES.map(([emoji,title,description,fn])=>`<div class="badge ${fn()?'':'locked'}"><div class="emoji">${emoji}</div><b>${esc(title)}</b><small>${esc(description)}</small>${fn()?'<span class="pill green">UNLOCKED</span>':'<span class="pill gray">LOCKED</span>'}</div>`).join('')}</div></div><div class="card"><h2>Weekly consistency</h2>${Array.from({length:12},(_,i)=>{let n=DAYS.filter(d=>finished(i+1,d)).length;return `<div class="progresslabel"><small>Week ${i+1}</small><b>${n}/3</b></div><div class="bar"><span style="width:${n/3*100}%"></span></div>`}).join('')}</div>`;drawChart()}
function setTest(name,w,v){db.tests[name]??={};db.tests[name][w]=v===''?'':Number(v);save();let t=tests.find(x=>x[0]===name),cell=$('test-'+tests.indexOf(t));if(cell)cell.textContent=testDelta(t)}
function testDelta(t){let obj=db.tests[t[0]]||{},a=Number(obj[1]),b=Number(obj[12]||obj[6]);if(!a||!b)return '—';let delta=b-a;if(t[2]==='lower')return `${delta<0?'↑':delta>0?'↓':'='} ${Math.abs(delta).toFixed(2)} ${t[1]}`;return `${delta>0?'↑':delta<0?'↓':'='} ${Math.abs(delta).toFixed(1)} ${t[1]}`}
function drawChart(){let c=$('liftChart');if(!c)return;let ctx=c.getContext('2d'),name=$('chartLift').value,vals=[];for(let w=1;w<=12;w++){let sets=DAYS.flatMap(d=>session(w,d).items?.[name]?.sets||[]);let a=sets.filter(x=>(x&&x.done)&&Number((x&&x.weight))>0).map(x=>Number((x&&x.weight)));vals.push(a.length?Math.max(...a):null)}ctx.clearRect(0,0,700,270);ctx.fillStyle='#b7bcc8';ctx.font='15px system-ui';ctx.fillText('Highest logged load (lb)',40,25);ctx.strokeStyle='#505663';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(45,42);ctx.lineTo(45,225);ctx.lineTo(678,225);ctx.stroke();let max=Math.max(10,...vals.filter(v=>v!=null))*1.2;let started=false;ctx.strokeStyle='#cbd0d5';ctx.lineWidth=4;ctx.beginPath();vals.forEach((v,i)=>{let x=58+i*54,y=225-(v/max)*165;ctx.fillStyle='#bec2cd';ctx.fillText(i+1,x-4,247);if(v==null){started=false;return}if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y)});ctx.stroke();vals.forEach((v,i)=>{if(v==null)return;let x=58+i*54,y=225-(v/max)*165;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle='#e0e4e8';ctx.fill();ctx.fillStyle='#fff';ctx.font='13px system-ui';ctx.fillText(String(v),x-9,y-12)});if(!vals.some(v=>v!=null)){ctx.fillStyle='#aeb2bc';ctx.fillText('Log completed strength sets to see progress.',80,145)}}
function profileData(){return db.profile||{name:(authUser?'':'JR'),team:'',position:'',bats:'',throws:'',number:'',goal:'Build strength, speed and explosiveness',goalWorkouts:3,trainingNotes:''}}
function updateProfile(field,value){let p=db.profile??={...profileData()};p[field]=field==='goalWorkouts'?Math.max(1,Math.min(7,Number(value)||3)):String(value).slice(0,250);save();toast('Profile saved')}
function confirmProfileSave(){save();view='athlete';render();toast('✓ Profile saved successfully')}
function profileEdit(){
 const p=profileData(), initials=(p.name||'JR').slice(0,2).toUpperCase();
 $('app').innerHTML=`<section class="off-detail-page"><div class="off-detail-title"><span class="v7-kicker">YOUR PLAYER PROFILE</span><h1>ATHLETE <span class="accent">DETAILS</span></h1><p>Keep your baseball profile up to date. Changes save when you leave a field.</p></div>
 <div class="off-profile-photo"><div class="off-profile-avatar">${p.photo?`<img src="${esc(p.photo)}" alt="Athlete photo">`:esc(initials)}</div><strong>${esc(p.name||'Athlete')}</strong><label class="off-photo-upload">Change photo<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onchange="uploadAthletePhoto(event)"></label>${p.photo?'<button class="off-text-button" onclick="removeAthletePhoto()">Remove photo</button>':''}</div>
 <div class="off-detail-section"><h2>PLAYER INFORMATION</h2>
 <label class="off-field">Full name<input maxlength="40" value="${esc(p.name||'')}" onchange="updateProfile('name',this.value)"></label>
 <div class="off-field-grid"><label class="off-field">Primary position<input maxlength="40" placeholder="e.g. Pitcher / OF" value="${esc(p.position||'')}" onchange="updateProfile('position',this.value)"></label><label class="off-field">Jersey number<input maxlength="5" placeholder="Optional" value="${esc(p.number||'')}" onchange="updateProfile('number',this.value)"></label></div>
 <div class="off-field-grid"><label class="off-field">Bats<select onchange="updateProfile('bats',this.value)">${['','Right','Left','Switch'].map(v=>`<option value="${v}" ${p.bats===v?'selected':''}>${v||'Not set'}</option>`).join('')}</select></label><label class="off-field">Throws<select onchange="updateProfile('throws',this.value)">${['','Right','Left'].map(v=>`<option value="${v}" ${p.throws===v?'selected':''}>${v||'Not set'}</option>`).join('')}</select></label></div>
 </div><div class="off-detail-section"><h2>TRAINING GOALS</h2>
 <label class="off-field">Your main goal<textarea maxlength="250" rows="3" onchange="updateProfile('goal',this.value)">${esc(p.goal||'')}</textarea></label>
 <label class="off-field">Weekly workout target<select onchange="updateProfile('goalWorkouts',this.value)">${[1,2,3,4,5,6,7].map(v=>`<option value="${v}" ${Number(p.goalWorkouts)===v?'selected':''}>${v} day${v>1?'s':''} per week</option>`).join('')}</select></label>
 <label class="off-field">Training notes<textarea maxlength="250" rows="3" placeholder="Equipment preferences, reminders..." onchange="updateProfile('trainingNotes',this.value)">${esc(p.trainingNotes||'')}</textarea></label>
 </div><div class="off-detail-section off-account-link"><button onclick="settingsOpen('account')"><span>${uiIcon('backup')}</span><span><strong>Account & backup</strong><small>Sign in and manage your training backups</small></span><b>›</b></button></div>
 <button class="wide off-save-button" onclick="save();settingsOpen('');toast('Athlete profile saved')">✓ Done editing</button><p class="mini">Avoid storing medical information or personal contact details here. Profile data is stored on this device unless you manually back it up.</p></section>`;
}
function removeAthletePhoto(){let p=db.profile??={...profileData()};delete p.photo;save();render();toast('Profile picture removed')}
async function uploadAthletePhoto(ev){const file=ev.target.files?.[0];if(!file)return;if(file.size>15*1024*1024){alert('Choose a photo smaller than 15 MB.');return}try{let bitmap=await createImageBitmap(file),size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;let ctx=canvas.getContext('2d');let side=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);bitmap.close?.();let photo=canvas.toDataURL('image/jpeg',.75);if(photo.length>180000)throw Error('Image too large after resizing');let p=db.profile??={...profileData()};p.photo=photo;save();render();toast('Photo updated')}catch(e){alert('Could not process that photo. Try a JPG or PNG. '+e.message)}}
function measurements(){return Array.isArray(db.measurements)?db.measurements:[]}
function latestMeasure(field){return [...measurements()].filter(x=>Number(x[field])>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-1)[0]}
function measurementChart(field,unit){let points=[...measurements()].filter(x=>Number(x[field])>0).sort((a,b)=>a.date.localeCompare(b.date));if(!points.length)return '<p class="mini">No measurements yet. Add an entry to start a chart.</p>';if(points.length===1)return `<div class="metric">${esc(points[0][field])} <small>${unit}</small></div><p class="mini">Add another dated measurement to see a trend.</p>`;let vals=points.map(x=>Number(x[field])),min=Math.min(...vals),max=Math.max(...vals),range=Math.max(max-min,1),xy=vals.map((v,i)=>[(20+i*280/(vals.length-1)).toFixed(1),(140-(v-min)/range*112).toFixed(1)]),line=xy.map(a=>a.join(',')).join(' ');return `<svg class="growth-chart" viewBox="0 0 320 170" role="img" aria-label="${field} trend from ${vals[0]} to ${vals[vals.length-1]} ${unit}"><line x1="20" y1="140" x2="300" y2="140" stroke="#626a73"/><polyline points="${line}" fill="none" stroke="#e2e6ea" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${xy.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="#f4f5f6"/>`).join('')}<text x="20" y="161" fill="#c8cdd2" font-size="11">${esc(points[0].date)}</text><text x="300" y="161" text-anchor="end" fill="#c8cdd2" font-size="11">${esc(points[points.length-1].date)}</text></svg><p class="mini">${vals[0]} → ${vals[vals.length-1]} ${unit} · ${points.length} measurements</p>`}
function renderGrowth(){let w=latestMeasure('weight'),h=latestMeasure('height'),height=h?Number(h.height):0,feet=Math.floor(height/12),inch=(height%12).toFixed(1).replace(/\.0$/,'');let rows=[...measurements()].sort((a,b)=>b.date.localeCompare(a.date));$('app').innerHTML=`<div class="card hero"><button class="secondary small" onclick="view='athlete';render()">← Profile</button><span class="pill">ATHLETE DEVELOPMENT</span><h1>HEIGHT & WEIGHT</h1><p>Track JR’s growth over time without weight targets or comparisons to other athletes.</p></div><div class="grid"><div class="card"><small>LATEST WEIGHT</small><div class="metric">${w?esc(w.weight)+' <small>lb</small>':'—'}</div><p class="mini">${w?esc(w.date):'Not recorded'}</p></div><div class="card"><small>LATEST HEIGHT</small><div class="metric">${h?`${feet}′ ${inch}″`:'—'}</div><p class="mini">${h?esc(h.date):'Not recorded'}</p></div></div><div class="card" style="margin-top:13px"><h2>Add measurement</h2><form onsubmit="addMeasurement(event)"><div class="grid"><label>Date<input id="measureDate" type="date" required value="${new Date().toLocaleDateString('en-CA')}"></label><label>Weight (lb)<input id="measureWeight" type="number" inputmode="decimal" min="20" max="600" step="0.1" placeholder="Optional"></label><label>Height — feet<input id="measureFeet" type="number" inputmode="numeric" min="2" max="8" step="1" placeholder="Optional"></label><label>Height — inches<input id="measureInches" type="number" inputmode="decimal" min="0" max="11.9" step="0.1" placeholder="Optional"></label></div><button class="wide" type="submit" style="margin-top:14px">+ Save measurement</button></form><p class="mini">Enter weight, height, or both. Measure under similar conditions for useful trends.</p></div><div class="card"><h2>Weight history</h2>${measurementChart('weight','lb')}</div><div class="card"><h2>Height history</h2>${measurementChart('height','in')}</div><div class="card"><h2>Measurement history</h2>${rows.length?rows.map(x=>`<div class="event"><div class="event-body"><b>${esc(x.date)}</b><small>${(x&&x.weight)?esc((x&&x.weight))+' lb':''}${(x&&x.weight)&&x.height?' · ':''}${x.height?`${Math.floor(x.height/12)}′ ${(x.height%12).toFixed(1).replace(/\.0$/,'')}″`:''}</small></div><button class="secondary small" aria-label="Delete measurement on ${esc(x.date)}" onclick="deleteMeasurement('${esc(x.id)}')">Delete</button></div>`).join(''):'<p class="mini">No measurements recorded yet.</p>'}</div><div class="notice">Height and weight change naturally during adolescence. These charts are for observing growth, not judging performance or setting weight-loss goals. When cloud sync is connected, records are uploaded to the athlete's private cloud account; otherwise they remain on this device.</div>`}
function addMeasurement(ev){ev.preventDefault();let date=$('measureDate').value,weight=$('measureWeight').value,ft=$('measureFeet').value,inch=$('measureInches').value;if(!date||(!weight&&ft===''&&inch==='')){alert('Enter a date and at least one measurement.');return}if((ft!==''||inch!=='')&&ft===''){alert('Enter feet when recording height.');return}let w=weight!==''?Number(weight):null,h=ft!==''?Number(ft)*12+Number(inch||0):null;if((w!==null&&(!Number.isFinite(w)||w<20||w>600))||(h!==null&&(!Number.isFinite(h)||h<24||h>107.9))){alert('Check the measurements and try again.');return}db.measurements??=[];db.measurements.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),date,weight:w,height:h});save();render();toast('Measurement saved')}
function deleteMeasurement(id){offsznConfirm('Delete measurement?','This measurement cannot be recovered unless it is in a backup.',()=>{db.measurements=measurements().filter(x=>x.id!==id);save();render();toast('Measurement deleted')},true)}
function profileSettings(){
 const p=profileData();
 $('app').innerHTML=`<section class="off-detail-page off-workout-settings">
 <div class="off-workout-banner"><span class="v7-kicker">PERSONALIZE YOUR TRAINING</span><h1>WORKOUT <span class="accent">PREFERENCES</span></h1><p>Set up training around your schedule and recovery.</p></div>
 <div class="off-detail-section"><h2>TRAINING SETUP</h2>
 <label class="off-setting-field"><span><strong>Training days per week</strong><small>Your weekly workout target</small></span><select aria-label="Training days per week" onchange="updateProfile('goalWorkouts',this.value)">${[1,2,3,4,5,6,7].map(v=>`<option value="${v}" ${Number(p.goalWorkouts)===v?'selected':''}>${v} days</option>`).join('')}</select></label>
 <label class="off-setting-field"><span><strong>Default rest time</strong><small>Suggested break between sets</small></span><select aria-label="Default rest time" onchange="db.settings.rest=+this.value;save();toast('Rest time updated')">${[60,90,120,180].map(v=>`<option value="${v}" ${Number(db.settings.rest)===v?'selected':''}>${v} sec</option>`).join('')}</select></label>
 <label class="off-setting-field off-toggle-row"><span><strong>Auto-start rest timer</strong><small>Start countdown after completing a set</small></span><input type="checkbox" role="switch" aria-label="Auto-start rest timer" ${db.settings.autoRest?'checked':''} onchange="db.settings.autoRest=this.checked;save();toast('Rest timer preference saved')"><span class="off-toggle-track" aria-hidden="true"></span></label>
 </div><div class="off-detail-section"><h2>TRAINING TOOLS</h2>
 <button class="off-setting-link" onclick="settingsOpen('strength')"><span><strong>Strength profile</strong><small>Manage working weights and load increments</small></span><b>›</b></button>
 <button class="off-setting-link" onclick="settingsOpen('reminders')"><span><strong>Event reminders</strong><small>Manage upcoming activities</small></span><b>›</b></button>
 </div><div class="notice">Training loads and progression are suggestions. Follow your coach's guidance and adjust for throwing workload, pain and recovery.</div>
 </section>`;
}
function profileMenu(title,desc,iconName,action){return `<button class="profile-menu" onclick="${action}"><span class="profile-menu-icon">${iconName}</span><span class="profile-menu-text"><b>${title}</b><small>${desc}</small></span><span class="profile-chevron">›</span></button>`}
function renderProfile(){
 if(view==='parent')return renderParent();
 if(view==='library')return renderLibrary();
 if(view==='data')return renderData();
 if(view==='edit')return profileEdit();
 if(view==='settings')return profileSettings();
 if(view==='growth')return renderGrowth();
 const p=profileData(),count=completedCount(),total=36,pct=Math.min(100,Math.round(count/total*100)),
 current=DAYS.filter(d=>finished(week,d)).length,goal=Math.max(1,Number(p.goalWorkouts)||3),
 prNames=['Barbell back squat','Barbell front squat','Barbell strict press','Trap bar deadlift'],
 prs=prNames.filter(n=>best(n)>0),logged=Object.values(db.baseball).flat().length,
 weight=latestMeasure('weight'),height=latestMeasure('height'),
 initials=(p.name||'JR').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase(),
 heightText=height?`${Math.floor(height.height/12)}′ ${(height.height%12).toFixed(1).replace(/\.0$/,'')}″`:'—';
 $('app').innerHTML=`<main class="profile-v812">
  <header class="profile-v812-top"><span class="v7-kicker">ATHLETE / PROFILE</span><button class="profile-v812-edit" onclick="view='edit';render()" aria-label="Edit athlete profile">${uiIcon('profile')} <span>Edit</span></button></header>
  <section class="profile-v812-identity"><div class="profile-v812-avatar">${p.photo?`<img src="${esc(p.photo)}" alt="Athlete profile picture">`:esc(initials)}</div><div class="profile-v812-name"><h1>${esc(p.name||'JR')}${p.number?` <span>#${esc(p.number)}</span>`:''}</h1><p>${esc(p.position||'Baseball athlete')}</p><div class="profile-v812-chips">${p.bats?`<span>BATS ${esc(p.bats)}</span>`:''}${p.throws?`<span>THROWS ${esc(p.throws)}</span>`:''}<span>WEEK ${week} OF 12</span></div></div></section>
  <section class="profile-v812-metrics" aria-label="Athlete statistics"><div><strong>${count}</strong><span>Workouts</span></div><div><strong>${prs.length}</strong><span>Lifts tracked</span></div><div><strong>${logged}</strong><span>Baseball logs</span></div></section>
  <section class="profile-v812-panel"><div class="profile-v812-sectionhead"><h2>TRAINING PROGRESS</h2><span>WEEK ${week} / 12</span></div><div class="profile-v812-progressline"><b>${pct}% complete</b><small>${count} of ${total} workouts</small></div><div class="profile-v812-track"><span style="width:${pct}%"></span></div><div class="profile-v812-two"><div><b>${current} / ${goal}</b><small>This week's goal</small></div><div><b>${esc(phase(week))}</b><small>Current phase</small></div></div><button class="profile-v812-link" onclick="nav('progress')">View progress <span>→</span></button></section>
  <section class="profile-v812-panel"><div class="profile-v812-sectionhead"><h2>ATHLETE DEVELOPMENT</h2><button class="profile-v812-textbutton" onclick="view='growth';render()">History →</button></div><div class="profile-v812-two profile-v812-body"><div><small>BODY WEIGHT</small><b>${weight?esc(weight.weight)+' lb':'—'}</b></div><div><small>HEIGHT</small><b>${heightText}</b></div></div><button class="profile-v812-link" onclick="view='growth';render()">+ Add measurement <span>→</span></button></section>
  <section class="profile-v812-panel profile-v812-goal"><div class="profile-v812-sectionhead"><h2>TRAINING GOAL</h2><button class="profile-v812-textbutton" onclick="view='edit';render()">Edit →</button></div><p>${esc(p.goal||'Build strength, speed and explosiveness')}</p></section>
  <section class="profile-v812-links"><h2>QUICK ACCESS</h2>
  ${profileMenu('Training calendar','Practices, workouts and events',uiIcon('schedule'),"nav('schedule')")}
  ${profileMenu('Movement library','Exercise demonstrations and technique',uiIcon('library'),"nav('library')")}
  ${profileMenu('Personal records','Strength and performance history',uiIcon('progress'),"nav('progress')")}
  ${profileMenu('Strength profile','Working weights and estimated maxes',uiIcon('train'),"openSettings();settingsOpen('strength')")}
  </section>
  <section class="profile-v812-links"><h2>PROFILE & SETTINGS</h2>
  ${profileMenu('Athlete details','Photo, position, jersey and goals',uiIcon('profile'),"view='edit';render()")}
  ${profileMenu('Parent overview','Training and recovery summary',uiIcon('home'),"view='parent';render()")}
  ${profileMenu('Data & backups','Export and restore training records',uiIcon('settings'),"view='data';render()")}
  </section>
  <p class="profile-v812-foot">JR PERFORMANCE · ATHLETE DEVELOPMENT</p>
 </main>`;
}

function videoEntry(name){return db.videoLibrary?.[name]||{}}
function youtubeId(raw){try{let u=new URL(raw);let h=u.hostname.replace(/^www\./,'');if(h==='youtu.be')return /^[\w-]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):null;if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(h)){let v=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];return /^[\w-]{11}$/.test(v||'')?v:null}}catch(e){}return null}
function illustrationSpec(name,category){
 const n=name.toLowerCase();let motion='hinge',muscles=['core'],secondary=['back'];
 if(/squat|lunge|split squat|step.up|wall sit/.test(n)){motion='squat';muscles=['quads','glutes'];secondary=['core','hamstrings']}
 else if(/deadlift|hinge|good morning/.test(n)){motion='hinge';muscles=['hamstrings','glutes'];secondary=['back','core']}
 else if(/press|push.up|bench/.test(n)){motion='press';muscles=['chest','shoulders','triceps'];secondary=['core']}
 else if(/pull.up|row|pulldown|face pull/.test(n)){motion='pull';muscles=['back','biceps'];secondary=['shoulders']}
 else if(/sprint|shuffle|agility|acceleration|run|high knee|a.skip/.test(n)){motion='run';muscles=['quads','glutes','calves'];secondary=['core','hamstrings']}
 else if(/jump|bound|hop/.test(n)){motion='jump';muscles=['quads','glutes','calves'];secondary=['core']}
 else if(/rotation|throw|slam|chop/.test(n)){motion='rotate';muscles=['core','shoulders'];secondary=['glutes']}
 else if(/plank|pallof|dead bug|bird dog|carry/.test(n)){motion='brace';muscles=['core'];secondary=['shoulders','glutes']}
 else if(/calf/.test(n)){motion='jump';muscles=['calves'];secondary=['quads']}
 else if(/shoulder|external rotation|band pull/.test(n)){motion='pull';muscles=['shoulders'];secondary=['back']}
 else if(category==='Warm-up'){motion='run';muscles=['quads','glutes'];secondary=['core']}
 return {motion,muscles,secondary};
}
// Exercise-specific illustrated pose sequences for JR's four primary lifts.
// Side-view schematic: representative positions, not clinical motion capture.
const PRIMARY_LIFT_POSES={
 'Barbell back squat':{label:'Back squat · bar on upper back',muscles:['quads','glutes'],support:['core','hamstrings'],poses:[
  {hip:[146,181],shoulder:[163,112],knee:[151,255],ankle:[163,323],elbow:[138,124],hand:[147,103],bar:[164,104]},
  {hip:[119,215],shoulder:[148,141],knee:[188,251],ankle:[163,323],elbow:[126,150],hand:[136,131],bar:[149,131]},
  {hip:[109,242],shoulder:[143,165],knee:[199,258],ankle:[163,323],elbow:[120,174],hand:[133,156],bar:[143,155]},
  {hip:[119,215],shoulder:[148,141],knee:[188,251],ankle:[163,323],elbow:[126,150],hand:[136,131],bar:[149,131]}]},
 'Barbell front squat':{label:'Front squat · front rack',muscles:['quads','glutes'],support:['core','upper back'],poses:[
  {hip:[149,183],shoulder:[156,113],knee:[155,255],ankle:[165,323],elbow:[184,127],hand:[177,105],bar:[158,109]},
  {hip:[131,217],shoulder:[147,144],knee:[191,251],ankle:[165,323],elbow:[176,157],hand:[168,136],bar:[149,140]},
  {hip:[120,242],shoulder:[143,169],knee:[200,259],ankle:[165,323],elbow:[173,180],hand:[165,161],bar:[145,164]},
  {hip:[131,217],shoulder:[147,144],knee:[191,251],ankle:[165,323],elbow:[176,157],hand:[168,136],bar:[149,140]}]},
 'Trap bar deadlift':{label:'Trap bar deadlift · handles at sides',muscles:['glutes','hamstrings'],support:['quads','core'],poses:[
  {hip:[128,234],shoulder:[174,169],knee:[180,259],ankle:[165,323],elbow:[187,207],hand:[188,259],bar:[188,259]},
  {hip:[140,209],shoulder:[166,137],knee:[168,260],ankle:[165,323],elbow:[184,184],hand:[188,239],bar:[188,239]},
  {hip:[150,183],shoulder:[158,112],knee:[154,258],ankle:[165,323],elbow:[182,165],hand:[188,226],bar:[188,226]},
  {hip:[140,209],shoulder:[166,137],knee:[168,260],ankle:[165,323],elbow:[184,184],hand:[188,239],bar:[188,239]}]},
 'Barbell strict press':{label:'Strict press · standing overhead',muscles:['shoulders','triceps'],support:['core','upper back'],poses:[
  {hip:[150,184],shoulder:[155,115],knee:[155,258],ankle:[165,323],elbow:[184,145],hand:[171,119],bar:[164,116]},
  {hip:[150,184],shoulder:[155,115],knee:[155,258],ankle:[165,323],elbow:[180,110],hand:[174,74],bar:[164,72]},
  {hip:[150,184],shoulder:[155,115],knee:[155,258],ankle:[165,323],elbow:[160,74],hand:[161,29],bar:[164,28]},
  {hip:[150,184],shoulder:[155,115],knee:[155,258],ankle:[165,323],elbow:[180,110],hand:[174,74],bar:[164,72]}]}
};
function primaryLiftFrame(p,kind){
 const pt=a=>a.join(',');const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 const capsule=(a,b,w,fill,outline='#a9b4bf')=>`<path d="M${pt(a)} L${pt(b)}" stroke="${outline}" stroke-width="${w+3}" stroke-linecap="round"/><path d="M${pt(a)} L${pt(b)}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;
 const hot='#ff735e',warm='#d99a85',metal='url(#jrAnatomyMetal)';
 const head=[p.shoulder[0]-1,p.shoulder[1]-29],neck=lerp(p.shoulder,head,.48),foot=[p.ankle[0]+20,p.ankle[1]+1];
 const squat=/squat/.test(kind),press=/press/.test(kind),dead=/deadlift/.test(kind);
 let o=`<ellipse cx="163" cy="338" rx="90" ry="7" fill="#101317" opacity=".8"/><path d="M48 330 H274" stroke="#343b44" stroke-width="1" stroke-dasharray="4 5"/>`;
 // Posterior leg, knee, shin and foot. Highlight prime movers without implying precise muscle recruitment.
 o+=capsule(p.hip,p.knee,26,squat?hot:dead?warm:metal)+capsule(p.knee,p.ankle,17,metal)+capsule(p.ankle,foot,11,metal);
 o+=`<ellipse cx="${p.knee[0]}" cy="${p.knee[1]}" rx="10" ry="11" fill="#788592" stroke="#d4dce4" stroke-width="1.3"/>`;
 o+=`<path d="M${pt(lerp(p.hip,p.knee,.16))} Q${p.hip[0]+23},${p.hip[1]+33} ${pt(lerp(p.hip,p.knee,.82))}" fill="none" stroke="#ffd2bf" stroke-width="2.3" opacity=".7"/>`;
 // Glute and torso with shaded anatomical contours.
 o+=`<ellipse cx="${p.hip[0]}" cy="${p.hip[1]}" rx="19" ry="18" fill="${dead||squat?hot:metal}" stroke="#e0a08e" stroke-width="1.2"/>`;
 o+=capsule(p.hip,p.shoulder,35,metal);
 let torsoMid=lerp(p.hip,p.shoulder,.47);
 o+=`<path d="M${p.hip[0]-11} ${p.hip[1]-9} Q${torsoMid[0]-20} ${torsoMid[1]} ${p.shoulder[0]-8} ${p.shoulder[1]+5}" fill="none" stroke="#dbe2e9" stroke-width="2.4" opacity=".72"/>`;
 o+=`<path d="M${p.hip[0]+10} ${p.hip[1]-11} Q${torsoMid[0]+9} ${torsoMid[1]} ${p.shoulder[0]+8} ${p.shoulder[1]+8}" fill="none" stroke="#414b57" stroke-width="2.5" opacity=".65"/>`;
 for(let i=0;i<3;i++){let q=lerp(p.hip,p.shoulder,.30+i*.14);o+=`<path d="M${q[0]-11} ${q[1]} q11 6 21 -1" stroke="#39434f" stroke-width="1.4" fill="none" opacity=".7"/>`}
 o+=capsule(p.shoulder,p.elbow,16,press?hot:metal)+capsule(p.elbow,p.hand,12,press?warm:metal);
 o+=`<circle cx="${p.shoulder[0]}" cy="${p.shoulder[1]}" r="10" fill="${press?hot:metal}" stroke="#d7dfe6" stroke-width="1.4"/>`;
 o+=`<path d="M${pt(neck)} L${pt(head)}" stroke="#adb8c3" stroke-width="11" stroke-linecap="round"/>`;
 o+=`<ellipse cx="${head[0]}" cy="${head[1]}" rx="19" ry="23" fill="url(#jrAnatomyMetal)" stroke="#e4e9ee" stroke-width="1.5"/><path d="M${head[0]+10} ${head[1]-1} l8 3 -8 3" fill="#77838f"/><path d="M${head[0]-10} ${head[1]+12} Q${head[0]} ${head[1]+16} ${head[0]+7} ${head[1]+12}" fill="none" stroke="#5a6673" stroke-width="1.5"/>`;
 if(dead){o+=`<ellipse cx="${p.hand[0]-20}" cy="${p.hand[1]}" rx="40" ry="19" fill="none" stroke="#e0e5ea" stroke-width="5"/><circle cx="${p.hand[0]+19}" cy="${p.hand[1]}" r="14" fill="#3b444e" stroke="#dce2e8" stroke-width="4"/>`}
 else{o+=`<path d="M${p.bar[0]-79} ${p.bar[1]} h158" stroke="#e5eaf0" stroke-width="5" stroke-linecap="round"/><circle cx="${p.bar[0]-68}" cy="${p.bar[1]}" r="18" fill="url(#jrPlate)" stroke="#b8c2cd" stroke-width="4"/><circle cx="${p.bar[0]+68}" cy="${p.bar[1]}" r="18" fill="url(#jrPlate)" stroke="#b8c2cd" stroke-width="4"/><circle cx="${p.bar[0]-68}" cy="${p.bar[1]}" r="5" fill="#d9e1e9"/><circle cx="${p.bar[0]+68}" cy="${p.bar[1]}" r="5" fill="#d9e1e9"/>`}
 return o;
}
function primaryLiftFigure(name){
 const d=PRIMARY_LIFT_POSES[name];if(!d)return '';
 return `<svg class="primary-lift-svg" viewBox="0 0 320 360" role="img" aria-label="Four illustrated phases of ${esc(name)} in a side view"><defs><linearGradient id="jrAnatomyMetal" x1="0" x2="1" y1="0" y2=".5"><stop stop-color="#dce5ed"/><stop offset=".43" stop-color="#8c9ba9"/><stop offset="1" stop-color="#505d6c"/></linearGradient><radialGradient id="jrPlate"><stop stop-color="#687684"/><stop offset="1" stop-color="#20262d"/></radialGradient></defs><text x="17" y="22" class="lift-diagram-label">SIDE VIEW · FOUR-PHASE GUIDE</text>${d.poses.map((pose,i)=>`<g class="lift-pose lift-pose-${i}">${primaryLiftFrame(pose,name)}</g>`).join('')}</svg>`;
}
// Individual four-position SVG studies for every program movement.
// These are stylized side-view teaching diagrams, not validated biomechanics.
const OTHER_MOVEMENT_CONFIG={
 'Dynamic warm-up':['warm',0], '10-yard acceleration sprint':['sprint',0], '20-yard sprint':['sprint',1],
 'Broad jump':['jump',0], 'Lateral bound':['lateral',0], 'Dumbbell reverse lunge':['lunge',0],
 'Romanian deadlift':['hinge',0], 'Standing calf raise':['calf',0], 'Plank':['plank',0],
 'Lateral shuffle':['lateral',1], 'Single-leg balance reach':['balance',0],
 'Assisted pull-up':['pullup',0], 'Dumbbell bench press':['bench',0], 'Single-arm cable row':['row',0],
 'Face pull':['facepull',0], 'Pallof press':['pallof',0], 'Dead bug':['deadbug',0],
 '5-10-5 shuttle':['shuttle',0], '10-yard reaction sprint':['sprint',2], 'Low box jump':['jump',1],
 'Medicine ball rotational throw':['throw',0], 'Dumbbell Romanian deadlift':['hinge',1],
 'Push-up':['pushup',0], 'Seated cable row':['row',1], 'Farmer carry':['carry',0], 'Side plank':['sideplank',0]
};
function individualMovementPoses(name){
 const [type,variant]=OTHER_MOVEMENT_CONFIG[name]||['warm',0];
 const base={hip:[148,185],shoulder:[156,114],knee:[155,257],ankle:[163,322],elbow:[177,159],hand:[183,222],bar:[183,222]};
 const pose=(h,sh,k,a,e,ha)=>({hip:h,shoulder:sh,knee:k,ankle:a,elbow:e,hand:ha,bar:ha});
 const standing=pose([148,185],[156,114],[155,257],[163,322],[178,160],[185,219]);
 const low=pose([116,233],[148,154],[195,264],[164,322],[173,196],[182,252]);
 const hinge=pose([136,201],[205,154],[157,260],[164,322],[217,204],[226,258]);
 const reach=pose([138,194],[188,142],[158,257],[164,322],[203,157],[235,173]);
 const overhead=pose([148,185],[156,114],[155,257],[163,322],[164,72],[165,30]);
 const lunge=pose([142,226],[150,150],[199,262],[164,322],[178,188],[188,244]);
 const jump=pose([148,142],[156,69],[155,207],[163,270],[172,102],[186,135]);
 const step=pose([149,181],[164,109],[197,239],[168,322],[190,144],[206,188]);
 const floor=pose([134,273],[183,262],[102,285],[71,312],[192,288],[221,306]);
 const horizontal=pose([110,267],[169,263],[82,284],[48,297],[190,270],[221,284]);
 const choose={
 warm:[standing,step,standing,reach], sprint:[low,step,jump,standing],jump:[standing,low,jump,standing],
 lateral:[standing,lunge,step,standing],lunge:[standing,lunge,low,standing],
 hinge:[standing,hinge,reach,standing],calf:[standing,step,standing,step],
 plank:[horizontal,horizontal,horizontal,horizontal],balance:[standing,reach,hinge,standing],
 pullup:[standing,overhead,step,overhead],bench:[floor,horizontal,floor,horizontal],
 row:[reach,hinge,standing,reach],facepull:[standing,reach,standing,reach],
 pallof:[standing,reach,standing,reach],deadbug:[floor,horizontal,floor,horizontal],
 shuttle:[low,step,lunge,low],throw:[standing,reach,step,standing],
 pushup:[horizontal,floor,horizontal,floor],carry:[standing,step,standing,step],
 sideplank:[horizontal,horizontal,horizontal,horizontal]
 };
 let poses=(choose[type]||choose.warm).map(p=>structuredClone(p));
 if(variant===1&&type==='jump')poses[2].hip[1]-=12;
 if(variant===1&&type==='hinge')poses[1].hand[0]+=8;
 if(variant===2&&type==='sprint')poses[0].shoulder[0]+=9;
 return {type,poses};
}
function movementEquipment(name,p,type){
 const n=name.toLowerCase(),pt=(x,y)=>`${x},${y}`;
 if(/dumbbell/.test(n))return `<g stroke="#c7d1da" stroke-width="5"><path d="M${p.hand[0]-13} ${p.hand[1]}h26"/><path d="M${p.hand[0]-12} ${p.hand[1]-12}v24 M${p.hand[0]+12} ${p.hand[1]-12}v24"/></g>`;
 if(/medicine ball/.test(n))return `<circle cx="${p.hand[0]+12}" cy="${p.hand[1]-10}" r="17" fill="#49545f" stroke="#e5ecf3" stroke-width="3"/>`;
 if(/box jump/.test(n))return `<rect x="214" y="280" width="75" height="51" rx="4" fill="#414c58" stroke="#aab6c3" stroke-width="2"/>`;
 if(/cable|face pull|pallof/.test(n))return `<path d="M${p.hand[0]} ${p.hand[1]}L282 140" stroke="#a4b1bd" stroke-width="2"/><rect x="278" y="100" width="13" height="220" rx="4" fill="#36404b" stroke="#8b99a8"/>`;
 if(/pull.up/.test(n))return `<path d="M64 36H257" stroke="#c6d0da" stroke-width="8" stroke-linecap="round"/>`;
 if(/farmer carry/.test(n))return `<rect x="${p.hand[0]-13}" y="${p.hand[1]}" width="26" height="37" rx="6" fill="#56616c" stroke="#d6dfe8" stroke-width="3"/>`;
 if(/jump|bound|sprint|shuttle|shuffle/.test(n))return `<path d="M35 330H288" stroke="#58636f" stroke-width="2" stroke-dasharray="8 8"/>`;
 return '';
}
function anatomyFigure(name,category){
 const {type,poses}=individualMovementPoses(name),spec=illustrationSpec(name,category);
 const labels={warm:['Start','Move','Transition','Reset'],sprint:['Drive','Accelerate','Stride','Recover'],jump:['Set','Load','Explode','Land'],lateral:['Ready','Push','Travel','Reset'],lunge:['Stand','Step','Lower','Return'],hinge:['Stand','Hinge','Reach','Return'],calf:['Start','Rise','Lower','Rise'],plank:['Align','Brace','Hold','Breathe'],balance:['Stand','Reach','Hinge','Reset'],pullup:['Hang','Pull','Top','Lower'],bench:['Set','Lower','Press','Reset'],row:['Extend','Pull','Squeeze','Return'],facepull:['Start','Pull','Squeeze','Reset'],pallof:['Brace','Extend','Hold','Return'],deadbug:['Set','Extend','Brace','Return'],shuttle:['Plant','Push','Cut','Recover'],throw:['Load','Rotate','Release','Reset'],pushup:['Top','Lower','Press','Reset'],carry:['Brace','Step','Walk','Reset'],sideplank:['Align','Brace','Hold','Breathe']};
 const frames=poses.map((p,i)=>`<g class="jr-individual-frame jr-individual-frame-${i}">${primaryLiftFrame(p,type)}${movementEquipment(name,p,type)}</g>`).join('');
 return `<svg class="primary-lift-svg jr-individual-svg" viewBox="0 0 320 360" role="img" aria-label="Four illustrated phases of ${esc(name)}: ${labels[type].join(', ')}"><defs><linearGradient id="jrAnatomyMetal" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#dce5ed"/><stop offset=".5" stop-color="#8c9ba9"/><stop offset="1" stop-color="#53616f"/></linearGradient><linearGradient id="jrPlate"><stop stop-color="#73808e"/><stop offset=".5" stop-color="#202832"/><stop offset="1" stop-color="#718090"/></linearGradient></defs>${frames}<g fill="#c8d2dc" font-size="10" font-weight="700" letter-spacing="1"><text x="16" y="19">${esc(name.toUpperCase())}</text><text x="16" y="350">${labels[type].join('  ·  ')}</text></g></svg>`;
}
function setIllustrationPlaying(playing){let stage=document.getElementById('illustrationStage');if(stage){stage.classList.toggle('paused',!playing);let b=document.getElementById('illustrationToggle');if(b)b.textContent=playing?'Ⅱ Pause':'▶ Play'}}
// V6.1: Original, self-contained procedural anatomical motion studies.
// These are continuously interpolated 2.5D illustrations, NOT validated 3D biomechanics.
const JR_MOTION_STUDIES=[...new Set(DAYS.flatMap(d=>exercises[d].map(e=>e[0])))];
let jrMotionRAF=0,jrMotionStarted=0,jrMotionPaused=false,jrMotionSpeed=1,jrMotionPosition=0;
function jrMotionLerp(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t)}
function jrMotionPose(name,phase){
 const poses=(PRIMARY_LIFT_POSES[name]?.poses||individualMovementPoses(name).poses);let scaled=phase*4,idx=Math.floor(scaled)%4,frac=scaled-Math.floor(scaled);
 frac=frac*frac*(3-2*frac);const a=poses[idx],b=poses[(idx+1)%4];let out={};
 for(const k of Object.keys(a))out[k]=jrMotionLerp(a[k],b[k],frac);
 return out;
}
function jrMotionDraw(name,phase){
 const svg=document.getElementById('jrMotionSvg');if(!svg)return;
 const frame=document.getElementById('jrMotionFrame');if(frame){const pose=jrMotionPose(name,phase);const typ=PRIMARY_LIFT_POSES[name]?name:individualMovementPoses(name).type;frame.innerHTML=primaryLiftFrame(pose,typ)+movementEquipment(name,pose,typ)}
 const scrub=document.getElementById('jrMotionScrub');if(scrub&&document.activeElement!==scrub)scrub.value=Math.round(phase*1000);
 const label=document.getElementById('jrMotionPhase');if(label)label.textContent=['SETUP','LOWERING / LIFTING','BOTTOM / LOCKOUT','RETURN'][Math.floor(phase*4)%4];
}
function jrMotionTick(time){
 if(!document.getElementById('jrMotionSvg')){jrMotionRAF=0;return}
 if(!jrMotionStarted)jrMotionStarted=time;
 const dt=Math.min(60,time-jrMotionStarted);jrMotionStarted=time;
 if(!jrMotionPaused)jrMotionPosition=(jrMotionPosition+dt*jrMotionSpeed/4300)%1;
 const name=document.getElementById('jrMotionSvg').dataset.exercise;
 jrMotionDraw(name,jrMotionPosition);jrMotionRAF=requestAnimationFrame(jrMotionTick);
}
function jrMotionPause(){jrMotionPaused=!jrMotionPaused;let b=document.getElementById('jrMotionPause');if(b)b.textContent=jrMotionPaused?'▶ Play':'Ⅱ Pause'}
function jrMotionRestart(){jrMotionPosition=0;jrMotionPaused=false;let b=document.getElementById('jrMotionPause');if(b)b.textContent='Ⅱ Pause';let n=document.getElementById('jrMotionSvg');if(n)jrMotionDraw(n.dataset.exercise,0)}
function jrMotionScrubTo(v){jrMotionPosition=Number(v)/1000;jrMotionPaused=true;let b=document.getElementById('jrMotionPause');if(b)b.textContent='▶ Play';let n=document.getElementById('jrMotionSvg');if(n)jrMotionDraw(n.dataset.exercise,jrMotionPosition)}
function jrMotionSpeedSet(v){jrMotionSpeed=Number(v);let b=document.getElementById('jrMotionSpeedLabel');if(b)b.textContent=v+'×'}
function jrMotionView(name){return `<section class="jr-motion-studio" aria-label="Original animated ${esc(name)} movement study"><div class="jr-motion-top"><span>JR MOTION STUDIO · ORIGINAL MOTION STUDY</span><span id="jrMotionPhase">SETUP</span></div><svg id="jrMotionSvg" data-exercise="${esc(name)}" viewBox="0 0 320 360" role="img" aria-label="Continuously animated side-view study of ${esc(name)}"><defs><linearGradient id="jrAnatomyMetal" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#f1f4f8"/><stop offset=".28" stop-color="#b6c3d1"/><stop offset=".65" stop-color="#657485"/><stop offset="1" stop-color="#343d48"/></linearGradient><radialGradient id="jrPlate"><stop stop-color="#8493a2"/><stop offset="1" stop-color="#1a222c"/></radialGradient></defs><g id="jrMotionFrame"></g></svg><div class="jr-motion-key"><span><i></i> Prime movers</span><span><i></i> Supporting anatomy</span></div><input id="jrMotionScrub" aria-label="Scrub exercise animation" type="range" min="0" max="1000" value="0" oninput="jrMotionScrubTo(this.value)"><div class="jr-motion-controls"><button class="secondary small" id="jrMotionPause" onclick="jrMotionPause()">Ⅱ Pause</button><button class="secondary small" onclick="jrMotionRestart()">↻ Replay</button><label>Speed <select aria-label="Animation speed" onchange="jrMotionSpeedSet(this.value)"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label><span id="jrMotionSpeedLabel">1×</span></div><p class="mini">Original interpolated movement study. Schematic, not photorealistic 3D or validated biomechanics. Confirm technique with JR’s coach.</p></section>`}
function jrMotionStart(name){if(jrMotionRAF)cancelAnimationFrame(jrMotionRAF);jrMotionRAF=0;jrMotionPosition=0;jrMotionPaused=false;jrMotionSpeed=1;jrMotionStarted=0;jrMotionDraw(name,0);jrMotionRAF=requestAnimationFrame(jrMotionTick)}

function showExerciseVideo(name){const e=DAYS.flatMap(d=>exercises[d]).find(e=>e[0]===name);showMovementGuideFallback(name,(e&&e[5])||'Ask a qualified coach to review safe technique.');}
function previewExerciseVideo(raw){let id=youtubeId(raw.trim()),slot=document.getElementById('videoPastePreview');if(!slot)return;slot.textContent=id?'Valid YouTube video — tap Save video to play it above.':'Paste a valid YouTube link to enable the in-app player.'}
function closeExerciseVideo(){document.getElementById('videoOverlay')?.remove()}
function saveExerciseVideo(name){let url=$('videoUrlInput')?.value.trim()||'';if(!youtubeId(url)){toast('Enter a valid YouTube video URL');return}db.videoLibrary??={};db.videoLibrary[name]={...videoEntry(name),url};save();showExerciseVideo(name);toast('✓ Demonstration video saved')}
function removeExerciseVideo(name){db.videoLibrary??={};db.videoLibrary[name]={...videoEntry(name),url:''};save();showExerciseVideo(name);toast('Video removed')}
function toggleTechniqueReviewed(name){db.videoLibrary??={};db.videoLibrary[name]={...videoEntry(name),reviewed:!videoEntry(name).reviewed};save();showExerciseVideo(name);toast('✓ Technique checklist updated')}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeExerciseVideo()});
function libraryMovements(){return MOVEMENT_CATALOG.map(m=>[m.name,m.category,0,0,'',`${m.pattern} · ${m.equipment}`])}
function libraryResultsHTML(){const query=(window.exerciseLibraryQuery||'').trim().toLowerCase(),category=window.exerciseLibraryCategory||'All',equipment=window.exerciseLibraryEquipment||'All',favoritesOnly=!!window.exerciseLibraryFavorites;const filtered=MOVEMENT_CATALOG.filter(m=>(category==='All'||m.category===category)&&(equipment==='All'||m.equipment===equipment)&&(!favoritesOnly||(db.favorites||[]).includes(m.name))&&(!query||`${m.name} ${m.category} ${m.pattern} ${m.equipment}`.toLowerCase().includes(query))).sort((a,b)=>{if(!query)return 0;const score=m=>m.name.toLowerCase().startsWith(query)?0:m.name.toLowerCase().split(/\s+/).some(w=>w.startsWith(query))?1:m.name.toLowerCase().includes(query)?2:3;return score(a)-score(b)||a.name.localeCompare(b.name)});return `<div class="v71-result-count">${filtered.length} OF ${MOVEMENT_CATALOG.length} MOVEMENTS</div><div class="v71-library-list">${filtered.map((m,i)=>{const video=JR_RENDERED_VIDEOS[m.name],fav=(db.favorites||[]).includes(m.name);return `<div class="v71-movement jr8-movement"><button class="jr8-movement-main" onclick="showExerciseVideo(decodeURIComponent('${encodeURIComponent(m.name)}'))" aria-label="Open ${esc(m.name)}"><span class="v71-movement-index">${String(i+1).padStart(2,'0')}</span><span class="v71-movement-info"><strong>${esc(m.name)}</strong><small>${esc(m.category)} · ${esc(m.equipment)} · TECHNIQUE GUIDE</small></span><span class="v71-play">›</span></button><button class="jr8-favorite ${fav?'on':''}" aria-pressed="${fav?'true':'false'}" aria-label="${fav?'Remove favorite':'Add favorite'} ${esc(m.name)}" onclick="favoriteMovement(decodeURIComponent('${encodeURIComponent(m.name)}'))">${fav?'★':'☆'}</button></div>`}).join('')||'<div class="card">No movements found. Adjust your filters.</div>'}</div>`}
function searchMovements(value){window.exerciseLibraryQuery=value; if(value.trim()){window.exerciseLibraryCategory='All';window.exerciseLibraryEquipment='All';window.exerciseLibraryFavorites=false;} updateLibraryResults(); const hint=$('libraryLiveHint');if(hint)hint.textContent=value.trim()?'Matching movements appear below as you type':'Start typing to find a movement instantly';}
function updateLibraryResults(){const el=$('libraryResults');if(el)el.innerHTML=libraryResultsHTML()}
function renderLibrary(){const categories=['All',...new Set(MOVEMENT_CATALOG.map(m=>m.category))],category=window.exerciseLibraryCategory||'All',equipment=window.exerciseLibraryEquipment||'All';$('app').innerHTML=`<section class="v71-library-header"><div class="v7-kicker">OFFSZN / TRAINING TOOLS</div><h1>MOVEMENT<br><em>LIBRARY.</em></h1><p>Explore ${MOVEMENT_CATALOG.length} exercises, save favorites, and swap compatible movements from the Train screen.</p><div class="v71-library-stats"><span><b>${MOVEMENT_CATALOG.length}</b><small>MOVEMENTS</small></span><span><b>TEXT</b><small>GUIDES</small></span></div></section><section class="v71-library-tools"><label class="v71-search-label" for="librarySearch">FIND A MOVEMENT</label><div class="v71-search-wrap"><span aria-hidden="true">⌕</span><input id="librarySearch" type="search" placeholder="Search by exercise, equipment, pattern" autocomplete="off" value="${esc(window.exerciseLibraryQuery||'')}" oninput="searchMovements(this.value)" aria-controls="libraryResults" aria-describedby="libraryLiveHint"></div><p id="libraryLiveHint" class="jr-live-search-hint">Start typing to find a movement instantly</p><div class="jr8-filterbar"><label>EQUIPMENT<select onchange="window.exerciseLibraryEquipment=this.value;updateLibraryResults()">${['All',...new Set(MOVEMENT_CATALOG.map(m=>m.equipment))].map(e=>`<option ${equipment===e?'selected':''}>${esc(e)}</option>`).join('')}</select></label><button class="jr8-favfilter ${window.exerciseLibraryFavorites?'on':''}" onclick="window.exerciseLibraryFavorites=!window.exerciseLibraryFavorites;renderLibrary()">${window.exerciseLibraryFavorites?'★ FAVORITES':'☆ FAVORITES'}</button></div><div class="v71-chips" role="group" aria-label="Filter movement categories">${categories.map(c=>`<button class="v71-chip ${category===c?'selected':''}" aria-pressed="${category===c}" onclick="window.exerciseLibraryCategory=decodeURIComponent('${encodeURIComponent(c)}');renderLibrary()">${esc(c)}</button>`).join('')}</div></section><div id="libraryResults">${libraryResultsHTML()}</div><p class="v71-disclaimer">Video demonstrations are temporarily unavailable. Confirm form with a qualified coach. New swaps are not coaching prescriptions; confirm technique and suitability with JR's coach.</p>`}
function renderParent(){let complete=completedCount(),bad=Object.entries(db.readiness).filter(([k,v])=>v.pain==='yes'),logs=Object.values(db.baseball).flat(),weight=Number(db.tests['Body weight']?.[12]||db.tests['Body weight']?.[6]||db.tests['Body weight']?.[1])||null;$('app').innerHTML=`<div class="card hero"><button class="secondary small" onclick="view='athlete';render()">← Profile</button><span class="pill">PARENT OVERVIEW • LOCAL</span><h1>JR'S <span class="accent">DEVELOPMENT</span></h1><p>Review consistency, performance, and reported recovery. This is a view on the same device, not a separate parent login.</p></div><div class="grid"><div class="card"><small>WORKOUTS</small><div class="metric">${complete}/36</div></div><div class="card"><small>BASEBALL LOGS</small><div class="metric">${logs.length}</div></div><div class="card"><small>PAIN FLAGS</small><div class="metric ${bad.length?'accent':'good'}">${bad.length}</div></div><div class="card"><small>BODY WEIGHT</small><div class="metric">${weight??'—'}${weight?' lb':''}</div></div></div><div class="card" style="margin-top:13px"><h2>Readiness & recovery</h2>${bad.length?`<div class="notice danger">Pain was reported in: ${bad.map(([k])=>esc(k)).join(', ')}. Review before training and consult a qualified clinician for persistent pain.</div>`:'<div class="notice good">No pain flags currently recorded. This does not replace direct check-ins.</div>'}<p>Keep strength progress gradual, especially around Tuesday pitching and Thursday hitting.</p></div><div class="card"><h2>Training progress</h2>${DAYS.map(d=>`<div class="event"><div class="event-body"><b>${d}</b><small>${Array.from({length:12},(_,i)=>finished(i+1,d)).filter(Boolean).length}/12 workouts completed</small></div></div>`).join('')}<button class="secondary" onclick="nav('progress')">View performance scorecard</button></div><div class="card"><h2>Baseball workload</h2>${Object.entries(db.baseball).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8).flatMap(([date,entries])=>entries.map(x=>`<div class="event"><div class="event-body"><b>${esc(date)} — ${esc(x.activity)}</b><small>${x.pitches||'—'} pitches · discomfort: ${esc((x&&x.pain))}</small></div></div>`)).join('')||'<p>No baseball sessions logged yet.</p>'}</div>`}
function renderData(){$('app').innerHTML=`<div class="card"><button class="secondary small" onclick="view='athlete';render()">← Profile</button><h1>DATA & BACKUPS</h1><p>JR's records stay in this browser unless you choose to export or configure cloud synchronization.</p><div class="actionrow"><button onclick="exportBackup()">↓ Backup JSON</button><button class="secondary" onclick="exportCSV()">↓ Workout CSV</button></div><label style="display:block;margin-top:16px">Restore JSON backup<input type="file" accept=".json,application/json" onchange="restoreBackup(event)"></label></div><div class="card"><h2>Athlete cloud backup (requires database setup)</h2><p>Sign in through Athlete account, then upload or restore your private backup. Cloud sync requires the SQL setup included with this release. The legacy manual backup is separate from v8.59 athlete automatic synchronization.</p><div class="notice">Do not use a Supabase service-role key. Use only a public/publishable (anon) key with the row-level security rules supplied in the setup guide. GitHub Pages remains public, but saved workout data is not uploaded to GitHub.</div><label style="display:block;margin-top:12px">Supabase project URL<input id="cloudUrl" style="width:100%" placeholder="https://PROJECT.supabase.co" value="${esc(db.settings.cloudUrl||'')}"></label><label style="display:block;margin-top:10px">Public / anon key<input id="cloudKey" style="width:100%" placeholder="Public key (never service-role)" value="${esc(db.settings.cloudKey||'')}"></label><button class="secondary" style="margin-top:10px" onclick="saveCloudConfig()">Save connection settings</button><hr class="divider"><div class="actionrow" style="margin-top:12px"><button onclick="cloudLogin()">Sign in</button><button class="secondary" onclick="cloudSignUp()">Create account</button></div><p class="mini" id="cloudStatus">${authToken?'Signed in for this session.':'Not signed in.'}</p><div class="actionrow"><button class="secondary" onclick="cloudPush(false)">↑ Upload backup</button><button class="secondary" onclick="cloudPull()">↓ Restore cloud data</button><button class="secondary" onclick="cloudLogout()">Sign out</button></div><p class="mini">Legacy backup restore replaces this device's current data after confirmation. Export a local backup first. Signed-in athlete data uses a separate local cache per account.</p></div><div class="card"><h2>Erase local records</h2><p>Only do this if you've backed up JR's data. This cannot be undone.</p><button style="background:#545b62" onclick="offsznEraseData()">Delete all local data</button></div>`}
function download(name,contents,type){let url=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
function exportBackup(){download('JR_Performance_Backup.json',JSON.stringify(db,null,2),'application/json')}
function exportCSV(){let rows=[['Week','Day','Exercise','Set','Weight (lb)','Reps/result','Done','Workout finished','Date']];for(let w=1;w<=12;w++)for(let d of DAYS){let s=session(w,d);for(let e of exercises[d]){let a=s.items?.[e[0]]?.sets||[];a.forEach((x,i)=>rows.push([w,d,e[0],i+1,(x&&x.weight)??'',(x&&x.reps)??'',(x&&x.done)?'Yes':'No',s.finished?'Yes':'No',s.date||'']))}}download('JR_Performance_Workout_Log.csv',rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv')}
async function restoreBackup(ev){let file=ev.target.files?.[0];if(!file)return;try{let parsed=JSON.parse(await file.text());if(!parsed.sessions||!parsed.tests||typeof parsed.sessions!=='object')throw Error('Not a OFFSZN backup');if(!confirm('Replace current local data with this backup? Export a backup first if needed.'))return;db={...structuredClone(base),...parsed,settings:{...base.settings,...parsed.settings}};save();render();toast('Backup restored')}catch(e){alert('Could not restore: '+e.message)}}
function saveCloudConfig(){let url=$('cloudUrl').value.trim().replace(/\/$/,''),key=$('cloudKey').value.trim();if(url&&!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))return toast('Enter a valid HTTPS Supabase project URL');db.settings.cloudUrl=url;db.settings.cloudKey=key;save();toast('Connection settings saved locally')}
function cloudConfig(){let url=db.settings.cloudUrl||OFFSZN_SUPABASE_URL,key=db.settings.cloudKey||OFFSZN_SUPABASE_KEY;if(!url||!key)throw Error('Save your Supabase project URL and public key first.');return{url,key}}
async function cloudAuth(endpoint){try{saveCloudConfig();let {url,key}=cloudConfig(),email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;if(!email||!password)throw Error('Enter email and password');let r=await fetch(`${url}/auth/v1/${endpoint}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});let x=await r.json();if(!r.ok)throw Error(x.msg||x.error_description||x.message||'Authentication failed');if(x.access_token){authToken=x.access_token;authUser=x.user?.id;offsznAuthRole=x.user?.user_metadata?.role||null;offsznStoreAuthSession(x);toast('Signed in. You can now sync.')}else toast('Check your email to confirm the account, then sign in.');render()}catch(e){alert(e.message)}}
function cloudLogin(){settingsOpen('account')}function cloudSignUp(){settingsOpen('account')}
function cloudLogout(){localStorage.removeItem(OFFSZN_SESSION_KEY);clearTimeout(offsznAuthRefreshTimer);offsznSyncEnabled=false;clearTimeout(offsznSyncTimer);authToken=null;authUser=null;offsznAuthRole=null;offsznActiveDataKey=null;db=structuredClone(base);week=1;toast('Signed out');render()}
async function cloudRequest(method,path,body){const saved=offsznReadAuthSession();if(saved&&saved.expires_at*1000<Date.now()+60000)await offsznRefreshAuthSession();let {url,key}=cloudConfig();if(!authToken||!authUser)throw Error('Sign in to your athlete account first');let r=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+authToken,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:body?JSON.stringify(body):undefined});if(!r.ok){let text=await r.text();throw Error('Cloud request failed: '+text.slice(0,220))}return r.json()}
async function cloudPush(silent=false){try{if(offsznSyncEnabled)throw Error('Automatic cloud sync is active. Manual legacy backup is disabled to avoid conflicting copies.');if(!authToken||!authUser){if(!silent)toast('Sign in first');return}let data=structuredClone(db);delete data.settings.cloudKey;delete data.settings.cloudUrl;delete data.settings.cloudAuto;await cloudRequest('POST','jr_backups?on_conflict=user_id',{user_id:authUser,payload:data,updated_at:new Date().toISOString()});if(!silent)toast('Cloud backup uploaded')}catch(e){if(!silent)alert(e.message);else console.warn(e)}}
async function cloudPull(){try{if(offsznSyncEnabled)throw Error('Automatic cloud sync is active. Use Reconnect cloud in Athlete Account.');let rows=await cloudRequest('GET','jr_backups?select=payload,updated_at&user_id=eq.'+encodeURIComponent(authUser));if(!rows?.length)return toast('No cloud backup found');if(!confirm('Restore cloud backup from '+rows[0].updated_at+'? This replaces local workout records. Export a local backup first.'))return;let data=rows[0].payload;if(!data?.sessions||!data?.tests)throw Error('Cloud backup format is invalid');let settings={...db.settings};db={...structuredClone(base),...data,settings:{...base.settings,...data.settings,...settings}};save();render();toast('Cloud backup restored')}catch(e){alert(e.message)}}

// v8.59: opt-in, revision-checked cloud snapshots. Supabase is authoritative after setup.
// Local storage is an offline cache; no cross-account sharing of local workout data.
let offsznActiveDataKey=null,offsznSyncEnabled=false,offsznSyncRevision=0,offsznSyncTimer=null,offsznSyncBusy=false,offsznSyncDirty=false,offsznSyncState='Not connected';
function offsznSnapshot(){const x=structuredClone(db);if(x.settings){delete x.settings.cloudKey;delete x.settings.cloudUrl;delete x.settings.cloudAuto;}return x}
function offsznLoadSnapshot(x){if(!x||typeof x!=='object'||!x.sessions||!x.tests)throw Error('Invalid cloud snapshot');const cloudUrl=db.settings.cloudUrl,cloudKey=db.settings.cloudKey;db={...structuredClone(base),...x,settings:{...base.settings,...x.settings,cloudUrl,cloudKey}};week=Math.max(1,Math.min(12,Number(db.settings.week)||1));localStorage.setItem(offsznActiveDataKey,JSON.stringify(db));render()}
function offsznQueueSync(){offsznSyncDirty=true;offsznSyncState=navigator.onLine?'Changes pending upload':'Offline — changes queued';clearTimeout(offsznSyncTimer);offsznSyncTimer=setTimeout(offsznFlushSync,1200)}
async function offsznSyncRpc(name,payload){const saved=offsznReadAuthSession();if(saved&&saved.expires_at*1000<Date.now()+60000)await offsznRefreshAuthSession();const {url,key}=cloudConfig();if(!authToken)throw Error('Sign in to sync');const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+authToken,'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.message||'Cloud synchronization failed ('+r.status+').');return data}
async function offsznFlushSync(){if(!offsznSyncEnabled||offsznSyncBusy||!authToken||!navigator.onLine||!offsznSyncDirty)return;offsznSyncBusy=true;offsznSyncState='Syncing…';const snapshot=offsznSnapshot();offsznSyncDirty=false;try{const result=await offsznSyncRpc('offszn_sync_write',{expected_revision:offsznSyncRevision,new_payload:snapshot});offsznSyncRevision=Number(result);offsznSyncState='Saved to cloud';if(offsznSyncDirty)offsznQueueSync()}catch(e){offsznSyncDirty=true;offsznSyncState=e.message.includes('revision conflict')?'Conflict — cloud changed on another device':e.message;console.warn('OFFSZN sync:',e);if(!e.message.includes('revision conflict'))setTimeout(()=>{if(offsznSyncEnabled&&navigator.onLine)offsznFlushSync()},12000)}finally{offsznSyncBusy=false}}
async function offsznConnectSync(){if(offsznAuthRole!=='athlete'||!authUser||!authToken)return;offsznSyncEnabled=false;clearTimeout(offsznSyncTimer);offsznSyncRevision=0;const userKey='offszn-athlete-data-'+authUser;const existing=localStorage.getItem(userKey);offsznActiveDataKey=userKey;try{const result=await offsznSyncRpc('offszn_sync_read',{});const remote=result&&result.length?result[0]:null;const local=existing?JSON.parse(existing):null;const legacy=localStorage.getItem(KEY);let choice;
 if(remote){if(local&&JSON.stringify(local)!==JSON.stringify(remote.payload)){choice=confirm('Cloud data exists. OK: load cloud records (recommended). Cancel: keep this device’s records without sync. Export a backup before replacing data.');if(!choice){db={...structuredClone(base),...local,settings:{...base.settings,...local.settings}};offsznSyncState='Local-only: cloud conflict';render();return}}offsznSyncRevision=Number(remote.revision);offsznLoadSnapshot(remote.payload);offsznSyncEnabled=true;offsznSyncState='Cloud data loaded';}
 else if(local||legacy){choice=confirm('No cloud data found. Upload the training data currently saved on this device to this athlete account? Cancel keeps data local only.');if(!choice){if(local)offsznLoadSnapshot(local);offsznSyncState='Local-only: upload not approved';return}if(local)offsznLoadSnapshot(local);offsznSyncEnabled=true;offsznQueueSync()}
 else {db=structuredClone(base);db.profile={name:'',goalWorkouts:3};week=1;localStorage.setItem(userKey,JSON.stringify(db));offsznSyncEnabled=true;offsznQueueSync();settingsOpen('onboarding')}
 }catch(e){offsznSyncEnabled=false;offsznSyncState='Setup required: '+e.message;const local=existing?JSON.parse(existing):null;if(local)offsznLoadSnapshot(local);else {db=structuredClone(base);week=1;render()}alert('Cloud sync unavailable. Your changes will remain local until setup is completed. '+e.message)}}
function offsznSyncStatusHtml(){return `<div class="notice"><strong>Cloud sync:</strong> ${esc(offsznSyncState)}<br><small>${offsznSyncEnabled?'Automatic uploads enabled; local cache supports offline edits.':'Automatic uploads are not active.'}</small></div><div class="actionrow"><button class="secondary" onclick="offsznFlushSync();toast('Sync requested')">Sync now</button><button class="secondary" onclick="offsznConnectSync()">Reconnect cloud</button></div>`}
window.addEventListener('online',()=>{if(offsznSyncEnabled)offsznFlushSync()});
window.addEventListener('pagehide',()=>{if(offsznSyncEnabled&&offsznSyncDirty)offsznFlushSync()});

if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(console.warn);
render();
offsznRestoreAuthSession();

function jrGuideTab(tab){const ids={muscles:'jrGuideMuscles',cues:'jrGuideCues',mistakes:'jrGuideMistakes'};for(const [k,id] of Object.entries(ids)){const el=document.getElementById(id);if(el)el.style.display=k===tab?'block':'none'}document.querySelectorAll('.jr-guide-tab').forEach((b,i)=>b.classList.toggle('active',['muscles','cues','mistakes'][i]===tab))}


// v8.30: Event reminders. Background delivery is delegated to the device calendar.
function reminderLead(){return Number(db.settings.reminderLead??30)}
function reminderEnabled(){return db.settings.remindersEnabled!==false}
function eventClock(raw){let m=String(raw||'').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);if(!m)return null;let h=Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0);return [h,Number(m[2])]}
function dateAtLocal(date,clock){let x=new Date(date+'T12:00:00');x.setHours(clock[0],clock[1],0,0);return x}
function dateKeyLocal(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function scheduledOccurrences(days=21){let now=new Date(),events=[];for(let offset=0;offset<=days;offset++){let date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset),key=dateKeyLocal(date),weekday=WEEKDAYS[date.getDay()];for(let e of scheduleDay(weekday)){let clock=eventClock(e.time);if(clock)events.push({id:e.id,date:key,name:e.name,start:dateAtLocal(key,clock),type:e.type})}for(let e of db.extraEvents||[]){if(e.date!==key)continue;let clock=eventClock(e.time);if(clock)events.push({id:e.id,date:key,name:e.name,start:dateAtLocal(key,clock),type:e.type})}}return events.sort((a,b)=>a.start-b.start)}
function icsEscape(v){return String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function icsStamp(date){return date.getUTCFullYear()+String(date.getUTCMonth()+1).padStart(2,'0')+String(date.getUTCDate()).padStart(2,'0')+'T'+String(date.getUTCHours()).padStart(2,'0')+String(date.getUTCMinutes()).padStart(2,'0')+'00Z'}
function downloadEventCalendar(id,kind){let e=kind==='extra'?(db.extraEvents||[]).find(x=>String(x.id)===String(id)):(db.schedule||[]).find(x=>String(x.id)===String(id));if(!e)return toast('Event not found');let clock=eventClock(e.time);if(!clock)return toast('Set a specific time for this event before adding a calendar alert');let date;if(kind==='extra')date=e.date;else{let now=new Date(),delta=(WEEKDAYS.indexOf(e.day)-now.getDay()+7)%7;date=dateKeyLocal(new Date(now.getFullYear(),now.getMonth(),now.getDate()+delta))}let start=dateAtLocal(date,clock),end=new Date(start.getTime()+60*60000),lead=reminderLead();let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OFFSZN//Event Reminder//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:jr-'+encodeURIComponent(String(id))+'-'+date+'@jr-performance','DTSTAMP:'+icsStamp(new Date()),'DTSTART:'+icsStamp(start),'DTEND:'+icsStamp(end),'SUMMARY:'+icsEscape(e.name),'DESCRIPTION:'+icsEscape('OFFSZN scheduled activity')];if(kind==='recurring')lines.push('RRULE:FREQ=WEEKLY;COUNT=12');if(lead>0)lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEscape(e.name),'TRIGGER:-PT'+lead+'M','END:VALARM');lines.push('END:VEVENT','END:VCALENDAR');download('JR_'+String(e.name).replace(/[^a-z0-9]+/gi,'_')+'.ics',lines.join('\r\n')+'\r\n','text/calendar;charset=utf-8');toast('Calendar file ready. Open it and add the event to your calendar.');}
function renderRemindersSettings(){let next=scheduledOccurrences(14).filter(e=>e.start>Date.now()).slice(0,8);$('app').innerHTML=`<div class="card"><button class="settings-back" onclick="settingsOpen('')"><span class="settings-back-arrow">←</span> Settings</button><h1>EVENT <span class="accent">REMINDERS</span></h1><p>Set reminders for pitching, practice, hitting and other timed activities.</p><label class="jr-reminder-toggle"><input type="checkbox" ${reminderEnabled()?'checked':''} onchange="db.settings.remindersEnabled=this.checked;save()"> Show reminders while OFFSZN is open</label><label>Remind me before an event<select onchange="db.settings.reminderLead=Number(this.value);save();renderRemindersSettings()">${[0,5,15,30,60,120,1440].map(v=>`<option value="${v}" ${reminderLead()===v?'selected':''}>${v===0?'At event time':v===1440?'1 day before':v+' minutes before'}</option>`).join('')}</select></label><p class="mini">App reminders work only while the website is open. For reliable notifications when the iPhone is locked or the app is closed, add events to Apple Calendar using the buttons below. Calendar alerts are managed by iOS.</p></div><div class="card"><h2>UPCOMING EVENTS</h2>${next.map(e=>`<div class="event"><div class="event-body"><b>${esc(e.name)}</b><small>${esc(e.start.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</small></div><button class="small secondary" onclick="downloadEventCalendar('${esc(e.id)}','${(db.extraEvents||[]).some(x=>String(x.id)===String(e.id))?'extra':'recurring'}')">+ Calendar</button></div>`).join('')||'<p class="mini">No timed events coming up. Add a specific time in Schedule.</p>'}</div>`}
let reminderCheckBusy=false;
function checkEventReminders(){if(reminderCheckBusy||!reminderEnabled()||document.visibilityState==='hidden')return;reminderCheckBusy=true;try{let now=Date.now(),lead=reminderLead(),seenKey='jr-performance-event-alerts-v1',seen={};try{seen=JSON.parse(localStorage.getItem(seenKey)||'{}')||{}}catch{}for(let e of scheduledOccurrences(2)){let target=e.start.getTime()-lead*60000,key=e.id+'|'+e.date+'|'+lead;if(now>=target&&now<e.start.getTime()+60000&&!seen[key]){seen[key]=now;toast('Upcoming: '+e.name+' · '+e.start.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}));break}}for(let k in seen)if(now-seen[k]>7*86400000)delete seen[k];try{localStorage.setItem(seenKey,JSON.stringify(seen))}catch{}}finally{reminderCheckBusy=false}}
setInterval(checkEventReminders,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkEventReminders()});
setTimeout(checkEventReminders,2000);

/* v8.31: close one-time activity dialog with Escape */
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeOneTimeActivity()});


// OFFSZN 8.44: private, device-local program builder preview.
// A program draft never overwrites the existing 12-week JR program.
const OFFSZN_BUILDER_KEY='offszn-builder-draft-v1';
function builderDraft(){
 try { const x=JSON.parse(localStorage.getItem(OFFSZN_BUILDER_KEY)||'null');return x&&typeof x==='object'?x:{} }catch(e){return {}}
}
function builderValue(id){return ($(id)||{}).value||''}
function offsznAgeFromDob(dob){if(!/^\d{4}-\d{2}-\d{2}$/.test(dob||''))return null;const d=new Date(dob+'T12:00:00');if(!Number.isFinite(d.getTime())||dateKeyLocal(d)!==dob)return null;const now=new Date();let age=now.getFullYear()-d.getFullYear();if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))age--;return age}
function renderAthleteOnboarding(){
 const p=profileData(),b=db.activeBlueprint||{},choice=(values,value)=>values.map(([v,t])=>`<option value="${v}" ${String(value||'')===v?'selected':''}>${t}</option>`).join('');
 $('app').innerHTML=`<section class="card offszn-builder"><span class="v7-kicker">ATHLETE ONBOARDING</span><h1>MAKE IT <span class="accent">YOURS.</span></h1><p>Set up your athlete profile and create a personalized training blueprint. Your training history remains separate from other signed-in athletes when cloud sync is connected.</p>
 <form id="offOnboardForm" onsubmit="saveAthleteOnboarding(event)"><div class="grid">
 <label>Athlete name<input id="onName" maxlength="40" required value="${esc(p.name==='JR'&&!authUser?'':p.name||'')}" placeholder="First and last name"></label>
 <label>Date of birth<input id="onDob" type="date" required value="${esc(p.dob||'')}"></label>
 <label>Position<input id="onPosition" maxlength="40" required value="${esc(p.position||'')}" placeholder="e.g. Shortstop / Pitcher"></label>
 <label>Training experience<select id="onExperience">${choice([['beginner','New to strength training'],['some','6–18 months'],['experienced','18+ months']],b.experience||'beginner')}</select></label>
 <label>Primary goal<select id="onGoal">${choice([['balanced','Overall athletic development'],['strength','Strength and muscle'],['speed','Speed and explosiveness'],['power','Rotational power']],b.goal||'balanced')}</select></label>
 <label>Equipment<select id="onEquipment">${choice([['full','Full gym'],['home','Home gym'],['basic','Dumbbells / bands']],b.equipment||'full')}</select></label>
 <label>Baseball role<select id="onRole">${choice([['position','Position player'],['pitcher','Pitcher'],['two-way','Two-way player'],['catcher','Catcher']],b.role||'position')}</select></label>
 <label>Season<select id="onSeason">${choice([['offseason','Offseason'],['preseason','Preseason'],['inseason','In-season']],b.season||'offseason')}</select></label>
 <label>Throwing workload<select id="onThrowing">${choice([['light','Light / occasional'],['moderate','Regular practices'],['heavy','Frequent pitching / games']],b.throwing||'moderate')}</select></label>
 <label>Training days<select id="onDays">${choice([2,3,4].map(x=>[String(x),x+' days/week']),String(b.days||3))}</select></label>
 </div><div class="notice">For athletes under 13, registration must be parent-managed with appropriate verified consent. This form does not establish parental consent. Training plans should be reviewed by a qualified coach or parent.</div><button class="wide" type="submit">Save profile & activate blueprint</button></form></section>${db.activeBlueprint?`<section class="card"><h2>Current athlete blueprint</h2><p>${esc(db.activeBlueprint.days)} planned days/week · ${esc(db.activeBlueprint.goal)} focus</p><button class="secondary" onclick="settingsOpen('builder')">Review blueprint</button></section>`:''}`;
}
function saveAthleteOnboarding(event){event.preventDefault();const val=id=>$(id).value.trim(),age=offsznAgeFromDob(val('onDob'));if(age===null||age<12||age>18){alert('This onboarding flow is for athletes ages 12–18.');return}if(age<13){alert('Athletes under 13 require a verified parent-managed enrollment. This has not yet been implemented; no profile was created.');return}if(!authUser||offsznAuthRole!=='athlete'){alert('Sign in to an athlete account before completing onboarding.');settingsOpen('account');return}const p={...profileData(),name:val('onName').slice(0,40),dob:val('onDob'),position:val('onPosition').slice(0,40),goalWorkouts:Number(val('onDays'))};if(!p.name||!p.position){alert('Name and position are required.');return}db.profile=p;db.activeBlueprint={age,role:val('onRole'),experience:val('onExperience'),season:val('onSeason'),goal:val('onGoal'),days:Number(val('onDays')),equipment:val('onEquipment'),throwing:val('onThrowing'),generated:true,activatedAt:new Date().toISOString()};db.onboardingComplete=true;save();settingsOpen('builder');toast('Athlete profile and blueprint saved');}
function activateOffsznBlueprint(){if(!authUser||offsznAuthRole!=='athlete'){toast('Sign in as an athlete first');return}const d={age:Number(builderValue('pbAge')),role:builderValue('pbRole'),experience:builderValue('pbExperience'),season:builderValue('pbSeason'),goal:builderValue('pbGoal'),days:Number(builderValue('pbDays')),equipment:builderValue('pbEquipment'),throwing:builderValue('pbThrowing'),generated:true,activatedAt:new Date().toISOString()};if(!db.profile?.name||!db.profile?.dob){toast('Complete athlete setup first');settingsOpen('onboarding');return}const actual=offsznAgeFromDob(db.profile.dob);if(actual===null||actual<13||actual>18){toast('Athlete eligibility needs review');return}d.age=actual;db.activeBlueprint=d;db.profile.goalWorkouts=d.days;save();renderProgramBuilder();toast('Blueprint activated and saved');}
function renderProgramBuilder(){
 const d={...builderDraft(),...(db.activeBlueprint||{})},opt=(val,selected)=>val===selected?'selected':'';
 $('app').innerHTML=`<section class="card offszn-builder">
 <button class="secondary small" onclick="settingsOpen('')">← Settings</button>
 <span class="v7-kicker">OFFSZN / ATHLETE DEVELOPMENT</span>
 <h1>BUILD YOUR <span class="accent">OFFSEASON.</span></h1>
 <p>Create a personalized starting plan for baseball players ages 12–18. This is a local preview, not a prescribed or automatically activated program.</p>
 <div class="grid">
 <label>Age <select id="pbAge">${Array.from({length:7},(_,i)=>i+12).map(v=>`<option value="${v}" ${opt(String(v),String(d.age||14))}>${v}</option>`).join('')}</select></label>
 <label>Baseball role <select id="pbRole">${[['position','Position player'],['pitcher','Pitcher'],['two-way','Two-way player'],['catcher','Catcher']].map(([v,t])=>`<option value="${v}" ${opt(v,d.role||'two-way')}>${t}</option>`).join('')}</select></label>
 <label>Training experience <select id="pbExperience">${[['beginner','New to strength training'],['some','6–18 months'],['experienced','18+ months']].map(([v,t])=>`<option value="${v}" ${opt(v,d.experience||'beginner')}>${t}</option>`).join('')}</select></label>
 <label>Season <select id="pbSeason">${[['offseason','Offseason'],['preseason','Preseason'],['inseason','In-season']].map(([v,t])=>`<option value="${v}" ${opt(v,d.season||'offseason')}>${t}</option>`).join('')}</select></label>
 <label>Primary goal <select id="pbGoal">${[['strength','Strength and muscle'],['speed','Speed and explosiveness'],['power','Rotational power'],['balanced','Overall development']].map(([v,t])=>`<option value="${v}" ${opt(v,d.goal||'balanced')}>${t}</option>`).join('')}</select></label>
 <label>Training days <select id="pbDays">${[2,3,4].map(v=>`<option value="${v}" ${opt(String(v),String(d.days||3))}>${v} days/week</option>`).join('')}</select></label>
 <label>Equipment <select id="pbEquipment">${[['full','Full gym'],['home','Home gym'],['basic','Dumbbells / bands']].map(([v,t])=>`<option value="${v}" ${opt(v,d.equipment||'full')}>${t}</option>`).join('')}</select></label>
 <label>Throwing workload <select id="pbThrowing">${[['light','Light / occasional'],['moderate','Regular practices'],['heavy','Frequent pitching / games']].map(([v,t])=>`<option value="${v}" ${opt(v,d.throwing||'moderate')}>${t}</option>`).join('')}</select></label>
 </div>
 <button onclick="generateOffsznPreview()">Generate my training preview</button><button class="secondary" onclick="activateOffsznBlueprint()">Activate this blueprint</button>
 <div class="notice">For youth athletes, prioritize technique and recovery. Have a qualified coach or parent review the plan. Stop for pain. Never use this builder to work around an injury or medical restriction.</div>
 </section><div id="offsznPreview">${d.generated?builderPreviewHTML(d):''}</div>`;
}
function generateOffsznPreview(){
 const d={age:Number(builderValue('pbAge')),role:builderValue('pbRole'),experience:builderValue('pbExperience'),season:builderValue('pbSeason'),goal:builderValue('pbGoal'),days:Number(builderValue('pbDays')),equipment:builderValue('pbEquipment'),throwing:builderValue('pbThrowing'),generated:true};
 try{localStorage.setItem(OFFSZN_BUILDER_KEY,JSON.stringify(d))}catch(e){toast('Could not save preview on this device.')}
 $('offsznPreview').innerHTML=builderPreviewHTML(d);
 $('offsznPreview').scrollIntoView({behavior:'smooth',block:'start'});
}
function builderPreviewHTML(d){
 const beginner=d.experience==='beginner'||d.age<=13;
 const heavy=d.throwing==='heavy'||d.season==='inseason';
 const effectiveDays=heavy?Math.min(2,d.days):d.days;
 const sets=beginner?'2 sets × 6–10 controlled reps':'2–3 sets × 6–10 controlled reps';
 const lift=d.equipment==='basic'?['Goblet squat','Dumbbell Romanian deadlift','Push-up','One-arm dumbbell row','Pallof press']:d.equipment==='home'?['Goblet squat','Dumbbell Romanian deadlift','Dumbbell floor press','One-arm row','Side plank']:['Goblet squat or coached squat variation','Trap-bar deadlift technique','Dumbbell bench press','Seated cable row','Pallof press'];
 const days=[
 {name:'DAY 1 · FOUNDATION',moves:[lift[0],lift[2],lift[3],'Single-leg balance reach','Dead bug']},
 {name:'DAY 2 · TOTAL BODY',moves:[lift[1],lift[2],lift[3],'Reverse lunge','Side plank']},
 {name:'DAY 3 · ATHLETIC POWER',moves:['Dynamic warm-up','Low box jump (quality landings)',lift[0],lift[3],'Medicine-ball rotational throw (coached)']},
 {name:'DAY 4 · MOVEMENT & MOBILITY',moves:['Dynamic warm-up','Lateral shuffle','Single-leg balance reach','Pallof press','Mobility / easy recovery']}
 ];
 const caution=heavy?'Because of the selected season/throwing workload, the preview limits strength sessions to two per week. Coordinate sessions with games and pitching.':'Keep at least one recovery day between demanding lifting sessions.';
 return `<section class="card offszn-plan" aria-label="Your training program preview"><span class="v7-kicker">YOUR STARTING BLUEPRINT</span><h2>${esc(d.season.toUpperCase())} · ${effectiveDays} DAYS / WEEK</h2><p>${esc(d.goal)} focus · Ages 12–18 · ${beginner?'Foundational progression':'Progressive strength'} · ${esc(d.role)}</p><div class="notice">${esc(caution)}</div>${days.slice(0,effectiveDays).map(day=>`<div class="offszn-plan-day"><h3>${esc(day.name)}</h3><p class="mini">${esc(sets)} on strength movements, at a comfortable effort. Warm up first.</p><ul>${day.moves.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`).join('')}<p class="mini">Suggested structure: 8 weeks with an easier week around week 4. Progress only when technique is consistent and recovery is good. This draft does not modify JR's active program or training history.</p><button class="secondary" onclick="downloadOffsznPlan()">Export plan preview</button></section>`;
}
function downloadOffsznPlan(){
 const d=builderDraft();if(!d.generated){toast('Generate a plan first.');return}
 const text=['OFFSZN — TRAINING BLUEPRINT','Draft only • coach/parent review required','',...Object.entries(d).filter(([k])=>k!=='generated').map(([k,v])=>`${k}: ${v}`),'','This is a starting framework, not an individualized medical or coaching prescription.'];
 const blob=new Blob([text.join('\n')],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='OFFSZN-program-blueprint.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}


// OFFSZN v8.46: athlete-first auth (email confirmation). No client-side
// "parental consent" checkbox is considered verified consent.
const OFFSZN_SUPABASE_URL='https://dzjzoqjmvchvfuzfomde.supabase.co';
const OFFSZN_SUPABASE_KEY='sb_publishable_ecEae3qJcAaCmzOGy9nHQQ_P3i3OBQE';
const OFFSZN_SESSION_KEY='offszn-auth-session-v1';

// v8.66: persistent Supabase Auth sessions. Never persist passwords.
let offsznAuthRefreshTimer=null,offsznAuthRestoreBusy=false,offsznAuthRefreshBusy=null;
function offsznReadAuthSession(){try{const x=JSON.parse(localStorage.getItem(OFFSZN_SESSION_KEY)||'null');return x&&x.access_token&&x.refresh_token&&x.user_id?x:null}catch{return null}}
function offsznStoreAuthSession(x){
 if(!x?.access_token||!x?.refresh_token||!x?.user?.id)return;
 const session={access_token:x.access_token,refresh_token:x.refresh_token,user_id:x.user.id,role:x.user.user_metadata?.role||offsznAuthRole||'athlete',expires_at:Math.floor(Date.now()/1000)+Number(x.expires_in||3600)};
 localStorage.setItem(OFFSZN_SESSION_KEY,JSON.stringify(session));offsznScheduleAuthRefresh();
}
function offsznScheduleAuthRefresh(){
 clearTimeout(offsznAuthRefreshTimer);const x=offsznReadAuthSession();if(!x)return;
 const delay=Math.max(5000,Math.min(2147483647,(x.expires_at*1000-Date.now())-120000));
 offsznAuthRefreshTimer=setTimeout(()=>{offsznRefreshAuthSession().catch(console.warn)},delay);
}
async function offsznRefreshAuthSession(){
 if(offsznAuthRefreshBusy)return offsznAuthRefreshBusy;
 offsznAuthRefreshBusy=(async()=>{
 const current=offsznReadAuthSession();if(!current)return false;
 const {url,key}=cloudConfig();
 let response;
 try{response=await fetch(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:current.refresh_token})})}
 catch(e){offsznScheduleAuthRetry();throw e}
 const result=await response.json().catch(()=>({}));
 if(!response.ok){
  if(response.status===400||response.status===401||response.status===403){
   localStorage.removeItem(OFFSZN_SESSION_KEY);clearTimeout(offsznAuthRefreshTimer);
   offsznSyncEnabled=false;authToken=null;authUser=null;offsznAuthRole=null;
   offsznSyncState='Session expired — sign in again';render();return false;
  }
  offsznScheduleAuthRetry();throw Error(result.msg||result.message||'Session refresh unavailable');
 }
 if(!result.access_token||!result.refresh_token||result.user?.id!==current.user_id){offsznScheduleAuthRetry();return false}
 authToken=result.access_token;authUser=result.user.id;offsznAuthRole=result.user.user_metadata?.role||current.role;
 offsznStoreAuthSession(result);return true;
 })();try{return await offsznAuthRefreshBusy}finally{offsznAuthRefreshBusy=null}
}
function offsznScheduleAuthRetry(){clearTimeout(offsznAuthRefreshTimer);offsznAuthRefreshTimer=setTimeout(()=>{if(navigator.onLine)offsznRefreshAuthSession().catch(console.warn)},30000)}
async function offsznRestoreAuthSession(){
 if(offsznAuthRestoreBusy)return;offsznAuthRestoreBusy=true;
 try{
  const x=offsznReadAuthSession();if(!x)return;
  authToken=x.access_token;authUser=x.user_id;offsznAuthRole=x.role;
  if(x.expires_at*1000<=Date.now()+120000){if(!navigator.onLine){offsznScheduleAuthRetry();return}if(!await offsznRefreshAuthSession())return}
  else offsznScheduleAuthRefresh();
  if(offsznAuthRole==='athlete')await offsznConnectSync();
  else render();
 }catch(e){console.warn('OFFSZN session restore:',e);offsznScheduleAuthRetry()}
 finally{offsznAuthRestoreBusy=false}
}
window.addEventListener('online',()=>{if(offsznReadAuthSession()&&(!authToken||!offsznSyncEnabled&&offsznAuthRole==='athlete'))offsznRestoreAuthSession();else if(offsznReadAuthSession())offsznRefreshAuthSession().catch(console.warn)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){const x=offsznReadAuthSession();if(x&&x.expires_at*1000<Date.now()+120000)offsznRefreshAuthSession().catch(console.warn)}});

function renderAthleteAccount(){
 const signed=!!(authToken&&authUser);
 $('app').innerHTML=`<section class="card offszn-account">
 <button class="secondary small" onclick="settingsOpen('')">← Settings</button>
 <span class="v7-kicker">OFFSZN / ATHLETE ACCOUNT</span><h1>${signed?'YOU’RE <span class="accent">SIGNED IN.</span>':'YOUR <span class="accent">OFFSEASON.</span>'}</h1>
 <p>${signed?'Your email account is authenticated. Automatic cloud synchronization is available after the v8.59 database setup.':'Create an athlete account or sign in to your existing account. Profiles are private by default.'}</p>
 ${signed?`<div class="notice good">Authenticated account: ${esc(authUser)}</div>${offsznAuthRole==='athlete'?offsznSyncStatusHtml():''}<button class="secondary" onclick="cloudLogout();settingsOpen('account')">Sign out</button><button onclick="settingsOpen('data')">Cloud backup & data</button>`:
 `<label>Email address<input id="athEmail" type="email" autocomplete="email" inputmode="email" placeholder="athlete@example.com"></label>
 <label>Password<input id="athPassword" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters"></label>
 <label>Date of birth<input id="athDob" type="date" autocomplete="bday" onchange="offsznShowCalculatedAge()" oninput="offsznShowCalculatedAge()" required></label><div class="notice" id="athCalculatedAge" aria-live="polite">Enter your date of birth to calculate your age.</div>
 <div class="notice">Athletes aged 12 can begin registration only through a parent/guardian consent flow. This release does not yet provide verified parental consent, so age-12 account creation is unavailable. Athletes 13–17 should review the privacy notice with a parent or guardian.</div>
 <div class="actionrow"><button onclick="offsznAthleteSignUp()">Create athlete account</button><button class="secondary" onclick="offsznAthleteLogin()">Sign in</button></div>
 <button class="secondary small" onclick="offsznResetPassword()">Forgot password?</button><button class="secondary" onclick="settingsOpen('parentAccount')">I'm a parent / guardian</button>
 <p class="mini">Email confirmation must be enabled in Supabase. Authentication is online-only. The app's existing local training history remains on this device until you explicitly upload it.</p>`}
 <p id="athAccountStatus" class="mini" role="status"></p></section>`;
}
function athleteAccountMessage(msg){const el=$('athAccountStatus');if(el)el.textContent=msg;else toast(msg)}
async function athleteAuthRequest(endpoint,payload){
 const {url,key}=cloudConfig();
 const response=await fetch(url+'/auth/v1/'+endpoint,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.msg||result.error_description||result.message||'Authentication failed');
 return result;
}
async function offsznAthleteSignUp(){
 const dob=builderValue('athDob'),age=offsznAgeFromDob(dob),email=builderValue('athEmail').trim(),password=builderValue('athPassword');
 if(age===null){athleteAccountMessage('Enter a valid date of birth.');return}
 if(age===12){athleteAccountMessage('Age 12 requires verified guardian consent; registration is not available yet.');return}
 if(age<13||age>18){athleteAccountMessage('OFFSZN athlete registration is currently available only for ages 13–18.');return}
 if(!email||password.length<8){athleteAccountMessage('Enter an email and password of at least 8 characters.');return}
 try{
  const x=await athleteAuthRequest('signup',{email,password,data:{date_of_birth:dob,role:'athlete'}});
  if(x.access_token){authToken=x.access_token;authUser=x.user?.id;offsznAuthRole='athlete';offsznStoreAuthSession(x);await offsznSaveDobProfile(dob);await offsznConnectSync();renderAthleteAccount()}
  else athleteAccountMessage('Check your email for the confirmation link, then return to sign in.');
 }catch(e){athleteAccountMessage(e.message)}
}
async function offsznAthleteLogin(){
 const email=builderValue('athEmail').trim(),password=builderValue('athPassword');
 if(!email||!password){athleteAccountMessage('Enter your email and password.');return}
 try{
  const x=await athleteAuthRequest('token?grant_type=password',{email,password});
  if(!x.access_token||!x.user?.id)throw Error('Email confirmation may still be required.');
  authToken=x.access_token;authUser=x.user.id;offsznAuthRole=x.user.user_metadata?.role||'athlete';offsznStoreAuthSession(x);
  if(x.user.user_metadata?.date_of_birth)await offsznSaveDobProfile(x.user.user_metadata.date_of_birth);
  await offsznConnectSync();renderAthleteAccount();
 }catch(e){athleteAccountMessage(e.message)}
}
async function offsznResetPassword(){
 const email=builderValue('athEmail').trim();
 if(!email){athleteAccountMessage('Enter your email address first.');return}
 try{await athleteAuthRequest('recover',{email});athleteAccountMessage('If this email is registered, a password recovery message will be sent.')}catch(e){athleteAccountMessage(e.message)}
}

// v8.47: DOB is the source of truth; age is always derived on demand.
function offsznAgeFromDob(dob, today=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dob||''))return null;
 const [y,m,d]=dob.split('-').map(Number);
 const date=new Date(Date.UTC(y,m-1,d));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
 const currentYear=today.getFullYear(),currentMonth=today.getMonth()+1,currentDay=today.getDate();
 if(y>currentYear||y===currentYear&&(m>currentMonth||m===currentMonth&&d>currentDay))return null;
 return currentYear-y-(currentMonth<m||currentMonth===m&&currentDay<d?1:0);
}
function offsznShowCalculatedAge(){
 const el=$('athCalculatedAge');if(!el)return;
 const age=offsznAgeFromDob(builderValue('athDob'));
 el.textContent=age===null?'Enter a valid date of birth.':age===12?'Age 12 — guardian consent is required; registration is not yet available.':age>=13&&age<=18?`Calculated age: ${age} years — eligible to register.`:`Calculated age: ${age} years — outside the supported 12–18 age range.`;
}
async function offsznSaveDobProfile(dob){
 if(!authToken||!authUser||offsznAgeFromDob(dob)===null)return;
 const {url,key}=cloudConfig();
 const response=await fetch(url+'/rest/v1/athlete_profiles?on_conflict=user_id',{
  method:'POST',headers:{apikey:key,Authorization:'Bearer '+authToken,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},
  body:JSON.stringify({user_id:authUser,date_of_birth:dob})
 });
 if(!response.ok){console.warn('DOB profile sync pending',response.status);athleteAccountMessage('Signed in, but birthdate profile sync needs database setup.');}
}

// OFFSZN 8.48 — accessible confirmation dialog for destructive actions.
function offsznConfirm(title,message,onConfirm,danger=false){
 document.getElementById('offsznConfirmLayer')?.remove();
 const layer=document.createElement('div');
 layer.id='offsznConfirmLayer';layer.className='offszn-dialog-layer';
 layer.innerHTML=`<section class="offszn-dialog" role="alertdialog" aria-modal="true" aria-labelledby="offsznDialogTitle" aria-describedby="offsznDialogDescription">
 <div class="offszn-dialog-mark" aria-hidden="true">!</div>
 <h2 id="offsznDialogTitle">${esc(title)}</h2>
 <p id="offsznDialogDescription">${esc(message)}</p>
 <div class="offszn-dialog-actions"><button type="button" class="secondary" id="offsznCancel">Cancel</button><button type="button" class="${danger?'offszn-danger':''}" id="offsznAccept">${danger?'Delete':'Continue'}</button></div></section>`;
 const previous=document.activeElement;
 const close=()=>{layer.remove();document.removeEventListener('keydown',keys);previous?.focus?.()};
 const keys=e=>{if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='Tab'){const nodes=[layer.querySelector('#offsznCancel'),layer.querySelector('#offsznAccept')];if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes[1].focus()}else if(!e.shiftKey&&document.activeElement===nodes[1]){e.preventDefault();nodes[0].focus()}}};
 layer.querySelector('#offsznCancel').onclick=close;
 layer.querySelector('#offsznAccept').onclick=()=>{close();onConfirm()};
 layer.addEventListener('click',e=>{if(e.target===layer)close()});
 document.addEventListener('keydown',keys);
 document.body.appendChild(layer);layer.querySelector('#offsznCancel').focus();
}
function offsznEraseData(){offsznConfirm('Erase all local records?','This permanently deletes the training history stored on this device. Export a backup before continuing.',()=>{localStorage.removeItem(KEY);location.reload()},true)}

// OFFSZN v8.57: parent account / explicit two-sided link approvals.
// These links are NOT parental identity verification or COPPA consent.
function offsznParentMessage(message,kind='info'){const el=$('parentAccountStatus');if(el){el.textContent=message;el.dataset.kind=kind;el.hidden=false;}toast(message)}
function renderParentAccount(){
 const signed=!!(authToken&&authUser),role=offsznAuthRole;
 $('app').innerHTML=`<section class="off-parent-page"><div class="off-parent-hero"><span class="v7-kicker">OFFSZN / FAMILY</span><h1>PARENT <span class="accent">ACCOUNT</span></h1><p>Connect with an athlete through an invitation that both accounts approve. One parent can link to multiple athletes.</p></div>
 ${!signed?`<div class="off-parent-card"><h2>Parent sign in or registration</h2><label>Parent email<input id="parentEmail" type="email" autocomplete="email" placeholder="parent@example.com"></label><label>Password<input id="parentPassword" type="password" minlength="8" autocomplete="current-password" placeholder="At least 8 characters"></label><p id="parentAccountStatus" role="status" aria-live="polite" class="off-parent-feedback" hidden></p><div class="actionrow"><button type="button" id="parentCreateButton" onclick="offsznParentSignUp()">Create parent account</button><button type="button" class="secondary" onclick="offsznParentLogin()">Sign in</button></div><button class="secondary small" onclick="offsznParentReset()">Forgot password?</button><p class="mini">Confirm your email before signing in. Parent registration does not itself establish verified parental consent for an under-13 athlete.</p></div>`:
 `<div class="off-parent-card"><div class="off-parent-status">● Signed in ${role==='parent'?'as parent':role==='athlete'?'as athlete':'(account type not established)'}</div><p class="mini">Account: ${esc(authUser)}</p><button class="secondary small" onclick="cloudLogout();settingsOpen('parentAccount')">Sign out</button></div>
 ${role==='parent'?`<div class="off-parent-card"><h2>Link an existing athlete</h2><p>Open the private invitation link shared by your athlete, or enter their code. The athlete approves your request.</p><label>Invitation code<input id="parentInviteCode" maxlength="12" autocapitalize="characters" placeholder="Automatically filled from invite link"></label><button onclick="offsznParentRequestLink()">Request athlete link</button></div><div class="off-parent-card"><h2>My linked athletes</h2><div id="parentLinkedList">Loading...</div><button class="secondary" onclick="offsznLoadFamilyLinks()">Refresh links</button></div>`:
 role==='athlete'?`<div class="off-parent-card"><h2>Invite a parent</h2><p>Create a private invitation link and share it with your parent. The link expires after 24 hours.</p><button onclick="offsznAthleteInviteCode()">Create parent invite link</button><div id="offParentInviteResult" class="off-parent-code" aria-live="polite"></div></div><div class="off-parent-card"><h2>Parent link requests</h2><div id="parentPendingList">Loading...</div><button class="secondary" onclick="offsznLoadFamilyLinks()">Refresh requests</button></div>`:
 `<div class="notice">Sign out and sign in with an athlete or parent account to manage links.</div>`}`}
 <div class="off-parent-card"><h2>Family privacy</h2><p>Linking is optional. Athletes must approve a parent request before the accounts are connected. This release does not share workout records with parent accounts or support under-13 registration.</p><p class="mini">Account linking requires the v8.57 Supabase SQL migration and an online connection. Do not share invitation codes publicly.</p></div></section>`;
 if(signed&&(role==='parent'||role==='athlete'))offsznLoadFamilyLinks();
 const invite=offsznInviteFromUrl();
 if(invite&&role==='parent'){const input=$('parentInviteCode');if(input){input.value=invite;offsznParentMessage('Invitation ready. Select Request athlete link to continue.','success')}}
 if(invite&&!signed){const status=$('parentAccountStatus');if(status){status.hidden=false;status.textContent='You opened an athlete invitation. Create or sign into your parent account to continue.'}}

}
async function offsznParentSignUp(){
 const email=builderValue('parentEmail').trim(),password=builderValue('parentPassword');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return offsznParentMessage('Enter a valid parent email address.','error');
 if(password.length<8)return offsznParentMessage('Enter a password of at least 8 characters.','error');
 const btn=$('parentCreateButton');
 if(btn?.disabled)return;
 if(btn){btn.disabled=true;btn.textContent='Creating account…'}
 offsznParentMessage('Connecting securely to create your parent account…');
 try{
  const x=await Promise.race([athleteAuthRequest('signup',{email,password,data:{role:'parent'}}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Connection timed out. Check your internet connection and Supabase configuration, then try again.')),15000))]);
  if(x.access_token&&x.user?.id){authToken=x.access_token;authUser=x.user.id;offsznAuthRole='parent';offsznStoreAuthSession(x);renderParentAccount();offsznParentMessage('Parent account created and signed in.','success')}
  else offsznParentMessage('Account request submitted. Check your email for a confirmation link, then return here to sign in.','success');
 }catch(e){offsznParentMessage('Could not create parent account: '+(e?.message||'Network error. Please try again.'),'error')}
 finally{const current=$('parentCreateButton');if(current){current.disabled=false;current.textContent='Create parent account'}}
}
async function offsznParentLogin(){
 const email=builderValue('parentEmail').trim(),password=builderValue('parentPassword');
 if(!email||!password)return offsznParentMessage('Enter your email and password.');
 try{const x=await athleteAuthRequest('token?grant_type=password',{email,password});
 if(!x.access_token||!x.user?.id)throw Error('Confirm your email before signing in.');
 if(x.user.user_metadata?.role!=='parent')throw Error('This account is not registered as a parent. Use Athlete Account to sign in.');
 authToken=x.access_token;authUser=x.user.id;offsznAuthRole='parent';offsznStoreAuthSession(x);renderParentAccount();
 }catch(e){offsznParentMessage(e.message)}
}
async function offsznParentReset(){const email=builderValue('parentEmail').trim();if(!email)return offsznParentMessage('Enter your email first.');try{await athleteAuthRequest('recover',{email});offsznParentMessage('If the address exists, a recovery email has been sent.')}catch(e){offsznParentMessage(e.message)}}
async function offsznFamilyRPC(fn,params={}){
 const saved=offsznReadAuthSession();if(saved&&saved.expires_at*1000<Date.now()+60000)await offsznRefreshAuthSession();
 if(!authToken||!authUser)throw Error('Sign in first.');
 const {url,key}=cloudConfig();const r=await fetch(url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+authToken,'Content-Type':'application/json'},body:JSON.stringify(params)});
 const result=await r.json().catch(()=>null);
 if(!r.ok)throw Error(result?.message||'Family linking is unavailable. Apply the v8.57 Supabase SQL migration.');
 return result;
}
function offsznInviteFromUrl(){try{const code=new URLSearchParams(location.search).get('parentInvite');return /^[A-F0-9]{8}$/i.test(code||'')?code.toUpperCase():''}catch{return ''}}
async function offsznCopyInviteLink(){const el=$('offsznInviteLink');if(!el)return;try{await navigator.clipboard.writeText(el.value);offsznParentMessage('Private invitation link copied.','success')}catch{el.focus();el.select();offsznParentMessage('Select and copy the link to share privately.')}}
async function offsznShareInviteLink(){const el=$('offsznInviteLink');if(!el)return;try{if(navigator.share)await navigator.share({title:'OFFSZN parent invitation',text:'Connect your parent account to my OFFSZN athlete profile:',url:el.value});else await offsznCopyInviteLink()}catch(e){if(e?.name!=='AbortError')offsznParentMessage('Could not share. Use Copy link.')}}
async function offsznAthleteInviteCode(){try{const code=await offsznFamilyRPC('offszn_create_parent_invite');const el=$('offParentInviteResult');if(el){const link=new URL(location.href);link.searchParams.set('parentInvite',code);link.hash='';el.innerHTML='<p>Share this private link with your parent (valid for 24 hours):</p><input id="offsznInviteLink" readonly aria-label="Parent invitation link"><div class="actionrow"><button type="button" onclick="offsznShareInviteLink()">Share link</button><button type="button" class="secondary" onclick="offsznCopyInviteLink()">Copy link</button></div><small>Or share this code: '+esc(code)+'</small>';const field=$('offsznInviteLink');if(field)field.value=link.toString();}}catch(e){offsznParentMessage('Could not create invitation: '+e.message+'. Apply the v8.63 Supabase SQL fix.','error')}}
async function offsznParentRequestLink(){const code=(builderValue('parentInviteCode')||offsznInviteFromUrl()).trim().toUpperCase();if(!/^[A-Z0-9]{8}$/.test(code))return offsznParentMessage('Enter the eight-character invitation code.');try{await offsznFamilyRPC('offszn_request_parent_link',{invite_code:code});offsznParentMessage('Request sent. The athlete must approve the link.','success');try{const u=new URL(location.href);u.searchParams.delete('parentInvite');history.replaceState(null,'',u.toString())}catch{}offsznLoadFamilyLinks()}catch(e){offsznParentMessage(e.message)}}
async function offsznAthleteDecideLink(linkId,approve){try{await offsznFamilyRPC('offszn_decide_parent_link',{link_id:linkId,approve});offsznParentMessage(approve?'Parent linked.':'Request declined.');offsznLoadFamilyLinks()}catch(e){offsznParentMessage(e.message)}}
async function offsznUnlinkParent(linkId){offsznConfirm('Remove family link?','This parent will no longer be linked to the athlete.',async()=>{try{await offsznFamilyRPC('offszn_unlink_parent',{link_id:linkId});offsznLoadFamilyLinks()}catch(e){offsznParentMessage(e.message)}},true)}
async function offsznLoadFamilyLinks(){
 const target=offsznAuthRole==='parent'?'parentLinkedList':'parentPendingList',el=$(target);if(!el)return;
 try{const rows=await offsznFamilyRPC('offszn_list_family_links');
 if(!rows?.length){el.textContent=offsznAuthRole==='parent'?'No links yet.':'No parent requests yet.';return}
 el.innerHTML=rows.map(x=>`<div class="off-family-link"><div><strong>${x.status==='approved'?'Linked':'Pending'} ${offsznAuthRole==='parent'?'athlete':'parent'}</strong><small>${esc(x.counterpart_email||'Account')} · ${esc(x.status)}</small></div><div class="off-family-actions">${offsznAuthRole==='athlete'&&x.status==='pending'?`<button class="small" onclick="offsznAthleteDecideLink('${x.id}',true)">Approve</button><button class="secondary small" onclick="offsznAthleteDecideLink('${x.id}',false)">Decline</button>`:''}${x.status==='approved'?`<button class="secondary small" onclick="offsznUnlinkParent('${x.id}')">Unlink</button>`:''}</div></div>`).join('');
 }catch(e){el.textContent=e.message}
}
