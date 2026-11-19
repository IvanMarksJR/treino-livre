'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DN=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'],DS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const pd=s=>new Date(s+'T12:00:00'),addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return iso(d)};
const dIdx=s=>(pd(s).getDay()+6)%7,monday=s=>addD(s,-dIdx(s)),today=()=>iso(new Date());
const fmt=s=>pd(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const uid=()=>'i'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const clone=x=>JSON.parse(JSON.stringify(x));
/* ===== IndexedDB ===== */
const DB={db:null,open(){return new Promise((res,rej)=>{const r=indexedDB.open('treinolivre',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)})},
 get(k){return new Promise((res,rej)=>{const q=this.db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})},
 set(k,v){return new Promise((res,rej)=>{const t=this.db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}};
let S,V={tab:'home',stack:[],cur:null},run=null;
const defState=()=>({v:1,routine:ROUTINE.map(d=>({...clone(d),items:d.items.map(i=>({...clone(i),id:uid()}))})),custom:{},logs:{},settings:{start:monday(today()),routineVer:2}});
async function save(){try{await DB.set('state',S);}catch(e){toast('Erro ao salvar: '+e.message)}}
const getEx=id=>EX[id]||S.custom[id]||{n:'(exercício removido)',u:'rep',m:[],steps:[],err:[],breath:'',start:''};
const UL={rep:'rep.',s:'s',min:'min'};
const planTxt=i=>`${i.sets} × ${i.reps}${i.unit==='rep'?'':' '+UL[i.unit]}${i.unit==='rep'?' repetições':''}`;
function img(id,cls=''){const e=getEx(id);
 if(e.imgs){if(/thumb/.test(cls))return `<img class="${cls}" src="${e.imgs[e.imgs.length-1]}" alt="${esc(e.n)}">`;
  const n=e.imgs.length,cap=i=>n===3?['1 · V invertido (início)','2 · Descendo','3 · Ponto mais baixo'][i]:n>1?(i?'2 · Final do movimento':'1 · Posição inicial'):(e.tag?'Posição mantida na pausa (segure 2 s)':'');
  return `<div class="heroset">${e.imgs.map((x,i)=>`<figure><img src="${x}" alt="${esc(e.n)} ${i+1}">${cap(i)?`<figcaption>${cap(i)}</figcaption>`:''}</figure>`).join('')}</div>`}
 if(e.pose)return `<div class="${cls} svgbox" aria-label="${esc(e.n)}">${figSVG(e.pose[0],e.pose[1],e.tag,/thumb/.test(cls))}</div>`;
 return `<div class="${cls} noimg">Sem imagem disponível para este exercício</div>`}
/* ===== logs / cálculos ===== */
function logOf(date,create){let l=S.logs[date];if(!l&&create)l=S.logs[date]={day:dIdx(date),items:{},finished:false,rest:false};if(l&&create){S.routine[l.day=dIdx(date)].items.forEach(it=>{if(!l.items[it.id])l.items[it.id]={ex:it.ex,name:getEx(it.ex).n,plan:{sets:it.sets,reps:it.reps,unit:it.unit},sets:[],done:false,note:''}})}return l}
const dayDone=d=>{const l=S.logs[d];return !!(l&&l.finished)};
function weekNo(){const n=Math.floor((pd(today())-pd(S.settings.start))/864e5/7)+1;return Math.min(8,Math.max(1,n))}
function weekStats(m){let days=0,sess=0,exs=0,push=0,sq=0,pl=0,reps=0;for(let i=0;i<7;i++){const l=S.logs[addD(m,i)];if(!l)continue;if(l.finished){days++;if(!l.rest)sess++}
 for(const it of Object.values(l.items||{})){if(!it.done&&!it.sets.some(x=>x!==''&&x!=null))continue;if(it.done)exs++;const t=it.sets.reduce((a,b)=>a+(+b||0),0);if(it.plan.unit==='rep'){reps+=t;if(/^flexao|circuito/.test(it.ex))push+=t;if(/^agacha/.test(it.ex))sq+=t}else if(it.plan.unit==='s'&&it.ex==='prancha')pl+=t}}
 return{days,sess,exs,push,sq,pl,reps}}
function allWeeks(){const ms=[...new Set(Object.keys(S.logs).map(monday))].sort();return ms.map(m=>({m,...weekStats(m)}))}
function nextWorkout(){for(let i=0;i<8;i++){const d=addD(today(),i),w=S.routine[dIdx(d)];if(!dayDone(d)&&w.items.length)return d}return null}
/* ===== UI base ===== */
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2600)}
function modal(html){$('#modal').innerHTML=`<div class="sheet">${html}</div>`;$('#modal').classList.add('on')}
const closeModal=()=>{$('#modal').classList.remove('on');$('#modal').innerHTML=''};
const confirmM=(msg,act,p,label='Confirmar',danger)=>modal(`<p>${msg}</p><div class="r2"><button class="btn gray" data-a="closeModal">Cancelar</button><button class="btn ${danger?'red':'red'}" data-a="${act}" data-p="${esc(p||'')}">${label}</button></div>`);
function go(name,p){V.stack.push({name,p});render()}
function tab(t){V.tab=t;V.stack=[];render()}
function render(keep){const top=V.stack[V.stack.length-1];let h,title='',back=!!top;
 if(top){const n=top.name;if(n==='day')h=vDay(top.p);else if(n==='ex')h=vEx(top.p);else if(n==='run')h=vRun();else if(n==='edit')h=vEdit(top.p);else if(n==='config')h=vConfig();else if(n==='cycle')h=vCycle(top.p);else if(n==='lib')h=vLib()}
 else h={home:vHome,routine:vRoutine,history:vHistory,ach:vAch}[V.tab]();
 $('#main').innerHTML=h;if(!keep)window.scrollTo(0,0);
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.p===V.tab));$('#nav').style.display=(top&&top.name==='run')?'none':'flex'}
const SPD={slow:['Lento',2.5],normal:['Normal',1.25],fast:['Rápido',0.625]};
const VSPD={slow:['Lento',0.5],normal:['Normal',1],fast:['Rápido',1.5]};
function videoBlock(e,compact){const sp=S.settings.vspeed||'normal',ph=S.settings.view==='photos';
 const body=ph?null:`<div class="anim vid"><video src="${e.video}" ${e.imgs?`poster="${e.imgs[e.imgs.length-1]}"`:''} autoplay loop muted playsinline preload="auto" onloadedmetadata="this.playbackRate=${VSPD[sp][1]}" aria-label="${esc(e.n)}"></video></div>`;
 return {body,ctl:`<div class="mctl">${ph?'':Object.keys(VSPD).map(k=>`<button class="chip2 ${k===sp?'sel':''}" data-a="vspeed" data-p="${k}">${VSPD[k][0]}</button>`).join('')}${e.imgs&&e.imgs.length?`<button class="chip2" data-a="viewMode">${ph?'▶ Ver vídeo':'🖼 Ver fotos'}</button>`:''}</div>`}}
function mediaBlock(id,compact){const e=getEx(id);
 if(e.video){const v=videoBlock(e,compact);if(v.body)return v.body+v.ctl;if(e.imgs&&e.imgs.length)return (compact?`<div class="pair n${e.imgs.length}">${e.imgs.map(x=>`<img src="${x}" alt="${esc(e.n)}">`).join('')}</div>`:img(id,'hero'))+v.ctl}
 if(!e.imgs||e.imgs.length<2)return null;
 const sp=S.settings.speed||'fast',ph=S.settings.view==='photos',n=e.imgs.length;
 const imgsHtml=e.imgs.map(x=>`<img src="${x}" alt="${esc(e.n)}">`).join('');
 let body;
 if(ph)body=compact?`<div class="pair n${n}">${imgsHtml}</div>`:img(id,'hero');
 else if(e.seq){const q=e.seq;body=`<div class="anim seq" style="--d:${SPD[sp][1]*2}s;--n:${q.length}">${q.map((k,s)=>`<img src="${e.imgs[k]}" style="--i:${s}" alt="${esc(e.n)} - etapa ${k+1}">`).join('')}</div>`}
 else body=`<div class="anim" style="--d:${SPD[sp][1]}s"><img src="${e.imgs[0]}" alt="${esc(e.n)} - início"><img class="b" src="${e.imgs[1]}" alt="${esc(e.n)} - final"></div>`;
 return body+`<div class="mctl">${ph?'':Object.keys(SPD).map(k=>`<button class="chip2 ${k===sp?'sel':''}" data-a="speed" data-p="${k}">${SPD[k][0]}</button>`).join('')}<button class="chip2" data-a="viewMode">${ph?'▶ Ver animação':'🖼 Ver '+n+' quadros'}</button></div>`}
