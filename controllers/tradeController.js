const db = require("../db/database");
const enviarEmail = require("../utils/email");
const { gerarToken, calcularExpiracao } = require("../utils/token");

// Mapeamento de status: TINYINT no banco -> String no código
const STATUS = {
  PENDENTE: 1,
  EM_NEGOCIACAO: 2,
  ACEITA: 3,
  RECUSADA: 4,
  CANCELADA: 5,
  CONCLUIDA: 6,
};

// Mapeamento reverso: TINYINT -> String para exibição
const STATUS_NAMES = {
  1: "pendente",
  2: "em_negociacao",
  3: "aceita",
  4: "recusada",
  5: "cancelada",
  6: "concluida",
};

// ==================== CRIAR SOLICITAÇÃO DE TROCA ====================
exports.criarSolicitacaoTroca = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const { id_livro_solicitado, mensagem } = req.body;
    const id_usuario_solicitante = req.session.usuario.id;

    // Validação
    if (!id_livro_solicitado || !mensagem) {
      return res.status(400).json({
        success: false,
        message: "Livro e mensagem são obrigatórios",
      });
    }

    // Verificar se o livro existe e está aprovado
    const [livro] = await db.query(
      `SELECT l.id_livro, l.id_usuario, l.titulo, u.nome, u.email 
       FROM livro l
       INNER JOIN usuario u ON l.id_usuario = u.id_usuario
       WHERE l.id_livro = ? AND l.aprovado = 1`,
      [id_livro_solicitado]
    );

    if (livro.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Livro não encontrado ou não disponível",
      });
    }

    // Verificar se não está tentando trocar com próprio livro
    if (livro[0].id_usuario === id_usuario_solicitante) {
      return res.status(400).json({
        success: false,
        message: "Você não pode solicitar troca do seu próprio livro",
      });
    }

    const id_usuario_ofertante = livro[0].id_usuario;
    const proprietario_nome = livro[0].nome;
    const proprietario_email = livro[0].email;
    const livro_titulo = livro[0].titulo;

    // Verificar se já existe solicitação pendente
    const [trocaExistente] = await db.query(
      `SELECT id_troca 
       FROM troca 
       WHERE id_livro_solicitado = ? 
       AND id_usuario_solicitante = ? 
       AND status IN (?, ?)`,
      [
        id_livro_solicitado,
        id_usuario_solicitante,
        STATUS.PENDENTE,
        STATUS.EM_NEGOCIACAO,
      ]
    );

    if (trocaExistente.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Você já possui uma solicitação pendente para este livro",
      });
    }

    // Buscar informações do solicitante
    const [solicitante] = await db.query(
      "SELECT nome, email FROM usuario WHERE id_usuario = ?",
      [id_usuario_solicitante]
    );

    const solicitante_nome = solicitante[0].nome;

    // Criar solicitação de troca
    const data_solicitacao = new Date();
    const [resultado] = await db.query(
      `INSERT INTO troca 
       (id_livro_solicitado, id_usuario_solicitante, id_usuario_ofertante, 
        mensagem, status, data_solicitacao) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_livro_solicitado,
        id_usuario_solicitante,
        id_usuario_ofertante,
        mensagem,
        STATUS.PENDENTE,
        data_solicitacao,
      ]
    );

    const id_troca = resultado.insertId;

    // Gerar tokens para aprovar e rejeitar
    const tokenAprovar = gerarToken();
    const tokenRejeitar = gerarToken();
    const expiracao = calcularExpiracao(72); // 72 horas = 3 dias

    // Salvar tokens no banco
    await db.query(
      `INSERT INTO Troca_token (token, tipo_acao, data_expiracao, id_troca) 
       VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
      [
        tokenAprovar,
        "aprovar",
        expiracao,
        id_troca,
        tokenRejeitar,
        "rejeitar",
        expiracao,
        id_troca,
      ]
    );

    // Criar links de aprovação/rejeição
    const baseUrl = "http://localhost:3000";
    const linkAprovar = `${baseUrl}/api/trade/responder?token=${tokenAprovar}`;
    const linkRejeitar = `${baseUrl}/api/trade/responder?token=${tokenRejeitar}`;

    // Enviar e-mail para o proprietário
    const assunto = `📚 Nova Solicitação de Troca - ${livro_titulo}`;
    const mensagemHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 6px; padding: 20px; }
    h1 { text-align: center; color: #4f46e5; }
    .book-info, .message-box, .warning { margin: 15px 0; padding: 15px; border-radius: 6px; }
    .book-info { border-left: 4px solid #4f46e5; background: #fafafa; }
    .message-box { background: #eef2ff; }
    .warning { background: #fff8e1; border-left: 4px solid #f59e0b; font-size: 14px; }
    .buttons { text-align: center; margin-top: 20px; }
    .btn { display: inline-block; padding: 10px 20px; margin: 5px; border-radius: 4px; text-decoration: none; color: #fff; font-weight: bold; }
    .btn-accept { background: #10b981; }
    .btn-reject { background: #ef4444; }
    .footer { text-align: center; color: #777; font-size: 13px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 BookTrade</h1>
    <p>Olá <strong>${proprietario_nome}</strong>,</p>
    <p>Você recebeu uma nova solicitação de troca para o seu livro:</p>

    <div class="book-info">
      <h2>📖 ${livro_titulo}</h2>
      <p><strong>Solicitante:</strong> ${solicitante_nome}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
    </div>

    <div class="message-box">
      <strong>Mensagem do solicitante:</strong>
      <p><em>"${mensagem}"</em></p>
    </div>

    <div class="buttons">
      <a href="${linkAprovar}" class="btn btn-accept">Aceitar</a>
      <a href="${linkRejeitar}" class="btn btn-reject">Recusar</a>
    </div>

    <div class="warning">
      <strong>Atenção:</strong> Esta solicitação expira em 72 horas.
    </div>

    <div class="footer">
      <p>Este é um e-mail automático do BookTrade.</p>
      <p>© ${new Date().getFullYear()} BookTrade</p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar e-mail
    const emailEnviado = await enviarEmail(
      proprietario_email,
      assunto,
      mensagemHTML
    );

    if (!emailEnviado) {
      console.error("Falha ao enviar e-mail de notificação de troca");
      // Não retornar erro, apenas logar
    }

    res.json({
      success: true,
      message:
        "Solicitação de troca enviada com sucesso! O proprietário receberá um e-mail com sua proposta.",
      trocaId: id_troca,
    });

    console.log(
      `Nova solicitação de troca: Usuário ${id_usuario_solicitante} → Livro ${id_livro_solicitado}`
    );
  } catch (err) {
    console.error("Erro ao criar solicitação de troca:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao enviar solicitação: " + err.message,
    });
  }
};

// ==================== RESPONDER TROCA VIA TOKEN ====================
exports.responderTrocaViaToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Token Inválido - BookTrade</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            h1 { color: #ef4444; margin: 0 0 10px 0; }
            p { color: #6b7280; line-height: 1.6; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Token Inválido</h1>
            <p>O link que você acessou não contém um token válido.</p>
            <a href="/" class="btn">Voltar ao Início</a>
          </div>
        </body>
        </html>
      `);
    }

    // Buscar informações do token
    const [tokenInfo] = await db.query(
      `SELECT tt.*, t.*, 
              us.nome AS solicitante_nome, us.email AS solicitante_email,
              uo.nome AS ofertante_nome, uo.email AS ofertante_email,
              l.titulo AS livro_titulo
       FROM Troca_token tt
       INNER JOIN Troca t ON tt.id_troca = t.id_troca
       INNER JOIN Usuario us ON t.id_usuario_solicitante = us.id_usuario
       INNER JOIN Usuario uo ON t.id_usuario_ofertante = uo.id_usuario
       INNER JOIN Livro l ON t.id_livro_solicitado = l.id_livro
       WHERE tt.token = ?`,
      [token]
    );

    if (tokenInfo.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Token Não Encontrado - BookTrade</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
            h1 { color: #ef4444; margin: 0 0 10px 0; }
            p { color: #6b7280; line-height: 1.6; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Token Não Encontrado</h1>
            <p>Este link não é válido ou já foi utilizado.</p>
            <a href="/" class="btn">Voltar ao Início</a>
          </div>
        </body>
        </html>
      `);
    }

    const info = tokenInfo[0];

    // Verificar se o token já foi usado
    if (info.usado === 1) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Token Já Utilizado - BookTrade</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
            h1 { color: #f59e0b; margin: 0 0 10px 0; }
            p { color: #6b7280; line-height: 1.6; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Token Já Utilizado</h1>
            <p>Esta solicitação já foi respondida anteriormente.</p>
            <a href="/" class="btn">Voltar ao Início</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verificar se o token expirou
    if (new Date(info.data_expiracao) < new Date()) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Token Expirado - BookTrade</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            h1 { color: #ef4444; margin: 0 0 10px 0; }
            p { color: #6b7280; line-height: 1.6; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⏰</div>
            <h1>Link Expirado</h1>
            <p>Este link expirou. Por favor, solicite uma nova troca.</p>
            <a href="/" class="btn">Voltar ao Início</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verificar se a troca ainda está pendente
    if (
      info.status !== STATUS.PENDENTE &&
      info.status !== STATUS.EM_NEGOCIACAO
    ) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Troca Já Respondida - BookTrade</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            h1 { color: #f59e0b; margin: 0 0 10px 0; }
            p { color: #6b7280; line-height: 1.6; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h1>Troca Já Respondida</h1>
            <p>Esta solicitação de troca já foi respondida anteriormente.</p>
            <a href="/" class="btn">Voltar ao Início</a>
          </div>
        </body>
        </html>
      `);
    }

    // Processar a resposta baseado no tipo de ação
    const novoStatus =
      info.tipo_acao === "aprovar" ? STATUS.ACEITA : STATUS.RECUSADA;

    // Atualizar status da troca
    await db.query(
      `UPDATE troca 
       SET status = ? 
       WHERE id_troca = ?`,
      [novoStatus, info.id_troca]
    );

    // Marcar token como usado
    await db.query(
      `UPDATE Troca_token 
       SET usado = 1 
       WHERE id_token = ?`,
      [info.id_token]
    );

    // Marcar todos os outros tokens desta troca como usados
    await db.query(
      `UPDATE Troca_token 
       SET usado = 1 
       WHERE id_troca = ? AND id_token != ?`,
      [info.id_troca, info.id_token]
    );

    // Enviar e-mail de confirmação para o solicitante
    const assuntoSolicitante =
      info.tipo_acao === "aprovar"
        ? `✅ Sua Solicitação de Troca foi Aceita!`
        : `❌ Sua Solicitação de Troca foi Recusada`;

    const mensagemSolicitante =
      info.tipo_acao === "aprovar"
        ? `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 6px; padding: 20px; }
    h1 { text-align: center; color: #059669; }
    .success-box, .next-steps, .info-box { margin: 15px 0; padding: 15px; border-radius: 6px; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; }
    .next-steps { background: #eef2ff; }
    .info-box { background: #fafafa; border-left: 4px solid #ccc; }
    ol, ul { margin: 0; padding-left: 20px; }
    .footer { text-align: center; color: #777; font-size: 13px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Sua Troca Foi Aceita</h1>
    <p>Olá <strong>${info.solicitante_nome}</strong>,</p>

    <div class="success-box">
      <p><strong>${info.ofertante_nome}</strong> aceitou sua solicitação para o livro <strong>"${info.livro_titulo}"</strong>!</p>
    </div>

    <div class="next-steps">
      <strong>Próximos passos:</strong>
      <ol>
        <li>Entre em contato com ${info.ofertante_nome} pelo e-mail <strong>${info.ofertante_email}</strong></li>
        <li>Combinem local, data e horário da troca</li>
        <li>Realizem a troca em local seguro</li>
      </ol>
    </div>

    <div class="info-box">
      <strong>Dicas rápidas:</strong>
      <ul>
        <li>Prefira locais públicos</li>
        <li>Verifique o estado do livro</li>
        <li>Seja pontual e cordial</li>
      </ul>
    </div>

    <div class="footer">
      <p>Boa troca e boa leitura!</p>
      <p>© ${new Date().getFullYear()} BookTrade</p>
    </div>
  </div>
</body>
</html>
`
        : `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 6px; padding: 20px; }
    h1 { text-align: center; color: #dc2626; }
    .info-box, .suggestion-box { margin: 15px 0; padding: 15px; border-radius: 6px; }
    .info-box { background: #fee2e2; border-left: 4px solid #ef4444; }
    .suggestion-box { background: #eef2ff; }
    ul { margin: 0; padding-left: 20px; }
    .btn { display: inline-block; padding: 10px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 4px; }
    .footer { text-align: center; color: #777; font-size: 13px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>❌ Solicitação Recusada</h1>
    <p>Olá <strong>${info.solicitante_nome}</strong>,</p>

    <div class="info-box">
      <p><strong>${info.ofertante_nome}</strong> não pôde aceitar sua solicitação para o livro <strong>"${info.livro_titulo}"</strong> neste momento.</p>
    </div>

    <div class="suggestion-box">
      <strong>Outras opções:</strong>
      <ul>
        <li>Explore mais livros disponíveis</li>
        <li>Tente uma nova proposta futuramente</li>
        <li>Cadastre mais livros para aumentar suas chances</li>
      </ul>
    </div>

    <p style="text-align: center; margin-top: 20px;">
      <a href="/" class="btn">Ver Outros Livros</a>
    </p>

    <div class="footer">
      <p>Não desanime! Há muitos livros esperando por você.</p>
      <p>© ${new Date().getFullYear()} BookTrade</p>
    </div>
  </div>
</body>
</html>
`;

    await enviarEmail(
      info.solicitante_email,
      assuntoSolicitante,
      mensagemSolicitante
    );

    // Página de confirmação
    const iconResult = info.tipo_acao === "aprovar" ? "✅" : "❌";
    const titleResult =
      info.tipo_acao === "aprovar" ? "Troca Aceita!" : "Troca Recusada";
    const colorResult = info.tipo_acao === "aprovar" ? "#10b981" : "#ef4444";
    const messageResult =
      info.tipo_acao === "aprovar"
        ? `Você aceitou a solicitação de troca de <strong>${info.solicitante_nome}</strong> para o livro <strong>"${info.livro_titulo}"</strong>. Um e-mail foi enviado para o solicitante com suas informações de contato.`
        : `Você recusou a solicitação de troca de <strong>${info.solicitante_nome}</strong> para o livro <strong>"${info.livro_titulo}"</strong>. O solicitante foi notificado.`;

    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleResult} - BookTrade</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      background: #f3f4f6; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      margin: 0; 
      padding: 20px; 
    }
    .container { 
      background: #fff; 
      padding: 30px; 
      border-radius: 8px; 
      text-align: center; 
      max-width: 480px; 
      width: 100%; 
    }
    .icon { font-size: 60px; margin-bottom: 10px; }
    h1 { color: ${colorResult}; margin: 10px 0; font-size: 24px; }
    p { color: #555; line-height: 1.6; font-size: 15px; margin: 10px 0; }
    .info-box { 
      background: #f9fafb; 
      padding: 15px; 
      border-radius: 6px; 
      margin: 20px 0; 
      border-left: 4px solid ${colorResult}; 
      text-align: left; 
    }
    .btn { 
      display: inline-block; 
      margin-top: 20px; 
      padding: 10px 20px; 
      background: #4f46e5; 
      color: #fff; 
      text-decoration: none; 
      border-radius: 4px; 
      font-weight: bold; 
      font-size: 15px; 
    }
    .footer { 
      margin-top: 25px; 
      padding-top: 15px; 
      border-top: 1px solid #e5e7eb; 
      color: #888; 
      font-size: 13px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${iconResult}</div>
    <h1>${titleResult}</h1>

    <div class="info-box">
      <p>${messageResult}</p>
    </div>

    <p style="color: #888; font-size: 13px;">
      Esta ação foi registrada e as partes notificadas por e-mail.
    </p>

    <a href="/" class="btn">Voltar ao Catálogo</a>

    <div class="footer">
      <p>© ${new Date().getFullYear()} BookTrade - Conectando leitores</p>
    </div>
  </div>
</body>
</html>

    `);

    console.log(
      `Troca ${info.id_troca} ${info.tipo_acao === "aprovar" ? "aceita" : "recusada"} via token`
    );
  } catch (err) {
    console.error("Erro ao responder troca via token:", err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erro - BookTrade</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
          .icon { font-size: 60px; margin-bottom: 20px; }
          h1 { color: #ef4444; margin: 0 0 10px 0; }
          p { color: #6b7280; line-height: 1.6; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Erro no Servidor</h1>
          <p>Ocorreu um erro ao processar sua resposta. Por favor, tente novamente mais tarde.</p>
          <a href="/" class="btn">Voltar ao Início</a>
        </div>
      </body>
      </html>
    `);
  }
};

// ==================== LISTAR TROCAS RECEBIDAS ====================
exports.listarTrocasRecebidas = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const id_usuario = req.session.usuario.id;

    const [trocas] = await db.query(
      `SELECT 
        t.id_troca,
        t.mensagem,
        t.status,
        t.data_solicitacao,
        t.data_conclusao,
        l.id_livro,
        l.titulo AS livro_titulo,
        u.id_usuario AS solicitante_id,
        u.nome AS solicitante_nome,
        u.email AS solicitante_email
      FROM troca t
      INNER JOIN livro l ON t.id_livro_solicitado = l.id_livro
      INNER JOIN usuario u ON t.id_usuario_solicitante = u.id_usuario
      WHERE t.id_usuario_ofertante = ?
      ORDER BY t.status, t.data_solicitacao DESC`,
      [id_usuario]
    );

    // Converter status numérico para string
    const trocasFormatadas = trocas.map((troca) => ({
      ...troca,
      status: STATUS_NAMES[troca.status] || "desconhecido",
    }));

    res.json({
      success: true,
      trocas: trocasFormatadas,
    });
  } catch (err) {
    console.error("Erro ao listar trocas recebidas:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar trocas",
    });
  }
};

// ==================== LISTAR TROCAS ENVIADAS ====================
exports.listarTrocasEnviadas = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const id_usuario = req.session.usuario.id;

    const [trocas] = await db.query(
      `SELECT 
        t.id_troca,
        t.mensagem,
        t.status,
        t.data_solicitacao,
        t.data_conclusao,
        l.id_livro,
        l.titulo AS livro_titulo,
        u.id_usuario AS proprietario_id,
        u.nome AS proprietario_nome,
        u.email AS proprietario_email
      FROM troca t
      INNER JOIN livro l ON t.id_livro_solicitado = l.id_livro
      INNER JOIN usuario u ON t.id_usuario_ofertante = u.id_usuario
      WHERE t.id_usuario_solicitante = ?
      ORDER BY t.status, t.data_solicitacao DESC`,
      [id_usuario]
    );

    // Converter status numérico para string
    const trocasFormatadas = trocas.map((troca) => ({
      ...troca,
      status: STATUS_NAMES[troca.status] || "desconhecido",
    }));

    res.json({
      success: true,
      trocas: trocasFormatadas,
    });
  } catch (err) {
    console.error("Erro ao listar trocas enviadas:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar trocas",
    });
  }
};

// ==================== CANCELAR TROCA ====================
exports.cancelarTroca = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const { id } = req.params;
    const id_usuario = req.session.usuario.id;

    // Verificar se a troca existe e se o usuário é o solicitante
    const [troca] = await db.query(
      `SELECT id_troca, id_usuario_solicitante, status 
       FROM troca 
       WHERE id_troca = ?`,
      [id]
    );

    if (troca.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Solicitação de troca não encontrada",
      });
    }

    if (troca[0].id_usuario_solicitante !== id_usuario) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para cancelar esta solicitação",
      });
    }

    if (
      troca[0].status !== STATUS.PENDENTE &&
      troca[0].status !== STATUS.EM_NEGOCIACAO
    ) {
      return res.status(400).json({
        success: false,
        message: "Não é possível cancelar esta solicitação",
      });
    }

    // Atualizar status para cancelada
    await db.query(
      `UPDATE troca 
       SET status = ? 
       WHERE id_troca = ?`,
      [STATUS.CANCELADA, id]
    );

    res.json({
      success: true,
      message: "Solicitação cancelada com sucesso",
    });

    console.log(`Troca ${id} cancelada pelo usuário ${id_usuario}`);
  } catch (err) {
    console.error("Erro ao cancelar troca:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao cancelar: " + err.message,
    });
  }
};

// ==================== CONCLUIR TROCA ====================
exports.concluirTroca = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const { id } = req.params;
    const id_usuario = req.session.usuario.id;

    // Verificar se a troca existe e se o usuário participa dela
    const [troca] = await db.query(
      `SELECT id_troca, id_usuario_ofertante, id_usuario_solicitante, status 
       FROM troca 
       WHERE id_troca = ?`,
      [id]
    );

    if (troca.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Troca não encontrada",
      });
    }

    const { id_usuario_ofertante, id_usuario_solicitante, status } = troca[0];

    if (
      id_usuario !== id_usuario_ofertante &&
      id_usuario !== id_usuario_solicitante
    ) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para concluir esta troca",
      });
    }

    if (status !== STATUS.ACEITA) {
      return res.status(400).json({
        success: false,
        message: "Apenas trocas aceitas podem ser concluídas",
      });
    }

    // Atualizar status para concluída e registrar data de conclusão
    const data_conclusao = new Date();
    await db.query(
      `UPDATE troca 
       SET status = ?, data_conclusao = ? 
       WHERE id_troca = ?`,
      [STATUS.CONCLUIDA, data_conclusao, id]
    );

    res.json({
      success: true,
      message: "Troca concluída com sucesso!",
    });

    console.log(`Troca ${id} concluída`);
  } catch (err) {
    console.error("Erro ao concluir troca:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao concluir: " + err.message,
    });
  }
};

// ==================== OBTER HISTÓRICO DE UMA TROCA ====================
exports.obterHistoricoTroca = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const { id } = req.params;
    const id_usuario = req.session.usuario.id;

    // Verificar se o usuário tem permissão para ver o histórico
    const [troca] = await db.query(
      `SELECT id_usuario_ofertante, id_usuario_solicitante 
       FROM troca 
       WHERE id_troca = ?`,
      [id]
    );

    if (troca.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Troca não encontrada",
      });
    }

    if (
      troca[0].id_usuario_ofertante !== id_usuario &&
      troca[0].id_usuario_solicitante !== id_usuario
    ) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para ver este histórico",
      });
    }

    // Buscar histórico
    const [historico] = await db.query(
      `SELECT 
        h.id_historico,
        h.data_evento,
        h.acao,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM Historico h
      INNER JOIN Usuario u ON h.id_usuario = u.id_usuario
      WHERE h.id_troca = ?
      ORDER BY h.data_evento DESC`,
      [id]
    );

    res.json({
      success: true,
      historico: historico,
    });
  } catch (err) {
    console.error("Erro ao obter histórico:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar histórico",
    });
  }
};
