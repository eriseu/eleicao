# Frontend no servidor

O Dockerfile usa Node 22 e a saída standalone do Next.js. O build recebe somente
configuração pública; as credenciais SUPABASE_SERVICE_ROLE_KEY e R2_* continuam
no .env do Compose, carregadas em runtime por env_file.

1. Atualize o checkout na pasta /www/wwwroot/politica.centraleti.com.br para a branch vps.
2. No .env de /www/server/panel/data/compose/tinder_politico, defina
   NEXT_PUBLIC_SUPABASE_ANON_KEY com a chave anon/publishable do Supabase.
   Não use SUPABASE_SERVICE_ROLE_KEY nesse campo. Se uma imagem anterior foi
   publicada com service_role no campo público, substitua/revogue a credencial
   exposta no Supabase e atualize o segredo no servidor.
3. Substitua somente o serviço frontend-politica pelo trecho frontend-politica.yaml,
   mantendo-o indentado sob services. Preserve os outros serviços, volumes e redes.
4. Execute:

```bash
cd /www/server/panel/data/compose/tinder_politico
docker compose config --quiet
docker compose build frontend-politica
docker compose up -d --no-deps frontend-politica
docker compose logs --tail=80 frontend-politica
curl -I http://127.0.0.1:3000
```

O navegador consulta /api/vps no próprio domínio. O Next.js encaminha somente
as rotas públicas permitidas para VPS_API_URL=http://api-candidaturas:8000,
definida no environment do serviço frontend-politica. Essa variável é privada,
lida em runtime, e não deve receber o prefixo NEXT_PUBLIC_. Fora do Docker,
o servidor usa NEXT_PUBLIC_VPS_API_URL como fallback.

Para verificar a API interna sem depender do domínio público:

```bash
docker compose exec frontend-politica node -e 'fetch("http://api-candidaturas:8000/api/candidatos-filtrados?uf=BR&cargos=PRESIDENTE").then(async r => { console.log(r.status); console.log((await r.text()).slice(0, 300)); }).catch(e => { console.error(e.message); process.exit(1); })'
docker compose logs --tail=80 api-candidaturas
```

Se a consulta interna falhar, a API/porta/rede precisa ser corrigida no servidor;
o proxy do frontend não torna um backend indisponível acessível.

CSS antigo com 404 não é um problema de configuração de MIME. Após o deploy,
reabra a página sem cache. Verifique se o proxy reverso encaminha /_next/static
para o mesmo container que serve o HTML e se há HTML antigo no cache do CDN.
A chamada /api/candidatos não é feita pela versão atual da página inicial;
se ela continuar aparecendo, verifique se a versão atual foi realmente publicada.

.dockerignore exclui .env, node_modules, caches, ambientes Python e public/fotos.
As fotos dos candidatos são servidas pela URL pública já usada pelo aplicativo;
os assets locais, incluindo avatar e imagem de compartilhamento, são copiados.

Referências: https://docs.docker.com/build/building/multi-stage/ e
https://nextjs.org/docs/app/api-reference/config/next-config-js/output
