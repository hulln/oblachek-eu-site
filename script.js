// Rain/Drizzle effect
function makeItRain(n = 40, dur = 1200) {
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.style.position = 'fixed';
    d.style.top = '-20px';
    d.style.left = Math.random() * window.innerWidth + 'px';
    d.style.width = '8px';
    d.style.height = '14px';
    d.style.background = 'var(--accent)';
    d.style.borderRadius = '4px';
    d.style.opacity = '0.85';
    d.style.pointerEvents = 'none';
    d.style.transition = `transform ${500 + Math.random() * dur}ms linear, opacity 200ms ease-out`;
    document.body.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = `translateY(${window.innerHeight + 40}px)`;
      setTimeout(() => {
        d.style.opacity = 0;
        setTimeout(() => d.remove(), 220);
      }, 480 + dur);
    });
  }
}

// Bubbles
function createBubbles() {
  for (let i = 0; i < 15; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.style.left = Math.random() * window.innerWidth + 'px';
    bubble.style.bottom = '-20px';
    bubble.style.width = (8 + Math.random() * 16) + 'px';
    bubble.style.height = bubble.style.width;
    document.body.appendChild(bubble);
    bubble.animate([
      { transform: 'translateY(0)', opacity: 0.8 },
      { transform: `translateY(-${100 + Math.random() * 200}vh)`, opacity: 0 }
    ], {
      duration: 2000 + Math.random() * 2000,
      easing: 'ease-out'
    }).onfinish = () => bubble.remove();
  }
}

// Theme handling and clock: run after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', theme);
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  }
  themeToggle.addEventListener('click', toggleTheme);
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(savedTheme);

  // Status update
  function updateStatus() {
    try {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Ljubljana',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      document.getElementById('status').textContent = fmt.format(now);
    } catch (e) {
      document.getElementById('status').textContent = 'CET';
    }
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  document.getElementById('year').textContent = new Date().getFullYear();
  newRandomFact();
  updateSpotifyStatus();
});

// Keyboard shortcuts
// Bubbles (B key) and Rain (R key)
document.addEventListener('keydown', (e) => {
  if (e.key === 'b' || e.key === 'B') {
    createBubbles();
  }
  if (e.key === 'r' || e.key === 'R') {
    makeItRain();
  }
  if (e.key === 'f' || e.key === 'F') {
    newRandomFact();
  }
});

// Random facts
const facts = [
  "The first computer bug was an actual bug found in a computer in 1947.",
  "There are more possible games of chess than atoms in the observable universe.",
  "The term 'cloud computing' was inspired by cloud symbols in flowcharts.",
  "The first website is still online at info.cern.ch.",
  "Rubber ducks are used by programmers to debug code by explaining it aloud.",
  "The @ symbol was used in email for the first time in 1971.",
  "The word 'spam' comes from a Monty Python sketch.",
  "The first computer was the size of a large room and weighed 30 tons.",
  "Lorem ipsum has been used as placeholder text since the 1500s.",
  "The term 'firewall' originally referred to walls that prevent fire spread."
];
function newRandomFact() {
  const factEl = document.getElementById('random-fact');
  const randomFact = facts[Math.floor(Math.random() * facts.length)];
  factEl.style.opacity = '0.5';
  setTimeout(() => {
    factEl.textContent = randomFact;
    factEl.style.opacity = '1';
  }, 150);
}

// Spotify status
function updateSpotifyStatus() {
  const statusEl = document.getElementById('spotify-status');
  // Placeholder - replace with actual Spotify API integration
  const statuses = [
    "not connected",
    "Lo-fi Hip Hop Radio",
    "Focus playlist",
    "nothing right now",
    "ambient sounds"
  ];
  statusEl.textContent = statuses[Math.floor(Math.random() * statuses.length)];
}
function refreshCurrently() {
  updateSpotifyStatus();
}

// Accent color changer
const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
function changeAccentColor() {
  const color = colors[Math.floor(Math.random() * colors.length)];
  document.documentElement.style.setProperty('--accent', color);
}

document.getElementById('year').textContent = new Date().getFullYear();
newRandomFact();
updateSpotifyStatus();
