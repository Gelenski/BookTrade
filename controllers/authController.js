const bcrypt = require("bcrypt");
const db = require("../db/database");

exports.verificarSessao = (req, res) => {
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
};

exports.login = async (req, res) => {
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
};

exports.cadastro = async (req, res) => {
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
};

exports.logout = (req, res) => {
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
};
