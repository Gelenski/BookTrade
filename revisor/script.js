 const livros = [
            {
                id: 1,
                titulo: "O Senhor dos Anéis",
                autor: "J.R.R. Tolkien",
                genero: "Fantasia",
                ano: 1954,
                enviadoPor: "João Silva",
                dataEnvio: "2025-10-27",
                status: "pendente",
                cor: "#8b5cf6",
                descricao: "Uma épica jornada de aventura em um mundo fantástico cheio de magia e criaturas míticas."
            },
            {
                id: 2,
                titulo: "A Revolução dos Bichos",
                autor: "George Orwell",
                genero: "Ficção",
                ano: 1945,
                enviadoPor: "Maria Santos",
                dataEnvio: "2025-10-26",
                status: "pendente",
                cor: "#ec4899",
                descricao: "Uma fábula política sobre uma fazenda onde os animais se rebelam contra os humanos."
            },
            {
                id: 3,
                titulo: "Sapiens",
                autor: "Yuval Noah Harari",
                genero: "História",
                ano: 2011,
                enviadoPor: "Carlos Oliveira",
                dataEnvio: "2025-10-25",
                status: "pendente",
                cor: "#f59e0b",
                descricao: "Uma breve história da humanidade desde a idade da pedra até a era moderna."
            },
            {
                id: 4,
                titulo: "O Código Da Vinci",
                autor: "Dan Brown",
                genero: "Suspense",
                ano: 2003,
                enviadoPor: "Ana Costa",
                dataEnvio: "2025-10-24",
                status: "aprovado",
                cor: "#3b82f6",
                descricao: "Um thriller envolvente sobre símbolos secretos e conspirações antigas."
            },
            {
                id: 5,
                titulo: "O Pequeno Príncipe",
                autor: "Antoine de Saint-Exupéry",
                genero: "Infantil",
                ano: 1943,
                enviadoPor: "Pedro Lima",
                dataEnvio: "2025-10-23",
                status: "aprovado",
                cor: "#10b981",
                descricao: "Uma história poética sobre um príncipe que viaja entre planetas."
            }
        ];

        let filtroAtual = 'todos';
        let idReprovacaoAtual = null;

        function renderizarLivros() {
            const listaLivros = document.getElementById('listaLivros');
            const livrosFiltrados = filtroAtual === 'todos' ? livros : livros.filter(l => l.status === filtroAtual);
            
            listaLivros.innerHTML = livrosFiltrados.map(livro => `
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
                        <div class="enviado-por">Enviado por ${livro.enviadoPor} em ${new Date(livro.dataEnvio).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div class="acoes">
                        ${livro.status === 'pendente' ? `
                            <button class="botao botao-aprovar" onclick="aprovarLivro(${livro.id})">✓ Aprovar</button>
                            <button class="botao botao-reprovar" onclick="abrirModalReprovar(${livro.id})">✗ Reprovar</button>
                        ` : livro.status === 'aprovado' ? `
                            <button class="botao botao-aprovar" style="opacity: 0.6; cursor: default;">✓ Aprovado</button>
                        ` : `
                            <button class="botao botao-reprovar" style="opacity: 0.6; cursor: default;">✗ Reprovado</button>
                        `}
                    </div>
                </div>
            `).join('');
        }

        function aprovarLivro(id) {
            const livro = livros.find(l => l.id === id);
            if (livro) {
                livro.status = 'aprovado';
                atualizarEstatisticas();
                renderizarLivros();
                mostrarNotificacao('Livro aprovado com sucesso!', 'sucesso');
            }
        }

        function abrirModalReprovar(id) {
            idReprovacaoAtual = id;
            document.getElementById('modalReprovar').classList.add('ativo');
        }

        function fecharModal() {
            document.getElementById('modalReprovar').classList.remove('ativo');
            document.getElementById('motivoReprovacao').value = '';
            idReprovacaoAtual = null;
        }

        function confirmarReprovacao() {
            const motivo = document.getElementById('motivoReprovacao').value;
            if (!motivo.trim()) {
                alert('Por favor, informe o motivo da reprovação.');
                return;
            }

            const livro = livros.find(l => l.id === idReprovacaoAtual);
            if (livro) {
                livro.status = 'reprovado';
                livro.motivoReprovacao = motivo;
                atualizarEstatisticas();
                renderizarLivros();
                mostrarNotificacao('Livro reprovado', 'erro');
                fecharModal();
            }
        }

        function atualizarEstatisticas() {
            document.getElementById('contagemPendentes').textContent = livros.filter(l => l.status === 'pendente').length;
            document.getElementById('contagemAprovados').textContent = livros.filter(l => l.status === 'aprovado').length;
            document.getElementById('contagemReprovados').textContent = livros.filter(l => l.status === 'reprovado').length;
        }

        function mostrarNotificacao(texto, tipo) {
            const notificacao = document.getElementById('notificacao');
            const textoNotificacao = document.getElementById('textoNotificacao');
            
            textoNotificacao.textContent = texto;
            notificacao.className = `notificacao ${tipo} mostrar`;
            
            setTimeout(() => {
                notificacao.classList.remove('mostrar');
            }, 3000);
        }

        document.querySelectorAll('.botao-filtro').forEach(botao => {
            botao.addEventListener('click', function() {
                document.querySelectorAll('.botao-filtro').forEach(b => b.classList.remove('ativo'));
                this.classList.add('ativo');
                filtroAtual = this.dataset.filtro;
                renderizarLivros();
            });
        });

        renderizarLivros();
        atualizarEstatisticas();