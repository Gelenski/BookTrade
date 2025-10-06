const cepInput = document.querySelector('input[name="cep"]');
const ruaInput = document.querySelector('input[name="rua"]');
const bairroInput = document.querySelector('input[name="bairro"]');
const estadoInput = document.querySelector('input[name="estado"]');

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
