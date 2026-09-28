"use strict";

/**
 * QUIZ DE CIBERSEGURANÇA — CyberShield
 * Roda inteiramente no navegador. Nenhuma resposta é enviada ou armazenada:
 * o progresso existe só enquanto a página está aberta.
 */
(function () {

    var area = document.getElementById("quizArea");

    if (!area) {
        return;
    }

    var CS = window.CyberShield;

    var CLASSES_DE_RESULTADO = ["nivel-perigo", "nivel-suspeito", "nivel-seguro"];

    var FAIXAS_RESULTADO = [
        { min: 90, classe: "nivel-seguro", tag: "excelente" },
        { min: 60, classe: "nivel-suspeito", tag: "bom, com brechas" },
        { min: 0, classe: "nivel-perigo", tag: "precisa reforçar" }
    ];

    var LETRAS = ["A", "B", "C", "D", "E"];

    var PERGUNTAS = [
        {
            texto: "Você recebe um e-mail dizendo que sua conta será bloqueada em 24 horas, a menos que clique num link e confirme sua senha. O que fazer?",
            opcoes: [
                "Clicar no link e confirmar rápido, para não perder o acesso",
                "Ignorar e apagar o e-mail sem verificar nada",
                "Acessar o site oficial digitando o endereço no navegador, sem usar o link",
                "Responder ao e-mail pedindo mais informações"
            ],
            correta: 2,
            explicacao: "Pressa somada a pedido de senha é a assinatura do phishing. O caminho seguro é entrar no serviço pelo endereço oficial, nunca pelo link recebido."
        },
        {
            texto: "Qual destas tende a ser a senha mais segura?",
            opcoes: [
                "123456",
                "MeuNome1990",
                "Tr0v@$Fenix!92Lua",
                "senha"
            ],
            correta: 2,
            explicacao: "Senhas fortes misturam maiúsculas, minúsculas, números e símbolos, têm bom comprimento e evitam dado pessoal óbvio ou sequência comum."
        },
        {
            texto: "O que é verificação em duas etapas (2FA)?",
            opcoes: [
                "Usar duas senhas diferentes no mesmo site",
                "Uma checagem extra além da senha, como um código no celular",
                "Fazer login duas vezes seguidas no mesmo aparelho",
                "Compartilhar a senha com alguém de confiança"
            ],
            correta: 1,
            explicacao: "O 2FA soma um segundo fator (algo que você tem) à senha. Mesmo que a senha vaze, ainda falta esse segundo fator para entrar."
        },
        {
            texto: "Você está num café e precisa acessar o app do banco pelo Wi-Fi do local. Qual é a atitude mais segura?",
            opcoes: [
                "Acessar normalmente, já que é só olhar o saldo",
                "Evitar dados sensíveis em rede pública, ou usar uma VPN confiável",
                "Pedir a senha do Wi-Fi ao atendente e usar sem preocupação",
                "Usar sem problema, desde que o site tenha cadeado"
            ],
            correta: 1,
            explicacao: "Rede pública facilita interceptação. O ideal é não fazer operação sensível nela, ou usar VPN confiável. O cadeado ajuda, mas não resolve o risco da rede em si."
        },
        {
            texto: "O que caracteriza um ataque de phishing?",
            opcoes: [
                "Um vírus que apaga arquivos do computador",
                "Enganar a pessoa para que ela mesma entregue dados sensíveis",
                "Sobrecarregar um servidor de propósito até ele sair do ar",
                "Um erro de configuração num roteador doméstico"
            ],
            correta: 1,
            explicacao: "Phishing é engenharia social: mensagens falsas induzem a vítima a entregar senha, dado bancário, ou a clicar em algo malicioso."
        },
        {
            texto: "Com que frequência atualizar o sistema e os aplicativos do seu aparelho?",
            opcoes: [
                "Nunca, atualização é desnecessária",
                "Só quando o aparelho parar de funcionar",
                "Assim que a atualização de segurança ficar disponível",
                "No máximo uma vez por ano"
            ],
            correta: 2,
            explicacao: "Atualizações corrigem falhas já conhecidas e exploradas. Adiar deixa a porta aberta justamente para o que já está sendo usado por aí."
        },
        {
            texto: "Qual sinal abaixo NÃO é, sozinho, característica de link malicioso?",
            opcoes: [
                "O domínio imita uma marca conhecida com pequena diferença (\"amaz0n.com\")",
                "O link usa HTTPS e leva a um domínio oficial conhecido",
                "O link foi encurtado e esconde o destino real",
                "O endereço usa número de IP no lugar de domínio"
            ],
            correta: 1,
            explicacao: "HTTPS com domínio oficial conhecido é bom sinal, ainda que não seja garantia. Imitação de marca, encurtador e IP são sinais clássicos de golpe."
        },
        {
            texto: "O que é engenharia social em segurança digital?",
            opcoes: [
                "O estudo de como redes sociais afetam a sociedade",
                "Manipulação psicológica para induzir alguém a agir contra a própria segurança",
                "Um tipo de firewall corporativo",
                "Um protocolo de criptografia"
            ],
            correta: 1,
            explicacao: "Engenharia social explora confiança, pressa e autoridade. É a base do phishing e não depende de nenhuma falha técnica."
        },
        {
            texto: "Depois de um vazamento de dados num serviço que você usa, qual é a melhor atitude?",
            opcoes: [
                "Ignorar, porque provavelmente não afeta você",
                "Trocar a senha ali e em todo lugar onde você reutilizou a mesma",
                "Excluir a conta sem trocar a senha",
                "Esperar o serviço resolver sozinho"
            ],
            correta: 1,
            explicacao: "Um vazamento pode expor a senha de forma recuperável. Trocá-la em todos os lugares onde foi reutilizada corta a invasão em cadeia."
        },
        {
            texto: "Qual o principal risco de repetir a mesma senha em vários sites?",
            opcoes: [
                "Nenhum, desde que a senha seja forte",
                "Se um site vazar, testam a mesma senha nas suas outras contas",
                "O navegador fica mais lento",
                "Você esquece a senha mais facilmente"
            ],
            correta: 1,
            explicacao: "É o chamado credential stuffing: listas vazadas de um serviço são testadas automaticamente em outros. Senha forte não protege se ela já vazou."
        }
    ];

    var el = {
        progresso: document.getElementById("quizProgresso"),
        barra: document.getElementById("quizBarra"),
        barraLabel: document.getElementById("quizBarraLabel"),
        valor: document.getElementById("quizValor"),
        area: area,
        pergunta: document.getElementById("quizPergunta"),
        opcoes: document.getElementById("quizOpcoes"),
        feedback: document.getElementById("quizFeedback"),
        proximo: document.getElementById("quizProximo"),
        resultado: document.getElementById("quizResultado"),
        acertos: document.getElementById("quizAcertos"),
        erros: document.getElementById("quizErros"),
        aproveitamento: document.getElementById("quizAproveitamento"),
        relatorioSecao: document.getElementById("quizRelatorioSecao"),
        tag: document.getElementById("quizTag"),
        relatorioTitulo: document.getElementById("quizRelatorioTitulo"),
        relatorio: document.getElementById("quizRelatorio"),
        refazer: document.getElementById("quizRefazer")
    };

    var indiceAtual = 0;
    var acertos = 0;
    var respondida = false;

    // ---------- Pergunta ----------

    function renderizarProgresso() {
        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: Math.round((indiceAtual / PERGUNTAS.length) * 100),
            vazio: false,
            prefixo: "pergunta",
            textoNivel: (indiceAtual + 1) + " de " + PERGUNTAS.length
        });
    }

    function renderizarPergunta() {
        respondida = false;

        var pergunta = PERGUNTAS[indiceAtual];

        el.pergunta.textContent = pergunta.texto;

        CS.limparElemento(el.opcoes);

        pergunta.opcoes.forEach(function (texto, indice) {
            var botao = document.createElement("button");
            botao.type = "button";
            botao.className = "opcao";

            var letra = document.createElement("span");
            letra.className = "opcao-letra";
            letra.setAttribute("aria-hidden", "true");
            letra.textContent = LETRAS[indice];

            var corpo = document.createElement("span");
            corpo.className = "opcao-texto";
            corpo.textContent = texto;

            botao.appendChild(letra);
            botao.appendChild(corpo);

            botao.addEventListener("click", function () {
                responder(indice, botao);
            });

            el.opcoes.appendChild(botao);
        });

        el.feedback.hidden = true;
        el.feedback.textContent = "";
        el.feedback.classList.remove("feedback-certa", "feedback-errada");

        el.proximo.hidden = true;
        el.proximo.textContent =
            indiceAtual === PERGUNTAS.length - 1 ? "Ver resultado" : "Próxima pergunta";

        renderizarProgresso();
    }

    function responder(escolhido, botaoClicado) {
        if (respondida) {
            return;
        }

        respondida = true;

        var pergunta = PERGUNTAS[indiceAtual];
        var acertou = escolhido === pergunta.correta;

        if (acertou) {
            acertos += 1;
        }

        Array.prototype.forEach.call(el.opcoes.children, function (botao, indice) {
            botao.disabled = true;

            if (indice === pergunta.correta) {
                botao.classList.add("opcao-certa");
            } else if (indice === escolhido) {
                botao.classList.add("opcao-errada");
            } else {
                botao.classList.add("opcao-apagada");
            }
        });

        el.feedback.hidden = false;
        el.feedback.textContent = (acertou ? "Certo. " : "Não é essa. ") + pergunta.explicacao;
        el.feedback.classList.add(acertou ? "feedback-certa" : "feedback-errada");

        el.proximo.hidden = false;
        botaoClicado.focus();
    }

    function avancar() {
        if (!respondida) {
            return;
        }

        indiceAtual += 1;

        if (indiceAtual >= PERGUNTAS.length) {
            mostrarResultado();
            return;
        }

        renderizarPergunta();
    }

    // ---------- Resultado ----------

    function mostrarResultado() {
        var total = PERGUNTAS.length;
        var erros = total - acertos;
        var percentual = Math.round((acertos / total) * 100);

        el.area.hidden = true;

        el.resultado.hidden = false;
        el.relatorioSecao.hidden = false;

        el.acertos.textContent = acertos + " de " + total;
        el.erros.textContent = erros + " de " + total;
        el.aproveitamento.textContent = percentual + "%";

        var nivel = CS.classificarPorFaixas(percentual, FAIXAS_RESULTADO);

        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_RESULTADO, nivel.classe);

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: percentual,
            vazio: false,
            prefixo: "aproveitamento",
            textoNivel: nivel.tag
        });

        el.tag.textContent = nivel.tag;

        var mensagem;

        if (nivel.classe === "nivel-seguro") {
            mensagem = "Você acertou " + acertos + " de " + total + " (" + percentual +
                "%). Os fundamentos estão firmes — o próximo passo é aplicar isso no dia a dia, " +
                "principalmente senha única por serviço e 2FA ligado.";
        } else if (nivel.classe === "nivel-suspeito") {
            mensagem = "Você acertou " + acertos + " de " + total + " (" + percentual +
                "%). A base existe, mas ficaram brechas. Releia as explicações que você errou e passe " +
                "pelas ferramentas do CyberShield antes de tentar de novo.";
        } else {
            mensagem = "Você acertou " + acertos + " de " + total + " (" + percentual +
                "%). Vale explorar as três ferramentas do site com calma: elas cobrem exatamente os " +
                "temas das perguntas, com exemplos reais para testar.";
        }

        el.relatorio.textContent = mensagem;

        // Leva o foco ao título do resultado, para quem usa leitor de tela.
        el.relatorioTitulo.focus();
    }

    function reiniciar() {
        indiceAtual = 0;
        acertos = 0;

        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_RESULTADO, null);

        el.resultado.hidden = true;
        el.relatorioSecao.hidden = true;
        el.area.hidden = false;

        renderizarPergunta();
    }

    // ---------- Eventos ----------

    el.proximo.addEventListener("click", avancar);
    el.refazer.addEventListener("click", reiniciar);

    renderizarPergunta();
})();
