const db = require("../db/database");

// Criar solicitação de troca
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
      `SELECT id_livro, id_usuario, titulo 
       FROM livro 
       WHERE id_livro = ? AND aprovado = 1`,
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

    const id_usuario_proprietario = livro[0].id_usuario;

    // Verificar se já existe solicitação pendente
    const [trocaExistente] = await db.query(
      `SELECT id_troca 
       FROM troca 
       WHERE id_livro_solicitado = ? 
       AND id_usuario_solicitante = ? 
       AND status IN ('pendente', 'em_negociacao')`,
      [id_livro_solicitado, id_usuario_solicitante]
    );

    if (trocaExistente.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Você já possui uma solicitação pendente para este livro",
      });
    }

    // Criar solicitação de troca
    const data_solicitacao = new Date();
    const [resultado] = await db.query(
      `INSERT INTO troca 
       (id_livro_solicitado, id_usuario_solicitante, id_usuario_proprietario, 
        mensagem, status, data_solicitacao) 
       VALUES (?, ?, ?, ?, 'pendente', ?)`,
      [
        id_livro_solicitado,
        id_usuario_solicitante,
        id_usuario_proprietario,
        mensagem,
        data_solicitacao,
      ]
    );

    res.json({
      success: true,
      message: "Solicitação de troca enviada com sucesso!",
      trocaId: resultado.insertId,
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

// Listar trocas recebidas (onde sou proprietário)
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
        t.data_resposta,
        l.id_livro,
        l.titulo AS livro_titulo,
        u.id_usuario AS solicitante_id,
        u.nome AS solicitante_nome,
        u.email AS solicitante_email
      FROM troca t
      INNER JOIN livro l ON t.id_livro_solicitado = l.id_livro
      INNER JOIN usuario u ON t.id_usuario_solicitante = u.id_usuario
      WHERE t.id_usuario_proprietario = ?
      ORDER BY 
        CASE t.status
          WHEN 'pendente' THEN 1
          WHEN 'em_negociacao' THEN 2
          WHEN 'aceita' THEN 3
          WHEN 'recusada' THEN 4
          WHEN 'cancelada' THEN 5
          WHEN 'concluida' THEN 6
        END,
        t.data_solicitacao DESC`,
      [id_usuario]
    );

    res.json({
      success: true,
      trocas: trocas,
    });
  } catch (err) {
    console.error("Erro ao listar trocas recebidas:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar trocas",
    });
  }
};

// Listar trocas enviadas (onde sou solicitante)
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
        t.data_resposta,
        l.id_livro,
        l.titulo AS livro_titulo,
        u.id_usuario AS proprietario_id,
        u.nome AS proprietario_nome,
        u.email AS proprietario_email
      FROM troca t
      INNER JOIN livro l ON t.id_livro_solicitado = l.id_livro
      INNER JOIN usuario u ON t.id_usuario_proprietario = u.id_usuario
      WHERE t.id_usuario_solicitante = ?
      ORDER BY 
        CASE t.status
          WHEN 'pendente' THEN 1
          WHEN 'em_negociacao' THEN 2
          WHEN 'aceita' THEN 3
          WHEN 'recusada' THEN 4
          WHEN 'cancelada' THEN 5
          WHEN 'concluida' THEN 6
        END,
        t.data_solicitacao DESC`,
      [id_usuario]
    );

    res.json({
      success: true,
      trocas: trocas,
    });
  } catch (err) {
    console.error("Erro ao listar trocas enviadas:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar trocas",
    });
  }
};

// Responder a uma solicitação de troca
exports.responderTroca = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const { id } = req.params;
    const { status } = req.body; // 'aceita', 'recusada', 'em_negociacao'
    const id_usuario = req.session.usuario.id;

    // Validação
    if (!["aceita", "recusada", "em_negociacao"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido",
      });
    }

    // Verificar se a troca existe e se o usuário é o proprietário
    const [troca] = await db.query(
      `SELECT id_troca, id_usuario_proprietario, status 
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

    if (troca[0].id_usuario_proprietario !== id_usuario) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para responder esta solicitação",
      });
    }

    if (troca[0].status !== "pendente" && troca[0].status !== "em_negociacao") {
      return res.status(400).json({
        success: false,
        message: "Esta solicitação já foi respondida",
      });
    }

    // Atualizar status da troca
    const data_resposta = new Date();
    await db.query(
      `UPDATE troca 
       SET status = ?, data_resposta = ? 
       WHERE id_troca = ?`,
      [status, data_resposta, id]
    );

    const mensagens = {
      aceita: "Troca aceita com sucesso!",
      recusada: "Troca recusada",
      em_negociacao: "Troca em negociação",
    };

    res.json({
      success: true,
      message: mensagens[status],
    });

    console.log(`Troca ${id} atualizada para status: ${status}`);
  } catch (err) {
    console.error("Erro ao responder troca:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao responder: " + err.message,
    });
  }
};

// Cancelar uma solicitação de troca (solicitante)
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

    if (!["pendente", "em_negociacao"].includes(troca[0].status)) {
      return res.status(400).json({
        success: false,
        message: "Não é possível cancelar esta solicitação",
      });
    }

    // Atualizar status para cancelada
    await db.query(
      `UPDATE troca 
       SET status = 'cancelada' 
       WHERE id_troca = ?`,
      [id]
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

// Concluir uma troca
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
      `SELECT id_troca, id_usuario_proprietario, id_usuario_solicitante, status 
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

    const { id_usuario_proprietario, id_usuario_solicitante, status } =
      troca[0];

    if (
      id_usuario !== id_usuario_proprietario &&
      id_usuario !== id_usuario_solicitante
    ) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para concluir esta troca",
      });
    }

    if (status !== "aceita") {
      return res.status(400).json({
        success: false,
        message: "Apenas trocas aceitas podem ser concluídas",
      });
    }

    // Atualizar status para concluída
    await db.query(
      `UPDATE troca 
       SET status = 'concluida' 
       WHERE id_troca = ?`,
      [id]
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
