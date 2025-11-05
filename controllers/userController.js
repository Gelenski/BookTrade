const db = require("../db/database");
const bcrypt = require("bcrypt");

exports.cadastrarLivro = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

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

    // Validação dos campos obrigatórios
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

    // Validação da capa
    if (!req.files || !req.files.capa || req.files.capa.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A imagem da capa é obrigatória",
      });
    }

    // Buscar ou criar autor
    let id_autor;
    const [autorExistente] = await db.query(
      "SELECT id_autor FROM Autor WHERE nome = ? AND nacionalidade = ?",
      [nome_autor, nacionalidade_autor]
    );

    if (autorExistente.length > 0) {
      id_autor = autorExistente[0].id_autor;
    } else {
      const [novoAutor] = await db.query(
        "INSERT INTO Autor (nome, nacionalidade) VALUES (?, ?)",
        [nome_autor, nacionalidade_autor]
      );
      id_autor = novoAutor.insertId;
    }

    // Buscar ou criar gênero
    let id_genero;
    const [generoExistente] = await db.query(
      "SELECT id_genero FROM Genero WHERE nome = ?",
      [nome_genero]
    );

    if (generoExistente.length > 0) {
      id_genero = generoExistente[0].id_genero;
    } else {
      const [novoGenero] = await db.query(
        "INSERT INTO Genero (nome) VALUES (?)",
        [nome_genero]
      );
      id_genero = novoGenero.insertId;
    }

    // Obter caminho da capa
    const imagemCapa = "/uploads/livros/" + req.files.capa[0].filename;

    // Inserir livro (SEM id_genero direto, pois não existe essa coluna segundo o schema)
    const data_postagem = new Date();
    const [livroResult] = await db.query(
      "INSERT INTO Livro (titulo, descricao, ano_publicacao, isbn, estado, data_postagem, id_usuario, id_autor, aprovado, observacao_revisao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)",
      [
        titulo,
        descricao,
        ano_publicacao,
        isbn,
        estado,
        data_postagem,
        id_usuario,
        id_autor,
      ]
    );

    const id_livro = livroResult.insertId;

    // Inserir relacionamento na tabela Livro_genero
    await db.query(
      "INSERT INTO Livro_genero (id_livro, id_genero) VALUES (?, ?)",
      [id_livro, id_genero]
    );

    // Inserir capa na tabela Livro_imagem
    await db.query(
      "INSERT INTO Livro_imagem (id_livro, caminho_imagem, tipo) VALUES (?, ?, ?)",
      [id_livro, imagemCapa, "capa"]
    );

    // Inserir imagens adicionais
    if (req.files.imagens && req.files.imagens.length > 0) {
      for (let i = 0; i < req.files.imagens.length; i++) {
        const caminhoImagem =
          "/uploads/livros/" + req.files.imagens[i].filename;
        await db.query(
          "INSERT INTO Livro_imagem (id_livro, caminho_imagem, tipo) VALUES (?, ?, ?)",
          [id_livro, caminhoImagem, "adicional"]
        );
      }
    }

    res.json({
      success: true,
      message: "Livro cadastrado com sucesso, aguardando aprovação do revisor!",
      livroId: id_livro,
    });

    console.log(`Novo livro cadastrado: ${titulo} (ID: ${id_livro})`);
  } catch (err) {
    console.error("Erro ao cadastrar livro:", err);
    res.status(500).json({
      success: false,
      message: "Erro no cadastro: " + err.message,
    });
  }
};

exports.listarMeusLivros = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }
    const id_usuario = req.session.usuario.id;
    const [results] = await db.query(
      `SELECT l.id_livro, l.titulo, l.descricao, l.ano_publicacao, l.isbn, l.estado, l.data_postagem, l.aprovado, l.observacao_revisao,
              a.nome AS nome_autor, a.nacionalidade AS nacionalidade_autor, g.nome AS nome_genero
       FROM Livro l 
       INNER JOIN Autor a ON l.id_autor = a.id_autor
       INNER JOIN Livro_genero lg ON l.id_livro = lg.id_livro
       INNER JOIN Genero g ON lg.id_genero = g.id_genero
       WHERE l.id_usuario = ?`,
      [id_usuario]
    );
    res.json({ success: true, livros: results });
  } catch (err) {
    console.error("Erro ao listar meus livros:", err);
    res.status(500).json({
      success: false,
      message: "Erro no servidor",
    });
  }
};

