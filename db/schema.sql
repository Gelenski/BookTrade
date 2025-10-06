DROP DATABASE IF EXISTS booktrade;

CREATE DATABASE booktrade CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE booktrade;

USE booktrade;

CREATE TABLE Endereco (
    id_endereco INT AUTO_INCREMENT PRIMARY KEY,
    cep CHAR(8) NOT NULL,
    rua VARCHAR(100) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    bairro VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL
);

CREATE TABLE Autor (
    id_autor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    nacionalidade VARCHAR(100) NOT NULL
);

CREATE TABLE Usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    cpf CHAR(11) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    status TINYINT DEFAULT 1 NOT NULL,
    tipo_usuario VARCHAR(20) NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_endereco INT NOT NULL,
    FOREIGN KEY (id_endereco) REFERENCES Endereco(id_endereco)
);

CREATE TABLE Revisor (
    id_revisor INT AUTO_INCREMENT PRIMARY KEY,
    validar TINYINT NOT NULL,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Livro (
    id_livro INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    ano_publicacao SMALLINT NOT NULL,
    id_autor INT NOT NULL,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    genero VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    data_postagem DATETIME NOT NULL,
    data_autorizacao DATETIME,
    id_usuario INT NOT NULL,
    id_revisor INT,
    FOREIGN KEY (id_autor) REFERENCES Autor(id_autor),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_revisor) REFERENCES Revisor(id_revisor)
);

CREATE TABLE Usuario_telefone (
    id_telefone INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Troca (
    id_troca INT AUTO_INCREMENT PRIMARY KEY,
    data_solicitacao DATETIME NOT NULL,
    data_conclusao DATETIME,
    status TINYINT NOT NULL,
    mensagem TEXT NOT NULL,
    id_usuario_solicitante INT NOT NULL,
    id_usuario_ofertante INT NOT NULL,
    id_livro_ofertado INT NOT NULL,
    FOREIGN KEY (id_usuario_solicitante) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_usuario_ofertante) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_livro_ofertado) REFERENCES Livro(id_livro)
);

CREATE TABLE Historico (
    id_historico INT AUTO_INCREMENT PRIMARY KEY,
    data_evento DATETIME NOT NULL,
    acao VARCHAR(100) NOT NULL,
    id_usuario INT NOT NULL,
    id_troca INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_troca) REFERENCES Troca(id_troca)
);

CREATE TABLE Avaliacao (
    id_avaliacao INT AUTO_INCREMENT PRIMARY KEY,
    nota TINYINT NOT NULL,
    comentario TEXT,
    data DATETIME NOT NULL,
    id_troca INT NOT NULL,
    id_usuario INT NOT NULL,
    id_avaliado INT NOT NULL,
    FOREIGN KEY (id_troca) REFERENCES Troca(id_troca),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_avaliado) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Favorito (
    id_favorito INT AUTO_INCREMENT PRIMARY KEY,
    data DATETIME NOT NULL,
    id_usuario INT NOT NULL,
    id_livro INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_livro) REFERENCES Livro(id_livro)
);

CREATE TABLE Ponto (
    id_ponto INT AUTO_INCREMENT PRIMARY KEY,
    quant_total INT NOT NULL,
    data_atualizacao DATETIME,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Notificacao (
    id_notificacao INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    mensagem TEXT NOT NULL,
    data_envio DATETIME NOT NULL,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Recuperacao_senha (
    id_recuperacao INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    data_solicitacao DATETIME NOT NULL,
    data_expiracao DATETIME NOT NULL,
    status TINYINT NOT NULL,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);
