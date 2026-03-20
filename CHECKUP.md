# Diagnóstico rápido da repo

Data: 2026-02-26

## Comandos executados

1. `npm run lint` ✅
2. `npm run build` ❌
3. `npx tsc --noEmit` ❌

## Resultado

- **Lint** passou sem erros.
- **Build** falhou por dependência de rede ao buscar fontes do Google (`Geist` e `Geist Mono`) via `next/font`.
- **Type-check** falhou com 5 erros:
  - `examples/websocket/frontend.tsx`: falta dependência `socket.io-client`.
  - `examples/websocket/server.ts`: falta dependência `socket.io`.
  - `src/app/api/search/route.ts`: typo `pmmidMatches` (variável declarada é `pmidMatches`).
  - `src/app/api/send-email/route.ts`: `response.messageId` não existe no tipo retornado pela SDK Brevo.
  - `src/app/api/cron/email/route.ts`: `response.messageId` não existe no tipo retornado pela SDK Brevo.

## Conclusão

Atualmente a repo **não está 100% OK** para CI estrito de build+type-check.

## Próximos passos sugeridos

1. Corrigir typo em `src/app/api/search/route.ts`.
2. Ajustar tipagem/resposta da Brevo (`messageId`) nos dois endpoints de email.
3. Decidir se `examples/websocket/*` entra no escopo de type-check:
   - instalar `socket.io` + `socket.io-client`, ou
   - excluir `examples` do `tsconfig` principal.
4. Tornar build resiliente offline para fontes (self-host / fallback local).
