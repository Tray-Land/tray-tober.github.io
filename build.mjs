// Generates the static Tray-tober site.
//
//   node build.mjs <path to traytober.json>   sync released apps from the tracker, then build
//   node build.mjs                            rebuild from data/apps.json
//
// Only apps whose day has arrived (PlannedDate <= today, America/Chicago) are
// copied into the repo, so unreleased apps never reach GitHub.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dataFile = join(root, 'data', 'apps.json');
const YEAR = 2026;
const MONTH = 10;

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---- sync ---------------------------------------------------------------
const source = process.argv[2];
if (source) {
  const tracker = JSON.parse(readFileSync(source, 'utf8'));
  rmSync(join(root, 'assets', 'icons'), { recursive: true, force: true });
  mkdirSync(join(root, 'assets', 'icons'), { recursive: true });
  const apps = tracker.Apps
    .filter((a) => a.PlannedDate && !a.IsDropped && a.PlannedDate <= today)
    .sort((a, b) => a.PlannedDate.localeCompare(b.PlannedDate))
    .map((a) => {
      const slug = slugify(a.Name);
      const hasIcon = a.IconPath && existsSync(a.IconPath);
      if (hasIcon) copyFileSync(a.IconPath, join(root, 'assets', 'icons', `${slug}.png`));
      return {
        day: Number(a.PlannedDate.slice(8)),
        date: a.PlannedDate,
        name: a.Name,
        slug,
        idea: a.Idea,
        icon: hasIcon,
        repoUrl: a.RepoUrl || '',
        releaseTag: a.LatestReleaseTag || '',
        blogUrl: a.BlogPostUrl || '',
        storeUrl: a.StoreUrl || '',
        blueskyUrl: a.BlueskyPostUrl || '',
        hours: a.HoursSpent || 0,
      };
    });
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(dataFile, JSON.stringify({ year: YEAR, apps }, null, 2) + '\n');
  console.log(`Synced ${apps.length} released apps (through ${today}).`);
}

