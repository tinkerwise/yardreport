const O="/rss-proxy.php",v="https://statsapi.mlb.com/api/v1";const T=new Date().getFullYear(),r={articles:[],activeCategory:"all",activeSource:"all",searchQuery:"",sortBy:"date",standings:[],activeDiv:null};function n(e){return document.getElementById(e)}function o(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function b(e){if(!e)return"";const t=new Date(e);if(isNaN(t))return"";const a=Date.now()-t.getTime(),s=Math.floor(a/6e4);if(s<1)return"just now";if(s<60)return`${s}m ago`;const i=Math.floor(s/60);if(i<24)return`${i}h ago`;const c=Math.floor(i/24);return c<7?`${c}d ago`:t.toLocaleDateString("en-US",{month:"short",day:"numeric"})}function C(e){return e?new Date(e).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}):""}function F(e){return e.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,"").replace(/\son\w+\s*=\s*["'][^"']*["']/gi,"").replace(/javascript:/gi,"")}function M(e,t){return`<!doctype html><html lang="en"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    ${e.link?`<base href="${o(e.link)}" target="_blank">`:""}
    <style>
      body{font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;
        max-width:700px;margin:0 auto;padding:24px 20px 80px;color:#1a1a1a;background:#fff}
      img{max-width:100%;height:auto;border-radius:4px}
      a{color:#df4601}
      p{margin:0 0 1.2em}
      h1,h2,h3,h4{line-height:1.3;margin:1.6em 0 0.5em}
      blockquote{border-left:3px solid #df4601;margin:1.5em 0;padding:.5em 1.2em;color:#444;font-style:italic}
      figure{margin:1.5em 0}figcaption{font-size:.82em;color:#666;margin-top:6px;font-style:italic}
      pre,code{background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:.9em}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}
    </style>
  </head><body>${t}</body></html>`}async function g(){const e=n("scoresTrack");try{const t=new Date().toISOString().slice(0,10),s=(await fetch(`${v}/schedule?sportId=1&date=${t}&hydrate=linescore,team`).then(i=>i.json())).dates?.[0]?.games??[];if(!s.length){e.innerHTML='<span class="scores-msg">No games scheduled today</span>';return}s.sort((i,c)=>{const l=i.teams.away.team.id===110||i.teams.home.team.id===110,u=c.teams.away.team.id===110||c.teams.home.team.id===110;return l&&!u?-1:!l&&u?1:new Date(i.gameDate)-new Date(c.gameDate)}),e.innerHTML=s.map(i=>{const c=i.teams.away,l=i.teams.home,u=c.team.id===110||l.team.id===110,p=i.status.abstractGameState,S=p==="Live",D=p==="Final",f=p==="Preview";let m="";if(S){const E=i.linescore?.inningHalf==="Top"?"▲":"▼",I=i.linescore?.currentInning??"";m=`<span class="live-dot"></span><span class="score-status">${E}${I}</span>`}else D?m='<span class="score-status">F</span>':m=`<span class="score-status">${C(i.gameDate)}</span>`;const k=!f&&c.score!=null?`<span class="score-val">${c.score}</span>`:"",x=!f&&l.score!=null?`<span class="score-val">${l.score}</span>`:"";return`<a class="score-chip${u?" orioles":""}"
          href="https://www.mlb.com/gameday/${i.gamePk}/final/box-score"
          target="_blank" rel="noopener" title="${o(c.team.name)} @ ${o(l.team.name)}">
        <span class="score-team">${o(c.team.abbreviation)}</span>
        ${k}
        <span class="score-sep">@</span>
        <span class="score-team">${o(l.team.abbreviation)}</span>
        ${x}
        ${m}
      </a>`}).join("")}catch{e.innerHTML='<span class="scores-msg">Scores unavailable</span>'}}async function y(){try{const e=await fetch(`${v}/standings?leagueId=103,104&season=${T}&standingsTypes=regularSeason`).then(a=>a.json());r.standings=e.records.map(a=>({divisionId:a.division.id,division:a.division.name,teams:a.teamRecords.map(s=>({abbrev:s.team.abbreviation??s.team.name.slice(0,3).toUpperCase(),wins:s.wins,losses:s.losses,gb:s.gamesBack==="0"?"-":s.gamesBack,streak:s.streak?.streakCode??"-",isOrioles:s.team.id===110}))}));const t=r.standings.find(a=>a.divisionId===201);r.activeDiv=t?.divisionId??r.standings[0]?.divisionId??null,L(),$()}catch{n("standingsWrap").innerHTML='<span class="sidebar-msg">Standings unavailable</span>'}}function L(){const e=n("divTabs");e.innerHTML=r.standings.map(t=>{const a=t.division.replace("American League ","AL ").replace("National League ","NL ");return`<button class="div-tab${t.divisionId===r.activeDiv?" active":""}"
      data-div="${t.divisionId}">${o(a)}</button>`}).join(""),e.querySelectorAll(".div-tab").forEach(t=>{t.addEventListener("click",()=>{r.activeDiv=Number(t.dataset.div),L(),$()})})}function $(){const e=r.standings.find(t=>t.divisionId===r.activeDiv);e&&(n("standingsWrap").innerHTML=`
    <table class="standings-table">
      <thead><tr>
        <th>Team</th><th>W</th><th>L</th><th>GB</th><th>Str</th>
      </tr></thead>
      <tbody>${e.teams.map(t=>`
        <tr class="${t.isOrioles?"orioles-row":""}">
          <td class="team-abbrev">${o(t.abbrev)}</td>
          <td>${t.wins}</td><td>${t.losses}</td>
          <td>${o(t.gb)}</td><td>${o(t.streak)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`)}async function R(e){try{const t=`${O}?url=${encodeURIComponent(e.url)}`,a=await fetch(t).then(s=>s.json());return{source:e,articles:(a.items??[]).map(s=>({title:s.title??"",link:s.link??"",pubDate:s.pubDate??"",description:s.description??"",content:s.content??"",thumbnail:s.thumbnail??null}))}}catch{return{source:e,articles:[]}}}async function w(){n("articleList").innerHTML='<div class="feed-msg">Loading news…</div>';let e;try{e=await fetch("/feeds.json").then(s=>s.json())}catch{return n("articleList").innerHTML='<div class="feed-msg">Could not load feeds.json</div>',[]}const t=await Promise.allSettled(e.map(R));r.articles=[];const a=[];for(const s of t){if(s.status!=="fulfilled")continue;const{source:i,articles:c}=s.value;a.push(i);for(const l of c)r.articles.push({...l,source:i})}return j(a),d(),a}function j(e){const t=n("sourceFilters");t.innerHTML=`<button class="pill${r.activeSource==="all"?" active":""}" data-source="all">All</button>`+e.map(a=>`<button class="pill${r.activeSource===a.id?" active":""}" data-source="${o(a.id)}">${o(a.name)}</button>`).join(""),t.querySelectorAll(".pill").forEach(a=>{a.addEventListener("click",()=>{r.activeSource=a.dataset.source,t.querySelectorAll(".pill").forEach(s=>s.classList.toggle("active",s.dataset.source===r.activeSource)),d()})})}function H(){let e=r.articles;if(r.activeCategory!=="all"&&(e=e.filter(t=>t.source.category===r.activeCategory)),r.activeSource!=="all"&&(e=e.filter(t=>t.source.id===r.activeSource)),r.searchQuery){const t=r.searchQuery.toLowerCase();e=e.filter(a=>a.title.toLowerCase().includes(t)||a.description.toLowerCase().includes(t)||a.source.name.toLowerCase().includes(t))}return r.sortBy==="date"?e=[...e].sort((t,a)=>new Date(a.pubDate)-new Date(t.pubDate)):e=[...e].sort((t,a)=>t.source.name.localeCompare(a.source.name)||new Date(a.pubDate)-new Date(t.pubDate)),e}function d(){const e=n("articleList"),t=H();if(n("resultCount").textContent=`${t.length} article${t.length!==1?"s":""}`,!t.length){e.innerHTML='<div class="feed-msg">No articles match your filters.</div>';return}e.innerHTML=t.map((a,s)=>{const i=a.thumbnail?`<img class="article-thumb" src="${o(a.thumbnail)}" alt="" loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'article-thumb-placeholder',textContent:'⚾'}))">`:'<div class="article-thumb-placeholder">⚾</div>';return`<div class="article-card" data-idx="${s}" role="button" tabindex="0">
      ${i}
      <div class="article-body">
        <div class="article-meta">
          <span class="source-badge" style="background:${o(a.source.color)}">${o(a.source.name)}</span>
          <span class="article-date">${b(a.pubDate)}</span>
        </div>
        <div class="article-title">${o(a.title)}</div>
        ${a.description?`<div class="article-desc">${o(a.description)}</div>`:""}
        <div class="article-actions">
          <button class="btn-read" data-idx="${s}">Read</button>
          <a class="btn-original" href="${o(a.link)}" target="_blank" rel="noopener"
             onclick="event.stopPropagation()">↗ Original</a>
        </div>
      </div>
    </div>`}).join(""),e.querySelectorAll("[data-idx]").forEach(a=>{a.addEventListener("click",s=>{if(s.target.tagName==="A")return;const i=Number(a.dataset.idx??a.closest("[data-idx]")?.dataset.idx);N(t[i])}),a.addEventListener("keydown",s=>{s.key==="Enter"&&a.click()})})}function N(e){n("readerTitle").textContent=e.title,n("readerDate").textContent=b(e.pubDate),n("readerLink").href=e.link;const t=n("readerBadge");t.textContent=e.source.name,t.style.background=e.source.color;const a=n("readerFrame"),s=n("readerFallback"),i=e.content||"";if(i.length>400){const c=F(i);a.srcdoc=M(e,c),a.classList.remove("hidden"),s.classList.add("hidden")}else a.classList.add("hidden"),s.classList.remove("hidden"),n("readerExcerpt").textContent=e.description||"",n("readerFullLink").href=e.link;n("readerOverlay").classList.remove("hidden"),document.body.style.overflow="hidden"}function h(){n("readerOverlay").classList.add("hidden"),document.body.style.overflow="",n("readerFrame").srcdoc=""}async function A(){const e=n("refreshBtn");e.disabled=!0,e.classList.add("spinning"),await Promise.allSettled([w(),g(),y()]),e.disabled=!1,e.classList.remove("spinning");const t=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});n("cacheLabel").textContent=`Updated ${t}`}function B(){n("refreshBtn").addEventListener("click",A);let e;n("searchInput").addEventListener("input",t=>{clearTimeout(e),e=setTimeout(()=>{r.searchQuery=t.target.value.trim(),d()},220)}),n("sortSelect").addEventListener("change",t=>{r.sortBy=t.target.value,d()}),n("categoryFilters").addEventListener("click",t=>{const a=t.target.closest(".pill");a&&(r.activeCategory=a.dataset.category,n("categoryFilters").querySelectorAll(".pill").forEach(s=>s.classList.toggle("active",s.dataset.category===r.activeCategory)),d())}),n("readerClose").addEventListener("click",h),n("readerOverlay").addEventListener("click",t=>{t.target===n("readerOverlay")&&h()}),document.addEventListener("keydown",t=>{t.key==="Escape"&&h()}),setInterval(g,300*1e3)}async function _(){B();const[,,e]=await Promise.allSettled([g(),y(),w()]),t=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});n("cacheLabel").textContent=`Updated ${t}`}document.addEventListener("DOMContentLoaded",_);
