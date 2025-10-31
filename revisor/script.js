// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let allBooks = [];
let filteredBooks = [];
let currentBookId = null;
let currentTab = "pendentes";

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await protegerPagina(["revisor", "admin"]);
  exibirNomeUsuario(currentUser, "nome-revisor");
  initTabs();
  initModalHandlers();
  initFilters();
  loadBooks();
  loadGenres();
});

// ==================== NAVEGAÇÃO ENTRE ABAS ====================
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".section");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      currentTab = targetTab;

      tabButtons.forEach((b) => b.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active"));

      btn.classList.add("active");
      const targetSection = document.getElementById(`section-${targetTab}`);
      if (targetSection) {
        targetSection.classList.add("active");
      }

      renderBooks();
    });
  });
}

// ==================== CARREGAMENTO DE DADOS ====================
async function loadBooks() {
  try {
    showLoading();

    const response = await fetch("/api/livros", {
      credentials: "include",
    });

    if (response.status === 401) {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/login/index.html";
      return;
    }

    const data = await response.json();

    if (data.success) {
      allBooks = data.livros;
      filteredBooks = [...allBooks];
      renderBooks();
    } else {
      alert(data.message || "Erro ao carregar livros");
    }
  } catch (error) {
    console.error("Erro ao carregar livros:", error);
    alert("Erro ao conectar com o servidor");
  }
}

