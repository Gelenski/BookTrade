const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db/database");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const session = require("express-session");
const path = require("path");
const upload = require("./utils/upload");

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
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", require("./routes/authRoutes"));

function verificarAutenticacao(req, res, next) {
  if (req.session && req.session.usuario) {
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

function verificarAdmin(req, res, next) {
  if (
    req.session &&
    req.session.usuario &&
    req.session.usuario.tipo === "admin"
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Acesso negado. Apenas administradores.",
  });
}

// * Rota de listagem de usuários (ADMIN)
app.get(
  "/api/users",
  verificarAutenticacao,
  verificarAdmin,
  async (req, res) => {
    try {
      const [results] = await db.query(
        "SELECT u.id_usuario, u.email, u.cpf, u.nome, u.tipo_usuario, u.data_cadastro, u.status, t.telefone FROM usuario u INNER JOIN usuario_telefone t ON u.id_usuario = t.id_usuario;"
      );
      res.json({ success: true, users: results });
    } catch (err) {
      console.error("Erro ao listar usuários:", err);
      res.status(500).json({
        success: false,
        message: "Erro no servidor",
      });
    }
  }
);

// * Rota de cadastro de revisores (ADMIN)
app.post(
  "/api/cadastro-revisor",
  verificarAutenticacao,
  verificarAdmin,
  async (req, res) => {
    try {
      const {
        nome,
        email,
        cpf,
        senha,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        telefone,
      } = req.body;

      // Validação básica
      if (!nome || !email || !cpf || !senha) {
        return res.status(400).json({
          success: false,
          message: "Campos obrigatórios não preenchidos",
        });
      }

      // Verifica se email já existe
      const [emailExists] = await db.query(
        "SELECT id_usuario FROM usuario WHERE email = ?",
        [email]
      );

      if (emailExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email já cadastrado",
        });
      }

      // Remove tudo que não for número do CEP
      const cepLimpo = cep.replace(/\D/g, "");

      // Criptografa senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // Insere endereço
      const [enderecoResult] = await db.query(
        "INSERT INTO endereco (cep, rua, numero, bairro, cidade) VALUES (?, ?, ?, ?, ?)",
        [cepLimpo, rua, numero, bairro, cidade]
      );
      const id_endereco = enderecoResult.insertId;

      // Insere usuário
      const tipo_usuario = "revisor";
      const [usuarioResult] = await db.query(
        "INSERT INTO usuario (nome, email, cpf, senha, tipo_usuario, id_endereco) VALUES (?, ?, ?, ?, ?, ?)",
        [nome, email, cpf, senhaHash, tipo_usuario, id_endereco]
      );
      const id_usuario = usuarioResult.insertId;

      // Insere telefone
      if (telefone && telefone.trim() !== "") {
        await db.query(
          "INSERT INTO Usuario_telefone (id_usuario, telefone) VALUES (?, ?)",
          [id_usuario, telefone]
        );
      }

      res.json({
        success: true,
        message: "Cadastro de revisor realizado com sucesso!",
      });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Erro no cadastro: " + err.message });
    }
  }
);

// * Rota de atualização de usuário (ADMIN)
app.put(
  "/api/atualizar-usuario/:id",
  verificarAutenticacao,
  verificarAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { nome, email, cpf, telefone, tipo_usuario, status } = req.body;
      // Atualiza usuário
      await db.query(
        "UPDATE usuario SET nome = ?, email = ?, cpf = ?, tipo_usuario = ?, status = ? WHERE id_usuario = ?",
        [nome, email, cpf, tipo_usuario, status, userId]
      );

      // Atualiza telefone
      if (telefone && telefone.trim() !== "") {
        await db.query(
          "UPDATE usuario_telefone SET telefone = ? WHERE id_usuario = ?",
          [telefone, userId]
        );

        res
          .status(200)
          .json({ success: true, message: "Usuário atualizado com sucesso!" });
      }
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar: " + err.message });
    }
  }
);

// * Rota de deleção de usuário (ADMIN)
app.delete(
  "/api/deletar-usuario/:id",
  verificarAutenticacao,
  verificarAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Impede que o adm delete a própria conta
      if (parseInt(userId) === req.session.usuario.id) {
        return res.status(400).json({
          success: false,
          message: "Você não pode deletar sua própria conta",
        });
      }

      // Deleta recuperação de senha
      await db.query("DELETE FROM recuperacao_senha WHERE id_usuario = ?", [
        userId,
      ]);

      // Deleta telefone
      await db.query("DELETE FROM usuario_telefone WHERE id_usuario = ?", [
        userId,
      ]);

      // Deleta usuário
      await db.query("DELETE FROM usuario WHERE id_usuario = ?", [userId]);

      res
        .status(200)
        .json({ success: true, message: "Usuário deletado com sucesso!" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Erro ao deletar: " + err.message });
    }
  }
);

