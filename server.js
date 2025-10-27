const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db/database");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const session = require("express-session");

const enviarEmail = require("./utils/email");
const { gerarToken, calcularExpiracao } = require("./utils/token");
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT;

// Configuração do body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

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

// * Rota de verificação de sessão
app.get("/api/verificar-sessao", (req, res) => {
  if (req.session && req.session.usuario) {
    res.json({
      success: true,
      autenticado: true,
      usuario: {
        id: req.session.usuario.id,
        nome: req.session.usuario.nome,
        email: req.session.usuario.email,
        tipo: req.session.usuario.tipo,
      },
    });
  } else {
    res.json({
      success: true,
      autenticado: false,
    });
  }
});

// * Rota de logout
app.post("/api/logout", (req, res) => {
  if (req.session) {
    const userName = req.session.usuario ? req.session.usuario.nome : "Usuário";
    req.session.destroy((err) => {
      if (err) {
        console.error("Erro ao destruir sessão:", err);
        return res.status(500).json({
          success: false,
          message: "Erro ao fazer logout",
        });
      }
      res.json({
        success: true,
        message: "Logout realizado com sucesso",
      });
      console.log(`Logout realizado: ${userName}`);
    });
  } else {
    res.json({
      success: true,
      message: "Nenhuma sessão ativa",
    });
  }
});

// * Rota de cadastro de usuários (PADRÃO)
app.post("/api/cadastro", async (req, res) => {
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
    const tipo_usuario = "comum";
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

    res.json({ success: true, message: "Cadastro realizado com sucesso!" });
    console.log(`Novo usuário cadastrado: ${nome} (ID: ${id_usuario})`);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Erro no cadastro: " + err.message });
  }
});

// * Rota de login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email e senha são obrigatórios",
      });
    }

    // Buscar usuário no banco
    const [results] = await db.query("SELECT * FROM Usuario WHERE email = ?", [
      email,
    ]);

    // Verificar se o usuário existe
    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha incorretos",
      });
    }

    const user = results[0];

    // Verificar senha criptografada com bcrypt
    const passwordMatch = await bcrypt.compare(password, user.senha);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha incorretos",
      });
    }

    if (user.status === 0) {
      return res.status(403).json({
        success: false,
        message: "Usuário inativo. Entre em contato com o administrador.",
      });
    }

    req.session.usuario = {
      id: user.id_usuario,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo_usuario,
    };

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      user: {
        id: user.id_usuario,
        email: user.email,
        name: user.nome,
        tipo: user.tipo_usuario,
      },
    });

    console.log(`Login realizado: ${user.nome} (ID: ${user.id_usuario})`);
  } catch (error) {
    console.error("Erro ao processar login:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar login",
    });
  }
});

// * Rota de redefinição de senha
app.post("/redefinir", async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    // Verifica se o token existe, está válido e não expirou
    const [recuperacoes] = await db.query(
      "SELECT * FROM Recuperacao_senha WHERE token = ? AND data_expiracao > NOW() AND status = 0",
      [token]
    );

    if (recuperacoes.length === 0) {
      return res.status(400).json({ message: "Token inválido ou expirado." });
    }

    const recuperacao = recuperacoes[0];

    // Criptografa a nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualiza senha do usuário
    await db.query("UPDATE usuario SET senha = ? WHERE id_usuario = ?", [
      senhaHash,
      recuperacao.id_usuario,
    ]);

    // Marca token como usado
    await db.query(
      "UPDATE Recuperacao_senha SET status = 1 WHERE id_recuperacao = ?",
      [recuperacao.id_recuperacao]
    );

    res.json({ message: "Senha redefinida com sucesso!" });
    console.log(`Senha redefinida para usuário ID: ${recuperacao.id_usuario}`);
  } catch (err) {
    console.error("Erro ao redefinir senha:", err);
    res.status(500).json({ message: "Erro ao redefinir senha." });
  }
});

// * Rota de recuperação de senha
app.post("/recuperar", async (req, res) => {
  try {
    const { email } = req.body;

    // Verifica se o usuário existe
    const [usuarios] = await db.query(
      "SELECT id_usuario, nome FROM usuario WHERE email = ?",
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: "E-mail não encontrado." });
    }

    const usuario = usuarios[0];

    // Gera token e expiração
    const token = gerarToken();
    const agora = new Date();
    const expira = calcularExpiracao(1); // 1 hora

    // Salva na tabela de recuperação
    await db.query(
      "INSERT INTO Recuperacao_senha (token, data_solicitacao, data_expiracao, status, id_usuario) VALUES (?, ?, ?, ?, ?)",
      [token, agora, expira, 0, usuario.id_usuario]
    );

    // Cria link para redefinir senha
    const link = `http://localhost:3000/redefinir/index.html?token=${token}`;

    // Envia e-mail
    await enviarEmail(
      email,
      "Recuperação de Senha - BookTrade",
      `<p>Olá ${usuario.nome}, clique no link abaixo para redefinir sua senha:</p>
       <a href="${link}">${link}</a>
       <p>O link expira em 1 hora.</p>`
    );

    res.json({ message: "E-mail de recuperação enviado." });
    console.log(`Token de recuperação gerado para: ${email}`);
  } catch (err) {
    console.error("Erro na recuperação de senha:", err);
    res.status(500).json({ message: "Erro ao enviar e-mail de recuperação." });
  }
});

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
app.post("/api/cadastrar-livro", verificarAutenticacao, async (req, res) => {
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

    res.json({
      success: true,
      message: "Livro cadastrado com sucesso, aguardando aprovação do revisor!",
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
