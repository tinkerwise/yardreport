// ── Weather ───────────────────────────────────────────────────────
import { VENUE_COORDS } from './config.js';

function weatherEmoji(condition) {
  if (!condition) return '';
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny')) return '☀️';
  if (c.includes('partly cloudy')) return '⛅';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫️';
  if (c.includes('wind')) return '💨';
  if (c.includes('dome') || c.includes('roof closed')) return '🏟️';
  return '🌤️';
}

// Open-Meteo WMO weather code → condition string
const WMO_WEATHER = {
  0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

const weatherCache = new Map();

export async function fetchWeatherForGames(games) {
  const requests = new Map();
  for (const g of games) {
    const venueId = g.venue?.id;
    const coords = VENUE_COORDS[venueId];
    if (!coords) continue;
    const date = g.officialDate || g.gameDate?.slice(0, 10);
    const hour = new Date(g.gameDate).getHours();
    const key = `${venueId}-${date}`;
    if (!weatherCache.has(key) && !requests.has(key)) {
      requests.set(key, { coords, date, hour, venueId });
    }
  }

  const coordGroups = new Map();
  for (const [key, req] of requests) {
    const coordKey = `${req.coords.lat},${req.coords.lon}`;
    if (!coordGroups.has(coordKey)) coordGroups.set(coordKey, { coords: req.coords, items: [] });
    coordGroups.get(coordKey).items.push({ key, date: req.date, hour: req.hour, venueId: req.venueId });
  }

  const fetches = [...coordGroups.values()].map(async ({ coords, items }) => {
    try {
      const dates = [...new Set(items.map(i => i.date))].sort();
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&start_date=${dates[0]}&end_date=${dates[dates.length - 1]}&timezone=America%2FNew_York`;
      const data = await fetch(url).then(r => r.json());
      if (!data.hourly) return;

      for (const item of items) {
        const targetHour = item.hour || 19;
        const targetIdx = data.hourly.time.findIndex(t => t.startsWith(item.date) && parseInt(t.slice(11, 13)) >= targetHour);
        const idx = targetIdx >= 0 ? targetIdx : data.hourly.time.findIndex(t => t.startsWith(item.date));
        if (idx >= 0) {
          const code = data.hourly.weather_code[idx];
          const temp = Math.round(data.hourly.temperature_2m[idx]);
          const condition = WMO_WEATHER[code] ?? 'Unknown';
          weatherCache.set(item.key, { condition, temp, emoji: weatherEmoji(condition) });
        }
      }
    } catch { /* ignore weather errors */ }
  });

  await Promise.allSettled(fetches);
}

export function getGameWeather(g) {
  const venueId = g.venue?.id;
  const date = g.officialDate || g.gameDate?.slice(0, 10);
  return weatherCache.get(`${venueId}-${date}`) ?? null;
}
