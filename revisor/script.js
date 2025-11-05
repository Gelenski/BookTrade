let livros = [];
let filtroAtual = "todos";
let idReprovacaoAtual = null;

// Função para carregar livros do backend
async function carregarLivros() {
  try {
    const response = await fetch("/api/livros-pendentes", {
      method: "GET",
      credentials: "include", // Importante para enviar cookies de sessão
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

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

  listaLivros.innerHTML = livrosFiltrados
    .map(
      (livro) => `
        <div class="cartao-livro" data-status="${livro.status}">
            <div class="capa-livro" style="background: ${livro.cor};">
                <svg viewBox="0 0 24 24">
                    <path d="M21 4H3C1.9 4 1 4.9 1 6v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM3 18V6h8v12H3zm18 0h-8V6h8v12z"/>
                </svg>
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
                    <button class="botao botao-aprovar" style="opacity: 0.6; cursor: default;">✓ Aprovado</button>
                `
                      : `
                    <button class="botao botao-reprovar" style="opacity: 0.6; cursor: default;">✗ Reprovado</button>
                `
                }
            </div>
        </div>
    `
    )
    .join("");
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
