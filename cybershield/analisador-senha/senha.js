"use strict";

/**
 * ANALISADOR DE SENHAS — CyberShield
 * Análise e geração acontecem inteiramente no navegador. Nenhuma senha é
 * enviada, registrada ou armazenada.
 */
(function () {

    var campo = document.getElementById("senhaCampo");

    if (!campo) {
        return;
    }

    var CS = window.CyberShield;

    var TAMANHO_MAXIMO = 128;

    var CLASSES_DE_FORCA = ["forca-fraca", "forca-media", "forca-forte", "forca-muito-forte"];

    var FAIXAS_FORCA = [
        { min: 80, classe: "forca-muito-forte", tag: "muito forte" },
        { min: 60, classe: "forca-forte", tag: "forte" },
        { min: 35, classe: "forca-media", tag: "média" },
        { min: 0, classe: "forca-fraca", tag: "fraca" }
    ];

    // Estimativa deliberadamente conservadora (a favor de quem ataca):
    // hardware dedicado fazendo um ataque offline.
    var TENTATIVAS_POR_SEGUNDO = 1e10;
    var SEGUNDOS_POR_ANO = 31557600;

    var el = {
        campo: campo,
        mostrar: document.getElementById("senhaMostrar"),
        classificacao: document.getElementById("senhaClassificacao"),
        tempo: document.getElementById("senhaTempo"),
        criterios: document.getElementById("senhaCriterios"),
        barra: document.getElementById("senhaBarra"),
        barraLabel: document.getElementById("senhaBarraLabel"),
        valor: document.getElementById("senhaValor"),
        tag: document.getElementById("senhaTag"),
        relatorio: document.getElementById("senhaRelatorio"),

        comprimento: document.getElementById("senhaComprimento"),
        comprimentoValor: document.getElementById("senhaComprimentoValor"),
        optMinusculas: document.getElementById("optMinusculas"),
        optMaiusculas: document.getElementById("optMaiusculas"),
        optNumeros: document.getElementById("optNumeros"),
        optSimbolos: document.getElementById("optSimbolos"),
        geradorAviso: document.getElementById("senhaGeradorAviso"),
        gerar: document.getElementById("senhaGerar"),
        gerada: document.getElementById("senhaGerada"),
        copiar: document.getElementById("senhaCopiar"),
        entropia: document.getElementById("senhaEntropia")
    };

    // ---------- Senhas extremamente comuns (heurística, não exaustiva) ----------

    var SENHAS_COMUNS = [
        "123456", "123456789", "12345678", "12345", "1234567890", "1234567",
        "111111", "000000", "1234", "123123", "123321", "qwerty", "qwerty123",
        "abc123", "password", "senha", "senha123", "iloveyou", "admin",
        "admin123", "bemvindo", "welcome", "letmein", "monkey", "dragon",
        "football", "baseball", "superman", "batman", "trustno1", "master",
        "1q2w3e4r", "asdfgh", "asdfghjkl", "zxcvbn", "zxcvbnm", "qazwsx",
        "brasil", "brasil123", "flamengo", "corinthians", "vasco", "palmeiras",
        "gremio", "internacional", "deus123", "jesus123", "amor123", "teste123",
        "mudar123", "senha1234"
    ];

    function possuiSenhaComum(senha) {
        return SENHAS_COMUNS.indexOf(senha.toLowerCase()) !== -1;
    }

    function possuiSequenciaOuRepeticao(senha) {
        if (/(.)\1{3,}/.test(senha)) {
            return true;
        }

        var minusculo = senha.toLowerCase();

        var sequencias = [
            "0123456789",
            "9876543210",
            "abcdefghijklmnopqrstuvwxyz",
            "zyxwvutsrqponmlkjihgfedcba",
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm"
        ];

        return sequencias.some(function (sequencia) {
            for (var i = 0; i <= sequencia.length - 4; i++) {
                if (minusculo.indexOf(sequencia.slice(i, i + 4)) !== -1) {
                    return true;
                }
            }
            return false;
        });
    }

    function tamanhoDoAlfabeto(senha) {
        var tamanho = 0;
        if (/[a-z]/.test(senha)) tamanho += 26;
        if (/[A-Z]/.test(senha)) tamanho += 26;
        if (/[0-9]/.test(senha)) tamanho += 10;
        if (/[^A-Za-z0-9]/.test(senha)) tamanho += 32;
        return tamanho || 1;
    }

    // ---------- Pontuação de força (0-100) ----------

    function analisarSenha(senha) {

        var criterios = {
            comprimento: senha.length >= 8,
            minuscula: /[a-z]/.test(senha),
            maiuscula: /[A-Z]/.test(senha),
            numero: /[0-9]/.test(senha),
            simbolo: /[^A-Za-z0-9]/.test(senha),
            semPadraoObvio: !possuiSequenciaOuRepeticao(senha),
            naoComum: !possuiSenhaComum(senha)
        };

        var pontos = Math.min(senha.length * 4, 40);

        if (criterios.minuscula) pontos += 15;
        if (criterios.maiuscula) pontos += 15;
        if (criterios.numero) pontos += 15;
        if (criterios.simbolo) pontos += 15;

        if (!criterios.semPadraoObvio) pontos -= 20;
        if (!criterios.comprimento) pontos = Math.min(pontos, 30);
        if (!criterios.naoComum) pontos = Math.min(pontos, 5);

        return { pontos: Math.max(0, Math.min(100, pontos)), criterios: criterios };
    }

    // ---------- Tempo estimado de quebra ----------

    function formatarTempo(log10Segundos) {

        if (log10Segundos < 0) {
            return "menos de 1 segundo";
        }

        var LOG10_MINUTO = Math.log10(60);
        var LOG10_HORA = Math.log10(3600);
        var LOG10_DIA = Math.log10(86400);
        var LOG10_ANO = Math.log10(SEGUNDOS_POR_ANO);
        var LOG10_SECULO = Math.log10(SEGUNDOS_POR_ANO * 100);
        var LIMITE_REPRESENTAVEL = 15; // acima disso, Math.pow perde precisão

        if (log10Segundos < LOG10_MINUTO) {
            return Math.round(Math.pow(10, log10Segundos)) + " segundos";
        }

        if (log10Segundos < LOG10_HORA) {
            return Math.round(Math.pow(10, log10Segundos) / 60) + " minutos";
        }

        if (log10Segundos < LOG10_DIA) {
            return Math.round(Math.pow(10, log10Segundos) / 3600) + " horas";
        }

        if (log10Segundos < LOG10_ANO) {
            return Math.round(Math.pow(10, log10Segundos) / 86400) + " dias";
        }

        if (log10Segundos < LOG10_SECULO) {
            return Math.round(Math.pow(10, log10Segundos) / SEGUNDOS_POR_ANO).toLocaleString("pt-BR") + " anos";
        }

        if (log10Segundos < LIMITE_REPRESENTAVEL) {
            return "mais de " + Math.round(Math.pow(10, log10Segundos) / SEGUNDOS_POR_ANO).toLocaleString("pt-BR") + " anos";
        }

        return "mais de 10^" + Math.floor(log10Segundos - LOG10_ANO) + " anos — força bruta não chega lá";
    }

    function estimarTempoDeQuebra(senha, criterios) {

        if (senha.length === 0) {
            return "—";
        }

        if (!criterios.naoComum) {
            return "segundos — está na lista que todo atacante testa primeiro";
        }

        var log10Combinacoes = senha.length * Math.log10(tamanhoDoAlfabeto(senha));

        return formatarTempo(log10Combinacoes - Math.log10(TENTATIVAS_POR_SEGUNDO));
    }

    // ---------- Relatório ----------

    function gerarRelatorio(nivel, criterios) {

        var faltando = [];

        if (!criterios.comprimento) faltando.push("aumentar o comprimento (mínimo 8, ideal 12 ou mais)");
        if (!criterios.minuscula) faltando.push("incluir letras minúsculas");
        if (!criterios.maiuscula) faltando.push("incluir letras maiúsculas");
        if (!criterios.numero) faltando.push("incluir números");
        if (!criterios.simbolo) faltando.push("incluir símbolos (! @ # $)");
        if (!criterios.semPadraoObvio) faltando.push("evitar sequências e repetições óbvias");
        if (!criterios.naoComum) faltando.push("trocar de senha: esta aparece nas listas de senhas mais usadas");

        if (faltando.length === 0) {
            return "Senha " + nivel.tag + ": ela passa em todos os critérios avaliados. " +
                "Use uma senha diferente em cada serviço e ative a verificação em duas etapas onde der.";
        }

        return "Nível " + nivel.tag + " (" + nivel.pontos + "/100). Para melhorar: " + faltando.join("; ") + ".";
    }

    // ---------- Checklist (ícone + texto, nunca só cor) ----------

    function preencherChecklist(criterios) {
        CS.limparElemento(el.criterios);

        var itens = [
            { ok: criterios.comprimento, texto: "Pelo menos 8 caracteres" },
            { ok: criterios.minuscula, texto: "Letra minúscula" },
            { ok: criterios.maiuscula, texto: "Letra maiúscula" },
            { ok: criterios.numero, texto: "Número" },
            { ok: criterios.simbolo, texto: "Símbolo (! @ # $)" },
            { ok: criterios.semPadraoObvio, texto: "Sem sequências ou repetições óbvias" },
            { ok: criterios.naoComum, texto: "Fora da lista de senhas mais comuns" }
        ];

        itens.forEach(function (item) {
            var li = document.createElement("li");
            li.dataset.atendido = String(item.ok);

            var rotulo = document.createElement("span");
            rotulo.className = "sr-only";
            rotulo.textContent = item.ok ? "Atendido: " : "Não atendido: ";

            li.appendChild(rotulo);
            li.appendChild(document.createTextNode(item.texto));
            el.criterios.appendChild(li);
        });
    }

    // ---------- Renderização ----------

    function renderizarVazio() {
        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_FORCA, null);

        el.classificacao.textContent = "—";
        el.tempo.textContent = "—";

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: 0,
            vazio: true,
            textoVazio: "aguardando entrada"
        });

        CS.limparElemento(el.criterios);
        var item = document.createElement("li");
        item.textContent = "Digite uma senha para começar.";
        el.criterios.appendChild(item);

        el.tag.textContent = "aguardando";
        el.relatorio.textContent = "Digite uma senha acima para receber uma avaliação.";
    }

    function renderizarResultado(senha) {
        var analise = analisarSenha(senha);
        var nivel = CS.classificarPorFaixas(analise.pontos, FAIXAS_FORCA);

        CS.aplicarClasseDeEstado(document.body, CLASSES_DE_FORCA, nivel.classe);

        el.classificacao.textContent = nivel.tag + " · " + nivel.pontos + "/100";
        el.tempo.textContent = estimarTempoDeQuebra(senha, analise.criterios);

        CS.atualizarMedidor({
            barraFill: el.barra,
            barraLabel: el.barraLabel,
            valor: el.valor,
            pontos: nivel.pontos,
            vazio: false,
            prefixo: "força",
            textoNivel: nivel.tag
        });

        preencherChecklist(analise.criterios);

        el.tag.textContent = nivel.tag;
        el.relatorio.textContent = gerarRelatorio(nivel, analise.criterios);
    }

    function executarAnalise() {
        var senha = CS.sanitizarTexto(el.campo.value, TAMANHO_MAXIMO);

        if (senha.length === 0) {
            renderizarVazio();
            return;
        }

        renderizarResultado(senha);
    }

    el.campo.addEventListener("input", CS.debounce(executarAnalise, 140));

    el.mostrar.addEventListener("click", function () {
        var visivel = el.campo.type === "text";

        el.campo.type = visivel ? "password" : "text";
        el.mostrar.setAttribute("aria-pressed", String(!visivel));
        el.mostrar.setAttribute("aria-label", visivel ? "Mostrar senha" : "Ocultar senha");
        el.campo.focus();
    });

    renderizarVazio();

    // =====================================================================
    // GERADOR
    // =====================================================================

    var CONJUNTOS = {
        minusculas: "abcdefghijklmnopqrstuvwxyz",
        maiusculas: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        numeros: "0123456789",
        simbolos: "!@#$%^&*()-_=+[]{};:,.<>?"
    };

    var senhaGeradaAtual = "";

    function obterOpcoes() {
        return {
            minusculas: el.optMinusculas.checked,
            maiusculas: el.optMaiusculas.checked,
            numeros: el.optNumeros.checked,
            simbolos: el.optSimbolos.checked
        };
    }

    function gerarSenhaSegura(comprimento, opcoes) {
        var ativos = Object.keys(opcoes)
            .filter(function (chave) { return opcoes[chave]; })
            .map(function (chave) { return CONJUNTOS[chave]; });

        var conjuntos = ativos.length > 0 ? ativos : [CONJUNTOS.minusculas];
        var alfabeto = conjuntos.join("");
        var caracteres = [];

        // Garante ao menos um caractere de cada conjunto marcado.
        conjuntos.forEach(function (conjunto) {
            caracteres.push(conjunto[CS.indiceAleatorioSeguro(conjunto.length)]);
        });

        while (caracteres.length < comprimento) {
            caracteres.push(alfabeto[CS.indiceAleatorioSeguro(alfabeto.length)]);
        }

        return CS.embaralharComSeguranca(caracteres).slice(0, comprimento).join("");
    }

    /** Colore cada caractere por tipo — dá para conferir a mistura de olho. */
    function exibirSenhaGerada(senha) {
        CS.limparElemento(el.gerada);
        el.gerada.dataset.vazio = "false";

        senha.split("").forEach(function (caractere) {
            var span = document.createElement("span");

            if (/[0-9]/.test(caractere)) {
                span.className = "c-numero";
            } else if (/[A-Z]/.test(caractere)) {
                span.className = "c-maiuscula";
            } else if (/[a-z]/.test(caractere)) {
                span.className = "c-minuscula";
            } else {
                span.className = "c-simbolo";
            }

            span.textContent = caractere;
            el.gerada.appendChild(span);
        });
    }

    function algumaOpcaoMarcada(opcoes) {
        return Object.keys(opcoes).some(function (chave) { return opcoes[chave]; });
    }

    function atualizarAvisoDeOpcoes() {
        var nenhuma = !algumaOpcaoMarcada(obterOpcoes());

        el.geradorAviso.textContent = nenhuma ? "Escolha ao menos um tipo de caractere." : "";
        el.gerar.disabled = nenhuma;
    }

    [el.optMinusculas, el.optMaiusculas, el.optNumeros, el.optSimbolos].forEach(function (caixa) {
        caixa.addEventListener("change", atualizarAvisoDeOpcoes);
    });

    el.comprimento.addEventListener("input", function () {
        el.comprimentoValor.textContent = el.comprimento.value;
    });

    el.gerar.addEventListener("click", function () {
        var opcoes = obterOpcoes();

        if (!algumaOpcaoMarcada(opcoes)) {
            atualizarAvisoDeOpcoes();
            return;
        }

        var comprimento = Number(el.comprimento.value);
        senhaGeradaAtual = gerarSenhaSegura(comprimento, opcoes);

        exibirSenhaGerada(senhaGeradaAtual);
        el.copiar.disabled = false;

        var bits = Math.round(comprimento * Math.log2(tamanhoDoAlfabeto(senhaGeradaAtual)));

        el.entropia.textContent =
            "≈ " + bits + " bits de entropia · resistiria por " +
            estimarTempoDeQuebra(senhaGeradaAtual, { naoComum: true });
    });

    el.copiar.addEventListener("click", function () {
        if (!senhaGeradaAtual) {
            return;
        }

        CS.copiarTexto(senhaGeradaAtual, el.copiar, "Copiado");
    });
})();
