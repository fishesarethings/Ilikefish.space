// assets/js/server.js

console.log('[server] script loaded');

window.copyText = txt =>
  navigator.clipboard.writeText(txt)
    .then(() => console.log('[server] copied:', txt))
    .catch(err => console.error('[server] copy failed:', err));

window.addEventListener('DOMContentLoaded', async () => {
  console.log('[server] DOMContentLoaded');
  const addressEl = document.getElementById('address');
  const portEl    = document.getElementById('port');

  if (!addressEl || !portEl) {
    return console.error('[server] ❌ #address and/or #port element not found');
  }

  console.log('[server] writing join info');
  addressEl.textContent = 'mc.ilikefish.space';
  portEl.textContent    = '19132';

  const ctx = document.getElementById('activityChart');
  if (!ctx) {
    return console.warn('[server] #activityChart canvas not found, skipping chart');
  }

  try {
    console.log('[server] fetching server stats…');
    const res  = await fetch('https://api.mcsrvstat.us/bedrock/2/mc.ilikefish.space:19132');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('[server] got server stats:', data);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Now'],
        datasets: [{ label: 'Players Online', data: [data.players?.online ?? 0] }]
      },
      options: { responsive: true }
    });
  } catch (err) {
    console.error('[server] ❌ failed to fetch or render chart:', err);
    const parent = ctx.parentNode;
    parent.innerHTML = '<p>Server stats unavailable</p>';
  }
});
