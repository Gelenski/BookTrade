// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let imagemCapa = null;
let imagensAdicionais = [];

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await protegerPagina(["comum"]);

  if (currentUser) {
    initializeEventListeners();
    setupDragAndDrop();
  }
});

// ==================== PROTEÇÃO DE PÁGINA ====================
async function protegerPagina(tiposPermitidos = []) {
  const usuario = await verificarSessao();

  if (!usuario) {
    alert("Você precisa fazer login para acessar esta página");
    window.location.href = "/login/index.html";
    return null;
  }

  if (tiposPermitidos.length > 0 && !tiposPermitidos.includes(usuario.tipo)) {
    alert("Você não tem permissão para acessar esta página");
    const rotas = {
      admin: "/admin/index.html",
      revisor: "/revisor/index.html",
      comum: "/user/index.html",
    };
    window.location.href = rotas[usuario.tipo] || "/login/index.html";
    return null;
  }

  return usuario;
}

async function verificarSessao() {
  try {
    const response = await fetch("/api/auth/verificar-sessao", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.autenticado) {
      return data.usuario;
    }
    return null;
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    return null;
  }
}

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
  // Formulário
  const form = document.getElementById("formCadastroLivro");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  // Botões
  const btnCancelar = document.getElementById("btnCancelar");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      if (
        confirm(
          "Deseja cancelar o cadastro? Todas as informações serão perdidas."
        )
      ) {
        window.location.href = "/user/index.html";
      }
    });
  }

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }

  const btnLogoutMobile = document.getElementById("btnLogoutMobile");
  if (btnLogoutMobile) {
    btnLogoutMobile.addEventListener("click", handleLogout);
  }

  const btnFecharModal = document.getElementById("btnFecharModal");
  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", () => {
      window.location.href = "/user/";
    });
  }

  // Upload de Capa
  const inputCapa = document.getElementById("capa");
  if (inputCapa) {
    inputCapa.addEventListener("change", handleCapaChange);
  }

  // Upload de Imagens Adicionais
  const inputImagens = document.getElementById("imagens");
  if (inputImagens) {
    inputImagens.addEventListener("change", handleImagensChange);
  }

  // Validação de descrição
  const descricao = document.getElementById("descricao");
  if (descricao) {
    descricao.addEventListener("input", validateDescricao);
  }
}

