"use strict";

/**
 * blacklist.js — CyberShield / Analisador de links
 * ---------------------------------------------------------------
 * Consulta blacklists públicas reais de phishing e golpes, 100% no
 * navegador. O link que o usuário analisa NUNCA é enviado para
 * nenhum servidor — só baixamos listas públicas de domínios
 * maliciosos e comparamos localmente. Isso mantém a promessa que
 * já está na página ("nenhum link é aberto, enviado ou armazenado").
 *
 * Fontes usadas (ambas gratuitas, sem chave de API, hospedadas no
 * GitHub com CORS liberado — testado em 25/09/2026):
 *
 *  - Phishing.Database (mitchellkrogza): domínios de phishing
 *    testados ativamente (PyFunceble). ~392 mil domínios, ~3,7 MB
 *    comprimido.
 *    https://github.com/mitchellkrogza/Phishing.Database
 *
 *  - The Block List Project — lista de golpes/scam. ~8,5 mil
 *    domínios, ~220 KB.
 *    https://github.com/blocklistproject/Lists
 *
 * (O Block List Project também tem uma lista de malware, mas ela
 * tem ~2,6 milhões de domínios e 70+ MB — pesada demais para baixar
 * no navegador. Se quiser essa cobertura depois, o caminho é um
 * backend/proxy que já mantenha essa lista indexada, em vez de
 * baixar tudo no cliente.)
 *
 * As listas são cacheadas em localStorage por algumas horas, para
 * não baixar vários MB a cada análise. Se o cache falhar (ex: limite
 * de armazenamento do navegador), o script continua funcionando
 * normalmente — só perde o benefício do cache.
 *
 * Uso (a partir de outro script carregado depois deste):
 *   var resultado = await CyberShieldBlacklist.verificar(url);
 *   // resultado = { host, encontrado, correspondencias: [{ fonte, nome, dominio }] }
 */
var CyberShieldBlacklist = (function () {

    var FONTES = [
        {
            id: "phishing_database",
            nome: "Phishing.Database (verificação ativa)",
            url: "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt",
            formato: "linha" // um domínio por linha
        },
        {
            id: "blocklist_scam",
            nome: "The Block List Project — golpes",
            url: "https://raw.githubusercontent.com/blocklistproject/Lists/master/scam.txt",
            formato: "hosts" // linhas "0.0.0.0 dominio.com" + comentários com #
        }
    ];

    var CACHE_PREFIX = "cs_blacklist_";
    var CACHE_VALIDADE_HORAS = 12;

    var listasEmMemoria = {}; // id da fonte -> Set de domínios
    var promessaCarregamento = null;

    function parseLinha(texto) {
        return texto.split("\n").map(function (l) {
            return l.trim().toLowerCase();
        }).filter(function (l) {
            return l && l.indexOf("#") !== 0;
        });
    }

    function parseHosts(texto) {
        return texto.split("\n").map(function (l) {
            return l.trim().toLowerCase();
        }).filter(function (l) {
            return l && l.indexOf("#") !== 0;
        }).map(function (l) {
            return l.replace(/^0\.0\.0\.0\s+/, "").trim();
        }).filter(Boolean);
    }

    function lerCache(chave) {
        try {
            return JSON.parse(localStorage.getItem(chave) || "null");
        } catch (erro) {
            return null;
        }
    }

    function gravarCache(chave, dominios) {
        try {
            localStorage.setItem(chave, JSON.stringify({
                timestamp: Date.now(),
                dominios: dominios
            }));
        } catch (erro) {
            // localStorage cheio/indisponível (comum com listas grandes) —
            // segue só com os dados em memória, sem quebrar a análise.
            console.warn("[CyberShield] não foi possível cachear a lista:", chave, erro);
        }
    }

    function carregarFonte(fonte) {
        var chaveCache = CACHE_PREFIX + fonte.id;
        var cache = lerCache(chaveCache);
        var idadeHoras = cache ? (Date.now() - cache.timestamp) / 36e5 : Infinity;

        if (cache && idadeHoras < CACHE_VALIDADE_HORAS) {
            return Promise.resolve(new Set(cache.dominios));
        }

        return fetch(fonte.url, { cache: "no-store" }).then(function (resposta) {
            if (!resposta.ok) {
                throw new Error("HTTP " + resposta.status);
            }
            return resposta.text();
        }).then(function (texto) {
            var dominios = fonte.formato === "hosts" ? parseHosts(texto) : parseLinha(texto);
            gravarCache(chaveCache, dominios);
            return new Set(dominios);
        }).catch(function (erro) {
            console.warn("[CyberShield] falha ao baixar \"" + fonte.nome + "\":", erro);
            // Se falhar mas existir cache antigo, usa mesmo vencido — é
            // melhor que não checar nada.
            if (cache) {
                return new Set(cache.dominios);
            }
            return new Set();
        });
    }

    // Baixa todas as fontes em paralelo. Chamada automaticamente ao
    // carregar a página (fim do arquivo) para que, quando o usuário
    // clicar em "Analisar link", as listas já estejam prontas.
    function preCarregar() {
        if (!promessaCarregamento) {
            promessaCarregamento = Promise.all(FONTES.map(function (fonte) {
                return carregarFonte(fonte).then(function (set) {
                    listasEmMemoria[fonte.id] = set;
                });
            }));
        }
        return promessaCarregamento;
    }

    function extrairHost(url) {
        try {
            var temProtocolo = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
            return new URL(temProtocolo ? url : "http://" + url).hostname.toLowerCase();
        } catch (erro) {
            return null;
        }
    }

    // Confere o host exato e também os domínios-pai (ex: "evil.com" na
    // lista também pega "login.evil.com", "a.b.evil.com" etc.), sem
    // considerar o último rótulo sozinho (não bate só ".com").
    function encontrarNaLista(host, set) {
        if (set.has(host)) {
            return host;
        }

        var partes = host.split(".");

        for (var i = 1; i < partes.length - 1; i++) {
            var candidato = partes.slice(i).join(".");
            if (set.has(candidato)) {
                return candidato;
            }
        }

        return null;
    }

    /**
     * Verifica um link contra as blacklists carregadas.
     * Aguarda o carregamento terminar se ainda não tiver acabado.
     *
     * Retorno:
     *   {
     *     host: "exemplo.com" | null,
     *     encontrado: boolean,
     *     correspondencias: [{ fonte: "phishing_database", nome: "...", dominio: "exemplo.com" }]
     *   }
     */
    function verificar(url) {
        return preCarregar().then(function () {
            var host = extrairHost(url);
            var correspondencias = [];

            if (host) {
                for (var i = 0; i < FONTES.length; i++) {
                    var fonte = FONTES[i];
                    var set = listasEmMemoria[fonte.id] || new Set();
                    var dominio = encontrarNaLista(host, set);

                    if (dominio) {
                        correspondencias.push({ fonte: fonte.id, nome: fonte.nome, dominio: dominio });
                    }
                }
            }

            return { host: host, encontrado: correspondencias.length > 0, correspondencias: correspondencias };
        });
    }

    return { verificar: verificar, preCarregar: preCarregar };

})();

// Começa a baixar as listas assim que este script carrega, sem travar
// a página — a primeira análise do usuário tende a já encontrá-las prontas.
CyberShieldBlacklist.preCarregar();