# 📚 BookTrade

Sistema de troca de livros entre usuários.

## 📋 Índice

- [Sobre](#sobre)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando o projeto](#executando-o-projeto)
- [Estrutura do projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Tipos de usuário](#tipos-de-usuário)
- [Contribuindo](#contribuindo)

## 🔍 Sobre

BookTrade é uma plataforma que permite usuários cadastrarem seus livros e realizarem trocas com outros leitores. O sistema possui três níveis de acesso: comum, gestor e administrador.

## 🚀 Tecnologias

- **Backend**: Node.js + Express
- **Banco de Dados**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Segurança**: bcrypt para hash de senhas
- **API Externa**: ViaCEP para busca de endereços

## 📦 Pré-requisitos

Antes de começar, você precisará ter instalado:

- [Node.js](https://nodejs.org/) (versão 14 ou superior)
- [MySQL](https://www.mysql.com/) (versão 8 ou superior)
- [Git](https://git-scm.com/)

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/Gelenski/BookTrade.git
cd BookTrade
```

2. Instale as dependências:

```bash
npm install
```

3. Crie o banco de dados MySQL:

```sql
CREATE DATABASE booktrade;
USE booktrade;

-- Execute o script SQL fornecido em /db/schema.sql
```

## ⚙️ Configuração

1. Crie um arquivo `.env` na raiz do projeto:

```env
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=booktrade
DB_PORT=3306
```

2. Ajuste as credenciais de acordo com sua instalação do MySQL.

## ▶️ Executando o projeto

1. Inicie o servidor:

```bash
node server.js
```

2. Acesse no navegador:

- **Login**: http://localhost:3000/login
- **Cadastro**: http://localhost:3000/cadastro

## 📁 Estrutura do projeto

```
BookTrade/
├── cadastro/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── login/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── dashboard-comum/
│   └── index.html
├── dashboard-gestor/
│   └── index.html
├── dashboard-admin/
│   └── index.html
├── db/
│   ├── database.js
│   └── schema.sql
├── .env
├── .gitignore
├── server.js
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Cadastro

```http
POST /api/cadastro
Content-Type: application/json

{
  "nome": "string",
  "email": "string",
  "cpf": "string",
  "senha": "string",
  "telefone": "string",
  "cep": "string",
  "rua": "string",
  "numero": "string",
  "bairro": "string",
  "estado": "string"
}
```

### Login

```http
POST /api/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

### Listar Usuários

```http
GET /api/users
```

## 👥 Tipos de usuário

- **Comum**: Usuário padrão que pode cadastrar livros e realizar trocas
- **Gestor**: Pode aprovar/rejeitar trocas e visualizar relatórios
- **Administrador**: Acesso total ao sistema, gerencia usuários e configurações

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: nova feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Padrão de commits

- `Add:` para novas funcionalidades
- `Fix:` para correções de bugs
- `Update:` para atualizações
- `Remove:` para remoções
- `Docs:` para documentação

## 📝 Licença

Este projeto está sob a licença ISC.

## 👨‍💻 Autor

Desenvolvido por [Gelenski](https://github.com/Gelenski)

---

⭐ Se este projeto te ajudou, considere dar uma estrela!
