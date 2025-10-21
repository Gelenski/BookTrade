// Dados dos livros
const books = [
  {
    id: 1,
    title: "Dom Casmurro",
    author: "Machado de Assis",
    genre: "Clássico",
    year: 1899,
    owner: "Maria Silva",
    ownerEmail: "maria.silva@email.com",
    ownerPhone: "(11) 98765-4321",
    description: "Uma das obras-primas de Machado de Assis, que narra a história de Bentinho e Capitu, um dos romances mais intrigantes da literatura brasileira.",
    condition: "Muito Bom",
    pages: 256,
  },
  {
    id: 2,
    title: "1984",
    author: "George Orwell",
    genre: "Ficção",
    year: 1949,
    owner: "João Santos",
    ownerEmail: "joao.santos@email.com",
    ownerPhone: "(21) 91234-5678",
    description: "Distopia clássica que retrata um futuro totalitário onde o Grande Irmão controla todos os aspectos da vida.",
    condition: "Bom",
    pages: 416,
  },
  {
    id: 3,
    title: "O Pequeno Príncipe",
    author: "Antoine de Saint-Exupéry",
    genre: "Infantil",
    year: 1943,
    owner: "Ana Costa",
    ownerEmail: "ana.costa@email.com",
    ownerPhone: "(11) 99876-5432",
    description: "Fábula poética sobre um pequeno príncipe que viaja por diversos planetas, repleta de ensinamentos sobre amor e amizade.",
    condition: "Excelente",
    pages: 96,
  },
  {
    id: 4,
    title: "Harry Potter e a Pedra Filosofal",
    author: "J.K. Rowling",
    genre: "Fantasia",
    year: 1997,
    owner: "Pedro Lima",
    ownerEmail: "pedro.lima@email.com",
    ownerPhone: "(85) 98888-7777",
    description: "O início da saga do bruxo mais famoso do mundo. Harry descobre que é um bruxo e inicia sua jornada em Hogwarts.",
    condition: "Muito Bom",
    pages: 264,
  },
  {
    id: 5,
    title: "O Senhor dos Anéis",
    author: "J.R.R. Tolkien",
    genre: "Fantasia",
    year: 1954,
    owner: "Lucas Ferreira",
    ownerEmail: "lucas.ferreira@email.com",
    ownerPhone: "(41) 97777-6666",
    description: "Épico de fantasia sobre a jornada de Frodo para destruir o Um Anel e salvar a Terra-média da escuridão.",
    condition: "Bom",
    pages: 1178,
  },
  {
    id: 6,
    title: "Cem Anos de Solidão",
    author: "Gabriel García Márquez",
    genre: "Clássico",
    year: 1967,
    owner: "Carla Souza",
    ownerEmail: "carla.souza@email.com",
    ownerPhone: "(31) 96666-5555",
    description: "Obra-prima do realismo mágico que conta a saga da família Buendía na fictícia cidade de Macondo.",
    condition: "Muito Bom",
    pages: 432,
  },
  {
    id: 7,
    title: "O Hobbit",
    author: "J.R.R. Tolkien",
    genre: "Fantasia",
    year: 1937,
    owner: "Rafael Alves",
    ownerEmail: "rafael.alves@email.com",
    ownerPhone: "(48) 95555-4444",
    description: "A aventura de Bilbo Bolseiro com um grupo de anões para recuperar um tesouro guardado por um dragão.",
    condition: "Excelente",
    pages: 310,
  },
  {
    id: 8,
    title: "Sapiens",
    author: "Yuval Noah Harari",
    genre: "Não-ficção",
    year: 2011,
    owner: "Juliana Rocha",
    ownerEmail: "juliana.rocha@email.com",
    ownerPhone: "(61) 94444-3333",
    description: "Uma breve história da humanidade, desde os primórdios até os dias atuais, explorando como nos tornamos a espécie dominante.",
    condition: "Muito Bom",
    pages: 464,
  },
];

