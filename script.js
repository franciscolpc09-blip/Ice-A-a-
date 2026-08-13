// script.js — cálculo do pedido, atualização do resumo e estados visuais
(() => {
  // ---------- Helpers ----------
  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  // ---------- DOM refs ----------
  const sizeRadios = Array.from(document.querySelectorAll('input[name="tamanho"]'));
  const sizeOptionNodes = Array.from(document.querySelectorAll('.size-option'));
  const extras = Array.from(document.querySelectorAll('input[name="extras"]'));
  const toppingSelect = document.querySelector('select[name="topping"]');
  const quantityInput = document.querySelector('#quantidade');

  const btnCalcular = document.querySelector('#btnCalcular');
  const btnConfirmar = document.querySelector('#btnConfirmar');
  const btnEditar = document.querySelector('#btnEditar');

  const summarySize = document.querySelector('#summarySize');
  const summaryExtras = document.querySelector('#summaryExtras');
  const summaryTopping = document.querySelector('#summaryTopping');
  const summaryQty = document.querySelector('#summaryQty');
  const totalPriceEl = document.querySelector('#totalPrice');

  // ---------- Getters ----------
  function getSelectedSize() {
    const checked = sizeRadios.find(r => r.checked);
    if (!checked) return { price: 0, label: '—' };
    const price = Number(checked.value || 0);
    const label = checked.dataset.label || checked.closest('.size-option')?.querySelector('.size-label')?.textContent || '';
    return { price, label: (label || '').trim() };
  }

  function getSelectedExtras() {
    return extras.filter(cb => cb.checked).map(cb => cb.dataset.label || cb.nextSibling?.textContent || cb.value).map(s => (s || '').trim());
  }

  function getExtrasTotal() {
    return extras.reduce((sum, cb) => sum + (cb.checked ? Number(cb.value || 0) : 0), 0);
  }

  function getTopping() {
    if (!toppingSelect) return { price: 0, label: '—' };
    const price = Number(toppingSelect.value || 0);
    const label = toppingSelect.selectedOptions?.[0]?.dataset?.label || toppingSelect.selectedOptions?.[0]?.text || '—';
    return { price, label: (label || '').trim() };
  }

  function getQuantity() {
    const q = Number(quantityInput?.value || 1);
    return Math.max(1, Math.floor(isFinite(q) ? q : 1));
  }

  // ---------- UI helpers ----------
  function refreshSizeVisual() {
    sizeOptionNodes.forEach(node => {
      const input = node.querySelector('input[name="tamanho"]');
      node.classList.toggle('active', !!(input && input.checked));
    });
  }

  // Sync .active on extras labels (fallback for browsers without :has)
  function refreshExtrasVisual() {
    extras.forEach(cb => {
      const label = cb.closest('label');
      if (!label) return;
      label.classList.toggle('active', !!cb.checked);
      label.setAttribute('aria-pressed', cb.checked ? 'true' : 'false');
    });
  }

  // ---------- Main calculation ----------
  function compilarPedido(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const size = getSelectedSize();
    const extrasList = getSelectedExtras();
    const extrasTotal = getExtrasTotal();
    const topping = getTopping();
    const qty = getQuantity();

    const subtotal = size.price + extrasTotal + topping.price;
    const total = subtotal * qty;

    if (summarySize) summarySize.textContent = size.label || '—';
    if (summaryExtras) summaryExtras.textContent = extrasList.length ? extrasList.join(', ') : '—';
    if (summaryTopping) summaryTopping.textContent = topping.label || '—';
    if (summaryQty) summaryQty.textContent = String(qty);
    if (totalPriceEl) totalPriceEl.textContent = fmt(total);

    refreshSizeVisual();
    refreshExtrasVisual();

    return { total, subtotal, qty, size, extrasList, topping };
  }

  // ---------- Visual helpers for buttons ----------
  function flashButton(btn, ms = 260) {
    if (!btn) return;
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    setTimeout(() => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }, ms);
  }

  function makePersistentToggle(btn) {
    if (!btn) return;
    if (!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');

    btn.addEventListener('click', () => {
      const current = btn.getAttribute('aria-pressed') === 'true';
      const next = !current;
      btn.setAttribute('aria-pressed', String(next));
      btn.classList.toggle('active', next);
    });

    btn.addEventListener('keydown', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        btn.click();
      }
    });
  }

  
  // ---------- Attach listeners ----------
  function attachListeners() {
    sizeRadios.forEach(r => r.addEventListener('change', compilarPedido));
    sizeOptionNodes.forEach(node => node.addEventListener('click', () => {
      const input = node.querySelector('input[name="tamanho"]');
      if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    }));

    extras.forEach(cb => cb.addEventListener('change', compilarPedido));
    toppingSelect?.addEventListener('change', compilarPedido);
    quantityInput?.addEventListener('input', compilarPedido);

    btnCalcular?.addEventListener('click', (e) => { flashButton(btnCalcular); compilarPedido(e); });
    btnConfirmar?.addEventListener('click', (e) => {
      e.preventDefault();
      flashButton(btnConfirmar);
      const s = compilarPedido();
      alert(`Pedido confirmado!\nTotal: ${fmt(s.total)}\nDetalhes no resumo à direita.`);
    });

    // make Edit button a persistent toggle
    makePersistentToggle(btnEditar);

    // initialize
    window.addEventListener('load', compilarPedido);
  }

  // ---------- MutationObserver (keeps visual synced if checkboxes changed programmatically) ----------
  function observeCheckboxChanges() {
    if (!('MutationObserver' in window)) return;
    const observer = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'checked' && m.target.matches('input[type="checkbox"]')) {
          refreshExtrasVisual();
        }
      });
    });
    extras.forEach(cb => observer.observe(cb, { attributes: true }));
  }

  // ---------- Init ----------
  attachListeners();
  observeCheckboxChanges();
  // ensure visuals reflect initial state
  refreshSizeVisual();
  refreshExtrasVisual();
  compilarPedido();
})();

