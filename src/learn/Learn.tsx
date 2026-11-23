import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getGtoPreflopMix, type GtoPosition } from '../../server/gtoRanges';
import type { Rank } from '../shared/types';
import { simulate } from './equity';
import './learn.css';

const ranks = 'AKQJT98765432';
const positions = {UTG:'枪口位', HJ:'劫位', CO:'关煞位', BTN:'按钮位', SB:'小盲位', BB:'大盲位'};
const notes = {
  UTG:'翻牌前第一个行动，身后还有五位玩家。',
  HJ:'位于枪口位之后。入池时仍需考虑两名后位玩家和盲位的反应。',
  CO:'按钮位右手边的位置。前面都弃牌时，只剩按钮位和两个盲位尚未行动。',
  BTN:'翻牌后最后行动，可以先观察对手，再决定是否投入筹码。',
  SB:'已经投入小盲注。若大盲跟注，翻牌后由你先行动。',
  BB:'已经投入大盲注。本图示例为面对一次开池加注时的防守范围。'
};
function Ranges() {
  const [pos,setPos] = useState<GtoPosition>('BTN');
  const [selected,select] = useState('AKs');
  const cells = Array.from({length:169}, (_,i) => {
    const r = Math.floor(i/13), c = i%13;
    const name = ranks[Math.min(r,c)] + ranks[Math.max(r,c)] + (r===c?'':r<c?'s':'o');
    const mix = getGtoPreflopMix({holeCards:[{rank:(14-r) as Rank,suit:'spades'},{rank:(14-c) as Rank,suit:r<c?'spades':'hearts'}], position:pos, facingRaises:pos==='BB'?1:0, facingBetBB:pos==='BB'?2.5:1,effectiveStackBB:100,isHeadsUp:false,canCheck:false});
    return {name,mix};
  });
  const hand = cells.find(cell=>cell.name===selected)!;
  return <section><h2>位置与起手牌</h2><p>六人桌 · 有效筹码 100 个大盲。选择位置，再点选一手牌查看项目策略表中的行动频率。</p>
    <div className="positions">{(Object.keys(positions) as GtoPosition[]).map(p=><button key={p} aria-pressed={p===pos} onClick={()=>setPos(p)}>{p} · {positions[p]}</button>)}</div>
    <div className="range-layout"><div><div className="matrix">{cells.map(({name,mix})=><button key={name} aria-pressed={name===selected} className={mix.raise>=0.5?'raise':mix.raise+mix.call>0?'mixed':''} onClick={()=>select(name)}>{name}</button>)}</div>
    <p className="legend"><b>绿色</b> 加注 ≥ 50%　 <em>金色</em> 其他可入池组合　 灰色 全部弃牌</p></div>
    <aside><h3>{positions[pos]} · {pos}</h3><p>{notes[pos]}</p><p>{pos==='BB'?'场景：面对加注至 2.5 个大盲。':'场景：前面玩家全部弃牌，轮到你行动。'}</p><hr/><strong className="hand">{selected}</strong><dl>{[['加注',hand.mix.raise],['跟注',hand.mix.call],['弃牌',hand.mix.fold]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{Math.round(Number(value)*100)}%</dd></div>)}</dl><p>s 表示同花，o 表示不同花，对角线为口袋对子。T 表示 10。</p></aside></div></section>;
}
const suits = ['♠','♥','♦','♣'];
function Equity() {
  const [slots,setSlots]=useState<number[]>([12,25,-1,-1,-1,-1,-1]);
  const [count,setCount]=useState(1);
  const [result,setResult]=useState<string[]|null>(null);
  const hero=slots.slice(0,2), board=slots.slice(2).filter(id=>id>=0);
  const valid=hero.every(id=>id>=0)&&[0,3,4,5].includes(board.length);
  function picker(id:number,i:number) {
    const label=i<2?'底牌 '+(i+1):'公共牌 '+(i-1);
    return <label key={i}>{label}<select value={id} onChange={e=>{setSlots(slots.map((v,j)=>j===i?Number(e.target.value):v));setResult(null);}}><option value={-1}>未选择</option>{suits.map((suit,s)=><optgroup key={suit} label={suit}>{Array.from(ranks,(r,j)=>{const n=s*13+12-j;return <option key={n} value={n} disabled={slots.includes(n)&&id!==n}>{suit} {r==='T'?'10':r}</option>})}</optgroup>)}</select></label>;
  }
  return <section><h2>手牌胜率计算器</h2><p>选定底牌和已知公共牌，模拟对阵随机手牌一直打到摊牌的结果。</p>
    <div className="selectors">{slots.slice(0,2).map(picker)}<label>对手人数<select value={count} onChange={e=>{setCount(Number(e.target.value));setResult(null)}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} 人</option>)}</select></label></div>
    <div className="selectors">{slots.slice(2).map((id,j)=>picker(id,j+2))}</div>
    <p>翻牌前留空公共牌，翻牌选 3 张，转牌选 4 张，河牌选 5 张。</p>
    <button className="primary" disabled={!valid} onClick={()=>setResult(simulate(hero,board,count))}>计算胜率</button>
    <div role="status">{!valid&&<p>请选择两张底牌，并补齐当前阶段的公共牌。</p>}{result&&<><div className="results">{['独赢','平局','落败'].map((v,i)=><div key={v}>{v}<strong>{result[i]}%</strong></div>)}</div><p>基于 10,000 次随机发牌的估计。平局指你与至少一名对手并列第一。</p></>}</div></section>;
}
function Basics(){return <section><h2>德州扑克基础</h2><h3>一手牌如何进行</h3><p>每人先拿两张底牌。翻牌一次发三张公共牌，转牌和河牌各发一张，每个阶段都有一轮行动。若其他人都弃牌，最后留下的玩家直接赢得底池。</p><h3>轮到你时</h3><p>无人下注时可以让牌或下注。面对下注，可以弃牌、跟注至相同金额，或加注。投入自己的全部剩余筹码称为全下。</p><h3>摊牌时比什么</h3><p>从两张底牌和五张公共牌中选出最强五张，可使用零至两张底牌。五张牌完全同强时平分相应底池，花色没有高低。</p><p className="order">从强到弱：同花顺 › 四条 › 葫芦 › 同花 › 顺子 › 三条 › 两对 › 一对 › 高牌</p><p>皇家同花顺是 A、K、Q、J、10 组成的同花顺。A 也可作最低点数组成 A、2、3、4、5 顺子。</p></section>}
function Learn(){
 const [page,setPage]=useState(0);
 return <main><header><a href="/">♠ 私人牌室</a><a href="/">返回大厅 ↗</a></header><h1>牌桌教学</h1><nav aria-label="教学内容">{['位置范围','胜率计算','基础知识'].map((s,i)=><button key={s} aria-pressed={page===i} onClick={()=>setPage(i)}>{s}</button>)}</nav>
 <div hidden={page!==0}><Ranges/></div><div hidden={page!==1}><Equity/></div><div hidden={page!==2}><Basics/></div></main>
}
createRoot(document.getElementById('root')!).render(<Learn/>);