/* ============================================
   CASA DE BIA — Configurações globais
   ============================================ */
window.CASA_CONFIG = {
  whatsapp: {
    number: '5571999652027',
    defaultMessage: 'Olá! Tenho interesse em fazer um evento na Casa de Bia.'
  },
  brand: {
    name: 'Casa de Bia',
    tagline: 'Espaço de Eventos',
    address: 'R. Dr. Vicente Curvelo de Mendonça, 61 — São Caetano, Salvador - BA, CEP 40390-455',
    mapsUrl: 'https://maps.app.goo.gl/r8fcGJQdiLpmvS517'
  }
};

window.waLink = function(message) {
  const cfg = window.CASA_CONFIG.whatsapp;
  const text = encodeURIComponent(message || cfg.defaultMessage);
  return `https://wa.me/${cfg.number}?text=${text}`;
};
