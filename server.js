const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db/database");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

// Configurações do Express
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// * Rota de cadastro
app.post("/api/cadastro", async (req, res) => {
  try {
    // Extrai dados do formulário
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

    res.send("Cadastro realizado com sucesso!");

    console.log(`Novo usuário cadastrado: ${nome} (ID: ${id_usuario})`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no cadastro: " + err.message);
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
