import{f as w,$ as u,r as T,P as L,c as M,a as R,b as D,d as H,O as P,T as O,t as S,e as l,l as v,s as E,M as I,S as $}from"./utils.DD0dn35b.js";let d=null,b=null,p=1;function k(a,s){const e=v(s,a);return e?`<a class="roster-name" href="${E(e)}" target="_blank" rel="noopener">${l(a)}</a>`:`<span class="roster-name">${l(a)}</span>`}function j(a,s){const e=s?`R${a.round} · #${a.pick} — ${s.name}${s.position?` (${s.position})`:""}`:`R${a.round} · #${a.pick} — on the clock`;return`<span class="draft-ticker-item">${l(e)}</span>`}function N(a){const s=u("draftTickerTrack");if(!s)return;const e=a.oriolesPickOrder??[],r=a.picks??[];if(!e.length){s.innerHTML='<span class="draft-ticker-item">Orioles pick order unavailable</span>';return}const n=e.map(t=>j(t,r.find(o=>o.round===t.round&&o.pick===t.pick)));s.innerHTML=n.join("")+n.join("")}function A(a){const s=u("draftRoundTabs");if(!s)return;const e=(a.oriolesPickOrder??[]).map(r=>r.round);s.innerHTML=e.map(r=>`<button class="pill${r===p?" active":""}" data-round="${r}">Round ${r}</button>`).join(""),s.querySelectorAll("button[data-round]").forEach(r=>{r.addEventListener("click",()=>{p=Number(r.dataset.round),s.querySelectorAll("button").forEach(n=>n.classList.toggle("active",n===r)),y(d,b)})})}function y(a,s){const e=u("draftOrder");if(!e)return;const r=a.roundOrders?.[String(p)],n=(a.oriolesPickOrder??[]).find(t=>t.round===p);if(!r?.length){const t=(a.picks??[]).find(o=>o.round===p);e.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${p} order isn't published yet.</p>
      ${n?`<div class="roster-item">
        <span class="roster-pos">R${n.round}</span>
        ${t?k(t.name,s):'<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${n.pick}</span>
      </div>`:""}
      <a class="widget-link" href="https://www.mlb.com/draft/${d?.season??""}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`;return}e.innerHTML=r.map(t=>{const o=t.teamId===P,i=O[t.teamId]??"";return`<div class="draft-order-row${o?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${t.pick}</span>
      <img class="draft-order-logo" src="${S(t.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${l(i)}</span>
      ${t.note?`<span class="draft-order-note">${l(t.note)}</span>`:""}
    </div>`}).join("")}async function C(){try{const[a,s]=await Promise.all([fetch("/yardreport/draft-picks.json").then(r=>r.json()),w()]);d=a,b=s,N(d),A(d),y(d,s);const e=u("draftUpdated");e&&d.lastUpdated&&(e.textContent=`Updated ${T(d.lastUpdated)}`),U(d),q(d,s)}catch{u("draftTickerTrack").innerHTML='<span class="draft-ticker-item">Draft data unavailable</span>',u("draftOrder").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function U(a){const s=u("draftInfo");if(!s)return;const e=new Date("2026-07-11T19:00:00-04:00");let r="";const n=e.getTime()-Date.now();if(n>0){const t=Math.floor(n/864e5),o=Math.floor(n%864e5/36e5);r=`<div class="asg-countdown">${t}d ${o}h until Round 1</div>`}else r='<div class="asg-countdown">Draft is underway</div>';s.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${l(a.dates??"")}</div>
      ${r}
      <div class="asg-game-venue">${l(a.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(a.oriolesPickOrder??[]).map(t=>`<span class="draft-order-chip">R${t.round} · #${t.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}const _=new Set(["P","SP","RP","LHP","RHP"]);async function B(a,s){if(!a)return null;const e=_.has(s)?"pitching":"hitting";try{const n=(await fetch(`${I}/people/${a}/stats?stats=season&season=${$}&group=${e}`).then(t=>t.json())).stats?.[0]?.splits?.[0]?.stat;return n?e==="hitting"?`${$}: ${n.avg??".---"}/${n.obp??".---"}/${n.slg??".---"}, ${n.homeRuns??0} HR`:`${$}: ${n.era??"-.--"} ERA, ${n.strikeOuts??0} K`:null}catch{return null}}function q(a,s){const e=u("draftHistory");if(!e)return;const r=[...a.history??[]].sort((t,o)=>o.year-t.year);if(!r.length){e.innerHTML='<span class="sidebar-msg">No history available</span>';return}const n=(t,o)=>`
    <div class="asg-history-item">
      <span class="asg-history-year">${t.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${k(t.name,s)} · ${l(t.position)}</div>
        <div class="asg-history-meta">Round ${t.round}, Pick ${t.pick} · ${l(t.school)}</div>
        ${o?`<div class="asg-history-stat">${l(o)}</div>`:""}
      </div>
    </div>
  `;e.innerHTML=r.map(t=>n(t,null)).join(""),r.forEach(async(t,o)=>{const i=v(s,t.name),c=await B(i,t.position);if(!c)return;const m=e.children[o];m&&(m.outerHTML=n(t,c))})}async function x(){const a=u("draftNews");if(a)try{const s=await fetch("/yardreport/feeds.json").then(i=>i.json()),e=await Promise.allSettled(s.map(i=>fetch(`${L}?url=${encodeURIComponent(i.url)}`).then(c=>c.json()).then(c=>({source:i,articles:c.items??[]})))),r=Date.now()-14*864e5,n=/draft/i,t=[];for(const i of e){if(i.status!=="fulfilled")continue;const{source:c,articles:m}=i.value;for(const f of m){const h=M(f.title||"");if(!n.test(h)&&!n.test(f.description||""))continue;const g=new Date(f.pubDate);isNaN(g)||g.getTime()<r||t.push({title:h,link:f.link,pubDate:f.pubDate,sourceName:c.name,thumbnail:R(f)})}}t.sort((i,c)=>new Date(c.pubDate)-new Date(i.pubDate));const o=t.slice(0,12);if(!o.length){a.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(o.map(async i=>{i.thumbnail||(i.thumbnail=await D(i.link))})),a.innerHTML=`<div class="news-thumb-list">${o.map(H).join("")}</div>`}catch{a.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function F(){document.querySelectorAll(".section-toggle").forEach(a=>{a.addEventListener("click",()=>{const s=a.closest(".sidebar-section"),e=s.closest(".sidebar"),r=s.classList.contains("collapsed");e?.querySelectorAll(".sidebar-section.collapsible").forEach(n=>{n!==s&&n.classList.add("collapsed")}),s.classList.toggle("collapsed",!r)})})}F();C();x();
