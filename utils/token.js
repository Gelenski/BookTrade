const crypto = require('crypto');

function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

function calcularExpiracao(horas = 1) {
  const expira = new Date();
  expira.setHours(expira.getHours() + horas);
  return expira;
}

module.exports = { gerarToken, calcularExpiracao };
