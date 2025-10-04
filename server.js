
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static('login')); // diretório da pagina de login

// Configuração do banco de dados
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auth_db'
});

// Conectar ao banco
db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
    return;
  }
  console.log('Conectado ao MySQL com sucesso!');
});

// Rota de login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Validação básica
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email e senha são obrigatórios' 
    });
  }


  // Buscar usuário no banco
  const query = 'SELECT * FROM Usuario WHERE email = ?';
  
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Erro na consulta:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro no servidor' 
      });
    }


    // Verificar se o usuário existe
    if (results.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    const user = results[0];

    // Verificar senha (não criptografada)
    try {

      const passwordMatch = password === user.senha;

      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Email ou senha incorretos' 
        });
      }

      // Mensagem de sucesso
      res.json({ 
        success: true, 
        message: 'Login realizado com sucesso',
        user: {
          id: user.id_usuario,
          email: user.email,
          name: user.nome
        }
      });

      // Mensagem de erro
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar login' 
      });
    }
  });
});

// Rota para listar usuários (opcional, para testes)
app.get('/api/users', (req, res) => {
  db.query('SELECT id_usuario, email, nome FROM Usuario', (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
    res.json({ success: true, users: results });
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});


