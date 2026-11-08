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

NEXT_PUBLIC_* é incorporado ao JavaScript no build. Por isso, a API usa o domínio
HTTPS público, e não http://api-candidaturas:8000, que o navegador não resolve.

.dockerignore exclui .env, node_modules, caches, ambientes Python e public/fotos.
As fotos dos candidatos são servidas pela URL pública já usada pelo aplicativo;
os assets locais, incluindo avatar e imagem de compartilhamento, são copiados.

Referências: https://docs.docker.com/build/building/multi-stage/ e
https://nextjs.org/docs/app/api-reference/config/next-config-js/output
