# Relatório de análise: ranking e perfil de candidato

Data da análise: 05/11/2026  
Escopo: inspeção estática do frontend e implementação do plano P0, sem dependências novas.

## Resumo executivo

Os dois fluxos estão excessivamente dependentes de serviços externos e falham de forma silenciosa. O ranking combina VPS, Supabase/RPC e histórico de candidaturas; o perfil combina layout server-side, rota `/api/candidato/[id]`, VPS e uma segunda consulta ao Supabase. Quando qualquer etapa falha, o código frequentemente converte o erro em lista vazia ou redirecionamento para `/ranking`.

Os pontos mais prováveis para explicar o comportamento observado são:

1. O ranking transforma erro HTTP, erro do RPC e erro de carregamento de candidaturas em `[]`, exibindo a mesma mensagem usada para “não há resultados”.
2. O perfil pode ser redirecionado mesmo quando existe um perfil, se a consulta de candidaturas no VPS falhar ou retornar vazio.
3. O ranking descarta candidatos depois de obter a página do RPC quando não encontra uma candidatura compatível no histórico retornado.
4. Há sincronização de URL com estado antigo nos handlers dos filtros, podendo reintroduzir filtros anteriores durante a navegação.
5. Os contratos não são validados em runtime e usam `any`, dificultando distinguir dado ausente, resposta incompatível e erro de infraestrutura.

## Evidências principais

### 1. Ranking falha silenciosamente — prioridade alta

Em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:178), qualquer resposta não-2xx da VPS retorna uma lista vazia. O mesmo acontece quando o RPC `get_ranking_paginado` falha ou não retorna dados em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:210), e quando ocorre uma exceção em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:235).

Na interface, `ranking.length === 0` é apresentado como “Nenhum candidato encontrado” em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:506). Assim, indisponibilidade da VPS, credenciais/URL incorretas, RPC inexistente, erro de RLS ou ausência real de dados são indistinguíveis para o usuário.

Impacto: a tela parece funcionar, mas informa ausência de resultados quando há um problema técnico. Isso também impede diagnóstico no navegador.

Melhoria recomendada: usar um estado discriminado (`loading`, `success`, `empty`, `error`), preservar a mensagem técnica no log e mostrar uma mensagem de indisponibilidade com botão de tentar novamente.

### 2. O ranking exige três contratos independentes — prioridade alta

O fluxo é:

```text
VPS /api/candidatos-filtrados -> IDs
        ↓
Supabase RPC get_ranking_paginado -> perfis ordenados por Elo
        ↓
VPS /api/candidaturas -> histórico usado para montar a linha
```

Esse encadeamento aparece em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:178), [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:204) e [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:218). Depois, os perfis sem candidatura compatível com ano, UF e município são removidos em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:221).

Impacto: uma resposta parcial do VPS ou uma divergência de `perfil_id`, `uf`, `municipio` ou `ano_eleicao` pode zerar uma página que o RPC retornou corretamente. Além disso, não há contagem ou log dos IDs removidos.

Melhoria recomendada: centralizar o agregador em uma rota server-side, validar o contrato da resposta e retornar diagnóstico/contagens internas. Idealmente, a mesma consulta deve resolver perfil, candidatura compatível e ordenação, evitando uma cadeia de chamadas no cliente.

### 3. O perfil pode virar 404 por falha de histórico — prioridade alta

`fetchCandidaturasFromVPS` retorna `[]` tanto para resposta não-2xx quanto para exceção em [vpsClient.ts](./src/lib/vpsClient.ts:13). A rota do perfil considera que não há candidato quando não existe perfil no endpoint do VPS nem candidatura recente em [route.ts](./src/app/api/candidato/[id]/route.ts:42).

O componente então redireciona qualquer resposta não-OK para `/ranking` em [page.tsx](./src/app/candidato/[id]/page.tsx:58), e o layout também redireciona quando a consulta de metadados não encontra dados em [layout.tsx](./src/app/candidato/[id]/layout.tsx:41).

Impacto: falha transitória, timeout, contrato incompatível ou indisponibilidade do VPS aparece como “perfil inexistente”. O usuário perde a URL original e não há ação de retry.

