// assets/js/server.js

// copyText utility
window.copyText = txt => navigator.clipboard.writeText(txt)
  .then(()=> alert('Copied!'));

// On load, render the chart but never destroy the join box
window.addEventListener('load', async () => {
  const ctx = document.getElementById('activityChart');
  try {
    const res = await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const data = await res.json();
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Now'],
        datasets: [{
          label: 'Players Online',
          data: [data.players.online]
        }]
      },
      options: {
        animation: false,
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  } catch (err) {
    // Only replace the canvas itself
    ctx.replaceWith(document.createElement('p')).textContent = 'Server status unavailable.';
  }
});
