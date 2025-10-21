const books = [
  {
    id: 1,
    title: "Dom Casmurro",
    author: "Machado de Assis",
    genre: "Clássico",
    year: 1899,
    owner: "Maria Silva",
    image: "https://m.media-amazon.com/images/I/51VKHWmzS7L._SY445_SX342_.jpg",
  },
  {
    id: 2,
    title: "1984",
    author: "George Orwell",
    genre: "Ficção",
    year: 1949,
    owner: "João Santos",
    image: "https://m.media-amazon.com/images/I/51SIDmHkojL._SY445_SX342_.jpg",
  },
  {
    id: 3,
    title: "O Pequeno Príncipe",
    author: "Antoine de Saint-Exupéry",
    genre: "Infantil",
    year: 1943,
    owner: "Ana Costa",
    image: "https://m.media-amazon.com/images/I/41ehFt3QbsL._SY445_SX342_.jpg",
  },
  {
    id: 4,
    title: "Harry Potter e a Pedra Filosofal",
    author: "J.K. Rowling",
    genre: "Fantasia",
    year: 1997,
    owner: "Pedro Lima",
    image: "https://m.media-amazon.com/images/I/51UoqRAxwEL._SY445_SX342_.jpg",
  },
  {
    id: 5,
    title: "O Senhor dos Anéis",
    author: "J.R.R. Tolkien",
    genre: "Fantasia",
    year: 1954,
    owner: "Lucas Ferreira",
    image: "https://m.media-amazon.com/images/I/51EstYV8bUL._SY445_SX342_.jpg",
  },
  {
    id: 6,
    title: "Cem Anos de Solidão",
    author: "Gabriel García Márquez",
    genre: "Clássico",
    year: 1967,
    owner: "Carla Souza",
    image: "https://m.media-amazon.com/images/I/51R9oZWAH9L._SY445_SX342_.jpg",
  },
  {
    id: 7,
    title: "O Hobbit",
    author: "J.R.R. Tolkien",
    genre: "Fantasia",
    year: 1937,
    owner: "Rafael Alves",
    image: "https://m.media-amazon.com/images/I/51t33YqHNaL._SY445_SX342_.jpg",
  },
  {
    id: 8,
    title: "Sapiens",
    author: "Yuval Noah Harari",
    genre: "Não-ficção",
    year: 2011,
    owner: "Juliana Rocha",
    image: "https://m.media-amazon.com/images/I/51Sn8PEXwcL._SY445_SX342_.jpg",
  },
];

const searchInput = document.getElementById("searchInput");
const genreSelect = document.getElementById("genreSelect");
const bookList = document.getElementById("bookList");
const noResults = document.getElementById("noResults");

// Preencher opções de gênero
const genres = Array.from(new Set(books.map((book) => book.genre))).sort();
genres.forEach((genre) => {
  const option = document.createElement("option");
  option.value = genre;
  option.textContent = genre;
  genreSelect.appendChild(option);
});

function filterBooks() {
  const searchTerm = searchInput.value.toLowerCase();
  const filterGenre = genreSelect.value;

  const filtered = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm);
    const matchesGenre = filterGenre === "all" || book.genre === filterGenre;
    return matchesSearch && matchesGenre;
  });

  renderBooks(filtered);
}

function renderBooks(bookArray) {
  bookList.innerHTML = "";
  if (bookArray.length === 0) {
    noResults.style.display = "block";
    return;
  } else {
    noResults.style.display = "none";
  }

  bookArray.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";

    const img = document.createElement("img");
    img.src = book.image;
    img.alt = book.title;
    img.className = "book-image";

    const content = document.createElement("div");
    content.className = "book-content";

    const title = document.createElement("h3");
    title.className = "book-title";
    title.textContent = book.title;

    const author = document.createElement("p");
    author.className = "book-author";
    author.textContent = book.author;

    const meta = document.createElement("div");
    meta.className = "book-meta";

    const genreSpan = document.createElement("span");
    genreSpan.textContent = book.genre;

    const yearSpan = document.createElement("span");
    yearSpan.textContent = book.year;

    meta.appendChild(genreSpan);
    meta.appendChild(yearSpan);

    const owner = document.createElement("p");
    owner.className = "book-owner";
    owner.textContent = `Dono: ${book.owner}`;

    const btn = document.createElement("button");
    btn.className = "btn-trade";
    btn.textContent = "Solicitar Troca";
    btn.addEventListener("click", () => {
      alert(`Solicitação de troca para o livro "${book.title}" enviada!`);
    });

    content.appendChild(title);
    content.appendChild(author);
    content.appendChild(meta);
    content.appendChild(owner);
    content.appendChild(btn);

    card.appendChild(img);
    card.appendChild(content);

    bookList.appendChild(card);
  });
}

searchInput.addEventListener("input", filterBooks);
genreSelect.addEventListener("change", filterBooks);

// Renderiza inicialmente
renderBooks(books);
