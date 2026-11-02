/* ============================================
   CASA DE BIA — Galeria com filtro + lightbox
   ============================================ */
(function () {
  window.DataStore.onReady(() => {
    const filters = document.querySelectorAll('.gallery-filter');
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    const grid = document.querySelector('.gallery-grid');
    const empty = document.querySelector('.gallery-empty');

    // Atualiza contadores nos botões de filtro
    const updateCounts = () => {
      filters.forEach(f => {
        const cat = f.dataset.filter;
        const countEl = f.querySelector('.count');
        if (!countEl) return;
        if (cat === 'all') countEl.textContent = items.length;
        else countEl.textContent = items.filter(i => i.dataset.category === cat).length;
      });
    };
    updateCounts();

    // Filtro
    let activeCategory = 'all';
    const applyFilter = (cat) => {
      activeCategory = cat;
      let visible = 0;
      items.forEach(it => {
        const match = (cat === 'all' || it.dataset.category === cat);
        it.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      if (empty) empty.style.display = visible === 0 ? '' : 'none';
    };

    filters.forEach(f => {
      f.addEventListener('click', () => {
        filters.forEach(x => x.classList.remove('active'));
        f.classList.add('active');
        applyFilter(f.dataset.filter);
      });
    });

    // ===== LIGHTBOX =====
    const lightbox = document.getElementById('lightbox');
    const lbImg = lightbox?.querySelector('.lightbox-img');
    const lbCounter = lightbox?.querySelector('.lightbox-counter');
    const lbClose = lightbox?.querySelector('.lightbox-close');
    const lbPrev = lightbox?.querySelector('.lightbox-prev');
    const lbNext = lightbox?.querySelector('.lightbox-next');
    let currentIndex = 0;

    // Lightbox navega apenas por imagens (vídeos tocam inline com controles próprios)
    const visibleItems = () => items.filter(i =>
      (activeCategory === 'all' || i.dataset.category === activeCategory) && i.dataset.type !== 'video'
    );

    const openAt = (idx) => {
      const list = visibleItems();
      if (!list.length) return;
      currentIndex = (idx + list.length) % list.length;
      const img = list[currentIndex].querySelector('img');
      if (lbImg && img) {
        lbImg.src = img.dataset.full || img.src;
        lbImg.alt = img.alt;
      }
      if (lbCounter) lbCounter.textContent = `${currentIndex + 1} / ${list.length}`;
      lightbox?.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      lightbox?.classList.remove('open');
      document.body.style.overflow = '';
    };

    items.forEach((it, i) => {
      it.addEventListener('click', () => {
        if (it.dataset.type === 'video') return; // vídeo: deixa os controles nativos agirem
        const list = visibleItems();
        const idx = list.indexOf(it);
        if (idx >= 0) openAt(idx);
      });
    });

    lbClose?.addEventListener('click', close);
    lbPrev?.addEventListener('click', () => openAt(currentIndex - 1));
    lbNext?.addEventListener('click', () => openAt(currentIndex + 1));
    lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', (e) => {
      if (!lightbox?.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') openAt(currentIndex - 1);
      if (e.key === 'ArrowRight') openAt(currentIndex + 1);
    });
  });
})();