// ---- build --------------------------------------------------------------
// Re-filter on build too, so a rebuild on a later/earlier date stays correct.
const apps = JSON.parse(readFileSync(dataFile, 'utf8')).apps.filter((a) => a.date <= today);
const byDay = new Map(apps.map((a) => [a.day, a]));
const monthName = new Date(Date.UTC(YEAR, MONTH - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
const daysInMonth = new Date(Date.UTC(YEAR, MONTH, 0)).getUTCDate();
const lead = (new Date(Date.UTC(YEAR, MONTH - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
const todayDay = today.startsWith(`${YEAR}-${MONTH}`) ? Number(today.slice(8)) : 0;

const favicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎃</text></svg>')}`;

function page({ title, description, base, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#552575">
<link rel="icon" href="${favicon}">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body>
${body}
<footer class="foot">
  <p>Tray-tober ${YEAR} · a tray app a day all October · by <a href="https://github.com/TheJoeFin">Joe Finney</a></p>
</footer>
</body>
</html>
`;
}

const iconImg = (a, base, cls) =>
  a.icon
    ? `<img class="${cls}" src="${base}assets/icons/${a.slug}.png" alt="" loading="lazy">`
    : `<span class="${cls} noicon" aria-hidden="true">🎃</span>`;

const ghIcon = '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

// Main calendar page
const cells = [];
for (let i = 0; i < lead; i++) cells.push('<li class="pad" aria-hidden="true"></li>');
for (let d = 1; d <= daysInMonth; d++) {
  const a = byDay.get(d);
  if (a) {
    cells.push(`<li class="door open${d === todayDay ? ' today' : ''}">
  <a href="apps/${a.slug}/">
    <span class="num">${d}</span>${d === todayDay ? '<span class="badge">Today</span>' : ''}
    ${iconImg(a, '', 'icon')}
    <span class="name">${esc(a.name)}</span>
  </a>
  ${a.repoUrl ? `<a class="gh" href="${esc(a.repoUrl)}" title="${esc(a.name)} on GitHub" aria-label="${esc(a.name)} on GitHub">${ghIcon}</a>` : ''}
</li>`);
  } else {
    cells.push(`<li class="door locked" title="Opens October ${d}">
  <span class="num">${d}</span>
  <span class="lock" aria-hidden="true">🔒</span>
  <span class="sr">Day ${d} is still locked</span>
</li>`);
  }
}

// Faint wall of app icons behind the banner, like the original artwork
const withIcons = apps.filter((a) => a.icon && a.slug !== 'traysky'); // traysky's icon is opaque, so it can't be silhouetted
const patternIcons = Array.from({ length: 150 }, (_, i) => `<img src="assets/icons/${withIcons[(i * 7 + (i >> 3) * 5) % withIcons.length].slug}.png" alt="">`).join('');

const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<li>${d}</li>`).join('');
const home = page({
  title: `Tray-tober ${YEAR}`,
  description: 'A tray app a day all October. Open a door to meet each day’s app.',
  base: '',
  body: `<header class="hero">
  <div class="pattern" aria-hidden="true">${patternIcons}</div>
  <img class="banner" src="assets/hero-art.svg" alt="Tray-tober: a tray app a day all October">
</header>
<main class="wrap">
  <div class="cal-head">
    <h1>${monthName} ${YEAR}</h1>
    <p class="count"><strong>${apps.length}</strong> of ${daysInMonth} doors open</p>
  </div>
  <ol class="dow" aria-hidden="true">${dow}</ol>
  <ol class="grid">
${cells.join('\n')}
  </ol>
  <p class="hint">A new door opens every day. Come back tomorrow 🕯️</p>
</main>`,
});
writeFileSync(join(root, 'index.html'), home);

// Companion projects shown on an app's detail page, keyed by slug
const related = {
  trayqr: [{
    title: 'Also on the Mac: QRBar',
    blurb: 'QRBar is a native macOS port of Tray QR. Click the menu bar icon, type or paste some text, and the QR code appears. Point it at a code on screen or in an image to read it.',
    points: [
      'Create: live preview, custom colors with a low-contrast warning, error-correction levels L/M/Q/H, copy, save as PNG, or drag the image out',
      'Read: select part of the screen, or paste, open or drop an image. Reads QR, Micro QR, Data Matrix, Aztec, PDF417, EAN-13, UPC-E and Code 128',
      'Menu bar only, works offline, optional launch at login',
    ],
    requires: 'Requires macOS 15 Sequoia or later.',
    url: 'https://github.com/Tray-Land/QRBar',
    cta: 'QRBar on GitHub',
  }],
};

// Detail pages
const fmtDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

for (const a of apps) {
  const links = [];
  if (a.storeUrl) links.push(`<a class="btn primary" href="${esc(a.storeUrl)}">Get it in the Store</a>`);
  if (a.repoUrl && a.releaseTag) links.push(`<a class="btn primary" href="${esc(a.repoUrl)}/releases/latest">Download ${esc(a.releaseTag)}</a>`);
  if (a.repoUrl) links.push(`<a class="btn" href="${esc(a.repoUrl)}">Source on GitHub</a>`);
  if (a.blogUrl) links.push(`<a class="btn" href="${esc(a.blogUrl)}">Read the blog post</a>`);
  if (a.blueskyUrl) links.push(`<a class="btn" href="${esc(a.blueskyUrl)}">Bluesky post</a>`);

  const facts = [`<div><dt>Door</dt><dd>${a.day} of ${daysInMonth}</dd></div>`, `<div><dt>Released</dt><dd>${fmtDate(a.date)}</dd></div>`];
  if (a.releaseTag) facts.push(`<div><dt>Version</dt><dd>${esc(a.releaseTag)}</dd></div>`);
  if (a.hours) facts.push(`<div><dt>Built in</dt><dd>${a.hours} hours</dd></div>`);

  const prev = byDay.get(a.day - 1);
  const next = byDay.get(a.day + 1);
  const nav = (x, dir, label) =>
    x ? `<a class="${dir}" href="../${x.slug}/"><span>${label}</span><strong>${esc(x.name)}</strong></a>` : `<span class="${dir} off"></span>`;

  const html = page({
    title: `${a.name} · Tray-tober ${YEAR}`,
    description: a.idea,
    base: '../../',
    body: `<main class="wrap detail">
  <a class="back" href="../../">← Back to the calendar</a>
  <article class="card">
    <div class="doorplate">Door ${a.day}</div>
    ${iconImg(a, '../../', 'big-icon')}
    <h1>${esc(a.name)}</h1>
    <p class="idea">${esc(a.idea)}</p>
    ${links.length ? `<div class="links">${links.join('\n')}</div>` : ''}
    <dl class="facts">${facts.join('')}</dl>
  </article>
  ${(related[a.slug] ?? []).map((r) => `<aside class="related">
    <h2>${esc(r.title)}</h2>
    <p>${esc(r.blurb)}</p>
    <ul>${r.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <p class="meta">${esc(r.requires)}</p>
    <a class="btn" href="${esc(r.url)}">${esc(r.cta)}</a>
  </aside>`).join('\n')}
  <nav class="pager">${nav(prev, 'prev', '← Day ' + (a.day - 1))}${nav(next, 'next', 'Day ' + (a.day + 1) + ' →')}</nav>
</main>`,
  });
  mkdirSync(join(root, 'apps', a.slug), { recursive: true });
  writeFileSync(join(root, 'apps', a.slug, 'index.html'), html);
}
console.log(`Built index + ${apps.length} detail pages (today: ${today}).`);
