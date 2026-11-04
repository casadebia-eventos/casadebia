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

  // ===== FOTOS DO BANNER (vêm do painel, se cadastradas) =====
  window.DataStore.onReady(() => {
    const imgs = (window.DataStore.loadData().config?.heroImages || []).filter(Boolean);
    if (!imgs.length) return;
    const slides = [...document.querySelectorAll('.hero-slide')];
    // Se houver menos de 4 fotos, elas se repetem no carrossel
    slides.forEach((s, i) => {
      const url = imgs[i % imgs.length];
      s.style.backgroundImage = `url('${url.replace(/'/g, '%27')}')`;
    });
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
