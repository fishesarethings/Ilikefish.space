import Chart from 'chart.js/auto';
window.copyText = text => navigator.clipboard.writeText(text)  <!-- :contentReference[oaicite:6]{index=6} -->
  .then(()=>alert('Copied!'));
window.addEventListener('load', async () => {
  try {
    const res = await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const data = await res.json();
    new Chart(document.getElementById('activityChart'), {
      type:'line',
      data:{labels:['Now'],datasets:[{label:'Players Online',data:[data.players.online]}]}
    }); <!-- :contentReference[oaicite:7]{index=7} -->
  } catch {
    document.getElementById('activityChart').parentNode.innerHTML = '<p>Offline</p>';
  }
});
