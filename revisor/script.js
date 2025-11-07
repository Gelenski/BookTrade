let livros = [];
let filtroAtual = "todos";
let idReprovacaoAtual = null;
const imagensLivros = {};

// ==================== CARREGAMENTO DE IMAGENS ====================
async function carregarImagensLivro(idLivro) {
  try {
    const response = await fetch(`/api/livro/${idLivro}/imagens`, {
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.imagens && data.imagens.length > 0) {
      // Encontra a capa ou usa a primeira imagem
      const capa = data.imagens.find((img) => img.tipo === "capa");
      return capa ? capa.caminho_imagem : data.imagens[0].caminho_imagem;
    }
    return null;
  } catch (error) {
    console.error(`Erro ao carregar imagens do livro ${idLivro}:`, error);
    return null;
  }
}

// ==================== CARREGAMENTO DE LIVROS ====================
async function carregarLivros() {
  try {
    const response = await fetch("/api/livros-pendentes", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401 || response.status === 403) {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/login/index.html";
      return;
    }

    const data = await response.json();

    if (data.success) {
      // Mapear os dados do banco
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
        motivoReprovacao: livro.observacao_revisao,
        capa: null, // Será carregada depois
      }));

      // Carregar imagens de todos os livros
      await carregarTodasImagens();

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

// Carregar todas as imagens dos livros
async function carregarTodasImagens() {
  const promises = livros.map(async (livro) => {
    if (!imagensLivros[livro.id]) {
      const capa = await carregarImagensLivro(livro.id);
      imagensLivros[livro.id] = capa;
      livro.capa = capa;
    } else {
      livro.capa = imagensLivros[livro.id];
    }
  });

  await Promise.all(promises);
}

// ==================== CARREGAMENTO DE ESTATÍSTICAS ====================
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

// ==================== FUNÇÃO AUXILIAR PARA OBTER COR ====================
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

// ==================== RENDERIZAÇÃO DE LIVROS ====================
function renderizarLivros() {
  const listaLivros = document.getElementById("listaLivros");
  const livrosFiltrados =
    filtroAtual === "todos"
      ? livros
      : livros.filter((l) => l.status === filtroAtual);

  if (livrosFiltrados.length === 0) {
    listaLivros.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #718096;">
        <svg style="width: 4rem; height: 4rem; margin: 0 auto 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        <p style="font-size: 1.25rem;">Nenhum livro encontrado</p>
      </div>
    `;
    return;
  }

  listaLivros.innerHTML = livrosFiltrados
    .map(
      (livro) => `
        <div class="cartao-livro" data-status="${livro.status}">
          <div class="capa-livro">
            ${
              livro.capa
                ? `<img src="${livro.capa}" alt="Capa de ${livro.titulo}" class="img-capa" loading="lazy">`
                : `<div class="sem-capa">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    <span>Sem capa</span>
                  </div>`
            }
          </div>
          <div class="info-livro">
            <div class="titulo-livro">${livro.titulo}</div>
            <div class="autor-livro">${livro.autor}</div>
            <div class="metadados-livro">
              <span class="etiqueta-meta">📚 ${livro.genero}</span>
              <span class="etiqueta-meta">📅 ${livro.ano}</span>
            </div>
            <div class="descricao-livro">${livro.descricao}</div>
            ${
              livro.status === "reprovado" && livro.motivoReprovacao
                ? `
              <div style="margin-top: 0.75rem; padding: 0.75rem; background: #fee2e2; border-radius: 6px; color: #991b1b;">
                <strong>Motivo da reprovação:</strong> ${livro.motivoReprovacao}
              </div>
            `
                : ""
            }
            <div class="enviado-por">Enviado por ${livro.enviadoPor} em ${new Date(livro.dataEnvio).toLocaleDateString("pt-BR")}</div>
          </div>
          <div class="acoes">
            ${
              livro.status === "pendente"
                ? `
              <button class="botao botao-aprovar" onclick="aprovarLivro(${livro.id})">✓ Aprovar</button>
              <button class="botao botao-reprovar" onclick="abrirModalReprovar(${livro.id})">✗ Reprovar</button>
            `
                : livro.status === "aprovado"
                  ? `
              <button class="botao botao-aprovar" disabled>✓ Aprovado</button>
            `
                  : `
              <button class="botao botao-reprovar" disabled>✗ Reprovado</button>
            `
            }
          </div>
        </div>
      `
    )
    .join("");
}

// ==================== APROVAÇÃO DE LIVRO ====================
// eslint-disable-next-line no-unused-vars
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
      await carregarLivros();
    } else {
      mostrarNotificacao(data.message || "Erro ao aprovar livro", "erro");
    }
  } catch (error) {
    console.error("Erro ao aprovar livro:", error);
    mostrarNotificacao("Erro ao conectar com o servidor", "erro");
  }
}

// ==================== MODAL DE REPROVAÇÃO ====================
// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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
      await carregarLivros();
    } else {
      mostrarNotificacao(data.message || "Erro ao reprovar livro", "erro");
    }
  } catch (error) {
    console.error("Erro ao reprovar livro:", error);
    mostrarNotificacao("Erro ao conectar com o servidor", "erro");
  }
}

// ==================== NOTIFICAÇÕES ====================
function mostrarNotificacao(texto, tipo) {
  const notificacao = document.getElementById("notificacao");
  const textoNotificacao = document.getElementById("textoNotificacao");

  textoNotificacao.textContent = texto;
  notificacao.className = `notificacao ${tipo} mostrar`;

  setTimeout(() => {
    notificacao.classList.remove("mostrar");
  }, 3000);
}

// ==================== EVENT LISTENERS ====================
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

// Fechar modal ao clicar fora
document
  .getElementById("modalReprovar")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      fecharModal();
    }
  });

// Fechar modal com ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    fecharModal();
  }
});

// ==================== INICIALIZAÇÃO ====================
carregarLivros();
