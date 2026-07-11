import{h as i,e as t,r as d}from"./utils.B_atCdGv.js";const o=document.getElementById("athStoryGrid"),c=document.getElementById("athPageTitle"),l=document.getElementById("athPageSubtitle"),u="yr_ath_bundles",h=new URLSearchParams(window.location.search),y=h.get("topic")||"";function p(e){const n=i(e.link),r=(e.description||"").slice(0,180);return`<article class="ath-story-card">
    <div class="ath-story-meta">
      ${n?`<img class="source-ico" src="${t(n)}" alt="" onerror="this.style.display='none'">`:""}
      <span class="source-name">${t(e.source?.name||"Source")}</span>
      <span class="article-date">${t(d(e.pubDate))}</span>
    </div>
    <h2 class="ath-story-title"><a href="${t(e.link)}" target="_blank" rel="noopener noreferrer">${t(e.title||"Untitled")}</a></h2>
    ${r?`<p class="ath-story-desc">${t(r)}</p>`:""}
  </article>`}let a={};try{a=JSON.parse(sessionStorage.getItem(u)||"{}")}catch{a={}}const s=a[y];s?(c.textContent=s.label||"Around the Horn",l.textContent=`${s.sourceCount||0} sources • ${(s.articles||[]).length} related articles`,o.innerHTML=(s.articles||[]).map(p).join("")||'<div class="feed-msg">No related articles found.</div>'):(c.textContent="Story bundle unavailable",l.textContent="This link only works right after clicking an Around the Horn card — the story bundle isn’t saved anywhere else yet.",o.innerHTML=`
    <div class="ath-empty-state">
      <p class="feed-msg">No saved Around the Horn bundle was found for this story. Head back and pick a story from the "Around the Horn" section to see its full coverage bundle.</p>
      <a class="ath-empty-cta" href="/yardreport/">← Back to Yard Report</a>
    </div>
  `);
