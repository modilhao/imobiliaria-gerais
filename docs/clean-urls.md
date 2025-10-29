# Clean URLs — Estrutura e Roteamento

Este projeto é hospedado na Vercel com páginas estáticas. Para URLs limpas (sem `.html`), adotamos a configuração nativa da Vercel.

## Vercel (recomendado neste projeto)

- `vercel.json`: `{"cleanUrls": true}` — permite acessar `/lumy-cajamar` em vez de `/lumy-cajamar.html`.
- Não há necessidade de `index.php`, `.htaccess` ou Nginx. A Vercel resolve as rotas direto pelos arquivos.
- Após publicar, ajuste `canonical` e `og:url` para o domínio final.

### Exemplo
- Arquivo: `lumy-cajamar.html`
- URL limpa: `https://seu-dominio/lumy-cajamar`
- Arquivo: `index.html`
- URL limpa: `https://seu-dominio/index` (ou somente `/`)

## Apache (referência)

Se optar por hospedar em Apache, use um `public/` com `.htaccess` para redirecionar tudo ao `index.php`:

```apacheconf
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]
```

### `public/index.php` (roteador simples)

```php
<?php
$uri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
if ($uri === '' || $uri === 'index') { $view = 'home.php'; }
else if ($uri === 'lumy-cajamar') { $view = 'lumy-cajamar.php'; }
else { http_response_code(404); $view = '404.php'; }

include __DIR__ . '/../views/' . $view;
```

Estruture as views em `views/` (fora de `public/`), por exemplo:

```
views/
  home.php
  lumy-cajamar.php
  404.php
```

## Nginx (referência)

No Nginx, use `try_files` para encaminhar ao `index.php`:

```nginx
server {
  listen 80;
  server_name exemplo.com;
  root /var/www/projeto/public;

  location / {
    try_files $uri $uri/ /index.php?$args;
  }

  location ~ \.php$ {
    include fastcgi_params;
    fastcgi_pass unix:/run/php/php-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
  }
}
```

## Testes

- Este repositório inclui `tests/clean-urls.test.js` que valida:
  - `vercel.json` com `cleanUrls: true`.
  - Links internos sem `.html`.
  - `canonical` sem `.html`.

Execute localmente com `node tests/clean-urls.test.js`.

## Boas práticas

- Use URLs sem extensão nos links internos.
- Atualize as tags `canonical` e `og:url` após o deploy para refletir o domínio final.
- Evite expor arquivos de views no diretório público quando usar servidores tradicionais (Apache/Nginx).