// Estado da aplicação
const state = {
  searchTerm: "",
  selectedGenre: "all",
  sortBy: "title",
  viewMode: "grid",
  favorites: [],
  selectedBook: null,
  debouncedSearch: "",
  debounceTimer: null,
  books: [],
  bookImages: {},
  usuarioAutenticado: null,
};

// Elementos do DOM
const elements = {
  searchInput: document.getElementById("searchInput"),
  genreSelect: document.getElementById("genreSelect"),
  genreSelectMobile: document.getElementById("genreSelectMobile"),
  sortSelect: document.getElementById("sortSelect"),
  sortSelectMobile: document.getElementById("sortSelectMobile"),
  bookList: document.getElementById("bookList"),
  noResults: document.getElementById("noResults"),
  bookStats: document.getElementById("bookStats"),
  filterToggle: document.getElementById("filterToggle"),
  mobileFilters: document.getElementById("mobileFilters"),
  gridViewBtn: document.getElementById("gridViewBtn"),
  listViewBtn: document.getElementById("listViewBtn"),
  bookModal: document.getElementById("bookModal"),
  closeModal: document.getElementById("closeModal"),
  sendTradeBtn: document.getElementById("sendTradeBtn"),
  tradeMessage: document.getElementById("tradeMessage"),
};

// Cores para os placeholders dos livros
const bookColors = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

document.addEventListener("DOMContentLoaded", initTabs);

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".section");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      // Remove active de todos
      tabButtons.forEach((b) => b.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active"));

      // Adiciona active no selecionado
      btn.classList.add("active");
      const targetSection = document.getElementById(`section-${targetTab}`);
      if (targetSection) {
        targetSection.classList.add("active");
      }
    });
  });
}

// Função para obter cor baseada no ID
function getBookColor(id) {
  return bookColors[id % bookColors.length];
}

// Verificar sessão do usuário
async function verificarSessao() {
  try {
    const response = await fetch("/api/auth/verificar-sessao");
    const data = await response.json();

    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");

    const btnLoginMobile = document.getElementById("btnLoginMobile");
    const btnLogoutMobile = document.getElementById("btnLogoutMobile");

    if (data.success && data.autenticado) {
      state.usuarioAutenticado = data.usuario;

      //esconder botão de login
      btnLogin.style.display = "none";
      btnLoginMobile.style.display = "none";
    } else {
      state.usuarioAutenticado = null;

      btnLogout.style.display = "none";
      btnLogoutMobile.style.display = "none";
    }
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
  }
}

// Carregar livros do backend
async function carregarLivros() {
  try {
    const response = await fetch("/api/livros");
    const data = await response.json();

    if (data.success) {
      state.books = data.livros.map((livro) => ({
        id: livro.id_livro,
        title: livro.titulo,
        author: livro.autor_nome,
        genre: livro.genero_nome,
        year: livro.ano_publicacao,
        owner: livro.usuario_nome,
        ownerEmail: livro.usuario_email,
        description: livro.descricao,
        condition: livro.estado,
        isbn: livro.isbn,
        nationality: livro.autor_nacionalidade,
      }));

      // Carregar imagens de cada livro
      await carregarImagensLivros();

      initializeFilters();
      renderBooks();
    } else {
      console.error("Erro ao carregar livros");
      showError("Erro ao carregar o catálogo de livros");
    }
  } catch (error) {
    console.error("Erro ao buscar livros:", error);
    showError("Não foi possível conectar ao servidor");
  }
}

// Carregar imagens dos livros
async function carregarImagensLivros() {
  for (const book of state.books) {
    try {
      const response = await fetch(`/api/livro/${book.id}/imagens`);
      const data = await response.json();

      if (data.success && data.imagens) {
        state.bookImages[book.id] = data.imagens;
      }
    } catch (error) {
      console.error(`Erro ao carregar imagens do livro ${book.id}:`, error);
    }
  }
}

