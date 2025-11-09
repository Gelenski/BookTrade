const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db/database");
const dotenv = require("dotenv");
const session = require("express-session");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT;

// Configuração do body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// * Configuração da sessão
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // * 24 horas
    },
  })
);

// * Rotas
app.get("/", (req, res) => {
  res.redirect("/user");
});
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/trade", require("./routes/tradeRoutes"));

function verificarAutenticacao(req, res, next) {
  if (req.session && req.session.usuario) {
    req.usuario = req.session.usuario; // Define req.usuario
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Usuário não autenticado",
    redirect: "/login/",
  });
}

function verificarRevisor(req, res, next) {
  if (
    req.session &&
    req.session.usuario &&
    req.session.usuario.tipo === "revisor"
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Acesso negado. Apenas revisores.",
  });
}

// * Rota de listagem de livros (TODOS - pendentes, aprovados, reprovados)
app.get(
  "/api/livros-pendentes",
  verificarAutenticacao,
  verificarRevisor,
  async (req, res) => {
    try {
      const [results] = await db.query(
        `SELECT l.id_livro, l.titulo, l.descricao, l.ano_publicacao, l.isbn, 
                l.estado, l.data_postagem, l.aprovado, l.observacao_revisao,
                l.data_autorizacao,
                a.nome AS nome_autor, a.nacionalidade AS nacionalidade_autor, 
                g.nome AS nome_genero,
                u.id_usuario, u.nome AS nome_usuario, u.email AS email_usuario
         FROM Livro l 
           INNER JOIN Autor a ON l.id_autor = a.id_autor
           INNER JOIN Genero g ON l.id_genero = g.id_genero
           INNER JOIN Usuario u ON l.id_usuario = u.id_usuario
         ORDER BY l.data_postagem DESC`
      );
      res.json({ success: true, livros: results });
    } catch (err) {
      console.error("Erro ao listar livros:", err);
      res.status(500).json({
        success: false,
        message: "Erro no servidor",
      });
    }
  }
);

app.post(
  "/api/livros/:id/aprovar",
  verificarAutenticacao,
  verificarRevisor,
  async (req, res) => {
    const { id } = req.params;
    const id_revisor = req.session.usuario.id;

    try {
      const [livro] = await db.query("SELECT * FROM Livro WHERE id_livro = ?", [
        id,
      ]);

      if (livro.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Livro não encontrado",
        });
      }

      if (livro[0].aprovado !== null) {
        return res.status(400).json({
          success: false,
          message: "Este livro já foi revisado",
        });
      }

      await db.query(
        `UPDATE Livro 
         SET aprovado = 1, 
             id_revisor = ?, 
             data_autorizacao = NOW(),
             observacao_revisao = NULL
         WHERE id_livro = ?`,
        [id_revisor, id]
      );

      res.json({
        success: true,
        message: "Livro aprovado com sucesso",
      });
    } catch (err) {
      console.error("Erro ao aprovar livro:", err);
      res.status(500).json({
        success: false,
        message: "Erro no servidor",
      });
    }
  }
);

// * Rota para reprovar um livro
app.post(
  "/api/livros/:id/reprovar",
  verificarAutenticacao,
  verificarRevisor,
  async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;

    // ID do revisor vem da sessão (já validado pelo middleware verificarRevisor)
    const id_revisor = req.session.usuario.id;

    try {
      // Validação do motivo
      if (!motivo || motivo.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "O motivo da reprovação é obrigatório",
        });
      }

      // Verifica se o livro existe
      const [livro] = await db.query("SELECT * FROM Livro WHERE id_livro = ?", [
        id,
      ]);

      if (livro.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Livro não encontrado",
        });
      }

      // Verifica se o livro já foi revisado antes
      if (livro[0].aprovado !== null) {
        return res.status(400).json({
          success: false,
          message: "Este livro já foi revisado",
        });
      }

      // Atualiza o status do livro para reprovado
      await db.query(
        `UPDATE Livro 
         SET aprovado = 0, 
             id_revisor = ?, 
             data_autorizacao = NOW(),
             observacao_revisao = ?
         WHERE id_livro = ?`,
        [id_revisor, motivo, id]
      );

      res.json({
        success: true,
        message: "Livro reprovado com sucesso",
      });
    } catch (err) {
      console.error("Erro ao reprovar livro:", err);
      res.status(500).json({
        success: false,
        message: "Erro no servidor",
      });
    }
  }
);

// * Rota para obter estatísticas do painel
app.get(
  "/api/revisor/estatisticas",
  verificarAutenticacao,
  verificarRevisor,
  async (req, res) => {
    try {
      // Conta livros pendentes
      const [pendentes] = await db.query(
        "SELECT COUNT(*) as total FROM Livro WHERE aprovado IS NULL"
      );

      // Conta livros aprovados hoje
      const [aprovadosHoje] = await db.query(
        `SELECT COUNT(*) as total FROM Livro 
         WHERE aprovado = 1 AND DATE(data_autorizacao) = CURDATE()`
      );

      // Conta livros reprovados hoje
      const [reprovadosHoje] = await db.query(
        `SELECT COUNT(*) as total FROM Livro 
         WHERE aprovado = 0 AND DATE(data_autorizacao) = CURDATE()`
      );

      res.json({
        success: true,
        estatisticas: {
          pendentes: pendentes[0].total,
          aprovadosHoje: aprovadosHoje[0].total,
          reprovadosHoje: reprovadosHoje[0].total,
        },
      });
    } catch (err) {
      console.error("Erro ao obter estatísticas:", err);
      res.status(500).json({
        success: false,
        message: "Erro no servidor",
      });
    }
  }
);

// * Rota de listagem de livros aprovados (PÚBLICA)
app.get("/api/livros", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT 
          l.id_livro,
          l.titulo,
          l.descricao,
          l.ano_publicacao,
          l.isbn,
          l.estado,
          l.data_postagem,
          a.nome AS autor_nome,
          a.nacionalidade AS autor_nacionalidade,
          g.nome AS genero_nome,
          u.nome AS usuario_nome,
          u.email AS usuario_email
        FROM Livro l
        INNER JOIN Autor a ON l.id_autor = a.id_autor
        INNER JOIN Genero g ON l.id_genero = g.id_genero
        INNER JOIN Usuario u ON l.id_usuario = u.id_usuario
        WHERE l.aprovado = 1
        ORDER BY l.data_postagem DESC`
    );
    res.json({ success: true, livros: results });
  } catch (err) {
    console.error("Erro ao listar livros:", err);
    res.status(500).json({
      success: false,
      message: "Erro no servidor",
    });
  }
});

app.get("/api/livro/:id/imagens", async (req, res) => {
  try {
    const livroId = req.params.id;

    const [imagens] = await db.query(
      `SELECT id_imagem, caminho_imagem, tipo, data_upload 
       FROM Livro_imagem 
       WHERE id_livro = ? 
       ORDER BY 
         CASE 
           WHEN tipo = 'capa' THEN 0 
           ELSE 1 
         END,
         id_imagem`,
      [livroId]
    );

    res.json({
      success: true,
      imagens: imagens,
    });
  } catch (err) {
    console.error("Erro ao buscar imagens do livro:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar imagens",
    });
  }
});

// TODO: Rota de geração de relatório (ADMIN)
// app.get("/api/relatorio", async (req, res) => {});

// * Testa a conexão e inicia o servidor
db.getConnection()
  .then((conn) => {
    console.log("Conexão com o banco estabelecida!");
    conn.release();

    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar no banco:", err.message);
    process.exit(1);
  });
