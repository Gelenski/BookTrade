// Verifica se já está autenticado ao carregar a página
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/auth/verificar-sessao", {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();

    if (data.success && data.autenticado) {
      const rotas = {
        admin: "/admin/index.html",
        revisor: "/revisor/index.html",
        comum: "/user/index.html",
      };
      window.location.href = rotas[data.usuario.tipo] || "/user/index.html";
    }
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
  }
});

const cepInput = document.querySelector('input[name="cep"]');
const ruaInput = document.querySelector('input[name="rua"]');
const bairroInput = document.querySelector('input[name="bairro"]');
const estadoInput = document.querySelector('input[name="cidade"]');

cepInput.addEventListener("blur", async () => {
  const cep = cepInput.value.replace(/\D/g, "");
  if (cep.length !== 8) {
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (!data.erro) {
      ruaInput.value = data.logradouro;
      bairroInput.value = data.bairro;
      estadoInput.value = data.localidade;
    }
  } catch (err) {
    console.error("Erro ao buscar o CEP:", err);
  }
});

const form = document.querySelector(".cadastro-form");
const submitButton = document.getElementById("button-submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  submitButton.disabled = true;
  submitButton.textContent = "Cadastrando...";

  const formData = {
    nome: document.getElementById("input-nome").value,
    email: document.getElementById("input-email").value,
    telefone: document.getElementById("input-telefone").value,
    cpf: document.getElementById("input-cpf").value,
    cep: document.getElementById("input-cep").value,
    rua: document.getElementById("input-rua").value,
    numero: document.getElementById("input-numero").value,
    bairro: document.getElementById("input-bairro").value,
    cidade: document.getElementById("input-cidade").value,
    senha: document.getElementById("input-senha").value,
  };

  try {
    const response = await fetch("/api/auth/cadastro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      window.location.href = "/user/index.html";
    } else {
      alert(data.message || "Erro ao realizar cadastro");
    }
  } catch (error) {
    console.error("Erro ao cadastrar:", error);
    alert("Erro ao conectar com o servidor");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Cadastrar-se";
  }
});
//mostrar senha
const toggleSenha = document.getElementById("toggleSenha");
const inputSenha = document.getElementById("input-senha");

toggleSenha.addEventListener("change", () => {
  inputSenha.type = toggleSenha.checked ? "text" : "password";
});
