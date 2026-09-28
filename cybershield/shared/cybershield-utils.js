/**
 * CYBERSHIELD — utilitários compartilhados
 * ---------------------------------------------------------------------------
 * Camada única de sanitização, classificação por faixas e renderização segura.
 *
 * Princípios mantidos do projeto original:
 *  - toda saída na tela passa por `textContent` (nunca `innerHTML` com dado
 *    do usuário), prevenindo XSS por construção;
 *  - sanitização de entrada centralizada em um lugar auditável;
 *  - nenhuma chamada de rede, nenhum armazenamento.
 *
 * Carregue este arquivo ANTES do script de cada página.
 */
(function (global) {
    "use strict";

    var doc = global.document;

    var movimentoReduzido = global.matchMedia
        ? global.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    // -----------------------------------------------------------------------
    // Sanitização de entrada
    // -----------------------------------------------------------------------

    /**
     * Sanitiza uma string vinda de um campo de formulário:
     *  - garante que é string;
     *  - remove caracteres de controle invisíveis (exceto \n e \t);
     *  - limita o tamanho, evitando processamento absurdo de entradas enormes;
     *  - remove espaços nas bordas.
     *
     * Isto NÃO substitui `textContent` na exibição: é sanitização de entrada,
     * não de saída.
     */
    function sanitizarTexto(valor, tamanhoMaximo) {
        if (typeof valor !== "string") {
            return "";
        }

        var semControle = valor.replace(
            /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
            ""
        );

        var limite = typeof tamanhoMaximo === "number" ? tamanhoMaximo : 4000;

        return semControle.slice(0, limite).trim();
    }

    function clamp(valor, minimo, maximo) {
        return Math.min(maximo, Math.max(minimo, valor));
    }

    // -----------------------------------------------------------------------
    // Classificação por faixas
    // -----------------------------------------------------------------------

    /**
     * Recebe uma pontuação (0-100) e faixas ordenadas do maior "min" para o
     * menor; devolve a primeira faixa cujo "min" a pontuação atinge. Usado
     * para risco (links, phishing), força (senha) e aproveitamento (quiz).
     */
    function classificarPorFaixas(pontuacao, faixas) {
        var pontos = clamp(Math.round(pontuacao), 0, 100);

        var faixa =
            faixas.find(function (f) { return pontos >= f.min; }) ||
            faixas[faixas.length - 1];

        return { classe: faixa.classe, tag: faixa.tag, pontos: pontos };
    }

    var FAIXAS_RISCO = [
        { min: 60, classe: "nivel-perigo", tag: "ALTO RISCO" },
        { min: 25, classe: "nivel-suspeito", tag: "SUSPEITO" },
        { min: 0, classe: "nivel-seguro", tag: "BAIXO RISCO" }
    ];

    function classificarRisco(pontuacao) {
        return classificarPorFaixas(pontuacao, FAIXAS_RISCO);
    }

    // -----------------------------------------------------------------------
    // Renderização segura no DOM
    // -----------------------------------------------------------------------

    function limparElemento(elemento) {
        while (elemento.firstChild) {
            elemento.removeChild(elemento.firstChild);
        }
    }

    /**
     * Preenche uma <ul> a partir de um array de strings usando createElement
     * + textContent: um texto como "<img onerror=...>" aparece como texto
     * literal, nunca como HTML interpretado.
     */
    function preencherLista(lista, itens, textoQuandoVazio) {
        limparElemento(lista);

        var linhas = itens && itens.length > 0 ? itens : [textoQuandoVazio];

        linhas.forEach(function (texto) {
            var item = doc.createElement("li");
            item.textContent = texto;
            lista.appendChild(item);
        });
    }

    /** Troca a classe de estado do <body> dentro de um mesmo grupo. */
    function aplicarClasseDeEstado(elemento, classesDoGrupo, classeAtiva) {
        elemento.classList.remove.apply(elemento.classList, classesDoGrupo);

        if (classeAtiva) {
            elemento.classList.add(classeAtiva);
        }
    }

    // -----------------------------------------------------------------------
    // Contagem animada (apenas em elementos decorativos, aria-hidden)
    // -----------------------------------------------------------------------

    var animacoesEmCurso = new WeakMap();

    function animarNumero(elemento, destino, duracaoMs) {
        var anterior = animacoesEmCurso.get(elemento);

        if (anterior) {
            global.cancelAnimationFrame(anterior);
        }

        var inicio = parseInt(elemento.textContent, 10);
        if (isNaN(inicio)) {
            inicio = 0;
        }

        if (movimentoReduzido || inicio === destino) {
            elemento.textContent = String(destino);
            return;
        }

        var duracao = typeof duracaoMs === "number" ? duracaoMs : 650;
        var t0 = global.performance.now();

        function passo(agora) {
            var p = clamp((agora - t0) / duracao, 0, 1);
            var suave = 1 - Math.pow(1 - p, 3);

            elemento.textContent = String(Math.round(inicio + (destino - inicio) * suave));

            if (p < 1) {
                animacoesEmCurso.set(elemento, global.requestAnimationFrame(passo));
            } else {
                animacoesEmCurso.delete(elemento);
            }
        }

        animacoesEmCurso.set(elemento, global.requestAnimationFrame(passo));
    }

    /**
     * Atualiza o medidor HUD: número grande, barra segmentada e rótulo.
     * O bloco inteiro é decorativo (aria-hidden) — o valor acessível vive
     * no card de classificação, escrito de uma vez só.
     */
    function atualizarMedidor(opcoes) {
        var pontos = clamp(Math.round(opcoes.pontos || 0), 0, 100);

        opcoes.barraFill.style.width = opcoes.vazio ? "0%" : pontos + "%";

        if (opcoes.valor) {
            animarNumero(opcoes.valor, opcoes.vazio ? 0 : pontos);
        }

        if (opcoes.barraLabel) {
            limparElemento(opcoes.barraLabel);

            if (opcoes.vazio) {
                opcoes.barraLabel.textContent = opcoes.textoVazio || "aguardando entrada";
            } else {
                var prefixo = doc.createTextNode((opcoes.prefixo || "nível") + " ");
                var destaque = doc.createElement("b");
                destaque.textContent = String(opcoes.textoNivel || "").toLowerCase();

                opcoes.barraLabel.appendChild(prefixo);
                opcoes.barraLabel.appendChild(destaque);
            }
        }
    }

    /** Liga um campo a um contador de caracteres visível. */
    function configurarContador(campo, contador, tamanhoMaximo) {
        function atualizar() {
            var usado = campo.value.length;
            contador.textContent = usado + " / " + tamanhoMaximo;
            contador.dataset.perto = String(usado > tamanhoMaximo * 0.9);
        }

        campo.addEventListener("input", atualizar);
        atualizar();
    }

    // -----------------------------------------------------------------------
    // Painéis expansíveis (disclosure) acessíveis
    // -----------------------------------------------------------------------

    function abrirPainel(botao, painel) {
        painel.removeAttribute("hidden");
        botao.setAttribute("aria-expanded", "true");

        var alvo =
            painel.querySelector("[data-autofoco]") ||
            painel.querySelector("button, a, input, textarea");

        if (alvo) {
            alvo.focus();
        }
    }

    function fecharPainel(botao, painel) {
        if (!painel.hasAttribute("hidden")) {
            painel.setAttribute("hidden", "");
            botao.setAttribute("aria-expanded", "false");
        }
    }

    function alternarPainel(botao, painel) {
        if (painel.hasAttribute("hidden")) {
            abrirPainel(botao, painel);
        } else {
            fecharPainel(botao, painel);
        }
    }

    /**
     * Clique alterna o painel; Esc fecha e devolve o foco ao botão; clique
     * fora fecha; qualquer [data-fechar-painel] interno também fecha.
     *
     * A detecção de "fora" usa `pointerdown` e não `click`: em telas de
     * toque, o primeiro toque fora de um elemento focado às vezes só remove
     * o foco e nunca chega a disparar `click` — o painel parecia não fechar
     * no primeiro toque.
     */
    function configurarDisclosure(botao, painel, opcoes) {
        var config = Object.assign({ fecharAoClicarFora: true }, opcoes);

        botao.addEventListener("click", function (evento) {
            evento.stopPropagation();
            alternarPainel(botao, painel);
        });

        function fecharComEsc(evento) {
            if (evento.key === "Escape") {
                fecharPainel(botao, painel);
                botao.focus();
            }
        }

        botao.addEventListener("keydown", fecharComEsc);
        painel.addEventListener("keydown", fecharComEsc);

        painel.querySelectorAll("[data-fechar-painel]").forEach(function (elemento) {
            elemento.addEventListener("click", function (evento) {
                evento.stopPropagation();
                fecharPainel(botao, painel);
                botao.focus();
            });
        });

        if (config.fecharAoClicarFora) {
            doc.addEventListener("pointerdown", function (evento) {
                if (!painel.contains(evento.target) && !botao.contains(evento.target)) {
                    fecharPainel(botao, painel);
                }
            });
        }
    }

    // -----------------------------------------------------------------------
    // Estado de carregamento
    // -----------------------------------------------------------------------

    /**
     * Um atraso curto antes da análise. O cálculo é local e instantâneo, mas
     * o estado explícito evita que o botão pareça quebrado em cliques
     * repetidos e comunica que algo aconteceu.
     */
    function executarComCarregamento(botao, textoCarregando, tarefa, atrasoMs) {
        var atraso = typeof atrasoMs === "number" ? atrasoMs : (movimentoReduzido ? 0 : 260);
        var textoOriginal = botao.textContent;

        botao.disabled = true;
        botao.setAttribute("aria-busy", "true");
        botao.textContent = textoCarregando;

        global.setTimeout(function () {
            try {
                tarefa();
            } finally {
                botao.disabled = false;
                botao.removeAttribute("aria-busy");
                botao.textContent = textoOriginal;
            }
        }, atraso);
    }

    function debounce(funcao, esperaMs) {
        var temporizador = null;

        return function () {
            var args = arguments;
            var contexto = this;

            global.clearTimeout(temporizador);
            temporizador = global.setTimeout(function () {
                funcao.apply(contexto, args);
            }, esperaMs);
        };
    }

    // -----------------------------------------------------------------------
    // Aleatoriedade criptográfica (gerador de senhas)
    // -----------------------------------------------------------------------

    /**
     * Índice aleatório em [0, tamanho) via crypto.getRandomValues com
     * rejeição de amostragem, evitando o viés de módulo que
     * `Math.random() % tamanho` introduziria.
     */
    function indiceAleatorioSeguro(tamanho) {
        if (tamanho <= 0) {
            return 0;
        }

        var limiteSeguro = Math.floor(0xFFFFFFFF / tamanho) * tamanho;
        var buffer = new Uint32Array(1);
        var sorteado;

        do {
            global.crypto.getRandomValues(buffer);
            sorteado = buffer[0];
        } while (sorteado >= limiteSeguro);

        return sorteado % tamanho;
    }

    /** Fisher-Yates usando a fonte aleatória segura acima. */
    function embaralharComSeguranca(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = indiceAleatorioSeguro(i + 1);
            var tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
        }

        return array;
    }

    // -----------------------------------------------------------------------
    // Copiar com confirmação
    // -----------------------------------------------------------------------

    async function copiarTexto(texto, botao, textoConfirmacao) {
        var textoOriginal = botao.textContent;

        try {
            await global.navigator.clipboard.writeText(texto);
            botao.textContent = textoConfirmacao || "Copiado";
        } catch (erro) {
            botao.textContent = "Copie manualmente";
        } finally {
            global.setTimeout(function () {
                botao.textContent = textoOriginal;
            }, 1800);
        }
    }

    // -----------------------------------------------------------------------
    // Entrada em cena
    // -----------------------------------------------------------------------

    /**
     * Entrada em cena: os blocos [data-revelar] aparecem uma vez, em cascata
     * curta, quando a tela abre.
     *
     * Deliberadamente não é atrelado à rolagem. Revelar por scroll deixaria
     * o resultado de uma análise invisível até a pessoa rolar, e transformaria
     * cada rolagem em animação. Aqui é um movimento só, no começo, e depois a
     * página fica parada.
     */
    function revelar(raiz) {
        var alvos = (raiz || doc).querySelectorAll("[data-revelar]:not(.revelado)");

        alvos.forEach(function (elemento, indice) {
            if (movimentoReduzido) {
                elemento.classList.add("revelado");
                return;
            }

            global.setTimeout(function () {
                elemento.classList.add("revelado");
            }, Math.min(indice, 6) * 65);
        });
    }

    // -----------------------------------------------------------------------
    // Exposição pública
    // -----------------------------------------------------------------------

    global.CyberShield = {
        movimentoReduzido: movimentoReduzido,
        sanitizarTexto: sanitizarTexto,
        clamp: clamp,
        classificarPorFaixas: classificarPorFaixas,
        classificarRisco: classificarRisco,
        limparElemento: limparElemento,
        preencherLista: preencherLista,
        aplicarClasseDeEstado: aplicarClasseDeEstado,
        animarNumero: animarNumero,
        atualizarMedidor: atualizarMedidor,
        configurarContador: configurarContador,
        configurarDisclosure: configurarDisclosure,
        abrirPainel: abrirPainel,
        fecharPainel: fecharPainel,
        executarComCarregamento: executarComCarregamento,
        debounce: debounce,
        indiceAleatorioSeguro: indiceAleatorioSeguro,
        embaralharComSeguranca: embaralharComSeguranca,
        copiarTexto: copiarTexto,
        revelar: revelar
    };

    doc.addEventListener("DOMContentLoaded", function () {
        revelar(doc);
    });
})(window);
