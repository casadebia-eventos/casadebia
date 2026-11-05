/* ============================================
   CASA DE BIA — Home: carrossel, contadores, reveal
   ============================================ */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // ===== CARROSSEL DO HERO =====
    const slides = document.querySelectorAll('.hero-slide');
    const indicators = document.querySelectorAll('.hero-indicator');
    let current = 0;
    let timer = null;

    const goTo = (i) => {
      slides[current]?.classList.remove('active');
      indicators[current]?.classList.remove('active');
      current = (i + slides.length) % slides.length;
      slides[current]?.classList.add('active');
      indicators[current]?.classList.add('active');
    };

    const start = () => {
      stop();
      timer = setInterval(() => goTo(current + 1), 6000);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    indicators.forEach((el, i) => {
      el.addEventListener('click', () => { goTo(i); start(); });
    });

    if (slides.length > 0) {
      slides[0].classList.add('active');
      indicators[0]?.classList.add('active');
      start();
    }

    // ===== CONTADOR ANIMADO DOS STATS =====
    const stats = document.querySelectorAll('.stat-num[data-count]');
    const animateCount = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(target * eased).toLocaleString('pt-BR') + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString('pt-BR') + suffix;
      };
      requestAnimationFrame(tick);
    };

    // ===== REVEAL ON SCROLL =====
    const revealEls = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          if (e.target.matches('.stat-num[data-count]')) animateCount(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => io.observe(el));
    stats.forEach(el => io.observe(el));
  });

  // ===== FOTOS DO BANNER (vêm do painel: Galeria → Banner da home) =====
  // Só mostra fotos depois de carregadas, com fade. Quem já visitou o site vê na hora
  // (as fotos ficam guardadas no aparelho). Sem nenhuma foto no painel → fotos padrão.
  const DEFAULT_HERO = [
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1920&q=80'
  ];
  let heroApplied = '';
  const applyHero = (imgs) => {
    const list = (imgs || []).filter(Boolean);
    if (!list.length) return false;
    const key = list.join('|');
    if (key === heroApplied) return true;
    heroApplied = key;
    const wrap = document.querySelector('.hero-slides');
    const slides = [...document.querySelectorAll('.hero-slide')];
    if (!wrap || !slides.length) return true;
    const first = new Image();
    const show = () => {
      // Se houver menos de 4 fotos, elas se repetem no carrossel
      slides.forEach((s, i) => { s.style.backgroundImage = `url('${list[i % list.length].replace(/'/g, '%27')}')`; });
      requestAnimationFrame(() => wrap.classList.add('ready'));
    };
    first.onload = show;
    first.onerror = show;
    first.src = list[0];
    setTimeout(() => { if (!wrap.classList.contains('ready')) show(); }, 4000);
    return true;
  };
  const cachedHero = () => { try { return (window.DataStore.loadData().config?.heroImages || []); } catch (e) { return []; } };
  // 1) Visitante que já veio antes: usa as fotos guardadas no aparelho, na hora
  const domOk = () => applyHero(cachedHero());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', domOk, { once: true }); else domOk();
  // 2) Quando o painel responde: aplica as fotos atuais (ou as padrão, se o painel não tiver nenhuma)
  window.DataStore.onReady(() => {
    if (!applyHero(cachedHero())) applyHero(DEFAULT_HERO);
  });

  // ===== PREÇOS DOS PACOTES NA HOME (vêm do painel) =====
  window.DataStore.onReady(() => {
    const pkgs = window.SIM_PRICING?.packages || {};
    const fmt = (n) => {
      const num = Number(n) || 0;
      const cents = Math.abs(num - Math.round(num)) > 0.001;
      return num.toLocaleString('pt-BR', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
    };
    document.querySelectorAll('.pkg').forEach(card => {
      const link = card.querySelector('a[href*="pkg="]');
      const id = link && new URL(link.getAttribute('href'), location.href).searchParams.get('pkg');
      const pk = id && pkgs[id];
      if (!pk) return;
      const priceEl = card.querySelector('.pkg-price-num');
      if (priceEl) priceEl.textContent = fmt(pk.price);
      const nameEl = card.querySelector('.pkg-name');
      if (nameEl && pk.name) nameEl.textContent = pk.name;

      // Itens do pacote: os mesmos do painel (Pacotes → itens inclusos), iguais ao simulador
      const featEl = card.querySelector('.pkg-features');
      const items = (pk.includedItems || []).map(t => String(t || '').trim()).filter(Boolean);
      if (featEl && items.length) {
        const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        featEl.innerHTML = items.map(t => {
          // "Tudo do Básico" → destaca o nome do plano, como antes
          const m = t.match(/^(Tudo d[oa]s?\s+)(.+)$/i);
          const html = m ? `${esc(m[1])}<strong>${esc(m[2])}</strong> incluído` : esc(t);
          return `<li class="pkg-feature"><i data-lucide="check"></i><span>${html}</span></li>`;
        }).join('');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  });
})();