// aplica cor ao select de topping conforme option selecionada
(function colorToppingSelect() {
  const topping = document.querySelector('select[name="topping"]');
  if (!topping) return;

  function applyColorClass() {
    const opt = topping.selectedOptions && topping.selectedOptions[0];
    const color = (opt && opt.dataset && opt.dataset.color) ? opt.dataset.color.trim() : 'default';
    // limpar classes topping-*
    topping.classList.remove('topping-default','topping-castanha','topping-leite','topping-salgado');
    // adicionar a classe apropriada
    topping.classList.add(`topping-${color}`);
  }

  topping.addEventListener('change', applyColorClass);
  // aplica na carga
  applyColorClass();
})();

/* Hero D — partículas sutis (canvas). Respeita prefers-reduced-motion. */
(function heroParticles(){
  const hero = document.querySelector('.hero-d');
  const canvas = document.querySelector('.hero-canvas');
  if (!hero || !canvas) return;

  // respect user motion preference
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { canvas.style.display = 'none'; return; }

  // size canvas to element
  function resize() {
    const rect = hero.getBoundingClientRect();
    canvas.width = Math.round(rect.width * devicePixelRatio);
    canvas.height = Math.round(rect.height * devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  const ctx = canvas.getContext('2d');
  let particles = [];
  const count = Math.max(6, Math.round(window.innerWidth / 160)); // few particles, responsive

  function rand(min, max){ return Math.random() * (max - min) + min; }

  function createParticles(){
    particles = [];
    for (let i=0;i<count;i++){
      particles.push({
        x: rand(40, hero.clientWidth - 40),
        y: rand(40, hero.clientHeight - 40),
        r: rand(6, 18),
        vx: rand(-0.2, 0.2),
        vy: rand(-0.05, 0.05),
        hue: rand(260, 320),
        alpha: rand(0.06, 0.18),
        phase: rand(0, Math.PI*2)
      });
    }
  }

  let raf;
  function frame(t){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.save();
    ctx.scale(1 / devicePixelRatio, 1 / devicePixelRatio); // keep drawing in CSS pixels
    particles.forEach(p => {
      p.x += p.vx;
      p.y += Math.sin((t/1000) + p.phase) * 0.2 + p.vy;
      // wrap
      if (p.x < -40) p.x = hero.clientWidth + 40;
      if (p.x > hero.clientWidth + 40) p.x = -40;
      if (p.y < -40) p.y = hero.clientHeight + 40;
      if (p.y > hero.clientHeight + 40) p.y = -40;

      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*3);
      const color = `hsla(${p.hue}, 85%, 60%, ${p.alpha})`;
      grd.addColorStop(0, color);
      grd.addColorStop(1, `hsla(${p.hue}, 85%, 45%, 0)`);
      ctx.beginPath();
      ctx.fillStyle = grd;
      ctx.arc(p.x, p.y, p.r*2.2, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.restore();
    raf = requestAnimationFrame(frame);
  }

  // initialize
  function start(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    createParticles();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  // responsive handling
  function onResize(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // reset scale context
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    createParticles();
  }

  // initial sizing
  function setup(){
    // reset transform before sizing
    ctx.setTransform(1,0,0,1,0,0);
    resize();
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    start();
  }

  // listeners
  let resizeTimeout;
  window.addEventListener('resize', ()=>{ clearTimeout(resizeTimeout); resizeTimeout = setTimeout(onResize, 200); });
  // observe hero size changes (e.g. mobile orientation)
  const ro = new ResizeObserver(() => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(onResize, 200); });
  ro.observe(hero);

  setup();
})();

/* Cluster parallax: move pills slightly relative to mouse
   - Each .feature-item has data-depth (0..0.4) -> higher = more movement
   - Respects prefers-reduced-motion and disables if user opted out
*/
(function clusterParallax(){
  const container = document.querySelector('.cluster-features');
  if (!container) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const items = Array.from(container.querySelectorAll('.feature-item'));
  // read depth per item (fallback to 0.12)
  const nodes = items.map(node => ({
    el: node,
    depth: parseFloat(node.dataset.depth) || 0.12,
    x: 0, y: 0,
    tx: 0, ty: 0
  }));

  let rect = container.getBoundingClientRect();
  function updateRect(){ rect = container.getBoundingClientRect(); }

  // linear interpolation for smoothness
  function lerp(a,b,t){ return a + (b-a) * t; }

  // on mouse move inside container
  function onMove(e){
    const mx = e.clientX - rect.left; // mouse pos inside
    const my = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nx = (mx - cx) / cx; // -1..1
    const ny = (my - cy) / cy; // -1..1

    nodes.forEach(n => {
      const maxX = 8 * n.depth; // px factor
      const maxY = 6 * n.depth;
      n.tx = nx * maxX;
      n.ty = ny * maxY;
    });
  }

  // leave: gently reset target to zero
  function onLeave(){
    nodes.forEach(n => { n.tx = 0; n.ty = 0; });
  }

  // animation loop applying smoothing
  let raf;
  function frame(){
    nodes.forEach(n => {
      n.x = lerp(n.x, n.tx, 0.14);
      n.y = lerp(n.y, n.ty, 0.14);
      // apply transform: translate + subtle rotate by x
      const rot = (n.x / 12) * 3; // small rotate
      n.el.style.transform = `translate3d(${n.x}px, ${-n.y}px, 0) rotateZ(${rot}deg)`;
      // also nudge glow slightly opposite direction a bit
      const glow = n.el.querySelector('.feat-glow');
      if (glow) {
        glow.style.transform = `translate(calc(-50% + ${-n.x * 0.28}px), calc(-50% + ${n.y * 0.18}px)) scaleX(${1 + n.depth * 0.06})`;
      }
    });
    raf = requestAnimationFrame(frame);
  }

  // attach events
  container.addEventListener('mousemove', onMove);
  container.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', () => { updateRect(); });

  // initial rect and start loop
  updateRect();
  frame();

  // cleanup (optional): if SPA you may want to remove listeners later
})();

/* Flavors carousel: drag/touch, arrows, keyboard, image fallback */
(function initFlavors(){
  const track = document.querySelector('.flavors-track');
  if (!track) return;

  // Drag to scroll (pointer events)
  let isDown = false, startX = 0, scrollLeft = 0;
  track.addEventListener('pointerdown', (e) => {
    isDown = true;
    track.setPointerCapture(e.pointerId);
    startX = e.clientX;
    scrollLeft = track.scrollLeft;
    track.classList.add('dragging');
  });
  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const walk = (startX - e.clientX);
    track.scrollLeft = scrollLeft + walk;
  });
  track.addEventListener('pointerup', (e) => { isDown = false; track.releasePointerCapture(e.pointerId); track.classList.remove('dragging'); });
  track.addEventListener('pointercancel', () => { isDown = false; track.classList.remove('dragging'); });

  // Arrow nav
  const prev = document.querySelector('.flavors-nav.prev');
  const next = document.querySelector('.flavors-nav.next');
  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -360, behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: 360, behavior: 'smooth' }));

  // Keyboard left/right
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: 320, behavior: 'smooth' }); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); track.scrollBy({ left: -320, behavior: 'smooth' }); }
  });

  // Focus: mark active and center
  track.addEventListener('focusin', (e) => {
    const card = e.target.closest('.flavor-card');
    if (card) {
      document.querySelectorAll('.flavor-card').forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });

  // Image fallback handler
  document.querySelectorAll('.flavor-media img').forEach(img => {
    if (img.complete && img.naturalWidth === 0) showFallback(img);
    img.addEventListener('error', () => showFallback(img));
  });

  function showFallback(img){
    const wrapper = img.closest('.flavor-media');
    if (!wrapper) return;
    img.style.display = 'none';
    const fallback = wrapper.querySelector('.media-fallback');
    if (fallback) {
      fallback.style.display = 'grid';
      // set color by parent card
      const card = wrapper.closest('.flavor-card');
      const key = card && card.dataset.color;
      if (key === 'mango') fallback.style.background = 'linear-gradient(135deg,#ffb86b,#ff8ac7)';
      if (key === 'coconut') fallback.style.background = 'linear-gradient(135deg,#7be3c1,#2fb0ff)';
      if (key === 'berry') fallback.style.background = 'linear-gradient(135deg,#9d5bd6,#ff8ac7)';
      if (key === 'traditional') fallback.style.background = 'linear-gradient(135deg,#ff8ac7,#7b3f99)';
      if (key === 'nutella') fallback.style.background = 'linear-gradient(135deg,#c68612,#9b5b08)';
      if (key === 'fit') fallback.style.background = 'linear-gradient(135deg,#2fa8a8,#0f4d47)';
    }
  }
})();