import{f as H,$ as u,r as P,P as R,c as D,a as M,b as O,d as S,g,O as E,T as N,t as j,e as d,l as I,p as v,M as A,S as $}from"./utils.C8LDhMvw.js";let l=null,b=null,p=1;function w(t,e){return v(t,e)}function C(t,e,s){const a=`R${t.round} · #${t.pick} — `;if(!e)return`<span class="draft-ticker-item">${d(a)}on the clock</span>`;const n=v(e.name,s,"draft-ticker-name"),r=e.position?d(` (${e.position})`):"";return`<span class="draft-ticker-item">${d(a)}${n}${r}</span>`}function U(t,e){const s=u("draftTickerTrack");if(!s)return;const a=t.oriolesPickOrder??[],n=t.picks??[];if(!a.length){s.innerHTML='<span class="draft-ticker-item">Orioles pick order unavailable</span>';return}const r=a.map(o=>C(o,n.find(i=>i.round===o.round&&i.pick===o.pick),e));s.innerHTML=r.join("")+r.join(""),g(s)}function q(t){const e=u("draftRoundTabs");if(!e)return;const s=(t.oriolesPickOrder??[]).map(a=>a.round);e.innerHTML=s.map(a=>`<button class="pill${a===p?" active":""}" data-round="${a}">Round ${a}</button>`).join(""),e.querySelectorAll("button[data-round]").forEach(a=>{a.addEventListener("click",()=>{p=Number(a.dataset.round),e.querySelectorAll("button").forEach(n=>n.classList.toggle("active",n===a)),T(l,b)})})}function T(t,e){const s=u("draftOrder");if(!s)return;const a=t.roundOrders?.[String(p)],n=(t.oriolesPickOrder??[]).find(r=>r.round===p);if(!a?.length){const r=(t.picks??[]).find(o=>o.round===p);s.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${p} order isn't published yet.</p>
      ${n?`<div class="roster-item">
        <span class="roster-pos">R${n.round}</span>
        ${r?w(r.name,e):'<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${n.pick}</span>
      </div>`:""}
      <a class="widget-link" href="https://www.mlb.com/draft/${l?.season??""}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`,g(s);return}s.innerHTML=a.map(r=>{const o=r.teamId===E,i=N[r.teamId]??"";return`<div class="draft-order-row${o?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${r.pick}</span>
      <img class="draft-order-logo" src="${j(r.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${d(i)}</span>
      ${r.note?`<span class="draft-order-note">${d(r.note)}</span>`:""}
    </div>`}).join("")}async function x(){try{const[t,e]=await Promise.all([fetch("/yardreport/draft-picks.json").then(a=>a.json()),H()]);l=t,b=e,U(l,e),q(l),T(l,e);const s=u("draftUpdated");s&&l.lastUpdated&&(s.textContent=`Updated ${P(l.lastUpdated)}`),B(l),K(l,e)}catch{u("draftTickerTrack").innerHTML='<span class="draft-ticker-item">Draft data unavailable</span>',u("draftOrder").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function B(t){const e=u("draftInfo");if(!e)return;const s=new Date("2026-07-11T19:00:00-04:00");let a="";const n=s.getTime()-Date.now();if(n>0){const r=Math.floor(n/864e5),o=Math.floor(n%864e5/36e5);a=`<div class="asg-countdown">${r}d ${o}h until Round 1</div>`}else a='<div class="asg-countdown">Draft is underway</div>';e.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${d(t.dates??"")}</div>
      ${a}
      <div class="asg-game-venue">${d(t.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(t.oriolesPickOrder??[]).map(r=>`<span class="draft-order-chip">R${r.round} · #${r.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}const _=new Set(["P","SP","RP","LHP","RHP"]);async function F(t,e){if(!t)return null;const s=_.has(e)?"pitching":"hitting";try{const n=(await fetch(`${A}/people/${t}/stats?stats=season&season=${$}&group=${s}`).then(r=>r.json())).stats?.[0]?.splits?.[0]?.stat;return n?s==="hitting"?`${$}: ${n.avg??".---"}/${n.obp??".---"}/${n.slg??".---"}, ${n.homeRuns??0} HR`:`${$}: ${n.era??"-.--"} ERA, ${n.strikeOuts??0} K`:null}catch{return null}}function L(t){return`${t.year}-${t.pick}-${t.name}`.replace(/\W+/g,"")}function h(t,e,s){return`
    <div class="asg-history-item" data-history-key="${L(t)}">
      <span class="asg-history-year">${t.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${w(t.name,e)} · ${d(t.position)}</div>
        <div class="asg-history-meta">Round ${t.round}, Pick ${t.pick} · ${d(t.school)}</div>
        ${s?`<div class="asg-history-stat">${d(s)}</div>`:""}
      </div>
    </div>
  `}function K(t,e){const s=u("draftHistory");if(!s)return;const a=[...t.recentPicks??[]].sort((o,i)=>i.year-o.year),n=[...t.notables??[]].sort((o,i)=>i.year-o.year),r=[...a,...n];if(!r.length){s.innerHTML='<span class="sidebar-msg">No history available</span>';return}s.innerHTML=`
    ${a.length?`<div class="roster-group-label">Recent Top Picks</div>${a.map(o=>h(o,e,null)).join("")}`:""}
    ${n.length?`<div class="roster-group-label">Franchise Notables</div>${n.map(o=>h(o,e,null)).join("")}`:""}
  `,g(s),r.forEach(async o=>{const i=I(e,o.name),c=await F(i,o.position);if(!c)return;const m=s.querySelector(`[data-history-key="${L(o)}"]`);m&&(m.outerHTML=h(o,e,c))})}async function z(){const t=u("draftNews");if(t)try{const e=await fetch("/yardreport/feeds.json").then(i=>i.json()),s=await Promise.allSettled(e.map(i=>fetch(`${R}?url=${encodeURIComponent(i.url)}`).then(c=>c.json()).then(c=>({source:i,articles:c.items??[]})))),a=Date.now()-14*864e5,n=/draft/i,r=[];for(const i of s){if(i.status!=="fulfilled")continue;const{source:c,articles:m}=i.value;for(const f of m){const k=D(f.title||"");if(!n.test(k)&&!n.test(f.description||""))continue;const y=new Date(f.pubDate);isNaN(y)||y.getTime()<a||r.push({title:k,link:f.link,pubDate:f.pubDate,sourceName:c.name,thumbnail:M(f)})}}r.sort((i,c)=>new Date(c.pubDate)-new Date(i.pubDate));const o=r.slice(0,12);if(!o.length){t.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(o.map(async i=>{i.thumbnail||(i.thumbnail=await O(i.link))})),t.innerHTML=`<div class="news-thumb-list">${o.map(S).join("")}</div>`}catch{t.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function V(){document.querySelectorAll(".section-toggle").forEach(t=>{t.addEventListener("click",()=>{const e=t.closest(".sidebar-section"),s=e.closest(".sidebar"),a=e.classList.contains("collapsed");s?.querySelectorAll(".sidebar-section.collapsible").forEach(n=>{n!==e&&n.classList.add("collapsed")}),e.classList.toggle("collapsed",!a)})})}V();x();z();
