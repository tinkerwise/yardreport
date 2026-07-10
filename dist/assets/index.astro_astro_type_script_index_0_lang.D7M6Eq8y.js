import{f as R,$ as d,r as N,P as S,c as j,a as I,b as E,d as C,M as y,O as w,e as c,g as v,T as A,m as T,t as B,l as x,p as L,S as $}from"./utils.C0b1U_gP.js";let f=null,M=null,h=1,u="upcoming";async function U(t){try{return(await fetch(`${y}/draft/${t}`).then(r=>r.json())).drafts?.rounds??null}catch{return null}}function _(t){if(!t)return null;const e=[],r=[],o={};for(const s of t){if(!/^\d+$/.test(s.round))continue;const n=Number(s.round);if(!(n>5)){o[s.round]=s.picks.map(a=>({pick:a.pickNumber,teamId:a.team?.id,note:a.isDrafted&&a.person?`${a.person.fullName} · ${a.person.primaryPosition?.abbreviation??""}`:void 0,personId:a.isDrafted?a.person?.id:void 0}));for(const a of s.picks)a.team?.id===w&&(e.push({round:n,pick:a.pickNumber}),a.isDrafted&&a.person&&r.push({round:n,pick:a.pickNumber,name:a.person.fullName,position:a.person.primaryPosition?.abbreviation??"",personId:a.person.id}))}}return e.length?(e.sort((s,n)=>s.pick-n.pick),{oriolesPickOrder:e,picks:r,roundOrders:o}):null}function q(t){const e=t.startTime?new Date(t.startTime):null,r=t.endTime?new Date(t.endTime):null,o=Date.now();if(e&&o<e.getTime())return"upcoming";const s=(t.oriolesPickOrder??[]).length,n=(t.picks??[]).length;return s&&n>=s||r&&o>r.getTime()?"complete":"live"}function P(t,e){return L(t,e)}function F(t,e,r){const o=`R${t.round} · #${t.pick} — `;if(!e)return`<span class="draft-ticker-item">${c(o)}on the clock</span>`;const s=e.personId?`<a class="draft-ticker-name" href="${T(e.personId)}" target="_blank" rel="noopener">${c(e.name)}</a>`:L(e.name,r,"draft-ticker-name"),n=e.position?c(` (${e.position})`):"";return`<span class="draft-ticker-item">${c(o)}${s}${n}</span>`}function W(t){const r=(t.oriolesPickOrder??[]).map(s=>`R${s.round} #${s.pick}`).join(", "),o=[`2026 MLB Draft begins ${c(t.dates??"")} at the ${c(t.location??"")}`];return r&&o.push(`Orioles pick order: ${c(r)}`),o.push("Round 1 airs on NBC & Peacock starting 1:00 PM ET Saturday"),o.map(s=>`<span class="draft-ticker-item">${s}</span>`)}function K(t,e){const r=d("draftTickerTrack"),o=d("draftTickerLabel");if(!r)return;if(o&&(o.innerHTML=u==="live"?'<span class="live-dot" aria-hidden="true"></span> Live Picks':u==="complete"?"Final Picks":"O's Picks"),u==="upcoming"){const i=W(t);r.innerHTML=i.join("")+i.join("");return}const s=t.oriolesPickOrder??[],n=t.picks??[];if(!s.length){r.innerHTML='<span class="draft-ticker-item">Orioles pick order unavailable</span>';return}const a=s.map(i=>F(i,n.find(l=>l.round===i.round&&l.pick===i.pick),e));r.innerHTML=a.join("")+a.join(""),v(r)}function z(t){const e=d("draftRoundTabs");if(!e)return;const r=(t.oriolesPickOrder??[]).map(o=>o.round);e.innerHTML=r.map(o=>`<button class="pill${o===h?" active":""}" data-round="${o}">Round ${o}</button>`).join(""),e.querySelectorAll("button[data-round]").forEach(o=>{o.addEventListener("click",()=>{h=Number(o.dataset.round),e.querySelectorAll("button").forEach(s=>s.classList.toggle("active",s===o)),D(f,M)})})}function D(t,e){const r=d("draftOrder");if(!r)return;const o=t.roundOrders?.[String(h)],s=(t.oriolesPickOrder??[]).find(n=>n.round===h);if(!o?.length){const n=(t.picks??[]).find(a=>a.round===h);r.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${h} order isn't published yet.</p>
      ${s?`<div class="roster-item">
        <span class="roster-pos">R${s.round}</span>
        ${n?P(n.name,e):'<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${s.pick}</span>
      </div>`:""}
      <a class="widget-link" href="https://www.mlb.com/draft/${f?.season??""}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`,v(r);return}r.innerHTML=o.map(n=>{const a=n.teamId===w,i=A[n.teamId]??"",l=n.note?n.personId?`<a class="draft-order-note draft-order-note--pick" href="${T(n.personId)}" target="_blank" rel="noopener">${c(n.note)}</a>`:`<span class="draft-order-note">${c(n.note)}</span>`:"";return`<div class="draft-order-row${a?" draft-order-row--orioles":""}">
      <span class="draft-order-pick">${n.pick}</span>
      <img class="draft-order-logo" src="${B(n.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${c(i)}</span>
      ${l}
    </div>`}).join("")}async function H(){try{const[t,e,r]=await Promise.all([fetch("/yardreport/draft-picks.json").then(n=>n.json()),R(),U(2026)]),o=_(r);f=o?{...t,...o}:t,M=e,u=q(f),V(f),K(f,e),z(f),D(f,e);const s=d("draftUpdated");s&&f.lastUpdated&&(s.textContent=`Updated ${N(f.lastUpdated)}`),X(f),G(f,e),u==="live"&&setTimeout(H,90*1e3)}catch{d("draftTickerTrack").innerHTML='<span class="draft-ticker-item">Draft data unavailable</span>',d("draftOrder").innerHTML='<span class="sidebar-msg">Draft data unavailable</span>'}}function V(t){const e=d("draftHeroBadge"),r=d("draftHeroFacts"),o=d("draftHighlights");if(e)if(u==="live")e.innerHTML='<span class="live-dot" aria-hidden="true"></span> Draft is live';else if(u==="complete")e.textContent="Draft complete";else{const n=t.startTime?new Date(t.startTime):null,a=n?n.getTime()-Date.now():0;if(a>0){const i=Math.floor(a/864e5),l=Math.floor(a%864e5/36e5),p=Math.floor(a%36e5/6e4);e.textContent=i>0?`${i}d ${l}h until Round 1`:`${l}h ${p}m until Round 1`}else e.textContent="Draft is underway"}if(r){const n=t.oriolesPickOrder??[];r.innerHTML=`
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
        <span class="draft-hero-fact-value">${n.length} in the first ${n.length?n[n.length-1].round:5} rounds</span>
      </div>
    `}if(o){const n=t.highlights??[];o.innerHTML=n.map(a=>`
      <div class="draft-highlight-card">
        <svg class="draft-highlight-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Z"/><path d="M12 2c2.5 3 2.5 17 0 20M12 2c-2.5 3-2.5 17 0 20M2.5 9h19M2.5 15h19"/></svg>
        <div class="draft-highlight-title">${c(a.title)}</div>
        <div class="draft-highlight-body">${c(a.body)}</div>
      </div>
    `).join("")}const s=d("draftBroadcast");s&&(s.innerHTML=(t.broadcast??[]).map(n=>`
      <div class="draft-broadcast-day">
        <div class="draft-broadcast-day-label">${c(n.day)}</div>
        ${n.blocks.map(a=>`
          <div class="draft-broadcast-row">
            <span class="draft-broadcast-time">${c(a.time)}</span>
            <span class="draft-broadcast-desc">${c(a.desc)}</span>
            <span class="draft-broadcast-network">${c(a.network)}</span>
          </div>
        `).join("")}
      </div>
    `).join(""))}function X(t){const e=d("draftInfo");if(!e)return;const r=t.startTime?new Date(t.startTime):null;let o="";const s=r?r.getTime()-Date.now():0;if(u==="upcoming"&&s>0){const n=Math.floor(s/864e5),a=Math.floor(s%864e5/36e5);o=`<div class="asg-countdown">${n}d ${a}h until Round 1</div>`}else u==="complete"?o='<div class="asg-countdown">Draft complete</div>':o='<div class="asg-countdown">Draft is underway</div>';e.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${c(t.dates??"")}</div>
      ${o}
      <div class="asg-game-venue">${c(t.location??"")}</div>
    </div>
    <div class="draft-order-summary">
      ${(t.oriolesPickOrder??[]).map(n=>`<span class="draft-order-chip">R${n.round} · #${n.pick}</span>`).join("")}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}const Y=new Set(["P","SP","RP","LHP","RHP"]);async function Z(t,e){if(!t)return null;const r=Y.has(e)?"pitching":"hitting";try{const s=(await fetch(`${y}/people/${t}/stats?stats=season&season=${$}&group=${r}`).then(n=>n.json())).stats?.[0]?.splits?.[0]?.stat;return s?r==="hitting"?`${$}: ${s.avg??".---"}/${s.obp??".---"}/${s.slg??".---"}, ${s.homeRuns??0} HR`:`${$}: ${s.era??"-.--"} ERA, ${s.strikeOuts??0} K`:null}catch{return null}}function O(t){return`${t.year}-${t.pick}-${t.name}`.replace(/\W+/g,"")}function g(t,e,r){return`
    <div class="asg-history-item" data-history-key="${O(t)}">
      <span class="asg-history-year">${t.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${P(t.name,e)} · ${c(t.position)}</div>
        <div class="asg-history-meta">Round ${t.round}, Pick ${t.pick} · ${c(t.school)}</div>
        ${r?`<div class="asg-history-stat">${c(r)}</div>`:""}
      </div>
    </div>
  `}function G(t,e){const r=d("draftHistory");if(!r)return;const o=[...t.recentPicks??[]].sort((a,i)=>i.year-a.year),s=[...t.notables??[]].sort((a,i)=>i.year-a.year),n=[...o,...s];if(!n.length){r.innerHTML='<span class="sidebar-msg">No history available</span>';return}r.innerHTML=`
    ${o.length?`<div class="roster-group-label">Recent Top Picks</div>${o.map(a=>g(a,e,null)).join("")}`:""}
    ${s.length?`<div class="roster-group-label">Franchise Notables</div>${s.map(a=>g(a,e,null)).join("")}`:""}
  `,v(r),n.forEach(async a=>{const i=x(e,a.name),l=await Z(i,a.position);if(!l)return;const p=r.querySelector(`[data-history-key="${O(a)}"]`);p&&(p.outerHTML=g(a,e,l))})}async function J(){const t=d("draftNews");if(t)try{const e=await fetch("/yardreport/feeds.json").then(i=>i.json()),r=await Promise.allSettled(e.map(i=>fetch(`${S}?url=${encodeURIComponent(i.url)}`).then(l=>l.json()).then(l=>({source:i,articles:l.items??[]})))),o=Date.now()-14*864e5,s=/draft/i,n=[];for(const i of r){if(i.status!=="fulfilled")continue;const{source:l,articles:p}=i.value;for(const m of p){const k=j(m.title||"");if(!s.test(k)&&!s.test(m.description||""))continue;const b=new Date(m.pubDate);isNaN(b)||b.getTime()<o||n.push({title:k,link:m.link,pubDate:m.pubDate,sourceName:l.name,thumbnail:I(m)})}}n.sort((i,l)=>new Date(l.pubDate)-new Date(i.pubDate));const a=n.slice(0,12);if(!a.length){t.innerHTML='<span class="sidebar-msg">No recent Draft news</span>';return}await Promise.all(a.map(async i=>{i.thumbnail||(i.thumbnail=await E(i.link))})),t.innerHTML=`<div class="news-thumb-list">${a.map(C).join("")}</div>`}catch{t.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function Q(){document.querySelectorAll(".section-toggle").forEach(t=>{t.addEventListener("click",()=>{const e=t.closest(".sidebar-section"),r=e.closest(".sidebar"),o=e.classList.contains("collapsed");r?.querySelectorAll(".sidebar-section.collapsible").forEach(s=>{s!==e&&s.classList.add("collapsed")}),e.classList.toggle("collapsed",!o)})})}Q();H();J();
