import"./theme.B2ePjmLX.js";import{f as E,$ as d,r as C,P as x,c as B,a as _,b as A,d as U,M,O as k,t as P,e as c,l as g,g as b,T as q,m as D,i as F,p as O,S as v}from"./utils.7xPXhALe.js";let f=null,y=null,m=1,h="upcoming";function R(e){return`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${e}/headshot/67/current`}const L=['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 15 9"/><path d="M13 7a2.5 2.5 0 1 1 3.5 3.5L15 12l-3.5-3.5Z"/><circle cx="19" cy="5" r="2"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6L12 3Z"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11v2a2 2 0 0 0 2 2h1l4 4v-4h1l7 4V5l-7 4h-1L6 9H5a2 2 0 0 0-2 2Z"/></svg>'];async function W(e){try{return(await fetch(`${M}/draft/${e}`).then(r=>r.json())).drafts?.rounds??null}catch{return null}}function z(e){if(!e)return null;const t=[],r=[],n={};for(const a of e){if(!/^\d+$/.test(a.round))continue;const o=Number(a.round);if(!(o>5)){n[a.round]=a.picks.map(s=>({pick:s.pickNumber,teamId:s.team?.id,note:s.isDrafted&&s.person?`${s.person.fullName} · ${s.person.primaryPosition?.abbreviation??""}`:void 0,personId:s.isDrafted?s.person?.id:void 0}));for(const s of a.picks)s.team?.id===k&&(t.push({round:o,pick:s.pickNumber}),s.isDrafted&&s.person&&r.push({round:o,pick:s.pickNumber,name:s.person.fullName,position:s.person.primaryPosition?.abbreviation??"",personId:s.person.id}))}}return t.length?(t.sort((a,o)=>a.pick-o.pick),{oriolesPickOrder:t,picks:r,roundOrders:n}):null}function Z(e){const t=e.startTime?new Date(e.startTime):null,r=e.endTime?new Date(e.endTime):null,n=Date.now();if(t&&n<t.getTime())return"upcoming";const a=(e.oriolesPickOrder??[]).length,o=(e.picks??[]).length;return a&&o>=a||r&&n>r.getTime()?"complete":"live"}function S(e,t){return O(e,t)}function G(e,t,r){const n=`R${e.round} · #${e.pick} — `;if(!t)return`<span class="draft-ticker-item">${c(n)}on the clock</span>`;const a=t.personId?`<a class="draft-ticker-name" href="${D(t.personId)}" target="_blank" rel="noopener">${c(t.name)}</a>`:O(t.name,r,"draft-ticker-name"),o=t.position?c(` (${t.position})`):"";return`<span class="draft-ticker-item">${c(n)}${a}${o}</span>`}function K(e){const r=(e.oriolesPickOrder??[]).map(a=>`R${a.round} #${a.pick}`).join(", "),n=[`2026 MLB Draft begins ${c(e.dates??"")} at the ${c(e.location??"")}`];return r&&n.push(`Orioles pick order: ${c(r)}`),n.push("Round 1 airs on NBC & Peacock starting 1:00 PM ET Saturday"),n.map(a=>`<span class="draft-ticker-item">${a}</span>`)}function V(e,t){const r=d("draftTickerTrack"),n=d("draftTickerLabel");if(!r)return;if(n&&(n.innerHTML=h==="live"?'<span class="live-dot" aria-hidden="true"></span> Live Picks':h==="complete"?"Final Picks":"O's Picks"),h==="upcoming"){const i=K(e);r.innerHTML=i.join("")+i.join("");return}const a=e.oriolesPickOrder??[],o=e.picks??[];if(!a.length){r.innerHTML='<span class="draft-ticker-item">Orioles pick order unavailable</span>';return}const s=a.map(i=>G(i,o.find(l=>l.round===i.round&&l.pick===i.pick),t));r.innerHTML=s.join("")+s.join(""),b(r)}function J(e){const t=d("draftRoundTabs");if(!t)return;const r=(e.oriolesPickOrder??[]).map(n=>n.round);t.innerHTML=r.map(n=>`<button class="pill${n===m?" active":""}" data-round="${n}">Round ${n}</button>`).join(""),t.querySelectorAll("button[data-round]").forEach(n=>{n.addEventListener("click",()=>{m=Number(n.dataset.round),t.querySelectorAll("button").forEach(a=>a.classList.toggle("active",a===n)),I(f,y)})})}function I(e,t){const r=d("draftOrder");if(!r)return;const n=e.roundOrders?.[String(m)],a=(e.oriolesPickOrder??[]).find(o=>o.round===m);if(!n?.length){const o=(e.picks??[]).find(s=>s.round===m);r.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${m} order isn't published yet.</p>
      ${a?`<div class="roster-item">
        <span class="roster-pos">R${a.round}</span>
        ${o?S(o.name,t):'<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${a.pick}</span>
      </div>`:""}
      <a class="widget-link" href="https://www.mlb.com/draft/${f?.season??""}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`,b(r);return}r.innerHTML=n.map(o=>{const s=o.teamId===k,i=q[o.teamId]??"",l=o.note?o.personId?`<a class="draft-order-note draft-order-note--pick" href="${D(o.personId)}" target="_blank" rel="noopener">${c(o.note)}</a>`:`<span class="draft-order-note">${c(o.note)}</span>`:"";return`<div class="draft-order-row${s?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${o.pick}</span>
      <img class="draft-order-logo" src="${P(o.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${c(i)}</span>
      ${l}
    </div>`}).join("")}async function N(){try{const[e,t,r]=await Promise.all([fetch("/yardreport/draft-picks.json").then(o=>o.json()),E(),W(2026)]),n=z(r);f=n?{...e,...n}:e,y=t,h=Z(f),X(f),V(f,t),J(f),I(f,t);const a=d("draftUpdated");a&&f.lastUpdated&&(a.textContent=`Updated ${C(f.lastUpdated)}`),Y(f),se(f,t),Q(f),h==="live"&&setTimeout(N,90*1e3)}catch{d("draftTickerTrack").innerHTML='<span class="draft-ticker-item">Draft data unavailable</span>',d("draftOrder").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function X(e){const t=d("draftHeroBadge"),r=d("draftHeroFacts"),n=d("draftHighlights"),a=d("draftHeroLogo");if(a&&(a.src=P(k,56)),t)if(h==="live")t.innerHTML='<span class="live-dot" aria-hidden="true"></span> Draft is live';else if(h==="complete")t.textContent="Draft complete";else{const s=e.startTime?new Date(e.startTime):null,i=s?s.getTime()-Date.now():0;if(i>0){const l=Math.floor(i/864e5),u=Math.floor(i%864e5/36e5),p=Math.floor(i%36e5/6e4);t.textContent=l>0?`${l}d ${u}h until Round 1`:`${u}h ${p}m until Round 1`}else t.textContent="Draft is underway"}if(r){const s=e.oriolesPickOrder??[];r.innerHTML=`
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">When</span>
        <span class="draft-hero-fact-value">${c(e.dates??"")}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Where</span>
        <span class="draft-hero-fact-value">${c(e.location??"")}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Orioles picks</span>
        <span class="draft-hero-fact-value">${s.length} in the first ${s.length?s[s.length-1].round:5} rounds</span>
      </div>
    `}if(n){const s=e.highlights??[],i=g(y,"Jackson Holliday");n.innerHTML=s.map((l,u)=>`
      <div class="draft-highlight-card">
        <div class="draft-highlight-head">
          ${u===0&&i?`<img class="draft-highlight-photo" src="${R(i)}" alt="" loading="lazy">`:`<span class="draft-highlight-icon">${L[u%L.length]}</span>`}
          <div class="draft-highlight-title">${c(l.title)}</div>
        </div>
        <div class="draft-highlight-body">${c(l.body)}</div>
      </div>
    `).join("")}const o=d("draftBroadcast");o&&(o.innerHTML=(e.broadcast??[]).map(s=>`
      <div class="draft-broadcast-day">
        <div class="draft-broadcast-day-label">${c(s.day)}</div>
        ${s.blocks.map(i=>`
          <div class="draft-broadcast-row">
            <span class="draft-broadcast-time">${c(i.time)}</span>
            <span class="draft-broadcast-desc">${c(i.desc)}</span>
            <span class="draft-broadcast-network">${c(i.network)}</span>
          </div>
        `).join("")}
      </div>
    `).join(""))}function Y(e){const t=d("draftInfo");if(!t)return;const r=e.startTime?new Date(e.startTime):null;let n="";const a=r?r.getTime()-Date.now():0;if(h==="upcoming"&&a>0){const o=Math.floor(a/864e5),s=Math.floor(a%864e5/36e5);n=`<div class="asg-countdown">${o}d ${s}h until Round 1</div>`}else h==="complete"?n='<div class="asg-countdown">Draft complete</div>':n='<div class="asg-countdown">Draft is underway</div>';t.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${c(e.dates??"")}</div>
      ${n}
      <div class="asg-game-venue">${c(e.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(e.oriolesPickOrder??[]).map(o=>`<span class="draft-order-chip">R${o.round} · #${o.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}function H(e){return e?.length?`<div class="draft-links-list">${e.map(t=>`<a class="draft-link-item" href="${c(t.url)}" target="_blank" rel="noopener">${c(t.label)}</a>`).join("")}</div>`:'<span class="sidebar-msg">Unavailable</span>'}function Q(e){const t=d("draftLiveCoverage"),r=d("draftSources");t&&(t.innerHTML=H(e.liveCoverage)),r&&(r.innerHTML=H(e.sources))}const ee=new Set(["P","SP","RP","LHP","RHP"]);async function te(e,t){if(!e)return null;const r=ee.has(t)?"pitching":"hitting";try{const a=(await fetch(`${M}/people/${e}/stats?stats=season&season=${v}&group=${r}`).then(o=>o.json())).stats?.[0]?.splits?.[0]?.stat;return a?r==="hitting"?`${v}: ${a.avg??".---"}/${a.obp??".---"}/${a.slg??".---"}, ${a.homeRuns??0} HR`:`${v}: ${a.era??"-.--"} ERA, ${a.strikeOuts??0} K`:null}catch{return null}}function j(e){return`${e.year}-${e.pick}-${e.name}`.replace(/\W+/g,"")}function $(e,t,r,n){const a=n?`<img class="asg-history-avatar" src="${R(n)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'asg-history-avatar asg-history-avatar--placeholder'}))">`:'<span class="asg-history-avatar asg-history-avatar--placeholder"></span>';return`
    <div class="asg-history-item" data-history-key="${j(e)}">
      ${a}
      <span class="asg-history-year">${e.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${S(e.name,t)} · ${c(e.position)}</div>
        <div class="asg-history-meta">Round ${e.round}, Pick ${e.pick} · ${c(e.school)}</div>
        ${r?`<div class="asg-history-stat">${c(r)}</div>`:""}
      </div>
    </div>
  `}function se(e,t){const r=d("draftHistory");if(!r)return;const n=[...e.recentPicks??[]].sort((s,i)=>i.year-s.year),a=[...e.notables??[]].sort((s,i)=>i.year-s.year),o=[...n,...a];if(!o.length){r.innerHTML='<span class="sidebar-msg">No history available</span>';return}r.innerHTML=`
    ${n.length?`<div class="roster-group-label">Recent Top Picks</div>${n.map(s=>$(s,t,null,g(t,s.name))).join("")}`:""}
    ${a.length?`<div class="roster-group-label">Franchise Notables</div>${a.map(s=>$(s,t,null,g(t,s.name))).join("")}`:""}
  `,b(r),o.forEach(async s=>{let i=g(t,s.name);i||(i=await F(s.name));const l=await te(i,s.position),u=r.querySelector(`[data-history-key="${j(s)}"]`);u&&(u.outerHTML=$(s,t,l,i))})}async function ae(){const e=d("draftNews");if(e)try{const t=await fetch("/yardreport/feeds.json").then(i=>i.json()),r=await Promise.allSettled(t.map(i=>fetch(`${x}?url=${encodeURIComponent(i.url)}`).then(l=>l.json()).then(l=>({source:i,articles:l.items??[]})))),n=Date.now()-14*864e5,a=/draft/i,o=[];for(const i of r){if(i.status!=="fulfilled")continue;const{source:l,articles:u}=i.value;for(const p of u){const w=B(p.title||"");if(!a.test(w)&&!a.test(p.description||""))continue;const T=new Date(p.pubDate);isNaN(T)||T.getTime()<n||o.push({title:w,link:p.link,pubDate:p.pubDate,sourceName:l.name,thumbnail:_(p)})}}o.sort((i,l)=>new Date(l.pubDate)-new Date(i.pubDate));const s=o.slice(0,12);if(!s.length){e.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(s.map(async i=>{i.thumbnail||(i.thumbnail=await A(i.link))})),e.innerHTML=`<div class="news-thumb-list">${s.map(U).join("")}</div>`}catch{e.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function re(){document.querySelectorAll(".section-toggle").forEach(e=>{e.addEventListener("click",()=>{const t=e.closest(".sidebar-section"),r=t.closest(".sidebar"),n=t.classList.contains("collapsed");r?.querySelectorAll(".sidebar-section.collapsible").forEach(a=>{a!==t&&a.classList.add("collapsed")}),t.classList.toggle("collapsed",!n)})})}re();N();ae();
