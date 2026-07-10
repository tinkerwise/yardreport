import{f as L,$ as u,r as P,P as R,c as H,a as D,b as M,d as O,O as S,T as E,t as j,e as d,l as k,s as I,M as N,S as $}from"./utils.DD0dn35b.js";let l=null,v=null,f=1;function y(t,e){const a=k(e,t);return a?`<a class="roster-name" href="${I(a)}" target="_blank" rel="noopener">${d(t)}</a>`:`<span class="roster-name">${d(t)}</span>`}function A(t,e){const a=e?`R${t.round} · #${t.pick} — ${e.name}${e.position?` (${e.position})`:""}`:`R${t.round} · #${t.pick} — on the clock`;return`<span class="draft-ticker-item">${d(a)}</span>`}function C(t){const e=u("draftTickerTrack");if(!e)return;const a=t.oriolesPickOrder??[],n=t.picks??[];if(!a.length){e.innerHTML='<span class="draft-ticker-item">Orioles pick order unavailable</span>';return}const s=a.map(r=>A(r,n.find(o=>o.round===r.round&&o.pick===r.pick)));e.innerHTML=s.join("")+s.join("")}function U(t){const e=u("draftRoundTabs");if(!e)return;const a=(t.oriolesPickOrder??[]).map(n=>n.round);e.innerHTML=a.map(n=>`<button class="pill${n===f?" active":""}" data-round="${n}">Round ${n}</button>`).join(""),e.querySelectorAll("button[data-round]").forEach(n=>{n.addEventListener("click",()=>{f=Number(n.dataset.round),e.querySelectorAll("button").forEach(s=>s.classList.toggle("active",s===n)),w(l,v)})})}function w(t,e){const a=u("draftOrder");if(!a)return;const n=t.roundOrders?.[String(f)],s=(t.oriolesPickOrder??[]).find(r=>r.round===f);if(!n?.length){const r=(t.picks??[]).find(o=>o.round===f);a.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${f} order isn't published yet.</p>
      ${s?`<div class="roster-item">
        <span class="roster-pos">R${s.round}</span>
        ${r?y(r.name,e):'<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${s.pick}</span>
      </div>`:""}
      <a class="widget-link" href="https://www.mlb.com/draft/${l?.season??""}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`;return}a.innerHTML=n.map(r=>{const o=r.teamId===S,i=E[r.teamId]??"";return`<div class="draft-order-row${o?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${r.pick}</span>
      <img class="draft-order-logo" src="${j(r.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${d(i)}</span>
      ${r.note?`<span class="draft-order-note">${d(r.note)}</span>`:""}
    </div>`}).join("")}async function _(){try{const[t,e]=await Promise.all([fetch("/yardreport/draft-picks.json").then(n=>n.json()),L()]);l=t,v=e,C(l),U(l),w(l,e);const a=u("draftUpdated");a&&l.lastUpdated&&(a.textContent=`Updated ${P(l.lastUpdated)}`),q(l),F(l,e)}catch{u("draftTickerTrack").innerHTML='<span class="draft-ticker-item">Draft data unavailable</span>',u("draftOrder").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function q(t){const e=u("draftInfo");if(!e)return;const a=new Date("2026-07-11T19:00:00-04:00");let n="";const s=a.getTime()-Date.now();if(s>0){const r=Math.floor(s/864e5),o=Math.floor(s%864e5/36e5);n=`<div class="asg-countdown">${r}d ${o}h until Round 1</div>`}else n='<div class="asg-countdown">Draft is underway</div>';e.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${d(t.dates??"")}</div>
      ${n}
      <div class="asg-game-venue">${d(t.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(t.oriolesPickOrder??[]).map(r=>`<span class="draft-order-chip">R${r.round} · #${r.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}const B=new Set(["P","SP","RP","LHP","RHP"]);async function x(t,e){if(!t)return null;const a=B.has(e)?"pitching":"hitting";try{const s=(await fetch(`${N}/people/${t}/stats?stats=season&season=${$}&group=${a}`).then(r=>r.json())).stats?.[0]?.splits?.[0]?.stat;return s?a==="hitting"?`${$}: ${s.avg??".---"}/${s.obp??".---"}/${s.slg??".---"}, ${s.homeRuns??0} HR`:`${$}: ${s.era??"-.--"} ERA, ${s.strikeOuts??0} K`:null}catch{return null}}function T(t){return`${t.year}-${t.pick}-${t.name}`.replace(/\W+/g,"")}function h(t,e,a){return`
    <div class="asg-history-item" data-history-key="${T(t)}">
      <span class="asg-history-year">${t.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${y(t.name,e)} · ${d(t.position)}</div>
        <div class="asg-history-meta">Round ${t.round}, Pick ${t.pick} · ${d(t.school)}</div>
        ${a?`<div class="asg-history-stat">${d(a)}</div>`:""}
      </div>
    </div>
  `}function F(t,e){const a=u("draftHistory");if(!a)return;const n=[...t.recentPicks??[]].sort((o,i)=>i.year-o.year),s=[...t.notables??[]].sort((o,i)=>i.year-o.year),r=[...n,...s];if(!r.length){a.innerHTML='<span class="sidebar-msg">No history available</span>';return}a.innerHTML=`
    ${n.length?`<div class="roster-group-label">Recent Top Picks</div>${n.map(o=>h(o,e,null)).join("")}`:""}
    ${s.length?`<div class="roster-group-label">Franchise Notables</div>${s.map(o=>h(o,e,null)).join("")}`:""}
  `,r.forEach(async o=>{const i=k(e,o.name),c=await x(i,o.position);if(!c)return;const m=a.querySelector(`[data-history-key="${T(o)}"]`);m&&(m.outerHTML=h(o,e,c))})}async function K(){const t=u("draftNews");if(t)try{const e=await fetch("/yardreport/feeds.json").then(i=>i.json()),a=await Promise.allSettled(e.map(i=>fetch(`${R}?url=${encodeURIComponent(i.url)}`).then(c=>c.json()).then(c=>({source:i,articles:c.items??[]})))),n=Date.now()-14*864e5,s=/draft/i,r=[];for(const i of a){if(i.status!=="fulfilled")continue;const{source:c,articles:m}=i.value;for(const p of m){const g=H(p.title||"");if(!s.test(g)&&!s.test(p.description||""))continue;const b=new Date(p.pubDate);isNaN(b)||b.getTime()<n||r.push({title:g,link:p.link,pubDate:p.pubDate,sourceName:c.name,thumbnail:D(p)})}}r.sort((i,c)=>new Date(c.pubDate)-new Date(i.pubDate));const o=r.slice(0,12);if(!o.length){t.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(o.map(async i=>{i.thumbnail||(i.thumbnail=await M(i.link))})),t.innerHTML=`<div class="news-thumb-list">${o.map(O).join("")}</div>`}catch{t.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function z(){document.querySelectorAll(".section-toggle").forEach(t=>{t.addEventListener("click",()=>{const e=t.closest(".sidebar-section"),a=e.closest(".sidebar"),n=e.classList.contains("collapsed");a?.querySelectorAll(".sidebar-section.collapsible").forEach(s=>{s!==e&&s.classList.add("collapsed")}),e.classList.toggle("collapsed",!n)})})}z();_();K();
