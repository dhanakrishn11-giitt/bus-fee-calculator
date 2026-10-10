const rupee = n => '₹' + Number(n).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);

async function api(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json',
      Authorization: 'Bearer ' + (localStorage.getItem('token') || ''), ...(opts.headers || {}) }
  });
  if (r.status === 401 && localStorage.getItem('token')) { logout(); return; }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
async function downloadPdf(query) {
  const r = await fetch('/api/receipt?' + query,
    { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
  if (!r.ok) { alert('Could not create receipt'); return; }
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement('a');
  a.href = url; a.download = 'ev-receipt.pdf'; a.click();
  URL.revokeObjectURL(url);
}
function logout() { localStorage.clear(); location.href = 'index.html'; }
function fillSelect(el, items) { el.innerHTML = items.map(i => `<option>${i}</option>`).join(''); }
const badge = s => `<span class="badge ${s.split(' ')[0]}">${s}</span>`;
