/* ============================================
   CASA DE BIA — Simulador: Controlador da UI
   ============================================ */
(function () {
  window.DataStore.onReady(() => {
    let state = window.SIM.load();

    // Pré-seleção via ?pkg=...
    const urlParams = new URLSearchParams(location.search);
    const preselectPkg = urlParams.get('pkg');
    if (preselectPkg && window.SIM_PRICING.packages[preselectPkg] && !state.package) {
      state.package = preselectPkg;
      window.SIM.save(state);
    }

    // ===== ELEMENTOS =====
    const stepCards = document.querySelectorAll('.sim-step');
    const progressFill = document.getElementById('progressFill');
    const progressStep = document.getElementById('progressStep');
    const progressPct = document.getElementById('progressPct');

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    const budgetTotal = document.getElementById('budgetTotal');
    const budgetList = document.getElementById('budgetList');
    const budgetEmpty = document.getElementById('budgetEmpty');
    const budgetPanel = document.getElementById('budgetPanel');
    const budgetHeader = document.getElementById('budgetHeader');

    // ===== RENDER PROGRESS =====
    const renderProgress = () => {
      const pct = Math.round((state.currentStep / state.totalSteps) * 100);
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressStep) progressStep.textContent = `Etapa ${state.currentStep} de ${state.totalSteps}`;
      if (progressPct) progressPct.textContent = pct + '%';
    };

    // ===== SHOW STEP =====
    const showStep = (n) => {
      // Pula etapa 5 (gás) se pacote já inclui gás (Premium/Pro Max)
      const pkgIncludesGas = state.package && window.SIM_PRICING.packages[state.package]?.includesGas;
      if (n === 5 && pkgIncludesGas) {
        n = state.currentStep < 5 ? 6 : 4;
      }
      state.currentStep = Math.max(1, Math.min(n, state.totalSteps));
      window.SIM.save(state);

      stepCards.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.step, 10) === state.currentStep);
      });

      // Botão Prev
      if (btnPrev) btnPrev.disabled = state.currentStep === 1;

      // Botão Next - texto contextual
      if (btnNext) {
        if (state.currentStep === state.totalSteps) {
          btnNext.innerHTML = '<i data-lucide="send"></i>Enviar para WhatsApp';
        } else {
          btnNext.innerHTML = 'Próxima etapa<i data-lucide="arrow-right"></i>';
        }
        if (window.lucide) window.lucide.createIcons();
      }

      renderProgress();
      // Re-render do resumo ao chegar na Etapa 8 (refletir últimas mudanças)
      if (state.currentStep === 8 && typeof renderSummary === 'function') renderSummary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ===== VALIDAÇÃO POR ETAPA =====
    const canAdvance = () => {
      switch (state.currentStep) {
        case 1: return !!state.date;
        case 2: return !!state.package;
        case 3: {
          // Pacotes com decoração inclusa (Premium, Pro Max...): precisa escolher
          // o modelo de montagem e o combo — senão o pedido chega sem a decoração.
          if (window.SIM_PRICING.packages[state.package]?.includesDecoration) {
            // Com foto de referência, o combo e o tema ficam opcionais (a decoradora analisa)
            if (!state.decoration?.type) return false;
            if (hasRef()) return true;
            return !!state.decoration?.combo && (!themesForPlan().length || !!state.decoration?.theme);
          }
          if (state.decoration?.enabled === false) return true;
          if (state.decoration?.enabled === true) {
            return !!state.decoration.type && (!!state.decoration.combo || hasRef());
          }
          return false;
        }
        case 4: return state.guests >= 1;
        case 5: return state.gas === true || state.gas === false;
        case 6: return true; // Serviços são opcionais
        case 7: {
          const name = (state.customer?.name || '').trim();
          const digits = (state.customer?.whatsapp || '').replace(/\D/g, '');
          return name.length >= 3 && (digits.length === 10 || digits.length === 11);
        }
        default: return true;
      }
    };

    const validateStep7Inputs = () => {
      let ok = true;
      if (inpName) {
        const valid = (inpName.value || '').trim().length >= 3;
        inpName.closest('.sim-input-group')?.classList.toggle('has-error', !valid);
        if (!valid) ok = false;
      }
      if (inpWhatsapp) {
        const digits = (inpWhatsapp.value || '').replace(/\D/g, '');
        const valid = digits.length === 10 || digits.length === 11;
        inpWhatsapp.closest('.sim-input-group')?.classList.toggle('has-error', !valid);
        if (!valid) ok = false;
      }
      return ok;
    };

    const showValidationError = (msg) => {
      const active = document.querySelector('.sim-step.active');
      if (!active) return;
      let bar = active.querySelector('.sim-info-bar.error');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'sim-info-bar error';
        bar.innerHTML = `<i data-lucide="alert-circle"></i><span></span>`;
        active.appendChild(bar);
        if (window.lucide) window.lucide.createIcons();
      }
      bar.querySelector('span').textContent = msg;
      setTimeout(() => bar?.remove(), 3500);
    };

    // ===== RENDER BUDGET =====
    const renderBudget = (animate = true) => {
      const { items, total } = window.SIM.calculate(state);

      if (budgetTotal) {
        budgetTotal.innerHTML = `${window.SIM.formatBRL(total)}<small></small>`;
        if (animate) {
          budgetTotal.classList.remove('bumping');
          void budgetTotal.offsetWidth;
          budgetTotal.classList.add('bumping');
        }
      }

      if (budgetList && budgetEmpty) {
        if (items.length === 0) {
          budgetList.innerHTML = '';
          budgetEmpty.style.display = '';
        } else {
          budgetEmpty.style.display = 'none';
          budgetList.innerHTML = items.map(it => `
            <div class="sim-budget-item">
              <div class="sim-budget-item-label">
                <strong>${it.label}</strong>
                ${it.sub ? `<span class="sub">${it.sub}</span>` : ''}
              </div>
              <div class="sim-budget-item-value">${window.SIM.formatBRL(it.value)}</div>
            </div>
          `).join('');
        }
      }
    };

    // ===== ETAPA 1 — PACOTES =====
    const pkgOptions = document.querySelectorAll('.sim-option[data-pkg]');
    const renderPackages = () => {
      const PKs = window.SIM_PRICING?.packages || {};
      pkgOptions.forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.pkg === state.package);
        const pk = PKs[opt.dataset.pkg];
        if (!pk) return;
        const nameEl = opt.querySelector('.sim-option-name');
        const capEl = opt.querySelector('.sim-option-cap');
        const priceEl = opt.querySelector('.sim-option-price');
        const featEl = opt.querySelector('.sim-option-features');
        if (nameEl) nameEl.textContent = pk.name;
        if (capEl) capEl.textContent = `Até ${pk.capacity} pessoas`;
        if (priceEl) priceEl.innerHTML = `${window.SIM.formatBRL(pk.price)}<small> /evento</small>`;
        if (featEl && Array.isArray(pk.includedItems)) {
          featEl.innerHTML = '';
          pk.includedItems.forEach(t => {
            const li = document.createElement('li');
            const ic = document.createElement('i');
            ic.setAttribute('data-lucide', 'check');
            li.appendChild(ic);
            li.appendChild(document.createTextNode(t));
            featEl.appendChild(li);
          });
        }
      });
      if (window.lucide) window.lucide.createIcons();
    };
    pkgOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        state.package = opt.dataset.pkg;
        // Reset de gás se pacote já inclui gás
        if (window.SIM_PRICING.packages[state.package]?.includesGas) state.gas = null;
        // Premium/Pro Max: forçar decoração habilitada
        if (window.SIM_PRICING.packages[state.package]?.includesDecoration) {
          state.decoration = state.decoration || { enabled: null, type: null, combo: null, addons: [], balloon: null };
          state.decoration.enabled = true;
        }
        syncDecorationWithPlan();
        window.SIM.save(state);
        renderPackages();
        updateGuestUI();
        if (state.decoration?.type) renderDecorationCombos();
        renderDecorationYesNo();
        renderDecorationVisibility();
        renderBalloons();
        renderDecorationSummary();
        renderBudget();
      });
    });

    // ===== ETAPA 2 — CONVIDADOS =====
    const guestInput = document.getElementById('guestInput');
    const guestMinus = document.getElementById('guestMinus');
    const guestPlus = document.getElementById('guestPlus');
    const guestInfo = document.getElementById('guestInfo');

    const updateGuestUI = () => {
      if (guestInput && document.activeElement !== guestInput) guestInput.value = state.guests || '';
      renderGuestQuick();
      if (guestMinus) guestMinus.disabled = state.guests <= 0;
      if (guestPlus) guestPlus.disabled = state.guests >= maxGuests();

      // A frase abaixo do título só faz sentido no Básico (regra de R$ 15 por excedente).
      // Nos demais pacotes (Essencial, Premium, Pro Max) ela é ocultada.
      const guestStepDesc = document.getElementById('guestStepDesc');
      if (guestStepDesc) {
        guestStepDesc.style.display = state.package === 'basico' ? '' : 'none';
      }

      if (guestInfo && state.package) {
        const pkg = window.SIM_PRICING.packages[state.package];
        if (state.guests > pkg.capacity && pkg.extraPerGuest > 0) {
          const extra = state.guests - pkg.capacity;
          const cost = extra * pkg.extraPerGuest;
          guestInfo.innerHTML = `<i data-lucide="info"></i><span>Pacote inclui ${pkg.capacity} pessoas. <strong>+${extra} excedente${extra > 1 ? 's' : ''} = ${window.SIM.formatBRL(cost)}</strong></span>`;
          guestInfo.style.display = '';
          guestInfo.classList.remove('error');
        } else if (state.guests > pkg.capacity) {
          guestInfo.innerHTML = `<i data-lucide="alert-triangle"></i><span>Acima da capacidade do pacote (${pkg.capacity} pessoas).</span>`;
          guestInfo.style.display = '';
          guestInfo.classList.add('error');
        } else if (state.guests > 0) {
          guestInfo.innerHTML = `<i data-lucide="check-circle-2"></i><span>Dentro da capacidade do pacote ${pkg.name}.</span>`;
          guestInfo.style.display = '';
          guestInfo.classList.remove('error');
        } else {
          guestInfo.style.display = 'none';
        }
        if (window.lucide) window.lucide.createIcons();
      }
    };

    // Capacidade máxima do espaço = maior capacidade entre os pacotes (editável no painel)
    const maxGuests = () => {
      const caps = Object.values(window.SIM_PRICING.packages || {}).map(p => Number(p.capacity) || 0);
      return Math.max(1, ...caps);
    };
    if (guestInput) guestInput.max = maxGuests();

    // Atalhos de quantidade (para ninguém precisar apertar "+" 100 vezes)
    const guestQuickList = document.querySelector('#guestQuick .sim-guest-quick-list');
    const renderGuestQuick = () => {
      if (!guestQuickList) return;
      const max = maxGuests();
      const opts = [20, 50, 80, 100, 150, 200].filter(n => n <= max);
      guestQuickList.innerHTML = opts.map(n =>
        `<button type="button" class="sim-guest-chip ${state.guests === n ? 'selected' : ''}" data-guests="${n}">${n}</button>`
      ).join('');
      guestQuickList.querySelectorAll('[data-guests]').forEach(b =>
        b.addEventListener('click', () => { if (guestInput) guestInput.value = b.dataset.guests; setGuests(b.dataset.guests); })
      );
    };
    if (guestInput) {
      // Ao tocar no número, seleciona tudo para já digitar por cima
      guestInput.addEventListener('focus', () => setTimeout(() => guestInput.select(), 0));
      guestInput.addEventListener('blur', () => { guestInput.value = state.guests || ''; });
    }

    const setGuests = (n) => {
      const max = maxGuests();
      const wanted = parseInt(n, 10) || 0;
      state.guests = Math.max(0, Math.min(max, wanted));
      if (wanted > max && guestInput) {
        guestInput.value = max;
        if (guestInfo) {
          guestInfo.innerHTML = `<i data-lucide="alert-triangle"></i><span>A capacidade máxima do espaço é de ${max} pessoas.</span>`;
          guestInfo.style.display = '';
          guestInfo.classList.add('error');
          if (window.lucide) window.lucide.createIcons();
        }
        window.SIM.save(state);
        renderBudget();
        if (guestPlus) guestPlus.disabled = true;
        return;
      }
      window.SIM.save(state);
      updateGuestUI();
      renderBudget();
    };

    if (guestMinus) guestMinus.addEventListener('click', () => { if (guestInput) guestInput.value = Math.max(0, state.guests - 1) || ''; setGuests(state.guests - 1); });
    if (guestPlus) guestPlus.addEventListener('click', () => { if (guestInput) guestInput.value = state.guests + 1; setGuests(state.guests + 1); });
    if (guestInput) guestInput.addEventListener('input', (e) => setGuests(e.target.value));

    // ===== ETAPA 3 — GÁS =====
    const gasOptions = document.querySelectorAll('.sim-yesno-option[data-gas]');
    const renderGasPrice = () => {
      const price = window.SIM_PRICING?.gas || 0;
      document.querySelectorAll('[data-gas-price]').forEach(el => {
        el.textContent = window.SIM.formatBRL(price);
      });
      document.querySelectorAll('[data-gas-plus]').forEach(el => {
        el.textContent = '+' + window.SIM.formatBRL(price);
      });
    };
    const renderGas = () => {
      gasOptions.forEach(opt => {
        opt.classList.toggle('selected', String(state.gas) === opt.dataset.gas);
      });
      renderGasPrice();
    };
    gasOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        state.gas = (opt.dataset.gas === 'true');
        window.SIM.save(state);
        renderGas();
        renderBudget();
      });
    });

    // ===== ETAPA 4 — DECORAÇÃO =====
    const decoYesNo = document.querySelectorAll('.sim-yesno-option[data-deco]');
    const decoModule = document.getElementById('decoModule');
    const decoTypes = document.querySelectorAll('.sim-yesno-option[data-deco-type]');
    const decoTypeSection = document.getElementById('decoTypeSection');
    const decoCombosSection = document.getElementById('decoCombosSection');
    const decoCombosGrid = document.getElementById('decoCombos');
    const decoBalloonsSection = document.getElementById('decoBalloonsSection');
    const decoBalloonsGrid = document.getElementById('decoBalloons');
    const decoAddonsSection = document.getElementById('decoAddonsSection');
    const decoAddonsGrid = document.getElementById('decoAddons');
    const decoSummary = document.getElementById('decoSummary');
    const decoIncludedNote = document.getElementById('decoIncludedNote');

    // Pacotes que já incluem decoração (Premium, Pro Max e futuros, ex.: Casamento)
    const isPremium = () => !!window.SIM_PRICING?.packages?.[state.package]?.includesDecoration;

    // Decoração inclusa do pacote escolhido (cada pacote tem a sua)
    const includedDeco = () => {
      const DD = window.DECORATION_DATA || {};
      const inc = DD.included?.[state.package];
      if (inc) return inc;
      if (state.package === 'promax' && DD.promaxIncluded) return DD.promaxIncluded;
      return null;
    };

    const renderIncludedBox = () => {
      if (!decoIncludedNote) return;
      const inc = isPremium() ? includedDeco() : null;
      decoIncludedNote.style.display = isPremium() ? '' : 'none';
      if (!isPremium()) return;
      const pkgName = window.SIM_PRICING.packages[state.package]?.name || '';
      const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const items = (inc?.items || []).filter(Boolean);
      const decoIncludedText = document.getElementById('decoIncludedText');
      if (decoIncludedText) {
        decoIncludedText.innerHTML =
          `<strong>${esc(inc?.title || `Decoração ${pkgName} — já montada e inclusa`)}</strong>` +
          (items.length ? `<ul class="deco-included-list">${items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>` : '') +
          `<span class="deco-included-extra">Já vem montada e inclusa no pacote ${esc(pkgName)}. Você ainda pode adicionar elementos extras abaixo.</span>`;
      }
      const photoWrap = decoIncludedNote.querySelector('.deco-included-photo');
      const img = document.getElementById('decoDefaultImg');
      if (photoWrap && img) {
        if (inc?.image) {
          img.src = inc.image;
          img.alt = inc.title || `Decoração inclusa no ${pkgName}`;
          photoWrap.style.display = '';
        } else {
          photoWrap.style.display = 'none';
        }
      }
      decoIncludedNote.classList.toggle('no-photo', !inc?.image);
    };

    const renderDecorationVisibility = () => {
      // Pacotes com decoração inclusa: força enabled=true e mostra módulo de personalização direto
      if (isPremium()) {
        if (state.decoration) state.decoration.enabled = true;
      }

      renderIncludedBox();

      // Etapa 3 — a frase abaixo do título "Decoração" muda nos pacotes com decoração inclusa.
      const decoStepDesc = document.getElementById('decoStepDesc');
      if (decoStepDesc) {
        decoStepDesc.textContent = isPremium()
          ? 'Transforme seu evento em uma experiência inesquecível, monte a identidade que você quer ser lembrada!'
          : 'Você pode escolher um combo pronto, montar pegue e monte ou seguir sem decoração.';
      }

      const decoQuestion = document.getElementById('decoQuestion');
      if (decoQuestion) decoQuestion.style.display = isPremium() ? 'none' : '';

      // Premium/Pro Max sempre mostra módulo. Outros pacotes: só se enabled=true.
      if (decoModule) decoModule.style.display = (isPremium() || state.decoration?.enabled === true) ? '' : 'none';

      // Sub-seções progressivas
      const decoActive = isPremium() || state.decoration?.enabled === true;
      if (decoTypeSection) decoTypeSection.style.display = decoActive ? '' : 'none';
      if (decoCombosSection) decoCombosSection.style.display = state.decoration?.type ? '' : 'none';
      if (decoBalloonsSection) decoBalloonsSection.style.display = (decoActive && (state.decoration?.combo || hasRef() || isPremium())) ? '' : 'none';
      if (decoAddonsSection) decoAddonsSection.style.display = (decoActive && (state.decoration?.combo || hasRef() || isPremium())) ? '' : 'none';
      renderThemes();
      renderRefPhotos();
      renderToys();
    };

    const renderDecorationYesNo = () => {
      decoYesNo.forEach(opt => {
        opt.classList.toggle('selected', String(state.decoration?.enabled) === opt.dataset.deco);
      });
    };

    const renderDecorationTypes = () => {
      decoTypes.forEach(opt => {
        opt.classList.toggle('selected', state.decoration?.type === opt.dataset.decoType);
      });
    };

    // Combos disponíveis no plano escolhido (lista única para Pegue e Monte e Montada;
    // cópias antigas 'completa' são ignoradas; combo sem preço no plano não aparece)
    const combosForPlan = () => {
      const all = window.DECORATION_DATA.combos || [];
      const shared = all.filter(c => c.type !== 'completa');
      return (shared.length ? shared : all).filter(c => window.SIM.availableFor(c, state.package));
    };
    const themesForPlan = () => (window.DECORATION_DATA.themes || [])
      .filter(t => t && t.name && (!t.packages || !t.packages.length || t.packages.includes(state.package)));

    // Ao trocar de plano: tira escolhas que não existem nesse plano e,
    // se só houver um combo (ex.: Diamond no Pro Max), já deixa marcado.
    const syncDecorationWithPlan = () => {
      const d = state.decoration;
      if (!d) return;
      const combos = combosForPlan();
      if (d.combo && !combos.some(c => c.id === d.combo)) d.combo = null;
      if (!d.combo && combos.length === 1 && window.SIM_PRICING.packages[state.package]?.includesDecoration) d.combo = combos[0].id;
      const bal = d.balloon && (window.BALLOONS_DATA || []).find(b => b.id === d.balloon);
      if (d.balloon && (!bal || !window.SIM.availableFor(bal, state.package))) d.balloon = null;
      // Balão marcado sozinho não vale em plano sem decoração inclusa
      if (d.balloonAuto && !window.SIM_PRICING.packages[state.package]?.includesDecoration) { d.balloon = null; d.balloonAuto = false; }
      if (d.theme && d.theme !== 'outro' && !themesForPlan().some(t => t.id === d.theme)) d.theme = null;
      // Brinquedo que estava marcado como "balão" (cadastro antigo) passa para a lista de brinquedos
      const balObj = d.balloon && (window.BALLOONS_DATA || []).find(b => b.id === d.balloon);
      if (balObj && window.SIM.isToy(balObj)) { d.toys = d.toys || []; if (!d.toys.includes(balObj.id)) d.toys.push(balObj.id); d.balloon = null; d.balloonAuto = false; }
      d.toys = (d.toys || []).filter(id => { const t = (window.BALLOONS_DATA || []).find(b => b.id === id); return t && window.SIM.availableFor(t, state.package); });
    };

    // ===== FOTO DE REFERÊNCIA DO CLIENTE (Cloudinary, opcional) =====
    // Guarda o card fora da grade: a grade é redesenhada e o card seria apagado junto
    const refCardEl = document.getElementById('decoRefCard');
    const refQ = (id) => refCardEl ? refCardEl.querySelector('#' + id) : null;
    const refPhotos = () => (state.decoration?.refPhotos || []).filter(Boolean);
    const hasRef = () => refPhotos().length > 0;
    const MAX_REF = 3;
    const cloudCfgPublic = () => {
      try { return (window.DataStore?.loadData?.().config?.cloudinary) || {}; } catch { return {}; }
    };
    const renderRefPhotos = () => {
      const card = refCardEl;
      const thumbs = refQ('decoRefThumbs');
      const btnText = refQ('decoRefBtnText');
      const btn = refQ('decoRefBtn');
      if (!card) return;
      const c = cloudCfgPublic();
      const show = !!(c.cloudName && c.uploadPreset);
      card.style.display = show ? '' : 'none';
      card.classList.toggle('selected', hasRef());
      if (!show || !thumbs) return;
      thumbs.innerHTML = refPhotos().map((u, i) =>
        `<div class="deco-ref-thumb"><img src="${u.replace(/"/g, '')}" alt="Foto de referência ${i + 1}"><button type="button" data-ref-del="${i}" aria-label="Remover">×</button></div>`).join('');
      thumbs.querySelectorAll('[data-ref-del]').forEach(b => b.addEventListener('click', () => {
        state.decoration.refPhotos.splice(+b.dataset.refDel, 1);
        window.SIM.save(state);
        renderRefPhotos(); renderDecorationVisibility(); renderDecorationSummary(); renderBudget();
      }));
      if (btnText) btnText.textContent = hasRef() ? 'Enviar outra' : 'Enviar foto';
      if (btn) btn.style.display = refPhotos().length >= MAX_REF ? 'none' : '';
    };
    const refInput = refQ('decoRefInput');
    refInput?.addEventListener('change', async () => {
      const status = refQ('decoRefStatus');
      const setStatus = (t, cls = '') => { if (status) { status.textContent = t; status.className = 'deco-ref-status ' + cls; } };
      const files = [...(refInput.files || [])].slice(0, MAX_REF - refPhotos().length);
      refInput.value = '';
      if (!files.length) return;
      const c = cloudCfgPublic();
      state.decoration.refPhotos = state.decoration.refPhotos || [];
      for (const f of files) {
        if (!/^image\//.test(f.type)) { setStatus('Envie apenas imagens (JPG, PNG...).', 'error'); continue; }
        if (f.size > 10 * 1024 * 1024) { setStatus('A foto é muito grande (máx. 10 MB).', 'error'); continue; }
        setStatus('Enviando foto...');
        try {
          const fd = new FormData();
          fd.append('file', f);
          fd.append('upload_preset', c.uploadPreset);
          fd.append('folder', 'casadebia/referencias-clientes');
          const r = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(c.cloudName)}/image/upload`, { method: 'POST', body: fd });
          const j = await r.json();
          if (!r.ok || !j.secure_url) throw new Error(j?.error?.message || 'falha');
          state.decoration.refPhotos.push(j.secure_url);
          window.SIM.save(state);
          setStatus('Foto recebida! Ela vai junto com o seu pedido no WhatsApp.', 'ok');
        } catch (e) {
          setStatus('Não foi possível enviar a foto agora. Tente de novo ou mande pelo WhatsApp.', 'error');
        }
      }
      renderRefPhotos(); renderDecorationVisibility(); renderDecorationSummary(); renderBudget();
    });

    const renderThemes = () => {
      const sec = document.getElementById('decoThemesSection');
      const grid = document.getElementById('decoThemes');
      if (!sec || !grid) return;
      const themes = themesForPlan();
      const show = themes.length > 0 && (state.decoration?.enabled === true || isPremium());
      sec.style.display = show ? '' : 'none';
      if (!show) return;
      const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const cur = state.decoration?.theme;
      grid.innerHTML = themes.map(t => `
        <button type="button" class="deco-theme-card ${cur === t.id ? 'selected' : ''}" data-theme="${esc(t.id)}">
          ${t.image ? `<img src="${esc(t.image)}" alt="${esc(t.name)}" loading="lazy">` : '<div class="deco-theme-noimg">✦</div>'}
          <span class="deco-theme-name">${esc(t.name)}</span>
          ${t.description ? `<span class="deco-theme-desc">${esc(t.description)}</span>` : ''}
        </button>`).join('') + `
        <button type="button" class="deco-theme-card deco-theme-other ${cur === 'outro' ? 'selected' : ''}" data-theme="outro">
          <div class="deco-theme-noimg">?</div>
          <span class="deco-theme-name">Outro tema</span>
          <span class="deco-theme-desc">Conte sua ideia e combinamos pelo WhatsApp.</span>
        </button>`;
      grid.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => {
        state.decoration.theme = btn.dataset.theme;
        window.SIM.save(state);
        renderThemes();
      }));
    };

    const renderDecorationCombos = () => {
      if (!decoCombosGrid) return;
      // Os combos são os mesmos para Pegue e Monte e Decoração Montada —
      // o cliente só escolhe o modelo de montagem. (Cópias antigas marcadas como
      // 'completa' são ignoradas quando existe a lista principal.)
      const filtered = combosForPlan();

      if (!filtered.length) {
        decoCombosGrid.innerHTML = '';
        if (refCardEl) { decoCombosGrid.appendChild(refCardEl); renderRefPhotos(); }
        return;
      }

      decoCombosGrid.innerHTML = filtered.map(c => {
        const cover = (c.images && c.images[0]) || c.image || '';
        return `
        <button class="deco-combo ${state.decoration?.combo === c.id ? 'selected' : ''}" data-combo="${c.id}" type="button">
          <img src="${cover}" alt="${c.name}" class="deco-combo-img" loading="lazy">
          <div class="deco-combo-body">
            <div class="deco-combo-name">${c.name}</div>
            <p class="deco-combo-desc">${c.description}</p>
            <ul class="deco-combo-items">
              ${c.items.map(i => `<li><i data-lucide="check"></i>${i}</li>`).join('')}
            </ul>
            <div class="deco-combo-foot">
              <span class="deco-combo-price">${window.SIM.formatBRL(window.SIM.priceFor(c, state.package))}</span>
              <span class="deco-combo-view"><i data-lucide="zoom-in"></i>Ver detalhes</span>
            </div>
          </div>
        </button>
      `;}).join('');

      // Card "Tem a sua própria foto?" logo depois do último combo
      if (refCardEl) { decoCombosGrid.appendChild(refCardEl); renderRefPhotos(); }

      decoCombosGrid.querySelectorAll('.deco-combo[data-combo]').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const combo = filtered.find(x => x.id === btn.dataset.combo);
          if (!combo) return;
          // Clicar no card escolhe o combo; "Ver detalhes" abre as fotos e a descrição
          if (!ev.target.closest('.deco-combo-view')) {
            state.decoration.combo = combo.id;
            window.SIM.save(state);
            renderDecorationCombos();
            renderDecorationVisibility();
            renderBalloons();
            renderDecorationSummary();
            renderBudget();
            return;
          }
          const imgs = (combo.images && combo.images.length) ? combo.images : (combo.image ? [combo.image] : []);
          const descFull = (combo.description || '') + (combo.items?.length ? '\n\nInclui:\n• ' + combo.items.join('\n• ') : '');
          openDetailModal({
            kind: 'combo',
            id: combo.id,
            title: combo.name,
            price: window.SIM.priceFor(combo, state.package),
            description: descFull,
            images: imgs,
            selected: state.decoration?.combo === combo.id
          });
        });
      });

      if (window.lucide) window.lucide.createIcons();
    };

    // ===== BALÕES PERSONALIZADOS =====
    const renderBalloons = () => {
      if (!decoBalloonsGrid) return;
      const balloons = (window.BALLOONS_DATA || []).filter(b => !window.SIM.isToy(b) && window.SIM.availableFor(b, state.package));
      if (!balloons.length) {
        decoBalloonsGrid.innerHTML = '<div class="deco-combo-empty">Nenhum modelo de balão cadastrado.</div>';
        return;
      }
      decoBalloonsGrid.innerHTML = balloons.map(b => `
        <button class="balloon-card ${state.decoration?.balloon === b.id ? 'selected' : ''}" data-balloon="${b.id}" type="button">
          <img class="balloon-card-img" src="${(b.images && b.images[0]) || ''}" alt="${b.name}" loading="lazy">
          <div class="balloon-card-body">
            <span class="balloon-card-name">${b.name}</span>
            <span class="balloon-card-desc">${b.shortDesc || ''}</span>
            <div class="balloon-card-foot">
              <span class="balloon-card-price">${window.SIM.formatBRL(window.SIM.priceFor(b, state.package))}</span>
              <span class="balloon-card-view"><i data-lucide="zoom-in"></i>Ver detalhes</span>
            </div>
          </div>
        </button>
      `).join('');
      decoBalloonsGrid.querySelectorAll('.balloon-card').forEach(card => {
        card.addEventListener('click', (ev) => {
          const bal = balloons.find(b => b.id === card.dataset.balloon);
          if (!bal) return;
          // Clicar no card marca/desmarca o balão; "Ver detalhes" abre as fotos
          if (!ev.target.closest('.balloon-card-view')) {
            state.decoration.balloon = (state.decoration.balloon === bal.id) ? null : bal.id;
            state.decoration.balloonAuto = false;
            window.SIM.save(state);
            renderBalloons();
            renderDecorationSummary();
            renderBudget();
            return;
          }
          openDetailModal({
            kind: 'balloon',
            id: bal.id,
            title: bal.name,
            price: window.SIM.priceFor(bal, state.package),
            description: bal.description || bal.shortDesc || '',
            images: bal.images || [],
            selected: state.decoration?.balloon === bal.id
          });
        });
      });
      if (window.lucide) window.lucide.createIcons();
    };

    // ===== BRINQUEDOS (seção própria, abaixo dos balões; pode marcar vários) =====
    const toysList = () => (window.BALLOONS_DATA || []).filter(b => window.SIM.isToy(b) && window.SIM.availableFor(b, state.package));
    const toggleToy = (id) => {
      state.decoration.toys = state.decoration.toys || [];
      const i = state.decoration.toys.indexOf(id);
      if (i >= 0) state.decoration.toys.splice(i, 1); else state.decoration.toys.push(id);
      window.SIM.save(state);
      renderToys(); renderDecorationSummary(); renderBudget();
    };
    const renderToys = () => {
      const sec = document.getElementById('decoToysSection');
      const grid = document.getElementById('decoToys');
      if (!sec || !grid) return;
      const toys = toysList();
      const decoActive = isPremium() || state.decoration?.enabled === true;
      const show = toys.length > 0 && decoActive && !!(state.decoration?.combo || hasRef() || isPremium());
      sec.style.display = show ? '' : 'none';
      if (!show) return;
      const sel = state.decoration?.toys || [];
      grid.innerHTML = toys.map(b => `
        <button class="balloon-card ${sel.includes(b.id) ? 'selected' : ''}" data-toy="${b.id}" type="button">
          <img class="balloon-card-img" src="${(b.images && b.images[0]) || ''}" alt="${b.name}" loading="lazy">
          <div class="balloon-card-body">
            <span class="balloon-card-name">${b.name}</span>
            <span class="balloon-card-desc">${b.shortDesc || ''}</span>
            <div class="balloon-card-foot">
              <span class="balloon-card-price">${window.SIM.formatBRL(window.SIM.priceFor(b, state.package))}</span>
              <span class="balloon-card-view"><i data-lucide="zoom-in"></i>Ver detalhes</span>
            </div>
          </div>
        </button>`).join('');
      grid.querySelectorAll('[data-toy]').forEach(card => card.addEventListener('click', (ev) => {
        const t = toys.find(x => x.id === card.dataset.toy);
        if (!t) return;
        if (!ev.target.closest('.balloon-card-view')) { toggleToy(t.id); return; }
        openDetailModal({ kind: 'toy', id: t.id, title: t.name, price: window.SIM.priceFor(t, state.package),
          description: t.description || t.shortDesc || '', images: t.images || [], selected: sel.includes(t.id) });
      }));
      if (window.lucide) window.lucide.createIcons();
    };

    // ===== MODAL DE DETALHES (compartilhado entre balões e decoração) =====
    const detailModal = document.getElementById('detailModal');
    const detailTitle = document.getElementById('detailTitle');
    const detailPrice = document.getElementById('detailPrice');
    const detailDesc = document.getElementById('detailDesc');
    const detailMainImg = document.getElementById('detailMainImg');
    const detailThumbs = document.getElementById('detailThumbs');
    const detailPrev = document.getElementById('detailPrev');
    const detailNext = document.getElementById('detailNext');
    const detailChoose = document.getElementById('detailChoose');
    const detailZoomBtn = document.getElementById('detailZoomBtn');
    const detailZoomOverlay = document.getElementById('detailZoomOverlay');
    const detailZoomImg = document.getElementById('detailZoomImg');
    const detailZoomClose = document.getElementById('detailZoomClose');

    let modalCtx = null; // { kind, id, images, idx }

    const renderModalGallery = () => {
      if (!modalCtx) return;
      const imgs = modalCtx.images || [];
      const idx = modalCtx.idx || 0;
      const src = imgs[idx] || '';
      if (detailMainImg) detailMainImg.src = src;
      if (detailThumbs) {
        detailThumbs.innerHTML = imgs.map((u, i) => `
          <button type="button" class="detail-thumb ${i === idx ? 'active' : ''}" data-thumb-idx="${i}">
            <img src="${u}" alt="">
          </button>
        `).join('');
        detailThumbs.querySelectorAll('[data-thumb-idx]').forEach(btn => {
          btn.addEventListener('click', () => {
            modalCtx.idx = parseInt(btn.dataset.thumbIdx, 10);
            renderModalGallery();
          });
        });
      }
      const showNav = imgs.length > 1;
      if (detailPrev) detailPrev.style.display = showNav ? '' : 'none';
      if (detailNext) detailNext.style.display = showNav ? '' : 'none';
    };

    const openDetailModal = (ctx) => {
      modalCtx = Object.assign({ idx: 0 }, ctx);
      if (detailTitle) detailTitle.textContent = ctx.title || '';
      if (detailPrice) detailPrice.textContent = ctx.price != null ? window.SIM.formatBRL(ctx.price) : '';
      if (detailDesc) detailDesc.textContent = ctx.description || '';
      if (detailChoose) {
        const isSelected = !!ctx.selected;
        detailChoose.querySelector('span').textContent = isSelected ? 'Remover seleção' : 'Escolher este modelo';
        detailChoose.classList.toggle('btn-outline', isSelected);
        detailChoose.classList.toggle('btn-primary', !isSelected);
      }
      renderModalGallery();
      detailModal?.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (window.lucide) window.lucide.createIcons();
    };

    const closeDetailModal = () => {
      detailModal?.classList.remove('open');
      detailZoomOverlay?.classList.remove('open');
      document.body.style.overflow = '';
      modalCtx = null;
    };

    detailModal?.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', closeDetailModal);
    });
    detailPrev?.addEventListener('click', () => {
      if (!modalCtx) return;
      const len = (modalCtx.images || []).length || 1;
      modalCtx.idx = (modalCtx.idx - 1 + len) % len;
      renderModalGallery();
    });
    detailNext?.addEventListener('click', () => {
      if (!modalCtx) return;
      const len = (modalCtx.images || []).length || 1;
      modalCtx.idx = (modalCtx.idx + 1) % len;
      renderModalGallery();
    });
    detailZoomBtn?.addEventListener('click', () => {
      if (!modalCtx) return;
      const src = (modalCtx.images || [])[modalCtx.idx || 0];
      if (src && detailZoomImg) {
        detailZoomImg.src = src;
        detailZoomOverlay?.classList.add('open');
      }
    });
    detailZoomClose?.addEventListener('click', () => detailZoomOverlay?.classList.remove('open'));
    detailZoomOverlay?.addEventListener('click', (e) => {
      if (e.target === detailZoomOverlay) detailZoomOverlay.classList.remove('open');
    });
    document.addEventListener('keydown', (e) => {
      if (!detailModal?.classList.contains('open')) return;
      if (e.key === 'Escape') {
        if (detailZoomOverlay?.classList.contains('open')) detailZoomOverlay.classList.remove('open');
        else closeDetailModal();
      }
      if (e.key === 'ArrowLeft') detailPrev?.click();
      if (e.key === 'ArrowRight') detailNext?.click();
    });

    detailChoose?.addEventListener('click', () => {
      if (!modalCtx) return;
      if (modalCtx.kind === 'balloon') {
        state.decoration.balloon = (state.decoration.balloon === modalCtx.id) ? null : modalCtx.id;
        window.SIM.save(state);
        renderBalloons();
        renderDecorationSummary();
        renderBudget();
      } else if (modalCtx.kind === 'toy') {
        toggleToy(modalCtx.id);
      } else if (modalCtx.kind === 'combo') {
        state.decoration.combo = modalCtx.id;
        window.SIM.save(state);
        renderDecorationCombos();
        renderDecorationVisibility();
        renderBalloons();
        renderDecorationSummary();
        renderBudget();
      }
      closeDetailModal();
    });

    const renderDecorationAddons = () => {
      if (!decoAddonsGrid) return;
      decoAddonsGrid.innerHTML = window.DECORATION_DATA.addons.map(a => {
        const checked = (state.decoration?.addons || []).includes(a.id);
        return `
          <button class="deco-addon ${checked ? 'selected' : ''}" data-addon="${a.id}" type="button">
            <span class="deco-addon-check"></span>
            <span class="deco-addon-info">
              <h5>${a.name}</h5>
              <p>${a.description}</p>
            </span>
            <span class="deco-addon-price">+ ${window.SIM.formatBRL(a.price)}</span>
          </button>
        `;
      }).join('');

      decoAddonsGrid.querySelectorAll('.deco-addon').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.addon;
          state.decoration.addons = state.decoration.addons || [];
          const idx = state.decoration.addons.indexOf(id);
          if (idx >= 0) state.decoration.addons.splice(idx, 1);
          else state.decoration.addons.push(id);
          window.SIM.save(state);
          renderDecorationAddons();
          renderDecorationSummary();
          renderBudget();
        });
      });
    };

    const renderDecorationSummary = () => {
      if (!decoSummary) return;
      if (state.decoration?.enabled !== true || (!state.decoration?.combo && !hasRef())) {
        decoSummary.style.display = 'none';
        return;
      }
      const combo = window.DECORATION_DATA.combos.find(c => c.id === state.decoration.combo);
      const addonsTotal = (state.decoration.addons || []).reduce((sum, id) => {
        const a = window.DECORATION_DATA.addons.find(x => x.id === id);
        return sum + (a?.price || 0);
      }, 0);
      const balloon = state.decoration.balloon && (window.BALLOONS_DATA || []).find(b => b.id === state.decoration.balloon);
      const toysTotal = (state.decoration.toys || []).reduce((sum, id) => {
        const t = (window.BALLOONS_DATA || []).find(b => b.id === id);
        return sum + (window.SIM.priceFor(t, state.package) || 0);
      }, 0);
      const total = (window.SIM.priceFor(combo, state.package) || 0) + addonsTotal + (window.SIM.priceFor(balloon, state.package) || 0) + toysTotal;
      const addonsCount = (state.decoration.addons || []).length;

      decoSummary.style.display = '';
      decoSummary.innerHTML = `
        <span class="deco-summary-label">
          <strong>${combo?.name || 'Decoração pela sua foto'}</strong>${!combo ? ' · valor após análise' : (hasRef() ? ' + foto de referência' : '')}
          ${addonsCount > 0 ? ` + ${addonsCount} adicional${addonsCount > 1 ? 'is' : ''}` : ''}
        </span>
        <span class="deco-summary-value">${window.SIM.formatBRL(total)}</span>
      `;
    };

    // Yes/No de decoração
    decoYesNo.forEach(opt => {
      opt.addEventListener('click', () => {
        const enabled = opt.dataset.deco === 'true';
        state.decoration = state.decoration || { enabled: null, type: null, combo: null, addons: [] };
        state.decoration.enabled = enabled;
        // Se desabilitar, limpa o resto
        if (!enabled) {
          state.decoration.type = null;
          state.decoration.combo = null;
          state.decoration.addons = [];
        }
        window.SIM.save(state);
        renderDecorationYesNo();
        renderDecorationVisibility();
        renderDecorationSummary();
        renderBudget();
      });
    });

    // Tipo de decoração
    decoTypes.forEach(opt => {
      opt.addEventListener('click', () => {
        state.decoration.type = opt.dataset.decoType;
        // Os combos são os mesmos nos dois modelos: mantém o combo já escolhido
        window.SIM.save(state);
        renderDecorationTypes();
        renderDecorationCombos();
        renderDecorationVisibility();
        renderDecorationSummary();
        renderBudget();
      });
    });

    // ===== ETAPA 5 — SERVIÇOS =====
    const svcContainer = document.getElementById('svcList');

    // Garante estrutura inicial dos serviços
    // Estado padrão de um serviço conforme seu modo (suporta serviços criados no painel)
    const serviceStateDefault = (cfg) => {
      switch (cfg?.mode) {
        case 'multi-checkbox':     return { enabled: false, items: [] };
        case 'hours':              return { enabled: false, hours: 0 };
        case 'qty-hours':          return { enabled: false, qtd: 0, hours: 0 };
        case 'qty-hours-control':  return { enabled: false, qtd: 0, hours: 0, controle: cfg.controlOptions?.[0]?.id || null };
        case 'type-hours':         return { enabled: false, tipo: null, hours: 0 };
        case 'package':            return { enabled: false, pacote: null };
        default:                   return { enabled: false };
      }
    };

    const ensureServices = () => {
      state.services = state.services || {};
      const SD = window.SERVICES_DATA || {};
      Object.keys(SD).forEach(k => {
        state.services[k] = Object.assign({}, serviceStateDefault(SD[k]), state.services[k] || {});
      });
      // Remove estado de serviços que não existem mais (excluídos no painel)
      Object.keys(state.services).forEach(k => { if (!SD[k]) delete state.services[k]; });
    };

    // Calcula subtotal de um serviço — genérico por modo (suporta serviços do painel)
    const serviceSubtotal = (key) => {
      const svc = state.services[key];
      if (!svc?.enabled) return 0;
      const cfg = window.SERVICES_DATA?.[key];
      if (!cfg) return 0;

      switch (cfg.mode) {
        case 'multi-checkbox':
          return (svc.items || []).reduce((s, id) => {
            const it = (cfg.items || []).find(i => i.id === id);
            return s + (it?.price || 0);
          }, 0);
        case 'hours':
          return (svc.hours || 0) * (cfg.hourlyRate || 0);
        case 'qty-hours':
          return (svc.qtd || 0) * (svc.hours || 0) * (cfg.hourlyRate || 0);
        case 'qty-hours-control': {
          const base = (svc.qtd || 0) * (svc.hours || 0) * (cfg.hourlyRate || 0);
          const ctrl = (cfg.controlOptions || []).find(c => c.id === svc.controle);
          return base + (ctrl?.price || 0);
        }
        case 'type-hours': {
          const t = (cfg.types || []).find(x => x.id === svc.tipo);
          if (!t) return 0;
          return (svc.hours || 0) * ((cfg.hourlyRate || 0) + (t.extraPerHour || 0));
        }
        case 'package': {
          const p = (cfg.packages || []).find(x => x.id === svc.pacote);
          return p?.price || 0;
        }
        default: return 0;
      }
    };

    // Descrição curta de um serviço (usada no resumo/WhatsApp para serviços criados no painel)
    const describeService = (key) => {
      const cfg = window.SERVICES_DATA?.[key];
      const svc = state.services[key];
      const value = serviceSubtotal(key);
      let detail = '';
      switch (cfg?.mode) {
        case 'multi-checkbox':
          detail = (svc.items || []).map(id => (cfg.items || []).find(i => i.id === id)?.name).filter(Boolean).join(', ');
          break;
        case 'hours': detail = `${svc.hours}h`; break;
        case 'qty-hours': detail = `${svc.qtd}x / ${svc.hours}h`; break;
        case 'qty-hours-control': {
          const ctrl = (cfg.controlOptions || []).find(c => c.id === svc.controle);
          detail = `${svc.qtd}x / ${svc.hours}h${ctrl && ctrl.price > 0 ? ', ' + ctrl.name.toLowerCase() : ''}`;
          break;
        }
        case 'type-hours': {
          const t = (cfg.types || []).find(x => x.id === svc.tipo);
          detail = `${t ? t.name : ''} · ${svc.hours}h`;
          break;
        }
        case 'package': {
          const p = (cfg.packages || []).find(x => x.id === svc.pacote);
          detail = p ? p.name : '';
          break;
        }
      }
      return { name: cfg?.name || key, detail, value };
    };
    // Serviços criados no painel (fora dos 8 padrão), ativos (valor > 0)
    const extraActiveServices = () =>
      Object.keys(window.SERVICES_DATA || {})
        .filter(k => !['animadora', 'recepcionista', 'fritadeira', 'seguranca', 'garcom', 'dj', 'fotografo', 'storymaker'].includes(k))
        .filter(k => state.services[k]?.enabled && serviceSubtotal(k) > 0);

    // Renderiza o body de cada serviço conforme seu modo
    const renderServiceBody = (key) => {
      const svc = state.services[key];
      const SD = window.SERVICES_DATA[key];

      switch (SD.mode) {
        case 'multi-checkbox':
          return `
            <div class="svc-field">
              <label>Selecione os serviços:</label>
              <div class="svc-checkboxes">
                ${SD.items.map(it => {
                  const checked = (svc.items || []).includes(it.id);
                  return `
                    <button class="deco-addon ${checked ? 'selected' : ''}" data-svc-item="${it.id}" type="button">
                      <span class="deco-addon-check"></span>
                      <span class="deco-addon-info">
                        <h5>${it.name}</h5>
                      </span>
                      <span class="deco-addon-price">+ ${window.SIM.formatBRL(it.price)}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;

        case 'hours':
          return `
            <div class="svc-field">
              <label>Quantas horas?</label>
              <div class="svc-num-input">
                <button data-svc-action="hours-minus" type="button">−</button>
                <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                <button data-svc-action="hours-plus" type="button">+</button>
                <span class="unit">${window.SIM.formatBRL(SD.hourlyRate)}/h</span>
              </div>
            </div>
          `;

        case 'qty-hours':
          return `
            <div class="svc-field-grid">
              <div class="svc-field">
                <label>Quantos profissionais?</label>
                <div class="svc-num-input">
                  <button data-svc-action="qtd-minus" type="button">−</button>
                  <input type="number" data-svc-input="qtd" min="0" max="20" value="${svc.qtd || 0}">
                  <button data-svc-action="qtd-plus" type="button">+</button>
                </div>
              </div>
              <div class="svc-field">
                <label>Quantas horas?</label>
                <div class="svc-num-input">
                  <button data-svc-action="hours-minus" type="button">−</button>
                  <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                  <button data-svc-action="hours-plus" type="button">+</button>
                  <span class="unit">${window.SIM.formatBRL(SD.hourlyRate)}/h</span>
                </div>
              </div>
            </div>
          `;

        case 'qty-hours-control':
          return `
            <div class="svc-field-grid">
              <div class="svc-field">
                <label>Quantos seguranças?</label>
                <div class="svc-num-input">
                  <button data-svc-action="qtd-minus" type="button">−</button>
                  <input type="number" data-svc-input="qtd" min="0" max="20" value="${svc.qtd || 0}">
                  <button data-svc-action="qtd-plus" type="button">+</button>
                </div>
              </div>
              <div class="svc-field">
                <label>Quantas horas?</label>
                <div class="svc-num-input">
                  <button data-svc-action="hours-minus" type="button">−</button>
                  <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                  <button data-svc-action="hours-plus" type="button">+</button>
                  <span class="unit">${window.SIM.formatBRL(SD.hourlyRate)}/h</span>
                </div>
              </div>
            </div>
            <div class="svc-field">
              <label>Controle de acesso:</label>
              <div class="svc-radio-group">
                ${SD.controlOptions.map(c => `
                  <button class="svc-radio ${svc.controle === c.id ? 'selected' : ''}" data-svc-control="${c.id}" type="button">
                    <span class="svc-radio-name">${c.name}</span>
                    <span class="svc-radio-meta">${c.price > 0 ? '+ ' + window.SIM.formatBRL(c.price) : 'Sem custo'}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `;

        case 'type-hours':
          return `
            <div class="svc-field">
              <label>Tipo de DJ:</label>
              <div class="svc-radio-group">
                ${SD.types.map(t => {
                  const ratePerHour = SD.hourlyRate + t.extraPerHour;
                  return `
                    <button class="svc-radio ${svc.tipo === t.id ? 'selected' : ''}" data-svc-type="${t.id}" type="button">
                      <span class="svc-radio-name">${t.name}</span>
                      <span class="svc-radio-meta">${window.SIM.formatBRL(ratePerHour)}/h</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
            <div class="svc-field">
              <label>Quantas horas?</label>
              <div class="svc-num-input">
                <button data-svc-action="hours-minus" type="button">−</button>
                <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                <button data-svc-action="hours-plus" type="button">+</button>
              </div>
            </div>
          `;

        case 'package':
          return `
            <div class="svc-field">
              <label>Escolha o pacote:</label>
              <div class="svc-package-group">
                ${SD.packages.map(p => `
                  <button class="svc-package ${svc.pacote === p.id ? 'selected' : ''}" data-svc-package="${p.id}" type="button">
                    <span class="svc-package-name">${p.name}</span>
                    <span class="svc-package-meta">${p.desc}</span>
                    <span class="svc-package-price">${window.SIM.formatBRL(p.price)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `;

        default: return '';
      }
    };

    const KNOWN_SERVICES = ['animadora', 'recepcionista', 'fritadeira', 'seguranca', 'garcom', 'dj', 'fotografo', 'storymaker'];
    const serviceOrder = () => {
      const SD = window.SERVICES_DATA || {};
      const known = KNOWN_SERVICES.filter(k => SD[k]);
      const extra = Object.keys(SD).filter(k => !KNOWN_SERVICES.includes(k));
      return known.concat(extra);
    };

    const renderServices = () => {
      if (!svcContainer) return;
      const SD = window.SERVICES_DATA;

      svcContainer.innerHTML = serviceOrder().map(key => {
        const cfg = SD[key];
        if (!cfg) return '';
        const svc = state.services[key];
        const subtotal = serviceSubtotal(key);
        const head = cfg.image
          ? `<div class="svc-icon"><img src="${cfg.image}" alt="" onerror="this.parentElement.innerHTML='<i data-lucide=&quot;sparkles&quot;></i>'"></div>`
          : `<div class="svc-icon"><i data-lucide="${cfg.icon || 'sparkles'}"></i></div>`;
        return `
          <div class="svc-card ${svc.enabled ? 'enabled' : ''}" data-svc="${key}">
            <div class="svc-head" data-svc-toggle>
              ${head}
              <div class="svc-head-info">
                <h4>${cfg.name}</h4>
                <p>${cfg.desc || ''}</p>
              </div>
              <div class="svc-head-right">
                <span class="svc-head-total ${subtotal > 0 ? 'has-value' : ''}">${window.SIM.formatBRL(subtotal)}</span>
                <span class="svc-toggle"></span>
              </div>
            </div>
            <div class="svc-body">${renderServiceBody(key)}</div>
          </div>
        `;
      }).join('');

      attachServiceListeners();
      if (window.lucide) window.lucide.createIcons();
    };

    const attachServiceListeners = () => {
      svcContainer.querySelectorAll('.svc-card').forEach(card => {
        const key = card.dataset.svc;

        // Toggle on/off
        card.querySelector('[data-svc-toggle]')?.addEventListener('click', (e) => {
          // Não toggle se clicar dentro do body
          if (e.target.closest('.svc-body')) return;
          state.services[key].enabled = !state.services[key].enabled;
          window.SIM.save(state);
          renderServices();
          renderBudget();
        });

        // Multi-checkbox (animadora)
        card.querySelectorAll('[data-svc-item]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.svcItem;
            const arr = state.services[key].items = state.services[key].items || [];
            const idx = arr.indexOf(id);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(id);
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });

        // Inputs numéricos +/-
        card.querySelectorAll('[data-svc-action]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.svcAction;
            const [field, op] = action.split('-');
            const delta = op === 'plus' ? 1 : -1;
            const max = field === 'hours' ? 24 : 20;
            state.services[key][field] = Math.max(0, Math.min(max, (state.services[key][field] || 0) + delta));
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });

        // Inputs digitados
        card.querySelectorAll('[data-svc-input]').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const field = inp.dataset.svcInput;
            const max = field === 'hours' ? 24 : 20;
            const val = Math.max(0, Math.min(max, parseInt(inp.value, 10) || 0));
            state.services[key][field] = val;
            window.SIM.save(state);
            renderBudget();
            // Atualiza só o subtotal sem re-render completo
            const totalEl = card.querySelector('.svc-head-total');
            if (totalEl) {
              const sub = serviceSubtotal(key);
              totalEl.textContent = window.SIM.formatBRL(sub);
              totalEl.classList.toggle('has-value', sub > 0);
            }
          });
        });

        // Radios genéricos (controle, tipo)
        card.querySelectorAll('[data-svc-control]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.services[key].controle = btn.dataset.svcControl;
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });
        card.querySelectorAll('[data-svc-type]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.services[key].tipo = btn.dataset.svcType;
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });

        // Pacotes (fotógrafo, storymaker)
        card.querySelectorAll('[data-svc-package]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.services[key].pacote = btn.dataset.svcPackage;
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });
      });
    };

    // ===== ETAPA 6 — CALENDÁRIO =====
    const calMonthLabel = document.getElementById('calMonthLabel');
    const calGrid = document.getElementById('calGrid');
    const calPrev = document.getElementById('calPrev');
    const calNext = document.getElementById('calNext');
    const calSelected = document.getElementById('calSelected');

    const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const WEEK_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

    let calView = (() => {
      const now = new Date();
      if (state.date) {
        const [y, m] = state.date.split('-').map(Number);
        return { year: y, month: m - 1 };
      }
      return { year: now.getFullYear(), month: now.getMonth() };
    })();

    const todayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayMidnight = () => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return t;
    };

    const formatDatePT = (iso) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return `${WEEK_PT[dt.getDay()]}, ${d} de ${MONTHS_PT[m - 1]} de ${y}`;
    };

    const renderCalendar = () => {
      if (!calGrid) return;
      const { year, month } = calView;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startWeekday = firstDay.getDay();
      const today = todayMidnight();
      const availability = window.DataStore?.getDateAvailability?.() || {};

      if (calMonthLabel) calMonthLabel.textContent = `${MONTHS_PT[month]} ${year}`;

      if (calPrev) {
        const minMonth = today.getFullYear() * 12 + today.getMonth();
        const currMonth = year * 12 + month;
        calPrev.disabled = currMonth <= minMonth;
      }

      let html = WEEK_PT.map(d => `<div class="cal-day-name">${d}</div>`).join('');
      for (let i = 0; i < startWeekday; i++) html += `<div class="cal-day empty"></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month, d);
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isPast = dt < today;
        const isToday = iso === todayStr();
        const isSelected = state.date === iso;
        const avail = availability[iso];
        const cls = ['cal-day'];
        let title = '';
        if (isPast) {
          cls.push('disabled');
        } else if (avail?.status === 'occupied') {
          cls.push('disabled', 'occupied');
          title = `Data ocupada — ${avail.info}`;
        } else if (avail?.status === 'blocked') {
          cls.push('disabled', 'blocked');
          title = `Indisponível${avail.info ? ' — ' + avail.info : ''}`;
        } else {
          cls.push('selectable');
        }
        if (isToday) cls.push('today');
        if (isSelected) cls.push('selected');
        const isDisabled = isPast || avail?.status === 'occupied' || avail?.status === 'blocked';
        html += `<button type="button" class="${cls.join(' ')}" ${isDisabled ? 'disabled' : ''} ${title ? `title="${title}"` : ''} data-cal-date="${iso}">${d}</button>`;
      }
      calGrid.innerHTML = html;

      calGrid.querySelectorAll('.cal-day.selectable').forEach(btn => {
        btn.addEventListener('click', () => {
          state.date = btn.dataset.calDate;
          window.SIM.save(state);
          renderCalendar();
          renderSelectedDate();
          renderBudget();
        });
      });
    };

    const renderSelectedDate = () => {
      if (!calSelected) return;
      if (!state.date) {
        calSelected.style.display = 'none';
        return;
      }
      calSelected.style.display = '';
      calSelected.innerHTML = `
        <div class="cal-selected-date-label">Data escolhida</div>
        <div class="cal-selected-date-value">${formatDatePT(state.date)}</div>
      `;
    };

    calPrev?.addEventListener('click', () => {
      calView.month--;
      if (calView.month < 0) { calView.month = 11; calView.year--; }
      renderCalendar();
    });
    calNext?.addEventListener('click', () => {
      calView.month++;
      if (calView.month > 11) { calView.month = 0; calView.year++; }
      renderCalendar();
    });

    // ===== ETAPA 7 — DADOS DO CLIENTE =====
    const inpName = document.getElementById('inpName');
    const inpWhatsapp = document.getElementById('inpWhatsapp');

    const formatWhatsapp = (val) => {
      const digits = val.replace(/\D/g, '').slice(0, 11);
      if (digits.length === 0) return '';
      if (digits.length <= 2) return `(${digits}`;
      if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    if (inpName) {
      inpName.value = state.customer?.name || '';
      inpName.addEventListener('input', (e) => {
        state.customer.name = e.target.value;
        window.SIM.save(state);
        e.target.closest('.sim-input-group')?.classList.remove('has-error');
      });
    }
    if (inpWhatsapp) {
      inpWhatsapp.value = formatWhatsapp(state.customer?.whatsapp || '');
      inpWhatsapp.addEventListener('input', (e) => {
        const formatted = formatWhatsapp(e.target.value);
        e.target.value = formatted;
        state.customer.whatsapp = formatted.replace(/\D/g, '');
        window.SIM.save(state);
        e.target.closest('.sim-input-group')?.classList.remove('has-error');
      });
    }

    // ===== ETAPA 8 — RESUMO E ENVIO =====
    const summaryRoot = document.getElementById('summaryRoot');
    const summarySuccess = document.getElementById('summarySuccess');

    const buildSummary = () => {
      const SD = window.SERVICES_DATA;
      const DD = window.DECORATION_DATA;
      const PK = window.SIM_PRICING.packages[state.package];
      const { items, total } = window.SIM.calculate(state);

      const sections = [];

      // Pacote e convidados
      if (PK) {
        const rows = [
          { label: 'Pacote', sub: `Até ${PK.capacity} pessoas`, value: window.SIM.formatBRL(PK.price), strongLabel: PK.name },
          { label: 'Convidados estimados', value: `${state.guests || 0} pessoa${state.guests !== 1 ? 's' : ''}` }
        ];
        if (state.guests > PK.capacity && PK.extraPerGuest > 0) {
          const extra = state.guests - PK.capacity;
          rows.push({
            label: `Convidados excedentes (${extra})`,
            sub: `${window.SIM.formatBRL(PK.extraPerGuest)} × ${extra} pessoa${extra > 1 ? 's' : ''}`,
            value: window.SIM.formatBRL(extra * PK.extraPerGuest)
          });
        }
        sections.push({ title: 'Pacote e convidados', rows });
      }

      // Gás (se aplicável)
      if (state.gas !== null && PK && !PK.includesGas) {
        sections.push({
          title: 'Gás',
          rows: [
            { label: state.gas ? 'Sim, vou usar gás' : 'Sem uso de gás', value: state.gas ? window.SIM.formatBRL(window.SIM_PRICING.gas) : 'Sem custo' }
          ]
        });
      }

      // Decoração
      if (state.decoration?.enabled === true) {
        const combo = DD.combos.find(c => c.id === state.decoration.combo);
        const rows = [];
        if (combo) {
          rows.push({
            strongLabel: combo.name,
            label: state.decoration.type === 'completa' ? 'Decoração Montada' : 'Pegue e Monte',
            value: window.SIM.formatBRL(window.SIM.priceFor(combo, state.package) || 0)
          });
          if (state.decoration.theme) {
            const th = (DD.themes || []).find(t => t.id === state.decoration.theme);
            rows.push({ strongLabel: 'Tema: ' + (th ? th.name : 'Outro tema'), label: th ? 'Tema do evento' : 'Combinar pelo WhatsApp', value: '' });
          }
        }
        if ((state.decoration.refPhotos || []).length) {
          rows.push({ strongLabel: `Foto${state.decoration.refPhotos.length > 1 ? 's' : ''} de referência (${state.decoration.refPhotos.length})`, label: 'A decoradora analisa e passa o valor', value: combo ? '' : 'a combinar' });
        }
        if (state.decoration.balloon && window.BALLOONS_DATA) {
          const bal = window.BALLOONS_DATA.find(b => b.id === state.decoration.balloon);
          if (bal) rows.push({ strongLabel: 'Balões: ' + bal.name, label: 'Personalizado', value: window.SIM.formatBRL(window.SIM.priceFor(bal, state.package) || 0) });
        }
        (state.decoration.toys || []).forEach(id => {
          const t = (window.BALLOONS_DATA || []).find(b => b.id === id);
          if (t) rows.push({ strongLabel: 'Brinquedos: ' + t.name, label: 'Brinquedos', value: window.SIM.formatBRL(window.SIM.priceFor(t, state.package) || 0) });
        });
        (state.decoration.addons || []).forEach(id => {
          const a = DD.addons.find(x => x.id === id);
          if (a) rows.push({ label: a.name, sub: 'Adicional', value: window.SIM.formatBRL(a.price) });
        });
        if (rows.length) sections.push({ title: 'Decoração', rows });
      }

      // Serviços
      const svcRows = [];
      const svc = state.services || {};

      if (svc.animadora?.enabled && svc.animadora.items?.length) {
        svc.animadora.items.forEach(id => {
          const it = SD.animadora.items.find(i => i.id === id);
          if (it) svcRows.push({ strongLabel: 'Animadora', label: it.name, value: window.SIM.formatBRL(it.price) });
        });
      }
      if (svc.recepcionista?.enabled && svc.recepcionista.hours > 0) {
        const cost = svc.recepcionista.hours * SD.recepcionista.hourlyRate;
        svcRows.push({ strongLabel: 'Recepcionista', label: `${svc.recepcionista.hours} hora${svc.recepcionista.hours > 1 ? 's' : ''}`, value: window.SIM.formatBRL(cost) });
      }
      if (svc.fritadeira?.enabled && svc.fritadeira.hours > 0) {
        const cost = svc.fritadeira.hours * SD.fritadeira.hourlyRate;
        svcRows.push({ strongLabel: 'Fritadeira', label: `${svc.fritadeira.hours} hora${svc.fritadeira.hours > 1 ? 's' : ''}`, value: window.SIM.formatBRL(cost) });
      }
      if (svc.seguranca?.enabled && svc.seguranca.qtd > 0 && svc.seguranca.hours > 0) {
        const base = svc.seguranca.qtd * svc.seguranca.hours * SD.seguranca.hourlyRate;
        const ctrl = SD.seguranca.controlOptions.find(c => c.id === svc.seguranca.controle);
        svcRows.push({ strongLabel: 'Segurança', label: `${svc.seguranca.qtd} pessoa${svc.seguranca.qtd > 1 ? 's' : ''} × ${svc.seguranca.hours}h`, value: window.SIM.formatBRL(base) });
        if (ctrl && ctrl.price > 0) svcRows.push({ label: `Controle: ${ctrl.name}`, value: window.SIM.formatBRL(ctrl.price), sub: 'Adicional segurança' });
      }
      if (svc.garcom?.enabled && svc.garcom.qtd > 0 && svc.garcom.hours > 0) {
        const cost = svc.garcom.qtd * svc.garcom.hours * SD.garcom.hourlyRate;
        svcRows.push({ strongLabel: 'Garçom', label: `${svc.garcom.qtd} pessoa${svc.garcom.qtd > 1 ? 's' : ''} × ${svc.garcom.hours}h`, value: window.SIM.formatBRL(cost) });
      }
      if (svc.dj?.enabled && svc.dj.tipo && svc.dj.hours > 0) {
        const t = SD.dj.types.find(x => x.id === svc.dj.tipo);
        if (t) {
          const cost = (SD.dj.hourlyRate + t.extraPerHour) * svc.dj.hours;
          svcRows.push({ strongLabel: 'DJ', label: `${t.name} · ${svc.dj.hours}h`, value: window.SIM.formatBRL(cost) });
        }
      }
      if (svc.fotografo?.enabled && svc.fotografo.pacote) {
        const p = SD.fotografo.packages.find(x => x.id === svc.fotografo.pacote);
        if (p) svcRows.push({ strongLabel: 'Fotógrafo', label: p.name, value: window.SIM.formatBRL(p.price) });
      }
      if (svc.storymaker?.enabled && svc.storymaker.pacote) {
        const p = SD.storymaker.packages.find(x => x.id === svc.storymaker.pacote);
        if (p) svcRows.push({ strongLabel: 'Story Maker', label: p.name, value: window.SIM.formatBRL(p.price) });
      }
      // Serviços criados no painel
      extraActiveServices().forEach(k => {
        const d = describeService(k);
        svcRows.push({ strongLabel: d.name, label: d.detail, value: window.SIM.formatBRL(d.value) });
      });
      if (svcRows.length) sections.push({ title: 'Serviços adicionais', rows: svcRows });

      // Data
      if (state.date) {
        sections.push({
          title: 'Data do evento',
          rows: [{ label: formatDatePT(state.date), value: '' }]
        });
      }

      // Cliente
      if (state.customer?.name || state.customer?.whatsapp) {
        sections.push({
          title: 'Seus dados',
          rows: [
            { label: 'Nome', value: state.customer?.name || '—' },
            { label: 'WhatsApp', value: formatWhatsapp(state.customer?.whatsapp || '') }
          ]
        });
      }

      return { sections, total };
    };

    const renderSummary = () => {
      if (!summaryRoot) return;
      if (summarySuccess) summarySuccess.classList.remove('show');

      const { sections, total } = buildSummary();

      summaryRoot.innerHTML = `
        <div class="summary-header">
          <div class="summary-header-label">Valor total estimado</div>
          <div class="summary-total">${window.SIM.formatBRL(total)}</div>
          ${!state.decoration?.combo && (state.decoration?.refPhotos || []).length ? '<small class="summary-total-note">+ decoração da sua foto (valor após análise)</small>' : ''}
        </div>
        <div class="summary-body">
          ${sections.map(sec => `
            <div class="summary-section">
              <h4>${sec.title}</h4>
              ${sec.rows.map(r => `
                <div class="summary-row">
                  <div class="summary-row-label">
                    ${r.strongLabel ? `<strong>${r.strongLabel}</strong>` : ''}
                    ${r.label}
                    ${r.sub ? `<div class="sub">${r.sub}</div>` : ''}
                  </div>
                  ${r.value ? `<div class="summary-row-value">${r.value}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="summary-cta">
          <p class="summary-cta-text">Tudo certo? Clique abaixo para enviar seu orçamento <strong>direto para o WhatsApp</strong>. Você não perde nenhuma escolha.</p>
          <button type="button" id="btnSendWhatsapp" class="btn btn-whatsapp btn-lg">
            <i data-lucide="send"></i>Enviar para WhatsApp
          </button>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      document.getElementById('btnSendWhatsapp')?.addEventListener('click', sendToWhatsapp);
    };

    // ===== GERADOR DA MENSAGEM E ENVIO =====
    const formatDateLong = (iso) => {
      if (!iso) return '';
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const [y, m, d] = iso.split('-').map(Number);
      return `${d} de ${months[m - 1]} de ${y}`;
    };

    const buildWhatsappMessage = () => {
      const SD = window.SERVICES_DATA;
      const DD = window.DECORATION_DATA;
      const PK = window.SIM_PRICING.packages[state.package];
      const { total } = window.SIM.calculate(state);
      const fmt = window.SIM.formatBRL;
      const SEP = '━━━━━━━━━━━━━━━';

      const lines = [];
      lines.push('Olá, Casa de Bia! 🎉');
      lines.push('Montei meu evento pelo site e gostaria de confirmar a data e o orçamento:');
      lines.push('');

      if (state.customer?.name) lines.push(`👤 *Nome:* ${state.customer.name}`);
      if (state.customer?.whatsapp) lines.push(`📱 *WhatsApp:* ${formatWhatsapp(state.customer.whatsapp)}`);
      if (state.date) lines.push(`📅 *Evento:* ${formatDateLong(state.date)}`);

      lines.push(SEP);

      // PACOTE
      if (PK) {
        lines.push(`🎈 *Pacote ${PK.name}* — ${fmt(PK.price)}`);
        if (state.guests > 0) {
          lines.push(`${state.guests} convidados (pacote inclui até ${PK.capacity})`);
        } else {
          lines.push(`Pacote para até ${PK.capacity} pessoas`);
        }
        if (state.guests > PK.capacity && PK.extraPerGuest > 0) {
          const extra = state.guests - PK.capacity;
          lines.push(`+${extra} convidado${extra > 1 ? 's' : ''} excedente${extra > 1 ? 's' : ''} — ${fmt(extra * PK.extraPerGuest)}`);
        }
        lines.push('');
      }

      // DECORAÇÃO
      const isPremiumPkg = !!window.SIM_PRICING.packages[state.package]?.includesDecoration;
      if (state.decoration?.enabled === true || isPremiumPkg) {
        const combo = state.decoration?.combo ? DD.combos.find(c => c.id === state.decoration.combo) : null;
        if (combo) {
          lines.push(`🎨 *${combo.name}*`);
          const typeLabel = state.decoration?.type === 'completa' ? 'Decoração Montada' : 'Pegue e Monte';
          lines.push(`${typeLabel} — ${fmt(window.SIM.priceFor(combo, state.package) || 0)}`);
          if (state.decoration?.theme) {
            const th = (DD.themes || []).find(t => t.id === state.decoration.theme);
            lines.push(`Tema: ${th ? th.name : 'Outro tema (combinar)'}`);
          }
          lines.push('');
        } else if ((state.decoration?.refPhotos || []).length) {
          const typeLabel = state.decoration?.type === 'completa' ? 'Decoração Montada' : 'Pegue e Monte';
          lines.push('🎨 *Decoração pela foto de referência*');
          lines.push(`${typeLabel} — valor após análise da decoradora`);
          lines.push('');
        } else if (isPremiumPkg) {
          const inc = DD.included?.[state.package] || (state.package === 'promax' ? DD.promaxIncluded : null);
          lines.push(`🎨 *${inc?.title || 'Decoração inclusa no pacote'}*`);
          (inc?.items || []).filter(Boolean).forEach(it => lines.push(`• ${it}`));
          if (!(inc?.items || []).length) lines.push('Decoração montada pela Casa de Bia');
          lines.push('');
        }
      }

      // FOTOS DE REFERÊNCIA DO CLIENTE
      const refs = (state.decoration?.refPhotos || []).filter(Boolean);
      if (refs.length && (state.decoration?.enabled === true || isPremiumPkg)) {
        lines.push(`📷 *Foto${refs.length > 1 ? 's' : ''} de referência da decoração*`);
        refs.forEach(u => lines.push(u));
        lines.push('_Para a decoradora analisar e passar o valor._');
        lines.push('');
      }

      // BALÕES
      if (state.decoration?.balloon && window.BALLOONS_DATA) {
        const bal = window.BALLOONS_DATA.find(b => b.id === state.decoration.balloon);
        if (bal) {
          lines.push(`🎈 *Balões: ${bal.name}*`);
          lines.push(`Personalizado — ${fmt(window.SIM.priceFor(bal, state.package) || 0)}`);
          lines.push('');
        }
      }

      // BRINQUEDOS
      const toyLines = (state.decoration?.toys || []).map(id => (window.BALLOONS_DATA || []).find(b => b.id === id)).filter(Boolean)
        .map(t => `• ${t.name} — ${fmt(window.SIM.priceFor(t, state.package) || 0)}`);
      if (toyLines.length) {
        lines.push('🧸 *Brinquedos*');
        lines.push(...toyLines);
        lines.push('');
      }

      // ADICIONAIS DE DECORAÇÃO
      const addonLines = [];
      (state.decoration?.addons || []).forEach(id => {
        const a = DD.addons.find(x => x.id === id);
        if (a) addonLines.push(`• ${a.name} — ${fmt(a.price)}`);
      });
      if (addonLines.length) {
        lines.push('✨ *Adicionais escolhidos*');
        lines.push(...addonLines);
        lines.push('');
      }

      // SERVIÇOS
      const svc = state.services || {};
      const svcLines = [];

      if (svc.animadora?.enabled && svc.animadora.items?.length) {
        const items = svc.animadora.items.map(id => SD.animadora.items.find(i => i.id === id)).filter(Boolean);
        const totalSvc = items.reduce((s, i) => s + i.price, 0);
        svcLines.push(`• Animadora (${items.map(i => i.name).join(', ')}) — ${fmt(totalSvc)}`);
      }
      if (svc.recepcionista?.enabled && svc.recepcionista.hours > 0) {
        svcLines.push(`• Recepcionista (${svc.recepcionista.hours}h) — ${fmt(svc.recepcionista.hours * SD.recepcionista.hourlyRate)}`);
      }
      if (svc.fritadeira?.enabled && svc.fritadeira.hours > 0) {
        svcLines.push(`• Fritadeira (${svc.fritadeira.hours}h) — ${fmt(svc.fritadeira.hours * SD.fritadeira.hourlyRate)}`);
      }
      if (svc.seguranca?.enabled && svc.seguranca.qtd > 0 && svc.seguranca.hours > 0) {
        const base = svc.seguranca.qtd * svc.seguranca.hours * SD.seguranca.hourlyRate;
        const ctrl = SD.seguranca.controlOptions.find(c => c.id === svc.seguranca.controle);
        const totalSeg = base + (ctrl?.price || 0);
        const ctrlText = ctrl && ctrl.id !== 'nenhum' ? `, ${ctrl.name.toLowerCase()}` : '';
        svcLines.push(`• Segurança (${svc.seguranca.qtd}x / ${svc.seguranca.hours}h${ctrlText}) — ${fmt(totalSeg)}`);
      }
      if (svc.garcom?.enabled && svc.garcom.qtd > 0 && svc.garcom.hours > 0) {
        const cost = svc.garcom.qtd * svc.garcom.hours * SD.garcom.hourlyRate;
        svcLines.push(`• Garçom (${svc.garcom.qtd}x / ${svc.garcom.hours}h) — ${fmt(cost)}`);
      }
      if (svc.dj?.enabled && svc.dj.tipo && svc.dj.hours > 0) {
        const t = SD.dj.types.find(x => x.id === svc.dj.tipo);
        const cost = (SD.dj.hourlyRate + (t?.extraPerHour || 0)) * svc.dj.hours;
        svcLines.push(`• DJ ${t?.name || ''} (${svc.dj.hours}h) — ${fmt(cost)}`);
      }
      if (svc.fotografo?.enabled && svc.fotografo.pacote) {
        const p = SD.fotografo.packages.find(x => x.id === svc.fotografo.pacote);
        if (p) svcLines.push(`• Fotógrafo (${p.name}) — ${fmt(p.price)}`);
      }
      if (svc.storymaker?.enabled && svc.storymaker.pacote) {
        const p = SD.storymaker.packages.find(x => x.id === svc.storymaker.pacote);
        if (p) svcLines.push(`• Story Maker (${p.name}) — ${fmt(p.price)}`);
      }
      // Serviços criados no painel
      extraActiveServices().forEach(k => {
        const d = describeService(k);
        svcLines.push(`• ${d.name}${d.detail ? ` (${d.detail})` : ''} — ${fmt(d.value)}`);
      });

      if (svcLines.length) {
        lines.push('🛎️ *Serviços adicionais*');
        lines.push(...svcLines);
        lines.push('');
      }

      // GÁS
      const gasPrice = window.SIM_PRICING.gas || 0;
      if (PK?.includesGas) {
        lines.push(`🔥 *Gás incluso no pacote* ✓`);
        lines.push('');
      } else if (state.gas === true) {
        lines.push(`🔥 *Uso de gás* — ${fmt(gasPrice)}`);
        lines.push('');
      }

      lines.push(SEP);
      lines.push(`💰 *Valor total estimado:*`);
      lines.push(`*${fmt(total)}*`);
      if (!state.decoration?.combo && (state.decoration?.refPhotos || []).length) lines.push('_+ decoração da foto de referência (valor após análise)_');
      lines.push('');
      lines.push('Pode me confirmar a disponibilidade e como faço o pagamento? 😊');

      // Remove possíveis linhas em branco duplicadas
      return lines.join('\n').replace(/\n{3,}/g, '\n\n');
    };

    // Se o cliente escolheu um combo e não escolheu balões, marca sozinho o
    // modelo de R$ 0 (balões clássicos, já inclusos no valor do combo).
    const autoPickBalloon = () => {
      const d = state.decoration;
      if (!d || d.enabled !== true || !d.combo || d.balloon) return;
      // Só nos planos que já incluem decoração (Premium/Pro Max). No Básico/Essencial segue sem balões.
      if (!window.SIM_PRICING.packages[state.package]?.includesDecoration) return;
      const def = (window.BALLOONS_DATA || []).find(b => b.isDefault && !window.SIM.isToy(b) && window.SIM.availableFor(b, state.package));
      if (!def) return;
      d.balloon = def.id;
      d.balloonAuto = true;
      window.SIM.save(state);
      renderBalloons();
      renderDecorationSummary();
      renderBudget();
    };

    const sendToWhatsapp = () => {
      autoPickBalloon();
      // Validação
      if (!state.customer?.name || state.customer.name.trim().length < 3) {
        showValidationError('Volte para a Etapa 7 e informe seu nome.');
        return;
      }
      const digits = (state.customer?.whatsapp || '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        showValidationError('Volte para a Etapa 7 e informe um WhatsApp válido.');
        return;
      }
      if (!state.date) {
        showValidationError('Volte para a Etapa 1 e escolha a data do evento.');
        return;
      }
      if (!state.package) {
        showValidationError('Volte para a Etapa 2 e escolha um pacote.');
        return;
      }

      const msg = buildWhatsappMessage();
      const url = window.waLink(msg);
      const { total } = window.SIM.calculate(state);

      // Salva pedido no histórico (Admin)
      if (window.DataStore?.saveOrder) {
        window.DataStore.saveOrder({
          customerName: state.customer.name,
          customerWhatsapp: state.customer.whatsapp,
          eventDate: state.date,
          packageId: state.package,
          guests: state.guests,
          total: total,
          message: msg,
          state: JSON.parse(JSON.stringify(state))
        });
      }

      if (summarySuccess) {
        summarySuccess.classList.add('show');
        if (summaryRoot) summaryRoot.style.display = 'none';
      }

      window.open(url, '_blank', 'noopener');
    };

    // ===== NAVEGAÇÃO =====
    btnPrev?.addEventListener('click', () => showStep(state.currentStep - 1));
    btnNext?.addEventListener('click', () => {
      // Última etapa: dispara envio direto
      if (state.currentStep === state.totalSteps) {
        sendToWhatsapp();
        return;
      }
      // Validação extra para Etapa 7 (formulário)
      if (state.currentStep === 7) {
        if (!validateStep7Inputs()) {
          showValidationError('Preencha seu nome (mín. 3 letras) e um WhatsApp válido.');
          return;
        }
      }
      if (!canAdvance()) {
        const msgs = {
          1: 'Selecione a data do evento.',
          2: 'Selecione um pacote para continuar.',
          3: state.decoration?.enabled !== true
              ? 'Indique se deseja decoração.'
              : !state.decoration?.type
                ? 'Escolha como quer a decoração: Pegue e Monte ou Decoração Montada.'
                : !state.decoration?.combo
                  ? 'Escolha um combo de decoração ou envie uma foto de referência.'
                  : 'Escolha o tema do seu evento (ou "Outro tema").',
          4: 'Informe o número de convidados.',
          5: 'Escolha se deseja usar gás.',
          7: 'Preencha seu nome (mín. 3 letras) e um WhatsApp válido.'
        };
        showValidationError(msgs[state.currentStep] || 'Complete a etapa para avançar.');
        return;
      }
      if (state.currentStep === 3) autoPickBalloon();
      showStep(state.currentStep + 1);
    });

    // ===== MOBILE: TOGGLE BUDGET =====
    if (budgetHeader && budgetPanel) {
      budgetHeader.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
          budgetPanel.classList.toggle('open');
        }
      });
    }

    // ===== BOTÃO RESETAR =====
    const btnReset = document.getElementById('btnReset');
    btnReset?.addEventListener('click', () => {
      if (confirm('Limpar todas as escolhas e recomeçar?')) {
        state = window.SIM.reset();
        renderAll();
      }
    });

    // ===== RENDER INICIAL =====
    const renderAll = () => {
      ensureServices();
      renderPackages();
      updateGuestUI();
      renderGas();
      renderDecorationYesNo();
      renderDecorationTypes();
      renderDecorationVisibility();
      if (state.decoration?.type) renderDecorationCombos();
      renderBalloons();
      renderDecorationAddons();
      renderDecorationSummary();
      renderServices();
      renderCalendar();
      renderSelectedDate();
      renderSummary();
      renderBudget(false);
      showStep(state.currentStep);
    };

    renderAll();
  });
})();
