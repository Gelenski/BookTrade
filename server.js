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

// * Rota de listagem de usuários (ADMIN)
app.get("/api/users", async (req, res) => {
  try {
    const [results] = await db.query(
      // "SELECT id_usuario, email, cpf, nome, tipo_usuario, data_cadastro FROM Usuario"
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
});

app.post("/api/cadastro-gestor", async (req, res) => {
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
    const tipo_usuario = "gestor";
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
      message: "Cadastro de gestor realizado com sucesso!",
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Erro no cadastro: " + err.message });
  }
});

app.put("/api/atualizar-usuario/:id", async (req, res) => {
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
});

app.delete("/api/deletar-usuario/:id", async (req, res) => {
  try {
    const userId = req.params.id;

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