// ==================== DRAG AND DROP ====================
function setupDragAndDrop() {
  const uploadAreas = document.querySelectorAll(".upload-area");

  uploadAreas.forEach((area) => {
    area.addEventListener("dragover", (e) => {
      e.preventDefault();
      area.style.borderColor = "var(--primary-color)";
      area.style.background = "rgba(37, 99, 235, 0.05)";
    });

    area.addEventListener("dragleave", (e) => {
      e.preventDefault();
      area.style.borderColor = "var(--border-color)";
      area.style.background = "transparent";
    });

    area.addEventListener("drop", (e) => {
      e.preventDefault();
      area.style.borderColor = "var(--border-color)";
      area.style.background = "transparent";

      const input = area.querySelector("input[type='file']");
      if (input) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });
}

// ==================== MANIPULAÇÃO DE IMAGENS ====================
function handleCapaChange(e) {
  const file = e.target.files[0];
  const previewContainer = document.getElementById("previewCapa");

  if (!file) {
    return;
  }

  // Validação
  if (!validateImage(file)) {
    e.target.value = "";
    return;
  }

  imagemCapa = file;

  // Preview
  const reader = new FileReader();
  reader.onload = (event) => {
    previewContainer.innerHTML = `
      <div class="preview-item">
        <img src="${event.target.result}" alt="Preview da capa" />
        <button type="button" class="btn-remove-image" onclick="removerCapa()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 1rem; height: 1rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function handleImagensChange(e) {
  const files = Array.from(e.target.files);
  const previewContainer = document.getElementById("previewImagens");

  // Validação de quantidade
  if (files.length > 3) {
    mostrarNotificacao("Máximo de 3 imagens adicionais permitidas", "error");
    e.target.value = "";
    return;
  }

  // Validação de cada arquivo
  const validFiles = [];
  for (const file of files) {
    if (validateImage(file)) {
      validFiles.push(file);
    }
  }

  if (validFiles.length === 0) {
    e.target.value = "";
    return;
  }

  imagensAdicionais = validFiles;

  // Preview
  previewContainer.innerHTML = "";
  validFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.innerHTML = `
        <img src="${event.target.result}" alt="Preview ${index + 1}" />
        <button type="button" class="btn-remove-image" onclick="removerImagem(${index})">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 1rem; height: 1rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function validateImage(file) {
  // Validar tipo
  const allowedTypes = ["image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    mostrarNotificacao("Apenas imagens PNG e JPEG são permitidas", "error");
    return false;
  }

  // Validar tamanho (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    mostrarNotificacao("Tamanho máximo de 10MB por imagem", "error");
    return false;
  }

  return true;
}

window.removerCapa = function () {
  imagemCapa = null;
  document.getElementById("capa").value = "";
  document.getElementById("previewCapa").innerHTML = "";
};

window.removerImagem = function (index) {
  imagensAdicionais.splice(index, 1);

  // Recriar preview
  const previewContainer = document.getElementById("previewImagens");
  previewContainer.innerHTML = "";

  imagensAdicionais.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.innerHTML = `
        <img src="${event.target.result}" alt="Preview ${idx + 1}" />
        <button type="button" class="btn-remove-image" onclick="removerImagem(${idx})">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 1rem; height: 1rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  // Limpar input
  document.getElementById("imagens").value = "";
};

// ==================== VALIDAÇÕES ====================
function validateDescricao() {
  const descricao = document.getElementById("descricao");
  const hint = descricao.nextElementSibling;

  if (descricao.value.length < 50) {
    hint.style.color = "var(--danger-color)";
    hint.textContent = `${descricao.value.length}/50 caracteres (mínimo)`;
    return false;
  } else {
    hint.style.color = "var(--success-color)";
    hint.textContent = `${descricao.value.length} caracteres ✓`;
    return true;
  }
}

function validateForm() {
  const titulo = document.getElementById("titulo").value.trim();
  const nomeAutor = document.getElementById("nomeAutor").value.trim();
  const nacionalidadeAutor = document
    .getElementById("nacionalidadeAutor")
    .value.trim();
  const genero = document.getElementById("genero").value;
  const anoPublicacao = document.getElementById("anoPublicacao").value;
  const isbn = document.getElementById("isbn").value.trim();
  const estado = document.getElementById("estado").value;
  const descricao = document.getElementById("descricao").value.trim();

  // Validações básicas
  if (
    !titulo ||
    !nomeAutor ||
    !nacionalidadeAutor ||
    !genero ||
    !anoPublicacao ||
    !isbn ||
    !estado ||
    !descricao
  ) {
    mostrarNotificacao("Preencha todos os campos obrigatórios", "error");
    return false;
  }

  // Validar descrição
  if (descricao.length < 50) {
    mostrarNotificacao("A descrição deve ter no mínimo 50 caracteres", "error");
    return false;
  }

  // Validar ano
  const ano = parseInt(anoPublicacao);
  if (ano < 1000 || ano > 2025) {
    mostrarNotificacao("Ano de publicação inválido", "error");
    return false;
  }

  // Validar capa
  if (!imagemCapa) {
    mostrarNotificacao("A capa do livro é obrigatória", "error");
    return false;
  }

  return true;
}

// ==================== SUBMIT DO FORMULÁRIO ====================
async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const btnSubmit = document.getElementById("btnSubmit");
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
    </svg>
    Cadastrando...
  `;

  try {
    // Criar FormData
    const formData = new FormData();
    formData.append("titulo", document.getElementById("titulo").value.trim());
    formData.append(
      "nome_autor",
      document.getElementById("nomeAutor").value.trim()
    );
    formData.append(
      "nacionalidade_autor",
      document.getElementById("nacionalidadeAutor").value.trim()
    );
    formData.append("nome_genero", document.getElementById("genero").value);
    formData.append(
      "ano_publicacao",
      document.getElementById("anoPublicacao").value
    );
    formData.append("isbn", document.getElementById("isbn").value.trim());
    formData.append("estado", document.getElementById("estado").value);
    formData.append(
      "descricao",
      document.getElementById("descricao").value.trim()
    );

    // Adicionar capa
    formData.append("capa", imagemCapa);

    // Adicionar imagens adicionais
    imagensAdicionais.forEach((imagem) => {
      formData.append("imagens", imagem);
    });

    // Enviar requisição
    const response = await fetch("/api/user/cadastrar-livro", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      // Mostrar modal de sucesso
      document.getElementById("modalSucesso").style.display = "flex";
    } else {
      mostrarNotificacao(data.message || "Erro ao cadastrar livro", "error");
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Cadastrar Livro
      `;
    }
  } catch (error) {
    console.error("Erro ao cadastrar livro:", error);
    mostrarNotificacao("Erro ao conectar com o servidor", "error");
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      Cadastrar Livro
    `;
  }
}

// ==================== LOGOUT ====================
async function handleLogout() {
  if (!confirm("Deseja realmente sair?")) {
    return;
  }

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = "/login/index.html";
    } else {
      window.location.href = "/login/index.html";
    }
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    window.location.href = "/login/index.html";
  }
}

// ==================== NOTIFICAÇÕES ====================
function mostrarNotificacao(mensagem, tipo = "error") {
  const notificacao = document.getElementById("notificacao");
  const texto = document.getElementById("notificacaoTexto");

  if (!notificacao || !texto) {
    return;
  }

  texto.textContent = mensagem;
  notificacao.className = `notificacao ${tipo}`;
  notificacao.style.display = "block";

  setTimeout(() => {
    notificacao.style.display = "none";
  }, 5000);
}

// ==================== ANIMAÇÃO DE SPIN ====================
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(style);

// Seleciona os elementos
const hamburguer = document.querySelector(".hamburguer");
const mobileNav = document.querySelector(".mobile-nav");

// Adiciona o evento de clique no botão hambúrguer
hamburguer.addEventListener("click", () => {
  // Alterna a classe 'show' no menu mobile
  mobileNav.classList.toggle("show");
});

// Fecha o menu ao clicar em qualquer link do menu mobile
const mobileLinks = document.querySelectorAll(
  ".mobile-nav a, .mobile-nav button"
);
mobileLinks.forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.classList.remove("show");
    hamburguer.classList.remove("active");
  });
});

// Fecha o menu ao clicar fora
document.addEventListener("click", (e) => {
  if (!hamburguer.contains(e.target) && !mobileNav.contains(e.target)) {
    mobileNav.classList.remove("show");
    hamburguer.classList.remove("active");
  }
});
