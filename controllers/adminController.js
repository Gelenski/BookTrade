const db = require("../db/database");
const bcrypt = require("bcrypt");

exports.listarUsuarios = async (req, res) => {
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
};

exports.cadastrarRevisor = async (req, res) => {
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
};

exports.atualizarUsuario = async (req, res) => {
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
};

exports.deletarUsuario = async (req, res) => {
  try {
    const userId = req.params.id;

    // Impede que o adm delete a própria conta
    if (parseInt(userId) === req.session.usuario.id) {
      return res.status(400).json({
        success: false,
        message: "Você não pode deletar sua própria conta",
      });
    }

    // Deleta todas as tabelas relacionadas
    await db.query("DELETE FROM avaliacao WHERE id_usuario = ?", [userId]);

    await db.query("DELETE FROM favorito WHERE id_usuario = ?", [userId]);

    await db.query("DELETE FROM historico WHERE id_usuario = ?", [userId]);

    // Deleta livros do usuário
    await db.query("DELETE FROM livro WHERE id_usuario = ?", [userId]);

    await db.query("DELETE FROM notificacao WHERE id_usuario = ?", [userId]);

    await db.query("DELETE FROM ponto WHERE id_usuario = ?", [userId]);

    await db.query("DELETE FROM recuperacao_senha WHERE id_usuario = ?", [
      userId,
    ]);

    await db.query("DELETE FROM troca WHERE id_usuario = ?", [userId]);

    await db.query("DELETE FROM usuario_telefone WHERE id_usuario = ?", [
      userId,
    ]);

    await db.query("DELETE FROM usuario WHERE id_usuario = ?", [userId]);

    res.status(200).json({
      success: true,
      message: "Usuário e todos os dados relacionados deletados com sucesso!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar: " + err.message,
    });
  }
};
