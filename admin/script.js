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
      document.getElementById(`section-${targetTab}`).classList.add("active");
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
  document.getElementById("btn-prev").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderUsers();
    }
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderUsers();
    }
  });
}

function updatePaginationInfo() {
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  document.getElementById("page-info").textContent =
    `Página ${currentPage} de ${totalPages}`;

  document.getElementById("btn-prev").disabled = currentPage === 1;
  document.getElementById("btn-next").disabled = currentPage === totalPages;
}

// * ==================== FILTROS ====================
function initFilters() {
  const searchInput = document.getElementById("search-user");
  const typeFilter = document.getElementById("filter-type");

  searchInput.addEventListener("input", applyFilters);
  typeFilter.addEventListener("change", applyFilters);
}

function applyFilters() {
  const searchTerm = document.getElementById("search-user").value.toLowerCase();
  const typeFilter = document.getElementById("filter-type").value;

  filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.nome.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm);
    const matchesType = !typeFilter || user.tipo_usuario === typeFilter;

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

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  confirmCancelBtn.addEventListener("click", closeConfirmModal);

  // Fecha modal ao clicar fora
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  modalConfirm.addEventListener("click", (e) => {
    if (e.target === modalConfirm) {
      closeConfirmModal();
    }
  });
}

// ? A função abaixo é chamada no HTML das rows da tabela
// eslint-disable-next-line no-unused-vars
function openEditModal(userId) {
  const user = allUsers.find((u) => u.id_usuario === userId);
  if (!user) {
    return;
  }

  currentUserId = userId;

  // Preenche o formulário
  document.getElementById("edit-id").value = user.id_usuario;
  document.getElementById("edit-nome").value = user.nome;
  document.getElementById("edit-email").value = user.email;
  document.getElementById("edit-cpf").value = formatCPF(user.cpf);
  document.getElementById("edit-telefone").value = user.telefone || "";
  document.getElementById("edit-tipo").value = user.tipo_usuario;
  document.getElementById("edit-status").value = user.status;

  // Abre o modal
  document.getElementById("modal-usuario").classList.add("active");
}

function closeModal() {
  document.getElementById("modal-usuario").classList.remove("active");
  currentUserId = null;
}

function closeConfirmModal() {
  document.getElementById("modal-confirm").classList.remove("active");
}

// ==================== FORMULÁRIOS ====================
function initFormHandlers() {
  // Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Deseja realmente sair?")) {
      // TODO: Limpar sessão/token
      window.location.href = "/login/index.html";
    }
  });

  // Cadastro de Gestor
  const formGestor = document.getElementById("form-cadastro-gestor");
  formGestor.addEventListener("submit", handleGestorSubmit);

  // CEP do gestor
  const cepInput = document.getElementById("gestor-cep");
  cepInput.addEventListener("blur", () => buscarCEP("gestor"));

  // Edição de usuário
  const formEdit = document.getElementById("form-edit-usuario");
  formEdit.addEventListener("submit", handleEditSubmit);

  // Botão de deletar
  document.getElementById("btn-delete").addEventListener("click", () => {
    document.getElementById("modal-confirm").classList.add("active");
  });

  // Confirmação de deleção
  document
    .getElementById("btn-confirm-delete")
    .addEventListener("click", handleDeleteUser);

  // Geração de relatório
  document
    .getElementById("btn-gerar-relatorio")
    .addEventListener("click", handleGenerateReport);

  // Exportar PDF
  document
    .getElementById("btn-exportar-pdf")
    .addEventListener("click", handleExportPDF);
}

// ==================== CADASTRO DE GESTOR ====================
async function handleGestorSubmit(e) {
  e.preventDefault();

  const senha = document.getElementById("gestor-senha").value;
  const confirmaSenha = document.getElementById("gestor-confirma-senha").value;

  if (senha !== confirmaSenha) {
    alert("As senhas não coincidem!");
    return;
  }

  const gestorData = {
    nome: document.getElementById("gestor-nome").value,
    email: document.getElementById("gestor-email").value,
    cpf: document.getElementById("gestor-cpf").value.replace(/\D/g, ""),
    telefone: document.getElementById("gestor-telefone").value,
    cep: document.getElementById("gestor-cep").value.replace(/\D/g, ""),
    rua: document.getElementById("gestor-rua").value,
    numero: document.getElementById("gestor-numero").value,
    bairro: document.getElementById("gestor-bairro").value,
    cidade: document.getElementById("gestor-cidade").value,
    senha: senha,
    tipo_usuario: "gestor",
  };

  try {
    const response = await fetch("/api/cadastro-gestor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gestorData),
    });
    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Erro ao cadastrar gestor");
      return;
    }
    alert("Gestor cadastrado com sucesso!");
    e.target.reset();
    loadUsers(); // Recarrega a lista
  } catch (error) {
    console.error("Erro ao cadastrar gestor:", error);
    alert("Erro ao cadastrar gestor");
  }
}

// ==================== EDIÇÃO DE USUÁRIO ====================
async function handleEditSubmit(e) {
  e.preventDefault();

  const userData = {
    id: document.getElementById("edit-id").value,
    nome: document.getElementById("edit-nome").value,
    email: document.getElementById("edit-email").value,
    cpf: document.getElementById("edit-cpf").value.replace(/\D/g, ""),
    telefone: document.getElementById("edit-telefone").value,
    tipo_usuario: document.getElementById("edit-tipo").value,
    status: document.getElementById("edit-status").value,
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentUserId }),
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
  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    select.appendChild(option);
  }
}

async function handleGenerateReport() {
  const mes = document.getElementById("relatorio-mes").value;
  const ano = document.getElementById("relatorio-ano").value;

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
    document.getElementById("total-trocas").textContent = data.total;
    document.getElementById("trocas-concluidas").textContent = data.concluidas;
    document.getElementById("trocas-pendentes").textContent = data.pendentes;
    document.getElementById("trocas-canceladas").textContent = data.canceladas;

    document.getElementById("relatorio-resultado").style.display = "block";
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
  const cep = cepInput.value.replace(/\D/g, "");

  if (cep.length !== 8) {
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (!data.erro) {
      document.getElementById(`${prefix}-rua`).value = data.logradouro;
      document.getElementById(`${prefix}-bairro`).value = data.bairro;
      document.getElementById(`${prefix}-cidade`).value = data.localidade;
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
