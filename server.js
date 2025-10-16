const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db/database");
const bcrypt = require("bcrypt");
const dotenv = require('dotenv');
const path = require('path');
const  enviarEmail  = require('./utils/email');
const { gerarToken, calcularExpiracao } = require('./utils/token');
dotenv.config();


const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Configurações do Express (ANTES das rotas)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// * Rota de cadastro
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
      estado,
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
      "INSERT INTO endereco (cep, rua, numero, bairro, estado) VALUES (?, ?, ?, ?, ?)",
      [cepLimpo, rua, numero, bairro, estado]
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

    // Login bem-sucedido
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

// Rota para listar usuários (opcional, para testes)
app.get("/api/users", async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT id_usuario, email, nome, tipo_usuario FROM Usuario"
    );
    res.json({ success: true, users: results });
  } catch (err) {
    console.error("Erro ao listar usuários:", err);
    res.status(500).json({
      success: false,
      message: "Erro no servidor",
    });
  }
});



// Rota de recuperação de senha
app.post('/recuperar', async (req, res) => {
  try {
    const { email } = req.body;

    // Verifica se o usuário existe
    const [usuarios] = await db.query(
      'SELECT id_usuario, nome FROM usuario WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'E-mail não encontrado.' });
    }

    const usuario = usuarios[0];

    // Gera token e expiração
    const token = gerarToken();
    const agora = new Date();
    const expira = calcularExpiracao(1); // 1 hora

    // Salva na tabela de recuperação
    await db.query(
      'INSERT INTO Recuperacao_senha (token, data_solicitacao, data_expiracao, status, id_usuario) VALUES (?, ?, ?, ?, ?)',
      [token, agora, expira, 0, usuario.id_usuario]
    );

    // Cria link para redefinir senha
    const link = `http://localhost:3000/redefinir/index.html?token=${token}`;

    // Envia e-mail
    await enviarEmail(
      email,
      'Recuperação de Senha - BookTrade',
      `<p>Olá ${usuario.nome}, clique no link abaixo para redefinir sua senha:</p>
       <a href="${link}">${link}</a>
       <p>O link expira em 1 hora.</p>`
    );

    res.json({ message: 'E-mail de recuperação enviado.' });
    console.log(`Token de recuperação gerado para: ${email}`);
  } catch (err) {
    console.error('Erro na recuperação de senha:', err);
    res.status(500).json({ message: 'Erro ao enviar e-mail de recuperação.' });
  }
});


// Rota de redefinição de senha
app.post('/redefinir', async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    // Verifica se o token existe, está válido e não expirou
    const [recuperacoes] = await db.query(
      'SELECT * FROM Recuperacao_senha WHERE token = ? AND data_expiracao > NOW() AND status = 0',
      [token]
    );

    if (recuperacoes.length === 0) {
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }

    const recuperacao = recuperacoes[0];

    // Criptografa a nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualiza senha do usuário
    await db.query(
      'UPDATE usuario SET senha = ? WHERE id_usuario = ?',
      [senhaHash, recuperacao.id_usuario]
    );

    // Marca token como usado
    await db.query(
      'UPDATE Recuperacao_senha SET status = 1 WHERE id_recuperacao = ?',
      [recuperacao.id_recuperacao]
    );

    res.json({ message: 'Senha redefinida com sucesso!' });
    console.log(`Senha redefinida para usuário ID: ${recuperacao.id_usuario}`);
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ message: 'Erro ao redefinir senha.' });
  }
});




// Testa a conexão e inicia o servidor
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
