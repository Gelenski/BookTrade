const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require("../utils/upload");

// Middleware de autenticação
function verificarAutenticacao(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Usuário não autenticado",
  });
}

// Rotas
router.post(
  "/cadastrar-livro",
  verificarAutenticacao,
  upload,
  userController.cadastrarLivro
);

router.get(
  "/meus-livros",
  verificarAutenticacao,
  userController.listarMeusLivros
);

router.delete(
  "/deletar-livro/:id",
  verificarAutenticacao,
  userController.deletarLivro
);

module.exports = router;