// Mostrar erro
function showError(message) {
  elements.bookList.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <svg style="width: 4rem; height: 4rem; color: #ef4444; margin: 0 auto 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <p style="font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">${message}</p>
      <button onclick="carregarLivros()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
        Tentar Novamente
      </button>
    </div>
  `;
}

// Obter imagem do livro
function getBookImage(bookId) {
  const images = state.bookImages[bookId];
  if (images && images.length > 0) {
    const capa = images.find((img) => img.tipo === "capa");
    return capa ? capa.caminho_imagem : images[0].caminho_imagem;
  }
  return null;
}

// Algoritmo de busca fuzzy
function fuzzyMatch(str, pattern) {
  const strLower = str.toLowerCase();
  const patternLower = pattern.toLowerCase();

  if (strLower.includes(patternLower)) {
    return 100;
  }

  let score = 0;
  let patternIdx = 0;

  for (
    let i = 0;
    i < strLower.length && patternIdx < patternLower.length;
    i++
  ) {
    if (strLower[i] === patternLower[patternIdx]) {
      score += 10;
      patternIdx++;
    }
  }

  return patternIdx === patternLower.length ? score : 0;
}

// Algoritmo de filtragem e ordenação
function getFilteredAndSortedBooks() {
  const result = state.books.filter((book) => {
    const matchesGenre =
      state.selectedGenre === "all" || book.genre === state.selectedGenre;

    if (!state.debouncedSearch) {
      return matchesGenre;
    }

    const titleScore = fuzzyMatch(book.title, state.debouncedSearch);
    const authorScore = fuzzyMatch(book.author, state.debouncedSearch);

    return matchesGenre && (titleScore > 0 || authorScore > 0);
  });

  result.sort((a, b) => {
    switch (state.sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "author":
        return a.author.localeCompare(b.author);
      case "year-new":
        return b.year - a.year;
      case "year-old":
        return a.year - b.year;
      case "genre":
        return a.genre.localeCompare(b.genre);
      default:
        return 0;
    }
  });

  return result;
}

// Sistema de recomendações
function getRecommendations(bookId) {
  const book = state.books.find((b) => b.id === bookId);
  if (!book) {
    return [];
  }

  return state.books
    .filter((b) => b.id !== bookId && b.genre === book.genre)
    .slice(0, 3);
}

// Gerenciar favoritos
function toggleFavorite(bookId) {
  const index = state.favorites.indexOf(bookId);
  if (index > -1) {
    state.favorites.splice(index, 1);
  } else {
    state.favorites.push(bookId);
  }
  localStorage.setItem("favorites", JSON.stringify(state.favorites));
  renderBooks();
  if (state.selectedBook && state.selectedBook.id === bookId) {
    updateModalFavoriteButton();
  }
}

// TODO ALTERAR ! PRECISA ALTERAR NO BANCO
function loadFavorites() {
  const saved = localStorage.getItem("favorites");
  if (saved) {
    state.favorites = JSON.parse(saved);
  }
}

// Atualizar estatísticas
function updateStats() {
  const filteredBooks = getFilteredAndSortedBooks();
  let text = `${filteredBooks.length} ${filteredBooks.length === 1 ? "livro encontrado" : "livros encontrados"}`;

  if (state.favorites.length > 0) {
    text += ` • ${state.favorites.length} favorito${state.favorites.length > 1 ? "s" : ""}`;
  }

  elements.bookStats.textContent = text;
}

// Renderizar livros
function renderBooks() {
  const filteredBooks = getFilteredAndSortedBooks();

  elements.bookList.innerHTML = "";

  if (filteredBooks.length === 0) {
    elements.noResults.style.display = "block";
    elements.bookList.style.display = "none";
  } else {
    elements.noResults.style.display = "none";
    elements.bookList.style.display = "grid";

    filteredBooks.forEach((book) => {
      const card = createBookCard(book);
      elements.bookList.appendChild(card);
    });
  }

  updateStats();
}

// Criar card de livro
function createBookCard(book) {
  const card = document.createElement("div");
  card.className = "book-card";
  card.onclick = () => openBookModal(book);

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "book-image-wrapper";

  const imageContent = document.createElement("div");
  imageContent.className = "book-image-content";

  const bookImage = getBookImage(book.id);

  if (bookImage) {
    imageContent.style.backgroundImage = `url(${bookImage})`;
    imageContent.style.backgroundSize = "cover";
    imageContent.style.backgroundPosition = "center";
  } else {
    imageContent.style.backgroundColor = getBookColor(book.id);
    imageContent.innerHTML = `
      <svg class="book-image-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
      </svg>
      <p class="book-image-title">${book.title}</p>
    `;
  }

  imageWrapper.appendChild(imageContent);

  const content = document.createElement("div");
  content.className = "book-content";

  const titleRow = document.createElement("div");
  titleRow.className = "book-title-row";

  const title = document.createElement("h3");
  title.className = "book-title";
  title.textContent = book.title;

  const favoriteBtn = document.createElement("button");
  favoriteBtn.className = "btn-favorite";
  favoriteBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(book.id);
  };

  const heartIcon = document.createElement("svg");
  heartIcon.className = `icon-heart ${state.favorites.includes(book.id) ? "active" : ""}`;
  heartIcon.setAttribute(
    "fill",
    state.favorites.includes(book.id) ? "currentColor" : "none"
  );
  heartIcon.setAttribute("stroke", "currentColor");
  heartIcon.setAttribute("viewBox", "0 0 24 24");
  heartIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>`;

  favoriteBtn.appendChild(heartIcon);
  titleRow.appendChild(title);
  titleRow.appendChild(favoriteBtn);

  const author = document.createElement("p");
  author.className = "book-author";
  author.textContent = book.author;

  const tags = document.createElement("div");
  tags.className = "book-tags";
  tags.innerHTML = `
    <span class="tag tag-genre">${book.genre}</span>
    <span class="tag tag-year">
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      ${book.year}
    </span>
  `;

  const owner = document.createElement("p");
  owner.className = "book-owner";
  owner.innerHTML = `Dono: <strong>${book.owner}</strong>`;

  const detailsBtn = document.createElement("button");
  detailsBtn.className = "btn-details";
  detailsBtn.onclick = (e) => {
    e.stopPropagation();
    openBookModal(book);
  };
  detailsBtn.innerHTML = `
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
    </svg>
    Ver Detalhes
  `;

  content.appendChild(titleRow);
  content.appendChild(author);
  content.appendChild(tags);
  content.appendChild(owner);
  content.appendChild(detailsBtn);

  card.appendChild(imageWrapper);
  card.appendChild(content);

  return card;
}

