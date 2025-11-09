const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");

router.get("/responder", tradeController.responderTrocaViaToken);

// * ==================== ROTAS AUTENTICADAS ====================
router.use((req, res, next) => {
  if (req.session && req.session.usuario) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Usuário não autenticado",
  });
});

// Rota para criar solicitação de troca
router.post("/solicitar", tradeController.criarSolicitacaoTroca);

// Rota para listar trocas recebidas (onde sou proprietário)
router.get("/recebidas", tradeController.listarTrocasRecebidas);

// Rota para listar trocas enviadas (onde sou solicitante)
router.get("/enviadas", tradeController.listarTrocasEnviadas);

// Rota para cancelar uma solicitação de troca
router.put("/:id/cancelar", tradeController.cancelarTroca);

// Rota para concluir uma troca
router.put("/:id/concluir", tradeController.concluirTroca);

// Rota para obter histórico de uma troca
router.get("/:id/historico", tradeController.obterHistoricoTroca);

module.exports = router;
