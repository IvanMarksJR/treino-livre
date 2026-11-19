# Relatório de testes (executados em Chromium headless/Playwright, 35 verificações, todas aprovadas)

| Teste | O que foi executado | Resultado |
|---|---|---|
| 1 Navegação | 4 abas, 3 sub-abas do histórico, rotina › dia › exercício › execução › edição; 0 erros de JS no console | Aprovado |
| 2 Exercícios | Abertura dos 18 exercícios: todas as seções presentes, fotos carregadas (naturalWidth>0), conjuntos de imagens distintos (exceto pausa, que reaproveita a foto da posição baixa do agachamento); edição de séries/reps, adicionar, reordenar, excluir | Aprovado. **Conferência visual de imagem × nome feita por mim em amostra (agachamento, mountain climbers, fotos de segunda); revise os demais** |
| 3 Registro | Valores 10/9/7 diferentes da meta 10, correção antes de finalizar (9→8), concluir, avançar/voltar, finalizar | Aprovado |
| 4 Persistência | Contexto do navegador fechado e reaberto; estado idêntico e histórico visível | Aprovado (Chromium com perfil persistente) |
| 5 Backup | Exportar, limpar tudo, rejeitar arquivo inválido e JSON malformado, importar; estado idêntico ao original | Aprovado |
| 6 Responsividade | 320/360/390/430 px, 9 telas cada: sem rolagem horizontal | Aprovado |
| 7 Offline | Service worker ativo, rede desligada, recarga, imagem, rotina e registro de treino | Aprovado (via localhost) |

**Não testado:** aparelhos reais Android/iPhone, Safari/iOS, instalação como PWA em HTTPS, uso real de várias semanas.