// * Rota de cadastro de livros (USUÁRIO AUTENTICADO)
app.post(
  "/api/cadastrar-livro",
  verificarAutenticacao,
  upload.fields([
    { name: "capa", maxCount: 1 },
    { name: "imagens", maxCount: 3 },
  ]),
  async (req, res) => {
    try {
      const {
        titulo,
        descricao,
        ano_publicacao,
        isbn,
        estado,
        nome_autor,
        nacionalidade_autor,
        nome_genero,
      } = req.body;

      const id_usuario = req.session.usuario.id;

      if (
        !titulo ||
        !descricao ||
        !ano_publicacao ||
        !isbn ||
        !estado ||
        !nome_autor ||
        !nacionalidade_autor ||
        !nome_genero
      ) {
        return res.status(400).json({
          success: false,
          message: "Todos os campos obrigatórios devem ser preenchidos",
        });
      }

      if (!req.files || !req.files.capa) {
        return res.status(400).json({
          success: false,
          message: "A imagem da capa é obrigatória",
        });
      }

      let id_autor;
      const [autorExistente] = await db.query(
        "SELECT id_autor FROM autor WHERE nome = ? AND nacionalidade = ?",
        [nome_autor, nacionalidade_autor]
      );
      if (autorExistente.length > 0) {
        id_autor = autorExistente[0].id_autor;
      } else {
        const [novoAutor] = await db.query(
          "INSERT INTO autor (nome, nacionalidade) VALUES (?, ?)",
          [nome_autor, nacionalidade_autor]
        );
        id_autor = novoAutor.insertId;
      }

      let id_genero;
      const [generoExistente] = await db.query(
        "SELECT id_genero FROM genero WHERE nome = ?",
        [nome_genero]
      );
      if (generoExistente.length > 0) {
        id_genero = generoExistente[0].id_genero;
      } else {
        const [novoGenero] = await db.query(
          "INSERT INTO genero (nome) VALUES (?)",
          [nome_genero]
        );
        id_genero = novoGenero.insertId;
      }

      // const imagemCapa = "/uploads/livros/" + req.files.capa[0].filename;

      const data_postagem = new Date();
      const [livroResult] = await db.query(
        "INSERT INTO livro (titulo, descricao, ano_publicacao, isbn, estado, data_postagem, id_usuario, id_autor, id_genero, aprovado, observacao_revisao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)",
        [
          titulo,
          descricao,
          ano_publicacao,
          isbn,
          estado,
          data_postagem,
          id_usuario,
          id_autor,
          id_genero,
        ]
      );

      const id_livro = livroResult.insertId;

      if (req.files.imagens && req.files.imagens.length > 0) {
        for (let i = 0; i < req.files.imagens.length; i++) {
          const caminhoImagem =
            "/uploads/livros/" + req.files.imagens[i].filename;
          await db.query(
            "INSERT INTO Livro_imagem (id_livro, caminho_imagem, tipo, ordem) VALUES (?, ?, ?, ?)",
            [id_livro, caminhoImagem, "adicional", i + 1]
          );
        }
      }

      res.json({
        success: true,
        message:
          "Livro cadastrado com sucesso, aguardando aprovação do revisor!",
        livroId: livroResult.insertId,
      });
      console.log(
        `Novo livro cadastrado: ${titulo} (ID: ${livroResult.insertId})`
      );
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Erro no cadastro: " + err.message });
    }
  }
);

// * Rota de listagem de livros pendentes de aprovação (REVISOR)
app.get(
  "/api/livros-pendentes",
  verificarAutenticacao,
  verificarRevisor,
  async (req, res) => {
    try {
      const [results] = await db.query(
        `SELECT l.id_livro, l.titulo, l.descricao, l.ano_publicacao, l.isbn, l.estado, l.data_postagem,
                  a.nome AS nome_autor, a.nacionalidade AS nacionalidade_autor, g.nome AS nome_genero,
                  u.id_usuario, u.nome AS nome_usuario, u.email AS email_usuario
          FROM livro l 
            INNER JOIN autor a ON l.id_autor = a.id_autor
            INNER JOIN genero g ON l.id_genero = g.id_genero
            INNER JOIN usuario u ON l.id_usuario = u.id_usuario
          WHERE l.aprovado IS NULL`
      );
      res.json({ success: true, livros: results });
    } catch (err) {
      console.error("Erro ao listar livros pendentes:", err);
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
        FROM livro l
        INNER JOIN autor a ON l.id_autor = a.id_autor
        INNER JOIN genero g ON l.id_genero = g.id_genero
        INNER JOIN usuario u ON l.id_usuario = u.id_usuario
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
