const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require("../utils/upload");

router.post("/cadastrar-livro", upload, userController.cadastrarLivro);

module.exports = router;
