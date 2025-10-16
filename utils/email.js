const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarEmail(destinatario, assunto, mensagemHTML) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: destinatario,
    subject: assunto,
    html: mensagemHTML
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📨 E-mail enviado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    return false;
  }
}

module.exports = enviarEmail;
