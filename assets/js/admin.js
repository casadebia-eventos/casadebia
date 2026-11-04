/* ============================================
   CASA DE BIA — Admin Controller
   ============================================ */
window.DataStore.onReady(function () {
  // ===== AUTH GUARD =====
  if (!window.DataStore.isLoggedIn()) {
    window.location.href = 'admin-login.html';
    return;
  }

  let data = window.DataStore.loadData();
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const formatBRL = (n) => {
    const num = Number(n) || 0;
    const hasCents = Math.abs(num - Math.round(num)) > 0.001;
    return 'R$ ' + num.toLocaleString('pt-BR', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  // ===== TOAST =====
  let toastTimer = null;
  const toast = (msg, type = 'success') => {
    const el = document.getElementById('adminToast');
    if (!el) return;
    el.className = `admin-toast ${type}`;
    const icon = type === 'error' ? 'alert-circle' : 'check-circle-2';
    el.innerHTML = `<i data-lucide="${icon}"></i><span>${msg}</span>`;
    if (window.lucide) window.lucide.createIcons();
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  };

  // ===== SAVE HELPER =====
  const persist = () => {
    if (window.DataStore.saveData(data)) {
      window.DataStore.applyToSimulator(data);
      toast('Alterações salvas');
    } else {
      toast('Erro ao salvar', 'error');
    }
  };

  // ===== NAVEGAÇÃO ENTRE SEÇÕES =====
  const sections = {
    dashboard: renderDashboard,
    pacotes: renderPacotes,
    decoracao: renderDecoracao,
    baloes: renderBaloes,
    servicos: renderServicos,
    config: renderConfig,
    historico: renderHistorico,
    agenda: renderAgenda,
    calendario: renderCalendario,
    notas: renderNotas,
    galeria: renderGaleria
  };

  $$('.admin-nav-link[data-section]').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.section;
      $$('.admin-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      $$('.admin-section').forEach(s => s.classList.remove('active'));
      const sec = document.getElementById('section-' + target);
      if (sec) sec.classList.add('active');
      sections[target]?.();
      window.scrollTo(0, 0);
      closeDrawer();
    });
  });

  // ===== DRAWER MOBILE =====
  const sidebar = $('#adminSidebar');
  const overlay = $('#adminOverlay');
  function openDrawer() { sidebar?.classList.add('open'); overlay?.classList.add('show'); }
  function closeDrawer() { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); }
  $('#btnMenu')?.addEventListener('click', openDrawer);
  overlay?.addEventListener('click', closeDrawer);

  // ===== PERFIL / AVATAR =====
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CB';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function renderAvatar(el, profile) {
    if (!el) return;
    if (profile.photo) {
      el.innerHTML = `<img src="${escapeAttr(profile.photo)}" alt="" onerror="this.parentElement.textContent='${initials(profile.name)}'">`;
      el.classList.add('has-photo');
    } else {
      el.textContent = initials(profile.name);
      el.classList.remove('has-photo');
    }
  }
  function applyProfile() {
    const p = data.profile || { name: 'Bia', photo: '' };
    renderAvatar($('#sidebarAvatar'), p);
    renderAvatar($('#topbarAvatar'), p);
    const nameEl = $('#sidebarName');
    if (nameEl) nameEl.textContent = p.name || 'Bia';
    const greet = $('#dashGreeting');
    if (greet) {
      // Uma frase por dia da semana (domingo = 0)
      const frases = [
        'Olá, chefe! Deus abençoe seu dia 🙏',
        'Vamos, chefe! Hoje é dia de fechar contrato 💪',
        'Olá, chefe! Cada evento aqui é uma história bem contada ✨',
        'Força, chefe! Disciplina hoje, agenda cheia amanhã 🚀',
        'Olá, chefe! Quem planta atendimento, colhe indicação 🌱',
        'Bora, chefe! Sexta é dia de casa cheia 🎉',
        'Olá, chefe! Deus está no comando, e a Casa de Bia também 👑'
      ];
      greet.textContent = frases[new Date().getDay()];
    }
  }

  // Logout
  $('#btnLogout')?.addEventListener('click', () => {
    if (confirm('Sair do painel?')) {
      Promise.resolve(window.DataStore.logout()).finally(() => {
        window.location.href = 'admin-login.html';
      });
    }
  });

  // ===== STATUS HELPERS =====
  const STATUSES = window.DataStore.ORDER_STATUSES || [
    { id: 'pendente', label: 'Pendente', color: '#8A6E65' }
  ];
  const statusById = (id) => STATUSES.find(s => s.id === id) || STATUSES[0];
  const statusBadge = (id) => {
    const s = statusById(id);
    return `<span class="status-badge" style="--st:${s.color}"><span class="status-dot"></span>${s.label}</span>`;
  };
  const isActive = (o) => o.status !== 'cancelado';
  // Conta como venda só o que foi fechado: orçamento "Pendente" ainda não é venda
  const isClosed = (o) => o.status !== 'cancelado' && o.status !== 'pendente';

  // ===== DASHBOARD =====
  let dashPeriod = 'month';
  const charts = {};

  function periodRange(period) {
    const now = new Date();
    const end = Date.now();
    let start, prevStart, prevEnd;
    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      prevEnd = start;
    } else if (period === '30d') {
      start = end - 30 * 864e5; prevStart = end - 60 * 864e5; prevEnd = start;
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1).getTime();
      prevStart = new Date(now.getFullYear() - 1, 0, 1).getTime();
      prevEnd = start;
    } else { // all
      start = 0; prevStart = 0; prevEnd = 0;
    }
    return { start, end, prevStart, prevEnd };
  }

  const ordTime = (o) => new Date(o.createdAt).getTime();
  const inRange = (o, a, b) => { const t = ordTime(o); return t >= a && t < b; };

  // Série numérica em ~12 baldes dentro do intervalo (para sparklines)
  function bucketSeries(orders, start, end, valueFn) {
    const buckets = 12;
    let s = start;
    if (!s) {
      const times = orders.map(ordTime).filter(Boolean);
      s = times.length ? Math.min(...times) : end - 864e5;
    }
    const span = (end - s) || 1;
    const arr = new Array(buckets).fill(0);
    orders.forEach(o => {
      const t = ordTime(o);
      if (t < s || t > end) return;
      let bi = Math.floor(((t - s) / span) * buckets);
      bi = Math.max(0, Math.min(buckets - 1, bi));
      arr[bi] += valueFn(o);
    });
    return arr;
  }

  function sparkline(series, color) {
    if (!series || !series.length) series = [0, 0];
    if (series.length === 1) series = [series[0], series[0]];
    const w = 100, h = 30;
    const max = Math.max(...series), min = Math.min(...series);
    const span = (max - min) || 1;
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg class="kpi-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function trendHTML(cur, prev) {
    if (!prev && !cur) return `<span class="kpi-trend flat">—</span>`;
    if (!prev) return `<span class="kpi-trend up"><i data-lucide="sparkles"></i>novo</span>`;
    const pct = ((cur - prev) / prev) * 100;
    const dir = pct >= 0 ? 'up' : 'down';
    const icon = pct >= 0 ? 'trending-up' : 'trending-down';
    return `<span class="kpi-trend ${dir}"><i data-lucide="${icon}"></i>${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%</span>`;
  }

  function animateNum(el, to, fmt) {
    const dur = 650, t0 = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(to);
    }
    requestAnimationFrame(tick);
  }

  function renderDashboard() {
    const orders = window.DataStore.loadOrders();
    const { start, end, prevStart, prevEnd } = periodRange(dashPeriod);
    const todayIso = new Date().toISOString().slice(0, 10);

    // Saudação / data
    const dateEl = $('#dashDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }

    // Conjuntos filtrados
    const cur = (dashPeriod === 'all') ? orders.slice() : orders.filter(o => inRange(o, start, end));
    const prev = (dashPeriod === 'all') ? [] : orders.filter(o => inRange(o, prevStart, prevEnd));
    const curActive = cur.filter(isClosed);
    const prevActive = prev.filter(isClosed);

    const sum = (arr, fn) => arr.reduce((s, o) => s + (fn(o) || 0), 0);
    const revenue = sum(curActive, o => o.total);
    const prevRevenue = sum(prevActive, o => o.total);
    const paid = sum(curActive, o => o.valorPago);
    const prevPaid = sum(prevActive, o => o.valorPago);
    const count = curActive.length;
    const prevCount = prevActive.length;
    const avg = count ? revenue / count : 0;
    const prevAvg = prevCount ? prevRevenue / prevCount : 0;
    // A receber: snapshot de todos os pedidos ativos não quitados
    const pending = orders.filter(isClosed).reduce((s, o) => s + Math.max(0, (o.total || 0) - (o.valorPago || 0)), 0);
    const futureCount = orders.filter(o => isClosed(o) && o.eventDate && o.eventDate >= todayIso).length;

    // Séries para sparklines
    const revSeries = bucketSeries(curActive, start, end, o => o.total);
    const paidSeries = bucketSeries(curActive, start, end, o => o.valorPago);
    const countSeries = bucketSeries(curActive, start, end, () => 1);

    const kpis = [
      { label: 'Faturamento', icon: 'dollar-sign', tone: '', val: revenue, prev: prevRevenue, fmt: 'brl', spark: revSeries, sc: 'var(--rose)' },
      { label: 'Recebido', icon: 'wallet', tone: 'green', val: paid, prev: prevPaid, fmt: 'brl', spark: paidSeries, sc: 'var(--whatsapp)' },
      { label: 'A receber', icon: 'hourglass', tone: 'gold', val: pending, fmt: 'brl', snapshot: true },
      { label: 'Ticket médio', icon: 'bar-chart-3', tone: 'gold', val: avg, prev: prevAvg, fmt: 'brl' },
      { label: 'Contratos', icon: 'file-check', tone: '', val: count, prev: prevCount, fmt: 'int', spark: countSeries, sc: 'var(--rose)' },
      { label: 'Eventos futuros', icon: 'calendar-clock', tone: 'green', val: futureCount, fmt: 'int', snapshot: true },
      { label: 'Orçamentos recebidos', icon: 'inbox', tone: '', val: cur.length, prev: prev.length, fmt: 'int' },
      { label: 'Taxa de fechamento', icon: 'target', tone: 'gold', val: cur.length ? Math.round(count / cur.length * 100) : 0, fmt: 'pct', snapshot: true }
    ];

    const kpiRoot = $('#dashKpis');
    kpiRoot.innerHTML = kpis.map(k => `
      <div class="stat-card kpi">
        <div class="kpi-head">
          <div class="stat-card-icon ${k.tone}"><i data-lucide="${k.icon}"></i></div>
          ${k.snapshot ? '' : trendHTML(k.val, k.prev)}
        </div>
        <div class="stat-card-num" data-to="${k.val}" data-fmt="${k.fmt}">${k.fmt === 'brl' ? 'R$ 0' : '0'}</div>
        <div class="stat-card-label">${k.label}</div>
        ${k.spark ? sparkline(k.spark, k.sc) : '<div class="kpi-spark-empty"></div>'}
      </div>
    `).join('');
    kpiRoot.querySelectorAll('.stat-card-num').forEach(el => {
      const to = Number(el.dataset.to) || 0;
      const fmt = el.dataset.fmt === 'brl' ? formatBRL : (el.dataset.fmt === 'pct' ? (n => Math.round(n) + '%') : (n => String(Math.round(n))));
      animateNum(el, to, fmt);
    });

    renderRevenueChart(orders);
    renderStatusChart(cur);
    renderPackagesChart(curActive);
    renderPipeline(curActive);
    renderUpcoming(orders, todayIso);

    // Pedidos recentes
    const recent = orders.slice(0, 3);
    const recentEl = $('#recentOrders');
    if (recent.length === 0) {
      recentEl.innerHTML = `<div class="admin-empty"><i data-lucide="inbox"></i><p>Nenhum pedido ainda. Quando alguém fechar pelo simulador, aparece aqui.</p></div>`;
    } else {
      recentEl.innerHTML = recent.map(orderCardHTML).join('');
      attachOrderListeners(recentEl);
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); charts[key] = null; }
  }
  // Preserva o <canvas> (apenas mostra/esconde), permitindo o gráfico voltar ao trocar o período
  function chartReset(canvasId) {
    const c = document.getElementById(canvasId);
    if (!c) return null;
    c.style.display = '';
    c.parentElement.querySelectorAll('.dash-empty').forEach(e => e.remove());
    return c;
  }
  function noChart(canvasId, key, msg) {
    destroyChart(key);
    const c = document.getElementById(canvasId);
    if (!c) return;
    c.style.display = 'none';
    const wrap = c.parentElement;
    wrap.querySelectorAll('.dash-empty').forEach(e => e.remove());
    const div = document.createElement('div');
    div.className = 'dash-empty';
    div.innerHTML = `<i data-lucide="bar-chart-3"></i><p>${msg}</p>`;
    wrap.appendChild(div);
    if (window.lucide) window.lucide.createIcons();
  }
  const CHART_FONT = "Inter, sans-serif";

  function renderRevenueChart(orders) {
    if (!window.Chart) return noChart('chartRevenue', 'revenue', 'Gráfico indisponível (sem conexão).');
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString('pt-BR', { month: 'short' }), total: 0 });
    }
    orders.filter(isClosed).forEach(o => {
      const d = new Date(o.createdAt);
      const b = months.find(x => x.y === d.getFullYear() && x.m === d.getMonth());
      if (b) b.total += (o.total || 0);
    });
    destroyChart('revenue');
    const ctx = chartReset('chartRevenue');
    if (!ctx) return;
    charts.revenue = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          data: months.map(m => m.total),
          backgroundColor: 'rgba(169, 120, 42, 0.85)',
          hoverBackgroundColor: '#7E5818',
          borderRadius: 8,
          maxBarThickness: 46
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => formatBRL(c.parsed.y) } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: CHART_FONT } } },
          y: { beginAtZero: true, ticks: { font: { family: CHART_FONT }, callback: (v) => 'R$ ' + (v >= 1000 ? (v / 1000) + 'k' : v) }, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }

  function renderStatusChart(curOrders) {
    if (!window.Chart) return noChart('chartStatus', 'status', 'Gráfico indisponível (sem conexão).');
    const counts = STATUSES.map(s => ({ ...s, n: curOrders.filter(o => o.status === s.id).length })).filter(s => s.n > 0);
    if (!counts.length) return noChart('chartStatus', 'status', 'Nenhum evento no período.');
    destroyChart('status');
    const ctx = chartReset('chartStatus');
    if (!ctx) return;
    charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: counts.map(s => s.label),
        datasets: [{ data: counts.map(s => s.n), backgroundColor: counts.map(s => s.color), borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: { position: 'right', labels: { font: { family: CHART_FONT }, boxWidth: 12, padding: 12 } } }
      }
    });
  }

  function renderPackagesChart(curActive) {
    if (!window.Chart) return noChart('chartPackages', 'packages', 'Gráfico indisponível (sem conexão).');
    const pkgs = data.packages || {};
    const counts = {};
    curActive.forEach(o => { const id = o.packageId || 'outro'; counts[id] = (counts[id] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return noChart('chartPackages', 'packages', 'Nenhum evento no período.');
    destroyChart('packages');
    const ctx = chartReset('chartPackages');
    if (!ctx) return;
    charts.packages = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(([id]) => pkgs[id]?.name || id),
        datasets: [{ data: entries.map(([, n]) => n), backgroundColor: 'rgba(212, 169, 66, 0.85)', hoverBackgroundColor: '#A9782A', borderRadius: 8, maxBarThickness: 28 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.parsed.x + ' evento(s)' } } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0, font: { family: CHART_FONT } }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { grid: { display: false }, ticks: { font: { family: CHART_FONT } } }
        }
      }
    });
  }

  function renderPipeline(curActive) {
    const root = $('#dashPipeline');
    if (!root) return;
    const total = curActive.reduce((s, o) => s + (o.total || 0), 0);
    const paid = curActive.reduce((s, o) => s + (o.valorPago || 0), 0);
    const pending = Math.max(0, total - paid);
    if (total === 0) {
      root.innerHTML = `<div class="dash-empty"><i data-lucide="wallet"></i><p>Sem valores no período.</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    const pctPaid = Math.round((paid / total) * 100);
    root.innerHTML = `
      <div class="pipe-bar">
        <div class="pipe-fill" style="width:${pctPaid}%"></div>
      </div>
      <div class="pipe-legend">
        <div><span class="pipe-key paid"></span>Recebido <strong>${formatBRL(paid)}</strong> <small>(${pctPaid}%)</small></div>
        <div><span class="pipe-key pending"></span>A receber <strong>${formatBRL(pending)}</strong> <small>(${100 - pctPaid}%)</small></div>
        <div class="pipe-total">Total no período <strong>${formatBRL(total)}</strong></div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  function countdownLabel(eventIso, todayIso) {
    const a = new Date(eventIso + 'T00:00:00'), b = new Date(todayIso + 'T00:00:00');
    const days = Math.round((a - b) / 864e5);
    if (days === 0) return { txt: 'Hoje', cls: 'soon' };
    if (days === 1) return { txt: 'Amanhã', cls: 'soon' };
    if (days <= 7) return { txt: `Faltam ${days} dias`, cls: 'soon' };
    return { txt: `Faltam ${days} dias`, cls: '' };
  }

  function renderUpcoming(orders, todayIso) {
    const root = $('#dashUpcoming');
    if (!root) return;
    const upcoming = orders
      .filter(o => isActive(o) && o.eventDate && o.eventDate >= todayIso)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 5);
    if (!upcoming.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="calendar-x"></i><p>Nenhum evento futuro agendado.</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    root.innerHTML = '<div class="upcoming-list">' + upcoming.map(o => {
      const d = new Date(o.eventDate + 'T00:00:00');
      const cd = countdownLabel(o.eventDate, todayIso);
      return `
        <div class="upcoming-item" data-open-order="${o.id}">
          <div class="upcoming-date">
            <span class="up-day">${String(d.getDate()).padStart(2, '0')}</span>
            <span class="up-mon">${d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
          </div>
          <div class="upcoming-info">
            <strong>${escapeHTML(o.customerName || 'Sem nome')}</strong>
            <div class="upcoming-meta">${statusBadge(o.status)} <span class="up-count ${cd.cls}">${cd.txt}</span></div>
          </div>
          <div class="upcoming-total">${formatBRL(o.total || 0)}</div>
          <i data-lucide="chevron-right" class="upcoming-arrow"></i>
        </div>
      `;
    }).join('') + '</div>';
    root.querySelectorAll('[data-open-order]').forEach(el => {
      el.addEventListener('click', () => openEventModal(el.dataset.openOrder));
    });
    if (window.lucide) window.lucide.createIcons();
  }

  // Listeners do filtro de período
  $$('#dashPeriod button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#dashPeriod button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dashPeriod = btn.dataset.period;
      renderDashboard();
    });
  });

  // ===== PACOTES =====
  function renderPacotes() {
    const root = $('#pacotesRoot');
    root.innerHTML = Object.values(data.packages).map(pkg => `
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>${pkg.name}</h3>
            <p>ID: <code>${pkg.id}</code></p>
          </div>
        </div>
        <div class="admin-grid cols-2">
          <div class="admin-field">
            <label>Preço base</label>
            <div class="admin-field-prefix">
              <span class="prefix">R$</span>
              <input type="number" min="0" data-pkg="${pkg.id}" data-field="price" value="${pkg.price}">
            </div>
          </div>
          <div class="admin-field">
            <label>Capacidade <small>(pessoas)</small></label>
            <input type="number" min="1" data-pkg="${pkg.id}" data-field="capacity" value="${pkg.capacity}">
          </div>
          <div class="admin-field">
            <label>Taxa por excedente <small>(R$ por pessoa acima da capacidade)</small></label>
            <div class="admin-field-prefix">
              <span class="prefix">R$</span>
              <input type="number" min="0" data-pkg="${pkg.id}" data-field="extraPerGuest" value="${pkg.extraPerGuest}">
            </div>
          </div>
          <div class="admin-field">
            <label>Inclui no pacote</label>
            <div style="display:flex; gap: var(--space-4); padding-top: var(--space-2); flex-wrap: wrap;">
              <label style="font-weight:400; display:flex; gap:6px; align-items:center;">
                <input type="checkbox" data-pkg="${pkg.id}" data-field="includesGas" ${pkg.includesGas ? 'checked' : ''}>
                Gás
              </label>
              <label style="font-weight:400; display:flex; gap:6px; align-items:center;">
                <input type="checkbox" data-pkg="${pkg.id}" data-field="includesDecoration" ${pkg.includesDecoration ? 'checked' : ''}>
                Decoração
              </label>
              <label style="font-weight:400; display:flex; gap:6px; align-items:center;">
                <input type="checkbox" data-pkg="${pkg.id}" data-field="includesPhotographer" ${pkg.includesPhotographer ? 'checked' : ''}>
                Fotografia
              </label>
            </div>
          </div>
        </div>
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Itens exibidos no site <small>(lista "o que inclui" no card do simulador — itens livres)</small></label>
          <div class="array-editor" data-pkg-items="${pkg.id}">
            ${(pkg.includedItems || []).map((it, i) => arrayRowHTML(it, i)).join('')}
            <span class="array-add" data-add-pkg-item="${pkg.id}"><i data-lucide="plus"></i>Adicionar item</span>
          </div>
        </div>
      </div>
    `).join('');

    // Listeners — campos simples
    root.querySelectorAll('[data-pkg][data-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const pkgId = inp.dataset.pkg;
        const field = inp.dataset.field;
        const val = inp.type === 'checkbox' ? inp.checked
                  : inp.type === 'number' ? Number(inp.value)
                  : inp.value;
        data.packages[pkgId][field] = val;
        persist();
      });
    });

    // Listeners — itens livres (includedItems) por pacote
    root.querySelectorAll('[data-pkg-items]').forEach(container => {
      const pkgId = container.dataset.pkgItems;
      data.packages[pkgId].includedItems = data.packages[pkgId].includedItems || [];
      const list = data.packages[pkgId].includedItems;
      container.querySelectorAll('.array-row input').forEach((inp, i) => {
        inp.addEventListener('change', () => { list[i] = inp.value; persist(); });
      });
      container.querySelectorAll('.array-row [data-remove]').forEach(btn => {
        btn.addEventListener('click', () => { list.splice(+btn.dataset.remove, 1); persist(); renderPacotes(); });
      });
    });
    root.querySelectorAll('[data-add-pkg-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pkgId = btn.dataset.addPkgItem;
        data.packages[pkgId].includedItems = data.packages[pkgId].includedItems || [];
        data.packages[pkgId].includedItems.push('Novo item');
        persist();
        renderPacotes();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ===== DECORAÇÃO =====
  function renderDecoracao() {
    renderPricingRule();
    renderCombos();
    renderAddons();
    renderPromaxIncluded();
    renderThemesAdmin();
  }

  // ===== TEMAS DO EVENTO =====
  function renderThemesAdmin() {
    const root = $('#themesRoot');
    if (!root) return;
    const D = data.decoration;
    if (!Array.isArray(D.themes)) D.themes = [];
    const pkgs = Object.values(data.packages || {});
    root.innerHTML = D.themes.length ? D.themes.map((t, idx) => `
      <div class="admin-card" data-theme-idx="${idx}" style="margin-top: var(--space-4);">
        <div class="admin-card-header">
          <div><h3>${escapeAttr(t.name || 'Tema')}</h3></div>
          <button class="btn btn-outline btn-sm" data-theme-delete="${idx}"><i data-lucide="trash-2"></i>Excluir</button>
        </div>
        <div class="admin-field"><label>Nome do tema</label><input data-theme-field="name" value="${escapeAttr(t.name || '')}"></div>
        <div class="admin-field" style="margin-top: var(--space-3);"><label>Descrição curta</label><input data-theme-field="description" value="${escapeAttr(t.description || '')}"></div>
        <div class="admin-field" style="margin-top: var(--space-3);">
          <label>Foto</label>
          <input type="url" data-theme-field="image" placeholder="https://..." value="${escapeAttr(t.image || '')}">
          ${t.image ? `<img src="${escapeAttr(t.image)}" alt="" style="margin-top:8px;max-width:200px;border-radius:8px;display:block;">` : ''}
        </div>
        <div class="admin-field" style="margin-top: var(--space-3);">
          <label>Aparece nos planos</label>
          <div style="display:flex;flex-wrap:wrap;gap:12px;">
            ${pkgs.map(p => `<label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" data-theme-pkg="${p.id}" ${(t.packages || []).includes(p.id) ? 'checked' : ''}>${escapeAttr(p.name)}</label>`).join('')}
          </div>
        </div>
      </div>`).join('') : '<p class="help">Nenhum tema cadastrado ainda. Clique em "Novo tema".</p>';

    root.querySelectorAll('[data-theme-idx]').forEach(card => {
      const t = D.themes[+card.dataset.themeIdx];
      card.querySelectorAll('[data-theme-field]').forEach(inp => inp.addEventListener('change', () => {
        t[inp.dataset.themeField] = inp.value.trim();
        persist();
        if (inp.dataset.themeField !== 'description') renderThemesAdmin();
      }));
      card.querySelectorAll('[data-theme-pkg]').forEach(chk => chk.addEventListener('change', () => {
        t.packages = [...card.querySelectorAll('[data-theme-pkg]:checked')].map(c => c.dataset.themePkg);
        persist();
      }));
      card.querySelector('[data-theme-delete]')?.addEventListener('click', () => {
        if (confirm(`Excluir o tema "${t.name}"?`)) { D.themes.splice(+card.dataset.themeIdx, 1); persist(); renderThemesAdmin(); }
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }
  $('#btnAddTheme')?.addEventListener('click', () => {
    if (!Array.isArray(data.decoration.themes)) data.decoration.themes = [];
    data.decoration.themes.push({ id: 'tema-' + Date.now().toString(36), name: 'Novo tema', description: '', image: '', packages: ['promax'] });
    persist();
    renderThemesAdmin();
  });

  // Decoração já montada de cada pacote com decoração inclusa (foto + título + itens)
  function renderPromaxIncluded() {
    const root = $('#promaxIncludedRoot');
    if (!root) return;
    const D = data.decoration;
    if (!D.included) D.included = {};
    const pkgs = Object.values(data.packages || {}).filter(p => p.includesDecoration);
    pkgs.forEach(p => {
      if (!D.included[p.id]) {
        const old = p.id === 'promax' ? D.promaxIncluded : null;
        D.included[p.id] = { title: old?.title || `Decoração ${p.name} — já montada e inclusa`, items: old?.items ? [...old.items] : [], image: '' };
      }
    });

    root.innerHTML = pkgs.length ? pkgs.map(p => {
      const inc = D.included[p.id];
      return `
      <div class="admin-card" data-inc-pkg="${p.id}" style="margin-top: var(--space-4);">
        <h3 style="margin:0 0 var(--space-3);">Pacote ${escapeAttr(p.name)}</h3>
        <div class="admin-field">
          <label>Título</label>
          <input data-inc-field="title" value="${escapeAttr(inc.title || '')}">
        </div>
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Foto da decoração deste pacote</label>
          <input type="url" data-inc-field="image" placeholder="https://..." value="${escapeAttr(inc.image || '')}">
          ${inc.image ? `<img src="${escapeAttr(inc.image)}" alt="" style="margin-top:8px;max-width:220px;border-radius:8px;display:block;">` : '<small style="display:block;margin-top:6px;opacity:.7;">Sem foto: o cliente vê só a descrição.</small>'}
        </div>
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Itens inclusos</label>
          <div class="array-editor">
            ${(inc.items || []).map((it, i) => arrayRowHTML(it, i)).join('')}
            <span class="array-add" data-inc-add><i data-lucide="plus"></i>Adicionar item</span>
          </div>
        </div>
      </div>`;
    }).join('') : '<p>Nenhum pacote está marcado como "inclui decoração".</p>';

    root.querySelectorAll('[data-inc-pkg]').forEach(card => {
      const inc = D.included[card.dataset.incPkg];
      card.querySelector('[data-inc-field="title"]')?.addEventListener('change', (e) => { inc.title = e.target.value; persist(); });
      card.querySelector('[data-inc-field="image"]', '[data-theme-field="image"]')?.addEventListener('change', (e) => { inc.image = e.target.value.trim(); persist(); renderPromaxIncluded(); });
      card.querySelectorAll('.array-row input').forEach((inp, i) => {
        inp.addEventListener('change', () => { inc.items[i] = inp.value; persist(); });
      });
      card.querySelectorAll('.array-row [data-remove]').forEach(btn => {
        btn.addEventListener('click', () => { inc.items.splice(+btn.dataset.remove, 1); persist(); renderPromaxIncluded(); });
      });
      card.querySelector('[data-inc-add]')?.addEventListener('click', () => {
        inc.items = inc.items || []; inc.items.push('Novo item'); persist(); renderPromaxIncluded();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ===== PREÇO POR PLANO (combos e balões) =====
  function planPriceTableHTML(kind, idx, item) {
    const pkgs = Object.values(data.packages || {});
    const t = item.pricesByPackage || {};
    const hasTable = item.pricesByPackage && Object.keys(item.pricesByPackage).length;
    return `
      <div class="admin-field" style="margin-top: var(--space-4);">
        <label>Preço em cada plano</label>
        <div class="plan-price-table">
          ${pkgs.map(p => {
            const v = hasTable ? t[p.id] : item.price;
            return `<label class="plan-price-cell admin-field">
              <span>${escapeAttr(p.name)}</span>
              <div class="admin-field-prefix"><span class="prefix">R$</span>
                <input type="number" min="0" step="0.01" placeholder="não oferece" data-pp-kind="${kind}" data-pp-idx="${idx}" data-pp-pkg="${p.id}" value="${v === null || v === undefined || v === '' ? '' : v}">
              </div>
            </label>`;
          }).join('')}
        </div>
        <span class="help">Use 0 quando já estiver incluso no plano. Deixe <strong>em branco</strong> para não aparecer naquele plano.</span>
      </div>`;
  }
  document.addEventListener('change', (e) => {
    const inp = e.target.closest && e.target.closest('[data-pp-kind]');
    if (!inp) return;
    const list = inp.dataset.ppKind === 'combo' ? data.decoration.combos : data.balloons;
    const item = list[+inp.dataset.ppIdx];
    if (!item) return;
    if (inp.dataset.ppKind === 'combo') {
      item.pricesByPackage = item.pricesByPackage || {};
    } else if (!item.pricesByPackage || !Object.keys(item.pricesByPackage).length) {
      // Primeira edição: começa a tabela com o preço geral em todos os planos
      item.pricesByPackage = {};
      Object.keys(data.packages || {}).forEach(k => { item.pricesByPackage[k] = Number(item.price) || 0; });
    }
    item.pricesByPackage[inp.dataset.ppPkg] = inp.value === '' ? null : (parseFloat(inp.value) || 0);
    persist();
  });

  // ===== PREÇO DAS DECORAÇÕES: valor base + diferença de cada combo =====
  function pricingRule() {
    const D = data.decoration;
    if (!D.pricing || D.pricing.base === undefined) {
      D.pricing = { base: 300, baseIncluded: ['premium'], manual: ['promax'] };
    }
    D.pricing.baseIncluded = D.pricing.baseIncluded || [];
    D.pricing.manual = D.pricing.manual || [];
    return D.pricing;
  }
  function comboPriceFor(c, pkgId) {
    const pr = pricingRule();
    if (pr.manual.includes(pkgId)) {
      const v = c.pricesByPackage ? c.pricesByPackage[pkgId] : undefined;
      return (v === null || v === undefined || v === '') ? null : (Number(v) || 0);
    }
    const diff = Number(c.diff) || 0;
    if (pr.baseIncluded.includes(pkgId)) return Math.max(0, diff);
    return Math.max(0, (Number(pr.base) || 0) + diff);
  }
  // Dentro de cada combo fica só o preço do Pro Max (regra própria)
  function comboPriceHTML(idx, c) {
    const pr = pricingRule();
    return Object.values(data.packages || {}).filter(p => pr.manual.includes(p.id)).map(p => {
      const v = c.pricesByPackage ? c.pricesByPackage[p.id] : undefined;
      return `
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Preço no ${escapeAttr(p.name)} <small>(em branco = não aparece no ${escapeAttr(p.name)})</small></label>
          <div class="admin-field-prefix" style="max-width:220px;">
            <span class="prefix">R$</span>
            <input type="number" min="0" step="0.01" placeholder="não aparece" data-pp-kind="combo" data-pp-idx="${idx}" data-pp-pkg="${p.id}" value="${v === null || v === undefined || v === '' ? '' : v}">
          </div>
        </div>`;
    }).join('');
  }
  function renderPricingRule() {
    const root = $('#pricingRuleRoot');
    if (!root) return;
    const pr = pricingRule();
    const combos = (data.decoration.combos || []).filter(c => c.type !== 'completa');
    const pkgs = Object.values(data.packages || {}).filter(p => !pr.manual.includes(p.id));
    const noDeco = pkgs.filter(p => !pr.baseIncluded.includes(p.id)).map(p => p.name).join(' / ');
    const withBase = pkgs.filter(p => pr.baseIncluded.includes(p.id)).map(p => p.name).join(' / ');
    root.innerHTML = `
      <div class="deco-price-box">
        <div class="deco-price-row deco-price-base">
          <span class="deco-price-name">Valor base</span>
          <div class="admin-field-prefix"><span class="prefix">R$</span>
            <input type="number" min="0" step="0.01" data-pr-base value="${Number(pr.base) || 0}"></div>
        </div>
        ${combos.map(c => {
          const i = data.decoration.combos.indexOf(c);
          return `
          <div class="deco-price-row">
            <span class="deco-price-name">${escapeAttr((c.name || '').replace(/^Combo\s*-?\s*/i, '') || 'Combo')}</span>
            <div class="admin-field-prefix"><span class="prefix">+ R$</span>
              <input type="number" min="0" step="0.01" data-pr-diff="${i}" value="${Number(c.diff) || 0}"></div>
          </div>`;
        }).join('')}
      </div>
      <table class="deco-price-result">
        <thead><tr><th></th><th>${escapeAttr(noDeco)}</th>${withBase ? `<th>${escapeAttr(withBase)}</th>` : ''}</tr></thead>
        <tbody>
          ${combos.map(c => `<tr>
            <td>${escapeAttr((c.name || '').replace(/^Combo\s*-?\s*/i, ''))}</td>
            <td>${formatBRL((Number(pr.base) || 0) + (Number(c.diff) || 0))}</td>
            ${withBase ? `<td>${formatBRL(Math.max(0, Number(c.diff) || 0))}</td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>
      <span class="help">Você muda só os campos de cima. A tabela mostra quanto o cliente paga.${withBase ? ` O ${escapeAttr(withBase)} já tem o valor base no preço do plano, por isso paga só a diferença.` : ''}</span>`;
    root.querySelector('[data-pr-base]')?.addEventListener('change', (e) => {
      pr.base = parseFloat(e.target.value) || 0;
      syncComboPrices(); persist(); renderPricingRule(); renderCombos();
    });
    root.querySelectorAll('[data-pr-diff]').forEach(inp => inp.addEventListener('change', () => {
      const c = data.decoration.combos[+inp.dataset.prDiff];
      if (c) c.diff = parseFloat(inp.value) || 0;
      syncComboPrices(); persist(); renderPricingRule(); renderCombos();
    }));
  }
  // Mantém combo.price (valor total) igual a base + diferença
  function syncComboPrices() {
    const pr = pricingRule();
    (data.decoration.combos || []).forEach(c => { c.price = (Number(pr.base) || 0) + (Number(c.diff) || 0); });
  }

  function renderCombos() {
    const root = $('#combosRoot');
    if (!data.decoration.combos.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="palette"></i><p>Nenhum combo cadastrado. Adicione o primeiro abaixo.</p></div>`;
    } else {
      root.innerHTML = data.decoration.combos.map((c, idx) => `
        <div class="admin-item" data-combo-idx="${idx}">
          <div class="admin-item-summary" data-toggle>
            <img src="${c.image || ''}" class="admin-item-img" onerror="this.style.display='none'">
            <div class="admin-item-info">
              <h4>${c.name}</h4>
              <p>${c.type === 'completa' ? '(cópia antiga — pode excluir) · ' : ''}${c.description}</p>
            </div>
            <div class="admin-item-price">+ ${formatBRL(Number(c.diff) || 0)}<small style="display:block;font-size:.7em;opacity:.7;font-weight:500;">sobre o base</small></div>
            <div class="admin-item-actions">
              <button class="admin-icon-btn" data-toggle aria-label="Editar"><i data-lucide="chevron-down"></i></button>
              <button class="admin-icon-btn danger" data-delete-combo="${idx}" aria-label="Excluir"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
          <div class="admin-item-body">
            <div class="admin-grid cols-2">
              <div class="admin-field">
                <label>Nome</label>
                <input data-combo-field="name" data-idx="${idx}" value="${escapeAttr(c.name)}">
              </div>
              <div class="admin-field">
                <label>Categoria <small>(ex: Clássico, Premium, Temático)</small></label>
                <input data-combo-field="category" data-idx="${idx}" value="${escapeAttr(c.category || '')}">
              </div>
            </div>
            ${comboPriceHTML(idx, c)}
            <div class="admin-field" style="margin-top: var(--space-4);">
              <label>Descrição</label>
              <textarea data-combo-field="description" data-idx="${idx}" rows="4">${escapeAttr(c.description)}</textarea>
            </div>
            <div class="admin-field" style="margin-top: var(--space-4);">
              <label>Imagens <small>(uma URL por linha — a primeira é a capa)</small></label>
              <textarea data-combo-field="images" data-idx="${idx}" rows="${Math.max(3, ((c.images || (c.image ? [c.image] : [])).length) + 1)}">${(c.images || (c.image ? [c.image] : [])).map(u => escapeAttr(u)).join('\n')}</textarea>
              <span class="help">${(c.images || (c.image ? [c.image] : [])).length} imagem(ns) cadastrada(s).</span>
            </div>
            <div class="admin-field" style="margin-top: var(--space-4);">
              <label>Itens inclusos</label>
              <div class="array-editor" data-combo-items="${idx}">
                ${c.items.map((it, i) => arrayRowHTML(it, i)).join('')}
                <span class="array-add" data-add-item="${idx}"><i data-lucide="plus"></i>Adicionar item</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Toggles + listeners
    root.querySelectorAll('.admin-item').forEach(item => {
      const toggle = (e) => {
        if (e.target.closest('[data-delete-combo]') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea') || e.target.closest('.array-add') || e.target.closest('.array-row .admin-icon-btn')) return;
        item.classList.toggle('open');
      };
      item.querySelectorAll('[data-toggle]').forEach(el => el.addEventListener('click', toggle));
    });

    // Field changes
    root.querySelectorAll('[data-combo-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.dataset.idx;
        const f = inp.dataset.comboField;
        let v;
        if (f === 'images') {
          v = (inp.value || '').split('\n').map(s => s.trim()).filter(Boolean);
        } else {
          v = inp.type === 'number' ? Number(inp.value) : inp.value;
        }
        data.decoration.combos[idx][f] = v;
        persist();
        if (f === 'name' || f === 'price' || f === 'type' || f === 'images' || f === 'category' || f === 'description') {
          const wasOpen = root.querySelector(`[data-combo-idx="${idx}"]`)?.classList.contains('open');
          renderCombos();
          if (wasOpen) root.querySelector(`[data-combo-idx="${idx}"]`)?.classList.add('open');
        }
      });
    });

    // Items array
    root.querySelectorAll('[data-combo-items]').forEach(container => {
      const idx = +container.dataset.comboItems;
      container.querySelectorAll('.array-row input').forEach((inp, i) => {
        inp.addEventListener('change', () => {
          data.decoration.combos[idx].items[i] = inp.value;
          persist();
        });
      });
      container.querySelectorAll('.array-row [data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = +btn.dataset.remove;
          data.decoration.combos[idx].items.splice(i, 1);
          persist();
          renderCombos();
          $(`[data-combo-idx="${idx}"]`)?.classList.add('open');
        });
      });
    });
    root.querySelectorAll('[data-add-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.addItem;
        data.decoration.combos[idx].items.push('Novo item');
        persist();
        renderCombos();
        $(`[data-combo-idx="${idx}"]`)?.classList.add('open');
      });
    });

    // Delete
    root.querySelectorAll('[data-delete-combo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = +btn.dataset.deleteCombo;
        if (confirm(`Excluir o combo "${data.decoration.combos[idx].name}"?`)) {
          data.decoration.combos.splice(idx, 1);
          persist();
          renderCombos();
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function renderAddons() {
    const root = $('#addonsRoot');
    if (!data.decoration.addons.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="sparkles"></i><p>Nenhum adicional cadastrado.</p></div>`;
    } else {
      root.innerHTML = data.decoration.addons.map((a, idx) => `
        <div class="admin-item" data-addon-idx="${idx}">
          <div class="admin-item-summary" data-toggle>
            <div class="admin-item-icon"><i data-lucide="sparkles"></i></div>
            <div class="admin-item-info">
              <h4>${a.name}</h4>
              <p>${a.description || ''}</p>
            </div>
            <div class="admin-item-price">${formatBRL(a.price)}</div>
            <div class="admin-item-actions">
              <button class="admin-icon-btn" data-toggle><i data-lucide="chevron-down"></i></button>
              <button class="admin-icon-btn danger" data-delete-addon="${idx}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
          <div class="admin-item-body">
            <div class="admin-grid cols-2">
              <div class="admin-field">
                <label>Nome</label>
                <input data-addon-field="name" data-idx="${idx}" value="${escapeAttr(a.name)}">
              </div>
              <div class="admin-field">
                <label>Preço</label>
                <div class="admin-field-prefix">
                  <span class="prefix">R$</span>
                  <input type="number" min="0" data-addon-field="price" data-idx="${idx}" value="${a.price}">
                </div>
              </div>
            </div>
            <div class="admin-field" style="margin-top: var(--space-4);">
              <label>Descrição</label>
              <input data-addon-field="description" data-idx="${idx}" value="${escapeAttr(a.description || '')}">
            </div>
          </div>
        </div>
      `).join('');
    }

    root.querySelectorAll('.admin-item').forEach(item => {
      const toggle = (e) => {
        if (e.target.closest('[data-delete-addon]') || e.target.closest('input')) return;
        item.classList.toggle('open');
      };
      item.querySelectorAll('[data-toggle]').forEach(el => el.addEventListener('click', toggle));
    });

    root.querySelectorAll('[data-addon-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.dataset.idx;
        const f = inp.dataset.addonField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.decoration.addons[idx][f] = v;
        persist();
      });
    });

    root.querySelectorAll('[data-delete-addon]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = +btn.dataset.deleteAddon;
        if (confirm(`Excluir "${data.decoration.addons[idx].name}"?`)) {
          data.decoration.addons.splice(idx, 1);
          persist();
          renderAddons();
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Adicionar combo / adicional
  $('#btnAddCombo')?.addEventListener('click', () => {
    const id = 'combo-' + Date.now();
    data.decoration.combos.push({
      id, type: 'pegue-monte', category: '', name: 'Novo combo', description: 'Descrição do combo',
      items: ['Item 1'], price: 100, images: []
    });
    persist();
    renderCombos();
  });
  $('#btnAddAddon')?.addEventListener('click', () => {
    data.decoration.addons.push({
      id: 'addon-' + Date.now(), name: 'Novo adicional', description: '', price: 50
    });
    persist();
    renderAddons();
  });

  // ===== SERVIÇOS (genérico — suporta criar/editar/excluir + profissionais) =====
  // Definição das sub-listas de cada modo (itens, opções, tipos, pacotes)
  const SVC_LISTS = {
    items: {
      label: 'Itens (escolha múltipla)', addLabel: 'Adicionar item', cols: 'cols-2',
      fields: [{ key: 'name', label: 'Nome' }, { key: 'price', label: 'Preço', money: true }],
      newRow: () => ({ id: 'it-' + Date.now().toString(36), name: 'Novo item', price: 0 })
    },
    controlOptions: {
      label: 'Opções de controle de acesso', addLabel: 'Adicionar opção', cols: 'cols-2',
      fields: [{ key: 'name', label: 'Nome' }, { key: 'price', label: 'Preço adicional', money: true }],
      newRow: () => ({ id: 'ctrl-' + Date.now().toString(36), name: 'Nova opção', price: 0 })
    },
    types: {
      label: 'Tipos (adicional cobrado por hora)', addLabel: 'Adicionar tipo', cols: 'cols-2',
      fields: [{ key: 'name', label: 'Nome' }, { key: 'extraPerHour', label: 'Adicional/hora', money: true, prefix: '+R$' }],
      newRow: () => ({ id: 'tp-' + Date.now().toString(36), name: 'Novo tipo', extraPerHour: 0 })
    },
    packages: {
      label: 'Pacotes disponíveis', addLabel: 'Adicionar pacote', cols: 'cols-3',
      fields: [{ key: 'name', label: 'Nome' }, { key: 'desc', label: 'Descrição' }, { key: 'price', label: 'Preço', money: true }],
      newRow: () => ({ id: 'pk-' + Date.now().toString(36), name: 'Novo pacote', desc: '', price: 0 })
    }
  };

  function subListEditor(svcId, listName, rows) {
    const def = SVC_LISTS[listName];
    return `
      <div class="admin-field" style="margin-top: var(--space-4);">
        <label>${def.label}</label>
        <div class="admin-list">
          ${(rows || []).map((r, i) => `
            <div class="admin-item open">
              <div class="admin-item-body" style="padding: var(--space-4); border-top: none;">
                <div class="admin-grid ${def.cols}" style="gap: var(--space-3);">
                  ${def.fields.map(f => `
                    <div class="admin-field">
                      <label>${f.label}</label>
                      ${f.money
                        ? `<div class="admin-field-prefix"><span class="prefix">${f.prefix || 'R$'}</span><input type="number" min="0" data-svc="${svcId}" data-list="${listName}" data-row="${i}" data-key="${f.key}" value="${r[f.key] ?? 0}"></div>`
                        : `<input data-svc="${svcId}" data-list="${listName}" data-row="${i}" data-key="${f.key}" value="${escapeAttr(r[f.key] || '')}">`}
                    </div>
                  `).join('')}
                </div>
                <button class="btn btn-ghost btn-sm" data-del-row="${i}" data-svc="${svcId}" data-list="${listName}" style="margin-top: var(--space-3);">
                  <i data-lucide="trash-2"></i>Remover
                </button>
              </div>
            </div>
          `).join('')}
          <span class="array-add" data-add="${svcId}" data-list="${listName}"><i data-lucide="plus"></i>${def.addLabel}</span>
        </div>
      </div>
    `;
  }

  function renderServicos() {
    const root = $('#servicosRoot');
    const svcs = Object.values(data.services || {});
    root.innerHTML = svcs.length
      ? svcs.map(svcCardHTML).join('')
      : `<div class="admin-empty"><i data-lucide="sparkles"></i><p>Nenhum serviço cadastrado. Crie o primeiro acima.</p></div>`;

    // Campos base do serviço (nome, desc, categoria, imagem, hourlyRate)
    root.querySelectorAll('[data-svc-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const { svc, svcField } = inp.dataset;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.services[svc][svcField] = v;
        persist();
        if (svcField === 'name' || svcField === 'image') renderServicos();
      });
    });

    // Edição de linhas de sub-listas
    root.querySelectorAll('[data-list][data-row][data-key]').forEach(inp => {
      inp.addEventListener('change', () => {
        const { svc, list, row, key } = inp.dataset;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.services[svc][list][+row][key] = v;
        persist();
      });
    });

    // Adicionar linha em sub-lista
    root.querySelectorAll('[data-add][data-list]').forEach(btn => {
      btn.addEventListener('click', () => {
        const svc = btn.dataset.add, list = btn.dataset.list;
        data.services[svc][list] = data.services[svc][list] || [];
        data.services[svc][list].push(SVC_LISTS[list].newRow());
        persist();
        renderServicos();
      });
    });

    // Remover linha de sub-lista
    root.querySelectorAll('[data-del-row]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { svc, list, delRow } = btn.dataset;
        data.services[svc][list].splice(+delRow, 1);
        persist();
        renderServicos();
      });
    });

    // Excluir serviço inteiro
    root.querySelectorAll('[data-del-svc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delSvc;
        if (confirm(`Excluir o serviço "${data.services[id].name}"? Ele deixará de aparecer no simulador.`)) {
          delete data.services[id];
          persist();
          renderServicos();
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function svcCardHTML(svc) {
    const id = svc.id;
    const rate = (label) => `
      <div class="admin-field">
        <label>${label}</label>
        <div class="admin-field-prefix">
          <span class="prefix">R$</span>
          <input type="number" min="0" data-svc="${id}" data-svc-field="hourlyRate" value="${svc.hourlyRate || 0}">
        </div>
      </div>`;
    let extra = '';
    switch (svc.mode) {
      case 'multi-checkbox':    extra = subListEditor(id, 'items', svc.items); break;
      case 'hours':
      case 'qty-hours':         extra = rate('Valor por hora'); break;
      case 'qty-hours-control': extra = rate('Valor por hora') + subListEditor(id, 'controlOptions', svc.controlOptions); break;
      case 'type-hours':        extra = rate('Valor base por hora') + subListEditor(id, 'types', svc.types); break;
      case 'package':           extra = subListEditor(id, 'packages', svc.packages); break;
    }
    const iconInner = svc.image
      ? `<img src="${escapeAttr(svc.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm);" onerror="this.style.display='none'">`
      : `<i data-lucide="${svc.icon || 'sparkles'}"></i>`;
    return `
      <div class="admin-card">
        <div class="admin-card-header">
          <div style="display:flex; align-items:center; gap: var(--space-3);">
            <div class="admin-item-icon">${iconInner}</div>
            <div>
              <h3>${escapeAttr(svc.name)}</h3>
              <p>${escapeAttr(svc.desc || '')}${svc.category ? ` · <strong>${escapeAttr(svc.category)}</strong>` : ''}</p>
            </div>
          </div>
          <button class="admin-icon-btn danger" data-del-svc="${id}" title="Excluir serviço"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="admin-grid cols-2">
          <div class="admin-field">
            <label>Nome do serviço</label>
            <input data-svc="${id}" data-svc-field="name" value="${escapeAttr(svc.name)}">
          </div>
          <div class="admin-field">
            <label>Descrição curta</label>
            <input data-svc="${id}" data-svc-field="desc" value="${escapeAttr(svc.desc || '')}">
          </div>
          <div class="admin-field">
            <label>Categoria / nicho <small>(opcional)</small></label>
            <input data-svc="${id}" data-svc-field="category" value="${escapeAttr(svc.category || '')}">
          </div>
          <div class="admin-field">
            <label>Imagem <small>(URL, opcional)</small></label>
            <input data-svc="${id}" data-svc-field="image" value="${escapeAttr(svc.image || '')}">
          </div>
        </div>
        ${extra}
      </div>
    `;
  }

  // Criar novo serviço a partir do formulário "Novo serviço"
  function newServiceSkeleton(mode, name) {
    const id = 'svc-' + Date.now().toString(36);
    const base = { id, name, desc: '', category: '', image: '', icon: 'sparkles', mode };
    switch (mode) {
      case 'multi-checkbox':    base.items = []; break;
      case 'hours':
      case 'qty-hours':         base.hourlyRate = 50; break;
      case 'qty-hours-control': base.hourlyRate = 50; base.controlOptions = [{ id: 'ctrl-none', name: 'Sem controle', price: 0 }]; break;
      case 'type-hours':        base.hourlyRate = 50; base.types = []; break;
      case 'package':           base.packages = []; break;
    }
    return base;
  }
  $('#btnAddService')?.addEventListener('click', () => {
    const name = ($('#newSvcName')?.value || '').trim();
    const mode = $('#newSvcMode')?.value;
    if (name.length < 2) { toast('Informe um nome para o serviço', 'error'); return; }
    const svc = newServiceSkeleton(mode, name);
    data.services[svc.id] = svc;
    persist();
    if ($('#newSvcName')) $('#newSvcName').value = '';
    renderServicos();
    toast('Serviço criado');
  });

  // ===== CONFIG =====
  function renderConfig() {
    $('#cfgWhatsapp').value = data.config.whatsappNumber;
    $('#cfgGas').value = data.config.gasPrice;
    if ($('#cfgIncludedDecorationImage')) $('#cfgIncludedDecorationImage').value = data.config.includedDecorationImage || '';
    data.profile = data.profile || { name: 'Bia', photo: '' };
    if ($('#cfgProfileName')) $('#cfgProfileName').value = data.profile.name || '';
    if ($('#cfgProfilePhoto')) $('#cfgProfilePhoto').value = data.profile.photo || '';
    renderAvatar($('#cfgAvatarPreview'), data.profile);
    renderStructure();
  }

  // Estrutura do espaço (doc 8) — lista livre exibida em servicos.html
  function renderStructure() {
    const root = $('#structureRoot');
    if (!root) return;
    data.config.structureItems = data.config.structureItems || [];
    const items = data.config.structureItems;
    root.innerHTML = items.map((it, i) => arrayRowHTML(it, i)).join('') ||
      '<p class="help">Nenhum item. Clique em "Novo item".</p>';
    root.querySelectorAll('.array-row input').forEach((inp, i) => {
      inp.addEventListener('change', () => { items[i] = inp.value; persist(); });
    });
    root.querySelectorAll('.array-row [data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        items.splice(+btn.dataset.remove, 1);
        persist();
        renderStructure();
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }
  $('#btnAddStructure')?.addEventListener('click', () => {
    data.config.structureItems = data.config.structureItems || [];
    data.config.structureItems.push('Novo item');
    persist();
    renderStructure();
  });
  $('#cfgProfileName')?.addEventListener('input', (e) => {
    data.profile = data.profile || {};
    data.profile.name = e.target.value;
    renderAvatar($('#cfgAvatarPreview'), data.profile);
    applyProfile();
  });
  $('#cfgProfileName')?.addEventListener('change', persist);
  $('#cfgProfilePhoto')?.addEventListener('change', (e) => {
    data.profile = data.profile || {};
    data.profile.photo = e.target.value.trim();
    renderAvatar($('#cfgAvatarPreview'), data.profile);
    applyProfile();
    persist();
  });
  $('#cfgWhatsapp')?.addEventListener('change', (e) => {
    data.config.whatsappNumber = e.target.value.replace(/\D/g, '');
    persist();
  });
  $('#cfgGas')?.addEventListener('change', (e) => {
    data.config.gasPrice = Number(e.target.value);
    persist();
  });
  $('#cfgIncludedDecorationImage')?.addEventListener('change', (e) => {
    data.config.includedDecorationImage = e.target.value.trim();
    persist();
  });
  $('#btnChangePassword')?.addEventListener('click', async () => {
    if (window.DataStore.firebase) {
      const cur = prompt('Senha atual:');
      if (!cur) return;
      const newPass = prompt('Nova senha (mínimo 6 caracteres):');
      if (!newPass || newPass.length < 6) { toast('Senha muito curta', 'error'); return; }
      const r = await window.DataStore.changeAdminPassword(cur, newPass);
      toast(r.ok ? 'Senha alterada com sucesso' : r.message, r.ok ? 'success' : 'error');
      return;
    }
    const cur = prompt('Senha atual:');
    if (cur !== data.auth.password) { toast('Senha atual incorreta', 'error'); return; }
    const newPass = prompt('Nova senha (mínimo 6 caracteres):');
    if (!newPass || newPass.length < 6) { toast('Senha muito curta', 'error'); return; }
    data.auth.password = newPass;
    persist();
    toast('Senha alterada com sucesso');
  });
  $('#btnResetData')?.addEventListener('click', () => {
    if (!confirm('Restaurar TODOS os dados aos valores padrão? Esta ação não pode ser desfeita.')) return;
    if (!confirm('Tem certeza? Você vai perder todas as edições feitas no painel.')) return;
    data = window.DataStore.resetData();
    window.DataStore.applyToSimulator(data);
    toast('Dados restaurados');
    renderPacotes(); renderDecoracao(); renderServicos(); renderConfig();
  });

  // ===== HISTÓRICO =====
  let historicoFilter = 'ativos';
  function filterOrders(orders, filter) {
    if (filter === 'todos') return orders;
    if (filter === 'concluido') return orders.filter(o => o.status === 'concluido');
    if (filter === 'cancelado') return orders.filter(o => o.status === 'cancelado');
    // ativos: tudo que não é concluído nem cancelado
    return orders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado');
  }
  function renderHistorico() {
    const root = $('#historicoRoot');
    const orders = window.DataStore.loadOrders();
    if (!orders.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="inbox"></i><p>Nenhum pedido recebido ainda. Quando alguém usar o simulador e clicar em "Enviar para WhatsApp", aparece aqui.</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    const filtered = filterOrders(orders, historicoFilter);
    if (!filtered.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="filter"></i><p>Nenhum pedido neste filtro.</p></div>`;
    } else {
      root.innerHTML = filtered.map(orderCardHTML).join('');
      attachOrderListeners(root);
    }
    if (window.lucide) window.lucide.createIcons();
  }
  $$('#historicoFilter button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#historicoFilter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      historicoFilter = btn.dataset.filter;
      renderHistorico();
    });
  });
  $('#btnClearOrders')?.addEventListener('click', () => {
    if (!confirm('Apagar TODO o histórico de pedidos? Esta ação não pode ser desfeita.')) return;
    window.DataStore.clearOrders();
    toast('Histórico limpo');
    renderHistorico();
  });

  function orderCardHTML(o) {
    const date = new Date(o.createdAt);
    const dateStr = date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const eventDate = o.eventDate ? new Date(o.eventDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
    const wa = o.customerWhatsapp ? formatWhatsappDisplay(o.customerWhatsapp) : '—';
    const pago = o.valorPago || 0;
    const aReceber = Math.max(0, (o.total || 0) - pago);
    return `
      <div class="order-card" data-order-id="${o.id}">
        <div class="order-head">
          <div>
            <div class="order-customer">${escapeAttr(o.customerName || 'Sem nome')}</div>
            <div class="order-meta">
              <span><i data-lucide="message-circle"></i>${wa}</span>
              <span><i data-lucide="calendar"></i>Evento: ${eventDate}</span>
              <span><i data-lucide="clock"></i>Recebido: ${dateStr}</span>
              <span><i data-lucide="users"></i>${o.guests || 0} convidados</span>
            </div>
          </div>
          <div class="order-head-right">
            ${statusBadge(o.status)}
            <div class="order-total">${formatBRL(o.total || 0)}</div>
            ${pago > 0 ? `<div class="order-paid">Pago ${formatBRL(pago)} · falta ${formatBRL(aReceber)}</div>` : ''}
          </div>
        </div>
        <pre class="order-msg">${escapeAttr(o.message || '')}</pre>
        <div class="order-actions">
          <button class="btn btn-primary btn-sm" data-open-order="${o.id}"><i data-lucide="settings-2"></i>Detalhes / gerir</button>
          <button class="btn btn-outline btn-sm" data-toggle-msg><i data-lucide="eye"></i>Ver mensagem</button>
          <a class="btn btn-whatsapp btn-sm" href="${window.waLink ? window.waLink(o.message) : '#'}" target="_blank" rel="noopener"><i data-lucide="send"></i>WhatsApp</a>
          <button class="btn btn-ghost btn-sm" data-delete-order="${o.id}"><i data-lucide="trash-2"></i>Excluir</button>
        </div>
      </div>
    `;
  }
  function attachOrderListeners(root) {
    root.querySelectorAll('[data-toggle-msg]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.order-card').classList.toggle('expanded');
      });
    });
    root.querySelectorAll('[data-open-order]').forEach(btn => {
      btn.addEventListener('click', () => openEventModal(btn.dataset.openOrder));
    });
    root.querySelectorAll('[data-delete-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteOrder;
        if (!confirm('Excluir este pedido do histórico?')) return;
        window.DataStore.deleteOrder(id);
        toast('Pedido excluído');
        refreshAfterOrderChange();
      });
    });
  }

  // ===== MODAL DE DETALHE / GESTÃO DO EVENTO =====
  const eventModal = $('#eventModal');
  function closeEventModal() { eventModal?.classList.remove('open'); }
  $('#eventModalClose')?.addEventListener('click', closeEventModal);
  eventModal?.addEventListener('click', (e) => { if (e.target === eventModal) closeEventModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && eventModal?.classList.contains('open')) closeEventModal(); });

  function refreshAfterOrderChange() {
    if ($('#section-dashboard')?.classList.contains('active')) renderDashboard();
    if ($('#section-historico')?.classList.contains('active')) renderHistorico();
    if ($('#section-agenda')?.classList.contains('active')) renderAgenda();
  }

  function openEventModal(orderId) {
    const o = window.DataStore.loadOrders().find(x => x.id === orderId);
    if (!o) { toast('Pedido não encontrado', 'error'); return; }
    const body = $('#eventModalBody');
    const dateStr = new Date(o.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const eventDate = o.eventDate ? new Date(o.eventDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const wa = o.customerWhatsapp ? formatWhatsappDisplay(o.customerWhatsapp) : '—';
    const aReceber = Math.max(0, (o.total || 0) - (o.valorPago || 0));
    body.innerHTML = `
      <div class="event-modal-head">
        <div>
          <h3>${escapeHTML(o.customerName || 'Sem nome')}</h3>
          <div class="event-modal-sub">${statusBadge(o.status)}</div>
        </div>
        <div class="event-modal-total">${formatBRL(o.total || 0)}</div>
      </div>
      <div class="event-modal-meta">
        <span><i data-lucide="calendar"></i>${eventDate}</span>
        <span><i data-lucide="message-circle"></i>${wa}</span>
        <span><i data-lucide="users"></i>${o.guests || 0} convidados</span>
        <span><i data-lucide="clock"></i>Recebido ${dateStr}</span>
      </div>
      <div class="event-manage">
        <div class="admin-field">
          <label>Status do evento</label>
          <select id="evStatus">
            ${STATUSES.map(s => `<option value="${s.id}" ${o.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="admin-field">
          <label>Valor pago</label>
          <div class="admin-field-prefix"><span class="prefix">R$</span><input type="number" min="0" id="evPaid" value="${o.valorPago || 0}"></div>
        </div>
        <div class="event-receivable">
          <span>A receber</span>
          <strong id="evReceivable">${formatBRL(aReceber)}</strong>
        </div>
      </div>
      <details class="event-msg-details" open>
        <summary>Resumo completo do evento</summary>
        <pre class="order-msg event-msg-full">${escapeHTML(o.message || 'Sem detalhes salvos.')}</pre>
      </details>
      <div class="event-modal-actions">
        <button class="btn btn-primary" id="evSave"><i data-lucide="check"></i>Salvar alterações</button>
        <a class="btn btn-whatsapp" href="${window.waLink ? window.waLink(o.message) : '#'}" target="_blank" rel="noopener"><i data-lucide="send"></i>WhatsApp</a>
        <button class="btn btn-ghost" id="evDelete"><i data-lucide="trash-2"></i>Excluir</button>
      </div>
    `;
    eventModal.classList.add('open');

    $('#evPaid')?.addEventListener('input', () => {
      const paid = Number($('#evPaid').value) || 0;
      $('#evReceivable').textContent = formatBRL(Math.max(0, (o.total || 0) - paid));
    });
    $('#evSave')?.addEventListener('click', () => {
      window.DataStore.updateOrder(orderId, {
        status: $('#evStatus').value,
        valorPago: Number($('#evPaid').value) || 0
      });
      toast('Evento atualizado');
      closeEventModal();
      refreshAfterOrderChange();
    });
    $('#evDelete')?.addEventListener('click', () => {
      if (!confirm('Excluir este pedido do histórico?')) return;
      window.DataStore.deleteOrder(orderId);
      toast('Pedido excluído');
      closeEventModal();
      refreshAfterOrderChange();
    });
    if (window.lucide) window.lucide.createIcons();
  }

  // ===== HELPERS =====
  function arrayRowHTML(value, i) {
    return `
      <div class="array-row">
        <input value="${escapeAttr(value)}">
        <button class="admin-icon-btn danger" data-remove="${i}" type="button"><i data-lucide="x"></i></button>
      </div>
    `;
  }
  function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Alias usado em várias seções (Balões, Agenda, Dashboard)
  const escapeHTML = escapeAttr;
  function formatWhatsappDisplay(digits) {
    const d = String(digits).replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return d;
  }

  // ===== BALÕES =====
  function renderBaloes() {
    const root = $('#baloesRoot');
    if (!root) return;
    data.balloons = data.balloons || [];

    if (!data.balloons.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="image-off"></i><p>Nenhum modelo cadastrado. Clique em "Novo modelo".</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    root.innerHTML = data.balloons.map((b, idx) => {
      const imgs = b.images || [];
      return `
      <div class="admin-card" data-bal-idx="${idx}">
        <div class="admin-card-header">
          <div>
            <h3>${escapeHTML(b.name)}</h3>
            <p>ID: <code>${escapeHTML(b.id)}</code></p>
          </div>
          <button class="btn btn-outline btn-sm" data-bal-delete="${idx}">
            <i data-lucide="trash-2"></i>Excluir
          </button>
        </div>
        <div class="admin-grid cols-2">
          <div class="admin-field">
            <label>Título</label>
            <input type="text" data-bal-field="name" value="${escapeHTML(b.name)}">
          </div>
          <div class="admin-field">
            <label class="admin-check" style="display:flex;gap:8px;align-items:center;margin-top:28px;">
              <input type="checkbox" data-bal-default ${b.isDefault ? 'checked' : ''}>
              Balão padrão <small>(marcado sozinho no Premium/Pro Max se o cliente não escolher)</small>
            </label>
          </div>
        </div>
        ${planPriceTableHTML('balloon', idx, b)}
        <div class="admin-field">
          <label>Descrição curta <small>(exibida no card)</small></label>
          <input type="text" data-bal-field="shortDesc" value="${escapeHTML(b.shortDesc || '')}">
        </div>
        <div class="admin-field">
          <label>Descrição completa <small>(exibida no modal de detalhes)</small></label>
          <textarea data-bal-field="description" rows="5">${escapeHTML(b.description || '')}</textarea>
        </div>
        <div class="admin-field">
          <label>Imagens <small>(uma URL por linha — a primeira é a capa)</small></label>
          <textarea data-bal-field="images" rows="${Math.max(3, imgs.length + 1)}">${imgs.map(u => escapeHTML(u)).join('\n')}</textarea>
          <span class="help">${imgs.length} imagem${imgs.length === 1 ? '' : 's'} cadastrada${imgs.length === 1 ? '' : 's'}.</span>
        </div>
      </div>
      `;
    }).join('');

    // Listeners
    root.querySelectorAll('[data-bal-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const card = inp.closest('[data-bal-idx]');
        const idx = parseInt(card.dataset.balIdx, 10);
        const field = inp.dataset.balField;
        const bal = data.balloons[idx];
        if (!bal) return;
        if (field === 'price') bal.price = parseFloat(inp.value) || 0;
        else if (field === 'images') bal.images = (inp.value || '').split('\n').map(s => s.trim()).filter(Boolean);
        else bal[field] = inp.value;
        persist();
        // Re-render só se images mudou (para atualizar contador)
        if (field === 'images') renderBaloes();
      });
    });

    root.querySelectorAll('[data-bal-default]').forEach(chk => {
      chk.addEventListener('change', () => {
        const idx = parseInt(chk.closest('[data-bal-idx]').dataset.balIdx, 10);
        data.balloons.forEach((b, i) => { b.isDefault = chk.checked && i === idx; });
        persist();
        renderBaloes();
      });
    });

    root.querySelectorAll('[data-bal-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.balDelete, 10);
        const bal = data.balloons[idx];
        if (!bal) return;
        if (confirm(`Excluir o modelo "${bal.name}"?`)) {
          data.balloons.splice(idx, 1);
          persist();
          renderBaloes();
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  $('#btnAddBalloon')?.addEventListener('click', () => {
    data.balloons = data.balloons || [];
    const id = 'bal-' + Date.now().toString(36);
    data.balloons.push({
      id,
      name: 'Novo modelo',
      shortDesc: '',
      description: '',
      price: 0,
      images: []
    });
    persist();
    renderBaloes();
  });

  // ===== AGENDA =====
  function renderAgenda() {
    const orders = window.DataStore.loadOrders();
    const blocked = window.DataStore.loadBlockedDates();

    const todayIso = new Date().toISOString().slice(0, 10);
    const formatDatePT = (iso) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-').map(Number);
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${String(d).padStart(2,'0')} ${months[m-1]} ${y}`;
    };

    // Datas ocupadas (a partir de pedidos)
    const occRoot = $('#occupiedDatesRoot');
    const upcomingOrders = orders.filter(o => o.eventDate && o.eventDate >= todayIso)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    if (!upcomingOrders.length) {
      occRoot.innerHTML = `<div class="admin-empty"><i data-lucide="calendar-x"></i><p>Nenhuma data ocupada futura.</p></div>`;
    } else {
      occRoot.innerHTML = '<div class="admin-list">' + upcomingOrders.map(o => `
        <div class="admin-list-item">
          <div>
            <strong>${formatDatePT(o.eventDate)}</strong>
            <p style="margin:4px 0 0; color:var(--muted); font-size:var(--fs-sm);">${escapeHTML(o.customerName || '')} ${o.customerWhatsapp ? '· ' + formatWhatsappDisplay(o.customerWhatsapp) : ''}</p>
          </div>
          <span class="admin-tag">Ocupada</span>
        </div>
      `).join('') + '</div>';
    }

    // Bloqueios manuais
    const blkRoot = $('#blockedDatesRoot');
    const upcomingBlocked = blocked.filter(b => b.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!upcomingBlocked.length) {
      blkRoot.innerHTML = `<div class="admin-empty"><i data-lucide="unlock"></i><p>Nenhum bloqueio manual ativo.</p></div>`;
    } else {
      blkRoot.innerHTML = '<div class="admin-list">' + upcomingBlocked.map(b => `
        <div class="admin-list-item">
          <div>
            <strong>${formatDatePT(b.date)}</strong>
            ${b.reason ? `<p style="margin:4px 0 0; color:var(--muted); font-size:var(--fs-sm);">${escapeHTML(b.reason)}</p>` : ''}
          </div>
          <button class="btn btn-outline btn-sm" data-unblock="${b.date}">
            <i data-lucide="trash-2"></i>Remover
          </button>
        </div>
      `).join('') + '</div>';

      blkRoot.querySelectorAll('[data-unblock]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Remover este bloqueio?')) {
            window.DataStore.removeBlockedDate(btn.dataset.unblock);
            toast('Bloqueio removido');
            renderAgenda();
          }
        });
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }

  $('#btnAddBlockedDate')?.addEventListener('click', () => {
    const dateInp = $('#blockDateInput');
    const reasonInp = $('#blockReasonInput');
    const date = dateInp?.value;
    if (!date) { toast('Selecione uma data', 'error'); return; }
    const ok = window.DataStore.addBlockedDate(date, reasonInp?.value?.trim() || '');
    if (!ok) { toast('Esta data já está bloqueada', 'error'); return; }
    if (dateInp) dateInp.value = '';
    if (reasonInp) reasonInp.value = '';
    toast('Data bloqueada');
    renderAgenda();
  });

  // ===== BLOCO DE NOTAS =====
  function renderNotas() {
    const root = $('#notasRoot');
    if (!root) return;
    const notes = window.DataStore.loadNotes();
    if (!notes.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="sticky-note"></i><p>Nenhuma nota ainda. Clique em "Nova nota" para começar.</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    root.innerHTML = '<div class="notes-grid">' + notes.map(n => `
      <div class="note-card" data-note-id="${n.id}">
        <input class="note-title" data-note-field="title" value="${escapeAttr(n.title || '')}" placeholder="Título">
        <textarea class="note-body" data-note-field="body" rows="6" placeholder="Escreva aqui (compras, metas, ideias...)">${escapeHTML(n.body || '')}</textarea>
        <div class="note-foot">
          <span class="note-date">${new Date(n.updatedAt || n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <button class="admin-icon-btn danger" data-delete-note title="Excluir nota"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `).join('') + '</div>';
    root.querySelectorAll('.note-card').forEach(card => {
      const id = card.dataset.noteId;
      card.querySelectorAll('[data-note-field]').forEach(inp => {
        inp.addEventListener('change', () => {
          window.DataStore.updateNote(id, { [inp.dataset.noteField]: inp.value });
          toast('Nota salva');
        });
      });
      card.querySelector('[data-delete-note]')?.addEventListener('click', () => {
        if (confirm('Excluir esta nota?')) {
          window.DataStore.deleteNote(id);
          toast('Nota excluída');
          renderNotas();
        }
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }
  $('#btnAddNote')?.addEventListener('click', () => {
    window.DataStore.saveNote({ title: '', body: '' });
    renderNotas();
  });

  // ===== CALENDÁRIO VISUAL =====
  let calCursor = new Date();
  calCursor.setDate(1);
  calCursor.setHours(0, 0, 0, 0);

  function dayStatus(iso, orders, blocked) {
    if (blocked.some(b => b.date === iso)) return { cls: 'indisponivel', label: 'Indisponível' };
    const dayOrders = orders.filter(o => o.eventDate === iso && o.status !== 'cancelado');
    if (dayOrders.some(o => o.status === 'pago' || o.status === 'concluido')) return { cls: 'fechado', label: 'Fechado' };
    if (dayOrders.length) return { cls: 'interessado', label: 'Interessado' };
    return { cls: 'disponivel', label: 'Disponível' };
  }

  function renderCalendario() {
    const grid = $('#calGrid');
    if (!grid) return;
    const orders = window.DataStore.loadOrders();
    const blocked = window.DataStore.loadBlockedDates();
    const y = calCursor.getFullYear(), m = calCursor.getMonth();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const label = $('#calMonthLabel');
    if (label) label.textContent = `${monthNames[m]} ${y}`;
    const startDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayIso = new Date().toISOString().slice(0, 10);

    let cells = '';
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const st = dayStatus(iso, orders, blocked);
      const ord = orders.find(o => o.eventDate === iso && o.status !== 'cancelado');
      const info = st.cls === 'indisponivel'
        ? (blocked.find(b => b.date === iso)?.reason || 'Bloqueada')
        : (ord ? (ord.customerName || 'Evento') : '');
      cells += `
        <div class="cal-cell ${st.cls} ${iso === todayIso ? 'today' : ''}" data-cal-day="${iso}" title="${escapeAttr(st.label + (info ? ' · ' + info : ''))}">
          <span class="cal-num">${d}</span>
          ${info ? `<span class="cal-info">${escapeHTML(info)}</span>` : ''}
        </div>`;
    }
    grid.innerHTML = cells;

    grid.querySelectorAll('[data-cal-day]').forEach(cell => {
      cell.addEventListener('click', () => {
        const iso = cell.dataset.calDay;
        const isBlocked = blocked.some(b => b.date === iso);
        const ord = orders.find(o => o.eventDate === iso && o.status !== 'cancelado');
        if (ord && !isBlocked) { openEventModal(ord.id); return; }
        if (isBlocked) {
          if (confirm('Desbloquear esta data?')) {
            window.DataStore.removeBlockedDate(iso);
            toast('Data desbloqueada');
            renderCalendario();
          }
        } else {
          const reason = prompt('Bloquear esta data no site? Motivo (opcional):', '');
          if (reason !== null) {
            window.DataStore.addBlockedDate(iso, reason.trim());
            toast('Data bloqueada');
            renderCalendario();
          }
        }
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }
  $('#calPrev')?.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendario(); });
  $('#calNext')?.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendario(); });
  $('#calToday')?.addEventListener('click', () => { calCursor = new Date(); calCursor.setDate(1); calCursor.setHours(0, 0, 0, 0); renderCalendario(); });

  // ===== GALERIA DE MÍDIA =====
  function renderGaleria() {
    const root = $('#galeriaRoot');
    if (!root) return;
    data.media = data.media || [];
    const cats = window.DataStore.MEDIA_CATEGORIES || [];
    const catOptions = (sel) => cats.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.label}</option>`).join('');
    const sizeOptions = (sel) => [['', 'Normal'], ['wide', 'Largo'], ['tall', 'Alto']]
      .map(([v, l]) => `<option value="${v}" ${v === (sel || '') ? 'selected' : ''}>${l}</option>`).join('');

    if (!data.media.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="image-off"></i><p>Nenhuma mídia cadastrada. Adicione fotos ou vídeos.</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    root.innerHTML = data.media.map((m, idx) => {
      const thumb = m.type === 'video'
        ? `<video src="${escapeAttr(m.src)}" preload="metadata" ${m.poster ? `poster="${escapeAttr(m.poster)}"` : ''} muted></video><span class="media-type-badge"><i data-lucide="video"></i>Vídeo</span>`
        : `<img src="${escapeAttr(m.src)}" alt="" onerror="this.style.opacity='0.15'">`;
      return `
        <div class="media-card" data-media-idx="${idx}">
          <div class="media-thumb">${thumb}</div>
          <div class="media-fields">
            <div class="admin-field"><label>Categoria</label><select data-media-field="category">${catOptions(m.category)}</select></div>
            <div class="admin-field"><label>URL ${m.type === 'video' ? 'do vídeo' : 'da imagem'}</label><input data-media-field="src" value="${escapeAttr(m.src || '')}" placeholder="https://..."></div>
            ${m.type === 'video'
              ? `<div class="admin-field"><label>Poster <small>(opcional)</small></label><input data-media-field="poster" value="${escapeAttr(m.poster || '')}" placeholder="https://..."></div>`
              : `<div class="admin-field"><label>URL ampliada <small>(opcional)</small></label><input data-media-field="full" value="${escapeAttr(m.full || '')}" placeholder="https://..."></div>
                 <div class="admin-field"><label>Descrição (alt)</label><input data-media-field="alt" value="${escapeAttr(m.alt || '')}"></div>`}
            <div class="admin-field"><label>Tamanho no mosaico</label><select data-media-field="size">${sizeOptions(m.size)}</select></div>
          </div>
          <button class="admin-icon-btn danger media-del" data-del-media="${idx}" title="Excluir"><i data-lucide="trash-2"></i></button>
        </div>`;
    }).join('');

    root.querySelectorAll('[data-media-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.closest('[data-media-idx]').dataset.mediaIdx;
        const f = inp.dataset.mediaField;
        const m = data.media[idx];
        // Ao trocar a foto, a versão ampliada acompanha (a menos que tenha sido definida à parte)
        if (f === 'src' && (!m.full || m.full === m.src || /unsplash\.com/.test(m.full))) m.full = inp.value;
        m[f] = inp.value;
        persist();
        if (f === 'src' || f === 'poster' || f === 'size') renderGaleria();
      });
    });
    root.querySelectorAll('[data-del-media]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.delMedia;
        if (confirm('Excluir esta mídia?')) { data.media.splice(idx, 1); persist(); renderGaleria(); }
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }
  function addMedia(type) {
    data.media = data.media || [];
    const cats = window.DataStore.MEDIA_CATEGORIES || [];
    const base = { id: 'm-' + Date.now().toString(36), category: cats[0]?.id || 'aniversarios', type, size: '', src: '' };
    if (type === 'video') base.poster = ''; else { base.full = ''; base.alt = ''; }
    data.media.unshift(base);
    persist();
    renderGaleria();
    toast(type === 'video' ? 'Vídeo adicionado' : 'Foto adicionada');
  }
  $('#btnAddPhoto')?.addEventListener('click', () => addMedia('image'));
  $('#btnAddVideo')?.addEventListener('click', () => addMedia('video'));

  // ===== ENVIO DE FOTOS (Cloudinary) =====
  const cloudCfg = () => data.config.cloudinary || {};
  const cloudReady = () => !!(cloudCfg().cloudName && cloudCfg().uploadPreset);
  // Versão otimizada da foto: formato e qualidade automáticos, até 1920px
  const optimizeUrl = (url) => String(url).replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_1920/');
  let widgetScript = null;
  const loadWidget = () => widgetScript || (widgetScript = new Promise((res, rej) => {
    if (window.cloudinary?.createUploadWidget) return res();
    const s = document.createElement('script');
    s.src = 'https://upload-widget.cloudinary.com/latest/global/all.js';
    s.onload = res; s.onerror = () => { widgetScript = null; rej(new Error('widget')); };
    document.head.appendChild(s);
  }));
  // Abre a janela de envio; chama onDone com a lista de links (na ordem enviada)
  async function openUploader({ multiple = false, onDone }) {
    if (!cloudReady()) {
      toast('Configure o Cloudinary em Configurações primeiro', 'error');
      return;
    }
    try { await loadWidget(); } catch { toast('Não foi possível abrir o envio de fotos', 'error'); return; }
    const urls = [];
    const w = window.cloudinary.createUploadWidget({
      cloudName: cloudCfg().cloudName,
      uploadPreset: cloudCfg().uploadPreset,
      folder: 'casadebia',
      sources: ['local', 'camera', 'url', 'google_drive'],
      multiple,
      maxFiles: multiple ? 30 : 1,
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
      maxFileSize: 20000000,
      language: 'pt',
      text: { pt: { menu: { files: 'Meus arquivos', camera: 'Câmera', url: 'Link', google_drive: 'Google Drive' },
                    local: { browse: 'Escolher fotos', dd_title_single: 'Arraste a foto aqui', dd_title_multi: 'Arraste as fotos aqui' } } },
      styles: { palette: { window: '#FFFFFF', windowBorder: '#A9782A', tabIcon: '#A9782A', menuIcons: '#2B2620',
        textDark: '#0D0B09', textLight: '#FFFFFF', link: '#A9782A', action: '#A9782A', inactiveTabIcon: '#7A7064',
        error: '#C0392B', inProgress: '#A9782A', complete: '#2E8B57', sourceBg: '#FAF7F1' } }
    }, (err, res) => {
      if (err) { toast('Falha no envio: ' + (err.statusText || err.message || 'erro'), 'error'); return; }
      if (res.event === 'success') urls.push(optimizeUrl(res.info.secure_url));
      if (res.event === 'close' && urls.length) onDone(urls);
    });
    w.open();
  }
  window.CasaUpload = { open: openUploader };

  // Botão "Enviar foto" ao lado de cada campo de imagem do painel
  const UPLOAD_TARGETS = [
    '[data-media-field="src"]', '[data-media-field="full"]', '[data-media-field="poster"]',
    '[data-combo-field="images"]', '[data-bal-field="images"]', '[data-svc-field="image"]',
    '#cfgIncludedDecorationImage', '#cfgProfilePhoto', '[data-inc-field="image"]', '[data-theme-field="image"]'
  ].join(',');
  function enhanceUploadFields(scope = document) {
    scope.querySelectorAll(UPLOAD_TARGETS).forEach(field => {
      if (field.dataset.uploadReady) return;
      if (field.matches('[data-media-field="src"]') && field.closest('[data-media-idx]') &&
          data.media[+field.closest('[data-media-idx]').dataset.mediaIdx]?.type === 'video') return;
      field.dataset.uploadReady = '1';
      const isList = field.tagName === 'TEXTAREA';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-sm upload-btn';
      btn.innerHTML = `<i data-lucide="upload"></i>${isList ? 'Enviar fotos' : 'Enviar foto'}`;
      btn.addEventListener('click', () => openUploader({
        multiple: isList,
        onDone: (urls) => {
          if (isList) {
            const cur = field.value.split('\n').map(s => s.trim()).filter(Boolean);
            field.value = cur.concat(urls).join('\n');
          } else {
            field.value = urls[0];
          }
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }));
      field.insertAdjacentElement('afterend', btn);
      if (window.lucide) window.lucide.createIcons();
    });
  }
  new MutationObserver(() => enhanceUploadFields()).observe(document.querySelector('.admin-main') || document.body, { childList: true, subtree: true });
  enhanceUploadFields();

  // Configuração do Cloudinary
  function renderCloudConfig() {
    const c = cloudCfg();
    if ($('#cfgCloudName')) $('#cfgCloudName').value = c.cloudName || '';
    if ($('#cfgCloudPreset')) $('#cfgCloudPreset').value = c.uploadPreset || '';
    const st = $('#cloudStatus');
    if (st) { st.textContent = cloudReady() ? 'Conectado' : 'Não configurado'; st.classList.toggle('ok', cloudReady()); }
  }
  ['#cfgCloudName', '#cfgCloudPreset'].forEach(sel => $(sel)?.addEventListener('change', () => {
    data.config.cloudinary = {
      cloudName: ($('#cfgCloudName')?.value || '').trim(),
      uploadPreset: ($('#cfgCloudPreset')?.value || '').trim()
    };
    persist();
    renderCloudConfig();
  }));
  renderCloudConfig();

  // Envio em lote para a galeria (cria uma mídia por foto)
  function fillUploadCategory() {
    const sel = $('#uploadCategory');
    if (!sel) return;
    const cats = window.DataStore.MEDIA_CATEGORIES || [];
    const prev = sel.value;
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${escapeAttr(c.label)}</option>`).join('');
    if (prev) sel.value = prev;
  }
  fillUploadCategory();
  $('#btnUploadPhotos')?.addEventListener('click', () => openUploader({
    multiple: true,
    onDone: (urls) => {
      data.media = data.media || [];
      const cat = $('#uploadCategory')?.value || (window.DataStore.MEDIA_CATEGORIES || [])[0]?.id || 'estrutura';
      urls.slice().reverse().forEach((u, k) => data.media.unshift({
        id: 'm-' + Date.now().toString(36) + k, category: cat, type: 'image', size: '', src: u, full: u, alt: ''
      }));
      persist();
      renderGaleria();
      toast(`${urls.length} foto(s) adicionada(s) à galeria`);
    }
  }));

  // Banner da home
  function renderHero() {
    const root = $('#heroRoot');
    if (!root) return;
    data.config.heroImages = data.config.heroImages || [];
    const list = data.config.heroImages;
    root.innerHTML = list.map((u, i) => `
      <div class="hero-admin-item">
        <img src="${escapeAttr(u)}" alt="" onerror="this.style.opacity='0.15'">
        <div class="hero-admin-actions">
          <button class="admin-icon-btn" data-hero-move="${i}" data-dir="-1" title="Mover para antes" ${i === 0 ? 'disabled' : ''}><i data-lucide="arrow-left"></i></button>
          <span>${i + 1}</span>
          <button class="admin-icon-btn" data-hero-move="${i}" data-dir="1" title="Mover para depois" ${i === list.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-right"></i></button>
          <button class="admin-icon-btn danger" data-hero-del="${i}" title="Remover"><i data-lucide="trash-2"></i></button>
        </div>
      </div>`).join('') || '<p class="help">Nenhuma foto no banner ainda — enquanto isso, o site usa as fotos padrão.</p>';
    root.querySelectorAll('[data-hero-move]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.heroMove, j = i + (+b.dataset.dir);
      [list[i], list[j]] = [list[j], list[i]];
      persist(); renderHero();
    }));
    root.querySelectorAll('[data-hero-del]').forEach(b => b.addEventListener('click', () => {
      if (!confirm('Remover esta foto do banner?')) return;
      list.splice(+b.dataset.heroDel, 1);
      persist(); renderHero();
    }));
    if (window.lucide) window.lucide.createIcons();
  }
  $('#btnUploadHero')?.addEventListener('click', () => openUploader({
    multiple: true,
    onDone: (urls) => {
      data.config.heroImages = (data.config.heroImages || []).concat(urls).slice(0, 4);
      persist(); renderHero();
      if (urls.length && data.config.heroImages.length === 4) toast('Banner com 4 fotos (máximo)');
    }
  }));
  renderHero();

  // ===== INIT =====
  // Avisa se a nuvem recusar alguma alteração
  document.addEventListener('firebase:error', (e) => {
    toast('⚠️ ' + (e.detail?.what || 'Falha ao salvar na nuvem'), 'error');
  });
  // Aviso de senha padrão (só no modo sem Firebase)
  if (!window.DataStore.firebase && data.auth.password === 'casadebia123') {
    setTimeout(() => toast('⚠️ Senha padrão ativa — altere em Configurações', 'error'), 800);
  }
  // Atualiza link WhatsApp para sair com o numero atualizado
  if (window.CASA_CONFIG) window.CASA_CONFIG.whatsapp.number = data.config.whatsappNumber;

  applyProfile();
  renderDashboard();
});