// Abrir modal de detalhes
function openBookModal(book) {
  state.selectedBook = book;
  elements.tradeMessage.value = "";

  const modalImage = document.getElementById("modalBookImage");
  const bookImage = getBookImage(book.id);

  if (bookImage) {
    modalImage.style.backgroundImage = `url(${bookImage})`;
    modalImage.style.backgroundSize = "cover";
    modalImage.style.backgroundPosition = "center";
    modalImage.innerHTML = "";
  } else {
    modalImage.style.backgroundColor = getBookColor(book.id);
    modalImage.style.backgroundImage = "none";
    modalImage.innerHTML = `
      <svg style="width: 5rem; height: 5rem; color: white; opacity: 0.5; margin-bottom: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
      </svg>
      <p style="color: white; font-weight: 700; opacity: 0.75;">${book.title}</p>
    `;
  }

  document.getElementById("modalBookTitle").textContent = book.title;
  document.getElementById("modalBookAuthor").textContent = book.author;
  document.getElementById("modalBookDescription").textContent =
    book.description;

  document.getElementById("modalBookTags").innerHTML = `
    <span class="tag tag-genre">${book.genre}</span>
    <span class="tag tag-year">
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      ${book.year}
    </span>
    <span class="tag" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">${book.condition}</span>
  `;

  document.getElementById("modalBookDetails").innerHTML = `
    <p><strong>ISBN:</strong> ${book.isbn}</p>
    <p><strong>Estado:</strong> ${book.condition}</p>
    <p><strong>Nacionalidade do Autor:</strong> ${book.nationality}</p>
  `;

  document.getElementById("modalOwnerInfo").innerHTML = `
    <p>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
      <strong>${book.owner}</strong>
    </p>
    <p>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
      </svg>
      ${book.ownerEmail}
    </p>
  `;

  const recommendations = getRecommendations(book.id);
  const recoSection = document.getElementById("modalRecommendations");
  const recoList = document.getElementById("recommendationsList");

  if (recommendations.length > 0) {
    recoSection.style.display = "block";
    recoList.innerHTML = recommendations
      .map((rec) => {
        const recImage = getBookImage(rec.id);
        const recImageStyle = recImage
          ? `background-image: url(${recImage}); background-size: cover; background-position: center;`
          : `background-color: ${getBookColor(rec.id)};`;

        return `
      <div class="recommendation-card" onclick="openBookModal(state.books.find(b => b.id === ${rec.id}))">
        <div class="recommendation-image" style="${recImageStyle}">
          ${
            !recImage
              ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>`
              : ""
          }
        </div>
        <div class="recommendation-info">
          <p class="recommendation-title">${rec.title}</p>
          <p class="recommendation-author">${rec.author}</p>
        </div>
      </div>
    `;
      })
      .join("");
  } else {
    recoSection.style.display = "none";
  }

  updateModalFavoriteButton();
  elements.bookModal.style.display = "flex";
}

// Atualizar botão de favorito no modal
function updateModalFavoriteButton() {
  const favoriteBtn = document.getElementById("modalFavoriteBtn");
  const heartIcon = favoriteBtn.querySelector(".icon-heart");
  const isFavorite = state.favorites.includes(state.selectedBook.id);

  heartIcon.classList.toggle("active", isFavorite);
  heartIcon.setAttribute("fill", isFavorite ? "currentColor" : "none");
}

// Fechar modal
function closeBookModal() {
  elements.bookModal.style.display = "none";
  state.selectedBook = null;
}

// Enviar solicitação de troca
async function sendTradeRequest() {
  const message = elements.tradeMessage.value.trim();

  if (!message) {
    alert("Por favor, escreva uma mensagem para o dono do livro!");
    return;
  }

  if (!state.usuarioAutenticado) {
    alert("Você precisa estar autenticado para solicitar uma troca!");
    return;
  }

  try {
    const response = await fetch("/api/trade/solicitar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_livro_solicitado: state.selectedBook.id,
        mensagem: message,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert(
        `Solicitação enviada com sucesso para ${state.selectedBook.owner}!`
      );
      closeBookModal();
    } else {
      alert(data.message || "Erro ao enviar solicitação");
    }
  } catch (error) {
    console.error("Erro ao enviar solicitação:", error);
    alert("Erro ao enviar solicitação. Tente novamente.");
  }
}

// Debounce para busca
function handleSearchInput(value) {
  state.searchTerm = value;

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  state.debounceTimer = setTimeout(() => {
    state.debouncedSearch = value;
    renderBooks();
  }, 300);
}

// Alternar visualização
function setViewMode(mode) {
  state.viewMode = mode;
  elements.bookList.className = `book-list ${mode}-view`;

  elements.gridViewBtn.classList.toggle("active", mode === "grid");
  elements.listViewBtn.classList.toggle("active", mode === "list");
}

// Inicializar filtros
function initializeFilters() {
  const genres = Array.from(
    new Set(state.books.map((book) => book.genre))
  ).sort();

  elements.genreSelect.innerHTML =
    '<option value="all">Todos os gêneros</option>';
  elements.genreSelectMobile.innerHTML =
    '<option value="all">Todos os gêneros</option>';

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    elements.genreSelect.appendChild(option.cloneNode(true));
    elements.genreSelectMobile.appendChild(option);
  });
}

// Event Listeners
elements.searchInput.addEventListener("input", (e) =>
  handleSearchInput(e.target.value)
);

elements.genreSelect.addEventListener("change", (e) => {
  state.selectedGenre = e.target.value;
  elements.genreSelectMobile.value = e.target.value;
  renderBooks();
});

elements.genreSelectMobile.addEventListener("change", (e) => {
  state.selectedGenre = e.target.value;
  elements.genreSelect.value = e.target.value;
  renderBooks();
});

elements.sortSelect.addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  elements.sortSelectMobile.value = e.target.value;
  renderBooks();
});

elements.sortSelectMobile.addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  elements.sortSelect.value = e.target.value;
  renderBooks();
});

elements.filterToggle.addEventListener("click", () => {
  const isVisible = elements.mobileFilters.style.display === "flex";
  elements.mobileFilters.style.display = isVisible ? "none" : "flex";
});

elements.gridViewBtn.addEventListener("click", () => setViewMode("grid"));
elements.listViewBtn.addEventListener("click", () => setViewMode("list"));

elements.closeModal.addEventListener("click", closeBookModal);
elements.bookModal.addEventListener("click", (e) => {
  if (e.target === elements.bookModal) {
    closeBookModal();
  }
});

document.getElementById("modalFavoriteBtn").addEventListener("click", () => {
  toggleFavorite(state.selectedBook.id);
});

elements.sendTradeBtn.addEventListener("click", sendTradeRequest);
//===========LOGOUT============
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

const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", handleLogout);
}

const btnLogoutMobile = document.getElementById("btnLogoutMobile");
if (btnLogoutMobile) {
  btnLogoutMobile.addEventListener("click", handleLogout);
}
// Inicialização
async function inicializar() {
  await verificarSessao();
  loadFavorites();
  await carregarLivros();
}
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

inicializar();
