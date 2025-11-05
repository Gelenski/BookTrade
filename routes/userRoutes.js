const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require("../utils/upload");

function verificarAutenticacao(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Usuário não autenticado",
  });
}

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

router.get("/perfil", verificarAutenticacao, userController.obterPerfil);

router.put("/perfil", verificarAutenticacao, userController.atualizarPerfil);

module.exports = router;
