# CyberShield

Quatro ferramentas de segurança digital que rodam inteiramente no navegador:
analisador de senhas, analisador de links, detector de phishing e um quiz.
Nenhuma requisição de rede, nenhum armazenamento.

## Estrutura

```
cybershield/
├── shared/
│   ├── cybershield-base.css     design system (tokens, HUD, medidor, terminal)
│   └── cybershield-utils.js     sanitização, classificação, render seguro
├── pagina-inicial/              index.html · style.css · script.js
├── analisador-senha/            senha.html · style.css · senha.js
├── analisador-links/            links.html · style.css · links.js
├── detector-phishing/           phishing.html · style.css · phishing.js
├── quiz/                        quiz.html · quiz.css · quiz.js
├── build-demo.py                monta a demo de arquivo único
└── cybershield-demo.html        demo gerada (as 5 telas em um .html)
```

Abra `pagina-inicial/index.html` no navegador. Não precisa de servidor nem
build — só as fontes vêm do Google Fonts.

A demo não duplica nada: `build-demo.py` lê os mesmos CSS, JS e trechos de
markup das páginas e só acrescenta um roteador que troca a tela visível.
Depois de editar qualquer arquivo, rode `python3 build-demo.py` para
atualizá-la.

## O redesign

**Direção.** HUD cibernético: painéis chanfrados com borda neon, leitura de
dados em monoespaçada, ciano como cor de sistema e magenta como acento.

**Cor de estado.** Toda a interface deriva de uma variável só, `--estado`.
Quando uma análise classifica o risco, muda o medidor, a etiqueta do
diagnóstico, o prompt do terminal e a aura do fundo — de uma vez, sem
regras duplicadas por ferramenta.

**Tipografia.** Duas famílias com papéis claros: Chakra Petch (títulos e
interface) e JetBrains Mono (dados, rótulos, terminal, senhas e URLs — tudo
que se lê caractere por caractere).

**Movimento.** Uma sequência só, no carregamento: o console da home digita a
abertura e os blocos entram em cascata curta. Depois disso a página fica
parada. A revelação não está atrelada à rolagem, justamente para o resultado
de uma análise nunca ficar invisível esperando scroll.

**Navegação.** Antes só existia "voltar à página inicial"; agora há uma barra
fixa com as quatro ferramentas e a atual marcada com `aria-current`.

**Ícones.** Emoji saiu, SVG de traço entrou: emoji colorido brigava com a
paleta e muda de desenho a cada sistema.

## Correções aplicadas no caminho

- **`[hidden]` não funcionava** em componentes com `display` próprio
  (`.resultados`, `.teste`, `.painel-secundario`). O painel de exemplos ficava
  sempre aberto e os cards de resultado do quiz apareciam antes do fim.
  Resolvido com uma regra de base `[hidden] { display: none !important }`.
- **`<label for>` apontando para `<p>`**, que não é controle de formulário.
  Virou `<span>` + `aria-labelledby`.
- **Imitação de marca com números** (`amaz0n-suporte.click`) passava batido:
  ficava longe demais para o Levenshtein e o nome literal não casava. Agora a
  busca por marca também roda sobre a versão sem leetspeak — o caso passou de
  50/100 para 75/100.
- **Caminhos inconsistentes**: `index.html` tratava o quiz como irmão e as
  outras ferramentas como `../`. Cada ferramenta ganhou sua pasta.
- **Estado preso entre telas** na demo: a cor de risco de uma ferramenta
  voltava ao neutro ao trocar de tela.

## Acessibilidade

Mantida e ampliada: skip link, foco visível, `aria-live` nos resultados,
`aria-pressed` no botão de visibilidade, checklist que comunica por ícone e
texto (nunca só por cor), foco levado ao resultado do quiz, e
`prefers-reduced-motion` desligando varredura, piso, glitch, contagem animada
e a entrada em cena.

Toda saída na tela passa por `textContent` — nunca `innerHTML` com dado de
quem usa. Um texto como `<img onerror=...>` aparece como texto literal.

## Limites

As análises são heurísticas e educativas. Elas apontam sinais e explicam o
porquê; não substituem verificação profissional e não dão veredito definitivo
sobre um link, uma mensagem ou uma senha.
"# Cybershield" 
