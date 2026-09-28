"use strict";

/**
 * DETECTOR DE PHISHING — CyberShield
 * Toda a análise roda localmente. Nenhuma mensagem é enviada ou armazenada.
 */
(function () {

    var campo = document.getElementById("msgCampo");

    if (!campo) {
        return;
    }

    var CS = window.CyberShield;

    var TAMANHO_MAXIMO = 5000;

    var CLASSES_DE_RISCO = ["nivel-perigo", "nivel-suspeito", "nivel-seguro"];

    var el = {
        campo: campo,
        contador: document.getElementById("msgContador"),
        analisar: document.getElementById("msgAnalisar"),
        exemplos: document.getElementById("msgExemplos"),
        painel: document.getElementById("msgPainel"),
        classificacao: document.getElementById("msgClassificacao"),
        total: document.getElementById("msgTotal"),
        problemas: document.getElementById("msgProblemas"),
        barra: document.getElementById("msgBarra"),
        barraLabel: document.getElementById("msgBarraLabel"),
        valor: document.getElementById("msgValor"),
        tag: document.getElementById("msgTag"),
        relatorio: document.getElementById("msgRelatorio")
    };

    // ---------- Padrões observados em golpes (heurística, não exaustiva) ----------

    var PADROES_URGENCIA = [
        "urgente", "imediatamente", "última chance", "expira hoje", "expira em",
        "24 horas", "48 horas", "conta será bloqueada", "conta será suspensa",
        "conta bloqueada", "acesso será suspenso", "aja agora", "não perca tempo",
        "responda o quanto antes", "prazo final"
    ];

    var PADROES_PEDIDO_DADOS = [
        "confirme sua senha", "informe sua senha", "digite sua senha", "número do cartão",
        "código de segurança", "cvv", "confirme seus dados", "atualize seus dados",
        "cpf e senha", "dados bancários", "clique aqui para confirmar",
        "clique no link abaixo", "verifique sua conta", "valide sua conta"
    ];

    var PADROES_AMEACA = [
        "será cancelado", "será encerrado", "ação legal", "processo judicial", "multa",
        "restrição", "irregularidade detectada", "atividade suspeita detectada",
        "pendência financeira"
    ];

    var PADROES_OFERTA = [
        "você ganhou", "parabéns, você foi selecionado", "prêmio", "sorteio",
        "100% grátis", "totalmente grátis", "cashback", "resgate agora",
        "oferta exclusiva", "apenas hoje"
    ];

    var SAUDACOES_GENERICAS = [
        "prezado cliente", "caro cliente", "estimado usuário", "caro usuário",
        "prezado(a)", "dear customer", "caro assinante"
    ];

    // ---------- Exemplos ----------

    var EXEMPLOS = {

        golpe1:
            "Prezado cliente,\n\n" +
            "Identificamos uma atividade suspeita em sua conta. Por medidas de segurança, " +
            "sua conta será bloqueada em 24 horas caso você não confirme seus dados.\n\n" +
            "Clique no link abaixo e informe sua senha para regularizar a situação:\n" +
            "http://banco-verificacao-urgente.xyz\n\n" +
            "Atenciosamente,\nEquipe de Segurança",

        golpe2:
            "PARABÉNS! Você foi selecionado em nosso sorteio exclusivo!!!\n\n" +
            "Você ganhou um prêmio de R$ 3.000,00. Esta é sua ÚLTIMA CHANCE de resgatar, " +
            "a oferta expira em 24 horas.\n\n" +
            "Clique aqui e informe seus dados bancários para receber o valor:\n" +
            "http://premio-sorteio-oficial.top\n\n" +
            "Não perca tempo, aja agora!",

        golpe3:
            "Caro cliente,\n\n" +
            "Sua encomenda está retida por pendência no pagamento da taxa de importação. " +
            "Caso não seja regularizado imediatamente, o pacote será devolvido.\n\n" +
            "Acesse o link e informe seus dados e número do cartão para liberar a entrega:\n" +
            "http://correios-rastreamento.club\n\n" +
            "Prazo final: hoje.",

        real1:
            "Olá Lucas,\n\n" +
            "Recebemos seu pedido #48213 e ele já está sendo preparado para envio. " +
            "Você pode acompanhar o status diretamente na sua conta no site.\n\n" +
            "Qualquer dúvida, entre em contato pelo nosso canal oficial de atendimento.\n\n" +
            "Obrigado pela compra!",

        real2:
            "Oi Lucas, tudo bem?\n\n" +
            "Passando para confirmar nossa reunião de amanhã às 14h sobre o andamento do projeto. " +
            "Se precisar remarcar, me avisa por aqui mesmo.\n\n" +
            "Até lá!"
    };

    // ---------- Análise (0 = limpo, 100 = risco extremo) ----------

    function encontrar(textoMinusculo, lista) {
        return lista.filter(function (termo) {
            return textoMinusculo.indexOf(termo) !== -1;
        });
    }

    function analisarMensagem(original) {
        var minusculo = original.toLowerCase();
        var pontos = 0;
        var problemas = [];

        var urgencia = encontrar(minusculo, PADROES_URGENCIA);
        if (urgencia.length > 0) {
            problemas.push("Cria pressa artificial para você não ter tempo de pensar (\"" + urgencia[0] + "\").");
            pontos += 20;
        }

        var dados = encontrar(minusculo, PADROES_PEDIDO_DADOS);
        if (dados.length > 0) {
            problemas.push("Pede dado sensível ou clique em link (\"" + dados[0] + "\"). Empresas não fazem isso por mensagem.");
            pontos += 30;
        }

        var ameaca = encontrar(minusculo, PADROES_AMEACA);
        if (ameaca.length > 0) {
            problemas.push("Ameaça com consequência ruim se você não agir (\"" + ameaca[0] + "\").");
            pontos += 20;
        }

        var oferta = encontrar(minusculo, PADROES_OFERTA);
        if (oferta.length > 0) {
            problemas.push("Promete vantagem grande demais para ser real (\"" + oferta[0] + "\").");
            pontos += 20;
        }

        var saudacao = encontrar(minusculo, SAUDACOES_GENERICAS);
        if (saudacao.length > 0) {
            problemas.push("Saudação genérica (\"" + saudacao[0] + "\"): quem tem sua conta sabe seu nome.");
            pontos += 10;
        }

        if (/https?:\/\/|www\./i.test(original)) {
            problemas.push("Traz um link. Confira o domínio no analisador de links antes de abrir.");
            pontos += 10;
        }

        var letras = (original.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
        var maiusculas = (original.match(/[A-ZÀ-Ý]/g) || []).length;

        if (letras > 20 && maiusculas / letras > 0.3) {
            problemas.push("Maiúsculas em excesso, recurso comum de alarme falso.");
            pontos += 10;
        }

        if (/[!?]{2,}/.test(original)) {
            problemas.push("Pontuação exagerada, usada para gerar tensão.");
            pontos += 10;
        }

        if (/anexo|attachment|arquivo em anexo/i.test(original) && urgencia.length > 0) {
            problemas.push("Anexo somado a urgência — combinação clássica de golpe com arquivo malicioso.");
            pontos += 15;
        }

        return { pontos: Math.min(100, pontos), problemas: problemas };
    }

    function gerarRelatorio(nivel, problemas) {

        if (problemas.length === 0) {
            return "Nenhum padrão típico de phishing nesta mensagem. Continue " +
                "desconfiando de remetente desconhecido e não forneça dados nem clique " +
                "em links sem confirmar a origem por outro canal.";
        }

        var abertura;

        if (nivel.classe === "nivel-perigo") {
            abertura = "Esta mensagem reúne " + problemas.length + " sinais ligados a phishing (" + nivel.pontos +
                "/100). Não clique, não responda e não informe nada.";
        } else if (nivel.classe === "nivel-suspeito") {
            abertura = "Esta mensagem tem " + problemas.length + " ponto(s) de atenção (" + nivel.pontos +
                "/100). Antes de qualquer ação, procure a empresa pelo canal oficial.";
        } else {
            abertura = "Esta mensagem tem " + problemas.length + " observação(ões) (" + nivel.pontos +
                "/100), nenhuma conclusiva sozinha.";
        }

        var detalhes = problemas.map(function (problema, indice) {
            return (indice + 1) + ". " + problema;
        }).join(" ");

        return abertura + " Detalhes: " + detalhes;
    }

    // ---------- Renderização ----------

    function renderizarVazio() {
        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_RISCO, null);

        el.classificacao.textContent = "—";
        el.total.textContent = "—";

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: 0,
            vazio: true,
            textoVazio: "aguardando entrada"
        });

        CS.preencherLista(el.problemas, [], "Cole uma mensagem para analisar.");

        el.tag.textContent = "aguardando";
        el.relatorio.textContent = "Cole uma mensagem acima e peça a análise.";
    }

    function renderizarResultado(resultado) {
        var nivel = CS.classificarRisco(resultado.pontos);

        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_RISCO, nivel.classe);

        el.classificacao.textContent = nivel.tag.toLowerCase() + " · " + nivel.pontos + "/100";
        el.total.textContent = resultado.problemas.length === 1
            ? "1 sinal"
            : resultado.problemas.length + " sinais";

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: nivel.pontos,
            vazio: false,
            prefixo: "risco",
            textoNivel: nivel.tag
        });

        CS.preencherLista(el.problemas, resultado.problemas, "Nenhum indício de phishing encontrado.");

        el.tag.textContent = nivel.tag.toLowerCase();
        el.relatorio.textContent = gerarRelatorio(nivel, resultado.problemas);
    }

    function executarAnalise() {
        var texto = CS.sanitizarTexto(el.campo.value, TAMANHO_MAXIMO);

        if (texto.length === 0) {
            renderizarVazio();
            return;
        }

        CS.executarComCarregamento(el.analisar, "Analisando…", function () {
            renderizarResultado(analisarMensagem(texto));
        });
    }

    // ---------- Eventos ----------

    el.analisar.addEventListener("click", executarAnalise);

    CS.configurarContador(el.campo, el.contador, TAMANHO_MAXIMO);
    CS.configurarDisclosure(el.exemplos, el.painel);

    el.painel.querySelectorAll("[data-exemplo]").forEach(function (botao) {
        botao.addEventListener("click", function () {
            var chave = botao.getAttribute("data-exemplo");

            if (!Object.prototype.hasOwnProperty.call(EXEMPLOS, chave)) {
                return;
            }

            el.campo.value = EXEMPLOS[chave];
            el.campo.dispatchEvent(new Event("input")); // atualiza o contador
            executarAnalise();

            CS.fecharPainel(el.exemplos, el.painel);
            el.campo.focus();
        });
    });
})();
