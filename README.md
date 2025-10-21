# 📚 BookTrade

Sistema completo de troca de livros entre usuários com gerenciamento administrativo e recuperação de senha.

## 📋 Índice

- [Sobre](#sobre)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando o projeto](#executando-o-projeto)
- [Estrutura do projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Tipos de usuário](#tipos-de-usuário)
- [Scripts disponíveis](#scripts-disponíveis)
- [Contribuindo](#contribuindo)

## 🔍 Sobre

BookTrade é uma plataforma completa que permite usuários cadastrarem seus livros e realizarem trocas com outros leitores. O sistema possui três níveis de acesso (comum, revisor e administrador) e funcionalidades avançadas como recuperação de senha por e-mail, gerenciamento de usuários e relatórios.

## ✨ Funcionalidades

### Para todos os usuários

- ✅ Cadastro com validação de CPF e e-mail
- ✅ Login seguro com senha criptografada
- ✅ Recuperação de senha via e-mail
- ✅ Busca automática de endereço por CEP (ViaCEP)

### Para administradores

- 👥 Gerenciamento completo de usuários
- 🔍 Busca e filtros avançados
- ➕ Cadastro de revisores
- ✏️ Edição de perfis de usuários
- 🗑️ Exclusão de usuários
- 📊 Geração de relatórios de trocas
- 📄 Exportação de relatórios (em desenvolvimento)

### Para revisores

- 📖 Validação de livros cadastrados
- ✅ Aprovação/rejeição de trocas

### Para usuários comuns

- 📚 Cadastro de livros pessoais
- 🔄 Solicitação de trocas
- ⭐ Sistema de avaliações

## 🚀 Tecnologias

### Backend

- **Node.js** - Ambiente de execução JavaScript
- **Express** - Framework web
- **MySQL** - Banco de dados relacional
- **bcrypt** - Criptografia de senhas
- **nodemailer** - Envio de e-mails

### Frontend

- **HTML5** - Estrutura das páginas
- **CSS3** - Estilização moderna e responsiva
- **JavaScript (Vanilla)** - Interatividade

### Ferramentas de desenvolvimento

- **ESLint** - Linter para qualidade de código
- **Prettier** - Formatação de código
- **Nodemon** - Reinicialização automática do servidor
- **dotenv** - Gerenciamento de variáveis de ambiente

### APIs Externas

- **ViaCEP** - Busca automática de endereços

## 📦 Pré-requisitos

Antes de começar, você precisará ter instalado:

- [Node.js](https://nodejs.org/) (versão 14 ou superior)
- [MySQL](https://www.mysql.com/) (versão 8 ou superior)
- [Git](https://git-scm.com/)
- Uma conta Gmail para envio de e-mails (ou outro serviço SMTP)

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

```bash
# Acesse o MySQL
mysql -u root -p

# Execute os comandos SQL
source db/schema.sql
```

Ou copie e execute o conteúdo do arquivo `db/schema.sql` no seu cliente MySQL.

## ⚙️ Configuração

1. Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
# Banco de Dados
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=booktrade
DB_PORT=3306

# E-mail (Gmail)
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app
```

2. **Configuração do Gmail para envio de e-mails:**
   - Acesse sua [Conta Google](https://myaccount.google.com/)
   - Vá em "Segurança"
   - Ative a "Verificação em duas etapas"
   - Crie uma "Senha de app" para o projeto
   - Use essa senha no `EMAIL_PASS` do arquivo `.env`

3. Ajuste as credenciais de acordo com sua instalação do MySQL.

## ▶️ Executando o projeto

### Modo desenvolvimento (com auto-reload):

```bash
npm run dev
```

### Modo produção:

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

### Páginas disponíveis:

- **Login**: http://localhost:3000/login/
- **Cadastro**: http://localhost:3000/cadastro/
- **Recuperar senha**: http://localhost:3000/recuperar/
- **Dashboard Admin**: http://localhost:3000/admin/
- **Dashboard Revisor**: http://localhost:3000/gestor/
- **Dashboard Usuário**: http://localhost:3000/user/

## 📁 Estrutura do projeto

```
BookTrade/
├── admin/                    # Dashboard administrativo
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── cadastro/                 # Página de cadastro
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── login/                    # Página de login
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── recuperar/                # Recuperação de senha
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── redefinir/                # Redefinição de senha
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── gestor/                   # Dashboard do revisor
│   └── index.html
├── user/                     # Dashboard do usuário comum
│   └── index.html
├── db/                       # Banco de dados
│   ├── database.js          # Configuração de conexão
│   └── schema.sql           # Schema do banco
├── utils/                    # Utilitários
│   ├── email.js             # Envio de e-mails
│   └── token.js             # Geração de tokens
├── .env.example             # Exemplo de variáveis de ambiente
├── .gitignore               # Arquivos ignorados pelo Git
├── .prettierrc              # Configuração do Prettier
├── eslint.config.mjs        # Configuração do ESLint
├── server.js                # Servidor principal
├── package.json             # Dependências e scripts
└── README.md                # Documentação
```

## 🔌 API Endpoints

### Autenticação

#### Cadastro de usuário

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
  "cidade": "string"
}
```

#### Login

```http
POST /api/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

#### Recuperar senha

```http
POST /recuperar
Content-Type: application/json

{
  "email": "string"
}
```

#### Redefinir senha

```http
POST /redefinir
Content-Type: application/json

{
  "token": "string",
  "novaSenha": "string"
}
```

### Usuários (Admin)

#### Listar usuários

```http
GET /api/users
```

#### Cadastrar revisor

```http
POST /api/cadastro-revisor
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
  "cidade": "string"
}
```

#### Atualizar usuário

```http
PUT /api/atualizar-usuario/:id
Content-Type: application/json

{
  "nome": "string",
  "email": "string",
  "cpf": "string",
  "telefone": "string",
  "tipo_usuario": "string",
  "status": number
}
```

#### Deletar usuário

```http
DELETE /api/deletar-usuario/:id
```

## 👥 Tipos de usuário

### 1. Comum

- Usuário padrão do sistema
- Pode cadastrar livros
- Pode solicitar e realizar trocas
- Pode avaliar outras pessoas

### 2. Revisor

- Valida livros cadastrados
- Aprova ou rejeita trocas
- Visualiza relatórios

### 3. Administrador

- Acesso total ao sistema
- Gerencia usuários (criar, editar, excluir)
- Cadastra revisores
- Gera relatórios
- Configura o sistema

## 📝 Scripts disponíveis

```bash
# Inicia o servidor em modo produção
npm start

# Inicia o servidor em modo desenvolvimento (com nodemon)
npm run dev

# Formata o código com Prettier
npm run format

# Verifica formatação do código
npm run format:check

# Executa o linter
npm run lint

# Corrige problemas do linter automaticamente
npm run lint:fix

# Prepara o código (formata e corrige)
npm run prepare
```

## 🤝 Contribuindo

Contribuições são sempre bem-vindas! Siga os passos abaixo:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Rode npm run prepare antes de fazer o commit
4. Commit suas mudanças (`git commit -m 'Add: nova feature'`)
5. Push para a branch (`git push origin feature/MinhaFeature`)
6. Abra um Pull Request

### Padrão de commits

Siga o padrão de commits para manter o histórico organizado:

- `Feature:` para novas funcionalidades
- `Bugfix:` para correções de bugs
- `Update:` para atualizações de funcionalidades existentes
- `Docs:` para alterações na documentação
- `Style:` para formatação, espaços em branco, etc.
- `Refactor:` para refatoração de código

### Boas práticas

- Mantenha o código limpo e bem documentado
- Execute `npm run prepare` antes de fazer commit
- Teste suas alterações localmente
- Atualize a documentação quando necessário

## 📋 TODO

- [ ] Implementar exportação de relatórios em PDF
- [ ] Desenvolver catálogo completo do usuário comum
- [ ] Desenvolver página completa do revisor
- [ ] Adicionar sistema de notificações em tempo real
- [ ] Implementar sistema de pontos
- [ ] Implementar favoritos de livros
- [ ] Criar sistema de avaliações
- [ ] Sessão de login

## 📝 Licença

Este projeto está sob a licença ISC.

## 👨‍💻 Autor

Desenvolvido por [Gelenski](https://github.com/Gelenski), [Adrian](https://github.com/adriankkj), [Gustavo] & [Gabriel].

## 📞 Suporte

Se você encontrar algum problema ou tiver sugestões, por favor:

- Abra uma [issue](https://github.com/Gelenski/BookTrade/issues)
- Entre em contato através do GitHub

---

⭐ Se este projeto te ajudou, considere dar uma estrela no repositório!
