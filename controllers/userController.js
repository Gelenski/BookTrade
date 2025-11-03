const db = require("../db/database");

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

    // Buscar ou criar gênero
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

    // Obter caminho da capa
    const imagemCapa = "/uploads/livros/" + req.files.capa[0].filename;

    // Inserir livro
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

    // Inserir capa na tabela Livro_imagem
    await db.query(
      "INSERT INTO Livro_imagem (id_livro, caminho_imagem, tipo, ordem) VALUES (?, ?, ?, ?)",
      [id_livro, imagemCapa, "capa", 0]
    );

    // Inserir imagens adicionais
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