Melhoria recomendada: separar `not_found` de `upstream_error`; usar o perfil do Supabase como fonte válida mesmo que o histórico esteja indisponível; deixar o histórico vazio com aviso parcial em vez de transformar a página inteira em 404.

### 4. Estado de filtro e URL podem ficar defasados — prioridade média/alta

Nos handlers de seleção, o código chama `setSelectedUf`/`setSelectedMunicipio` e imediatamente chama `syncRankingUrl(false)`, que lê os valores antigos do estado, por exemplo em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:374) e [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:412).

Há um efeito posterior que tenta corrigir a URL, mas a navegação assíncrona pode fazer o `useSearchParams` devolver o filtro anterior antes da correção. Isso é especialmente sensível porque o efeito em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:67) copia os parâmetros da URL de volta para o estado.

Melhoria recomendada: remover a chamada imediata e sincronizar a URL em um único `useEffect` baseado no estado, ou fazer `syncRankingUrl` receber explicitamente os próximos valores.

### 5. Parâmetro de município não é normalizado para o escopo Brasil — prioridade média

`selectedMunicipio` é inicializado diretamente do query string em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:59). Portanto, uma URL como `/ranking?uf=BR&municipio=...` mantém município selecionado, embora o escopo Brasil devesse ignorá-lo. Em seguida, o município é enviado à VPS em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:174), enquanto os cargos continuam nacionais.

Impacto: links antigos, links manipulados ou URLs parcialmente inválidas podem retornar zero resultados e deixar o segundo seletor sem opção correspondente.

Melhoria recomendada: normalizar os parâmetros uma única vez: se `uf === BR`, forçar `municipio = ''`; validar município contra as opções carregadas; remover parâmetros inválidos da URL.

### 6. Configuração de VPS inconsistente — prioridade média

O cliente compartilhado possui fallback para `https://api.centraleti.com.br` em [vpsClient.ts](./src/lib/vpsClient.ts:3), mas o ranking monta URLs diretamente com `process.env.NEXT_PUBLIC_VPS_API_URL` em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:93) e [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:178). Se a variável não estiver exposta no build/deploy, a URL pode ser `undefined/api/...`.

Melhoria recomendada: usar um único módulo de configuração validado, com falha explícita no startup/build quando a variável obrigatória estiver ausente.

### 7. Chamadas duplicadas e alto custo do perfil — prioridade média

O perfil é consultado pelo layout para metadata/redirect em [layout.tsx](./src/app/candidato/[id]/layout.tsx:11), novamente pelo próprio layout em [layout.tsx](./src/app/candidato/[id]/layout.tsx:37), depois pela rota `/api/candidato/[id]` e finalmente o cliente consulta o Supabase de novo em [page.tsx](./src/app/candidato/[id]/page.tsx:90).

Impacto: mais latência, mais pontos de falha e maior carga no notebook/VPS. Em conexões lentas, a página pode parecer quebrada mesmo quando uma fonte responderia.

Melhoria recomendada: consolidar a leitura server-side, reutilizar cache por ID e enviar ao cliente um payload único. Metadata e conteúdo devem compartilhar a mesma função/cache, sem repetir a cadeia de chamadas.

### 8. Falta de validação de contratos — prioridade média

Os componentes usam `any` em praticamente todo o caminho de dados, por exemplo em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:116) e [page.tsx](./src/app/candidato/[id]/page.tsx:44). O tipo [types/index.ts](./src/types/index.ts:14) não representa todos os campos realmente usados (`nr_candidato`, `candidaturas`, dados demográficos e histórico).

Impacto: mudanças no backend podem produzir campos `undefined`, filtragem vazia ou renderização incompleta sem erro de compilação.

Melhoria recomendada: criar schemas Zod para respostas da VPS, RPC e perfil; substituir `any` por tipos derivados desses schemas; registrar quais campos são obrigatórios e quais aceitam nulo.

## Observações adicionais

