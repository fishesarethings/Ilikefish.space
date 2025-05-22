// assets/js/server.js
import Chart from 'chart.js/auto';

window.copyText = txt => navigator.clipboard.writeText(txt)
  .then(()=> alert('Copied!'));

window.addEventListener('load', async () => {
  try {
    const r = await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const d = await r.json();
    new Chart(document.getElementById('activityChart'), {
      type:'line',
      data:{
        labels:['Now'],
        datasets:[{label:'Players Online',data:[d.players.online]}]
      }
    });
  } catch {
    document.getElementById('activityChart')
      .parentNode.innerHTML = '<p>Offline</p>';
  }
});
