const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");

// Rota para criar solicitação de troca
router.post("/solicitar", tradeController.criarSolicitacaoTroca);

// Rota para listar trocas recebidas (onde sou proprietário)
router.get("/recebidas", tradeController.listarTrocasRecebidas);

// Rota para listar trocas enviadas (onde sou solicitante)
router.get("/enviadas", tradeController.listarTrocasEnviadas);

// Rota para responder a uma solicitação de troca
router.put("/:id/responder", tradeController.responderTroca);

// Rota para cancelar uma solicitação de troca
router.put("/:id/cancelar", tradeController.cancelarTroca);

// Rota para concluir uma troca
router.put("/:id/concluir", tradeController.concluirTroca);

module.exports = router;
