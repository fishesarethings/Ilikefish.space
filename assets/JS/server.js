function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => alert('Copied!'))
    .catch(console.error);
}

async function loadStats() {
  try {
    const res = await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const data = await res.json();
    updateChart(data.players.online);
  } catch {
    document.getElementById('activityChart').parentElement.innerHTML = '<p>Offline</p>';
  }
}

function updateChart(online) {
  new Chart(document.getElementById('activityChart'), {
    type: 'line',
    data: {
      labels: ['Now'],
      datasets: [{ label: 'Players Online', data: [online] }]
    },
    options: { responsive: true }
  });
}
