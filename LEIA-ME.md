# Treino Livre — versão mobile

App de treino 100% offline (HTML + CSS + JS, sem CDN, sem backend). Dados em **IndexedDB** no aparelho.

## Como usar no celular
**Opção recomendada (PWA, dados mais estáveis e offline completo):**
1. Coloque a pasta em qualquer hospedagem estática HTTPS (GitHub Pages, Netlify, etc.) — ou sirva na rede local — e abra a URL no celular.
2. Android (Chrome): menu ⋮ › *Instalar app / Adicionar à tela inicial*. iPhone (Safari): Compartilhar › *Adicionar à Tela de Início*.
3. Abra uma vez com internet; depois funciona offline (service worker guarda os arquivos).

**Abrindo `index.html` direto (file://):** funciona e salva dados, mas o service worker não é registrado (não há "instalação"), e alguns navegadores móveis restringem arquivos locais. Em outro caminho/navegador os dados **não** são compartilhados: cada origem tem seu próprio armazenamento.

## Backup e restauração
- *Config. › Exportar dados*: baixa `treino-livre-backup-AAAA-MM-DD.json`.
- *Config. › Importar dados*: escolha o arquivo; o app valida a estrutura, mostra confirmação e só então substitui. Os dados anteriores ficam numa cópia interna de segurança.
- Faça backup regularmente: limpar dados do navegador ou desinstalar o app apaga o IndexedDB.

## Navegação
Barra inferior: Início, Histórico, Rotina e Conquistas (as conquistas são calculadas só com seus registros). Configurações (backup, importar, resetar) abre pela engrenagem no topo da tela Início.

## Imagens
- 18 exercícios com fotos reais (início e final do movimento) do Free Exercise DB (domínio público). Veja `CREDITOS.md`.
- Banners da Rotina e arte do topo: recortes do mockup `App_de_Treino_Livre_em_Português.png` (`img/ui/`).
- Todos os 18 exercícios agora têm fotos reais. Aproximadas: panturrilha (foto com halteres), corrida estacionária (skipping), polichinelo e caminhada.

## Testes
`tests/test_funcional.py` (Playwright + Chromium) com servidor em `localhost:8765`. Veja `RELATORIO_TESTES.md`.

## Animação dos exercícios
Nos exercícios com 2 fotos, a tela mostra uma animação (vai e volta entre início e final) em qualidade total. Botões: Lento (2,5 s), Normal (1,25 s) e Rápido (0,6 s, padrão). "Ver 2 fotos" mostra as fotos separadas. A Flexão Pike tem animação própria de 3 etapas (ilustração, ver `CREDITOS.md`). Prancha e Agachamento com pausa têm 1 foto e ficam estáticos.

## Atualizações automáticas (GitHub Pages)
1. Suba os arquivos novos para o GitHub (substituindo os antigos).
2. O celular, ao abrir o app com internet, busca a versão nova sozinho (código e páginas vêm da rede primeiro; imagens ficam em cache).
3. Aparece o aviso "Nova versão disponível"; toque em **Atualizar**.
Não é mais obrigatório trocar o número em `sw.js` para atualizar texto/código. Trocar a versão só é útil para limpar o cache antigo de imagens. Seus treinos e histórico não são apagados.

## Vídeos dos exercícios (v1.2)
O app já aceita vídeos curtos em loop. Coloque os arquivos na pasta `videos/` e liste em `videos.json` (veja `videos/LEIA-ME.txt`). Exercícios com vídeo mostram o vídeo (botões Lento/Normal/Rápido e "Ver fotos"); os demais continuam com fotos. Os vídeos ficam guardados para uso offline depois do primeiro uso.

Onde achar material gratuito (conferir a licença antes de usar):
- Vital Animations, pacote gratuito (MP4 HD, "free to use in your own projects"): https://vitalanimations.com/free-pack
- RepDB, 30 animações gratuitas (CC BY-NC 4.0, só uso não comercial, com crédito): https://repdb.co/exercise-animations/
- Pexels e Pixabay (vídeos de pessoas treinando, licença gratuita; não são demonstrações padronizadas).
Não usar: Gym visual / ExerciseDB / GIFs "soltos" da internet sem licença clara.

## Níveis e revisão de ciclo (v1.3)
- **Nível** (Iniciante, Intermediário, Avançado/Hard): perguntado no primeiro uso e alterável em Configurações. Ele ajusta séries e repetições da rotina (Iniciante ≈ -1 série e -30% de reps; Avançado ≈ +1 série e +25% de reps). Exercícios que você editou manualmente não mudam com o nível.
- **Revisão a cada 2 semanas** (4 ciclos no plano de 8 semanas): ao fim de cada ciclo aparece um card no Início com dias treinados, volume feito vs. planejado, observações e dicas do seu nível (aumentar repetições, séries, variação mais difícil ou treino extra). O app só sugere; nada muda sem você confirmar. Se a adesão ou o volume ficarem baixos, ele não oferece aumento.
- **Nova rotina**: usuários antigos recebem uma oferta (aplicar ou manter a sua). Aplicar troca só segunda, terça, quinta e sexta; quarta, sábado, domingo e o histórico ficam como estão.
- 12 exercícios novos baseados nos prints (flexão declinada, tríceps banco, remadas, roscas, ombros...), com fotos do Free Exercise DB e avisos de segurança quando usam cadeira, mesa ou mochila.

## Biblioteca de exercícios (v1.4)
Em Rotina › "Biblioteca de exercícios" (ou ao editar um dia › "Escolher na Biblioteca"): 59 exercícios com busca e filtros por grupo muscular, material (sem equipamento, garrafas, mochila, cadeira, mesa, toalha) e nível. Toque no exercício para ver instruções e use "+ Adicionar à rotina" para escolher o dia, as séries e as repetições. 14 exercícios ainda estão sem foto (lista em `PENDENCIAS-IMAGENS.md`) e funcionam com instruções em texto.

## Vídeos recortados (v1.5)
Ponte de glúteos e flexão fechada agora usam vídeo curto em loop (trechos do vídeo "Queime MUITA GORDURA em Apenas 20 MINUTOS! – Treino Total HIIT", de Thiago Pugliesi, licença Creative Commons Atribuição, sem áudio). O crédito aparece na tela do exercício. Para adicionar mais vídeos, veja `videos/LEIA-ME.txt` e `LISTA-VIDEOS-PENDENTES.md`. No `videos.json`, cada vídeo pode ter o campo `credit` (texto e link) quando exigir atribuição.

## Cronômetro (v1.6)
Na tela do treino, toque em "Iniciar cronômetro". Ele conduz: **preparo** (padrão 5 s) → **execução** → **descanso** (45 s; 30 s em core/cardio; 10 s em mobilidade) → próxima série → próximo exercício.
- **Exercícios por tempo** (prancha, polichinelo...): contagem regressiva; o app registra o tempo realmente feito (se você parar antes, toque em "Parei").
- **Exercícios por repetição:** o app guia o ritmo, repetição por repetição ("Repetição 3 de 10"), e **encerra a série sozinho ao completar o número planejado** (você pode tocar em "Terminar série" antes, se não conseguir mais). Ele segue o ritmo com as pausas de cada exercício (ex.: agachamento com pausa = Descer 2 s, Pausa embaixo 2 s, Subir 1 s). **As repetições são contadas por você** (botão +1 ou o contador); o app nunca preenche sozinho.
- **O app só avança quando a série anterior está registrada.** Se o descanso acabar sem registro, ele espera.
- Botões: pausar, pular fase, parar. Sinal sonoro, vibração (onde o aparelho permitir) e tempos podem ser ajustados em Configurações. A tela é mantida acesa durante o cronômetro, quando o navegador permite.

## Versão e atualização (v1.6.2)
- A versão em uso aparece em Configurações ("Versão do app") e também no rodapé do cronômetro.
- O app compara sua versão com o arquivo `version.json` do site; se forem diferentes, mostra o aviso "Nova versão disponível". Ao publicar uma nova versão, atualize também o número em `version.json`.
- Em Configurações há "Forçar atualização": limpa só o cache dos arquivos do app e recarrega. **Não apaga treinos nem histórico.**
- O ritmo do cronômetro agora é calculado sem acumular atraso entre as fases.
