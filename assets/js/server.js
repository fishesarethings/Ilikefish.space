// assets/js/server.js

console.log('[server] script loaded');

window.copyText = txt =>
  navigator.clipboard.writeText(txt)
    .then(() => console.log('[server] copied:', txt))
    .catch(err => console.error('[server] copy failed:', err));

async function updatePing() {
  const pingEl = document.getElementById('ping');
  const dotEl  = document.querySelector('.ring-container');
  if (!pingEl || !dotEl) return;

  dotEl.style.opacity = 0;
  pingEl.textContent = '…';

  try {
    const url = 'https://api.mcsrvstat.us/bedrock/2/mc.ilikefish.space:65167';
    const t0 = performance.now();
    const res = await fetch(url);
    const t1 = performance.now();

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ms = Math.round(t1 - t0);
    pingEl.textContent = `${ms} ms`;
    dotEl.style.opacity = 1;
  } catch (err) {
    console.error('[server] ❌ ping failed:', err);
    pingEl.textContent = 'Unavailable';
    dotEl.style.opacity = 0;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // join info
  document.getElementById('address').textContent = 'mc.ilikefish.space';
  document.getElementById('port').textContent    = '65167';

  // chart
  const ctx = document.getElementById('activityChart');
  if (ctx) {
    try {
      const res  = await fetch('https://api.mcsrvstat.us/bedrock/2/mc.ilikefish.space:65167');
      const data = await res.json();
      new Chart(ctx, {
        type:'line',
        data:{ labels:['Now'], datasets:[{ label:'Players Online', data:[data.players?.online||0] }] },
        options:{responsive:true}
      });
    } catch {
      ctx.parentNode.innerHTML = '<p>Server stats unavailable</p>';
    }
  }

  // ping first time & every 30s
  await updatePing();
  setInterval(updatePing, 30000);
});

// manual refresh
document.getElementById('refresh-ping')?.addEventListener('click', updatePing);
