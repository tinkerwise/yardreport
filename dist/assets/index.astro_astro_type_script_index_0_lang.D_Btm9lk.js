import"./theme._WpEJEkW.js";import{A as e,B as t,D as n,E as r,I as i,M as a,P as o,R as s,S as c,T as l,f as u,l as d,m as f,o as p,t as m,u as h,w as g,x as _,z as v}from"./utils.BYHmSwy8.js";var y=null,b=null,x=1,S=`upcoming`;function C(e){return`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${e}/headshot/67/current`}var w=[`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>`,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 15 9"/><path d="M13 7a2.5 2.5 0 1 1 3.5 3.5L15 12l-3.5-3.5Z"/><circle cx="19" cy="5" r="2"/></svg>`,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6L12 3Z"/></svg>`,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11v2a2 2 0 0 0 2 2h1l4 4v-4h1l7 4V5l-7 4h-1L6 9H5a2 2 0 0 0-2 2Z"/></svg>`];async function T(e){try{return(await fetch(`https://statsapi.mlb.com/api/v1/draft/${e}`).then(e=>e.json())).drafts?.rounds??null}catch{return null}}function E(e){if(!e)return null;let t=[],n=[],r={};for(let i of e){if(!/^\d+$/.test(i.round))continue;let e=Number(i.round);if(!(e>5)){r[i.round]=i.picks.map(e=>({pick:e.pickNumber,teamId:e.team?.id,note:e.isDrafted&&e.person?`${e.person.fullName} · ${e.person.primaryPosition?.abbreviation??``}`:void 0,personId:e.isDrafted?e.person?.id:void 0}));for(let r of i.picks)r.team?.id===110&&(t.push({round:e,pick:r.pickNumber}),r.isDrafted&&r.person&&n.push({round:e,pick:r.pickNumber,name:r.person.fullName,position:r.person.primaryPosition?.abbreviation??``,personId:r.person.id}))}}return t.length?(t.sort((e,t)=>e.pick-t.pick),{oriolesPickOrder:t,picks:n,roundOrders:r}):null}function D(e){return a(e??``).toLowerCase().trim()}function O(e){let t=new Map;if(!e)return t;for(let n of e)for(let e of n.picks)e.isDrafted&&e.person&&t.set(D(e.person.fullName),{personId:e.person.id,pickNumber:e.pickNumber,teamId:e.team?.id});return t}function k(e){let t=(e||``).split(`/`)[0].toUpperCase();return t===`C`?`c`:[`SS`,`2B`,`3B`,`1B`,`MIF`].includes(t)?`if`:[`OF`,`CF`,`RF`,`LF`].includes(t)?`of`:t===`RHP`?`rhp`:t===`LHP`?`lhp`:`other`}function A(e,r,i){let a=m(`draftProspectBoard`);if(!a)return;let o=e.bigBoard??[];if(!o.length){a.innerHTML=`<span class="sidebar-msg">Unavailable</span>`;return}let s=o.filter(e=>!r.has(D(e.name))),l=s.slice(0,10),u=o.filter(e=>r.has(D(e.name))).map(e=>({...e,info:r.get(D(e.name))})).sort((e,t)=>t.info.pickNumber-e.info.pickNumber)[0],f=u?`<div class="prospect-board-status">Last off the board: <a href="${c(u.info.personId)}" target="_blank" rel="noopener">${d(u.name)}</a> — Pick #${u.info.pickNumber}${t[u.info.teamId]?` (${d(t[u.info.teamId])})`:``}</div>`:``,p=l.map(e=>`
    <div class="prospect-row">
      <span class="prospect-rank">${e.rank}</span>
      <div class="prospect-info">
        ${g(e.name,i,`prospect-name`)}
        <span class="prospect-meta">${d(e.school)}</span>
      </div>
      <span class="prospect-pos-badge prospect-pos-badge--${k(e.position)}">${d(e.position)}</span>
    </div>
  `).join(``);a.innerHTML=`
    <div class="prospect-board-head">
      <span class="prospect-board-count">${s.length} remaining on our board</span>
    </div>
    <div class="prospect-board-list">${p||`<span class="sidebar-msg">Board fully drafted</span>`}</div>
    ${f}
  `,n(a)}function j(e){let t=e.startTime?new Date(e.startTime):null,n=e.endTime?new Date(e.endTime):null,r=Date.now();if(t&&r<t.getTime())return`upcoming`;let i=(e.oriolesPickOrder??[]).length,a=(e.picks??[]).length;return i&&a>=i||n&&r>n.getTime()?`complete`:`live`}function M(e,t){return g(e,t)}function N(e,t,n){let r=`R${e.round} · #${e.pick} — `;if(!t)return`<span class="draft-ticker-item">${d(r)}on the clock</span>`;let i=t.personId?`<a class="draft-ticker-name" href="${c(t.personId)}" target="_blank" rel="noopener">${d(t.name)}</a>`:g(t.name,n,`draft-ticker-name`),a=t.position?d(` (${t.position})`):``;return`<span class="draft-ticker-item">${d(r)}${i}${a}</span>`}function P(e){let t=(e.oriolesPickOrder??[]).map(e=>`R${e.round} #${e.pick}`).join(`, `),n=[`2026 MLB Draft begins ${d(e.dates??``)} at the ${d(e.location??``)}`];return t&&n.push(`Orioles pick order: ${d(t)}`),n.push(`Round 1 airs on NBC & Peacock starting 1:00 PM ET Saturday`),n.map(e=>`<span class="draft-ticker-item">${e}</span>`)}function F(e,t){let r=m(`draftTickerTrack`),i=m(`draftTickerLabel`);if(!r)return;if(i&&(i.innerHTML=S===`live`?`<span class="live-dot" aria-hidden="true"></span> Live Picks`:S===`complete`?`Final Picks`:`O's Picks`),S===`upcoming`){let t=P(e);r.innerHTML=t.join(``)+t.join(``);return}let a=e.oriolesPickOrder??[],o=e.picks??[];if(!a.length){r.innerHTML=`<span class="draft-ticker-item">Orioles pick order unavailable</span>`;return}let s=a.map(e=>N(e,o.find(t=>t.round===e.round&&t.pick===e.pick),t));r.innerHTML=s.join(``)+s.join(``),n(r)}function I(e){let t=m(`draftRoundTabs`);t&&(t.innerHTML=(e.oriolesPickOrder??[]).map(e=>e.round).map(e=>`<button class="pill${e===x?` active`:``}" data-round="${e}">Round ${e}</button>`).join(``),t.querySelectorAll(`button[data-round]`).forEach(e=>{e.addEventListener(`click`,()=>{x=Number(e.dataset.round),t.querySelectorAll(`button`).forEach(t=>t.classList.toggle(`active`,t===e)),L(y,b)})}))}function L(e,r){let i=m(`draftOrder`);if(!i)return;let a=e.roundOrders?.[String(x)],s=(e.oriolesPickOrder??[]).find(e=>e.round===x);if(!a?.length){let t=(e.picks??[]).find(e=>e.round===x);i.innerHTML=`<div class="draft-order-empty">
      <p>Full Round ${x} order isn't published yet.</p>
      ${s?`<div class="roster-item">
        <span class="roster-pos">R${s.round}</span>
        ${t?M(t.name,r):`<span class="roster-name roster-name--pending">Orioles on the clock</span>`}
        <span class="roster-badge roster-badge--info">Pick #${s.pick}</span>
      </div>`:``}
      <a class="widget-link" href="https://www.mlb.com/draft/${y?.season??``}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`,n(i);return}i.innerHTML=a.map(e=>{let n=e.teamId===110,r=t[e.teamId]??``,i=e.note?e.personId?`<a class="draft-order-note draft-order-note--pick" href="${c(e.personId)}" target="_blank" rel="noopener">${d(e.note)}</a>`:`<span class="draft-order-note">${d(e.note)}</span>`:``;return`<div class="draft-order-row${n?` draft-order-row--orioles`:``}">
      <span class="draft-order-pick">${e.pick}</span>
      <img class="draft-order-logo" src="${o(e.teamId,18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${d(r)}</span>
      ${i}
    </div>`}).join(``)}async function R(){try{let[e,t,n]=await Promise.all([fetch(`/yardreport/draft-picks.json`).then(e=>e.json()),f(),T(2026)]),r=E(n);y=r?{...e,...r}:e,b=t,S=j(y),z(y),F(y,t),I(y),L(y,t),A(y,O(n),t);let i=m(`draftUpdated`);i&&y.lastUpdated&&(i.textContent=`Updated ${l(y.lastUpdated)}`),B(y),q(y,t),H(y),S===`live`&&setTimeout(R,9e4)}catch{m(`draftTickerTrack`).innerHTML=`<span class="draft-ticker-item">Draft data unavailable</span>`,m(`draftOrder`).innerHTML=`<span class="sidebar-msg">Draft data unavailable</span>`}}function z(e){let t=m(`draftHeroBadge`),n=m(`draftHeroFacts`),r=m(`draftHighlights`),i=m(`draftHeroLogo`);if(i&&(i.src=o(110,56)),t){if(S===`live`)t.innerHTML=`<span class="live-dot" aria-hidden="true"></span> Draft is live`;else if(S===`complete`)t.textContent=`Draft complete`;else{let n=e.startTime?new Date(e.startTime):null,r=n?n.getTime()-Date.now():0;if(r>0){let e=Math.floor(r/864e5),n=Math.floor(r%864e5/36e5),i=Math.floor(r%36e5/6e4);t.textContent=e>0?`${e}d ${n}h until Round 1`:`${n}h ${i}m until Round 1`}else t.textContent=`Draft is underway`}}if(n){let t=e.oriolesPickOrder??[];n.innerHTML=`
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">When</span>
        <span class="draft-hero-fact-value">${d(e.dates??``)}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Where</span>
        <span class="draft-hero-fact-value">${d(e.location??``)}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Orioles picks</span>
        <span class="draft-hero-fact-value">${t.length} in the first ${t.length?t[t.length-1].round:5} rounds</span>
      </div>
    `}if(r){let t=e.highlights??[],n=_(b,`Jackson Holliday`);r.innerHTML=t.map((e,t)=>`
      <div class="draft-highlight-card">
        <div class="draft-highlight-head">
          ${t===0&&n?`<img class="draft-highlight-photo" src="${C(n)}" alt="" loading="lazy">`:`<span class="draft-highlight-icon">${w[t%w.length]}</span>`}
          <div class="draft-highlight-title">${d(e.title)}</div>
        </div>
        <div class="draft-highlight-body">${d(e.body)}</div>
      </div>
    `).join(``)}let a=m(`draftBroadcast`);a&&(a.innerHTML=(e.broadcast??[]).map(e=>`
      <div class="draft-broadcast-day">
        <div class="draft-broadcast-day-label">${d(e.day)}</div>
        ${e.blocks.map(e=>`
          <div class="draft-broadcast-row">
            <span class="draft-broadcast-time">${d(e.time)}</span>
            <span class="draft-broadcast-desc">${d(e.desc)}</span>
            <span class="draft-broadcast-network">${d(e.network)}</span>
          </div>
        `).join(``)}
      </div>
    `).join(``))}function B(e){let t=m(`draftInfo`);if(!t)return;let n=e.startTime?new Date(e.startTime):null,r=``,i=n?n.getTime()-Date.now():0;r=S===`upcoming`&&i>0?`<div class="asg-countdown">${Math.floor(i/864e5)}d ${Math.floor(i%864e5/36e5)}h until Round 1</div>`:S===`complete`?`<div class="asg-countdown">Draft complete</div>`:`<div class="asg-countdown">Draft is underway</div>`,t.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${d(e.dates??``)}</div>
      ${r}
      <div class="asg-game-venue">${d(e.location??``)}</div>
    </div>
    <div class="draft-order-summary">
      ${(e.oriolesPickOrder??[]).map(e=>`<span class="draft-order-chip">R${e.round} · #${e.pick}</span>`).join(``)}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `}function V(e){return e?.length?`<div class="draft-links-list">${e.map(e=>`<a class="draft-link-item" href="${d(e.url)}" target="_blank" rel="noopener">${d(e.label)}</a>`).join(``)}</div>`:`<span class="sidebar-msg">Unavailable</span>`}function H(e){let t=m(`draftLiveCoverage`),n=m(`draftSources`);t&&(t.innerHTML=V(e.liveCoverage)),n&&(n.innerHTML=V(e.sources))}var U=new Set([`P`,`SP`,`RP`,`LHP`,`RHP`]);async function W(e,t){if(!e)return null;let n=U.has(t)?`pitching`:`hitting`;try{let t=(await fetch(`${i}/people/${e}/stats?stats=season&season=${v}&group=${n}`).then(e=>e.json())).stats?.[0]?.splits?.[0]?.stat;return t?n===`hitting`?`${v}: ${t.avg??`.---`}/${t.obp??`.---`}/${t.slg??`.---`}, ${t.homeRuns??0} HR`:`${v}: ${t.era??`-.--`} ERA, ${t.strikeOuts??0} K`:null}catch{return null}}function G(e){return`${e.year}-${e.pick}-${e.name}`.replace(/\W+/g,``)}function K(e,t,n,r){let i=r?`<img class="asg-history-avatar" src="${C(r)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'asg-history-avatar asg-history-avatar--placeholder'}))">`:`<span class="asg-history-avatar asg-history-avatar--placeholder"></span>`;return`
    <div class="asg-history-item" data-history-key="${G(e)}">
      ${i}
      <span class="asg-history-year">${e.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${M(e.name,t)} · ${d(e.position)}</div>
        <div class="asg-history-meta">Round ${e.round}, Pick ${e.pick} · ${d(e.school)}</div>
        ${n?`<div class="asg-history-stat">${d(n)}</div>`:``}
      </div>
    </div>
  `}function q(t,r){let i=m(`draftHistory`);if(!i)return;let a=[...t.recentPicks??[]].sort((e,t)=>t.year-e.year),o=[...t.notables??[]].sort((e,t)=>t.year-e.year),s=[...a,...o];if(!s.length){i.innerHTML=`<span class="sidebar-msg">No history available</span>`;return}i.innerHTML=`
    ${a.length?`<div class="roster-group-label">Recent Top Picks</div>${a.map(e=>K(e,r,null,_(r,e.name))).join(``)}`:``}
    ${o.length?`<div class="roster-group-label">Franchise Notables</div>${o.map(e=>K(e,r,null,_(r,e.name))).join(``)}`:``}
  `,n(i),s.forEach(async t=>{let n=_(r,t.name);n||=await e(t.name);let a=await W(n,t.position),o=i.querySelector(`[data-history-key="${G(t)}"]`);o&&(o.outerHTML=K(t,r,a,n))})}async function J(){let e=m(`draftNews`);if(e)try{let t=await fetch(`/yardreport/feeds.json`).then(e=>e.json()),n=await Promise.allSettled(t.map(e=>fetch(`${s}?url=${encodeURIComponent(e.url)}`).then(e=>e.json()).then(t=>({source:e,articles:t.items??[]})))),i=Date.now()-12096e5,a=/draft/i,o=[];for(let e of n){if(e.status!==`fulfilled`)continue;let{source:t,articles:n}=e.value;for(let e of n){let n=p(e.title||``);if(!a.test(n)&&!a.test(e.description||``))continue;let r=new Date(e.pubDate);isNaN(r)||r.getTime()<i||o.push({title:n,link:e.link,pubDate:e.pubDate,sourceName:t.name,thumbnail:h(e)})}}o.sort((e,t)=>new Date(t.pubDate)-new Date(e.pubDate));let c=o.slice(0,12);if(!c.length){e.innerHTML=`<span class="sidebar-msg">No recent Draft news</span>`;return}await Promise.all(c.map(async e=>{e.thumbnail||=await u(e.link)})),e.innerHTML=`<div class="news-thumb-list">${c.map(r).join(``)}</div>`}catch{e.innerHTML=`<span class="sidebar-msg">Unavailable</span>`}}function Y(){document.querySelectorAll(`.section-toggle`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.closest(`.sidebar-section`),n=t.closest(`.sidebar`),r=t.classList.contains(`collapsed`);n?.querySelectorAll(`.sidebar-section.collapsible`).forEach(e=>{e!==t&&e.classList.add(`collapsed`)}),t.classList.toggle(`collapsed`,!r)})})}Y(),R(),J();