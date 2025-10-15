// ==================== VARIÁVEIS GLOBAIS ====================
let currentPage = 1;
const usersPerPage = 30;
let allUsers = [];
let filteredUsers = [];
let currentUserId = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initModalHandlers();
  initFormHandlers();
  initPagination();
  initFilters();
  loadUsers();
  populateYearSelect();
});

// * ==================== NAVEGAÇÃO ENTRE ABAS ====================
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

// * ==================== CARREGAMENTO DE USUÁRIOS ====================
async function loadUsers() {
  try {
    const response = await fetch("/api/users");
    const data = await response.json();
    allUsers = data.users;
    console.log("Usuários carregados:", allUsers);
    filteredUsers = [...allUsers];
    renderUsers();
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    alert("Erro ao carregar usuários");
  }
}

// * ==================== RENDERIZAÇÃO DA TABELA ====================
function renderUsers() {
  const tbody = document.getElementById("users-table-body");
  if (!tbody) {
    return;
  }

  const start = (currentPage - 1) * usersPerPage;
  const end = start + usersPerPage;
  const usersToShow = filteredUsers.slice(start, end);

  tbody.innerHTML = "";

  if (usersToShow.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #999;">
          Nenhum usuário encontrado
        </td>
      </tr>
    `;
    return;
  }

  usersToShow.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.id_usuario}</td>
      <td>${user.nome}</td>
      <td>${user.email}</td>
      <td>${formatCPF(user.cpf)}</td>
      <td><span class="badge badge-${user.tipo_usuario}">${capitalizeFirst(user.tipo_usuario)}</span></td>
      <td><span class="badge badge-${user.status ? "ativo" : "inativo"}">${user.status ? "Ativo" : "Inativo"}</span></td>
      <td>${formatDate(user.data_cadastro)}</td>
      <td>
        <button class="btn-action" onclick="openEditModal(${user.id_usuario})">
          Editar
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  updatePaginationInfo();
}

// * ==================== PAGINAÇÃO ====================
function initPagination() {
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderUsers();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderUsers();
      }
    });
  }
}

function updatePaginationInfo() {
  const pageInfo = document.getElementById("page-info");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;

  if (pageInfo) {
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  }

  if (btnPrev) {
    btnPrev.disabled = currentPage === 1;
  }

  if (btnNext) {
    btnNext.disabled = currentPage === totalPages;
  }
}

// * ==================== FILTROS ====================
function initFilters() {
  const searchInput = document.getElementById("search-user");
  const typeFilter = document.getElementById("filter-type");

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (typeFilter) {
    typeFilter.addEventListener("change", applyFilters);
  }
}

function applyFilters() {
  const searchInput = document.getElementById("search-user");
  const typeFilter = document.getElementById("filter-type");

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const typeFilterValue = typeFilter ? typeFilter.value : "";

  filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.nome.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm);
    const matchesType =
      !typeFilterValue || user.tipo_usuario === typeFilterValue;

    return matchesSearch && matchesType;
  });

  currentPage = 1;
  renderUsers();
}

// * ==================== MODAL ====================
function initModalHandlers() {
  const modal = document.getElementById("modal-usuario");
  const modalConfirm = document.getElementById("modal-confirm");
  const closeBtn = document.getElementById("modal-close");
  const cancelBtn = document.getElementById("btn-cancel");
  const confirmCancelBtn = document.getElementById("btn-confirm-cancel");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeModal);
  }

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener("click", closeConfirmModal);
  }

  // Fecha modal ao clicar fora
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  if (modalConfirm) {
    modalConfirm.addEventListener("click", (e) => {
      if (e.target === modalConfirm) {
        closeConfirmModal();
      }
    });
  }
}

// Função global para ser chamada pelo onclick no HTML
window.openEditModal = function (userId) {
  const user = allUsers.find((u) => u.id_usuario === userId);
  if (!user) {
    return;
  }

  currentUserId = userId;

  // Preenche o formulário
  const elements = {
    "edit-id": user.id_usuario,
    "edit-nome": user.nome,
    "edit-email": user.email,
    "edit-cpf": formatCPF(user.cpf),
    "edit-telefone": user.telefone || "",
    "edit-tipo": user.tipo_usuario,
    "edit-status": user.status ? "1" : "0",
  };

  for (const [id, value] of Object.entries(elements)) {
    const element = document.getElementById(id);
    if (element) {
      element.value = value;
    }
  }

  // Abre o modal
  const modal = document.getElementById("modal-usuario");
  if (modal) {
    modal.classList.add("active");
  }
};

function closeModal() {
  const modal = document.getElementById("modal-usuario");
  if (modal) {
    modal.classList.remove("active");
  }
  currentUserId = null;
}

function closeConfirmModal() {
  const modalConfirm = document.getElementById("modal-confirm");
  if (modalConfirm) {
    modalConfirm.classList.remove("active");
  }
}

// ==================== FORMULÁRIOS ====================
function initFormHandlers() {
  // Logout
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      if (confirm("Deseja realmente sair?")) {
        window.location.href = "/login/index.html";
      }
    });
  }

  // Cadastro de Revisor
  const formRevisor = document.getElementById("form-cadastro-revisor");
  if (formRevisor) {
    formRevisor.addEventListener("submit", handleRevisorSubmit);
  }

  // CEP do revisor
  const cepInput = document.getElementById("revisor-cep");
  if (cepInput) {
    cepInput.addEventListener("blur", () => buscarCEP("revisor"));
  }

  // Edição de usuário
  const formEdit = document.getElementById("form-edit-usuario");
  if (formEdit) {
    formEdit.addEventListener("submit", handleEditSubmit);
  }

  // Botão de deletar
  const btnDelete = document.getElementById("btn-delete");
  if (btnDelete) {
    btnDelete.addEventListener("click", () => {
      const modalConfirm = document.getElementById("modal-confirm");
      if (modalConfirm) {
        modalConfirm.classList.add("active");
      }
    });
  }

  // Confirmação de deleção
  const btnConfirmDelete = document.getElementById("btn-confirm-delete");
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener("click", handleDeleteUser);
  }

  // Geração de relatório
  const btnGerarRelatorio = document.getElementById("btn-gerar-relatorio");
  if (btnGerarRelatorio) {
    btnGerarRelatorio.addEventListener("click", handleGenerateReport);
  }

  // Exportar PDF
  const btnExportarPdf = document.getElementById("btn-exportar-pdf");
  if (btnExportarPdf) {
    btnExportarPdf.addEventListener("click", handleExportPDF);
  }
}

// ==================== CADASTRO DE REVISOR ====================
async function handleRevisorSubmit(e) {
  e.preventDefault();

  const senhaInput = document.getElementById("revisor-senha");
  const confirmaSenhaInput = document.getElementById("revisor-confirma-senha");

  if (!senhaInput || !confirmaSenhaInput) {
    alert("Erro ao validar senhas");
    return;
  }

  const senha = senhaInput.value;
  const confirmaSenha = confirmaSenhaInput.value;

  if (senha !== confirmaSenha) {
    alert("As senhas não coincidem!");
    return;
  }

  const revisorData = {
    nome: document.getElementById("revisor-nome")?.value || "",
    email: document.getElementById("revisor-email")?.value || "",
    cpf: document.getElementById("revisor-cpf")?.value.replace(/\D/g, "") || "",
    telefone: document.getElementById("revisor-telefone")?.value || "",
    cep: document.getElementById("revisor-cep")?.value.replace(/\D/g, "") || "",
    rua: document.getElementById("revisor-rua")?.value || "",
    numero: document.getElementById("revisor-numero")?.value || "",
    bairro: document.getElementById("revisor-bairro")?.value || "",
    cidade: document.getElementById("revisor-cidade")?.value || "",
    senha: senha,
    tipo_usuario: "revisor",
  };

  try {
    const response = await fetch("/api/cadastro-revisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(revisorData),
    });
    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Erro ao cadastrar revisor");
      return;
    }
    alert("Revisor cadastrado com sucesso!");
    e.target.reset();
    loadUsers();
  } catch (error) {
    console.error("Erro ao cadastrar revisor:", error);
    alert("Erro ao cadastrar revisor");
  }
}

// ==================== EDIÇÃO DE USUÁRIO ====================
async function handleEditSubmit(e) {
  e.preventDefault();

  const userData = {
    id: document.getElementById("edit-id")?.value || "",
    nome: document.getElementById("edit-nome")?.value || "",
    email: document.getElementById("edit-email")?.value || "",
    cpf: document.getElementById("edit-cpf")?.value.replace(/\D/g, "") || "",
    telefone: document.getElementById("edit-telefone")?.value || "",
    tipo_usuario: document.getElementById("edit-tipo")?.value || "",
    status: parseInt(document.getElementById("edit-status")?.value || "1"),
  };

  try {
    const response = await fetch("/api/atualizar-usuario/" + userData.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log("Resposta da atualização:", data);

    if (!data.success) {
      alert(data.message || "Erro ao atualizar usuário");
      return;
    }
    alert("Usuário atualizado com sucesso!");
    closeModal();
    loadUsers();
  } catch (error) {
    console.error("Erro ao editar usuário:", error);
    alert("Erro ao editar usuário");
  }
}

// ==================== EXCLUSÃO DE USUÁRIO ====================
async function handleDeleteUser() {
  if (!currentUserId) {
    return;
  }

  try {
    const response = await fetch("/api/deletar-usuario/" + currentUserId, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Erro ao excluir usuário");
      return;
    }

    alert("Usuário excluído com sucesso!");
    closeConfirmModal();
    closeModal();
    loadUsers();
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    alert("Erro ao excluir usuário");
  }
}

// ==================== RELATÓRIOS ====================
function populateYearSelect() {
  const select = document.getElementById("relatorio-ano");
  if (!select) {
    return;
  }

  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    select.appendChild(option);
  }
}

async function handleGenerateReport() {
  const mesInput = document.getElementById("relatorio-mes");
  const anoInput = document.getElementById("relatorio-ano");

  if (!mesInput || !anoInput) {
    alert("Erro ao acessar campos do relatório");
    return;
  }

  const mes = mesInput.value;
  const ano = anoInput.value;

  if (!mes || !ano) {
    alert("Por favor, selecione o mês e o ano");
    return;
  }

  try {
    // TODO: Substituir por sua chamada à API
    // const response = await fetch(`/api/relatorios/trocas?mes=${mes}&ano=${ano}`);
    // const data = await response.json();

    // DADOS DE EXEMPLO - Remover quando integrar com API
    const data = {
      total: 145,
      concluidas: 98,
      pendentes: 32,
      canceladas: 15,
    };

    // Exibe o resultado
    const elements = {
      "total-trocas": data.total,
      "trocas-concluidas": data.concluidas,
      "trocas-pendentes": data.pendentes,
      "trocas-canceladas": data.canceladas,
    };

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }

    const resultado = document.getElementById("relatorio-resultado");
    if (resultado) {
      resultado.style.display = "block";
    }
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    alert("Erro ao gerar relatório");
  }
}

function handleExportPDF() {
  // TODO: Implementar exportação de PDF
  alert("Funcionalidade de exportação em desenvolvimento");
  console.log("Exportando relatório para PDF...");
}

// ==================== BUSCA CEP ====================
async function buscarCEP(prefix) {
  const cepInput = document.getElementById(`${prefix}-cep`);
  if (!cepInput) {
    return;
  }

  const cep = cepInput.value.replace(/\D/g, "");

  if (cep.length !== 8) {
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (!data.erro) {
      const ruaInput = document.getElementById(`${prefix}-rua`);
      const bairroInput = document.getElementById(`${prefix}-bairro`);
      const cidadeInput = document.getElementById(`${prefix}-cidade`);

      if (ruaInput) {
        ruaInput.value = data.logradouro;
      }
      if (bairroInput) {
        bairroInput.value = data.bairro;
      }
      if (cidadeInput) {
        cidadeInput.value = data.localidade;
      }
    } else {
      alert("CEP não encontrado");
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    alert("Erro ao buscar CEP");
  }
}

// ==================== UTILITÁRIOS ====================
function formatCPF(cpf) {
  if (!cpf) {
    return "";
  }
  cpf = cpf.toString().replace(/\D/g, "");
  if (cpf.length !== 11) {
    return cpf;
  }
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString("pt-BR") +
    " " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
