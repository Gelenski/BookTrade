const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/verificar-sessao", authController.verificarSessao);

router.post("/login", authController.login);

router.post("/cadastro", authController.cadastro);

router.post("/logout", authController.logout);

router.post("/redefinir", authController.redefinirSenha);

router.post("/recuperar", authController.recuperarSenha);

module.exports = router;
