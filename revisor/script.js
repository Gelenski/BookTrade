// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let allBooks = [];
let filteredBooks = [];
let currentBookId = null;
let currentTab = "pendentes";
let livros = [];
let filtroAtual = "todos";
let idReprovacaoAtual = null;

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
    console.log("Livros carregados:", data);
    if (data.success) {
      // Mapear os dados do banco para o formato esperado pelo frontend
      livros = data.livros.map((livro) => ({
        id: livro.id_livro,
        titulo: livro.titulo,
        autor: livro.nome_autor,
        genero: livro.nome_genero,
        ano: livro.ano_publicacao,
        enviadoPor: livro.nome_usuario,
        dataEnvio: livro.data_postagem,
        status:
          livro.aprovado === null
            ? "pendente"
            : livro.aprovado === 1
              ? "aprovado"
              : "reprovado",
        cor: obterCorPorGenero(livro.nome_genero),
        descricao: livro.descricao || "Sem descrição disponível",
        motivoReprovacao: livro.motivo_reprovacao,
      }));

      renderizarLivros();
      await carregarEstatisticas();
    } else {
      mostrarNotificacao("Erro ao carregar livros", "erro");
    }
  } catch (error) {
    console.error("Erro ao carregar livros:", error);
    mostrarNotificacao("Erro ao conectar com o servidor", "erro");
  }
}

// Função para carregar estatísticas
async function carregarEstatisticas() {
  try {
    const response = await fetch("/api/revisor/estatisticas", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById("contagemPendentes").textContent =
        data.estatisticas.pendentes;
      document.getElementById("contagemAprovados").textContent =
        data.estatisticas.aprovadosHoje;
      document.getElementById("contagemReprovados").textContent =
        data.estatisticas.reprovadosHoje;
    }
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error);
  }
}

// Função auxiliar para obter cor baseada no gênero
function obterCorPorGenero(genero) {
  const cores = {
    Fantasia: "#8b5cf6",
    Ficção: "#ec4899",
    História: "#f59e0b",
    Suspense: "#3b82f6",
    Infantil: "#10b981",
    Romance: "#ef4444",
    Terror: "#6b7280",
    Aventura: "#14b8a6",
    Biografia: "#f97316",
    Técnico: "#8b5cf6",
  };
  return cores[genero] || "#6b7280";
}

function renderizarLivros() {
  const listaLivros = document.getElementById("listaLivros");
  const livrosFiltrados =
    filtroAtual === "todos"
      ? livros
      : livros.filter((l) => l.status === filtroAtual);

  if (livrosFiltrados.length === 0) {
    listaLivros.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #718096;">
                <p style="font-size: 1.25rem;">Nenhum livro encontrado</p>
            </div>
        `;
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

async function aprovarLivro(id) {
  try {
    const response = await fetch(`/api/livros/${id}/aprovar`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacao("Livro aprovado com sucesso!", "sucesso");
      await carregarLivros(); // Recarrega a lista
    } else {
      mostrarNotificacao(data.message || "Erro ao aprovar livro", "erro");
    }
  } catch (error) {
    console.error("Erro ao aprovar livro:", error);
    mostrarNotificacao("Erro ao conectar com o servidor", "erro");
  }
}

function abrirModalReprovar(id) {
  idReprovacaoAtual = id;
  document.getElementById("modalReprovar").classList.add("ativo");
  document.getElementById("motivoReprovacao").focus();
}

function fecharModal() {
  document.getElementById("modalReprovar").classList.remove("ativo");
  document.getElementById("motivoReprovacao").value = "";
  idReprovacaoAtual = null;
}

async function confirmarReprovacao() {
  const motivo = document.getElementById("motivoReprovacao").value;

  if (!motivo.trim()) {
    mostrarNotificacao("Por favor, informe o motivo da reprovação", "erro");
    return;
  }

  try {
    const response = await fetch(`/api/livros/${idReprovacaoAtual}/reprovar`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ motivo }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacao("Livro reprovado", "erro");
      fecharModal();
      await carregarLivros(); // Recarrega a lista
    } else {
      mostrarNotificacao(data.message || "Erro ao reprovar livro", "erro");
    }
  } catch (error) {
    console.error("Erro ao reprovar livro:", error);
    mostrarNotificacao("Erro ao conectar com o servidor", "erro");
  }
}

function mostrarNotificacao(texto, tipo) {
  const notificacao = document.getElementById("notificacao");
  const textoNotificacao = document.getElementById("textoNotificacao");

  textoNotificacao.textContent = texto;
  notificacao.className = `notificacao ${tipo} mostrar`;

  setTimeout(() => {
    notificacao.classList.remove("mostrar");
  }, 3000);
}

// Event listeners para os filtros
document.querySelectorAll(".botao-filtro").forEach((botao) => {
  botao.addEventListener("click", function () {
    document
      .querySelectorAll(".botao-filtro")
      .forEach((b) => b.classList.remove("ativo"));
    this.classList.add("ativo");
    filtroAtual = this.dataset.filtro;
    renderizarLivros();
  });
});

// Fechar modal ao clicar fora dele
document
  .getElementById("modalReprovar")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      fecharModal();
    }
  });

// Fechar modal com tecla ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    fecharModal();
  }
});

// Carregar dados ao iniciar a página
carregarLivros();
