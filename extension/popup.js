document.getElementById('btn-lookup').addEventListener('click', async () => {
  const text = document.getElementById('manual').value.trim();
  if (!text) return alert('Enter or select text first');
  const tab = await getActiveTab();
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: (t) => window.dispatchEvent(new CustomEvent('Folp:action', { detail: 'lookup' })),
  });
  // send the text directly to backend as fallback
  fetch('http://localhost:5000/lookup', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:text})})
    .then(r=>r.json()).then(j=>document.getElementById('result').innerText = j.message || JSON.stringify(j,null,2)).catch(e=>document.getElementById('result').innerText='Server unreachable');
});

document.getElementById('btn-translate').addEventListener('click', async () => {
  const text = document.getElementById('manual').value.trim();
  if (!text) return alert('Enter or select text first');
  fetch('http://localhost:5000/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:text,target:'en'})})
    .then(r=>r.json()).then(j=>document.getElementById('result').innerText = j.translation || JSON.stringify(j,null,2)).catch(e=>document.getElementById('result').innerText='Server unreachable');
});

document.getElementById('btn-code').addEventListener('click', async () => {
  const text = document.getElementById('manual').value.trim();
  if (!text) return alert('Enter or select text first');
  fetch('http://localhost:5000/code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:text})})
    .then(r=>r.json()).then(j=>document.getElementById('result').innerText = j.items ? JSON.stringify(j.items,null,2) : JSON.stringify(j)).catch(e=>document.getElementById('result').innerText='Server unreachable');
});

async function getActiveTab(){
  const [tab] = await chrome.tabs.query({active:true,lastFocusedWindow:true});
  return tab;
}
