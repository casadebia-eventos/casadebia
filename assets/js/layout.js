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
          <img class="nav-logo-full" src="assets/img/logo-clara.png" alt="Casa de Bia — Espaço de Eventos">
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
              <img class="footer-logo-full" src="assets/img/logo-escura.png" alt="Casa de Bia — Espaço de Eventos">
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
          <span>Espaço de Eventos · Salvador, BA · <a href="admin-login.html" style="color: rgba(250, 247, 241, 0.4); font-size: inherit;">Admin</a></span>
        </div>
      </div>
    </footer>
  `;

  // ===== WHATSAPP FLOATING =====
  const waHTML = `
    <a href="${window.waLink()}" target="_blank" rel="noopener"
       class="whatsapp-float" aria-label="Falar no WhatsApp">
      <svg class="whatsapp-float-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
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
