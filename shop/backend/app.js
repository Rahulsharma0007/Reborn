const $ = id => document.getElementById(id);
const inr = n => '₹' + Number(n).toLocaleString('en-IN');
let products = [], cart = {}, token = localStorage.getItem('token'), who = localStorage.getItem('who'), signup = false;

function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2800); }
async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401 && token) logout(); throw new Error(d.error || 'Request failed'); }
  return d;
}
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function renderProducts() {
  $('grid').innerHTML = products.map(p => `<article class="card"><div class="em">${esc(p.emoji)}</div><h3>${esc(p.name)}</h3>
  <p>${esc(p.description)}</p><span class="price">${inr(p.price)}</span>
  <button data-id="${p.id}" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold out' : 'Add to cart'}</button></article>`).join('');
}
function renderCart() {
  const ids = Object.keys(cart); let total = 0, n = 0;
  $('lines').innerHTML = ids.length ? ids.map(id => { const p = products.find(x => x.id == id); total += p.price * cart[id]; n += cart[id];
    return `<li><span>${esc(p.name)} × ${cart[id]}</span><span>${inr(p.price * cart[id])} <button class="ghost" data-rm="${id}" aria-label="Remove ${esc(p.name)}">✕</button></span></li>`; }).join('')
    : '<li>Your cart is empty. Add something from the shop.</li>';
  $('total').textContent = inr(total); $('count').textContent = n;
}
function renderAuth() { $('who').textContent = token ? 'Hi, ' + who : ''; $('authBtn').textContent = token ? 'Log out' : 'Log in'; }
function logout() { token = who = null; localStorage.clear(); renderAuth(); }
function setMode(s) { signup = s; $('aName').hidden = !s; $('aName').required = s; $('authTitle').textContent = s ? 'Create account' : 'Log in';
  $('switchMode').textContent = s ? 'I already have an account' : 'Create an account instead'; }

$('grid').onclick = e => { const id = e.target.dataset.id; if (!id) return; cart[id] = (cart[id] || 0) + 1; renderCart(); toast('Added to cart'); };
$('lines').onclick = e => { const id = e.target.dataset.rm; if (id) { delete cart[id]; renderCart(); } };
$('cartBtn').onclick = () => $('cart').hidden = false;
$('closeCart').onclick = () => $('cart').hidden = true;
$('authBtn').onclick = () => token ? logout() : $('authDlg').showModal();
$('closeAuth').onclick = () => $('authDlg').close();
$('switchMode').onclick = () => setMode(!signup);
$('authForm').onsubmit = async e => {
  e.preventDefault();
  try {
    const body = { email: $('aEmail').value, password: $('aPass').value, ...(signup ? { name: $('aName').value } : {}) };
    const d = await api(signup ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
    token = d.token; who = d.name; localStorage.setItem('token', token); localStorage.setItem('who', who);
    $('authDlg').close(); renderAuth(); toast('Welcome, ' + who);
  } catch (err) { toast(err.message); }
};
$('checkout').onclick = async () => {
  const items = Object.entries(cart).map(([id, qty]) => ({ id: +id, qty }));
  if (!token) { $('authDlg').showModal(); return toast('Log in to place your order'); }
  try {
    const d = await api('/orders', { method: 'POST', body: JSON.stringify({ items }) });
    cart = {}; renderCart(); $('cart').hidden = true; toast(`Order #${d.orderId} placed — ${inr(d.total)}`); load();
  } catch (err) { toast(err.message); }
};
async function load() { try { products = await api('/products'); renderProducts(); renderCart(); } catch { toast('Could not load products. Refresh to try again.'); } }
renderAuth(); load();
