/* ============================================
   CASA DE BIA — Layout: navbar, footer, whatsapp
   Injeta os elementos compartilhados em todas as páginas.
   ============================================ */
(function () {
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const NAV_LINKS = [
    { href: 'index.html',       icon: 'home',         label: 'Home' },
    { href: 'fotos.html',       icon: 'image',        label: 'Fotos' },
    { href: 'localizacao.html', icon: 'map-pin',      label: 'Localização' },
    { href: 'servicos.html',    icon: 'sparkles',     label: 'Serviços' }
  ];

  const isActive = (href) => {
    if (path === '' || path === 'index.html') return href === 'index.html';
    return href === path;
  };

  // ===== NAVBAR =====
  const navHTML = `
    <nav class="navbar" id="navbar">
      <div class="nav-container">
        <a href="index.html" class="nav-brand" aria-label="Casa de Bia — Home">
          <div class="nav-logo"><img src="assets/img/logo-emblema.png" alt="Logo Casa de Bia" width="44" height="44"></div>
          <div class="nav-brand-text">
            <span class="nav-brand-name">Casa de Bia</span>
            <span class="nav-brand-tag">Espaço de Eventos</span>
          </div>
        </a>

        <div class="nav-menu">
          ${NAV_LINKS.map(l => `
            <a href="${l.href}" class="nav-link ${isActive(l.href) ? 'active' : ''}">
              <i data-lucide="${l.icon}"></i>${l.label}
            </a>`).join('')}
          <a href="simulador.html" class="btn btn-primary btn-sm nav-cta">
            <i data-lucide="wand-2"></i>Montar Evento
          </a>
        </div>

        <button class="nav-toggle" id="navToggle" aria-label="Abrir menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>

      <div class="nav-mobile" id="navMobile">
        ${NAV_LINKS.map(l => `
          <a href="${l.href}" class="nav-link ${isActive(l.href) ? 'active' : ''}">
            <i data-lucide="${l.icon}"></i>${l.label}
          </a>`).join('')}
        <a href="simulador.html" class="btn btn-primary nav-cta">
          <i data-lucide="wand-2"></i>Montar meu evento
        </a>
      </div>
    </nav>
  `;

  // ===== FOOTER =====
  const year = new Date().getFullYear();
  const footerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <div class="nav-logo"><img src="assets/img/logo-emblema.png" alt="Logo Casa de Bia" width="44" height="44"></div>
              <span class="footer-brand-name">Casa de Bia</span>
            </div>
            <p class="footer-desc">
              Espaço completo para eventos em Salvador. Aniversários, festas infantis, churrascos e celebrações inesquecíveis com decoração, animação e estrutura premium.
            </p>
          </div>

          <div>
            <h4 class="footer-title">Navegação</h4>
            <ul class="footer-list">
              ${NAV_LINKS.map(l => `<li><a href="${l.href}"><i data-lucide="chevron-right"></i>${l.label}</a></li>`).join('')}
              <li><a href="simulador.html"><i data-lucide="chevron-right"></i>Montar Evento</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-title">Contato</h4>
            <ul class="footer-list">
              <li><a href="${window.waLink()}" target="_blank" rel="noopener"><svg class="icon-whatsapp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>(71) 99965-2027</a></li>
              <li><a href="localizacao.html"><svg class="icon-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Salvador, BA</a></li>
              <li><a href="https://www.instagram.com/casa.debia" target="_blank" rel="noopener"><svg class="icon-instagram" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>@casa.debia</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; ${year} Casa de Bia. Todos os direitos reservados.</span>
          <span>Espaço de Eventos · Salvador, BA · <a href="admin-login.html" style="color: rgba(253, 249, 247, 0.4); font-size: inherit;">Admin</a></span>
        </div>
      </div>
    </footer>
  `;

  // ===== WHATSAPP FLOATING =====
  const waHTML = `
    <a href="${window.waLink()}" target="_blank" rel="noopener"
       class="whatsapp-float" aria-label="Falar no WhatsApp">
      <i data-lucide="message-circle"></i>
    </a>
  `;

  // Inserção no DOM
  document.addEventListener('DOMContentLoaded', () => {
    const navMount = document.getElementById('site-nav');
    const footerMount = document.getElementById('site-footer');
    const waMount = document.getElementById('site-whatsapp');

    if (navMount) navMount.innerHTML = navHTML;
    if (footerMount) footerMount.innerHTML = footerHTML;
    if (waMount) waMount.innerHTML = waHTML;

    // Lucide icons
    if (window.lucide) window.lucide.createIcons();

    // Scroll effect na navbar
    const navbar = document.getElementById('navbar');
    const onScroll = () => {
      if (!navbar) return;
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile toggle
    const toggle = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    if (toggle && mobile) {
      toggle.addEventListener('click', () => {
        const open = toggle.classList.toggle('open');
        mobile.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
      });
      mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        toggle.classList.remove('open');
        mobile.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }));
    }
  });
})();