exports.obterPerfil = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const id_usuario = req.session.usuario.id;

    const [usuarios] = await db.query(
      `SELECT u.id_usuario, u.nome, u.email, u.cpf, u.status,
              e.cep, e.rua, e.numero, e.bairro, e.cidade,
              t.telefone
       FROM Usuario u
       LEFT JOIN Endereco e ON u.id_endereco = e.id_endereco
       LEFT JOIN Usuario_telefone t ON u.id_usuario = t.id_usuario
       WHERE u.id_usuario = ?`,
      [id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      usuario: usuarios[0],
    });
  } catch (err) {
    console.error("Erro ao obter perfil:", err);
    res.status(500).json({
      success: false,
      message: "Erro no servidor",
    });
  }
};

exports.atualizarPerfil = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    const id_usuario = req.session.usuario.id;
    const {
      nome,
      email,
      telefone,
      cep,
      rua,
      numero,
      bairro,
      cidade,
      senhaAtual,
      novaSenha,
    } = req.body;

    // Validação básica
    if (!nome || !email) {
      return res.status(400).json({
        success: false,
        message: "Nome e email são obrigatórios",
      });
    }

    // Se estiver alterando senha, validar senha atual
    if (novaSenha) {
      if (!senhaAtual) {
        return res.status(400).json({
          success: false,
          message: "Senha atual é obrigatória para alterar a senha",
        });
      }

      // Verificar senha atual
      const [usuarios] = await db.query(
        "SELECT senha FROM Usuario WHERE id_usuario = ?",
        [id_usuario]
      );

      if (usuarios.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      const senhaCorreta = await bcrypt.compare(senhaAtual, usuarios[0].senha);

      if (!senhaCorreta) {
        return res.status(400).json({
          success: false,
          message: "Senha atual incorreta",
        });
      }

      // Criptografar nova senha
      const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualizar senha
      await db.query("UPDATE Usuario SET senha = ? WHERE id_usuario = ?", [
        novaSenhaHash,
        id_usuario,
      ]);
    }

    // Atualizar dados do usuário
    await db.query(
      "UPDATE Usuario SET nome = ?, email = ? WHERE id_usuario = ?",
      [nome, email, id_usuario]
    );

    // Atualizar telefone
    if (telefone) {
      // Verificar se já existe um telefone cadastrado
      const [telefoneExistente] = await db.query(
        "SELECT id_telefone FROM Usuario_telefone WHERE id_usuario = ?",
        [id_usuario]
      );

      if (telefoneExistente.length > 0) {
        await db.query(
          "UPDATE Usuario_telefone SET telefone = ? WHERE id_usuario = ?",
          [telefone, id_usuario]
        );
      } else {
        await db.query(
          "INSERT INTO Usuario_telefone (id_usuario, telefone) VALUES (?, ?)",
          [id_usuario, telefone]
        );
      }
    }

    // Atualizar endereço
    if (cep && rua && numero && bairro && cidade) {
      const cepLimpo = cep.replace(/\D/g, "");

      // Obter id_endereco do usuário
      const [usuarios] = await db.query(
        "SELECT id_endereco FROM Usuario WHERE id_usuario = ?",
        [id_usuario]
      );

      if (usuarios.length > 0 && usuarios[0].id_endereco) {
        await db.query(
          "UPDATE Endereco SET cep = ?, rua = ?, numero = ?, bairro = ?, cidade = ? WHERE id_endereco = ?",
          [cepLimpo, rua, numero, bairro, cidade, usuarios[0].id_endereco]
        );
      }
    }

    // Atualizar sessão
    req.session.usuario.nome = nome;
    req.session.usuario.email = email;

    res.json({
      success: true,
      message: "Perfil atualizado com sucesso!",
    });

    console.log(`Perfil atualizado: ${nome} (ID: ${id_usuario})`);
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar perfil: " + err.message,
    });
  }
};
