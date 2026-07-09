import{f as A,$ as m,r as T,M as y,S as w,e as o,P as L,c as $,a as M,b as I,d as k,l as H,s as P,t as D,O as j}from"./utils.BcDYeCfu.js";import{f as E,g as R}from"./weather.DKCtVSz3.js";function g(e,t){const s=e.note?`<span class="roster-badge roster-badge--replacement" title="${o(e.note)}">Replacement</span>`:"",a=e.playerId??H(t,e.name),n=a?`<a class="roster-name" href="${P(a)}" target="_blank" rel="noopener">${o(e.name)}</a>`:`<span class="roster-name">${o(e.name)}</span>`;return`<div class="roster-item">
    <img class="asg-team-logo" src="${D(e.teamId,16)}" alt="" width="16" height="16" loading="lazy">
    ${n}
    ${e.pos?`<span class="roster-pos">${o(e.pos)}</span>`:""}
    ${s}
  </div>`}function b(e,t,s){const a=m(e);if(a){if(!t){a.innerHTML='<span class="sidebar-msg">Roster unavailable</span>';return}a.innerHTML=`
    <div class="roster-group-label">Starters</div>
    ${t.starters.map(n=>g(n,s)).join("")}
    <div class="roster-group-label">Reserves</div>
    ${t.reserves.map(n=>g(n,s)).join("")}
    <div class="roster-group-label">Pitchers</div>
    ${t.pitchers.map(n=>g(n,s)).join("")}
  `}}async function N(){try{const[e,t]=await Promise.all([fetch("/yardreport/all-star-roster.json").then(a=>a.json()),A()]);b("asgAL",e.al,t),b("asgNL",e.nl,t);const s=m("asgUpdated");s&&e.lastUpdated&&(s.textContent=`Rosters updated ${T(e.lastUpdated)}`),C(e)}catch{m("asgAL").innerHTML='<span class="sidebar-msg">Roster unavailable</span>',m("asgNL").innerHTML='<span class="sidebar-msg">Roster unavailable</span>'}}function O(e){const t=[];for(const[s,a]of[["al","AL"],["nl","NL"]])for(const[n,i]of[["starters","Starter"],["reserves","Reserve"],["pitchers","Pitcher"]])for(const r of e[s]?.[n]??[])r.teamId===j&&r.playerId&&t.push({...r,league:a,selectionType:i});return t}const U=new Set(["ALAS","NLAS"]);async function _(e){try{const s=((await fetch(`${y}/people/${e}/awards`).then(a=>a.json())).awards??[]).filter(a=>U.has(a.id)).map(a=>a.season).filter(Boolean);return[...new Set(s)].sort()}catch{return[]}}function B(e,t){const s=`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${e.playerId}/headshot/67/current`,a=t.filter(i=>String(i)!==String(w)),n=a.length?`${a.length+1} selections: ${t.join(", ")}`:"First career selection";return`
    <a class="asg-spotlight-card" href="https://www.mlb.com/player/${e.playerId}" target="_blank" rel="noopener">
      <img class="asg-spotlight-photo" src="${s}" alt="" width="64" height="64" loading="lazy">
      <div class="asg-spotlight-body">
        <div class="asg-spotlight-kicker">Orioles All-Star</div>
        <div class="asg-spotlight-name">${o(e.name)}</div>
        <div class="asg-spotlight-meta">${o(e.pos??"")} · ${o(e.league)} ${o(e.selectionType)}${e.note?` · ${o(e.note)}`:""}</div>
        <div class="asg-spotlight-history">${o(n)}</div>
      </div>
    </a>`}async function C(e){const t=m("asgOriolesSpotlight");if(!t)return;const s=O(e);if(!s.length){t.innerHTML="";return}const a=await Promise.all(s.map(async n=>{const i=await _(n.playerId);return B(n,i)}));t.innerHTML=`<div class="asg-spotlight">${a.join("")}</div>`}async function F(e){if(!e)return null;try{return await fetch(`${y}/venues/${e}?hydrate=location`).then(t=>t.json()).then(t=>t.venues?.[0]?.location??null)}catch{return null}}async function G(){const e=m("asgGameInfo");if(e)try{const s=(await fetch(`${y}/schedule?sportId=1&gameType=A&season=${w}`).then(d=>d.json())).dates?.[0]?.games?.[0];if(!s){e.innerHTML='<span class="sidebar-msg">Schedule unavailable</span>';return}const[a]=await Promise.all([F(s.venue?.id),E([s])]),n=R(s),i=new Date(s.gameDate),r=i.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}),l=i.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}),c=s.status?.abstractGameState??"Preview";let p="";if(c==="Live"||c==="Final"){const d=s.teams?.away??{},h=s.teams?.home??{};p=`<div class="asg-score">
        <span class="asg-score-team">AL ${d.score??0}</span>
        <span class="asg-score-sep">–</span>
        <span class="asg-score-team">NL ${h.score??0}</span>
      </div>
      <div class="asg-status">${o(c==="Live"?"Live":s.status?.detailedState??"Final")}</div>`}let u="";if(c==="Preview"){const d=i.getTime()-Date.now();if(d>0){const h=Math.floor(d/864e5),S=Math.floor(d%864e5/36e5);u=`<div class="asg-countdown">${h}d ${S}h until first pitch</div>`}}const v=a?[a.city,a.stateAbbrev].filter(Boolean).join(", "):"";e.innerHTML=`
      <div class="asg-game-card">
        <div class="asg-game-date">${o(r)}</div>
        <div class="asg-game-time">${o(l)}</div>
        ${u}
        ${p}
        <div class="asg-game-venue">${o(s.venue?.name??"")}</div>
        ${v?`<div class="asg-game-loc">${o(v)}</div>`:""}
        ${n?`<div class="asg-game-wx">${n.emoji} ${n.temp}°F, ${o(n.condition)}</div>`:""}
      </div>
      <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">All-Star Game hub on MLB.com ↗</a>
    `}catch{e.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}const q=[{year:2025,result:"NL won 4–3 in first-ever swing-off tiebreaker",venue:"Truist Park, Atlanta"},{year:2024,result:"AL won 5–3",mvp:"Jarren Duran (BOS)",venue:"Globe Life Field, Arlington"},{year:2023,result:"NL won 3–2",mvp:"Elias Díaz (COL)",venue:"T-Mobile Park, Seattle"},{year:2021,result:"AL won 5–2",mvp:"Shohei Ohtani (LAA)",venue:"Coors Field, Denver"},{year:2019,result:"AL won 4–3",mvp:"Shane Bieber (CLE)",venue:"Progressive Field, Cleveland"},{year:2018,result:"AL won 8–6 (10 innings)",mvp:"Alex Bregman (HOU)",venue:"Nationals Park, Washington"}];function x(){const e=m("asgHistory");e&&(e.innerHTML=q.map(t=>`
    <div class="asg-history-item">
      <span class="asg-history-year">${t.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${o(t.result)}</div>
        <div class="asg-history-meta">${t.mvp?`MVP: ${o(t.mvp)} · `:""}${o(t.venue)}</div>
      </div>
    </div>
  `).join(""))}const V=[{title:"2026 All-Star Game Selection Show",url:"https://www.youtube.com/watch?v=ldRZCQQHQAs",videoId:"ldRZCQQHQAs"},{title:"2026 All-Star Game starters announced",url:"https://www.youtube.com/watch?v=YqMsXm2XUd0",videoId:"YqMsXm2XUd0"}],Q=[{id:"PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu",label:"MLB Fastcast"},{id:"PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE",label:"MLB Top Plays"}];function Y(e){return e.match(/v=([^&]+)/)?.[1]||e.match(/youtu\.be\/([^?&]+)/)?.[1]||""}async function z(e){try{const t=`${L}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${e.id}`)}`,a=(await fetch(t).then(r=>r.json())).items??[],n=a.find(r=>/all.?star/i.test(r.title||""))||a[0];if(!n)return null;const i=Y(n.link||"");return{title:$(n.title),label:e.label,thumb:n.thumbnail||(i?`https://i.ytimg.com/vi/${i}/mqdefault.jpg`:""),url:n.link,videoId:i}}catch{return null}}function X(e){return`<div class="media-item media-item--video" data-video-id="${o(e.videoId??"")}" data-video-url="${o(e.url)}">
    <div class="video-thumb-wrap">
      <img class="video-thumb" src="${o(e.thumb??`https://i.ytimg.com/vi/${e.videoId}/mqdefault.jpg`)}" alt="" loading="lazy">
      <svg class="video-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div class="video-info">
      <span class="video-channel">${o(e.label??"MLB")}</span>
      <span class="video-title">${o(e.title)}</span>
    </div>
  </div>`}function W(e){let t=document.getElementById("videoTheater");t||(t=document.createElement("div"),t.id="videoTheater",t.className="video-theater",t.innerHTML=`
      <div class="video-theater-backdrop"></div>
      <div class="video-theater-content">
        <button class="video-theater-close" aria-label="Close">&times;</button>
        <div class="video-theater-player"></div>
      </div>`,document.body.appendChild(t),t.querySelector(".video-theater-backdrop").addEventListener("click",f),t.querySelector(".video-theater-close").addEventListener("click",f),document.addEventListener("keydown",s=>{s.key==="Escape"&&f()})),t.querySelector(".video-theater-player").innerHTML=`<iframe src="https://www.youtube.com/embed/${e}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`,t.classList.add("active"),document.body.style.overflow="hidden"}function f(){const e=document.getElementById("videoTheater");e&&(e.classList.remove("active"),e.querySelector(".video-theater-player").innerHTML="",document.body.style.overflow="")}async function Z(){const e=m("asgMedia");if(!e)return;const t=await Promise.allSettled(Q.map(z)),s=[...V,...t.filter(a=>a.status==="fulfilled"&&a.value).map(a=>a.value)];e.innerHTML=`<div class="media-list">${s.map(X).join("")}</div>
    <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">More All-Star coverage ↗</a>`,e.querySelectorAll(".media-item--video").forEach(a=>{a.style.cursor="pointer",a.addEventListener("click",()=>{const n=a.dataset.videoId;n?W(n):window.open(a.dataset.videoUrl,"_blank")})})}async function J(){const e=m("asgNews");if(e)try{const t=await fetch("/yardreport/feeds.json").then(l=>l.json()),s=await Promise.allSettled(t.map(l=>fetch(`${L}?url=${encodeURIComponent(l.url)}`).then(c=>c.json()).then(c=>({source:l,articles:c.items??[]})))),a=Date.now()-14*864e5,n=/all-star|all star|midsummer classic|home run derby/i,i=[];for(const l of s){if(l.status!=="fulfilled")continue;const{source:c,articles:p}=l.value;for(const u of p){const v=$(u.title||"");if(!n.test(v)&&!n.test(u.description||""))continue;const d=new Date(u.pubDate);isNaN(d)||d.getTime()<a||i.push({title:v,link:u.link,pubDate:u.pubDate,sourceName:c.name,thumbnail:M(u)})}}i.sort((l,c)=>new Date(c.pubDate)-new Date(l.pubDate));const r=i.slice(0,8);if(!r.length){e.innerHTML='<span class="sidebar-msg">No recent All-Star news</span>';return}await Promise.all(r.map(async l=>{l.thumbnail||(l.thumbnail=await I(l.link))})),e.innerHTML=`<div class="news-thumb-list">${r.map(k).join("")}</div>`}catch{e.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function K(){document.querySelectorAll(".section-toggle").forEach(e=>{e.addEventListener("click",()=>{const t=e.closest(".sidebar-section"),s=t.closest(".sidebar"),a=t.classList.contains("collapsed");s?.querySelectorAll(".sidebar-section.collapsible").forEach(n=>{n!==t&&n.classList.add("collapsed")}),t.classList.toggle("collapsed",!a)})})}K();N();G();x();Z();J();
