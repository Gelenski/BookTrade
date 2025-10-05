const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db/database");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

// Configurações do Express (ANTES das rotas)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// * Rota de cadastro
app.post("/api/cadastro", async (req, res) => {
  try {
    let {
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
    cep = cep.replace(/\D/g, "");

    // Criptografa senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Insere endereço
    const [enderecoResult] = await db.query(
      "INSERT INTO endereco (cep, rua, numero, bairro, estado) VALUES (?, ?, ?, ?, ?)",
      [cep, rua, numero, bairro, estado]
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
