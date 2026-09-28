"use strict";

/**
 * ANALISADOR DE LINKS — CyberShield
 * Toda a análise roda localmente. Nenhum link é aberto, enviado ou armazenado.
 */
(function () {

    var campo = document.getElementById("linkCampo");

    if (!campo) {
        return;
    }

    var CS = window.CyberShield;

    var TAMANHO_MAXIMO = 2048;

    var CLASSES_DE_RISCO = ["nivel-perigo", "nivel-suspeito", "nivel-seguro"];

    var el = {
        campo: campo,
        analisar: document.getElementById("linkAnalisar"),
        exemplos: document.getElementById("linkExemplos"),
        painel: document.getElementById("linkPainel"),
        classificacao: document.getElementById("linkClassificacao"),
        dominio: document.getElementById("linkDominio"),
        problemas: document.getElementById("linkProblemas"),
        barra: document.getElementById("linkBarra"),
        barraLabel: document.getElementById("linkBarraLabel"),
        valor: document.getElementById("linkValor"),
        tag: document.getElementById("linkTag"),
        relatorio: document.getElementById("linkRelatorio")
    };

    // ---------- Listas de referência (heurísticas públicas, não exaustivas) ----------

    var ENCURTADORES = [
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
        "buff.ly", "shorturl.at", "rebrand.ly", "tiny.cc", "cutt.ly", "rb.gy"
    ];

    var TLDS_SUSPEITOS = [
        ".xyz", ".top", ".club", ".work", ".click", ".link", ".zip",
        ".review", ".country", ".stream", ".gq", ".tk", ".ml", ".cf", ".ga"
    ];

    // Um único array de objetos, não duas listas paralelas: a versão antiga
    // mantinha domínios e "nomes puros" em arrays separados alinhados por
    // índice, e como tinham tamanhos diferentes o detector chegava a acusar a
    // marca errada (achava "mercadolivre" e reportava "amazon.com.br").
    var MARCAS = [
        { dominio: "google.com", nome: "google" },
        { dominio: "facebook.com", nome: "facebook" },
        { dominio: "instagram.com", nome: "instagram" },
        { dominio: "whatsapp.com", nome: "whatsapp" },
        { dominio: "youtube.com", nome: "youtube" },
        { dominio: "netflix.com", nome: "netflix" },
        { dominio: "amazon.com", nome: "amazon" },
        { dominio: "amazon.com.br", nome: "amazon" },
        { dominio: "mercadolivre.com.br", nome: "mercadolivre" },
        { dominio: "paypal.com", nome: "paypal" },
        { dominio: "microsoft.com", nome: "microsoft" },
        { dominio: "apple.com", nome: "apple" },
        { dominio: "gov.br", nome: "gov" },
        { dominio: "caixa.gov.br", nome: "caixa" },
        { dominio: "bb.com.br", nome: "bb" },
        { dominio: "itau.com.br", nome: "itau" },
        { dominio: "bradesco.com.br", nome: "bradesco" },
        { dominio: "santander.com.br", nome: "santander" },
        { dominio: "nubank.com.br", nome: "nubank" },
        { dominio: "linkedin.com", nome: "linkedin" },
        { dominio: "twitter.com", nome: "twitter" },
        { dominio: "x.com", nome: null }, // curto demais para checar sem falso positivo
        { dominio: "tiktok.com", nome: "tiktok" },
        { dominio: "outlook.com", nome: "outlook" },
        { dominio: "gmail.com", nome: "gmail" }
    ];

    var PALAVRAS_ISCA = [
        "premio", "sorteio", "gratis", "urgente", "bloqueado", "bloqueio", "suspenso",
        "verificar-conta", "verificacao", "recuperar-senha", "redefinir-senha",
        "confirmar-dados", "atualizar-cadastro", "suporte", "ganhador", "parabens",
        "voce-ganhou", "resgatar", "cashback", "auxilio", "beneficio"
    ];

    // Esquemas que não são navegação http(s): nunca tratar como URL normal.
    var ESQUEMAS_PERIGOSOS = ["javascript:", "data:", "vbscript:", "file:"];

    var EXEMPLOS = {
        golpe1: "http://bb-verificacao-conta-urgente.xyz/acesso",
        golpe2: "http://mercadolivre.com.br.resgatar-premio.top/ganhador",
        golpe3: "http://192.168.42.19/login-cliente",
        golpe4: "http://amaz0n-suporte.click/confirmar-dados",
        real1: "https://www.gov.br/pt-br"
    };

    // ---------- Detecção ----------

    function distanciaLevenshtein(a, b) {
        var linhas = a.length + 1;
        var colunas = b.length + 1;
        var matriz = [];

        for (var i = 0; i < linhas; i++) {
            matriz.push(new Array(colunas).fill(0));
            matriz[i][0] = i;
        }

        for (var j = 0; j < colunas; j++) {
            matriz[0][j] = j;
        }

        for (var y = 1; y < linhas; y++) {
            for (var x = 1; x < colunas; x++) {
                var custo = a[y - 1] === b[x - 1] ? 0 : 1;

                matriz[y][x] = Math.min(
                    matriz[y - 1][x] + 1,
                    matriz[y][x - 1] + 1,
                    matriz[y - 1][x - 1] + custo
                );
            }
        }

        return matriz[linhas - 1][colunas - 1];
    }

    function normalizarLeetspeak(texto) {
        return texto
            .replace(/0/g, "o")
            .replace(/1/g, "l")
            .replace(/3/g, "e")
            .replace(/4/g, "a")
            .replace(/5/g, "s")
            .replace(/7/g, "t")
            .replace(/@/g, "a");
    }

    function detectarTyposquatting(dominio) {
        var limpo = dominio.replace(/^www\./, "");
        var normalizado = normalizarLeetspeak(limpo);

        for (var i = 0; i < MARCAS.length; i++) {
            var alvo = MARCAS[i].dominio;

            if (limpo === alvo || limpo.endsWith("." + alvo)) {
                return null;
            }

            var limite = Math.min(limpo.length, alvo.length) <= 8 ? 1 : 2;

            var distancia = distanciaLevenshtein(limpo, alvo);

            if (distancia > 0 && distancia <= limite) {
                return { marca: alvo, viaLeet: false };
            }

            var distanciaLeet = distanciaLevenshtein(normalizado, alvo);

            if (distanciaLeet === 0 && limpo !== alvo) {
                return { marca: alvo, viaLeet: true };
            }

            if (distanciaLeet > 0 && distanciaLeet <= limite) {
                return { marca: alvo, viaLeet: true };
            }
        }

        return null;
    }

    function detectarMarcaComoIsca(dominio) {
        var limpo = dominio.replace(/^www\./, "");

        // Compara também a versão sem leetspeak: "amaz0n-suporte.click" não
        // fica perto o bastante de "amazon.com" para o Levenshtein acusar,
        // mas carrega o nome da marca disfarçado com um zero.
        var normalizado = normalizarLeetspeak(limpo);

        for (var i = 0; i < MARCAS.length; i++) {
            var marca = MARCAS[i];

            if (!marca.nome) {
                continue;
            }

            if (limpo === marca.dominio || limpo.endsWith("." + marca.dominio)) {
                continue;
            }

            if (limpo.indexOf(marca.nome) !== -1) {
                return { marca: marca.dominio, viaLeet: false };
            }

            if (normalizado.indexOf(marca.nome) !== -1) {
                return { marca: marca.dominio, viaLeet: true };
            }
        }

        return null;
    }

    function possuiEsquemaPerigoso(valor) {
        var minusculo = valor.trim().toLowerCase();

        return ESQUEMAS_PERIGOSOS.some(function (esquema) {
            return minusculo.indexOf(esquema) === 0;
        });
    }

    // ---------- Análise principal ----------
    // 0 = nenhum sinal de risco, 100 = risco extremo. Mesma escala do
    // detector de phishing, para que barra e rótulos signifiquem o mesmo
    // nas duas ferramentas.

    function analisarLink(original) {

        if (possuiEsquemaPerigoso(original)) {
            return {
                valido: true,
                pontos: 100,
                dominio: null,
                problemas: [
                    "O texto usa um esquema que não é endereço web comum (javascript:, data:), o que impede uma análise segura — trate como risco máximo."
                ]
            };
        }

        var comProtocolo = /^https?:\/\//i.test(original) ? original : "http://" + original;
        var url;

        try {
            url = new URL(comProtocolo);
        } catch (erro) {
            return { valido: false };
        }

        var dominio = url.hostname.toLowerCase();
        var pontos = 0;
        var problemas = [];

        if (!/^https:\/\//i.test(original)) {
            problemas.push("Não usa conexão segura (HTTPS), então o que você envia trafega sem proteção.");
            pontos += 20;
        }

        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(dominio)) {
            problemas.push("Aponta para um número de IP em vez de um domínio — empresas de verdade não fazem isso.");
            pontos += 30;
        }

        var usaEncurtador = ENCURTADORES.some(function (servico) {
            return dominio === servico || dominio.endsWith("." + servico);
        });

        if (usaEncurtador) {
            problemas.push("É um link encurtado: o destino real fica escondido até você clicar.");
            pontos += 20;
        }

        if (TLDS_SUSPEITOS.some(function (tld) { return dominio.endsWith(tld); })) {
            problemas.push("A extensão do domínio é das mais usadas em campanhas de fraude.");
            pontos += 15;
        }

        if (original.indexOf("@") !== -1) {
            problemas.push("Contém '@', truque que faz o navegador ignorar tudo antes do símbolo e ir para outro destino.");
            pontos += 25;
        }

        if (dominio.split(".").length > 4) {
            problemas.push("Tem subdomínios demais, padrão usado para empurrar o domínio verdadeiro para fora da tela no celular.");
            pontos += 15;
        }

        if (dominio.indexOf("xn--") !== -1) {
            problemas.push("Usa punycode: há caracteres de outro alfabeto disfarçados de letras comuns.");
            pontos += 20;
        }

        if ((dominio.match(/-/g) || []).length >= 3) {
            problemas.push("Excesso de hífens no domínio, padrão comum em sites montados às pressas.");
            pontos += 10;
        }

        var typo = detectarTyposquatting(dominio);

        if (typo) {
            problemas.push(
                typo.viaLeet
                    ? "Troca letras por números para imitar \"" + typo.marca + "\" (0 no lugar de o, 1 no lugar de l)."
                    : "Parece muito com \"" + typo.marca + "\", mas não é o domínio oficial."
            );
            pontos += 35;
        } else {
            var isca = detectarMarcaComoIsca(dominio);

            if (isca) {
                problemas.push(
                    isca.viaLeet
                        ? "Esconde o nome \"" + isca.marca + "\" trocando letras por números, e o site não pertence a essa empresa."
                        : "O nome \"" + isca.marca + "\" aparece no endereço, mas o site não pertence a essa empresa."
                );
                pontos += 25;
            }
        }

        var iscas = PALAVRAS_ISCA.filter(function (palavra) {
            return original.toLowerCase().indexOf(palavra) !== -1;
        });

        if (iscas.length > 0) {
            problemas.push("Contém termos de engenharia social: " + iscas.join(", ") + ".");
            pontos += 15;
        }

        if (url.port && url.port !== "80" && url.port !== "443") {
            problemas.push("Aponta para uma porta fora do padrão (:" + url.port + "), incomum em sites legítimos.");
            pontos += 15;
        }

        if (/%00|%0d|%0a|\\/i.test(original)) {
            problemas.push("Tem caracteres codificados suspeitos, às vezes usados para escapar de filtros de segurança.");
            pontos += 20;
        }

        if (original.length > 90) {
            problemas.push("É longo demais, o que costuma esconder parâmetros que você não vê.");
            pontos += 10;
        }

        return {
            valido: true,
            pontos: Math.min(100, pontos),
            dominio: dominio,
            problemas: problemas
        };
    }

    function gerarRelatorio(nivel, problemas, dominio) {

        if (problemas.length === 0) {
            return "Nenhum sinal evidente de risco em \"" + dominio + "\". Isso não é um atestado: " +
                "continue desconfiando de mensagens que você não pediu, mesmo com link de aparência limpa, " +
                "e não digite senha ou dado bancário sem ter certeza do destino.";
        }

        var abertura;

        if (nivel.classe === "nivel-perigo") {
            abertura = "Este link reúne " + problemas.length + " sinais ligados a golpes (" + nivel.pontos +
                "/100). Não clique e não informe nenhum dado.";
        } else if (nivel.classe === "nivel-suspeito") {
            abertura = "Este link tem " + problemas.length + " ponto(s) de atenção (" + nivel.pontos +
                "/100). Antes de prosseguir, digite o endereço oficial direto no navegador em vez de usar o link recebido.";
        } else {
            abertura = "Este link tem " + problemas.length + " observação(ões) (" + nivel.pontos +
                "/100), nenhuma delas conclusiva sozinha.";
        }

        var detalhes = problemas.map(function (problema, indice) {
            return (indice + 1) + ". " + problema;
        }).join(" ");

        return abertura + " Detalhes: " + detalhes;
    }

    // ---------- Renderização (sempre via textContent) ----------

    function renderizarVazio() {
        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_RISCO, null);

        el.classificacao.textContent = "—";
        el.dominio.textContent = "—";

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: 0,
            vazio: true,
            textoVazio: "aguardando entrada"
        });

        CS.preencherLista(el.problemas, [], "Cole um link para analisar.");

        el.tag.textContent = "aguardando";
        el.relatorio.textContent = "Cole um link acima para receber uma análise de risco.";
    }

    function renderizarInvalido() {
        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_RISCO, "nivel-perigo");

        el.classificacao.textContent = "endereço inválido";
        el.dominio.textContent = "—";

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: 100,
            vazio: false,
            prefixo: "estado",
            textoNivel: "inválido"
        });

        CS.preencherLista(el.problemas, ["O texto não tem o formato de um endereço web."], "");

        el.tag.textContent = "inválido";
        el.relatorio.textContent = "Confira se o link foi colado inteiro, incluindo o domínio, e tente de novo.";
    }

    function renderizarResultado(resultado) {
        var nivel = CS.classificarRisco(resultado.pontos);

        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_RISCO, nivel.classe);

        el.classificacao.textContent = nivel.tag.toLowerCase() + " · " + nivel.pontos + "/100";
        el.dominio.textContent = resultado.dominio || "—";

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: nivel.pontos,
            vazio: false,
            prefixo: "risco",
            textoNivel: nivel.tag
        });

        CS.preencherLista(el.problemas, resultado.problemas, "Nenhum sinal de risco encontrado.");

        el.tag.textContent = nivel.tag.toLowerCase();
        el.relatorio.textContent = resultado.dominio
            ? gerarRelatorio(nivel, resultado.problemas, resultado.dominio)
            : resultado.problemas[0];
    }

    var analisando = false;

    async function testarLink() {
        if (analisando) {
            return;
        }

        var valor = CS.sanitizarTexto(el.campo.value, TAMANHO_MAXIMO);

        if (valor.length === 0) {
            renderizarVazio();
            return;
        }

        analisando = true;

        var resultado = analisarLink(valor);

        // A checagem de blacklist é assíncrona (busca listas públicas de
        // phishing/golpes) — roda ANTES de entregar para
        // executarComCarregamento, que foi feito para um callback síncrono.
        // O estado do botão é controlado aqui só durante essa espera e
        // devolvido do jeito que estava antes de seguir o fluxo de sempre.
        if (resultado.valido && resultado.dominio && window.CyberShieldBlacklist) {
            var textoOriginal = el.analisar.textContent;
            var jaEstavaDesabilitado = el.analisar.disabled;

            el.analisar.disabled = true;
            el.analisar.textContent = "Consultando blacklists…";

            var resultadoBlacklist = await window.CyberShieldBlacklist.verificar(valor);

            el.analisar.textContent = textoOriginal;
            el.analisar.disabled = jaEstavaDesabilitado;

            if (resultadoBlacklist.encontrado) {
                var nomesFontes = resultadoBlacklist.correspondencias
                    .map(function (c) { return c.nome; })
                    .join(", ");

                resultado.pontos = 100;
                resultado.problemas.unshift("Domínio confirmado em blacklist pública: " + nomesFontes + ".");
            }
        }

        CS.executarComCarregamento(el.analisar, "Analisando…", function () {
            if (!resultado.valido) {
                renderizarInvalido();
                return;
            }

            renderizarResultado(resultado);
        });

        analisando = false;
    }

    // ---------- Eventos ----------

    el.analisar.addEventListener("click", testarLink);

    el.campo.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter") {
            evento.preventDefault();
            testarLink();
        }
    });

    CS.configurarDisclosure(el.exemplos, el.painel);

    el.painel.querySelectorAll("[data-exemplo]").forEach(function (botao) {
        botao.addEventListener("click", function () {
            var chave = botao.getAttribute("data-exemplo");

            if (!Object.prototype.hasOwnProperty.call(EXEMPLOS, chave)) {
                return;
            }

            el.campo.value = EXEMPLOS[chave];
            testarLink();

            CS.fecharPainel(el.exemplos, el.painel);
            el.campo.focus();
        });
    });
})();