/* ===== Níveis, migração da rotina e revisão de ciclo ===== */
const LEVELS={ini:{n:'Iniciante',d:'Nunca treinou ou está voltando. Menos séries e repetições, foco total na técnica.'},inter:{n:'Intermediário',d:'Já treinou antes. É o volume padrão do plano.'},adv:{n:'Avançado (Hard)',d:'Treina atualmente. Mais séries e repetições e variações mais difíceis.'}};
const lvl=()=>S.settings.level||'inter';
function scaleVal(b,unit,L){let s=b[0],r=b[1];
 if(L==='ini'){s=s>=4?s-1:(s===3?2:s);r=unit==='rep'?Math.max(4,Math.round(r*.7)):unit==='s'?Math.max(15,Math.round(r*.7/5)*5):Math.max(10,Math.round(r*.75))}
 else if(L==='adv'){s=s>=3?Math.min(5,s+1):s;r=unit==='rep'?Math.round(r*1.25):unit==='s'?Math.round(r*1.3/5)*5:Math.min(45,Math.round(r*1.5))}
 return [s,r]}
function ensureBase(){S.routine.forEach(w=>w.items.forEach(it=>{if(!it.b&&!it.custom)it.b=[it.sets,it.reps]}))}
function applyLevel(){ensureBase();S.routine.forEach(w=>w.items.forEach(it=>{if(it.custom||!it.b)return;const v=scaleVal(it.b,it.unit,lvl());it.sets=v[0];it.reps=v[1]}))}
function applyTemplate(){const f=defState().routine;[0,1,3,4].forEach(d=>{S.routine[d]=f[d]});S.settings.routineVer=2;delete S.settings.keptOld;applyLevel()}
function checkOnboarding(){if(!S||S.settings.level)return;
 modal(`<h3>Qual é o seu nível?</h3><p class="mut">Ele define quantas séries e repetições o plano sugere. Você pode mudar depois em Configurações.</p>${Object.keys(LEVELS).map(k=>`<button class="lvlbtn" data-a="pickLevel" data-p="${k}"><b>${LEVELS[k].n}</b><small>${LEVELS[k].d}</small></button>`).join('')}`)}
function offerTemplate(){modal(`<h3>Nova rotina disponível</h3><p>Com exercícios de casa (flexão declinada, remadas, rosca, ombros...). Ela <b>substitui segunda, terça, quinta e sexta</b>. Quarta, sábado e domingo ficam como estão, e o histórico não muda. Séries e repetições seguem o nível <b>${LEVELS[lvl()].n}</b>.</p><div class="r2"><button class="btn gray" data-a="keepOld">Manter a minha</button><button class="btn red" data-a="applyNew">Aplicar nova rotina</button></div>`)}
const CYC=14,ACT={sets:'+1 série nos 2 principais de cada dia',reps:'+2 repetições (ou +5 s) em todos',ease:'−2 repetições (ou −5 s) em todos',hold:'Manter igual',levelup:'Subir de nível',restart:'Novo ciclo de 8 semanas',skip:'Dispensado'};
function cycRange(n){const a=addD(S.settings.start,CYC*(n-1));return [a,addD(a,CYC-1)]}
function pendingCycle(){const t=today(),c=S.settings.cycles||{};for(let n=1;n<=4;n++){if(t>cycRange(n)[1]&&!c[n])return n}return 0}
function cycleStats(n){const a=cycRange(n)[0];let plan=0,done=0,notes=0;const rs=[];
 for(let i=0;i<CYC;i++){const d=addD(a,i);if(d>today())break;if(!S.routine[dIdx(d)].items.length)continue;plan++;const l=S.logs[d];
  if(l&&l.finished&&!l.rest){done++;for(const it of Object.values(l.items)){const p=it.plan.sets*it.plan.reps,v=it.sets.reduce((x,y)=>x+(+y||0),0);rs.push(p?Math.min(1.2,v/p):0);if(it.note)notes++}}}
 const ad=plan?done/plan:0,ra=rs.length?rs.reduce((x,y)=>x+y,0)/rs.length:0;
 return {plan,done,ad,ra,notes,status:ad>=.8&&ra>=.95?'progress':(ad>=.5&&ra>=.8?'hold':'back')}}
const TIPS={
 ini:{progress:['Você cumpriu o ciclo. Aumente só UMA coisa por vez: comece com +2 repetições por série.','Só depois de 2 ciclos bons pense em +1 série nos exercícios principais.','Se sobrar energia, inclua uma caminhada leve de 20 a 30 min em um dia livre (não conta como treino de força).','Termine as séries com 2 a 3 repetições sobrando e priorize a técnica.'],hold:['Mantenha o volume por mais um ciclo. Consistência vale mais que aumentar.','Procure completar todos os dias do ciclo antes de subir a carga.','Use as variações mais fáceis dos exercícios que estão pesados.'],back:['Repita o ciclo com menos repetições. Não é retrocesso, é adaptação.','Cumpra o essencial: 3 a 4 dias por semana já ajudam.','Registre nas observações o que dificultou (cansaço, tempo, dor).']},
 inter:{progress:['Ciclo cumprido. Escolha UMA progressão: +1 série nos 2 principais de cada dia, ou +2 repetições por série.','Troque 1 exercício por uma variação mais difícil (veja "Mais difícil" na tela do exercício).','Se a recuperação está boa, inclua 1 treino extra curto (20 a 30 min) em um dia livre, como o circuito de condicionamento.','Mantenha 1 a 2 repetições na reserva, sem ir à falha em tudo.'],hold:['Mantenha o volume por mais um ciclo antes de subir.','Foque em fechar os dias que ficaram pendentes.','Se um exercício está difícil, use a variação mais fácil e volte depois.'],back:['Repita o ciclo reduzindo um pouco as repetições.','Prefira cumprir os dias da semana a aumentar a carga.','Veja nas observações o que atrapalhou e ajuste a rotina.']},
 adv:{progress:['Ciclo cumprido. Combine duas progressões: +1 série nos principais e uma variação mais difícil (pés elevados, pausa de 2 a 3 s, mochila com peso).','Inclua 1 treino extra por semana (condicionamento ou circuito) se dormir e recuperar bem.','Use descida lenta de 3 segundos nos exercícios principais para aumentar o estímulo sem aumentar o volume.','No último ciclo do plano, considere uma semana mais leve antes de recomeçar.'],hold:['Mantenha o volume por mais um ciclo; o ganho agora vem de executar tudo.','Evite somar volume e intensidade ao mesmo tempo.','Revise o sono e a recuperação antes de progredir.'],back:['Reduza o volume neste ciclo: menos repetições, mais qualidade.','Uma semana mais leve pode destravar a evolução.','Registre dores e fadiga nas observações; interrompa diante de dor aguda.']}};
function bumpItem(it,kind,dir){const st=it.unit==='rep'?2:5,mn=it.unit==='rep'?4:(it.unit==='s'?15:10);
 const mod=a=>{if(kind==='sets')a[0]=Math.max(1,Math.min(5,a[0]+dir));else a[1]=Math.max(mn,a[1]+dir*st)};
 if(it.b&&!it.custom){mod(it.b);const v=scaleVal(it.b,it.unit,lvl());it.sets=v[0];it.reps=v[1]}else{const a=[it.sets,it.reps];mod(a);it.sets=a[0];it.reps=a[1]}}
function doCycle(n,act){
 if(act==='sets')S.routine.forEach(w=>w.items.slice(0,2).forEach(it=>bumpItem(it,'sets',1)));
 else if(act==='reps')S.routine.forEach(w=>w.items.forEach(it=>bumpItem(it,'reps',1)));
 else if(act==='ease')S.routine.forEach(w=>w.items.forEach(it=>bumpItem(it,'reps',-1)));
 else if(act==='levelup'){const o=['ini','inter','adv'],k=o[Math.min(2,o.indexOf(lvl())+1)];S.settings.level=k;applyLevel()}
 else if(act==='restart'){S.settings.start=monday(today());S.settings.cycles={};return}
 S.settings.cycles=S.settings.cycles||{};S.settings.cycles[n]={act,date:today(),status:cycleStats(n).status}}
function vCycle(n){const[a,b]=cycRange(n),st=cycleStats(n),L=lvl(),tips=TIPS[L][st.status],pc=x=>Math.round(x*100);
 const ban={progress:['ok','Você pode progredir'],hold:['mid','Mantenha o volume neste ciclo'],back:['bad','Repita o ciclo com menos carga']}[st.status];
 const btn=(act,txt,cls='gray')=>`<button class="btn ${cls}" data-a="cycAsk" data-p="${n},${act}">${txt}</button>`;
 let btns='';
 if(st.status==='progress'){btns=btn('sets','+1 série nos 2 principais de cada dia','red')+btn('reps','+2 repetições (ou +5 s) em todos')+(L!=='adv'?btn('levelup','Subir de nível: '+LEVELS[L==='ini'?'inter':'adv'].n):'')+btn('hold','Manter igual')}
 else btns=btn('hold','Manter igual (recomendado)','red')+btn('ease','Aliviar: −2 repetições (ou −5 s) em todos');
 if(n===4)btns+=btn('restart','Começar novo ciclo de 8 semanas');
 return `<header class="bar"><button class="back" data-a="back">‹</button><div class="ctr"><h1>Revisão do ciclo ${n}</h1><small class="mut">${fmt(a)} a ${fmt(b)} · Nível ${LEVELS[L].n}</small></div><span style="width:44px"></span></header>
 <section class="cstat ${ban[0]}"><b>${ban[1]}</b></section>
 <section class="card"><div class="row2"><span>Dias de treino feitos</span><b>${st.done} de ${st.plan} (${pc(st.ad)}%)</b></div><div class="row2"><span>Volume feito vs. planejado</span><b>${pc(st.ra)}%</b></div><div class="row2"><span>Observações registradas</span><b>${st.notes}</b></div><p class="mut"><small>Cálculo com seus registros reais. O app só sugere: nada muda sem a sua confirmação.</small></p></section>
 <section class="card"><h3>Dicas para o próximo ciclo</h3><ul>${tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>
 <h2>O que você quer fazer?</h2>${btns}<button class="btn gray" data-a="cycAsk" data-p="${n},skip">Decidir depois / dispensar</button>`}
