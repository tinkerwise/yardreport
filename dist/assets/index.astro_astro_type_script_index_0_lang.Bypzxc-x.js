import{T as e,d as t,l as n}from"./utils.BYHmSwy8.js";var r=document.getElementById(`athStoryGrid`),i=document.getElementById(`athPageTitle`),a=document.getElementById(`athPageSubtitle`),o=`yr_ath_bundles`,s=new URLSearchParams(window.location.search).get(`topic`)||``;function c(r){let i=t(r.link),a=(r.description||``).slice(0,180);return`<article class="ath-story-card">
    <div class="ath-story-meta">
      ${i?`<img class="source-ico" src="${n(i)}" alt="" onerror="this.style.display='none'">`:``}
      <span class="source-name">${n(r.source?.name||`Source`)}</span>
      <span class="article-date">${n(e(r.pubDate))}</span>
    </div>
    <h2 class="ath-story-title"><a href="${n(r.link)}" target="_blank" rel="noopener noreferrer">${n(r.title||`Untitled`)}</a></h2>
    ${a?`<p class="ath-story-desc">${n(a)}</p>`:``}
  </article>`}var l={};try{l=JSON.parse(sessionStorage.getItem(o)||`{}`)}catch{l={}}var u=l[s];u?(i.textContent=u.label||`Around the Horn`,a.textContent=`${u.sourceCount||0} sources • ${(u.articles||[]).length} related articles`,r.innerHTML=(u.articles||[]).map(c).join(``)||`<div class="feed-msg">No related articles found.</div>`):(i.textContent=`Story bundle unavailable`,a.textContent=`This link only works right after clicking an Around the Horn card — the story bundle isn’t saved anywhere else yet.`,r.innerHTML=`
    <div class="ath-empty-state">
      <p class="feed-msg">No saved Around the Horn bundle was found for this story. Head back and pick a story from the "Around the Horn" section to see its full coverage bundle.</p>
      <a class="ath-empty-cta" href="/yardreport/">← Back to Yard Report</a>
    </div>
  `);