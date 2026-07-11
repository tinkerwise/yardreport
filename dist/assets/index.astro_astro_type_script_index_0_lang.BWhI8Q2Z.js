import"./theme.B2ePjmLX.js";import{f as E,$ as d,r as x,P as _,c as F,a as A,b as U,d as q,M as N,O as L,t as I,e as c,l as $,g as k,T,m as H,p as M,i as z,j as W,S as y}from"./utils.B_atCdGv.js";let f=null,P=null,g=1,h="upcoming";function R(e){return`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${e}/headshot/67/current`}const D=['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 15 9"/><path d="M13 7a2.5 2.5 0 1 1 3.5 3.5L15 12l-3.5-3.5Z"/><circle cx="19" cy="5" r="2"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6L12 3Z"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11v2a2 2 0 0 0 2 2h1l4 4v-4h1l7 4V5l-7 4h-1L6 9H5a2 2 0 0 0-2 2Z"/></svg>'];async function G(e){try{return(await fetch(`${N}/draft/${e}`).then(n=>n.json())).drafts?.rounds??null}catch{return null}}function Z(e){if(!e)return null;const t=[],n=[],s={};for(const a of e){if(!/^\d+$/.test(a.round))continue;const o=Number(a.round);if(!(o>5)){s[a.round]=a.picks.map(r=>({pick:r.pickNumber,teamId:r.team?.id,note:r.isDrafted&&r.person?`${r.person.fullName} · ${r.person.primaryPosition?.abbreviation??""}`:void 0,personId:r.isDrafted?r.person?.id:void 0}));for(const r of a.picks)r.team?.id===L&&(t.push({round:o,pick:r.pickNumber}),r.isDrafted&&r.person&&n.push({round:o,pick:r.pickNumber,name:r.person.fullName,position:r.person.primaryPosition?.abbreviation??"",personId:r.person.id}))}}return t.length?(t.sort((a,o)=>a.pick-o.pick),{oriolesPickOrder:t,picks:n,roundOrders:s}):null}function b(e){return W(e??"").toLowerCase().trim()}function K(e){const t=new Map;if(!e)return t;for(const n of e)for(const s of n.picks)!s.isDrafted||!s.person||t.set(b(s.person.fullName),{personId:s.person.id,pickNumber:s.pickNumber,teamId:s.team?.id});return t}function V(e){const t=(e||"").split("/")[0].toUpperCase();return t==="C"?"c":["SS","2B","3B","1B","MIF"].includes(t)?"if":["OF","CF","RF","LF"].includes(t)?"of":t==="RHP"?"rhp":t==="LHP"?"lhp":"other"}function J(e,t,n){const s=d("draftProspectBoard");if(!s)return;const a=e.bigBoard??[];if(!a.length){s.innerHTML='<span class="sidebar-msg">Unavailable</span>';return}const o=a.filter(p=>!t.has(b(p.name))),r=o.slice(0,10),l=a.filter(p=>t.has(b(p.name))).map(p=>({...p,info:t.get(b(p.name))})).sort((p,v)=>v.info.pickNumber-p.info.pickNumber)[0],u=l?`<div class="prospect-board-status">Last off the board: <a href="${H(l.info.personId)}" target="_blank" rel="noopener">${c(l.name)}</a> — Pick #${l.info.pickNumber}${T[l.info.teamId]?` (${c(T[l.info.teamId])})`:""}</div>`:"",m=r.map(p=>`
    <div class="prospect-row">
      <span class="prospect-rank">${p.rank}</span>
      <div class="prospect-info">
        ${M(p.name,n,"prospect-name")}
        <span class="prospect-meta">${c(p.school)}</span>
      </div>
      <span class="prospect-pos-badge prospect-pos-badge--${V(p.position)}">${c(p.position)}</span>
    </div>
  `).join("");s.innerHTML=`
    <div class="prospect-board-head">
      <span class="prospect-board-count">${o.length} remaining on our board</span>
    </div>
    <div class="prospect-board-list">${m||'<span class="sidebar-msg">Board fully drafted</span>'}</div>
    ${u}
  `,k(s)}function X(e){const t=e.startTime?new Date(e.startTime):null,n=e.endTime?new Date(e.endTime):null,s=Date.now();if(t&&s<t.getTime())return"upcoming";const a=(e.oriolesPickOrder??[]).length,o=(e.picks??[]).length;return a&&o>=a||n&&s>n.getTime()?"complete":"live"}function S(e,t){return M(e,t)}function Y(e,t,n){const s=`R${e.round} · #${e.pick} — `;if(!t)return`<span class="draft-ticker-item">${c(s)}on the clock</span>`;const a=t.personId?`<a class="draft-ticker-name" href="${H(t.personId)}" target="_blank" rel="noopener">${c(t.name)}</a>`:M(t.name,n,"draft-ticker-name"),o=t.position?c(` (${t.position})`):"";return`<span class="draft-ticker-item">${c(s)}${a}${o}</span>`}function Q(e){const n=(e.oriolesPickOrder??[]).map(a=>`R${a.round} #${a.pick}`).join(", "),s=[`2026 MLB Draft begins ${c(e.dates??"")} at the ${c(e.location??"")}`];return n&&s.push(`Orioles pick order: ${c(n)}`),s.push("Round 1 airs on NBC & Peacock starting 1:00 PM ET Saturday"),s.map(a=>`<span class="draft-ticker-item">${a}</span>`)}function ee(e,t){const n=d("draftTickerTrack"),s=d("draftTickerLabel");if(!n)return;if(s&&(s.innerHTML=h==="live"?'<span class="live-dot" aria-hidden="true"></span> Live Picks':h==="complete"?"Final Picks":"O's Picks"),h==="upcoming"){const i=Q(e);n.innerHTML=i.join("")+i.join("");return}const a=e.oriolesPickOrder??[],o=e.picks??[];if(!a.length){n.innerHTML='<span class="draft-ticker-item">Orioles pick order unavailable</span>';return}const r=a.map(i=>Y(i,o.find(l=>l.round===i.round&&l.pick===i.pick),t));n.innerHTML=r.join("")+r.join(""),k(n)}function te(e){const t=d("draftRoundTabs");if(!t)return;const n=(e.oriolesPickOrder??[]).map(s=>s.round);t.innerHTML=n.map(s=>`<button class="pill${s===g?" active":""}" data-round="${s}">Round ${s}</button>`).join(""),t.querySelectorAll("button[data-round]").forEach(s=>{s.addEventListener("click",()=>{g=Number(s.dataset.round),t.querySelectorAll("button").forEach(a=>a.classList.toggle("active",a===s)),j(f,P)})})}function j(e,t){const n=d("draftOrder");if(!n)return;const s=e.roundOrders?.[String(g)],a=(e.oriolesPickOrder??[]).find(o=>o.round===g);if(!s?.length){const o=(e.picks??[]).find(r=>r.round===g);n.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${g} order isn't published yet.</p>
      ${a?`<div class="roster-item">
        <span class="roster-pos">R${a.round}</span>
        ${o?S(o.name,t):'<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${a.pick}</span>
      </div>`:""}
      <a class="widget-link" href="https://www.mlb.com/draft/${f?.season??""}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`,k(n);return}n.innerHTML=s.map(o=>{const r=o.teamId===L,i=T[o.teamId]??"",l=o.note?o.personId?`<a class="draft-order-note draft-order-note--pick" href="${H(o.personId)}" target="_blank" rel="noopener">${c(o.note)}</a>`:`<span class="draft-order-note">${c(o.note)}</span>`:"";return`<div class="draft-order-row${r?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${o.pick}</span>
      <img class="draft-order-logo" src="${I(o.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${c(i)}</span>
      ${l}
    </div>`}).join("")}async function B(){try{const[e,t,n]=await Promise.all([fetch("/yardreport/draft-picks.json").then(o=>o.json()),E(),G(2026)]),s=Z(n);f=s?{...e,...s}:e,P=t,h=X(f),se(f),ee(f,t),te(f),j(f,t),J(f,K(n),t);const a=d("draftUpdated");a&&f.lastUpdated&&(a.textContent=`Updated ${x(f.lastUpdated)}`),ae(f),ie(f,t),re(f),h==="live"&&setTimeout(B,90*1e3)}catch{d("draftTickerTrack").innerHTML='<span class="draft-ticker-item">Draft data unavailable</span>',d("draftOrder").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function se(e){const t=d("draftHeroBadge"),n=d("draftHeroFacts"),s=d("draftHighlights"),a=d("draftHeroLogo");if(a&&(a.src=I(L,56)),t)if(h==="live")t.innerHTML='<span class="live-dot" aria-hidden="true"></span> Draft is live';else if(h==="complete")t.textContent="Draft complete";else{const r=e.startTime?new Date(e.startTime):null,i=r?r.getTime()-Date.now():0;if(i>0){const l=Math.floor(i/864e5),u=Math.floor(i%864e5/36e5),m=Math.floor(i%36e5/6e4);t.textContent=l>0?`${l}d ${u}h until Round 1`:`${u}h ${m}m until Round 1`}else t.textContent="Draft is underway"}if(n){const r=e.oriolesPickOrder??[];n.innerHTML=`
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
        <span class="draft-hero-fact-value">${r.length} in the first ${r.length?r[r.length-1].round:5} rounds</span>
      </div>
    `}if(s){const r=e.highlights??[],i=$(P,"Jackson Holliday");s.innerHTML=r.map((l,u)=>`
      <div class="draft-highlight-card">
        <div class="draft-highlight-head">
          ${u===0&&i?`<img class="draft-highlight-photo" src="${R(i)}" alt="" loading="lazy">`:`<span class="draft-highlight-icon">${D[u%D.length]}</span>`}
          <div class="draft-highlight-title">${c(l.title)}</div>
        </div>
        <div class="draft-highlight-body">${c(l.body)}</div>
      </div>
    `).join("")}const o=d("draftBroadcast");o&&(o.innerHTML=(e.broadcast??[]).map(r=>`
      <div class="draft-broadcast-day">
        <div class="draft-broadcast-day-label">${c(r.day)}</div>
        ${r.blocks.map(i=>`
          <div class="draft-broadcast-row">
            <span class="draft-broadcast-time">${c(i.time)}</span>
            <span class="draft-broadcast-desc">${c(i.desc)}</span>
            <span class="draft-broadcast-network">${c(i.network)}</span>
          </div>
        `).join("")}
      </div>
    `).join(""))}function ae(e){const t=d("draftInfo");if(!t)return;const n=e.startTime?new Date(e.startTime):null;let s="";const a=n?n.getTime()-Date.now():0;if(h==="upcoming"&&a>0){const o=Math.floor(a/864e5),r=Math.floor(a%864e5/36e5);s=`<div class="asg-countdown">${o}d ${r}h until Round 1</div>`}else h==="complete"?s='<div class="asg-countdown">Draft complete</div>':s='<div class="asg-countdown">Draft is underway</div>';t.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${c(e.dates??"")}</div>
      ${s}
      <div class="asg-game-venue">${c(e.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(e.oriolesPickOrder??[]).map(o=>`<span class="draft-order-chip">R${o.round} · #${o.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}function O(e){return e?.length?`<div class="draft-links-list">${e.map(t=>`<a class="draft-link-item" href="${c(t.url)}" target="_blank" rel="noopener">${c(t.label)}</a>`).join("")}</div>`:'<span class="sidebar-msg">Unavailable</span>'}function re(e){const t=d("draftLiveCoverage"),n=d("draftSources");t&&(t.innerHTML=O(e.liveCoverage)),n&&(n.innerHTML=O(e.sources))}const ne=new Set(["P","SP","RP","LHP","RHP"]);async function oe(e,t){if(!e)return null;const n=ne.has(t)?"pitching":"hitting";try{const a=(await fetch(`${N}/people/${e}/stats?stats=season&season=${y}&group=${n}`).then(o=>o.json())).stats?.[0]?.splits?.[0]?.stat;return a?n==="hitting"?`${y}: ${a.avg??".---"}/${a.obp??".---"}/${a.slg??".---"}, ${a.homeRuns??0} HR`:`${y}: ${a.era??"-.--"} ERA, ${a.strikeOuts??0} K`:null}catch{return null}}function C(e){return`${e.year}-${e.pick}-${e.name}`.replace(/\W+/g,"")}function w(e,t,n,s){const a=s?`<img class="asg-history-avatar" src="${R(s)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'asg-history-avatar asg-history-avatar--placeholder'}))">`:'<span class="asg-history-avatar asg-history-avatar--placeholder"></span>';return`
    <div class="asg-history-item" data-history-key="${C(e)}">
      ${a}
      <span class="asg-history-year">${e.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${S(e.name,t)} · ${c(e.position)}</div>
        <div class="asg-history-meta">Round ${e.round}, Pick ${e.pick} · ${c(e.school)}</div>
        ${n?`<div class="asg-history-stat">${c(n)}</div>`:""}
      </div>
    </div>
  `}function ie(e,t){const n=d("draftHistory");if(!n)return;const s=[...e.recentPicks??[]].sort((r,i)=>i.year-r.year),a=[...e.notables??[]].sort((r,i)=>i.year-r.year),o=[...s,...a];if(!o.length){n.innerHTML='<span class="sidebar-msg">No history available</span>';return}n.innerHTML=`
    ${s.length?`<div class="roster-group-label">Recent Top Picks</div>${s.map(r=>w(r,t,null,$(t,r.name))).join("")}`:""}
    ${a.length?`<div class="roster-group-label">Franchise Notables</div>${a.map(r=>w(r,t,null,$(t,r.name))).join("")}`:""}
  `,k(n),o.forEach(async r=>{let i=$(t,r.name);i||(i=await z(r.name));const l=await oe(i,r.position),u=n.querySelector(`[data-history-key="${C(r)}"]`);u&&(u.outerHTML=w(r,t,l,i))})}async function ce(){const e=d("draftNews");if(e)try{const t=await fetch("/yardreport/feeds.json").then(i=>i.json()),n=await Promise.allSettled(t.map(i=>fetch(`${_}?url=${encodeURIComponent(i.url)}`).then(l=>l.json()).then(l=>({source:i,articles:l.items??[]})))),s=Date.now()-14*864e5,a=/draft/i,o=[];for(const i of n){if(i.status!=="fulfilled")continue;const{source:l,articles:u}=i.value;for(const m of u){const p=F(m.title||"");if(!a.test(p)&&!a.test(m.description||""))continue;const v=new Date(m.pubDate);isNaN(v)||v.getTime()<s||o.push({title:p,link:m.link,pubDate:m.pubDate,sourceName:l.name,thumbnail:A(m)})}}o.sort((i,l)=>new Date(l.pubDate)-new Date(i.pubDate));const r=o.slice(0,12);if(!r.length){e.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(r.map(async i=>{i.thumbnail||(i.thumbnail=await U(i.link))})),e.innerHTML=`<div class="news-thumb-list">${r.map(q).join("")}</div>`}catch{e.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function le(){document.querySelectorAll(".section-toggle").forEach(e=>{e.addEventListener("click",()=>{const t=e.closest(".sidebar-section"),n=t.closest(".sidebar"),s=t.classList.contains("collapsed");n?.querySelectorAll(".sidebar-section.collapsible").forEach(a=>{a!==t&&a.classList.add("collapsed")}),t.classList.toggle("collapsed",!s)})})}le();B();ce();