- A função `processCandidaturas` recebe `cargosPermitidos`, mas não o utiliza diretamente em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:116). Hoje o filtro depende da resposta da VPS; isso cria uma regra implícita e frágil.
- A rota do perfil devolve `details: error.message` ao cliente em [route.ts](./src/app/api/candidato/[id]/route.ts:68). Em produção, retornar detalhes internos não é necessário; registre no servidor e devolva apenas um código/mensagem segura.
- A busca de imagens possui fallback, mas vários candidatos podem gerar tentativas sequenciais de URLs e muitos avisos no console em [CandidateImage.tsx](./src/components/ui/CandidateImage.tsx:22). Isso não parece ser a causa primária do ranking vazio, mas pode mascarar o diagnóstico.
- O botão de paginação depende de `ranking.length < ITEMS_PER_PAGE` em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:523). Se a filtragem pós-RPC remover alguns itens, uma página parcialmente preenchida pode bloquear a próxima mesmo que existam mais IDs.

## Plano de correção recomendado

### P0 — recuperar diagnóstico e disponibilidade

1. Não retornar `[]` para erro de rede/HTTP/RPC; propagar um resultado de erro estruturado.
2. Exibir estados separados para erro, vazio e carregamento.
3. No perfil, não tratar indisponibilidade do histórico como 404; renderizar o perfil parcial quando a fonte principal existir.
4. Adicionar logs mínimos com `uf`, município, quantidade de IDs recebidos, quantidade de perfis do RPC e quantidade descartada.

### P1 — estabilizar os contratos

1. Criar uma rota server-side agregadora para ranking e outra para perfil, com timeout e validação de resposta.
2. Definir uma fonte de verdade para o filtro de cargo/ano/UF/município.
3. Normalizar query strings e eliminar o ciclo de sincronização estado → URL → estado.
4. Substituir `any` pelos schemas/tipos de resposta.

### P2 — reduzir custo e regressões

1. Reutilizar cache por candidato no layout, metadata e conteúdo.
2. Adicionar testes unitários para normalização de filtros, seleção da candidatura mais recente e tratamento de falhas.
3. Adicionar testes de integração com respostas: sucesso, lista vazia, RPC indisponível, VPS indisponível e histórico parcial.
4. Instrumentar tempo de cada etapa, sem registrar CPF, título eleitoral ou outros dados pessoais.

## Validação realizada

- Inspeção estática dos arquivos de ranking, perfil, rotas API, cliente VPS, Supabase, tipos e filtros.
- P0 implementado em [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:61), [vpsClient.ts](./src/lib/vpsClient.ts:10), [route.ts](./src/app/api/candidato/[id]/route.ts:18), [page.tsx](./src/app/candidato/[id]/page.tsx:43) e [layout.tsx](./src/app/candidato/[id]/layout.tsx:36).
- `git diff --check` passou.
- Lint focalizado dos arquivos alterados ainda acusa 5 erros de `any` já existentes no componente [page.tsx](./src/app/candidato/[id]/page.tsx:11) e 2 avisos preexistentes no [RankingClient.tsx](./src/app/ranking/RankingClient.tsx:118). As novas alterações de rota, cliente VPS e layout não introduziram erros de lint.
- `npm run lint` completo e `npx tsc --noEmit --pretty false` foram tentados anteriormente, mas excederam o tempo razoável para o ambiente limitado e foram interrompidos.
- Não foram executados build, servidor de desenvolvimento, chamadas externas nem instalação de dependências.

## P0 implementado

- Ranking: respostas HTTP inválidas, payloads incompatíveis, erro do RPC e falhas de candidaturas agora chegam ao estado de erro, em vez de serem convertidos silenciosamente em lista vazia. A tela exibe retry e registra apenas contagens agregadas, sem dados pessoais.
- Perfil: a rota tenta o perfil no VPS e usa Supabase como fallback. Histórico indisponível retorna o perfil principal com aviso parcial; 404 é reservado para ausência real e indisponibilidade pode retornar 502.
- Perfil: o cliente só redireciona em 404. Erros de upstream exibem mensagem e retry, e o layout não redireciona nem interrompe a página por falha temporária de lookup.
- Segurança: a rota deixou de retornar `error.message` bruto ao cliente.

## Conclusão

A prioridade é tornar erros observáveis e permitir que o perfil carregue parcialmente. Sem isso, a aplicação apresenta “nenhum candidato” ou redireciona para o ranking para vários tipos de falha, o que impede confirmar a causa pelo uso normal. Depois de separar erro de ausência de dados, será possível verificar objetivamente se o problema restante está no endpoint VPS, no RPC `get_ranking_paginado`, nos IDs/contratos ou nos filtros de candidatura.
