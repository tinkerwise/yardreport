import"./theme._WpEJEkW.js";import{D as e,E as t,I as n,P as r,R as i,T as a,f as o,k as s,l as c,m as l,o as u,t as d,u as f,w as p,x as m,z as h}from"./utils.BYHmSwy8.js";import{n as g,t as _}from"./weather.DCfX4oTJ.js";import{n as v}from"./scores.D2rEBPd4.js";function y(e,t){let n=e.note?`<span class="roster-badge roster-badge--replacement" title="${c(e.note)}">Replacement</span>`:``,i=e.playerId??m(t,e.name),a=i?`<a class="roster-name" href="${s(i)}" target="_blank" rel="noopener">${c(e.name)}</a>`:`<span class="roster-name" data-name-lookup="${c(e.name)}">${c(e.name)}</span>`;return`<div class="roster-item">
    <img class="asg-team-logo" src="${r(e.teamId,16)}" alt="" width="16" height="16" loading="lazy">
    ${a}
    ${e.pos?`<span class="roster-pos">${c(e.pos)}</span>`:``}
    ${n}
  </div>`}function b(t,n,r){let i=d(t);if(i){if(!n){i.innerHTML=`<span class="sidebar-msg">Roster unavailable</span>`;return}i.innerHTML=`
    <div class="roster-group-label">Starters</div>
    ${n.starters.map(e=>y(e,r)).join(``)}
    <div class="roster-group-label">Reserves</div>
    ${n.reserves.map(e=>y(e,r)).join(``)}
    <div class="roster-group-label">Pitchers</div>
    ${n.pitchers.map(e=>y(e,r)).join(``)}
  `,e(i)}}async function x(){try{let[e,t]=await Promise.all([fetch(`/yardreport/all-star-roster.json`).then(e=>e.json()),l()]);b(`asgAL`,e.al,t),b(`asgNL`,e.nl,t);let n=d(`asgUpdated`);n&&e.lastUpdated&&(n.textContent=`Rosters updated ${a(e.lastUpdated)}`),D(e),S(e.homeRunDerby,t)}catch{d(`asgAL`).innerHTML=`<span class="sidebar-msg">Roster unavailable</span>`,d(`asgNL`).innerHTML=`<span class="sidebar-msg">Roster unavailable</span>`}}function S(t,n){let i=d(`asgDerby`);if(!i)return;if(!t){i.innerHTML=`<span class="sidebar-msg">Unavailable</span>`;return}let a=(t.participants??[]).map(e=>`
    <div class="roster-item">
      <img class="asg-team-logo" src="${r(e.teamId,16)}" alt="" width="16" height="16" loading="lazy">
      ${p(e.name,n)}
    </div>
  `).join(``),o=t.spotsOpen?`<div class="roster-item"><span class="roster-name roster-name--pending">${t.spotsOpen} spot${t.spotsOpen===1?``:`s`} still open</span></div>`:``;i.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${c(t.date??``)}</div>
      <div class="asg-game-venue">${c(t.venue??``)}</div>
    </div>
    <div class="roster-group-label">Field</div>
    ${a}
    ${o}
    <a class="widget-link" href="https://www.mlb.com/all-star/home-run-derby" target="_blank" rel="noopener">Home Run Derby hub ↗</a>
  `,e(i)}function C(e){let t=[];for(let[n,r]of[[`al`,`AL`],[`nl`,`NL`]])for(let[i,a]of[[`starters`,`Starter`],[`reserves`,`Reserve`],[`pitchers`,`Pitcher`]])for(let o of e[n]?.[i]??[])o.teamId===110&&o.playerId&&t.push({...o,league:r,selectionType:a});return t}var w=new Set([`ALAS`,`NLAS`]);async function T(e){try{let t=((await fetch(`https://statsapi.mlb.com/api/v1/people/${e}/awards`).then(e=>e.json())).awards??[]).filter(e=>w.has(e.id)).map(e=>e.season).filter(Boolean);return[...new Set(t)].sort()}catch{return[]}}function E(e,t){let n=`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${e.playerId}/headshot/67/current`,r=t.filter(e=>String(e)!==String(h)),i=r.length?`${r.length+1} selections: ${t.join(`, `)}`:`First career selection`;return`
    <a class="asg-spotlight-card" href="https://www.mlb.com/player/${e.playerId}" target="_blank" rel="noopener">
      <img class="asg-spotlight-photo" src="${n}" alt="" width="64" height="64" loading="lazy">
      <div class="asg-spotlight-body">
        <div class="asg-spotlight-kicker">Orioles All-Star</div>
        <div class="asg-spotlight-name">${c(e.name)}</div>
        <div class="asg-spotlight-meta">${c(e.pos??``)} · ${c(e.league)} ${c(e.selectionType)}${e.note?` · ${c(e.note)}`:``}</div>
        <div class="asg-spotlight-history">${c(i)}</div>
      </div>
    </a>`}async function D(e){let t=d(`asgOriolesSpotlight`);if(!t)return;let n=C(e);if(!n.length){t.innerHTML=``;return}t.innerHTML=`<div class="asg-spotlight">${(await Promise.all(n.map(async e=>E(e,await T(e.playerId))))).join(``)}</div>`}async function O(e){if(!e)return null;try{return await fetch(`${n}/venues/${e}?hydrate=location`).then(e=>e.json()).then(e=>e.venues?.[0]?.location??null)}catch{return null}}async function k(e){let t=d(`asgLiveTracker`);if(!t)return;let n=e.status?.abstractGameState===`Live`,r=e.linescore??{},i=r.innings??[],a=Math.max(i.length,9),o=`<th class="box-team-col"></th>`;for(let e=1;e<=a;e++)o+=`<th>${e}</th>`;o+=`<th class="box-total">R</th><th class="box-total">H</th><th class="box-total">E</th>`;let s=(t,n)=>{let o=`<td class="box-team-col">${t}</td>`;for(let e=0;e<a;e++)o+=`<td>${i[e]?.[n]?.runs??(e<i.length?`0`:``)}</td>`;let s=r.teams?.[n]??{},c=s.runs??e.teams?.[n]?.score??``;return o+=`<td class="box-total">${c}</td><td class="box-total">${s.hits??``}</td><td class="box-total">${s.errors??``}</td>`,o},l=await v(e.gamePk),u=l.length?l.map(e=>{let{about:t,result:n}=e,r=`${t.halfInning===`top`?`T`:`B`}${t.inning}`;return`<div class="scr-play">
        <span class="scr-inn">${c(r)}</span>
        <span></span>
        <span class="scr-desc">${c(n.description??``)}</span>
        <span class="scr-score">${c(`AL ${n.awayScore??`?`}, NL ${n.homeScore??`?`}`)}</span>
      </div>`}).join(``):`<div class="scr-empty">Scoreless so far</div>`;t.innerHTML=`
    <div class="asg-team-col asg-live-tracker">
      <div class="asg-team-head asg-live-tracker-head">
        ${n?`<span class="live-dot" aria-hidden="true"></span> Live Tracker`:`Final Box Score`}
      </div>
      <div style="overflow-x:auto;">
        <table class="box-score-table">
          <thead><tr>${o}</tr></thead>
          <tbody>
            <tr class="box-score-row">${s(`AL`,`away`)}</tr>
            <tr class="box-score-row">${s(`NL`,`home`)}</tr>
          </tbody>
        </table>
      </div>
      <div class="box-sum-hdr">Scoring Plays</div>
      ${u}
    </div>
  `}async function A(){let e=d(`asgGameInfo`);if(e)try{let t=(await fetch(`${n}/schedule?sportId=1&gameType=A&season=${h}&hydrate=linescore`).then(e=>e.json())).dates?.[0]?.games?.[0];if(!t){e.innerHTML=`<span class="sidebar-msg">Schedule unavailable</span>`;return}let[r]=await Promise.all([O(t.venue?.id),_([t])]),i=g(t),a=new Date(t.gameDate),o=a.toLocaleDateString(`en-US`,{weekday:`long`,month:`long`,day:`numeric`}),s=a.toLocaleTimeString(`en-US`,{hour:`numeric`,minute:`2-digit`,timeZoneName:`short`}),l=t.status?.abstractGameState??`Preview`,u=``;if(l===`Live`||l===`Final`){let e=t.teams?.away??{},n=t.teams?.home??{};u=`<div class="asg-score">
        <span class="asg-score-team">AL ${e.score??0}</span>
        <span class="asg-score-sep">–</span>
        <span class="asg-score-team">NL ${n.score??0}</span>
      </div>
      <div class="asg-status">${c(l===`Live`?`Live`:t.status?.detailedState??`Final`)}</div>`}let d=``;if(l===`Preview`){let e=a.getTime()-Date.now();e>0&&(d=`<div class="asg-countdown">${Math.floor(e/864e5)}d ${Math.floor(e%864e5/36e5)}h until first pitch</div>`)}let f=r?[r.city,r.stateAbbrev].filter(Boolean).join(`, `):``;e.innerHTML=`
      <div class="asg-game-card">
        <div class="asg-game-date">${c(o)}</div>
        <div class="asg-game-time">${c(s)}</div>
        ${d}
        ${u}
        <div class="asg-game-venue">${c(t.venue?.name??``)}</div>
        ${f?`<div class="asg-game-loc">${c(f)}</div>`:``}
        ${i?`<div class="asg-game-wx">${i.emoji} ${i.temp}°F, ${c(i.condition)}</div>`:``}
      </div>
      <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">All-Star Game hub on MLB.com ↗</a>
    `,(l===`Live`||l===`Final`)&&k(t)}catch{e.innerHTML=`<span class="sidebar-msg">Unavailable</span>`}}var j=[{year:2025,result:`NL won 4–3 in first-ever swing-off tiebreaker`,venue:`Truist Park, Atlanta`},{year:2024,result:`AL won 5–3`,mvp:`Jarren Duran (BOS)`,venue:`Globe Life Field, Arlington`},{year:2023,result:`NL won 3–2`,mvp:`Elias Díaz (COL)`,venue:`T-Mobile Park, Seattle`},{year:2021,result:`AL won 5–2`,mvp:`Shohei Ohtani (LAA)`,venue:`Coors Field, Denver`},{year:2019,result:`AL won 4–3`,mvp:`Shane Bieber (CLE)`,venue:`Progressive Field, Cleveland`},{year:2018,result:`AL won 8–6 (10 innings)`,mvp:`Alex Bregman (HOU)`,venue:`Nationals Park, Washington`}];function M(){let e=d(`asgHistory`);e&&(e.innerHTML=j.map(e=>`
    <div class="asg-history-item">
      <span class="asg-history-year">${e.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${c(e.result)}</div>
        <div class="asg-history-meta">${e.mvp?`MVP: ${c(e.mvp)} · `:``}${c(e.venue)}</div>
      </div>
    </div>
  `).join(``))}var N=[{title:`2026 All-Star Game Selection Show`,url:`https://www.youtube.com/watch?v=ldRZCQQHQAs`,videoId:`ldRZCQQHQAs`},{title:`2026 All-Star Game starters announced`,url:`https://www.youtube.com/watch?v=YqMsXm2XUd0`,videoId:`YqMsXm2XUd0`}],P=[{id:`PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu`,label:`MLB Fastcast`},{id:`PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE`,label:`MLB Top Plays`}];function F(e){return e.match(/v=([^&]+)/)?.[1]||e.match(/youtu\.be\/([^?&]+)/)?.[1]||``}async function I(e){try{let t=`${i}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${e.id}`)}`,n=(await fetch(t).then(e=>e.json())).items??[],r=n.find(e=>/all.?star/i.test(e.title||``))||n[0];if(!r)return null;let a=F(r.link||``);return{title:u(r.title),label:e.label,thumb:r.thumbnail||(a?`https://i.ytimg.com/vi/${a}/mqdefault.jpg`:``),url:r.link,videoId:a}}catch{return null}}function L(e){return`<div class="media-item media-item--video" data-video-id="${c(e.videoId??``)}" data-video-url="${c(e.url)}">
    <div class="video-thumb-wrap">
      <img class="video-thumb" src="${c(e.thumb??`https://i.ytimg.com/vi/${e.videoId}/mqdefault.jpg`)}" alt="" loading="lazy">
      <svg class="video-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div class="video-info">
      <span class="video-channel">${c(e.label??`MLB`)}</span>
      <span class="video-title">${c(e.title)}</span>
    </div>
  </div>`}function R(e){let t=document.getElementById(`videoTheater`);t||(t=document.createElement(`div`),t.id=`videoTheater`,t.className=`video-theater`,t.innerHTML=`
      <div class="video-theater-backdrop"></div>
      <div class="video-theater-content">
        <button class="video-theater-close" aria-label="Close">&times;</button>
        <div class="video-theater-player"></div>
      </div>`,document.body.appendChild(t),t.querySelector(`.video-theater-backdrop`).addEventListener(`click`,z),t.querySelector(`.video-theater-close`).addEventListener(`click`,z),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&z()})),t.querySelector(`.video-theater-player`).innerHTML=`<iframe src="https://www.youtube.com/embed/${e}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`,t.classList.add(`active`),document.body.style.overflow=`hidden`}function z(){let e=document.getElementById(`videoTheater`);e&&(e.classList.remove(`active`),e.querySelector(`.video-theater-player`).innerHTML=``,document.body.style.overflow=``)}async function B(){let e=d(`asgMedia`);if(!e)return;let t=await Promise.allSettled(P.map(I));e.innerHTML=`<div class="media-list">${[...N,...t.filter(e=>e.status===`fulfilled`&&e.value).map(e=>e.value)].map(L).join(``)}</div>
    <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">More All-Star coverage ↗</a>`,e.querySelectorAll(`.media-item--video`).forEach(e=>{e.style.cursor=`pointer`,e.addEventListener(`click`,()=>{let t=e.dataset.videoId;t?R(t):window.open(e.dataset.videoUrl,`_blank`)})})}async function V(){let e=d(`asgNews`);if(e)try{let n=await fetch(`/yardreport/feeds.json`).then(e=>e.json()),r=await Promise.allSettled(n.map(e=>fetch(`${i}?url=${encodeURIComponent(e.url)}`).then(e=>e.json()).then(t=>({source:e,articles:t.items??[]})))),a=Date.now()-12096e5,s=/all-star|all star|midsummer classic|home run derby/i,c=[];for(let e of r){if(e.status!==`fulfilled`)continue;let{source:t,articles:n}=e.value;for(let e of n){let n=u(e.title||``);if(!s.test(n)&&!s.test(e.description||``))continue;let r=new Date(e.pubDate);isNaN(r)||r.getTime()<a||c.push({title:n,link:e.link,pubDate:e.pubDate,sourceName:t.name,thumbnail:f(e)})}}c.sort((e,t)=>new Date(t.pubDate)-new Date(e.pubDate));let l=c.slice(0,8);if(!l.length){e.innerHTML=`<span class="sidebar-msg">No recent All-Star news</span>`;return}await Promise.all(l.map(async e=>{e.thumbnail||=await o(e.link)})),e.innerHTML=`<div class="news-thumb-list">${l.map(t).join(``)}</div>`}catch{e.innerHTML=`<span class="sidebar-msg">Unavailable</span>`}}function H(){document.querySelectorAll(`.section-toggle`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.closest(`.sidebar-section`),n=t.closest(`.sidebar`),r=t.classList.contains(`collapsed`);n?.querySelectorAll(`.sidebar-section.collapsible`).forEach(e=>{e!==t&&e.classList.add(`collapsed`)}),t.classList.toggle(`collapsed`,!r)})})}H(),x(),A(),M(),B(),V();