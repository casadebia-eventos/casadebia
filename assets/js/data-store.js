/* ============================================
   CASA DE BIA — Data Store
   Camada centralizada de dados que pode ser substituída
   por Firebase na Etapa 8b sem mudar o resto do código.
   ============================================ */
(function () {
  const STORAGE_KEY = 'casadebia_admin_data_v2';
  const ORDERS_KEY = 'casadebia_orders_v1';
  const BLOCKED_DATES_KEY = 'casadebia_blocked_dates_v1';
  const NOTES_KEY = 'casadebia_notes_v1';
  // Limpa versão antiga para evitar dados desatualizados durante o desenvolvimento
  try { localStorage.removeItem('casadebia_admin_data_v1'); } catch {}
  const SESSION_KEY = 'casadebia_admin_session';

  // ===== GALERIA DE MÍDIA — itens padrão (exibidos em fotos.html, editáveis no painel) =====
  const _u = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
  const _uf = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=85`;
  const _m = (category, id, alt, size = '') => ({
    id: 'm-' + id.slice(0, 10), category, type: 'image', size,
    src: _u(id, size === 'wide' ? 1200 : 800), full: _uf(id), alt
  });
  const MEDIA_DEFAULTS = [
    _m('aniversarios', '1530103862676-de8c9debad1d', 'Aniversário com decoração de balões', 'tall'),
    _m('aniversarios', '1464366400600-7168b8af9bc3', 'Mesa decorada para aniversário'),
    _m('aniversarios', '1527529482837-4698179dc6ce', 'Bolo de aniversário'),
    _m('aniversarios', '1492684223066-81342ee5ff30', 'Festa de aniversário'),
    _m('infantis', '1464047736614-af63643285bf', 'Festa infantil colorida', 'wide'),
    _m('infantis', '1543872084-c7bd3822856f', 'Decoração infantil com balões'),
    _m('infantis', '1558636508-e0db3814bd1d', 'Festa infantil com brinquedos'),
    _m('infantis', '1607344645866-009c320b63e0', 'Pintura facial em festa infantil'),
    _m('noturnos', '1492684223066-81342ee5ff30', 'Evento noturno com luzes', 'tall'),
    _m('noturnos', '1519671482749-fd09be7ccebf', 'Festa com DJ'),
    _m('noturnos', '1429962714451-bb934ecdc4ec', 'Pessoas dançando em festa'),
    _m('noturnos', '1414235077428-338989a2e8c0', 'Bar e drinks'),
    _m('churrascos', '1555939594-58d7cb561ad1', 'Churrasqueira com carnes'),
    _m('churrascos', '1529193591184-b1d58069ecdd', 'Carne na grelha'),
    _m('churrascos', '1544025162-d76694265947', 'Mesa de churrasco em família', 'wide'),
    _m('churrascos', '1532636721-a1bf9ada0d41', 'Família reunida em churrasco'),
    _m('estrutura', '1519167758481-83f550bb49b3', 'Vista geral do salão de eventos', 'wide'),
    _m('estrutura', '1505691938895-1758d7feb511', 'Área coberta do espaço'),
    _m('estrutura', '1556909114-f6e7ad7d3136', 'Cozinha gourmet do espaço', 'tall'),
    _m('estrutura', '1600585154340-be6161a56a0c', 'Área externa do espaço'),
    _m('estrutura', '1604014237800-1c9102c219da', 'Bar e área de bebidas'),
    _m('estrutura', '1582719508461-905c673771fd', 'Mesas e cadeiras do espaço')
  ];
  // Categorias da galeria (rótulos exibidos nos filtros)
  const MEDIA_CATEGORIES = [
    { id: 'aniversarios', label: 'Aniversários' },
    { id: 'infantis', label: 'Festas Infantis' },
    { id: 'noturnos', label: 'Eventos Noturnos' },
    { id: 'churrascos', label: 'Churrascos' },
    { id: 'estrutura', label: 'Estrutura do Espaço' }
  ];

  // ===== DEFAULTS — Estado inicial dos dados (única fonte de verdade) =====
  const DEFAULTS = {
    auth: {
      // ⚠️ Senha plana só na fase localStorage. Firebase Auth substitui na 8b.
      password: 'casadebia123'
    },
    config: {
      whatsappNumber: '5571999652027',
      gasPrice: 40,
      includedDecorationImage: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
      // Estrutura do espaço — exibida em servicos.html e editável no painel (doc 8)
      structureItems: [
        'Área aberta coberta e ventilada',
        'Banheiros amplos',
        'Bar montado',
        'Churrasqueira',
        'Choveirão',
        'Caixa térmica/tanque para bebidas',
        'Cozinha gourmet equipada',
        'Fogão industrial profissional',
        '2 freezers à disposição',
        'Estrutura completa para receber seus convidados',
        'Capacidade para até 200 pessoas',
        'Ponto de gás disponível'
      ]
    },
    profile: {
      name: 'Bia',
      photo: ''
    },
    media: MEDIA_DEFAULTS,
    packages: {
      basico:    { id: 'basico',    name: 'Básico',    price: 299.90, capacity: 20,  extraPerGuest: 15, includesGas: false, includesDecoration: false, includesPhotographer: false,
        includedItems: ['Área coberta + banheiro + bar', 'Churrasqueira e choveirão', 'Caixa térmica para bebidas', '+R$ 15 por excedente'] },
      essencial: { id: 'essencial', name: 'Essencial', price: 590,    capacity: 120, extraPerGuest: 10, includesGas: false, includesDecoration: false, includesPhotographer: false,
        includedItems: ['Tudo do Básico', 'Cozinha gourmet + fogão industrial', '2 freezers', 'Estrutura completa para receber seus convidados', '+R$ 10 por excedente'] },
      premium:   { id: 'premium',   name: 'Premium',   price: 899,    capacity: 150, extraPerGuest: 10, includesGas: true,  includesDecoration: true,  includesPhotographer: false,
        includedItems: ['Tudo do Essencial', 'Decoração kit painel (Pegue e Monte)', 'Pula-pula, piscina de bolinha e escorregador', 'Gás incluso', '+R$ 10 por excedente'] },
      promax:    { id: 'promax',    name: 'Pro Max',   price: 1590,   capacity: 200, extraPerGuest: 0,  includesGas: true,  includesDecoration: true,  includesPhotographer: true,
        includedItems: ['Tudo do Premium', 'Decoração completa', 'Arco de bolas (até 3 cores) + forro de mesa', 'Equipe de fotografia e filmagem (básico)', 'Lotação máxima — sem cobrança de excedente'] }
    },
    decoration: {
      combos: [
        { id: 'pm-classic',  type: 'pegue-monte', category: 'Clássico',  name: 'Combo Clássico', description: 'Painel decorativo, balões coloridos e itens essenciais para você montar como preferir.', items: ['1 painel decorativo 2x2m', '50 balões coloridos', '1 toalha de mesa temática', 'Itens descartáveis para 20 pessoas'], price: 180, images: ['https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80'] },
        { id: 'pm-premium',  type: 'pegue-monte', category: 'Premium',   name: 'Combo Premium',  description: 'Estrutura mais completa para festas elaboradas, com painel duplo e arco de balões.',         items: ['Painel duplo decorativo', 'Arco de balões 3m', 'Mesa principal decorada', 'Itens para 50 pessoas'],                  price: 320, images: ['https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80'] },
        { id: 'pm-tematico', type: 'pegue-monte', category: 'Temático',  name: 'Combo Temático', description: 'Decoração temática personalizada (princesa, super-heróis, safari e outros temas).',         items: ['Painel temático personalizado', 'Topo de bolo temático', 'Balões e itens do tema', 'Toalha e talheres temáticos'],   price: 280, images: ['https://images.unsplash.com/photo-1464047736614-af63643285bf?auto=format&fit=crop&w=1200&q=80'] },
        { id: 'completa-essencial', type: 'completa', category: 'Essencial', name: 'Decoração Essencial',         description: 'Decoração completa com montagem, ambientação e finalização inclusas.',                                  items: ['Painel + arco de balões', 'Mesa principal decorada', 'Mesa de doces ambientada', 'Montagem e desmontagem'],                                                       price: 650,  images: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'] },
        { id: 'completa-luxo',      type: 'completa', category: 'Luxo',      name: 'Decoração Luxo',              description: 'Decoração sofisticada com floral natural, iluminação especial e atendimento dedicado.',               items: ['Estrutura cenográfica completa', 'Arranjos florais naturais', 'Iluminação cênica', 'Mesas de doces e bolo profissionais', 'Equipe de montagem dedicada'],     price: 1280, images: ['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80'] },
        { id: 'completa-infantil',  type: 'completa', category: 'Infantil',  name: 'Decoração Infantil Completa', description: 'Para festas infantis com todos os elementos pensados para encantar as crianças.',                       items: ['Painel temático grande', 'Arco de balões duplo', 'Mesa de doces ambientada', 'Cenários para fotos', 'Itens lúdicos espalhados'],                                price: 890,  images: ['https://images.unsplash.com/photo-1543872084-c7bd3822856f?auto=format&fit=crop&w=1200&q=80'] }
      ],
      addons: [
        { id: 'led-letras',     name: 'Letreiro LED personalizado',  description: 'Nome ou mensagem em LED',           price: 120 },
        { id: 'globo-luz',      name: 'Globo de luz / Bola disco',   description: 'Iluminação especial para pista',    price: 90  },
        { id: 'baloes-extras',  name: 'Balões extras (100 unid.)',   description: 'Mais balões para incrementar',      price: 60  },
        { id: 'maquina-fumaca', name: 'Máquina de fumaça',           description: 'Efeito especial para fotos',        price: 110 },
        { id: 'arco-floral',    name: 'Arco floral natural',         description: 'Flores naturais para entrada',      price: 220 },
        { id: 'mesa-bolo',      name: 'Mesa de bolo decorada extra', description: 'Mesa adicional para bolo principal',price: 150 }
      ],
      // Decoração que JÁ vem montada em cada pacote com decoração inclusa
      // (Premium, Pro Max e, no futuro, Casamento). Editável no painel admin.
      // Cada pacote tem sua própria foto, título e lista de itens.
      included: {
        premium: { title: 'Decoração Premium — já montada e inclusa', items: [], image: '' },
        promax:  { title: 'Decoração Pro Max — já montada e inclusa', items: [
          '2 Painéis (romano) + forro',
          '1 Trio de cilindros + capas (consultar cor disponível, podendo mesclar as cores)',
          '1 Vaso',
          '5 Bandejas',
          '1 Jarro',
          '1 Tapete',
          '1 LED de letra ou idade'
        ], image: '' }
      },
      // Regra de preço dos combos: valor base + diferença de cada combo (combo.diff).
      // Premium já tem o base embutido (paga só a diferença). Pro Max: preço próprio.
      pricing: { base: 300, baseIncluded: ['premium'], manual: ['promax'] },
      // Temas do evento (cards com foto). packages = planos onde aparece (vazio = todos)
      themes: [],
      // (antigo) mantido só para compatibilidade com dados salvos antes
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
    },
    balloons: [
      {
        id: 'bal-classico',
        name: 'Arco Clássico',
        shortDesc: 'Arco de balões coloridos com cores à sua escolha (até 3 cores).',
        description: 'Um arco de balões clássico, perfeito para qualquer tipo de evento. Montado com balões de alta qualidade em até 3 cores escolhidas pelo cliente. Estrutura segura, presa com balões metálicos para dar destaque ao painel principal. Ideal para entradas, mesa do bolo ou área de fotos.',
        price: 220,
        images: [
          'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1543872084-c7bd3822856f?auto=format&fit=crop&w=1200&q=80'
        ]
      },
      {
        id: 'bal-organico',
        name: 'Arco Orgânico',
        shortDesc: 'Estilo moderno em formato orgânico — o queridinho das festas.',
        description: 'Modelo orgânico em formato natural e assimétrico, com mistura de balões de tamanhos variados. Acabamento sofisticado, com toques metálicos e folhagens. Cada arco é único e composto na hora, garantindo um visual exclusivo para o seu evento. Perfeito para decorações modernas e instagramáveis.',
        price: 380,
        images: [
          'https://images.unsplash.com/photo-1464047736614-af63643285bf?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80'
        ]
      },
      {
        id: 'bal-tematico',
        name: 'Painel + Arco Temático',
        shortDesc: 'Combinação completa: painel decorativo + arco de balões temático.',
        description: 'Pacote completo com painel decorativo de 2x2m + arco orgânico de balões, tudo no tema escolhido pelo cliente (princesa, super-heróis, safari, futebol, e outros). Inclui montagem e desmontagem no local, com tempo de duração mínimo garantido durante todo o evento. Ideal para festas infantis e celebrações temáticas.',
        price: 560,
        images: [
          'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80'
        ]
      }
    ],
    services: {
      animadora:     { id: 'animadora',     name: 'Animadora Infantil', icon: 'party-popper',     desc: 'Recreação, pintura facial, balões e mais. Marque os serviços desejados.', mode: 'multi-checkbox', items: [
        { id: 'recreacao',      name: 'Recreação / Animação', price: 200 },
        { id: 'pintura-facial', name: 'Pintura facial',       price: 150 },
        { id: 'baloes',         name: 'Escultura com balões', price: 130 },
        { id: 'oficinas',       name: 'Oficinas diversas',    price: 180 },
        { id: 'locucao',        name: 'Locução',              price: 120 }
      ]},
      recepcionista: { id: 'recepcionista', name: 'Recepcionista', icon: 'user-check',         desc: 'Atendimento aos convidados na entrada e durante o evento.', mode: 'hours',  hourlyRate: 45 },
      fritadeira:    { id: 'fritadeira',    name: 'Fritadeira',    icon: 'utensils-crossed',   desc: 'Profissional fritando salgados na hora durante o evento.',  mode: 'hours',  hourlyRate: 55 },
      seguranca:     { id: 'seguranca',     name: 'Segurança',     icon: 'shield',             desc: 'Equipe de segurança com opções de controle de acesso.',     mode: 'qty-hours-control', hourlyRate: 70, controlOptions: [
        { id: 'nenhum',     name: 'Sem controle',         price: 0 },
        { id: 'lista',      name: 'Por lista de nomes',   price: 80 },
        { id: 'pulseiras',  name: 'Por pulseiras',        price: 120 }
      ]},
      garcom:        { id: 'garcom',        name: 'Garçom',        icon: 'hand-platter',       desc: 'Atendimento de bebidas e mesa durante o evento.',           mode: 'qty-hours', hourlyRate: 50 },
      dj:            { id: 'dj',            name: 'DJ',            icon: 'disc-3',             desc: 'Som profissional com diferentes estilos.',                  mode: 'type-hours', hourlyRate: 80, types: [
        { id: 'basico',   name: 'Som básico',                 extraPerHour: 0 },
        { id: 'completo', name: 'Som + iluminação',           extraPerHour: 30 },
        { id: 'premium',  name: 'Premium (som + luz + mesa)', extraPerHour: 60 }
      ]},
      fotografo:     { id: 'fotografo',     name: 'Fotógrafo',     icon: 'camera',             desc: 'Registre cada momento do seu evento.',                       mode: 'package', packages: [
        { id: 'so-fotos',      name: 'Só fotos',           desc: 'Fotos profissionais editadas',         price: 450 },
        { id: 'fotos-stories', name: 'Fotos + stories',    desc: 'Fotos + stories instantâneos',         price: 650 },
        { id: 'completa',      name: 'Cobertura completa', desc: 'Fotos, stories e vídeo highlights',    price: 980 }
      ]},
      storymaker:    { id: 'storymaker',    name: 'Story Maker',   icon: 'video',              desc: 'Profissional dedicado às redes sociais durante o evento.', mode: 'package', packages: [
        { id: 'sm-2h',        name: '2 horas',         desc: 'Cobertura curta para redes', price: 200 },
        { id: 'sm-4h',        name: '4 horas',         desc: 'Cobertura padrão',           price: 380 },
        { id: 'sm-completo',  name: 'Evento completo', desc: 'Acompanhamento total',       price: 580 }
      ]}
    }
  };

  // ===== STATUS DOS EVENTOS (única fonte de verdade para cores/labels) =====
  const ORDER_STATUSES = [
    { id: 'pendente',   label: 'Pendente',        color: '#8A6E65' },
    { id: 'aguardando', label: 'Aguardando pgto', color: '#D4A942' },
    { id: 'parcial',    label: 'Pago parcial',    color: '#E08A2B' },
    { id: 'pago',       label: 'Pago 100%',       color: '#25D366' },
    { id: 'concluido',  label: 'Concluído',       color: '#128C7E' },
    { id: 'cancelado',  label: 'Cancelado',       color: '#A8334A' }
  ];

  // Deep clone simples (suficiente para JSON-safe data)
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  // Escapa texto para inserção segura em HTML
  const escapeHtml = (str) => String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // ===== LOAD / SAVE =====
  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULTS);
      const parsed = JSON.parse(raw);
      // Merge profundo: dados salvos têm prioridade, mas chaves novas dos defaults entram
      const merged = Object.assign(clone(DEFAULTS), parsed, {
        config: Object.assign({}, DEFAULTS.config, parsed.config || {}),
        profile: Object.assign({}, DEFAULTS.profile, parsed.profile || {}),
        auth: Object.assign({}, DEFAULTS.auth, parsed.auth || {}),
        // Pacotes: preserva edições, mas adiciona pacotes novos do default
        packages: Object.assign({}, DEFAULTS.packages, parsed.packages || {}),
        balloons: parsed.balloons || clone(DEFAULTS.balloons),
        media: parsed.media || clone(DEFAULTS.media),
        // Decoração: preserva combos/adicionais editados, mas garante chaves novas (ex: promaxIncluded)
        decoration: Object.assign({}, DEFAULTS.decoration, parsed.decoration || {})
      });
      // Para cada pacote existente, garante todas as chaves novas (ex: includesPhotographer)
      Object.keys(merged.packages).forEach(k => {
        if (DEFAULTS.packages[k]) {
          merged.packages[k] = Object.assign({}, DEFAULTS.packages[k], merged.packages[k]);
        }
      });
      // Garante a decoração inclusa do Pro Max mesmo em dados salvos antigos
      if (!merged.decoration.promaxIncluded) {
        merged.decoration.promaxIncluded = clone(DEFAULTS.decoration.promaxIncluded);
      }
      // Decoração inclusa por pacote: migra o formato antigo (só Pro Max + 1 foto para todos)
      if (!merged.decoration.included) {
        const inc = clone(DEFAULTS.decoration.included);
        const oldPm = merged.decoration.promaxIncluded;
        if (oldPm) inc.promax = Object.assign(inc.promax, { title: oldPm.title || inc.promax.title, items: oldPm.items || inc.promax.items });
        const oldImg = merged.config?.includedDecorationImage || '';
        if (oldImg && !/unsplash\.com/.test(oldImg)) inc.promax.image = oldImg;
        merged.decoration.included = inc;
      }
      // Todo pacote marcado "inclui decoração" ganha seu bloco próprio (ex.: Casamento no futuro)
      Object.keys(merged.packages).forEach(k => {
        if (merged.packages[k]?.includesDecoration && !merged.decoration.included[k]) {
          merged.decoration.included[k] = { title: `Decoração ${merged.packages[k].name || k} — já montada e inclusa`, items: [], image: '' };
        }
      });
      return merged;
    } catch { return clone(DEFAULTS); }
  };

  const saveData = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch { return false; }
  };

  const resetData = () => {
    localStorage.removeItem(STORAGE_KEY);
    return clone(DEFAULTS);
  };

  // ===== APLICA OS DADOS NAS GLOBAIS USADAS PELO SIMULADOR =====
  const applyToSimulator = (data) => {
    window.SIM_PRICING = {
      packages: data.packages,
      gas: data.config.gasPrice
    };
    window.DECORATION_DATA = data.decoration;
    window.BALLOONS_DATA = data.balloons || [];
    // Adapter: services com items precisam de unit/etc para compatibilidade
    window.SERVICES_DATA = data.services;
    if (window.CASA_CONFIG) {
      window.CASA_CONFIG.whatsapp.number = data.config.whatsappNumber;
    }
    syncDisplayPrices(data);
  };

  // Atualiza valores exibidos visualmente em qualquer página (home, simulador, etc.)
  const syncDisplayPrices = (data) => {
    const gas = data?.config?.gasPrice ?? 0;
    const fmt = (n) => {
      const num = Number(n) || 0;
      const hasCents = Math.abs(num - Math.round(num)) > 0.001;
      return 'R$ ' + num.toLocaleString('pt-BR', {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: 2
      });
    };
    const apply = () => {
      document.querySelectorAll('[data-gas-price]').forEach(el => el.textContent = fmt(gas));
      document.querySelectorAll('[data-gas-plus]').forEach(el => el.textContent = '+' + fmt(gas));
      document.querySelectorAll('[data-gas-plus-pretty]').forEach(el => el.textContent = '+ ' + fmt(gas));
      // (a foto da decoração inclusa agora é por pacote — definida no simulador)
      // Estrutura do espaço (servicos.html) — render a partir dos dados editáveis
      const structureEl = document.getElementById('structureList');
      const items = data?.config?.structureItems;
      if (structureEl && Array.isArray(items)) {
        structureEl.innerHTML = items.map(txt =>
          `<div class="structure-item"><i data-lucide="check-circle-2"></i>${escapeHtml(txt)}</div>`
        ).join('');
        if (window.lucide) window.lucide.createIcons();
      }
      // Galeria de mídia (fotos.html) — render a partir dos dados editáveis
      const galleryEl = document.getElementById('galleryGrid');
      const media = data?.media;
      if (galleryEl && Array.isArray(media)) {
        const catLabel = (c) => (MEDIA_CATEGORIES.find(x => x.id === c)?.label || c);
        galleryEl.innerHTML = media.map(it => {
          const size = it.size === 'wide' || it.size === 'tall' ? ' ' + it.size : '';
          const tag = catLabel(it.category);
          if (it.type === 'video') {
            return `<figure class="gallery-item${size}" data-category="${escapeHtml(it.category)}" data-type="video">
              <video src="${escapeHtml(it.src)}" controls preload="metadata" ${it.poster ? `poster="${escapeHtml(it.poster)}"` : ''}></video>
              <span class="gallery-tag">${escapeHtml(tag)}</span>
            </figure>`;
          }
          return `<figure class="gallery-item${size}" data-category="${escapeHtml(it.category)}" data-type="image">
            <img src="${escapeHtml(it.src)}" data-full="${escapeHtml(it.full || it.src)}" alt="${escapeHtml(it.alt || '')}" loading="lazy">
            <div class="gallery-zoom-icon"><i data-lucide="zoom-in"></i></div>
            <span class="gallery-tag">${escapeHtml(tag)}</span>
          </figure>`;
        }).join('');
        if (window.lucide) window.lucide.createIcons();
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
      apply();
    }
  };

  // ===== HISTÓRICO DE PEDIDOS =====
  const loadOrders = () => {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      // Garante campos de gestão (status/valorPago) em pedidos antigos
      return list.map(o => Object.assign({ status: 'pendente', valorPago: 0 }, o));
    } catch { return []; }
  };

  // Atualiza campos de um pedido (status, valorPago, etc.) preservando o resto
  const updateOrder = (id, patch) => {
    try {
      const orders = loadOrders();
      const idx = orders.findIndex(o => o.id === id);
      if (idx === -1) return false;
      orders[idx] = Object.assign({}, orders[idx], patch || {});
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      return true;
    } catch { return false; }
  };

  const saveOrder = (order) => {
    try {
      const orders = loadOrders();
      const newOrder = Object.assign({
        id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        createdAt: new Date().toISOString()
      }, order);
      orders.unshift(newOrder);
      // Limita a 200 pedidos para não estourar localStorage
      const trimmed = orders.slice(0, 200);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(trimmed));
      return newOrder;
    } catch { return null; }
  };

  const deleteOrder = (id) => {
    try {
      const orders = loadOrders().filter(o => o.id !== id);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      return true;
    } catch { return false; }
  };

  const clearOrders = () => {
    localStorage.removeItem(ORDERS_KEY);
  };

  // ===== BLOQUEIOS MANUAIS DE DATAS =====
  const loadBlockedDates = () => {
    try {
      const raw = localStorage.getItem(BLOCKED_DATES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const addBlockedDate = (date, reason = '') => {
    try {
      const list = loadBlockedDates();
      if (list.some(b => b.date === date)) return false;
      list.push({ date, reason, createdAt: new Date().toISOString() });
      list.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem(BLOCKED_DATES_KEY, JSON.stringify(list));
      return true;
    } catch { return false; }
  };

  const removeBlockedDate = (date) => {
    try {
      const list = loadBlockedDates().filter(b => b.date !== date);
      localStorage.setItem(BLOCKED_DATES_KEY, JSON.stringify(list));
      return true;
    } catch { return false; }
  };

  // Retorna mapa { 'YYYY-MM-DD': { status: 'occupied'|'blocked', info: string } }
  const getDateAvailability = () => {
    const map = {};
    loadOrders().forEach(o => {
      if (o.eventDate) {
        map[o.eventDate] = { status: 'occupied', info: o.customerName || 'Evento reservado' };
      }
    });
    loadBlockedDates().forEach(b => {
      if (!map[b.date]) map[b.date] = { status: 'blocked', info: b.reason || 'Indisponível' };
    });
    return map;
  };

  // ===== BLOCO DE NOTAS (anotações internas do admin) =====
  const loadNotes = () => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };
  const saveNote = (note) => {
    try {
      const notes = loadNotes();
      const newNote = Object.assign({
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: '', body: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, note);
      notes.unshift(newNote);
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      return newNote;
    } catch { return null; }
  };
  const updateNote = (id, patch) => {
    try {
      const notes = loadNotes();
      const idx = notes.findIndex(n => n.id === id);
      if (idx === -1) return false;
      notes[idx] = Object.assign({}, notes[idx], patch, { updatedAt: new Date().toISOString() });
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      return true;
    } catch { return false; }
  };
  const deleteNote = (id) => {
    try {
      const notes = loadNotes().filter(n => n.id !== id);
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      return true;
    } catch { return false; }
  };

  // ===== AUTENTICAÇÃO (sessão local — Firebase Auth substitui na 8b) =====
  const isLoggedIn = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === 'authenticated'; }
    catch { return false; }
  };
  const login = (password) => {
    const data = loadData();
    if (password === data.auth.password) {
      try { sessionStorage.setItem(SESSION_KEY, 'authenticated'); } catch {}
      return true;
    }
    return false;
  };
  const logout = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };
  const changePassword = (newPassword) => {
    const data = loadData();
    data.auth.password = newPassword;
    return saveData(data);
  };

  // ===== EXPÕE A API =====
  window.DataStore = {
    DEFAULTS: clone(DEFAULTS),
    ORDER_STATUSES,
    MEDIA_CATEGORIES,
    loadData,
    saveData,
    resetData,
    applyToSimulator,
    loadOrders,
    saveOrder,
    updateOrder,
    deleteOrder,
    clearOrders,
    loadBlockedDates,
    addBlockedDate,
    removeBlockedDate,
    getDateAvailability,
    loadNotes,
    saveNote,
    updateNote,
    deleteNote,
    isLoggedIn,
    login,
    logout,
    changePassword,
    STORAGE_KEY,
    ORDERS_KEY,
    NOTES_KEY,
    BLOCKED_DATES_KEY,
    // Promessa resolvida quando os dados estão prontos (o Firebase substitui
    // por uma que espera a nuvem). Sem Firebase, fica pronta na hora.
    readyPromise: Promise.resolve(),
    // Roda fn quando a página E os dados estiverem prontos
    onReady(fn) {
      const domReady = document.readyState === 'loading'
        ? new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }))
        : Promise.resolve();
      Promise.all([domReady, window.DataStore.readyPromise]).then(() => fn());
    }
  };

  // Aplicação automática nas globais ao carregar
  applyToSimulator(loadData());
})();
