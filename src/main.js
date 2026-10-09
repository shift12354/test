import { createScene } from './scene.js';

const root = document.documentElement;
const canvas = document.getElementById('scene');
const stages = [...document.querySelectorAll('[data-stage]')];
const navLinks = [...document.querySelectorAll('.nav a')];
const toggle = document.getElementById('theme-toggle');
const toggleLabel = toggle.querySelector('.theme-toggle__label');
const buildCount = document.getElementById('build-count');
const buildBar = document.getElementById('build-bar');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const systemDark = matchMedia('(prefers-color-scheme: dark)');

// Must match the strake count in scene.js
const STRAKES = 10;

/* ---------- Theme: Dag / Blåtime ---------- */
function storedTheme() {
  try { return localStorage.getItem('moen-theme'); } catch { return null; }
}
function currentTheme() {
  return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
}
function applyTheme(name, persist) {
  if (name) root.dataset.theme = name;
  const theme = currentTheme();
  toggleLabel.textContent = theme === 'dark' ? 'Blåtime' : 'Dag';
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  scene?.setTheme(theme);
  if (persist) { try { localStorage.setItem('moen-theme', theme); } catch {} }
}

/* ---------- 3D scene ---------- */
let scene = null;
try {
  scene = createScene(canvas, { reducedMotion, theme: currentTheme() });
} catch (err) {
  console.warn('3D-scenen kunne ikke startes:', err);
  root.classList.add('no-webgl');
}

const saved = storedTheme();
applyTheme(saved === 'dark' || saved === 'light' ? saved : null, false);
systemDark.addEventListener('change', () => { if (!root.dataset.theme) applyTheme(null, false); });
toggle.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true));

/* ---------- Scroll -> stage progress t in [0, 4] ---------- */
function progress() {
  const y = window.scrollY;
  const tops = stages.map((s) => s.offsetTop);
  const last = stages.length - 1;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  // The last stage is reached when its top hits the viewport top, or at the bottom of the page.
  const lastTop = Math.min(tops[last], maxScroll);
  if (y >= lastTop) return last;
  for (let i = 0; i < last; i++) {
    const end = i + 1 === last ? lastTop : tops[i + 1];
    if (y < end) return i + Math.max(0, (y - tops[i]) / (end - tops[i]));
  }
  return last;
}

function strakesShown(t) {
  if (t <= 0.05 || t >= 1) return STRAKES;
  if (t < 0.35) return Math.round(STRAKES * (1 - (t - 0.05) / 0.3));
  return Math.round(STRAKES * ((t - 0.35) / 0.65));
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const t = progress();
    scene?.setProgress(t);

    const n = strakesShown(t);
    buildCount.textContent = `${n} / ${STRAKES}`;
    buildBar.style.transform = `scaleX(${n / STRAKES})`;

    const active = Math.round(t);
    navLinks.forEach((a) => {
      const on = a.getAttribute('href') === `#${stages[active].id}`;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

/* ---------- Pointer parallax ---------- */
if (!reducedMotion) {
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    scene?.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });
}

/* ---------- Copy phone number ---------- */
document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Kopiert';
    } catch {
      const sel = getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('phone'));
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = 'Markert';
    }
    setTimeout(() => { btn.textContent = 'Kopier'; }, 2000);
  });
});
