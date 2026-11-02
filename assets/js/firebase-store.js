/* ============================================
   CASA DE BIA — Firebase Adapter (v2)
   ============================================
   Liga o DataStore ao Firestore + Firebase Auth quando
   window.FIREBASE_ENABLED for true.

   Como funciona:
   1. Antes de qualquer página desenhar a tela, este arquivo busca os
      dados na nuvem (preços, pacotes, fotos, agenda e — se for o admin
      logado — pedidos e anotações) e guarda no cache local.
   2. As páginas só começam depois disso (DataStore.onReady), então
      ninguém trabalha com dados desatualizados.
   3. Toda alteração feita no painel vai para o cache local E para a nuvem.

   Coleções no Firestore (ver regras de segurança no console):
   - config/main      → dados do site (leitura pública, escrita do admin)
   - agenda/public    → só as DATAS ocupadas/bloqueadas, sem nomes (leitura pública)
   - orders/{id}      → pedidos (site cria; só o admin lê/edita/exclui)
   - notes/main       → anotações do painel (só admin)
   - notes/blocked    → motivos dos bloqueios de data (só admin)
   ============================================ */
(function () {
  if (!window.FIREBASE_ENABLED) return;
  const original = window.DataStore;
  if (!original) return;

  const FB_VERSION = '10.13.2';
  const CONFIG_DOC = 'config/main';
  const AGENDA_DOC = 'agenda/public';
  const NOTES_DOC = 'notes/main';
  const BLOCKED_DOC = 'notes/blocked';
  const ORDERS_COL = 'orders';
  const SESSION_KEY = 'casadebia_admin_session';
  const LOAD_TIMEOUT_MS = 8000;

  // Status que fazem a data aparecer como OCUPADA no calendário do site.
  // "Pendente" (só orçamento) e "Cancelado" não ocupam a data.
  const OCCUPYING_STATUSES = ['aguardando', 'parcial', 'pago', 'concluido'];

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const warn = (msg, e) => console.warn('[Firebase] ' + msg, e || '');

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  // ===== Conexão =====
  const connect = (async () => {
    await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`);
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    const db = firebase.firestore();
    const auth = firebase.auth();
    // Espera o Firebase dizer se há alguém logado (restaura a sessão salva)
    const user = await new Promise((resolve) => {
      const off = auth.onAuthStateChanged((u) => { off(); resolve(u); });
    });
    return { db, auth, user };
  })();

  let currentUser = null;
  let agendaCache = { occupied: [], blocked: [] };

  // ===== Leitura inicial (antes das páginas desenharem) =====
  const loadAll = async () => {
    const { db, user } = await connect;
    currentUser = user;

    // 1) Dados do site
    try {
      const snap = await db.doc(CONFIG_DOC).get();
      if (snap.exists) {
        const remote = snap.data();
        const local = original.loadData();
        const merged = Object.assign({}, original.DEFAULTS, remote, {
          config: Object.assign({}, original.DEFAULTS.config, remote.config || {}),
          auth: local.auth
        });
        localSave(merged);
      } else if (currentUser) {
        // Primeira vez: o admin publica os dados atuais para a nuvem
        const seed = clone(original.loadData());
        delete seed.auth;
        await db.doc(CONFIG_DOC).set(seed);
      }
    } catch (e) { warn('Falha ao carregar dados do site — usando cache local', e); }

    // 2) Agenda pública (datas)
    try {
      const snap = await db.doc(AGENDA_DOC).get();
      if (snap.exists) {
        const a = snap.data();
        agendaCache = { occupied: a.occupied || [], blocked: a.blocked || [] };
      }
    } catch (e) { warn('Falha ao carregar agenda', e); }

    // 3) Só para o admin logado: pedidos, anotações e bloqueios
    if (currentUser) {
      try {
        const snap = await db.collection(ORDERS_COL).orderBy('createdAt', 'desc').limit(500).get();
        const orders = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        try { localStorage.setItem(original.ORDERS_KEY, JSON.stringify(orders)); } catch {}
      } catch (e) { warn('Falha ao carregar pedidos', e); }

      try {
        const snap = await db.doc(NOTES_DOC).get();
        try { localStorage.setItem(original.NOTES_KEY, JSON.stringify(snap.exists ? (snap.data().list || []) : [])); } catch {}
      } catch (e) { warn('Falha ao carregar anotações', e); }

      try {
        const snap = await db.doc(BLOCKED_DOC).get();
        try { localStorage.setItem(original.BLOCKED_DATES_KEY, JSON.stringify(snap.exists ? (snap.data().list || []) : [])); } catch {}
      } catch (e) { warn('Falha ao carregar bloqueios', e); }

      // Garante que a agenda pública reflete os pedidos atuais
      publishAgenda();
    }

    original.applyToSimulator(original.loadData());
  };

  // Funções locais originais (antes de sobrescrever)
  const localSave = original.saveData.bind(original);
  const localSaveOrder = original.saveOrder.bind(original);
  const localUpdateOrder = original.updateOrder.bind(original);
  const localDeleteOrder = original.deleteOrder.bind(original);
  const localClearOrders = original.clearOrders.bind(original);
  const localAddBlocked = original.addBlockedDate.bind(original);
  const localRemoveBlocked = original.removeBlockedDate.bind(original);
  const localSaveNote = original.saveNote.bind(original);
  const localUpdateNote = original.updateNote.bind(original);
  const localDeleteNote = original.deleteNote.bind(original);

  // As páginas esperam por isto (com limite de tempo para nunca travar o site)
  original.readyPromise = Promise.race([
    loadAll().catch(e => warn('Falha ao inicializar', e)),
    new Promise(r => setTimeout(r, LOAD_TIMEOUT_MS))
  ]);

  // Mostra um aviso no painel se a nuvem recusar algo
  const reportError = (what, e) => {
    warn(what, e);
    document.dispatchEvent(new CustomEvent('firebase:error', { detail: { what, message: e?.message } }));
  };

  // ===== Agenda pública (só datas — nunca nomes ou telefones) =====
  const publishAgenda = () => {
    if (!currentUser) return;
    const orders = original.loadOrders();
    const occupied = [...new Set(orders
      .filter(o => o.eventDate && OCCUPYING_STATUSES.includes(o.status))
      .map(o => o.eventDate))].sort();
    const blocked = [...new Set(original.loadBlockedDates().map(b => b.date))].sort();
    agendaCache = { occupied, blocked };
    connect.then(({ db }) => db.doc(AGENDA_DOC).set({ occupied, blocked, updatedAt: new Date().toISOString() }))
      .catch(e => reportError('Falha ao atualizar a agenda do site', e));
  };

  // ===== Dados do site =====
  original.saveData = (data) => {
    const ok = localSave(data);
    if (!currentUser) return ok;
    const toSave = clone(data);
    delete toSave.auth;
    connect.then(({ db }) => db.doc(CONFIG_DOC).set(toSave))
      .catch(e => reportError('Falha ao salvar alterações na nuvem', e));
    return ok;
  };

  // ===== Pedidos =====
  original.saveOrder = (order) => {
    const saved = localSaveOrder(order);
    if (saved) {
      const doc = clone(Object.assign({ status: 'pendente', valorPago: 0 }, saved));
      connect.then(({ db }) => db.collection(ORDERS_COL).doc(saved.id).set(doc))
        .catch(e => warn('Falha ao enviar pedido para a nuvem', e));
    }
    return saved;
  };

  original.updateOrder = (id, patch) => {
    const ok = localUpdateOrder(id, patch);
    if (ok && currentUser) {
      connect.then(({ db }) => db.collection(ORDERS_COL).doc(id).update(clone(patch || {})))
        .then(publishAgenda)
        .catch(e => reportError('Falha ao atualizar pedido na nuvem', e));
    }
    return ok;
  };

  original.deleteOrder = (id) => {
    const ok = localDeleteOrder(id);
    if (ok && currentUser) {
      connect.then(({ db }) => db.collection(ORDERS_COL).doc(id).delete())
        .then(publishAgenda)
        .catch(e => reportError('Falha ao excluir pedido na nuvem', e));
    }
    return ok;
  };

  original.clearOrders = () => {
    localClearOrders();
    if (!currentUser) return;
    connect.then(async ({ db }) => {
      const snap = await db.collection(ORDERS_COL).get();
      const batch = db.batch();
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }).then(publishAgenda)
      .catch(e => reportError('Falha ao limpar pedidos na nuvem', e));
  };

  // ===== Bloqueios de data =====
  const saveBlockedRemote = () => {
    if (!currentUser) return;
    const list = original.loadBlockedDates();
    connect.then(({ db }) => db.doc(BLOCKED_DOC).set({ list }))
      .then(publishAgenda)
      .catch(e => reportError('Falha ao salvar bloqueio de data', e));
  };
  original.addBlockedDate = (date, reason) => {
    const ok = localAddBlocked(date, reason);
    if (ok) saveBlockedRemote();
    return ok;
  };
  original.removeBlockedDate = (date) => {
    const ok = localRemoveBlocked(date);
    if (ok) saveBlockedRemote();
    return ok;
  };

  // Calendário: o visitante vê a agenda pública; o admin vê tudo
  const localAvailability = original.getDateAvailability.bind(original);
  original.getDateAvailability = () => {
    if (currentUser) return localAvailability();
    const map = {};
    agendaCache.occupied.forEach(d => { map[d] = { status: 'occupied', info: 'Data reservada' }; });
    agendaCache.blocked.forEach(d => { if (!map[d]) map[d] = { status: 'blocked', info: 'Indisponível' }; });
    return map;
  };

  // ===== Anotações =====
  const saveNotesRemote = () => {
    if (!currentUser) return;
    const list = original.loadNotes();
    connect.then(({ db }) => db.doc(NOTES_DOC).set({ list }))
      .catch(e => reportError('Falha ao salvar anotações', e));
  };
  original.saveNote = (note) => { const r = localSaveNote(note); if (r) saveNotesRemote(); return r; };
  original.updateNote = (id, patch) => { const r = localUpdateNote(id, patch); if (r) saveNotesRemote(); return r; };
  original.deleteNote = (id) => { const r = localDeleteNote(id); if (r) saveNotesRemote(); return r; };

  // ===== Login (Firebase Auth) =====
  original.isLoggedIn = () => !!currentUser;
  original.currentUserEmail = () => currentUser?.email || '';

  original.loginWithEmail = async (email, password) => {
    const { auth } = await connect;
    try {
      const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
      currentUser = cred.user;
      try { sessionStorage.setItem(SESSION_KEY, 'authenticated'); } catch {}
      return true;
    } catch (e) {
      warn('Login falhou:', e.code || e.message);
      return false;
    }
  };
  original.login = (emailOrPassword, password) =>
    password ? original.loginWithEmail(emailOrPassword, password) : Promise.resolve(false);

  original.logout = async () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    // Limpa do navegador os dados privados do admin
    try {
      localStorage.removeItem(original.ORDERS_KEY);
      localStorage.removeItem(original.NOTES_KEY);
      localStorage.removeItem(original.BLOCKED_DATES_KEY);
    } catch {}
    try { const { auth } = await connect; await auth.signOut(); } catch {}
    currentUser = null;
  };

  original.changeAdminPassword = async (currentPassword, newPassword) => {
    const { auth } = await connect;
    const user = auth.currentUser;
    if (!user) return { ok: false, message: 'Você não está logado.' };
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPassword);
      return { ok: true };
    } catch (e) {
      const wrong = /wrong-password|invalid-credential|invalid-login/.test(e.code || '');
      return { ok: false, message: wrong ? 'Senha atual incorreta' : 'Não foi possível alterar a senha' };
    }
  };

  original.firebase = true;
})();
