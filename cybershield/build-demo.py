#!/usr/bin/env python3
"""
Monta a demo autocontida (um único .html) a partir dos arquivos do projeto.

Não existe conteúdo duplicado: o CSS, o JS e o markup de cada tela saem dos
mesmos arquivos que o site multipágina usa. A demo só acrescenta um roteador
que troca a tela visível em vez de navegar entre páginas.

    python3 build-demo.py
"""

import pathlib
import re

RAIZ = pathlib.Path(__file__).parent
SAIDA = RAIZ / "cybershield-demo.html"

CSS = [
    "shared/cybershield-base.css",
    "pagina-inicial/style.css",
    "analisador-senha/style.css",
    "analisador-links/style.css",
    "detector-phishing/style.css",
    "quiz/quiz.css",
]

JS = [
    "shared/cybershield-utils.js",
    "pagina-inicial/script.js",
    "analisador-senha/senha.js",
    "analisador-links/links.js",
    "detector-phishing/phishing.js",
    "quiz/quiz.js",
]

PAGINAS = [
    ("home", "pagina-inicial/index.html"),
    ("senha", "analisador-senha/senha.html"),
    ("links", "analisador-links/links.html"),
    ("phishing", "detector-phishing/phishing.html"),
    ("quiz", "quiz/quiz.html"),
]

ABAS = [
    ("home", "início"),
    ("senha", "senhas"),
    ("links", "links"),
    ("phishing", "mensagens"),
    ("quiz", "quiz"),
]


def ler(caminho):
    return (RAIZ / caminho).read_text(encoding="utf-8")


def extrair_view(html, nome):
    padrao = re.compile(
        r"<!--\s*VIEW:" + re.escape(nome) + r"\s*-->(.*?)<!--\s*/VIEW\s*-->",
        re.S,
    )
    achado = padrao.search(html)
    if not achado:
        raise SystemExit(f"marcador VIEW:{nome} não encontrado")
    return achado.group(1).strip()


css = "\n\n".join(ler(c) for c in CSS)
js = "\n\n".join(ler(j) for j in JS)

views = []
for nome, caminho in PAGINAS:
    conteudo = extrair_view(ler(caminho), nome)
    oculto = "" if nome == "home" else " hidden"
    views.append(
        f'<div class="view" id="view-{nome}" data-view="{nome}"{oculto}>\n{conteudo}\n</div>'
    )

abas = "\n".join(
    '            <button type="button" class="nav-item" data-ir="{v}"{atual}>{r}</button>'.format(
        v=v, r=r, atual=' aria-current="page"' if v == "home" else ""
    )
    for v, r in ABAS
)

ROTEADOR = """
/**
 * Roteador da demo: troca a tela visível em vez de navegar entre páginas.
 * No site multipágina real este arquivo não existe — cada tela é uma página.
 */
(function () {
    "use strict";

    var CS = window.CyberShield;
    var principal = document.getElementById("conteudo-principal");
    var views = Array.prototype.slice.call(document.querySelectorAll(".view"));
    var abas = Array.prototype.slice.call(document.querySelectorAll("[data-ir]"));

    var ESTADOS = [
        "nivel-perigo", "nivel-suspeito", "nivel-seguro",
        "forca-fraca", "forca-media", "forca-forte", "forca-muito-forte"
    ];

    var MAPA = [
        ["pagina-inicial/index.html", "home"],
        ["senha.html", "senha"],
        ["links.html", "links"],
        ["phishing.html", "phishing"],
        ["quiz.html", "quiz"]
    ];

    function abrir(destino, moverFoco) {
        views.forEach(function (view) {
            view.hidden = view.dataset.view !== destino;
        });

        abas.forEach(function (aba) {
            if (aba.dataset.ir === destino) {
                aba.setAttribute("aria-current", "page");
            } else {
                aba.removeAttribute("aria-current");
            }
        });

        // A cor de estado pertence à ferramenta que a produziu: ao trocar de
        // tela, o tema volta ao neutro.
        CS.aplicarClasseDeEstado(document.body, ESTADOS, null);

        principal.classList.toggle("shell-largo", destino === "home");

        CS.revelar(document.getElementById("view-" + destino));

        window.scrollTo({ top: 0, behavior: CS.movimentoReduzido ? "auto" : "smooth" });

        if (moverFoco) {
            principal.setAttribute("tabindex", "-1");
            principal.focus({ preventScroll: true });
        }
    }

    abas.forEach(function (aba) {
        aba.addEventListener("click", function () {
            abrir(aba.dataset.ir, true);
        });
    });

    // Links internos entre telas (cards da home, "voltar ao início" do quiz)
    document.addEventListener("click", function (evento) {
        var ancora = evento.target.closest("a[href]");

        if (!ancora) {
            return;
        }

        var href = ancora.getAttribute("href");

        for (var i = 0; i < MAPA.length; i++) {
            if (href.indexOf(MAPA[i][0]) !== -1) {
                evento.preventDefault();
                abrir(MAPA[i][1], true);
                return;
            }
        }
    });
})();
"""

DEMO = f"""<!DOCTYPE html>
<html lang="pt-BR">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#04060c">
<meta name="description" content="CyberShield — quatro ferramentas para analisar senhas, links e mensagens suspeitas. Tudo roda no seu navegador.">

<title>CyberShield — segurança digital que roda no seu navegador</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<style>
{css}

/* ==========================================================================
   DEMO — só o necessário para as telas coexistirem em um arquivo
   ========================================================================== */

.view[hidden] {{
    display: none;
}}

#conteudo-principal:focus {{
    outline: none;
}}
</style>
</head>

<body>

<a href="#conteudo-principal" class="skip-link">Pular para o conteúdo</a>

<div class="ambiente" aria-hidden="true"></div>
<div class="grid-overlay" aria-hidden="true"></div>
<div class="piso" aria-hidden="true"></div>
<div class="scanlines" aria-hidden="true"></div>

<header class="topbar">

    <button type="button" class="marca" data-ir="home">
        <span class="marca-selo" aria-hidden="true">◈</span>
        <span class="marca-nome">Cyber<span class="marca-2">Shield</span></span>
    </button>

    <nav class="topbar-nav" aria-label="Ferramentas">
{abas}
    </nav>

</header>

<main class="shell shell-largo" id="conteudo-principal">

{chr(10).join(views)}

</main>

<script>
{js}

{ROTEADOR}
</script>

</body>

</html>
"""

SAIDA.write_text(DEMO, encoding="utf-8")
print(f"demo gerada: {SAIDA} ({len(DEMO) / 1024:.0f} KB)")
