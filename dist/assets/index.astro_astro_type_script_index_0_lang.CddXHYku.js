import{f as j,$ as d,r as E,P as C,c as x,a as B,b as _,d as A,M as H,O as k,t as M,e as c,l as g,g as b,T as U,m as P,h as q,p as D,S as v}from"./utils.BKG-sgVB.js";let f=null,y=null,m=1,h="upcoming";function O(t){return`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${t}/headshot/67/current`}const L=['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 15 9"/><path d="M13 7a2.5 2.5 0 1 1 3.5 3.5L15 12l-3.5-3.5Z"/><circle cx="19" cy="5" r="2"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6L12 3Z"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11v2a2 2 0 0 0 2 2h1l4 4v-4h1l7 4V5l-7 4h-1L6 9H5a2 2 0 0 0-2 2Z"/></svg>'];async function F(t){try{return(await fetch(`${H}/draft/${t}`).then(n=>n.json())).drafts?.rounds??null}catch{return null}}function W(t){if(!t)return null;const e=[],n=[],r={};for(const a of t){if(!/^\d+$/.test(a.round))continue;const o=Number(a.round);if(!(o>5)){r[a.round]=a.picks.map(s=>({pick:s.pickNumber,teamId:s.team?.id,note:s.isDrafted&&s.person?`${s.person.fullName} · ${s.person.primaryPosition?.abbreviation??""}`:void 0,personId:s.isDrafted?s.person?.id:void 0}));for(const s of a.picks)s.team?.id===k&&(e.push({round:o,pick:s.pickNumber}),s.isDrafted&&s.person&&n.push({round:o,pick:s.pickNumber,name:s.person.fullName,position:s.person.primaryPosition?.abbreviation??"",personId:s.person.id}))}}return e.length?(e.sort((a,o)=>a.pick-o.pick),{oriolesPickOrder:e,picks:n,roundOrders:r}):null}function z(t){const e=t.startTime?new Date(t.startTime):null,n=t.endTime?new Date(t.endTime):null,r=Date.now();if(e&&r<e.getTime())return"upcoming";const a=(t.oriolesPickOrder??[]).length,o=(t.picks??[]).length;return a&&o>=a||n&&r>n.getTime()?"complete":"live"}function R(t,e){return D(t,e)}function Z(t,e,n){const r=`R${t.round} · #${t.pick} — `;if(!e)return`<span class="draft-ticker-item">${c(r)}on the clock</span>`;const a=e.personId?`<a class="draft-ticker-name" href="${P(e.personId)}" target="_blank" rel="noopener">${c(e.name)}</a>`:D(e.name,n,"draft-ticker-name"),o=e.position?c(` (${e.position})`):"";return`<span class="draft-ticker-item">${c(r)}${a}${o}</span>`}function G(t){const n=(t.oriolesPickOrder??[]).map(a=>`R${a.round} #${a.pick}`).join(", "),r=[`2026 MLB Draft begins ${c(t.dates??"")} at the ${c(t.location??"")}`];return n&&r.push(`Orioles pick order: ${c(n)}`),r.push("Round 1 airs on NBC & Peacock starting 1:00 PM ET Saturday"),r.map(a=>`<span class="draft-ticker-item">${a}</span>`)}function K(t,e){const n=d("draftTickerTrack"),r=d("draftTickerLabel");if(!n)return;if(r&&(r.innerHTML=h==="live"?'<span class="live-dot" aria-hidden="true"></span> Live Picks':h==="complete"?"Final Picks":"O's Picks"),h==="upcoming"){const i=G(t);n.innerHTML=i.join("")+i.join("");return}const a=t.oriolesPickOrder??[],o=t.picks??[];if(!a.length){n.innerHTML='<span class="draft-ticker-item">Orioles pick order unavailable</span>';return}const s=a.map(i=>Z(i,o.find(l=>l.round===i.round&&l.pick===i.pick),e));n.innerHTML=s.join("")+s.join(""),b(n)}function V(t){const e=d("draftRoundTabs");if(!e)return;const n=(t.oriolesPickOrder??[]).map(r=>r.round);e.innerHTML=n.map(r=>`<button class="pill${r===m?" active":""}" data-round="${r}">Round ${r}</button>`).join(""),e.querySelectorAll("button[data-round]").forEach(r=>{r.addEventListener("click",()=>{m=Number(r.dataset.round),e.querySelectorAll("button").forEach(a=>a.classList.toggle("active",a===r)),I(f,y)})})}function I(t,e){const n=d("draftOrder");if(!n)return;const r=t.roundOrders?.[String(m)],a=(t.oriolesPickOrder??[]).find(o=>o.round===m);if(!r?.length){const o=(t.picks??[]).find(s=>s.round===m);n.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${m} order isn't published yet.</p>
      ${a?`<div class="roster-item">
        <span class="roster-pos">R${a.round}</span>
        ${o?R(o.name,e):'<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${a.pick}</span>
      </div>`:""}
      <a class="widget-link" href="https://www.mlb.com/draft/${f?.season??""}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`,b(n);return}n.innerHTML=r.map(o=>{const s=o.teamId===k,i=U[o.teamId]??"",l=o.note?o.personId?`<a class="draft-order-note draft-order-note--pick" href="${P(o.personId)}" target="_blank" rel="noopener">${c(o.note)}</a>`:`<span class="draft-order-note">${c(o.note)}</span>`:"";return`<div class="draft-order-row${s?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${o.pick}</span>
      <img class="draft-order-logo" src="${M(o.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${c(i)}</span>
      ${l}
    </div>`}).join("")}async function N(){try{const[t,e,n]=await Promise.all([fetch("/yardreport/draft-picks.json").then(o=>o.json()),j(),F(2026)]),r=W(n);f=r?{...t,...r}:t,y=e,h=z(f),J(f),K(f,e),V(f),I(f,e);const a=d("draftUpdated");a&&f.lastUpdated&&(a.textContent=`Updated ${E(f.lastUpdated)}`),X(f),tt(f,e),h==="live"&&setTimeout(N,90*1e3)}catch{d("draftTickerTrack").innerHTML='<span class="draft-ticker-item">Draft data unavailable</span>',d("draftOrder").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function J(t){const e=d("draftHeroBadge"),n=d("draftHeroFacts"),r=d("draftHighlights"),a=d("draftHeroLogo");if(a&&(a.src=M(k,56)),e)if(h==="live")e.innerHTML='<span class="live-dot" aria-hidden="true"></span> Draft is live';else if(h==="complete")e.textContent="Draft complete";else{const s=t.startTime?new Date(t.startTime):null,i=s?s.getTime()-Date.now():0;if(i>0){const l=Math.floor(i/864e5),u=Math.floor(i%864e5/36e5),p=Math.floor(i%36e5/6e4);e.textContent=l>0?`${l}d ${u}h until Round 1`:`${u}h ${p}m until Round 1`}else e.textContent="Draft is underway"}if(n){const s=t.oriolesPickOrder??[];n.innerHTML=`
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">When</span>
        <span class="draft-hero-fact-value">${c(t.dates??"")}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Where</span>
        <span class="draft-hero-fact-value">${c(t.location??"")}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Orioles picks</span>
        <span class="draft-hero-fact-value">${s.length} in the first ${s.length?s[s.length-1].round:5} rounds</span>
      </div>
    `}if(r){const s=t.highlights??[],i=g(y,"Jackson Holliday");r.innerHTML=s.map((l,u)=>`
      <div class="draft-highlight-card">
        ${u===0&&i?`<img class="draft-highlight-photo" src="${O(i)}" alt="" loading="lazy">`:`<span class="draft-highlight-icon">${L[u%L.length]}</span>`}
        <div class="draft-highlight-title">${c(l.title)}</div>
        <div class="draft-highlight-body">${c(l.body)}</div>
      </div>
    `).join("")}const o=d("draftBroadcast");o&&(o.innerHTML=(t.broadcast??[]).map(s=>`
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
    `).join(""))}function X(t){const e=d("draftInfo");if(!e)return;const n=t.startTime?new Date(t.startTime):null;let r="";const a=n?n.getTime()-Date.now():0;if(h==="upcoming"&&a>0){const o=Math.floor(a/864e5),s=Math.floor(a%864e5/36e5);r=`<div class="asg-countdown">${o}d ${s}h until Round 1</div>`}else h==="complete"?r='<div class="asg-countdown">Draft complete</div>':r='<div class="asg-countdown">Draft is underway</div>';e.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${c(t.dates??"")}</div>
      ${r}
      <div class="asg-game-venue">${c(t.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(t.oriolesPickOrder??[]).map(o=>`<span class="draft-order-chip">R${o.round} · #${o.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}const Y=new Set(["P","SP","RP","LHP","RHP"]);async function Q(t,e){if(!t)return null;const n=Y.has(e)?"pitching":"hitting";try{const a=(await fetch(`${H}/people/${t}/stats?stats=season&season=${v}&group=${n}`).then(o=>o.json())).stats?.[0]?.splits?.[0]?.stat;return a?n==="hitting"?`${v}: ${a.avg??".---"}/${a.obp??".---"}/${a.slg??".---"}, ${a.homeRuns??0} HR`:`${v}: ${a.era??"-.--"} ERA, ${a.strikeOuts??0} K`:null}catch{return null}}function S(t){return`${t.year}-${t.pick}-${t.name}`.replace(/\W+/g,"")}function $(t,e,n,r){const a=r?`<img class="asg-history-avatar" src="${O(r)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'asg-history-avatar asg-history-avatar--placeholder'}))">`:'<span class="asg-history-avatar asg-history-avatar--placeholder"></span>';return`
    <div class="asg-history-item" data-history-key="${S(t)}">
      ${a}
      <span class="asg-history-year">${t.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${R(t.name,e)} · ${c(t.position)}</div>
        <div class="asg-history-meta">Round ${t.round}, Pick ${t.pick} · ${c(t.school)}</div>
        ${n?`<div class="asg-history-stat">${c(n)}</div>`:""}
      </div>
    </div>
  `}function tt(t,e){const n=d("draftHistory");if(!n)return;const r=[...t.recentPicks??[]].sort((s,i)=>i.year-s.year),a=[...t.notables??[]].sort((s,i)=>i.year-s.year),o=[...r,...a];if(!o.length){n.innerHTML='<span class="sidebar-msg">No history available</span>';return}n.innerHTML=`
    ${r.length?`<div class="roster-group-label">Recent Top Picks</div>${r.map(s=>$(s,e,null,g(e,s.name))).join("")}`:""}
    ${a.length?`<div class="roster-group-label">Franchise Notables</div>${a.map(s=>$(s,e,null,g(e,s.name))).join("")}`:""}
  `,b(n),o.forEach(async s=>{let i=g(e,s.name);i||(i=await q(s.name));const l=await Q(i,s.position),u=n.querySelector(`[data-history-key="${S(s)}"]`);u&&(u.outerHTML=$(s,e,l,i))})}async function et(){const t=d("draftNews");if(t)try{const e=await fetch("/yardreport/feeds.json").then(i=>i.json()),n=await Promise.allSettled(e.map(i=>fetch(`${C}?url=${encodeURIComponent(i.url)}`).then(l=>l.json()).then(l=>({source:i,articles:l.items??[]})))),r=Date.now()-14*864e5,a=/draft/i,o=[];for(const i of n){if(i.status!=="fulfilled")continue;const{source:l,articles:u}=i.value;for(const p of u){const w=x(p.title||"");if(!a.test(w)&&!a.test(p.description||""))continue;const T=new Date(p.pubDate);isNaN(T)||T.getTime()<r||o.push({title:w,link:p.link,pubDate:p.pubDate,sourceName:l.name,thumbnail:B(p)})}}o.sort((i,l)=>new Date(l.pubDate)-new Date(i.pubDate));const s=o.slice(0,12);if(!s.length){t.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(s.map(async i=>{i.thumbnail||(i.thumbnail=await _(i.link))})),t.innerHTML=`<div class="news-thumb-list">${s.map(A).join("")}</div>`}catch{t.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function st(){document.querySelectorAll(".section-toggle").forEach(t=>{t.addEventListener("click",()=>{const e=t.closest(".sidebar-section"),n=e.closest(".sidebar"),r=e.classList.contains("collapsed");n?.querySelectorAll(".sidebar-section.collapsible").forEach(a=>{a!==e&&a.classList.add("collapsed")}),e.classList.toggle("collapsed",!r)})})}st();N();et();