/* ===== Biblioteca de exercícios ===== */
const GRP={peito:'Peito',costas:'Costas',ombros:'Ombros',biceps:'Bíceps',triceps:'Tríceps',pernas:'Pernas',gluteos:'Glúteos',core:'Core',cardio:'Cardio',mobilidade:'Mobilidade'};
const MAT={nenhum:'Sem equipamento',garrafas:'Garrafas',mochila:'Mochila',cadeira:'Cadeira',mesa:'Mesa',toalha:'Toalha'};
const NV={i:'Iniciante',m:'Intermediário',a:'Avançado'};
const allExIds=()=>[...Object.keys(EX),...Object.keys(S.custom||{})];
const libF=()=>(V.cur&&V.cur.lib)||{};
function libList(){const f=libF(),q=(f.q||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const ids=allExIds().filter(id=>{const e=getEx(id),nm=e.n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return (!f.g||e.g===f.g)&&(!f.m||(e.mat||['nenhum']).includes(f.m))&&(!f.n||e.nv===f.n)&&(!q||nm.includes(q))});
 return `<p class="mut pad">${ids.length} exercício${ids.length===1?'':'s'}</p>`+(ids.length?ids.map(id=>{const e=getEx(id);return `<button class="lrow" data-a="openEx" data-p="${id}">${img(id,'lthumb thumb')}<div><b>${esc(e.n)}</b><br><small class="mut">${GRP[e.g]||'Outros'} · ${(e.mat||['nenhum']).map(m=>MAT[m]).join(' + ')}</small><br><span class="nvb nv${e.nv||'i'}">${NV[e.nv||'i']}</span>${e.imgs?'':' <span class="nvb sf">sem foto</span>'}</div></button>`}).join(''):'<div class="card mut">Nenhum exercício com esses filtros.</div>')}
function vLib(){const f=libF(),chips=(o,key,cur)=>Object.keys(o).map(k=>`<button class="chip2 ${cur===k?'sel':''}" data-a="libSet" data-p="${key},${k}">${o[k]}</button>`).join('');
 return `<header class="bar"><button class="back" data-a="back">‹</button><h1>Biblioteca</h1><span style="width:44px"></span></header>
 <input id="libq" data-q type="search" placeholder="Buscar exercício..." value="${esc(f.q||'')}" autocomplete="off">
 <div class="fchips">${chips(GRP,'g',f.g)}</div><div class="fchips">${chips(MAT,'m',f.m)}</div><div class="fchips">${chips(NV,'n',f.n)}</div>
 <p class="pad"><small class="mut">Toque de novo no filtro para desligar. Escolha um exercício para ver as instruções e adicionar à rotina.</small></p>
 <div id="libList">${libList()}</div>`}
function addForm(id){const e=getEx(id),u=e.u||'rep',def=u==='rep'?[3,10]:u==='s'?[3,30]:[1,20];
 const warn=e.nv==='a'&&lvl()!=='adv'?`<p class="warnl">Este é um exercício <b>avançado</b>. Seu nível atual é ${LEVELS[lvl()].n}. Inclua só quando dominar as variações mais fáceis.</p>`:'';
 modal(`<h3>Adicionar à rotina</h3><p><b>${esc(e.n)}</b></p>${warn}<label>Dia da semana</label><select id="a_day">${DN.map((n,i)=>`<option value="${i}">${n} (${S.routine[i].items.length} exercícios)</option>`).join('')}</select>
 <div class="r3"><div><label>Séries</label><input id="a_sets" type="number" min="1" value="${def[0]}"></div><div><label>Repetições / tempo</label><input id="a_reps" type="number" min="1" value="${def[1]}"></div><div><label>Unidade</label><select id="a_unit">${[['rep','reps'],['s','seg'],['min','min']].map(([v,n])=>`<option value="${v}" ${u===v?'selected':''}>${n}</option>`).join('')}</select></div></div>
 <p class="mut"><small>Dica: de 5 a 8 exercícios por sessão, priorizando os que trabalham vários músculos.</small></p>
 <div class="r2"><button class="btn gray" data-a="closeModal">Cancelar</button><button class="btn red" data-a="libSave" data-p="${id}">Adicionar</button></div>`)}
/* ===== Cronômetro (preparo, ritmo com pausas, descanso, registro antes de avançar) ===== */
const TMD={prep:5,rest:45,next:10,sound:true,vibe:true};
const tmc=()=>({...TMD,...((S&&S.settings.tm)||{})});
let TM=null,TMI=null,AC=null,WL=null;
const tmFmt=n=>n>=60?`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`:String(n);
function beep(f,d){if(!TM||!tmc().sound)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f||880;g.gain.value=.18;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+(d||.12))}catch(e){}}
function vib(p){if(tmc().vibe&&navigator.vibrate){try{navigator.vibrate(p)}catch(e){}}}
async function wake(){try{if(navigator.wakeLock&&!WL)WL=await navigator.wakeLock.request('screen')}catch(e){}}
function unwake(){try{WL&&WL.release()}catch(e){}WL=null}
const restFor=id=>{const g=getEx(id).g,c=tmc();return g==='mobilidade'?Math.min(10,c.rest):(g==='cardio'||g==='core')?Math.min(30,c.rest):c.rest};
function tmCtx(){const l=logOf(run.date,true),its=S.routine[l.day].items,it=its[run.i],li=l.items[it.id];return {l,its,it,li,k:curSet(li),n:li.plan.sets,u:li.plan.unit,id:it.ex}}
const isReg=(li,k)=>li.sets[k]!==''&&li.sets[k]!=null;
function tmSet(ph,secs,label){TM.ph=ph;TM.label=label;TM.total=secs;TM.end=Date.now()+secs*1000;TM.paused=false;TM.last=-1;beep(ph==='work'?1200:700,ph==='work'?.3:.15);vib(ph==='work'?120:60);tmDraw()}
function tmStart(){const c=tmc();TM={ph:'prep',ri:0,rep:1};try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume&&AC.resume()}catch(e){}wake();clearInterval(TMI);TMI=setInterval(tmTick,200);tmSet('prep',c.prep,'Prepare-se')}
function tmStop(){if(TMI)clearInterval(TMI);TMI=null;TM=null;unwake();tmDraw()}
function tmTick(){if(!TM||TM.paused||TM.ph==='wait'||TM.ph==='done')return;
 const left=Math.max(0,Math.ceil((TM.end-Date.now())/1000));
 if(left<=3&&left>0&&left!==TM.last){TM.last=left;beep(660,.08)}
 const n=document.getElementById('tmnum');if(n)n.textContent=tmFmt(left);
 const b=document.getElementById('tmbar');if(b)b.style.width=(TM.total?100-left/TM.total*100:0)+'%';
 if(Date.now()>=TM.end)tmNext()}
function tmNext(){if(!TM)return;let x;try{x=tmCtx()}catch(e){return tmStop()}const {li,u,id}=x;
 if(TM.ph==='prep'){
  if(u==='s')tmSet('work',li.plan.reps,'Segure / execute');
  else if(u==='min')tmSet('work',li.plan.reps*60,'Em movimento');
  else{TM.ri=0;TM.rep=1;const r=RTof(id)[0];tmSet('work',r[1],r[0])}
 }else if(TM.ph==='work'){
  if(u==='rep'){const R=RTof(id);let ni=TM.ri+1;if(ni>=R.length){ni=0;TM.rep++;if(TM.rep>li.plan.reps){beep(1000,.35);vib(150);return tmAfterWork()}}TM.ri=ni;tmSet('work',R[ni][1],R[ni][0])}else tmEndWork(true)
 }else if(TM.ph==='rest')tmAfterRest();
 else if(TM.ph==='next')tmAdvance()}
function tmEndWork(full){const x=tmCtx(),{li,k,u}=x;
 if(u!=='rep'){const left=Math.max(0,(TM.end-Date.now())/1000),el=full?TM.total:Math.max(1,Math.round(TM.total-left));li.sets[k]=u==='min'?Math.max(1,Math.round(el/60)):el;save()}
 tmAfterWork()}
