function copyText(text){
  navigator.clipboard.writeText(text).then(_=>alert('Copied')).catch(console.error);
}
async function loadStats(){
  try {
    const res=await fetch('https://api.mcsrvstat.us/bedrock/2/ilikefish.space:19132');
    const data=await res.json();
    new Chart(document.getElementById('activityChart'), {
      type:'line',
      data:{labels:['Now'],datasets:[{label:'Online',data:[data.players.online]}]}
    });
  } catch {
    document.getElementById('activityChart').parentNode.innerHTML='<p>Offline</p>';
  }
}
window.addEventListener('load',loadStats);
