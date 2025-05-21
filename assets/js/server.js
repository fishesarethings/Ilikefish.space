// assets/js/server.js
window.copyText = txt => navigator.clipboard.writeText(txt).then(()=>alert('Copied!'));

window.addEventListener('load', async () => {
  try {
    const res = await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const data = await res.json();
    new Chart(document.getElementById('activityChart'), {
      type: 'line',
      data: {
        labels: ['Now'],
        datasets: [{ label: 'Players Online', data: [data.players.online] }]
      }
    });
  } catch {
    document.getElementById('activityChart')
      .parentNode.innerHTML = '<p>Offline</p>';
  }
});