function tmAfterWork(){const x=tmCtx(),{li,k,n}=x;
 if(k>=n-1){if(isReg(li,k))tmExerciseDone();else{TM.ph='wait';TM.label='Registre a série para continuar';beep(700,.2);tmDraw()}}
 else tmSet('rest',restFor(x.id),'Descanso');
 render(true)}
function tmAfterRest(){const x=tmCtx(),{li,k}=x;
 if(!isReg(li,k)){TM.ph='wait';TM.label='Registre a série anterior para continuar';beep(700,.2);tmDraw();return}
 run.set=k+1;tmSet('prep',Math.min(3,tmc().prep),'Próxima série');render(true)}
function tmRegistered(){if(!TM||TM.ph!=='wait')return;const x=tmCtx(),{li,k,n}=x;if(!isReg(li,k))return;
 if(k>=n-1)tmExerciseDone();else{run.set=k+1;tmSet('prep',Math.min(3,tmc().prep),'Próxima série');render(true)}}
function tmExerciseDone(){const x=tmCtx();x.li.done=true;save();
 if(run.i>=x.its.length-1){TM.ph='done';TM.label='Último exercício concluído';beep(1000,.4);vib([200,80,200]);unwake();tmDraw()}
 else tmSet('next',tmc().next,'Próximo exercício');
 render(true)}
function tmAdvance(){run.i++;run.set=null;render();tmSet('prep',tmc().prep,'Prepare-se')}
function tmPause(){if(!TM||TM.ph==='wait'||TM.ph==='done')return;if(TM.paused){TM.end=Date.now()+TM.left*1000;TM.paused=false}else{TM.left=Math.max(0,(TM.end-Date.now())/1000);TM.paused=true}tmDraw()}
function tmSkip(){if(!TM)return;const x=tmCtx();
 if(TM.ph==='work'){if(x.u==='rep')tmAfterWork();else tmEndWork(false)}else if(TM.ph==='wait'||TM.ph==='done')return;else tmNext()}
function tmDraw(){const el=document.getElementById('tm');if(el)el.innerHTML=tmInner()}
function tmInner(){const x=tmCtx(),c=tmc();
 if(!TM)return `<button class="btn red big" data-a="tmStart">⏱ Iniciar cronômetro (série ${x.k+1})</button><p class="mut ctr"><small>Preparo ${c.prep} s · descanso ${restFor(x.id)} s · você confirma as repetições de cada série.</small></p>`;
 const left=TM.paused?Math.ceil(TM.left):Math.max(0,Math.ceil((TM.end-Date.now())/1000)),cls={prep:'prep',work:'work',rest:'rest',next:'rest',wait:'wait',done:'done'}[TM.ph],fin=(TM.ph==='wait'||TM.ph==='done');
 const skipTxt={prep:'Pular preparo',work:x.u==='rep'?'Terminar série':'Parei',rest:'Pular descanso',next:'Ir agora'}[TM.ph];
 const rh=(TM.ph==='work'&&x.u==='rep'?`<div class="tmrep">Repetição ${Math.min(TM.rep,x.li.plan.reps)} de ${x.li.plan.reps}</div><div class="mut ctr"><small>${RTof(x.id).map(r=>r[0]+' '+r[1]+'s').join(' · ')}</small></div>`:'')+((TM.ph==='rest'||TM.ph==='next')&&x.u==='rep'&&!isReg(x.li,x.k)?`<div class="tmhint">👇 Registre quantas repetições você fez nesta série</div>`:'');
 return `<div class="tmh ${cls}"><div class="tml" id="tmlab">${esc(TM.label)}${TM.paused?' · pausado':''}</div><div class="tmn" id="tmnum">${fin?'✓':tmFmt(left)}</div><div class="tmbar"><i id="tmbar" style="width:${TM.total&&!fin?100-left/TM.total*100:100}%"></i></div><div class="mut ctr"><small>Série ${x.k+1} de ${x.n}</small></div>${rh}</div>
 <div class="tmb">${TM.ph==='work'&&x.u==='rep'?`<button class="btn red" data-a="cnt" data-p="1">+1 repetição</button>`:''}${skipTxt?`<button class="btn gray" data-a="tmSkip">${skipTxt}</button>`:''}${fin?'':`<button class="btn gray" data-a="tmPause">${TM.paused?'▶ Retomar':'⏸ Pausar'}</button>`}<button class="btn gray" data-a="tmStop">■ ${fin?'Fechar':'Parar'}</button></div>`}
