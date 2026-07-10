// ── Trade rumor recap page (per-player) ──────────────────────────────
import './theme.js';
import { MLB } from './config.js';
import { $, esc, relativeDate, teamLogoSrc, renderNewsThumbCard, fetchOgImage } from './utils.js';

function headshotUrl(id) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;
}

async function fetchBio(id) {
  try {
    const data = await fetch(`${MLB}/people/${id}`).then(r => r.json());
    return data.people?.[0] ?? null;
  } catch {
    return null;
  }
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const nameEl = $('tpName');
  const metaEl = $('tpMeta');
  const photoEl = $('tpPhoto');
  const summaryBody = $('tpSummaryBody');
  const articlesEl = $('tpArticles');
  const breadcrumb = $('tpBreadcrumb');

  if (!id) {
    nameEl.textContent = 'No player specified';
    summaryBody.textContent = 'Open this page from a mentioned player on the Trade Deadline page.';
    articlesEl.innerHTML = '';
    return;
  }

  let tdData;
  try {
    tdData = await fetch(`${import.meta.env.BASE_URL}trade-deadline.json`).then(r => r.json());
  } catch {
    nameEl.textContent = 'Unavailable';
    summaryBody.textContent = 'Could not load trade deadline data.';
    return;
  }

  const recap = tdData.rumorRecaps?.[id];
  if (!recap) {
    nameEl.textContent = 'No recap available yet';
    summaryBody.textContent = 'This player hasn’t had a rumor recap generated yet — check back closer to the deadline.';
    articlesEl.innerHTML = '';
    return;
  }

  nameEl.textContent = recap.name;
  breadcrumb.textContent = recap.name;
  document.title = `${recap.name} Trade Rumors | Yard Report`;
  summaryBody.textContent = recap.summary;
  photoEl.src = headshotUrl(id);

  const bio = await fetchBio(id);
  const pos = bio?.primaryPosition?.abbreviation ?? '';
  const teamName = bio?.currentTeam?.name ?? '';
  metaEl.innerHTML = `
    ${bio?.currentTeam?.id ? `<img class="tp-team-logo" src="${teamLogoSrc(bio.currentTeam.id, 20)}" alt="" width="20" height="20">` : ''}
    <span>${esc([pos, teamName].filter(Boolean).join(' · '))}</span>
    <span class="tp-generated">Recap generated ${relativeDate(recap.generatedAt)}</span>
  `;

  const articles = recap.articles ?? [];
  if (!articles.length) {
    articlesEl.innerHTML = '<div class="feed-msg">No articles on file.</div>';
    return;
  }
  await Promise.all(articles.map(async a => {
    if (!a.thumbnail) a.thumbnail = await fetchOgImage(a.link);
  }));
  articlesEl.innerHTML = `<div class="news-thumb-list">${articles.map(renderNewsThumbCard).join('')}</div>`;
}

init();
