import Phaser from 'phaser';
import './style.css';

const SAVE_KEY = 'car-tycoon-save-v2';
const rarities = {
  common: { label:'Обычная', color:'#a5b0ba', rank:1, chance:58 },
  uncommon: { label:'Необычная', color:'#58c88a', rank:2, chance:25 },
  rare: { label:'Редкая', color:'#54a8ff', rank:3, chance:11 },
  epic: { label:'Эпическая', color:'#b18aff', rank:4, chance:4.5 },
  legendary: { label:'Легендарная', color:'#ffbd59', rank:5, chance:1.4 },
  mythic: { label:'Мифическая', color:'#ff668b', rank:6, chance:0.1 }
};
const cars = [
  {id:'hatch',name:'Vektor Hatch S',maker:'VEKTOR',rarity:'common',value:450,color:'#b8c1ca',type:'hatch'},
  {id:'sedan',name:'Auron Sedan',maker:'AURON',rarity:'common',value:650,color:'#637f9b',type:'sedan'},
  {id:'compact',name:'Mira Compact',maker:'MIRA',rarity:'common',value:750,color:'#9bafa1',type:'hatch'},
  {id:'wagon',name:'Nord Wagon XR',maker:'NORD',rarity:'common',value:850,color:'#a1a8a1',type:'wagon'},
  {id:'coupe',name:'Raven Coupe',maker:'RAVEN',rarity:'uncommon',value:1200,color:'#d85b4c',type:'coupe'},
  {id:'sedan2',name:'Auron Executive',maker:'AURON',rarity:'uncommon',value:1550,color:'#526d85',type:'sedan'},
  {id:'roadster',name:'Solara Roadster',maker:'SOLARA',rarity:'rare',value:2800,color:'#e7c36b',type:'coupe'},
  {id:'muscle',name:'Viper Muscle 68',maker:'VIPER',rarity:'rare',value:3400,color:'#d74c45',type:'muscle'},
  {id:'gt',name:'Apex GT-R',maker:'APEX',rarity:'epic',value:6200,color:'#4a8de0',type:'coupe'},
  {id:'track',name:'Kestrel Track RS',maker:'KESTREL',rarity:'epic',value:7900,color:'#d8dce2',type:'coupe'},
  {id:'super',name:'Vortex Superleggera',maker:'VORTEX',rarity:'legendary',value:16000,color:'#e34e47',type:'super'},
  {id:'hyper',name:'Zenith Hyper GT',maker:'ZENITH',rarity:'legendary',value:22000,color:'#d4d9df',type:'super'},
  {id:'phantom',name:'Phantom X One',maker:'PHANTOM',rarity:'mythic',value:48000,color:'#a47bff',type:'super'},
  {id:'nebula',name:'Nebula One-Off',maker:'NEBULA',rarity:'mythic',value:65000,color:'#65e4d2',type:'super'}
];
const initialState = () => ({ balance:10000, garage:[], rolls:0, bestRarity:'common', bonusAt:0 });
let state = loadState();
let currentDrop = null;
let toastTimer;
let fxScene;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && typeof saved.balance === 'number' && Array.isArray(saved.garage)) return {...initialState(),...saved};
  } catch {}
  return initialState();
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function carById(id) { return cars.find(c => c.id === id); }
function pickCar() {
  const roll = Math.random() * 100;
  let sum = 0, picked = 'common';
  for (const key of Object.keys(rarities)) { sum += rarities[key].chance; if (roll < sum) { picked = key; break; } }
  const pool = cars.filter(c => c.rarity === picked);
  return pool[Math.floor(Math.random() * pool.length)] || cars[0];
}
function carArt(car, extra='') {
  const type = car.type || 'coupe';
  return `<div class="car-illustration ${type} ${extra}" style="--car-color:${car.color}"><div class="car-shadow"></div><div class="art-glow"></div><div class="art-body"></div><div class="art-roof"></div><div class="art-glass"></div><div class="art-detail"></div><div class="art-wheel wheel-left"></div><div class="art-wheel wheel-right"></div><div class="art-light"></div></div>`;
}
function renderOdds() {
  document.querySelector('#odds-grid').innerHTML = Object.entries(rarities).map(([key,r]) =>
    `<div class="odds-card" style="--rarity-color:${r.color}"><span class="rarity-dot"></span><div><strong>${r.label}</strong><small>${r.chance}% шанс</small></div><b>${key==='mythic'?'1 из 1 000':key==='legendary'?'примерно 1 из 71':key==='epic'?'примерно 1 из 22':key==='rare'?'примерно 1 из 9':'часто'}</b></div>`
  ).join('');
}
function renderGarage() {
  const search = document.querySelector('#search').value.trim().toLowerCase();
  const filter = document.querySelector('#rarity-filter').value;
  const entries = state.garage.map((entry,index)=>({...entry,index,car:carById(entry.carId)}))
    .filter(e=>e.car && (filter==='all'||e.car.rarity===filter) && `${e.car.name} ${e.car.maker}`.toLowerCase().includes(search));
  document.querySelector('#garage-grid').innerHTML = entries.map(e=>{
    const c=e.car,r=rarities[c.rarity];
    return `<article class="garage-card" style="--rarity-color:${r.color}">
      <div class="garage-card-top"><span class="rarity-label">${r.label}</span><span class="serial">#${String(e.index+1).padStart(3,'0')}</span></div>
      <div class="garage-art">${carArt(c)}</div><div class="garage-info"><small>${c.maker}</small><h3>${c.name}</h3><div class="value-line"><strong>${fmt(c.value)} ₵</strong><span>оценка</span></div></div>
      <button class="sell-btn" data-sell="${e.uid}">ПРОДАТЬ ЗА ${fmt(Math.floor(c.value*.85))} ₵</button>
    </article>`;
  }).join('');
  document.querySelector('#garage-count').textContent = state.garage.length;
  document.querySelector('#empty-garage').classList.toggle('hidden', entries.length > 0);
  document.querySelector('#garage-grid').classList.toggle('hidden', entries.length === 0);
  document.querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sellFromGarage(b.dataset.sell)));
}
function renderStats() {
  document.querySelector('#balance').textContent = `${fmt(state.balance)} ₵`;
  document.querySelector('#stat-cars').textContent = state.garage.length;
  document.querySelector('#stat-value').textContent = `${fmt(state.garage.reduce((n,e)=>n+(carById(e.carId)?.value||0),0))} ₵`;
  const best = state.garage.reduce((b,e)=>{const r=carById(e.carId)?.rarity||'common';return rarities[r].rank>rarities[b].rank?r:b;},'common');
  document.querySelector('#stat-best').textContent = state.garage.length ? rarities[best].label : '—';
  document.querySelector('#stat-rolls').textContent = state.rolls;
  document.querySelector('#bonus-btn').disabled = Date.now()-state.bonusAt < 86400000;
  document.querySelector('#bonus-btn').textContent = Date.now()-state.bonusAt < 86400000 ? 'БОНУС ЗАБРАН' : '+ БОНУС';
}
function renderAll(){renderStats();renderGarage();save();}
function toast(msg){
  const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2500);
}
function setResult(car) {
  const r=rarities[car.rarity];
  document.querySelector('#last-car-name').textContent=car.name;
  document.querySelector('#last-car-rarity').textContent=r.label.toUpperCase();
  document.querySelector('#last-car-rarity').style.color=r.color;
  document.querySelector('#last-car-value').textContent=`${fmt(car.value)} ₵`;
  document.querySelector('#keep-btn').disabled=false;
  document.querySelector('#sell-btn').disabled=false;
  document.querySelector('#stage-hint').textContent=`ВЫПАЛА ${r.label.toUpperCase()} МАШИНА`;
  document.querySelector('#car-stage').style.setProperty('--drop-color',r.color);
}
function rollCar() {
  if (currentDrop) { toast('Сначала оставь предыдущую машину или продай её.'); return; }
  const car=pickCar();
  const uid=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  currentDrop={...car,uid};
  state.rolls++;
  if(rarities[car.rarity].rank>rarities[state.bestRarity].rank)state.bestRarity=car.rarity;
  const stage=document.querySelector('#car-stage');
  stage.classList.remove('drop-common','drop-uncommon','drop-rare','drop-epic','drop-legendary','drop-mythic','pop');
  stage.classList.add('pop',`drop-${car.rarity}`);
  document.querySelector('#stage-car').outerHTML=carArt(car,'hero-car');
  setResult(car);
  document.querySelector('#roll-btn').disabled=true;
  document.querySelector('#roll-btn span:nth-child(2)').textContent='МАШИНА ВЫПАЛА';
  renderAll();
  fxScene?.burst(rarities[car.rarity].color);
}
function keepDrop() {
  if(!currentDrop)return;
  state.garage.push({uid:currentDrop.uid,carId:currentDrop.id,acquiredAt:Date.now()});
  toast(`${currentDrop.name} добавлен в гараж`);
  currentDrop=null; resetDropControls(); renderAll();
}
function sellCurrentDrop() {
  if(!currentDrop)return;
  const car=currentDrop, amount=Math.floor(car.value*.85);
  state.balance+=amount;currentDrop=null;resetDropControls();renderAll();
  toast(`${car.name} продан за ${fmt(amount)} ₵`);
}
function sellFromGarage(uid) {
  const i=state.garage.findIndex(e=>e.uid===uid);if(i<0)return;
  const car=carById(state.garage[i].carId);state.garage.splice(i,1);
  const amount=Math.floor(car.value*.85);state.balance+=amount;renderAll();toast(`${car.name} продан за ${fmt(amount)} ₵`);
}
function resetDropControls() {
  document.querySelector('#keep-btn').disabled=true;document.querySelector('#sell-btn').disabled=true;
  document.querySelector('#roll-btn').disabled=false;
  document.querySelector('#roll-btn span:nth-child(2)').textContent='ПОЛУЧИТЬ МАШИНУ';
  document.querySelector('#last-car-name').textContent='Готов к следующей попытке';
  document.querySelector('#last-car-rarity').textContent='Выбери, что делать с последней машиной';
  document.querySelector('#last-car-rarity').style.color='';
  document.querySelector('#last-car-value').textContent='—';
  document.querySelector('#stage-hint').textContent='ТВОЙ СЛЕДУЮЩИЙ АВТОМОБИЛЬ';
  const stage=document.querySelector('#car-stage');stage.classList.remove('pop','drop-common','drop-uncommon','drop-rare','drop-epic','drop-legendary','drop-mythic');
}
function claimBonus(){if(Date.now()-state.bonusAt<86400000)return;state.balance+=1500;state.bonusAt=Date.now();renderAll();toast('Ежедневный бонус: +1 500 ₵');}
function resetProgress(){if(!confirm('Сбросить баланс и весь гараж?'))return;state=initialState();currentDrop=null;resetDropControls();renderAll();toast('Прогресс сброшен');}
document.querySelector('#roll-btn').addEventListener('click',rollCar);
document.querySelector('#keep-btn').addEventListener('click',keepDrop);
document.querySelector('#sell-btn').addEventListener('click',sellCurrentDrop);
document.querySelector('#bonus-btn').addEventListener('click',claimBonus);
document.querySelector('#search').addEventListener('input',renderGarage);
document.querySelector('#rarity-filter').addEventListener('change',renderGarage);
document.querySelector('#reset-btn').addEventListener('click',resetProgress);
renderOdds();renderAll();

// Phaser is used for a small rarity-colored particle effect on each drop.
class FXScene extends Phaser.Scene {
  constructor(){super('FXScene');}
  create(){fxScene=this;}
  burst(hex){
    const color=Phaser.Display.Color.HexStringToColor(hex).color;
    const cx=this.scale.width/2,cy=this.scale.height/2;
    for(let i=0;i<22;i++){
      const a=Math.random()*Math.PI*2,d=45+Math.random()*160;
      const p=this.add.circle(cx,cy,2+Math.random()*3,color,.9).setDepth(10);
      this.tweens.add({targets:p,x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d,alpha:0,scale:.1,duration:450+Math.random()*350,ease:'Cubic.Out',onComplete:()=>p.destroy()});
    }
  }
}
new Phaser.Game({type:Phaser.CANVAS,width:2,height:2,parent:document.body,transparent:true,audio:{noAudio:true},scene:[FXScene],scale:{mode:Phaser.Scale.NONE},callbacks:{postBoot:g=>{Object.assign(g.canvas.style,{position:'fixed',left:'-10px',top:'-10px',width:'2px',height:'2px',pointerEvents:'none',opacity:'0'});}}});
