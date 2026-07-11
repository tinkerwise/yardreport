import"./theme.B2ePjmLX.js";import{f as M,$ as v,r as I,M as w,S as L,e as o,P as S,c as T,a as H,b as P,d as D,g as A,t as k,p as R,l as x,s as j,O as E}from"./utils.B_atCdGv.js";import{f as N,g as O}from"./weather.Cok8HWHz.js";import{f as B}from"./scores.BDVHo8zr.js";function b(e,t){const a=e.note?`<span class="roster-badge roster-badge--replacement" title="${o(e.note)}">Replacement</span>`:"",s=e.playerId??x(t,e.name),n=s?`<a class="roster-name" href="${j(s)}" target="_blank" rel="noopener">${o(e.name)}</a>`:`<span class="roster-name" data-name-lookup="${o(e.name)}">${o(e.name)}</span>`;return`<div class="roster-item">
    <img class="asg-team-logo" src="${k(e.teamId,16)}" alt="" width="16" height="16" loading="lazy">
    ${n}
    ${e.pos?`<span class="roster-pos">${o(e.pos)}</span>`:""}
    ${a}
  </div>`}function $(e,t,a){const s=v(e);if(s){if(!t){s.innerHTML='<span class="sidebar-msg">Roster unavailable</span>';return}s.innerHTML=`
    <div class="roster-group-label">Starters</div>
    ${t.starters.map(n=>b(n,a)).join("")}
    <div class="roster-group-label">Reserves</div>
    ${t.reserves.map(n=>b(n,a)).join("")}
    <div class="roster-group-label">Pitchers</div>
    ${t.pitchers.map(n=>b(n,a)).join("")}
  `,A(s)}}async function U(){try{const[e,t]=await Promise.all([fetch("/yardreport/all-star-roster.json").then(s=>s.json()),M()]);$("asgAL",e.al,t),$("asgNL",e.nl,t);const a=v("asgUpdated");a&&e.lastUpdated&&(a.textContent=`Rosters updated ${I(e.lastUpdated)}`),V(e),_(e.homeRunDerby,t)}catch{v("asgAL").innerHTML='<span class="sidebar-msg">Roster unavailable</span>',v("asgNL").innerHTML='<span class="sidebar-msg">Roster unavailable</span>'}}function _(e,t){const a=v("asgDerby");if(!a)return;if(!e){a.innerHTML='<span class="sidebar-msg">Unavailable</span>';return}const s=(e.participants??[]).map(i=>`
    <div class="roster-item">
      <img class="asg-team-logo" src="${k(i.teamId,16)}" alt="" width="16" height="16" loading="lazy">
      ${R(i.name,t)}
    </div>
  `).join(""),n=e.spotsOpen?`<div class="roster-item"><span class="roster-name roster-name--pending">${e.spotsOpen} spot${e.spotsOpen===1?"":"s"} still open</span></div>`:"";a.innerHTML=`
    <div class="asg-game-card">
      <div class="asg-game-date">${o(e.date??"")}</div>
      <div class="asg-game-venue">${o(e.venue??"")}</div>
    </div>
    <div class="roster-group-label">Field</div>
    ${s}
    ${n}
    <a class="widget-link" href="https://www.mlb.com/all-star/home-run-derby" target="_blank" rel="noopener">Home Run Derby hub ↗</a>
  `,A(a)}function F(e){const t=[];for(const[a,s]of[["al","AL"],["nl","NL"]])for(const[n,i]of[["starters","Starter"],["reserves","Reserve"],["pitchers","Pitcher"]])for(const c of e[a]?.[n]??[])c.teamId===E&&c.playerId&&t.push({...c,league:s,selectionType:i});return t}const C=new Set(["ALAS","NLAS"]);async function G(e){try{const a=((await fetch(`${w}/people/${e}/awards`).then(s=>s.json())).awards??[]).filter(s=>C.has(s.id)).map(s=>s.season).filter(Boolean);return[...new Set(a)].sort()}catch{return[]}}function q(e,t){const a=`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${e.playerId}/headshot/67/current`,s=t.filter(i=>String(i)!==String(L)),n=s.length?`${s.length+1} selections: ${t.join(", ")}`:"First career selection";return`
    <a class="asg-spotlight-card" href="https://www.mlb.com/player/${e.playerId}" target="_blank" rel="noopener">
      <img class="asg-spotlight-photo" src="${a}" alt="" width="64" height="64" loading="lazy">
      <div class="asg-spotlight-body">
        <div class="asg-spotlight-kicker">Orioles All-Star</div>
        <div class="asg-spotlight-name">${o(e.name)}</div>
        <div class="asg-spotlight-meta">${o(e.pos??"")} · ${o(e.league)} ${o(e.selectionType)}${e.note?` · ${o(e.note)}`:""}</div>
        <div class="asg-spotlight-history">${o(n)}</div>
      </div>
    </a>`}async function V(e){const t=v("asgOriolesSpotlight");if(!t)return;const a=F(e);if(!a.length){t.innerHTML="";return}const s=await Promise.all(a.map(async n=>{const i=await G(n.playerId);return q(n,i)}));t.innerHTML=`<div class="asg-spotlight">${s.join("")}</div>`}async function Q(e){if(!e)return null;try{return await fetch(`${w}/venues/${e}?hydrate=location`).then(t=>t.json()).then(t=>t.venues?.[0]?.location??null)}catch{return null}}async function Y(e){const t=v("asgLiveTracker");if(!t)return;const a=e.status?.abstractGameState==="Live",s=e.linescore??{},n=s.innings??[],i=Math.max(n.length,9);let c='<th class="box-team-col"></th>';for(let m=1;m<=i;m++)c+=`<th>${m}</th>`;c+='<th class="box-total">R</th><th class="box-total">H</th><th class="box-total">E</th>';const r=(m,u)=>{let l=`<td class="box-team-col">${m}</td>`;for(let g=0;g<i;g++)l+=`<td>${n[g]?.[u]?.runs??(g<n.length?"0":"")}</td>`;const p=s.teams?.[u]??{},f=p.runs??e.teams?.[u]?.score??"";return l+=`<td class="box-total">${f}</td><td class="box-total">${p.hits??""}</td><td class="box-total">${p.errors??""}</td>`,l},d=await B(e.gamePk),h=d.length?d.map(m=>{const{about:u,result:l}=m,p=`${u.halfInning==="top"?"T":"B"}${u.inning}`;return`<div class="scr-play">
        <span class="scr-inn">${o(p)}</span>
        <span></span>
        <span class="scr-desc">${o(l.description??"")}</span>
        <span class="scr-score">${o(`AL ${l.awayScore??"?"}, NL ${l.homeScore??"?"}`)}</span>
      </div>`}).join(""):'<div class="scr-empty">Scoreless so far</div>';t.innerHTML=`
    <div class="asg-team-col asg-live-tracker">
      <div class="asg-team-head asg-live-tracker-head">
        ${a?'<span class="live-dot" aria-hidden="true"></span> Live Tracker':"Final Box Score"}
      </div>
      <div style="overflow-x:auto;">
        <table class="box-score-table">
          <thead><tr>${c}</tr></thead>
          <tbody>
            <tr class="box-score-row">${r("AL","away")}</tr>
            <tr class="box-score-row">${r("NL","home")}</tr>
          </tbody>
        </table>
      </div>
      <div class="box-sum-hdr">Scoring Plays</div>
      ${h}
    </div>
  `}async function z(){const e=v("asgGameInfo");if(e)try{const a=(await fetch(`${w}/schedule?sportId=1&gameType=A&season=${L}&hydrate=linescore`).then(l=>l.json())).dates?.[0]?.games?.[0];if(!a){e.innerHTML='<span class="sidebar-msg">Schedule unavailable</span>';return}const[s]=await Promise.all([Q(a.venue?.id),N([a])]),n=O(a),i=new Date(a.gameDate),c=i.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}),r=i.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}),d=a.status?.abstractGameState??"Preview";let h="";if(d==="Live"||d==="Final"){const l=a.teams?.away??{},p=a.teams?.home??{};h=`<div class="asg-score">
        <span class="asg-score-team">AL ${l.score??0}</span>
        <span class="asg-score-sep">–</span>
        <span class="asg-score-team">NL ${p.score??0}</span>
      </div>
      <div class="asg-status">${o(d==="Live"?"Live":a.status?.detailedState??"Final")}</div>`}let m="";if(d==="Preview"){const l=i.getTime()-Date.now();if(l>0){const p=Math.floor(l/864e5),f=Math.floor(l%864e5/36e5);m=`<div class="asg-countdown">${p}d ${f}h until first pitch</div>`}}const u=s?[s.city,s.stateAbbrev].filter(Boolean).join(", "):"";e.innerHTML=`
      <div class="asg-game-card">
        <div class="asg-game-date">${o(c)}</div>
        <div class="asg-game-time">${o(r)}</div>
        ${m}
        ${h}
        <div class="asg-game-venue">${o(a.venue?.name??"")}</div>
        ${u?`<div class="asg-game-loc">${o(u)}</div>`:""}
        ${n?`<div class="asg-game-wx">${n.emoji} ${n.temp}°F, ${o(n.condition)}</div>`:""}
      </div>
      <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">All-Star Game hub on MLB.com ↗</a>
    `,(d==="Live"||d==="Final")&&Y(a)}catch{e.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}const X=[{year:2025,result:"NL won 4–3 in first-ever swing-off tiebreaker",venue:"Truist Park, Atlanta"},{year:2024,result:"AL won 5–3",mvp:"Jarren Duran (BOS)",venue:"Globe Life Field, Arlington"},{year:2023,result:"NL won 3–2",mvp:"Elias Díaz (COL)",venue:"T-Mobile Park, Seattle"},{year:2021,result:"AL won 5–2",mvp:"Shohei Ohtani (LAA)",venue:"Coors Field, Denver"},{year:2019,result:"AL won 4–3",mvp:"Shane Bieber (CLE)",venue:"Progressive Field, Cleveland"},{year:2018,result:"AL won 8–6 (10 innings)",mvp:"Alex Bregman (HOU)",venue:"Nationals Park, Washington"}];function W(){const e=v("asgHistory");e&&(e.innerHTML=X.map(t=>`
    <div class="asg-history-item">
      <span class="asg-history-year">${t.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${o(t.result)}</div>
        <div class="asg-history-meta">${t.mvp?`MVP: ${o(t.mvp)} · `:""}${o(t.venue)}</div>
      </div>
    </div>
  `).join(""))}const Z=[{title:"2026 All-Star Game Selection Show",url:"https://www.youtube.com/watch?v=ldRZCQQHQAs",videoId:"ldRZCQQHQAs"},{title:"2026 All-Star Game starters announced",url:"https://www.youtube.com/watch?v=YqMsXm2XUd0",videoId:"YqMsXm2XUd0"}],J=[{id:"PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu",label:"MLB Fastcast"},{id:"PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE",label:"MLB Top Plays"}];function K(e){return e.match(/v=([^&]+)/)?.[1]||e.match(/youtu\.be\/([^?&]+)/)?.[1]||""}async function ee(e){try{const t=`${S}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${e.id}`)}`,s=(await fetch(t).then(c=>c.json())).items??[],n=s.find(c=>/all.?star/i.test(c.title||""))||s[0];if(!n)return null;const i=K(n.link||"");return{title:T(n.title),label:e.label,thumb:n.thumbnail||(i?`https://i.ytimg.com/vi/${i}/mqdefault.jpg`:""),url:n.link,videoId:i}}catch{return null}}function te(e){return`<div class="media-item media-item--video" data-video-id="${o(e.videoId??"")}" data-video-url="${o(e.url)}">
    <div class="video-thumb-wrap">
      <img class="video-thumb" src="${o(e.thumb??`https://i.ytimg.com/vi/${e.videoId}/mqdefault.jpg`)}" alt="" loading="lazy">
      <svg class="video-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div class="video-info">
      <span class="video-channel">${o(e.label??"MLB")}</span>
      <span class="video-title">${o(e.title)}</span>
    </div>
  </div>`}function se(e){let t=document.getElementById("videoTheater");t||(t=document.createElement("div"),t.id="videoTheater",t.className="video-theater",t.innerHTML=`
      <div class="video-theater-backdrop"></div>
      <div class="video-theater-content">
        <button class="video-theater-close" aria-label="Close">&times;</button>
        <div class="video-theater-player"></div>
      </div>`,document.body.appendChild(t),t.querySelector(".video-theater-backdrop").addEventListener("click",y),t.querySelector(".video-theater-close").addEventListener("click",y),document.addEventListener("keydown",a=>{a.key==="Escape"&&y()})),t.querySelector(".video-theater-player").innerHTML=`<iframe src="https://www.youtube.com/embed/${e}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`,t.classList.add("active"),document.body.style.overflow="hidden"}function y(){const e=document.getElementById("videoTheater");e&&(e.classList.remove("active"),e.querySelector(".video-theater-player").innerHTML="",document.body.style.overflow="")}async function ae(){const e=v("asgMedia");if(!e)return;const t=await Promise.allSettled(J.map(ee)),a=[...Z,...t.filter(s=>s.status==="fulfilled"&&s.value).map(s=>s.value)];e.innerHTML=`<div class="media-list">${a.map(te).join("")}</div>
    <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">More All-Star coverage ↗</a>`,e.querySelectorAll(".media-item--video").forEach(s=>{s.style.cursor="pointer",s.addEventListener("click",()=>{const n=s.dataset.videoId;n?se(n):window.open(s.dataset.videoUrl,"_blank")})})}async function ne(){const e=v("asgNews");if(e)try{const t=await fetch("/yardreport/feeds.json").then(r=>r.json()),a=await Promise.allSettled(t.map(r=>fetch(`${S}?url=${encodeURIComponent(r.url)}`).then(d=>d.json()).then(d=>({source:r,articles:d.items??[]})))),s=Date.now()-14*864e5,n=/all-star|all star|midsummer classic|home run derby/i,i=[];for(const r of a){if(r.status!=="fulfilled")continue;const{source:d,articles:h}=r.value;for(const m of h){const u=T(m.title||"");if(!n.test(u)&&!n.test(m.description||""))continue;const l=new Date(m.pubDate);isNaN(l)||l.getTime()<s||i.push({title:u,link:m.link,pubDate:m.pubDate,sourceName:d.name,thumbnail:H(m)})}}i.sort((r,d)=>new Date(d.pubDate)-new Date(r.pubDate));const c=i.slice(0,8);if(!c.length){e.innerHTML='<span class="sidebar-msg">No recent All-Star news</span>';return}await Promise.all(c.map(async r=>{r.thumbnail||(r.thumbnail=await P(r.link))})),e.innerHTML=`<div class="news-thumb-list">${c.map(D).join("")}</div>`}catch{e.innerHTML='<span class="sidebar-msg">Unavailable</span>'}}function oe(){document.querySelectorAll(".section-toggle").forEach(e=>{e.addEventListener("click",()=>{const t=e.closest(".sidebar-section"),a=t.closest(".sidebar"),s=t.classList.contains("collapsed");a?.querySelectorAll(".sidebar-section.collapsible").forEach(n=>{n!==t&&n.classList.add("collapsed")}),t.classList.toggle("collapsed",!s)})})}oe();U();z();W();ae();ne();
