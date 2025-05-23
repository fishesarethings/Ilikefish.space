// assets/js/server.js

// simple copy helper
window.copyText = txt =>
  navigator.clipboard.writeText(txt)
    .then(() => alert('Copied!'))
    .catch(() => { /* noop */ });

// wait for DOM so #address and #port exist
window.addEventListener('DOMContentLoaded', async () => {
  // always show the join info
  const addressEl = document.getElementById('address');
  const portEl    = document.getElementById('port');
  if (addressEl) addressEl.textContent = 'ilikefish.space';
  if (portEl)    portEl.textContent    = '19132';

  // draw chart (Chart.js loaded via CDN)
  const ctx = document.getElementById('activityChart');
  if (!ctx) return;

  try {
    const res  = await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const data = await res.json();
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Now'],
        datasets: [
          { label: 'Players Online', data: [data.players.online] }
        ]
      },
      options: { responsive: true }
    });
  } catch {
    ctx.parentNode.innerHTML = '<p>Server stats unavailable</p>';
  }
});
