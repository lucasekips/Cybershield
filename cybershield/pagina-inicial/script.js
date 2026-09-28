"use strict";

/**
 * Página inicial — sequência de abertura do console.
 *
 * É o único momento de movimento não solicitado do site: acontece uma vez,
 * no carregamento, e depois a página fica parada. Com `prefers-reduced-motion`
 * o texto aparece inteiro de imediato.
 */
(function () {

    var saida = document.getElementById("consoleSaida");

    if (!saida) {
        return;
    }

    var CS = window.CyberShield;

    // Cada linha é uma lista de trechos: texto + classe de cor opcional.
    var LINHAS = [
        [{ t: "> cybershield --iniciar", c: "eco" }],
        [{ t: "  motor de análise ..... " }, { t: "pronto", c: "ok" }],
        [{ t: "  execução ............. " }, { t: "local", c: "ok" }],
        [{ t: "  conexões de saída .... " }, { t: "0", c: "zero" }],
        [{ t: "  dados armazenados .... " }, { t: "0", c: "zero" }],
        [{ t: "" }],
        [{ t: "4 ferramentas prontas. Escolha uma abaixo." }]
    ];

    var cursor = document.createElement("span");
    cursor.className = "cursor";

    function escreverTrecho(trecho) {
        var no = document.createElement("span");

        if (trecho.c) {
            no.className = trecho.c;
        }

        no.textContent = trecho.t;
        saida.insertBefore(no, cursor);
    }

    function quebrarLinha() {
        saida.insertBefore(document.createTextNode("\n"), cursor);
    }

    function renderizarTudo() {
        LINHAS.forEach(function (linha, indice) {
            linha.forEach(escreverTrecho);

            if (indice < LINHAS.length - 1) {
                quebrarLinha();
            }
        });
    }

    saida.appendChild(cursor);

    if (!CS || CS.movimentoReduzido) {
        renderizarTudo();
        return;
    }

    // Primeira linha digitada caractere a caractere; as demais entram
    // como respostas do sistema, em blocos.
    var primeira = LINHAS[0][0];
    var escrita = document.createElement("span");
    escrita.className = primeira.c;
    saida.insertBefore(escrita, cursor);

    var posicao = 0;

    function digitar() {
        escrita.textContent = primeira.t.slice(0, ++posicao);

        if (posicao < primeira.t.length) {
            window.setTimeout(digitar, 38);
            return;
        }

        quebrarLinha();
        window.setTimeout(proximaLinha, 260);
    }

    var indiceLinha = 1;

    function proximaLinha() {
        if (indiceLinha >= LINHAS.length) {
            return;
        }

        LINHAS[indiceLinha].forEach(escreverTrecho);

        if (indiceLinha < LINHAS.length - 1) {
            quebrarLinha();
        }

        indiceLinha += 1;
        window.setTimeout(proximaLinha, 150);
    }

    window.setTimeout(digitar, 320);
})();
