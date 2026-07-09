import{f as v,$ as p,r as b,P as $,c as y,a as k,b as w,d as D,e as c,O as T,T as L,t as M,l as P,s as H}from"./utils.BcDYeCfu.js";let l=null;function h(s,e){const t=P(e,s);return t?`<a class="roster-name" href="${H(t)}" target="_blank" rel="noopener">${c(s)}</a>`:`<span class="roster-name">${c(s)}</span>`}function I(s,e){const t=p("draftPicks"),n=s.picks??[],a=s.oriolesPickOrder??[];if(!a.length){t.innerHTML='<span class="sidebar-msg">Pick order unavailable</span>';return}t.innerHTML=a.map(r=>{const i=n.find(o=>o.round===r.round&&o.pick===r.pick);return i?`<div class="roster-item">
      <span class="roster-pos">R${r.round}</span>
      ${h(i.name,e)}
      <span class="roster-pos">${c(i.position??"")}</span>
      <span class="roster-badge roster-badge--info">${c(i.school??"")}</span>
    </div>`:`<div class="roster-item">
        <span class="roster-pos">R${r.round}</span>
        <span class="roster-name roster-name--pending">Pick #${r.pick} — on the clock</span>
      </div>`}).join("")}async function O(){try{const[s,e]=await Promise.all([fetch("/yardreport/draft-picks.json").then(n=>n.json()),v()]);l=s,I(l,e),j(l);const t=p("draftUpdated");t&&l.lastUpdated&&(t.textContent=`Updated ${b(l.lastUpdated)}`),R(l),N(l,e)}catch{p("draftPicks").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function j(s){const e=p("draftOrder");if(!e)return;const t=s.round1Order??[];if(!t.length){e.innerHTML='<span class="sidebar-msg">Draft order unavailable</span>';return}e.innerHTML=t.map(n=>{const a=n.teamId===T,r=L[n.teamId]??"";return`<div class="draft-order-row${a?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${n.pick}</span>
      <img class="draft-order-logo" src="${M(n.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${c(r)}</span>
      ${n.note?`<span class="draft-order-note">${c(n.note)}</span>`:""}
    </div>`}).join("")}function R(s){const e=p("draftInfo");if(!e)return;const t=new Date("2026-07-11T19:00:00-04:00");let n="";const a=t.getTime()-Date.now();if(a>0){const r=Math.floor(a/864e5),i=Math.floor(a%864e5/36e5);n=`<div class="asg-countdown">${r}d ${i}h until Round 1</div>`}else n='<div class="asg-countdown">Draft is underway</div>';e.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${c(s.dates??"")}</div>
      ${n}
      <div class="asg-game-venue">${c(s.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(s.oriolesPickOrder??[]).map(r=>`<span class="draft-order-chip">R${r.round} · #${r.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}function N(s,e){const t=p("draftHistory");if(!t)return;const n=[...s.history??[]].sort((a,r)=>r.year-a.year);if(!n.length){t.innerHTML='<span class="sidebar-msg">No history available</span>';return}t.innerHTML=n.map(a=>`
    <div class="asg-history-item">
      <span class="asg-history-year">${a.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${h(a.name,e)} · ${c(a.position)}</div>
        <div class="asg-history-meta">Round ${a.round}, Pick ${a.pick} · ${c(a.school)}</div>
      </div>
    </div>
  `).join("")}async function E(){const s=p("draftNews");if(s)try{const e=await fetch("/yardreport/feeds.json").then(o=>o.json()),t=await Promise.allSettled(e.map(o=>fetch(`${$}?url=${encodeURIComponent(o.url)}`).then(d=>d.json()).then(d=>({source:o,articles:d.items??[]})))),n=Date.now()-14*864e5,a=/draft/i,r=[];for(const o of t){if(o.status!=="fulfilled")continue;const{source:d,articles:g}=o.value;for(const f of g){const u=y(f.title||"");if(!a.test(u)&&!a.test(f.description||""))continue;const m=new Date(f.pubDate);isNaN(m)||m.getTime()<n||r.push({title:u,link:f.link,pubDate:f.pubDate,sourceName:d.name,thumbnail:k(f)})}}r.sort((o,d)=>new Date(d.pubDate)-new Date(o.pubDate));const i=r.slice(0,8);if(!i.length){s.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(i.map(async o=>{o.thumbnail||(o.thumbnail=await w(o.link))})),s.innerHTML=`<div class="news-thumb-list">${i.map(D).join("")}</div>`}catch{s.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function U(){document.querySelectorAll(".section-toggle").forEach(s=>{s.addEventListener("click",()=>{const e=s.closest(".sidebar-section"),t=e.closest(".sidebar"),n=e.classList.contains("collapsed");t?.querySelectorAll(".sidebar-section.collapsible").forEach(a=>{a!==e&&a.classList.add("collapsed")}),e.classList.toggle("collapsed",!n)})})}U();O();E();
