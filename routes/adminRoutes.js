const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

function verificarAdmin(req, res, next) {
  if (
    req.session &&
    req.session.usuario &&
    req.session.usuario.tipo === "admin"
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Acesso negado. Apenas administradores.",
  });
}

router.get("/users", verificarAdmin, adminController.listarUsuarios);
router.post(
  "/cadastro-revisor",
  verificarAdmin,
  adminController.cadastrarRevisor
);

router.put(
  "/atualizar-usuario/:id",
  verificarAdmin,
  adminController.atualizarUsuario
);

router.delete(
  "/deletar-usuario/:id",
  verificarAdmin,
  adminController.deletarUsuario
);

module.exports = router;
