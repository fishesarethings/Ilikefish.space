// assets/js/server.js

// Chart is loaded as a global by the CDN script tag
window.copyText = text =>
  navigator.clipboard.writeText(text).then(() => alert('Copied!'));

window.addEventListener('load', async () => {
  const ctx = document.getElementById('activityChart');
  if (!ctx) return;
  try {
    const res = await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const data = await res.json();
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Now'],
        datasets: [{ label: 'Players Online', data: [data.players.online] }]
      }
    });
  } catch {
    ctx.parentNode.innerHTML = '<p>Offline</p>';
  }
});