// Estado da aplicação
let state = {
  searchTerm: "",
  selectedGenre: "all",
  sortBy: "title",
  viewMode: "grid",
  favorites: [],
  selectedBook: null,
  debouncedSearch: "",
  debounceTimer: null,
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
const bookColors = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444"];

// Função para obter cor baseada no ID
function getBookColor(id) {
  return bookColors[id % bookColors.length];
}

// Algoritmo de busca fuzzy
function fuzzyMatch(str, pattern) {
  const strLower = str.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // Busca exata tem prioridade
  if (strLower.includes(patternLower)) return 100;

  // Busca fuzzy - permite alguns erros
  let score = 0;
  let patternIdx = 0;

  for (let i = 0; i < strLower.length && patternIdx < patternLower.length; i++) {
    if (strLower[i] === patternLower[patternIdx]) {
      score += 10;
      patternIdx++;
    }
  }

  return patternIdx === patternLower.length ? score : 0;
}

// Algoritmo de filtragem e ordenação
function getFilteredAndSortedBooks() {
  let result = books.filter((book) => {
    // Filtro por gênero
    const matchesGenre = state.selectedGenre === "all" || book.genre === state.selectedGenre;

    // Filtro por busca com algoritmo fuzzy
    if (!state.debouncedSearch) return matchesGenre;

    const titleScore = fuzzyMatch(book.title, state.debouncedSearch);
    const authorScore = fuzzyMatch(book.author, state.debouncedSearch);

    return matchesGenre && (titleScore > 0 || authorScore > 0);
  });

  // Algoritmo de ordenação
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
  const book = books.find((b) => b.id === bookId);
  if (!book) return [];

  return books.filter((b) => b.id !== bookId && b.genre === book.genre).slice(0, 3);
}

// Gerenciar favoritos
function toggleFavorite(bookId) {
  const index = state.favorites.indexOf(bookId);
  if (index > -1) {
    state.favorites.splice(index, 1);
  } else {
    state.favorites.push(bookId);
  }
  renderBooks();
  if (state.selectedBook && state.selectedBook.id === bookId) {
    updateModalFavoriteButton();
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
  imageContent.style.backgroundColor = getBookColor(book.id);

  imageContent.innerHTML = `
    <svg class="book-image-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
    </svg>
    <p class="book-image-title">${book.title}</p>
  `;

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
  heartIcon.setAttribute("fill", state.favorites.includes(book.id) ? "currentColor" : "none");
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

  // Atualizar imagem
  const modalImage = document.getElementById("modalBookImage");
  modalImage.style.backgroundColor = getBookColor(book.id);
  modalImage.innerHTML = `
    <svg style="width: 5rem; height: 5rem; color: white; opacity: 0.5; margin-bottom: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
    </svg>
    <p style="color: white; font-weight: 700; opacity: 0.75;">${book.title}</p>
  `;

  // Atualizar informações
  document.getElementById("modalBookTitle").textContent = book.title;
  document.getElementById("modalBookAuthor").textContent = book.author;
  document.getElementById("modalBookDescription").textContent = book.description;

  // Atualizar tags
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

  // Atualizar detalhes
  document.getElementById("modalBookDetails").innerHTML = `
    <p><strong>Páginas:</strong> ${book.pages}</p>
    <p><strong>Estado:</strong> ${book.condition}</p>
  `;

  // Atualizar informações do dono
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
    <p>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
      </svg>
      ${book.ownerPhone}
    </p>
  `;

  // Atualizar recomendações
  const recommendations = getRecommendations(book.id);
  const recoSection = document.getElementById("modalRecommendations");
  const recoList = document.getElementById("recommendationsList");

  if (recommendations.length > 0) {
    recoSection.style.display = "block";
    recoList.innerHTML = recommendations
      .map(
        (rec) => `
      <div class="recommendation-card" onclick="openBookModal(books.find(b => b.id === ${rec.id}))">
        <div class="recommendation-image" style="background-color: ${getBookColor(rec.id)};">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        <div class="recommendation-info">
          <p class="recommendation-title">${rec.title}</p>
          <p class="recommendation-author">${rec.author}</p>
        </div>
      </div>
    `
      )
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
function sendTradeRequest() {
  const message = elements.tradeMessage.value.trim();

  if (!message) {
    alert("Por favor, escreva uma mensagem para o dono do livro!");
    return;
  }

  const recommendations = getRecommendations(state.selectedBook.id);
  const recoText =
    recommendations.length > 0
      ? `\n\n📚 Livros relacionados que você pode gostar: ${recommendations.map((r) => r.title).join(", ")}`
      : "";

  alert(
    `✅ Solicitação enviada para ${state.selectedBook.owner}!\n\nLivro: "${state.selectedBook.title}"\nSua mensagem: "${message}"${recoText}\n\n${state.selectedBook.owner} receberá sua proposta em ${state.selectedBook.ownerEmail}`
  );

  closeBookModal();
}

// Debounce para busca
function handleSearchInput(value) {
  state.searchTerm = value;

  // Limpar timer anterior
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  // Definir novo timer
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
  // Preencher gêneros
  const genres = Array.from(new Set(books.map((book) => book.genre))).sort();

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    elements.genreSelect.appendChild(option.cloneNode(true));
    elements.genreSelectMobile.appendChild(option);
  });
}

// Event Listeners
elements.searchInput.addEventListener("input", (e) => handleSearchInput(e.target.value));

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

// Inicialização
initializeFilters();
renderBooks();