async function loadGenres() {
  try {
    const response = await fetch("/api/generos", {
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      const select = document.getElementById("filter-genre");
      data.generos.forEach((genero) => {
        const option = document.createElement("option");
        option.value = genero.id_genero;
        option.textContent = genero.nome;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Erro ao carregar gêneros:", error);
  }
}

// ==================== RENDERIZAÇÃO ====================
function renderBooks() {
  const status = getStatusFromTab(currentTab);
  const booksToRender = filteredBooks.filter((book) => {
    if (status === "pendente") {
      return !book.data_autorizacao;
    }
    if (status === "aprovado") {
      return book.data_autorizacao && book.aprovado;
    }
    if (status === "reprovado") {
      return book.data_autorizacao && !book.aprovado;
    }
    return false;
  });

  const containerId = `books-${currentTab === "pendentes" ? "pending" : currentTab === "aprovados" ? "approved" : "rejected"}`;
  const emptyId = `empty-${currentTab === "pendentes" ? "pending" : currentTab === "aprovados" ? "approved" : "rejected"}`;

  const container = document.getElementById(containerId);
  const emptyState = document.getElementById(emptyId);

  if (!container || !emptyState) {
    return;
  }

  container.innerHTML = "";

  if (booksToRender.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  booksToRender.forEach((book) => {
    const card = createBookCard(book);
    container.appendChild(card);
  });
}

function createBookCard(book) {
  const card = document.createElement("div");
  card.className = "book-card";
  card.onclick = () => openBookModal(book);

  const statusClass = book.data_autorizacao
    ? book.aprovado
      ? "aprovado"
      : "reprovado"
    : "pendente";

  const statusText = book.data_autorizacao
    ? book.aprovado
      ? "Aprovado"
      : "Reprovado"
    : "Pendente";

  card.innerHTML = `
    <span class="book-status ${statusClass}">${statusText}</span>
    <h3 class="book-title">${book.titulo}</h3>
    <p class="book-author">por ${book.autor_nome}</p>
    <div class="book-info">
      <div class="book-info-item">
        <span class="book-info-label">Gênero:</span>
        <span class="book-info-value">${book.genero_nome}</span>
      </div>
      <div class="book-info-item">
        <span class="book-info-label">Ano:</span>
        <span class="book-info-value">${book.ano_publicacao}</span>
      </div>
      <div class="book-info-item">
        <span class="book-info-label">Estado:</span>
        <span class="book-info-value">${capitalizeFirst(book.estado)}</span>
      </div>
      <div class="book-info-item">
        <span class="book-info-label">Publicado em:</span>
        <span class="book-info-value">${formatDate(book.data_postagem)}</span>
      </div>
    </div>
  `;

  return card;
}

function showLoading() {
  const containers = ["books-pending", "books-approved", "books-rejected"];
  containers.forEach((id) => {
    const container = document.getElementById(id);
    if (container) {
      container.innerHTML = '<div class="loading">Carregando livros</div>';
    }
  });
}

// ==================== MODAL ====================
function initModalHandlers() {
  const modalRevisar = document.getElementById("modal-revisar");
  const modalVisualizar = document.getElementById("modal-visualizar");
  const closeBtn = document.getElementById("modal-close");
  const viewCloseBtn = document.getElementById("modal-view-close");
  const cancelBtn = document.getElementById("btn-cancel");
  const btnViewClose = document.getElementById("btn-view-close");
  const btnAprovar = document.getElementById("btn-aprovar");
  const btnReprovar = document.getElementById("btn-reprovar");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }
  if (viewCloseBtn) {
    viewCloseBtn.addEventListener("click", closeViewModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeModal);
  }
  if (btnViewClose) {
    btnViewClose.addEventListener("click", closeViewModal);
  }
  if (btnAprovar) {
    btnAprovar.addEventListener("click", handleAprovar);
  }
  if (btnReprovar) {
    btnReprovar.addEventListener("click", handleReprovar);
  }

  // Logout
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }

  // Fecha modal ao clicar fora
  if (modalRevisar) {
    modalRevisar.addEventListener("click", (e) => {
      if (e.target === modalRevisar) {
        closeModal();
      }
    });
  }

  if (modalVisualizar) {
    modalVisualizar.addEventListener("click", (e) => {
      if (e.target === modalVisualizar) {
        closeViewModal();
      }
    });
  }
}

function openBookModal(book) {
  currentBookId = book.id_livro;

  // Se o livro já foi revisado, abre modal de visualização
  if (book.data_autorizacao) {
    openViewModal(book);
    return;
  }

  // Preenche o modal de revisão
  document.getElementById("detail-titulo").textContent = book.titulo;
  document.getElementById("detail-autor").textContent = book.autor_nome;
  document.getElementById("detail-genero").textContent = book.genero_nome;
  document.getElementById("detail-ano").textContent = book.ano_publicacao;
  document.getElementById("detail-isbn").textContent = book.isbn;
  document.getElementById("detail-estado").textContent = capitalizeFirst(
    book.estado
  );
  document.getElementById("detail-usuario").textContent =
    `${book.usuario_nome} (${book.usuario_email})`;
  document.getElementById("detail-data").textContent = formatDate(
    book.data_postagem
  );
  document.getElementById("detail-descricao").textContent = book.descricao;
  document.getElementById("observacao").value = "";

  const modal = document.getElementById("modal-revisar");
  if (modal) {
    modal.classList.add("active");
  }
}

function openViewModal(book) {
  document.getElementById("view-titulo").textContent = book.titulo;
  document.getElementById("view-autor").textContent = book.autor_nome;
  document.getElementById("view-genero").textContent = book.genero_nome;
  document.getElementById("view-ano").textContent = book.ano_publicacao;
  document.getElementById("view-isbn").textContent = book.isbn;
  document.getElementById("view-estado").textContent = capitalizeFirst(
    book.estado
  );
  document.getElementById("view-usuario").textContent =
    `${book.usuario_nome} (${book.usuario_email})`;
  document.getElementById("view-data-revisao").textContent =
    book.data_autorizacao ? formatDate(book.data_autorizacao) : "N/A";
  document.getElementById("view-descricao").textContent = book.descricao;

  // Mostra observação apenas se existir
  const obsContainer = document.getElementById("view-observacao-container");
  const obsText = document.getElementById("view-observacao");
  if (book.observacao_revisao) {
    obsText.textContent = book.observacao_revisao;
    obsContainer.style.display = "flex";
  } else {
    obsContainer.style.display = "none";
  }

  const modal = document.getElementById("modal-visualizar");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeModal() {
  const modal = document.getElementById("modal-revisar");
  if (modal) {
    modal.classList.remove("active");
  }
  currentBookId = null;
}

function closeViewModal() {
  const modal = document.getElementById("modal-visualizar");
  if (modal) {
    modal.classList.remove("active");
  }
}

// ==================== AÇÕES DE REVISÃO ====================
async function handleAprovar() {
  if (!currentBookId) {
    return;
  }

  if (!confirm("Tem certeza que deseja aprovar este livro?")) {
    return;
  }

  const observacao = document.getElementById("observacao").value.trim();

  try {
    const response = await fetch("/api/revisar-livro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id_livro: currentBookId,
        aprovado: true,
        observacao: observacao || null,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Livro aprovado com sucesso!");
      closeModal();
      loadBooks();
    } else {
      alert(data.message || "Erro ao aprovar livro");
    }
  } catch (error) {
    console.error("Erro ao aprovar livro:", error);
    alert("Erro ao conectar com o servidor");
  }
}

async function handleReprovar() {
  if (!currentBookId) {
    return;
  }

  const observacao = document.getElementById("observacao").value.trim();

  if (!observacao) {
    alert(
      "Por favor, informe uma observação explicando o motivo da reprovação."
    );
    return;
  }

  if (!confirm("Tem certeza que deseja reprovar este livro?")) {
    return;
  }

  try {
    const response = await fetch("/api/revisar-livro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id_livro: currentBookId,
        aprovado: false,
        observacao: observacao,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert(
        "Livro reprovado. O usuário receberá um e-mail com sua observação."
      );
      closeModal();
      loadBooks();
    } else {
      alert(data.message || "Erro ao reprovar livro");
    }
  } catch (error) {
    console.error("Erro ao reprovar livro:", error);
    alert("Erro ao conectar com o servidor");
  }
}

// ==================== FILTROS ====================
function initFilters() {
  const searchInput = document.getElementById("search-book");
  const genreFilter = document.getElementById("filter-genre");

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (genreFilter) {
    genreFilter.addEventListener("change", applyFilters);
  }
}

function applyFilters() {
  const searchInput = document.getElementById("search-book");
  const genreFilter = document.getElementById("filter-genre");

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const genreId = genreFilter ? genreFilter.value : "";

  filteredBooks = allBooks.filter((book) => {
    const matchesSearch =
      book.titulo.toLowerCase().includes(searchTerm) ||
      book.autor_nome.toLowerCase().includes(searchTerm);

    const matchesGenre = !genreId || book.id_genero === parseInt(genreId);

    return matchesSearch && matchesGenre;
  });

  renderBooks();
}

// ==================== UTILITÁRIOS ====================
function getStatusFromTab(tab) {
  switch (tab) {
    case "pendentes":
      return "pendente";
    case "aprovados":
      return "aprovado";
    case "reprovados":
      return "reprovado";
    default:
      return "pendente";
  }
}

function formatDate(dateString) {
  if (!dateString) {
    return "N/A";
  }
  const date = new Date(dateString);
  return (
    date.toLocaleDateString("pt-BR") +
    " " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

function capitalizeFirst(str) {
  if (!str) {
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function handleLogout() {
  if (!confirm("Deseja realmente sair?")) {
    return;
  }

  try {
    const response = await fetch("/api/logout", {
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

// ==================== AUTENTICAÇÃO ====================
async function verificarSessao() {
  try {
    const response = await fetch("/api/verificar-sessao", {
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
      revisor: "/gestor/index.html",
      comum: "/user/index.html",
    };
    window.location.href = rotas[usuario.tipo] || "/login/index.html";
    return null;
  }

  return usuario;
}

function exibirNomeUsuario(usuario, elementoId) {
  const elemento = document.getElementById(elementoId);
  if (elemento && usuario) {
    elemento.textContent = usuario.nome;
  }
}