/* ===== Telas ===== */
const IC={gear:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',cal:'<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>'};
const LOGO='<svg viewBox="62 62 388 388" width="64" height="64" aria-hidden="true"><g transform="rotate(-35 256 256)"><rect x="136" y="243" width="240" height="26" rx="13" fill="#ffffff"/><rect x="98" y="165" width="43" height="182" rx="17" fill="#ffffff"/><rect x="371" y="165" width="43" height="182" rx="17" fill="#ffffff"/><rect x="61" y="197" width="37" height="118" rx="14" fill="#d9d9d9"/><rect x="414" y="197" width="37" height="118" rx="14" fill="#d9d9d9"/></g></svg>';
function streak(){let n=0,d=today();if(!dayDone(d))d=addD(d,-1);while(dayDone(d)){n++;d=addD(d,-1)}return n}
function vHome(){const w=weekNo(),m=monday(today()),st=weekStats(m),pct=Math.round(st.days/7*100),nx=nextWorkout(),sk=streak();
 const R=54,C=2*Math.PI*R;
 return `<header class="hero-top"><button class="gear" data-a="openConfig" aria-label="Configurações">${IC.gear}</button><div class="star">${LOGO}</div><h1 class="title">TREINO LIVRE</h1><p>Disciplina • Constância • Resultados</p></header>
 <section class="card"><h3>Seu progresso semanal</h3><div class="prog"><svg viewBox="0 0 130 130" width="130" height="130"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2ecc71"/><stop offset="1" stop-color="#00a86b"/></linearGradient></defs><circle cx="65" cy="65" r="${R}" fill="none" stroke="#2b2b31" stroke-width="13"/><circle cx="65" cy="65" r="${R}" fill="none" stroke="url(#gg)" stroke-width="13" stroke-linecap="round" stroke-dasharray="${C*pct/100} ${C}" transform="rotate(-90 65 65)"/><text x="65" y="74" text-anchor="middle" fill="#fff" font-size="30" font-weight="800">${pct}%</text></svg><div><b class="big">${st.days} / 7</b><br><span class="mut">dias concluídos</span><div class="fire">🔥 <b>${sk}</b> <span class="mut">${sk===1?'dia seguido':'dias seguidos'}</span></div></div></div></section>
 <section class="plan"><span class="mus">💪</span><div><b>Plano: 8 Semanas</b><br><b>Nível: ${LEVELS[lvl()].n}</b><br><small>Você está na semana ${w}</small></div></section>
 ${pendingCycle()?`<section class="cyc"><b>🔁 Ciclo ${pendingCycle()} concluído</b><br><small>Veja seu resultado e as dicas para o próximo ciclo.</small><button class="btn red sm" data-a="openCycle" data-p="${pendingCycle()}">Ver revisão</button></section>`:''}
 <h2>Próximo treino</h2>
 ${nx?`<button class="next" data-a="openDay" data-p="${nx}"><span class="calic">${IC.cal}</span><div><b>${DN[dIdx(nx)]}${nx===today()?' (hoje)':''}</b><br>${esc(S.routine[dIdx(nx)].name)}</div><span class="chev">›</span></button><button class="btn red big go" data-a="startRun" data-p="${nx}">▶ Iniciar Treino</button>`:`<section class="card mut">Nenhum treino pendente nos próximos dias.</section>`}
 <div class="quote">“Corpo forte, mente firme.”</div>
 <section class="card"><b>Foco da semana ${w}</b><p class="mut">${WEEKS[w-1]}</p></section>`}
function vRoutine(){const w=V.cur&&V.cur.week||weekNo(),start=addD(S.settings.start,(w-1)*7);
 return `<header class="bar"><h1>Rotina Semanal</h1><select data-c="week">${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${n===w?'selected':''}>Semana ${n}</option>`).join('')}</select></header>
 <p class="mut pad">${WEEKS[w-1]}</p>
 <button class="btn gray" data-a="openLib">📚 Biblioteca de exercícios (${allExIds().length})</button>
 <div class="days">${DN.map((n,i)=>{const d=addD(start,i),done=dayDone(d);return `<button class="drow ${d===today()?'today':''}" data-a="openDay" data-p="${d}"><img class="dl" src="img/ui/day${i}-l.jpg" alt=""><div class="dt"><b>${n.split('-')[0]}</b><span>${esc(S.routine[i].name)}</span><small>${fmt(d)}${d===today()?' · hoje':''}</small></div><img class="dr" src="img/ui/day${i}-r.jpg" alt=""><span class="chev ${done?'okc':''}">${done?'✓':'›'}</span></button>`}).join('')}</div>`}
function vDay(date){const i=dIdx(date),w=S.routine[i],l=S.logs[date],fin=l&&l.finished;
 return `<header class="bar"><button class="back" data-a="back">‹</button><div class="ctr"><h1>Treino de ${DN[i].split('-')[0]}</h1><small class="mut">${esc(w.name)} · ${fmt(date)}</small></div><span style="width:44px"></span></header>
 <p class="mut pad ctr">${esc(w.focus)}</p>
 ${w.items.length?`<div class="grid">${w.items.map((it,k)=>{const li=l&&l.items[it.id],ex=getEx(it.ex);return `<button class="gcard" data-a="openEx" data-p="${it.ex}">${img(it.ex,'gimg thumb')}<span class="gt">${esc(ex.n)}</span><span class="gp">${planTxt(it)}</span>${li&&li.done?'<span class="chk ok gk">✓</span>':''}</button>`}).join('')}</div>`:`<div class="card mut">${i===6?'Dia de descanso: não há exercícios obrigatórios.':'Nenhum exercício cadastrado.'}</div>`}
 <div class="guide"><b>Antes de começar:</b> faça aquecimento, priorize a técnica, respeite o descanso e pare diante de dor aguda ou mal-estar. Não compense treinos perdidos com excesso.</div>
 ${w.items.length?`<button class="btn red big go" data-a="startRun" data-p="${date}">${fin?'Rever / reabrir treino':'▶ Iniciar Treino'}</button>`:`<button class="btn ${fin?'gray':'red'} big" data-a="toggleRest" data-p="${date}">${fin?'Desfazer descanso':'Registrar dia como descanso'}</button>`}
 <button class="btn gray big" data-a="openEdit" data-p="${i}">✎ Editar rotina deste dia da semana</button>`}
function vEx(id){const e=getEx(id);
 return `<header class="bar"><button class="back" data-a="back">‹</button><h1>${esc(e.n)}</h1></header>${mediaBlock(id)||img(id,'hero')}<div class="tagrow">${e.g?`<span class="nvb">${GRP[e.g]}</span>`:''}${(e.mat||[]).map(m=>`<span class="nvb">${MAT[m]}</span>`).join('')}${e.nv?`<span class="nvb nv${e.nv}">${NV[e.nv]}</span>`:''}</div>${e.note?`<p class="pad"><small>⚠ ${esc(e.note)}</small></p>`:''}
 ${e.warn?`<section class="card warnc"><b>⚠ Segurança:</b> ${esc(e.warn)}</section>`:''}${e.lv?`<section class="card"><div class="row2"><span>Mais fácil</span><b>${esc(e.lv[0])}</b></div><div class="row2"><span>Mais difícil</span><b>${esc(e.lv[1])}</b></div></section>`:''}
 <section class="card"><h3>Posição inicial</h3><p>${esc(e.start||'—')}</p></section>
 <section class="card"><h3>Passo a passo</h3><ol>${(e.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')||'<li class="mut">Sem instruções cadastradas.</li>'}</ol></section>
 <section class="card"><h3>Respiração</h3><p>${esc(e.breath||'—')}</p></section>
 <section class="card err"><h3>Erros comuns</h3><ul>${(e.err||[]).map(s=>`<li>${esc(s)}</li>`).join('')||'<li class="mut">—</li>'}</ul></section>
 <section class="card"><h3>Músculos trabalhados</h3><p>${(e.m||[]).map(esc).join(', ')||'—'}</p></section>
 <section class="card"><h3>Séries e repetições / tempo</h3>${(()=>{const rows=[];S.routine.forEach((w,i)=>w.items.filter(x=>x.ex===id).forEach(x=>rows.push(`<div class="row2"><span>${DN[i]}</span><b>${planTxt(x)}</b></div>`)));return rows.join('')||'<p class="mut">Não está em nenhum dia da rotina.</p>'})()}<small class="mut">Altere em Rotina › dia › Editar.</small></section>
 ${e.vcredit?`<p class="mut pad"><small>${esc(e.vcredit.text)} <a href="${esc(e.vcredit.url)}" target="_blank" rel="noopener">Ver original</a></small></p>`:''}
 <button class="btn red big" data-a="libAdd" data-p="${id}">+ Adicionar à rotina</button>
 ${e.imgs?`<p class="mut pad"><small>${/flexao-pike/.test(e.imgs[0])?'Ilustração: Bryl Lim (Workout Guide), a partir de arte da Everkinetic, licença CC BY-SA 4.0.':'Fotos: Free Exercise DB (domínio público).'}</small></p>`:e.pose?'<p class="mut pad"><small>Sem foto disponível: desenho esquemático. Você pode substituir por foto própria.</small></p>':''}`}
/* ===== execução ===== */
function curSet(li){const n=li.plan.sets;if(run.set==null||run.set>=n||run.set<0){const k=li.sets.slice(0,n).findIndex(x=>x===''||x==null);run.set=k<0?(li.sets.filter(x=>x!==''&&x!=null).length>=n?n-1:0):k}return run.set}
const stepOf=li=>li.plan.unit==='s'?5:1;
function pair(id){const m=mediaBlock(id,true);if(m)return m;const e=getEx(id);if(e.imgs)return `<div class="pair n${e.imgs.length}">${e.imgs.map(x=>`<img src="${x}" alt="${esc(e.n)}">`).join('')}</div>`;return img(id,'hero')}
function vRun(){const l=logOf(run.date,true),w=S.routine[l.day],its=w.items;if(!its.length)return '<p>Sem exercícios.</p>';
 run.i=Math.max(0,Math.min(its.length-1,run.i));const it=its[run.i],li=l.items[it.id],e=getEx(it.ex),u=li.plan.unit,n=li.plan.sets,k=curSet(li),v=li.sets[k]===''||li.sets[k]==null?'':li.sets[k],nx=its[run.i+1];
 const ul=u==='rep'?'':' '+UL[u];
 return `<header class="bar"><button class="back" data-a="exitRun">‹</button><div class="ctr"><h1>Treino de ${DN[l.day].split('-')[0]}</h1><small class="mut">${esc(w.name)} · exercício ${run.i+1}/${its.length}${l.finished?' · finalizado':''}</small></div><span style="width:44px"></span></header>
 <div class="ctr"><span class="redpill">${n} séries • ${li.plan.reps}${u==='rep'?' repetições':ul}</span></div>
 <section class="card exc"><div class="exh"><b>${run.i+1}. ${esc(e.n)}</b><button class="info" data-a="openEx" data-p="${it.ex}" aria-label="Instruções">i</button></div>${pair(it.ex)}${e.note?`<p class="mut"><small>⚠ ${esc(e.note)}</small></p>`:''}${e.warn?`<p class="warnl">⚠ ${esc(e.warn)}</p>`:''}
  <div class="how"><div><h4>Como fazer:</h4>${(e.steps||[]).slice(0,3).map(s=>`<p class="okl">${esc(s)}</p>`).join('')||'<p class="mut">—</p>'}</div><div><h4 class="redt">Erros comuns:</h4>${(e.err||[]).slice(0,3).map(s=>`<p class="xl">${esc(s)}</p>`).join('')||'<p class="mut">—</p>'}</div></div></section>
 <section class="card tmcard" id="tm">${tmInner()}</section>
 <div class="ctr mut">Série ${k+1} de ${n}</div>
 <div class="counter"><button class="cbtn" data-a="cnt" data-p="-1" aria-label="Diminuir">−</button><div class="cval"><input type="number" inputmode="numeric" min="0" data-cur value="${v}" placeholder="0"><span>/ ${li.plan.reps}${ul}</span></div><button class="cbtn" data-a="cnt" data-p="1" aria-label="Aumentar">+</button></div>
 <div class="chips">${Array.from({length:n},(_,j)=>{const x=li.sets[j],f=x!==''&&x!=null;return `<button class="chip ${j===k?'sel':''} ${f?'fill':''}" data-a="selSet" data-p="${j}">S${j+1}<b>${f?x:'–'}</b></button>`}).join('')}</div>
 <div class="r2"><button class="btn gray" data-a="fillSet" data-p="${k}">= meta</button><button class="btn red" data-a="regSet">Registrar série ›</button></div>
 <details class="card"><summary>📝 Observações${li.note?' (preenchida)':''}</summary><textarea data-note rows="2" placeholder="Dificuldades, dor, adaptações...">${esc(li.note)}</textarea></details>
 <button class="btn ${li.done?'green':'dark'} big" data-a="toggleDone">${li.done?'✓ Concluído (toque para desfazer)':'✓ Marcar como Concluído'}</button>
 ${nx?`<button class="btn dark" data-a="runNext">Próximo: ${esc(getEx(nx.ex).n)} ⌄</button>`:''}
 ${run.i>0?`<button class="btn gray" data-a="runPrev">‹ Anterior: ${esc(getEx(its[run.i-1].ex).n)}</button>`:''}
 ${l.finished?`<button class="btn gray" data-a="reopen">Reabrir treino para corrigir</button>`:`<button class="btn red big" data-a="finishRun">Finalizar treino</button>`}`}
/* ===== Histórico ===== */
function chart(ws,key,color,lbl){const pts=ws.filter(w=>w[key]>0);if(!pts.length)return `<p class="mut">${lbl}: sem registros ainda.</p>`;
 const W=320,H=120,max=Math.max(...pts.map(w=>w[key]))*1.15,x=i=>pts.length===1?W/2:20+i*(W-40)/(pts.length-1),y=v=>H-18-v/max*(H-34);
 return `<div class="ch"><b style="color:${color}">${lbl}</b><svg viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="${color}" stroke-width="2.5" points="${pts.map((w,i)=>x(i)+','+y(w[key])).join(' ')}"/>${pts.map((w,i)=>`<circle cx="${x(i)}" cy="${y(w[key])}" r="4" fill="${color}"/><text x="${x(i)}" y="${y(w[key])-8}" text-anchor="middle" fill="#fff" font-size="10">${w[key]}</text><text x="${x(i)}" y="${H-4}" text-anchor="middle" fill="#888" font-size="9">${fmt(w.m)}</text>`).join('')}</svg></div>`}
function bests(){let push=0,sq=0,pl=0;for(const l of Object.values(S.logs))for(const it of Object.values(l.items||{})){const m=Math.max(0,...it.sets.map(x=>+x||0));if(it.plan.unit==='rep'&&/^flexao|circuito/.test(it.ex))push=Math.max(push,m);if(it.plan.unit==='rep'&&/^agacha/.test(it.ex))sq=Math.max(sq,m);if(it.plan.unit==='s'&&it.ex==='prancha')pl=Math.max(pl,m)}return{push,sq,pl}}
const mmss=s=>s>=60?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:`0:${String(s).padStart(2,'0')}`;
function vHistory(){const ws=allWeeks(),b=bests(),all=V.cur&&V.cur.all;
 const ds=Object.keys(S.logs).filter(d=>S.logs[d].finished||Object.keys(S.logs[d].items).some(k=>S.logs[d].items[k].sets.length)).sort().reverse();
 const tot=ws.reduce((a,w)=>({sess:a.sess+w.sess,days:a.days+w.days,exs:a.exs+w.exs,reps:a.reps+w.reps}),{sess:0,days:0,exs:0,reps:0});
 return `<header class="bar"><h1>Sua Evolução</h1></header>
 ${ws.length?`<section class="card">${chart(ws,'push','#e11d2e','Desempenho nas flexões (repetições/semana)')}${chart(ws,'sq','#3b82f6','Agachamentos (repetições/semana)')}${chart(ws,'pl','#f1c40f','Prancha (segundos/semana)')}</section>`:'<div class="card mut">Ainda não há treinos registrados. Registre um treino para ver sua evolução.</div>'}
 <h2>Resumo atual (melhor série)</h2><div class="tiles"><div class="tile"><span>💪</span><b>${b.push}</b><small>Flexões seguidas</small></div><div class="tile"><span>⏱</span><b>${mmss(b.pl)}</b><small>Prancha</small></div><div class="tile"><span>🦵</span><b>${b.sq}</b><small>Agachamentos</small></div></div>
 ${ws.length>1?(()=>{const a=ws[ws.length-2],c=ws[ws.length-1],d=k=>{const v=c[k]-a[k];return (v>0?'+':'')+v};return `<section class="card"><h3>Comparação: ${fmt(a.m)} → ${fmt(c.m)}</h3><div class="row2"><span>Dias concluídos</span><b>${a.days} → ${c.days} (${d('days')})</b></div><div class="row2"><span>Flexões</span><b>${a.push} → ${c.push} (${d('push')})</b></div><div class="row2"><span>Agachamentos</span><b>${a.sq} → ${c.sq} (${d('sq')})</b></div><div class="row2"><span>Prancha (s)</span><b>${a.pl} → ${c.pl} (${d('pl')})</b></div></section>`})():''}
 <section class="card"><h3>Totais</h3><div class="row2"><span>Treinos concluídos</span><b>${tot.sess}</b></div><div class="row2"><span>Dias de atividade</span><b>${tot.days}</b></div><div class="row2"><span>Exercícios concluídos</span><b>${tot.exs}</b></div><div class="row2"><span>Repetições acumuladas</span><b>${tot.reps}</b></div></section>
 ${Object.keys(S.settings.cycles||{}).length?`<section class="card"><h3>Revisões de ciclo</h3>${Object.entries(S.settings.cycles).map(([n,c])=>`<div class="row2"><span>Ciclo ${n} · ${fmt(c.date)}</span><b>${ACT[c.act]||c.act}</b></div>`).join('')}</section>`:''}
 <div class="row hh"><h2>Seu histórico</h2>${ds.length>4?`<button class="lnk" data-a="allHist">${all?'Ver menos':'Ver tudo'} →</button>`:''}</div>
 ${ds.length?(all?ds:ds.slice(0,4)).map(d=>{const l=S.logs[d];return `<details class="card hd"><summary><span class="chk ${l.finished?'ok':''}">${l.finished?'✓':''}</span><span class="hdt"><b>${pd(d).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}</b><small class="mut">${esc(S.routine[l.day].name)}</small></span><span class="${l.finished?'ok':'mut'} sm">${l.finished?'Treino concluído ✓':'Em andamento'}</span></summary>${l.rest?'<p>Registrado como descanso.</p>':Object.values(l.items).map(it=>`<div class="hrow"><b>${esc(it.name)}</b> ${it.done?'<span class="ok">✓</span>':''}<br><small class="mut">Plano ${planTxt(it.plan)}</small><br>Feito: ${it.sets.filter(x=>x!==''&&x!=null).map((x,k)=>`S${k+1}: ${x}`).join(' · ')||'<span class="mut">sem registro</span>'}${it.note?`<br><small>📝 ${esc(it.note)}</small>`:''}</div>`).join('')}</details>`}).join(''):'<div class="card mut">Nenhum registro.</div>'}`}
function achData(){const ws=allWeeks(),sess=ws.reduce((a,w)=>a+w.sess,0),push=ws.reduce((a,w)=>a+w.push,0),reps=ws.reduce((a,w)=>a+w.reps,0),days=Object.keys(S.logs).filter(dayDone).sort();
 let best=0,run=0,prev=null;for(const d of days){run=prev&&addD(prev,1)===d?run+1:1;best=Math.max(best,run);prev=d}
 const full=Math.max(0,...ws.map(w=>w.days)),b=bests();
 return [['🥇','Primeiro treino','Conclua seu primeiro treino',sess,1],['🔥','Sequência de 3 dias','Conclua 3 dias seguidos',best,3],['📅','Semana completa','Conclua os 7 dias de uma semana',full,7],['🏃','10 treinos','Conclua 10 treinos',sess,10],['💪','100 flexões','Acumule 100 flexões',push,100],['💪','500 flexões','Acumule 500 flexões',push,500],['🎯','Série de 30 flexões','Faça 30 flexões em uma série',b.push,30],['⏱','Prancha de 1 minuto','Segure a prancha por 60 s',b.pl,60],['🏆','25 treinos','Conclua 25 treinos',sess,25],['⭐','1.000 repetições','Acumule 1.000 repetições',reps,1000]]}
function vAch(){const a=achData(),got=a.filter(x=>x[3]>=x[4]).length;
 return `<header class="bar"><h1>Conquistas</h1></header><p class="mut pad">${got} de ${a.length} desbloqueadas. Calculadas com seus registros reais.</p>
 ${a.map(([e,t,d,c,g])=>{const ok=c>=g;return `<div class="card ach ${ok?'got':''}"><span class="ae">${e}</span><div><b>${t}</b><br><small class="mut">${d}</small><div class="pb"><i style="width:${Math.min(100,Math.round(c/g*100))}%"></i></div><small>${Math.min(c,g)} / ${g}</small></div><span class="chk ${ok?'ok':''}">${ok?'✓':''}</span></div>`}).join('')}`}
/* ===== Config ===== */
function vConfig(){return `<header class="bar"><button class="back" data-a="back">‹</button><h1>Configurações</h1><span style="width:44px"></span></header>
 <section class="cfgc"><span class="cic b">⬇</span><div><b>Backup dos Dados</b><br><small class="mut">Exportar seu progresso</small></div><button class="btn sm blue" data-a="export">Exportar</button></section>
 <section class="cfgc"><span class="cic g">⬆</span><div><b>Restaurar Dados</b><br><small class="mut">Importar backup</small></div><button class="btn sm greenb" data-a="importPick">Importar</button></section>
 <input type="file" id="imp" accept="application/json,.json" hidden>
 <section class="card"><h3>Nível do treino</h3><div class="lvrow">${Object.keys(LEVELS).map(k=>`<button class="chip2 ${k===lvl()?'sel':''}" data-a="setLevel" data-p="${k}">${LEVELS[k].n}</button>`).join('')}</div><p class="mut"><small>${LEVELS[lvl()].d}</small></p><button class="btn gray" data-a="applyLvl2">Aplicar nível à rotina</button><button class="btn gray" data-a="offerNew">Aplicar nova rotina sugerida</button></section>
 <section class="card"><h3>⏱ Cronômetro</h3><div class="r3"><div><label>Preparo (s)</label><input type="number" min="0" data-tm="prep" value="${tmc().prep}"></div><div><label>Descanso (s)</label><input type="number" min="0" data-tm="rest" value="${tmc().rest}"></div><div><label>Entre exerc. (s)</label><input type="number" min="0" data-tm="next" value="${tmc().next}"></div></div><label class="chk2"><input type="checkbox" data-tmc="sound" ${tmc().sound?'checked':''}> Sinal sonoro</label><label class="chk2"><input type="checkbox" data-tmc="vibe" ${tmc().vibe?'checked':''}> Vibração (onde o aparelho permitir)</label><p class="mut"><small>No treino, toque em "Iniciar cronômetro". Ele guia preparo, ritmo e descanso, mas só avança depois que você registra a série.</small></p></section>
 <section class="card"><label>Início do plano de 8 semanas (segunda-feira)</label><input type="date" id="startDate" value="${S.settings.start}"></section>
 <section class="cfgc"><span class="cic">ℹ</span><div><b>Sobre o App</b><br><small class="mut">Treino Livre v1.6.1<br>Disciplina e evolução. Dados salvos só neste aparelho.</small></div></section>
 <section class="card dicas"><h3>💡 Dicas importantes</h3><ul><li>Mantenha a técnica correta.</li><li>Respeite o descanso; pare diante de dor aguda ou mal-estar.</li><li>Faça aquecimento e mantenha 2–3 repetições na reserva.</li><li>Não compense treinos perdidos com excesso.</li><li><b>Limitação:</b> sem barra ou acessórios não há exercício de puxada; Superman não substitui treino das costas.</li></ul></section>
 <button class="btn gray big" data-a="resetRoutine">Restaurar rotina inicial (mantém histórico)</button>
 <button class="btn red big" data-a="clearAsk">🗑 Resetar Dados</button>`}
/* ===== Edição da rotina ===== */
function vEdit(i){const w=S.routine[i];return `<header class="bar"><button class="back" data-a="back">‹</button><div><h1>Editar ${DN[i]}</h1></div></header>
 <section class="card"><label>Nome do treino</label><input data-wn="${i}" value="${esc(w.name)}"><label>Foco</label><input data-wf="${i}" value="${esc(w.focus)}"></section>
 ${w.items.map((it,k)=>`<div class="ex edit"><div><b>${esc(getEx(it.ex).n)}</b><br><span>${planTxt(it)}</span></div><div class="acts"><button class="btn gray sm" data-a="mv" data-p="${i},${k},-1" ${k===0?'disabled':''}>↑</button><button class="btn gray sm" data-a="mv" data-p="${i},${k},1" ${k===w.items.length-1?'disabled':''}>↓</button><button class="btn gray sm" data-a="itemForm" data-p="${i},${k}">Editar</button><button class="btn gray sm" data-a="delIt" data-p="${i},${k}">🗑</button></div></div>`).join('')||'<div class="card mut">Sem exercícios.</div>'}
 <button class="btn red big" data-a="itemForm" data-p="${i},-1">+ Adicionar exercício</button>
 <button class="btn gray big" data-a="openLib">📚 Escolher na Biblioteca</button>
 <p class="mut pad"><small>As alterações valem para este dia da semana nas próximas vezes. O histórico já registrado não muda.</small></p>`}
function itemForm(i,k){const w=S.routine[i],it=k>=0?w.items[k]:{ex:Object.keys(EX)[0],sets:3,reps:10,unit:'rep',notes:''};
 const opts=[...Object.keys(EX),...Object.keys(S.custom)].map(id=>`<option value="${id}" ${id===it.ex?'selected':''}>${esc(getEx(id).n)}</option>`).join('');
 modal(`<h3>${k>=0?'Editar':'Adicionar'} exercício</h3><label>Exercício</label><select id="f_ex">${opts}<option value="__new">➕ Criar exercício novo…</option></select>
 <div id="newbox" hidden><label>Nome do novo exercício</label><input id="f_name"><label>Instruções (uma por linha, opcional)</label><textarea id="f_steps" rows="3"></textarea><small class="mut">Exercícios novos ficam sem imagem (será exibido aviso).</small></div>
 <div class="r3"><div><label>Séries</label><input id="f_sets" type="number" min="1" value="${it.sets}"></div><div><label>Repetições / tempo</label><input id="f_reps" type="number" min="1" value="${it.reps}"></div><div><label>Unidade</label><select id="f_unit">${[['rep','reps'],['s','seg'],['min','min']].map(([v,n])=>`<option value="${v}" ${it.unit===v?'selected':''}>${n}</option>`).join('')}</select></div></div>
 <label>Observações</label><input id="f_notes" value="${esc(it.notes)}"><div class="r2"><button class="btn gray" data-a="closeModal">Cancelar</button><button class="btn red" data-a="saveItem" data-p="${i},${k}">Salvar</button></div>`);
 $('#f_ex').onchange=e=>{$('#newbox').hidden=e.target.value!=='__new'}}
/* ===== Ações ===== */
const A={

 pickLevel(k){S.settings.level=k;if(S.settings.routineVer>=2){applyLevel();save();closeModal();toast('Nível: '+LEVELS[k].n);render()}else{save();offerTemplate()}},
 keepOld(){ensureBase();S.settings.routineVer=2;S.settings.keptOld=true;save();closeModal();toast('Rotina mantida. Use Configurações para ajustar ao nível.');render()},
 applyNew(){applyTemplate();save();closeModal();toast('Nova rotina aplicada');render()},
 offerNew(){offerTemplate()},
 setLevel(k){S.settings.level=k;save();modal(`<p>Nível definido: <b>${LEVELS[k].n}</b>. Aplicar agora às séries e repetições da rotina? Exercícios que você editou manualmente não mudam.</p><div class="r2"><button class="btn gray" data-a="closeModal">Só definir</button><button class="btn red" data-a="applyLvl">Aplicar à rotina</button></div>`);render(true)},
 applyLvl(){applyLevel();save();closeModal();toast('Rotina ajustada ao nível');render(true)},
 applyLvl2(){confirmM('Ajustar séries e repetições da rotina ao nível <b>'+LEVELS[lvl()].n+'</b>? Exercícios editados por você não mudam.','applyLvl','','Aplicar')},
 openCycle(n){go('cycle',+n)},
 cycAsk(p){const[n,act]=p.split(',');if(act==='skip'||act==='hold'){doCycle(+n,act);save();toast('Registrado');V.stack=[];render();return}
  confirmM('Aplicar: <b>'+ACT[act]+'</b>? Isso muda séries/repetições da rotina (exercícios editados por você também, quando for ajuste numérico).','cycDo',n+','+act,'Aplicar')},
 cycDo(p){const[n,act]=p.split(',');doCycle(+n,act);save();closeModal();toast('Aplicado: '+ACT[act]);V.stack=[];render()},
 openLib(){go('lib')},
 libSet(p){const[k,v]=p.split(',');const f={...libF()};f[k]=f[k]===v?'':v;V.cur={...V.cur,lib:f};render(true)},
 libAdd(id){addForm(id)},
 libSave(id){const i=+$('#a_day').value,sets=Math.max(1,+$('#a_sets').value||1),reps=Math.max(1,+$('#a_reps').value||1);S.routine[i].items.push({id:uid(),ex:id,sets,reps,unit:$('#a_unit').value,notes:'',custom:true});save();closeModal();toast('Adicionado em '+DN[i]);render(true)},
 tmStart(){tmStart()},tmPause(){tmPause()},tmSkip(){tmSkip()},tmStop(){tmStop()},
 openConfig(){go('config')},
 vspeed(k){S.settings.vspeed=k;save();render(true)},
 speed(k){S.settings.speed=k;save();render(true)},
 viewMode(){S.settings.view=S.settings.view==='photos'?'anim':'photos';save();render(true)},
 cnt(d){const l=logOf(run.date,true);if(l.finished)return toast('Reabra o treino para editar');const li=l.items[S.routine[l.day].items[run.i].id],k=curSet(li),c=+li.sets[k]||0;li.sets[k]=Math.max(0,c+(+d)*stepOf(li));save();tmRegistered();render(true)},
 selSet(k){run.set=+k;render(true)},
 regSet(){const l=logOf(run.date,true);if(l.finished)return toast('Reabra o treino para editar');const li=l.items[S.routine[l.day].items[run.i].id],k=curSet(li);if(li.sets[k]===''||li.sets[k]==null)li.sets[k]=0;if(TM&&TM.ph==='wait'){save();tmRegistered();render(true);return}if(k<li.plan.sets-1)run.set=k+1;save();render(true)},
 allHist(){V.cur={...V.cur,all:!(V.cur&&V.cur.all)};render(true)},
 closeModal,back(){V.stack.pop();render()},
 openDay(d){go('day',d)},openEx(id){go('ex',id)},openEdit(i){go('edit',+i)},
 startRun(d){const l=logOf(d,true);run={date:d,set:null,i:Math.max(0,S.routine[l.day].items.findIndex(it=>!l.items[it.id].done))};save();go('run')},
 exitRun(){tmStop();V.stack=V.stack.filter(x=>x.name!=='run');save();render()},
 runPrev(){tmStop();run.i--;run.set=null;render()},runNext(){tmStop();run.i++;run.set=null;render()},
 fillSet(k){const l=logOf(run.date,true),it=S.routine[l.day].items[run.i],li=l.items[it.id];if(l.finished)return toast('Reabra o treino para editar');li.sets[+k]=li.plan.reps;save();tmRegistered();render(true)},
 toggleDone(){const l=logOf(run.date,true),it=S.routine[l.day].items[run.i],li=l.items[it.id];if(l.finished)return toast('Reabra o treino para editar');li.done=!li.done;save();render(true)},
 finishRun(){const l=logOf(run.date,true),n=Object.values(l.items).filter(x=>!x.done).length;confirmM(n?`Há ${n} exercício(s) não concluído(s). Finalizar mesmo assim? Os valores registrados são mantidos.`:'Finalizar o treino?','doFinish','','Finalizar')},
 doFinish(){logOf(run.date).finished=true;save();closeModal();toast('Treino finalizado ✓');A.exitRun()},
 reopen(){logOf(run.date).finished=false;save();render()},
 toggleRest(d){const l=logOf(d,true);l.rest=!l.finished;l.finished=!l.finished;if(!l.finished&&!Object.values(l.items).length)delete S.logs[d];save();toast(l.finished?'Descanso registrado':'Descanso desfeito');render()},
 htab(t){V.cur={...V.cur,htab:t};render()},
 mv(p){const[i,k,d]=p.split(',').map(Number),a=S.routine[i].items;[a[k],a[k+d]]=[a[k+d],a[k]];save();render()},
 delIt(p){const[i,k]=p.split(',').map(Number);confirmM(`Excluir "${esc(getEx(S.routine[i].items[k].ex)&&getEx(S.routine[i].items[k].ex).n)}" desta rotina?`,'doDel',p,'Excluir',1)},
 doDel(p){const[i,k]=p.split(',').map(Number);S.routine[i].items.splice(k,1);save();closeModal();render()},
 itemForm(p){const[i,k]=p.split(',').map(Number);itemForm(i,k)},
 saveItem(p){const[i,k]=p.split(',').map(Number);let ex=$('#f_ex').value;
  if(ex==='__new'){const n=$('#f_name').value.trim();if(!n)return toast('Informe o nome');ex='c'+uid();S.custom[ex]={n,u:$('#f_unit').value,steps:$('#f_steps').value.split('\n').map(s=>s.trim()).filter(Boolean),err:[],m:[],start:'',breath:''}}
  const sets=Math.max(1,+$('#f_sets').value||1),reps=Math.max(1,+$('#f_reps').value||1),it={id:k>=0?S.routine[i].items[k].id:uid(),ex,sets,reps,unit:$('#f_unit').value,notes:$('#f_notes').value.trim()};
  const old=k>=0?S.routine[i].items[k]:null;if(old){it.b=old.b;it.custom=!!old.custom||old.ex!==ex||old.sets!==sets||old.reps!==reps||old.unit!==it.unit}else it.custom=true;
  if(k>=0)S.routine[i].items[k]=it;else S.routine[i].items.push(it);save();closeModal();render();toast('Salvo')},
 export(){const b=new Blob([JSON.stringify({app:'treino-livre',version:1,exported:new Date().toISOString(),data:S},null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`treino-livre-backup-${today()}.json`;document.body.appendChild(a);a.click();a.remove();toast('Backup exportado')},
 importPick(){$('#imp').click()},
 resetRoutine(){confirmM('Restaurar a rotina inicial? Suas alterações na rotina serão perdidas. O histórico é mantido.','doReset','','Restaurar')},
 doReset(){S.routine=defState().routine;applyLevel();save();closeModal();toast('Rotina restaurada');render()},
 clearAsk(){confirmM('Apagar TODOS os dados (rotina, histórico, observações)? Exporte um backup antes. Esta ação não pode ser desfeita.','doClear','','Apagar tudo',1)},
 async doClear(){await DB.set('state_prev',S);S=defState();await save();closeModal();toast('Dados apagados');render();checkOnboarding()}
};
function validate(o){if(!o||o.app!=='treino-livre'||!o.data)throw Error('Arquivo não é um backup do Treino Livre.');const d=o.data;
 if(!Array.isArray(d.routine)||d.routine.length!==7)throw Error('Rotina inválida (esperados 7 dias).');
 for(const w of d.routine){if(typeof w.name!=='string'||!Array.isArray(w.items))throw Error('Dia da rotina inválido.');for(const i of w.items)if(!i.id||!i.ex||!(+i.sets>0)||!['rep','s','min'].includes(i.unit))throw Error('Exercício inválido na rotina.')}
 if(typeof d.logs!=='object'||d.logs===null||Array.isArray(d.logs))throw Error('Histórico inválido.');
 for(const k in d.logs){if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||!d.logs[k].items)throw Error('Registro de histórico inválido: '+k)}
 if(!d.settings||!/^\d{4}-\d{2}-\d{2}$/.test(d.settings.start))throw Error('Configurações inválidas.');d.custom=d.custom||{};return d}
let pending=null;
A.doImport=async()=>{await DB.set('state_prev',S);S=pending;pending=null;await save();closeModal();toast('Backup importado com sucesso');render();checkOnboarding()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const f=A[b.dataset.a];if(f)f(b.dataset.p,b)});
document.addEventListener('change',async e=>{const t=e.target;
 if(t.dataset.tmc){S.settings.tm={...(S.settings.tm||{}),[t.dataset.tmc]:t.checked};save();return}
 if(t.dataset.cur!==undefined){tmRegistered();return}
 if(t.id==='imp'&&t.files[0]){try{const o=JSON.parse(await t.files[0].text());pending=validate(o);const n=Object.keys(pending.logs).length;confirmM(`Backup válido (${n} dia(s) de histórico). Substituir os dados atuais? Os atuais serão guardados como cópia interna de segurança.`,'doImport','','Substituir')}catch(err){toast('Erro: '+err.message)}t.value=''}
 else if(t.id==='startDate'){const v=t.value;if(v){S.settings.start=monday(v);save();toast('Início ajustado para '+fmt(S.settings.start));render()}}
 else if(t.dataset.c==='week'){V.cur={...V.cur,week:+t.value};render()}});
document.addEventListener('input',e=>{const t=e.target;
 if(t.dataset.cur!==undefined){const l=logOf(run.date,true);if(l.finished)return;const li=l.items[S.routine[l.day].items[run.i].id];const v=t.value;li.sets[curSet(li)]=v===''?'':Math.max(0,+v);clearTimeout(save.t);save.t=setTimeout(save,300)}
 else if(t.dataset.note!==undefined){const l=logOf(run.date,true);if(l.finished)return;l.items[S.routine[l.day].items[run.i].id].note=t.value;clearTimeout(save.t);save.t=setTimeout(save,400)}
 else if(t.dataset.tm!==undefined){S.settings.tm={...(S.settings.tm||{}),[t.dataset.tm]:Math.max(0,+t.value||0)};clearTimeout(save.t);save.t=setTimeout(save,300)}
 else if(t.dataset.q!==undefined){V.cur={...V.cur,lib:{...libF(),q:t.value}};const L=$('#libList');if(L)L.innerHTML=libList()}
 else if(t.dataset.wn!==undefined){S.routine[+t.dataset.wn].name=t.value;save()}else if(t.dataset.wf!==undefined){S.routine[+t.dataset.wf].focus=t.value;save()}});
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.p));
(async()=>{try{await DB.open();S=await DB.get('state');if(!S){S=defState();await save()}
 if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
 if('serviceWorker' in navigator&&location.protocol.startsWith('http')){const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg=>{
   const show=w=>{const u=$('#upd');u.hidden=false;u.querySelector('button').onclick=()=>w.postMessage('SKIP_WAITING')};
   if(reg.waiting&&had)show(reg.waiting);
   reg.addEventListener('updatefound',()=>{const n=reg.installing;if(n)n.addEventListener('statechange',()=>{if(n.state==='installed'&&navigator.serviceWorker.controller)show(n)})});
   reg.update().catch(()=>{});document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{})});
   let done=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||done)return;done=true;location.reload()});
  }).catch(()=>{})}
 try{const vm=await (await fetch('videos.json',{cache:'no-cache'})).json();for(const k in vm){const v=vm[k],src=typeof v==='string'?v:(v&&v.src);if(EX[k]&&src){EX[k].video=src;if(v&&v.credit)EX[k].vcredit=v.credit}}}catch(e){}
 window.__app={get S(){return S},A,DB,get TM(){return TM}};render();checkOnboarding()}catch(e){$('#main').innerHTML='<div class="card">Não foi possível abrir o armazenamento local: '+esc(e.message)+'<br>Abra o app por um navegador que suporte IndexedDB (não em modo privado).</div>'}})();
