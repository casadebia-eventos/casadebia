/* ============================================
   CASA DE BIA — Simulador: Estado, Preços e Cálculos
   ============================================ */
(function () {
  // ===== CONFIGURAÇÃO DE PREÇOS =====
  // Se já foi definido pelo DataStore (admin), respeita; senão usa defaults.
  window.SIM_PRICING = window.SIM_PRICING || {
    packages: {
      basico:    { id: 'basico',    name: 'Básico',    price: 299.90, capacity: 20,  extraPerGuest: 15, includesGas: false, includesDecoration: false, includesPhotographer: false },
      essencial: { id: 'essencial', name: 'Essencial', price: 590,    capacity: 120, extraPerGuest: 10, includesGas: false, includesDecoration: false, includesPhotographer: false },
      premium:   { id: 'premium',   name: 'Premium',   price: 899,    capacity: 150, extraPerGuest: 10, includesGas: true,  includesDecoration: true,  includesPhotographer: false },
      promax:    { id: 'promax',    name: 'Pro Max',   price: 1590,   capacity: 200, extraPerGuest: 0,  includesGas: true,  includesDecoration: true,  includesPhotographer: true }
    },
    gas: 40
  };

  // ===== DADOS DE SERVIÇOS =====
  window.SERVICES_DATA = window.SERVICES_DATA || {
    animadora: {
      id: 'animadora',
      name: 'Animadora Infantil',
      icon: 'party-popper',
      desc: 'Recreação, pintura facial, balões e mais. Marque os serviços desejados.',
      mode: 'multi-checkbox',
      items: [
        { id: 'recreacao',     name: 'Recreação / Animação', price: 200, unit: 'pacote' },
        { id: 'pintura-facial', name: 'Pintura facial',       price: 150, unit: 'pacote' },
        { id: 'baloes',         name: 'Escultura com balões', price: 130, unit: 'pacote' },
        { id: 'oficinas',       name: 'Oficinas diversas',    price: 180, unit: 'pacote' },
        { id: 'locucao',        name: 'Locução',              price: 120, unit: 'pacote' }
      ]
    },
    recepcionista: {
      id: 'recepcionista',
      name: 'Recepcionista',
      icon: 'user-check',
      desc: 'Atendimento aos convidados na entrada e durante o evento.',
      mode: 'hours',
      hourlyRate: 45
    },
    fritadeira: {
      id: 'fritadeira',
      name: 'Fritadeira',
      icon: 'utensils-crossed',
      desc: 'Profissional fritando salgados na hora durante o evento.',
      mode: 'hours',
      hourlyRate: 55
    },
    seguranca: {
      id: 'seguranca',
      name: 'Segurança',
      icon: 'shield',
      desc: 'Equipe de segurança com opções de controle de acesso.',
      mode: 'qty-hours-control',
      hourlyRate: 70,
      controlOptions: [
        { id: 'nenhum',     name: 'Sem controle', price: 0  },
        { id: 'lista',      name: 'Por lista de nomes',  price: 80 },
        { id: 'pulseiras',  name: 'Por pulseiras',       price: 120 }
      ]
    },
    garcom: {
      id: 'garcom',
      name: 'Garçom',
      icon: 'hand-platter',
      desc: 'Atendimento de bebidas e mesa durante o evento.',
      mode: 'qty-hours',
      hourlyRate: 50
    },
    dj: {
      id: 'dj',
      name: 'DJ',
      icon: 'disc-3',
      desc: 'Som profissional com diferentes estilos.',
      mode: 'type-hours',
      hourlyRate: 80,
      types: [
        { id: 'basico',  name: 'Som básico',          extraPerHour: 0 },
        { id: 'completo', name: 'Som + iluminação',    extraPerHour: 30 },
        { id: 'premium', name: 'Premium (som + luz + mesa)', extraPerHour: 60 }
      ]
    },
    fotografo: {
      id: 'fotografo',
      name: 'Fotógrafo',
      icon: 'camera',
      desc: 'Registre cada momento do seu evento.',
      mode: 'package',
      packages: [
        { id: 'so-fotos',     name: 'Só fotos',                desc: 'Fotos profissionais editadas',         price: 450 },
        { id: 'fotos-stories', name: 'Fotos + stories',         desc: 'Fotos + stories instantâneos',         price: 650 },
        { id: 'completa',     name: 'Cobertura completa',      desc: 'Fotos, stories e vídeo highlights',    price: 980 }
      ]
    },
    storymaker: {
      id: 'storymaker',
      name: 'Story Maker',
      icon: 'video',
      desc: 'Profissional dedicado às redes sociais durante o evento.',
      mode: 'package',
      packages: [
        { id: 'sm-2h', name: '2 horas', desc: 'Cobertura curta para redes', price: 200 },
        { id: 'sm-4h', name: '4 horas', desc: 'Cobertura padrão',           price: 380 },
        { id: 'sm-completo', name: 'Evento completo', desc: 'Acompanhamento total do evento', price: 580 }
      ]
    }
  };

  // ===== DADOS DE DECORAÇÃO =====
  window.DECORATION_DATA = window.DECORATION_DATA || {
    combos: [
      // PEGUE E MONTE
      {
        id: 'pm-classic',
        type: 'pegue-monte',
        name: 'Combo Clássico',
        description: 'Painel decorativo, balões coloridos e itens essenciais para você montar como preferir.',
        items: ['1 painel decorativo 2x2m', '50 balões coloridos', '1 toalha de mesa temática', 'Itens descartáveis para 20 pessoas'],
        price: 180,
        image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'pm-premium',
        type: 'pegue-monte',
        name: 'Combo Premium',
        description: 'Estrutura mais completa para festas elaboradas, com painel duplo e arco de balões.',
        items: ['Painel duplo decorativo', 'Arco de balões 3m', 'Mesa principal decorada', 'Itens para 50 pessoas'],
        price: 320,
        image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'pm-tematico',
        type: 'pegue-monte',
        name: 'Combo Temático',
        description: 'Decoração temática personalizada (princesa, super-heróis, safari e outros temas).',
        items: ['Painel temático personalizado', 'Topo de bolo temático', 'Balões e itens do tema', 'Toalha e talheres temáticos'],
        price: 280,
        image: 'https://images.unsplash.com/photo-1464047736614-af63643285bf?auto=format&fit=crop&w=800&q=80'
      },

      // DECORAÇÃO COMPLETA
      {
        id: 'completa-essencial',
        type: 'completa',
        name: 'Decoração Essencial',
        description: 'Decoração completa com montagem, ambientação e finalização inclusas.',
        items: ['Painel + arco de balões', 'Mesa principal decorada', 'Mesa de doces ambientada', 'Montagem e desmontagem'],
        price: 650,
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'completa-luxo',
        type: 'completa',
        name: 'Decoração Luxo',
        description: 'Decoração sofisticada com floral natural, iluminação especial e atendimento dedicado.',
        items: ['Estrutura cenográfica completa', 'Arranjos florais naturais', 'Iluminação cênica', 'Mesas de doces e bolo profissionais', 'Equipe de montagem dedicada'],
        price: 1280,
        image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'completa-infantil',
        type: 'completa',
        name: 'Decoração Infantil Completa',
        description: 'Para festas infantis com todos os elementos pensados para encantar as crianças.',
        items: ['Painel temático grande', 'Arco de balões duplo', 'Mesa de doces ambientada', 'Cenários para fotos', 'Itens lúdicos espalhados'],
        price: 890,
        image: 'https://images.unsplash.com/photo-1543872084-c7bd3822856f?auto=format&fit=crop&w=800&q=80'
      }
    ],
    addons: [
      { id: 'led-letras',     name: 'Letreiro LED personalizado',  description: 'Nome ou mensagem em LED',           price: 120 },
      { id: 'globo-luz',      name: 'Globo de luz / Bola disco',   description: 'Iluminação especial para pista',    price: 90  },
      { id: 'baloes-extras',  name: 'Balões extras (100 unid.)',   description: 'Mais balões para incrementar',      price: 60  },
      { id: 'maquina-fumaca', name: 'Máquina de fumaça',           description: 'Efeito especial para fotos',        price: 110 },
      { id: 'arco-floral',    name: 'Arco floral natural',         description: 'Flores naturais para entrada',      price: 220 },
      { id: 'mesa-bolo',      name: 'Mesa de bolo decorada extra', description: 'Mesa adicional para bolo principal',price: 150 }
    ],
    promaxIncluded: {
      title: 'Decoração Pro Max — já montada e inclusa',
      items: [
        '2 Painéis (romano) + forro',
        '1 Trio de cilindros + capas (consultar cor disponível, podendo mesclar as cores)',
        '1 Vaso',
        '5 Bandejas',
        '1 Jarro',
        '1 Tapete',
        '1 LED de letra ou idade'
      ]
    }
  };

  const STORAGE_KEY = 'casadebia_simulator_v1';

  // ===== ESTADO INICIAL =====
  const initialState = () => ({
    currentStep: 1,
    totalSteps: 8,
    package: null,         // 'basico' | 'essencial' | 'premium'
    guests: 0,
    gas: null,             // true | false | null
    decoration: { enabled: null, type: null, combo: null, addons: [], balloon: null, theme: null },
    services: {},
    date: '',
    customer: { name: '', whatsapp: '' }
  });

  // ===== LOAD/SAVE LOCAL STORAGE =====
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialState();
      const parsed = JSON.parse(raw);
      return Object.assign(initialState(), parsed);
    } catch { return initialState(); }
  };
  const save = (state) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  };

  // ===== UTILITÁRIO ANTECIPADO =====
  // Formato BRL inteligente: omite centavos quando valor é inteiro, mostra quando há frações.
  const formatBRL = (n) => {
    const num = Number(n) || 0;
    const hasCents = Math.abs(num - Math.round(num)) > 0.001;
    return 'R$ ' + num.toLocaleString('pt-BR', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  // ===== PREÇO POR PLANO (combos e balões) =====
  // Cada combo/balão pode ter um preço diferente em cada plano (pricesByPackage).
  // Sem tabela → usa o preço geral. Com tabela e o plano em branco → não aparece nesse plano.
  // Regra dos COMBOS (decoration.pricing):
  //  - VALOR BASE (pricing.base) = custo da decoração mais simples (Prata);
  //  - cada combo tem uma DIFERENÇA sobre o base (combo.diff: Prata 0, Gold +150...);
  //  - planos sem decoração (Básico/Essencial) pagam base + diferença;
  //  - planos com o base embutido (pricing.baseIncluded, ex.: Premium) pagam só a diferença;
  //  - planos com regra própria (pricing.manual, ex.: Pro Max) usam o valor digitado
  //    no combo para aquele plano (em branco = não aparece).
  const comboPrice = (item, pkg, pricing) => {
    // Combo só aparece nos planos marcados (vazio = todos)
    if (Array.isArray(item.plans) && item.plans.length && !item.plans.includes(pkg)) return null;
    if ((pricing.manual || []).includes(pkg)) {
      const v = item.pricesByPackage ? item.pricesByPackage[pkg] : undefined;
      return (v === null || v === undefined || v === '') ? null : (Number(v) || 0);
    }
    const diff = Number(item.diff) || 0;
    if ((pricing.baseIncluded || []).includes(pkg)) return Math.max(0, diff);
    return Math.max(0, (Number(pricing.base) || 0) + diff);
  };

  const priceFor = (item, pkg) => {
    if (!item) return null;
    const DD = window.DECORATION_DATA || {};
    if (pkg && DD.pricing && (DD.combos || []).includes(item)) return comboPrice(item, pkg, DD.pricing);
    const t = item.pricesByPackage;
    if (!pkg || !t || typeof t !== 'object' || !Object.keys(t).length) return Number(item.price) || 0;
    const v = t[pkg];
    if (v === null || v === undefined || v === '') return null;
    return Number(v) || 0;
  };
  const availableFor = (item, pkg) => priceFor(item, pkg) !== null;

  // ===== CÁLCULO DO ORÇAMENTO =====
  const calculate = (state) => {
    const items = [];
    let total = 0;

    // Pacote
    if (state.package) {
      const pkg = window.SIM_PRICING.packages[state.package];
      if (pkg) {
        items.push({
          key: 'package',
          label: `Pacote ${pkg.name}`,
          sub: `Até ${pkg.capacity} pessoas`,
          value: pkg.price
        });
        total += pkg.price;

        // Excedente de convidados (Básico)
        if (state.guests > pkg.capacity && pkg.extraPerGuest > 0) {
          const extra = state.guests - pkg.capacity;
          const extraCost = extra * pkg.extraPerGuest;
          items.push({
            key: 'extra-guests',
            label: `Convidados extras (${extra})`,
            sub: `R$ ${pkg.extraPerGuest} × ${extra} pessoa${extra > 1 ? 's' : ''}`,
            value: extraCost
          });
          total += extraCost;
        }
      }
    }

    // Gás (apenas Básico/Essencial — Premium já inclui)
    if (state.gas === true && state.package && !window.SIM_PRICING.packages[state.package]?.includesGas) {
      items.push({
        key: 'gas',
        label: 'Uso de gás',
        sub: 'Adicional',
        value: window.SIM_PRICING.gas
      });
      total += window.SIM_PRICING.gas;
    }

    // ===== DECORAÇÃO =====
    if (state.decoration?.enabled === true) {
      // Combo
      if (state.decoration.combo) {
        const combo = window.DECORATION_DATA.combos.find(c => c.id === state.decoration.combo);
        if (combo) {
          const typeLabel = state.decoration.type === 'completa' ? 'Decoração Montada' : 'Pegue e Monte';
          items.push({
            key: 'deco-combo',
            label: `Decoração: ${combo.name}`,
            sub: typeLabel,
            value: priceFor(combo, state.package) || 0
          });
          total += priceFor(combo, state.package) || 0;
        }
      }

      // Balão personalizado
      if (state.decoration.balloon && window.BALLOONS_DATA) {
        const bal = window.BALLOONS_DATA.find(b => b.id === state.decoration.balloon);
        if (bal) {
          items.push({
            key: 'deco-balloon',
            label: `Balões: ${bal.name}`,
            sub: 'Personalizado',
            value: priceFor(bal, state.package) || 0
          });
          total += priceFor(bal, state.package) || 0;
        }
      }

      // Adicionais
      (state.decoration.addons || []).forEach(addonId => {
        const addon = window.DECORATION_DATA.addons.find(a => a.id === addonId);
        if (addon) {
          items.push({
            key: `deco-addon-${addon.id}`,
            label: addon.name,
            sub: 'Adicional de decoração',
            value: addon.price
          });
          total += addon.price;
        }
      });
    }

    // ===== SERVIÇOS =====
    const svc = state.services || {};
    const SD = window.SERVICES_DATA;

    // Animadora — multi-checkbox
    if (svc.animadora?.enabled && svc.animadora.items?.length) {
      svc.animadora.items.forEach(itemId => {
        const item = SD.animadora.items.find(i => i.id === itemId);
        if (item) {
          items.push({ key: `svc-anim-${itemId}`, label: `Animadora: ${item.name}`, sub: 'Pacote', value: item.price });
          total += item.price;
        }
      });
    }

    // Recepcionista — horas × taxa
    if (svc.recepcionista?.enabled && svc.recepcionista.hours > 0) {
      const cost = svc.recepcionista.hours * SD.recepcionista.hourlyRate;
      items.push({ key: 'svc-recep', label: 'Recepcionista', sub: `${svc.recepcionista.hours}h × ${formatBRL(SD.recepcionista.hourlyRate)}`, value: cost });
      total += cost;
    }

    // Fritadeira — horas × taxa
    if (svc.fritadeira?.enabled && svc.fritadeira.hours > 0) {
      const cost = svc.fritadeira.hours * SD.fritadeira.hourlyRate;
      items.push({ key: 'svc-frit', label: 'Fritadeira', sub: `${svc.fritadeira.hours}h × ${formatBRL(SD.fritadeira.hourlyRate)}`, value: cost });
      total += cost;
    }

    // Segurança — qtd × horas × taxa + controle
    if (svc.seguranca?.enabled && svc.seguranca.qtd > 0 && svc.seguranca.hours > 0) {
      const cost = svc.seguranca.qtd * svc.seguranca.hours * SD.seguranca.hourlyRate;
      items.push({
        key: 'svc-seg',
        label: `Segurança (${svc.seguranca.qtd} pessoa${svc.seguranca.qtd > 1 ? 's' : ''})`,
        sub: `${svc.seguranca.hours}h × ${formatBRL(SD.seguranca.hourlyRate)}`,
        value: cost
      });
      total += cost;

      const ctrl = SD.seguranca.controlOptions.find(c => c.id === svc.seguranca.controle);
      if (ctrl && ctrl.price > 0) {
        items.push({ key: 'svc-seg-ctrl', label: `Controle: ${ctrl.name}`, sub: 'Adicional', value: ctrl.price });
        total += ctrl.price;
      }
    }

    // Garçom — qtd × horas × taxa
    if (svc.garcom?.enabled && svc.garcom.qtd > 0 && svc.garcom.hours > 0) {
      const cost = svc.garcom.qtd * svc.garcom.hours * SD.garcom.hourlyRate;
      items.push({
        key: 'svc-garcom',
        label: `Garçom (${svc.garcom.qtd} pessoa${svc.garcom.qtd > 1 ? 's' : ''})`,
        sub: `${svc.garcom.hours}h × ${formatBRL(SD.garcom.hourlyRate)}`,
        value: cost
      });
      total += cost;
    }

    // DJ — tipo + horas
    if (svc.dj?.enabled && svc.dj.tipo && svc.dj.hours > 0) {
      const t = SD.dj.types.find(x => x.id === svc.dj.tipo);
      if (t) {
        const ratePerHour = SD.dj.hourlyRate + t.extraPerHour;
        const cost = ratePerHour * svc.dj.hours;
        items.push({
          key: 'svc-dj',
          label: `DJ: ${t.name}`,
          sub: `${svc.dj.hours}h × ${formatBRL(ratePerHour)}`,
          value: cost
        });
        total += cost;
      }
    }

    // Fotógrafo — pacote único
    if (svc.fotografo?.enabled && svc.fotografo.pacote) {
      const p = SD.fotografo.packages.find(x => x.id === svc.fotografo.pacote);
      if (p) {
        items.push({ key: 'svc-foto', label: `Fotógrafo: ${p.name}`, sub: 'Pacote', value: p.price });
        total += p.price;
      }
    }

    // Story Maker — pacote único
    if (svc.storymaker?.enabled && svc.storymaker.pacote) {
      const p = SD.storymaker.packages.find(x => x.id === svc.storymaker.pacote);
      if (p) {
        items.push({ key: 'svc-sm', label: `Story Maker: ${p.name}`, sub: 'Pacote', value: p.price });
        total += p.price;
      }
    }

    // Serviços criados no painel (genérico por modo)
    const KNOWN_SVC = ['animadora', 'recepcionista', 'fritadeira', 'seguranca', 'garcom', 'dj', 'fotografo', 'storymaker'];
    Object.keys(SD || {}).forEach(key => {
      if (KNOWN_SVC.includes(key)) return;
      const cfg = SD[key];
      const s = svc[key];
      if (!cfg || !s?.enabled) return;
      const rate = cfg.hourlyRate || 0;
      switch (cfg.mode) {
        case 'multi-checkbox':
          (s.items || []).forEach(itemId => {
            const it = (cfg.items || []).find(i => i.id === itemId);
            if (it) { items.push({ key: `svc-${key}-${itemId}`, label: `${cfg.name}: ${it.name}`, sub: 'Item', value: it.price }); total += it.price; }
          });
          break;
        case 'hours': {
          if ((s.hours || 0) > 0) { const c = s.hours * rate; items.push({ key: `svc-${key}`, label: cfg.name, sub: `${s.hours}h × ${formatBRL(rate)}`, value: c }); total += c; }
          break;
        }
        case 'qty-hours': {
          if ((s.qtd || 0) > 0 && (s.hours || 0) > 0) { const c = s.qtd * s.hours * rate; items.push({ key: `svc-${key}`, label: `${cfg.name} (${s.qtd}x)`, sub: `${s.hours}h × ${formatBRL(rate)}`, value: c }); total += c; }
          break;
        }
        case 'qty-hours-control': {
          if ((s.qtd || 0) > 0 && (s.hours || 0) > 0) {
            const c = s.qtd * s.hours * rate;
            items.push({ key: `svc-${key}`, label: `${cfg.name} (${s.qtd}x)`, sub: `${s.hours}h × ${formatBRL(rate)}`, value: c });
            total += c;
            const ctrl = (cfg.controlOptions || []).find(x => x.id === s.controle);
            if (ctrl && ctrl.price > 0) { items.push({ key: `svc-${key}-ctrl`, label: `Controle: ${ctrl.name}`, sub: 'Adicional', value: ctrl.price }); total += ctrl.price; }
          }
          break;
        }
        case 'type-hours': {
          const t = (cfg.types || []).find(x => x.id === s.tipo);
          if (t && (s.hours || 0) > 0) { const r = rate + (t.extraPerHour || 0); const c = r * s.hours; items.push({ key: `svc-${key}`, label: `${cfg.name}: ${t.name}`, sub: `${s.hours}h × ${formatBRL(r)}`, value: c }); total += c; }
          break;
        }
        case 'package': {
          const p = (cfg.packages || []).find(x => x.id === s.pacote);
          if (p) { items.push({ key: `svc-${key}`, label: `${cfg.name}: ${p.name}`, sub: 'Pacote', value: p.price }); total += p.price; }
          break;
        }
      }
    });

    return { items, total };
  };

  // ===== UTILITÁRIOS =====
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    return initialState();
  };

  // ===== EXPÕE API =====
  window.SIM = {
    initialState,
    load,
    save,
    calculate,
    priceFor,
    availableFor,
    formatBRL,
    reset,
    STORAGE_KEY
  };
})();
