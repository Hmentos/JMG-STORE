# JMG STORE — projeto final revisado

Projeto da JMG STORE com Supabase, checkout via WhatsApp e painel administrativo.

## O que está incluído
- Cadastro/login com Supabase Auth.
- Recuperação e redefinição de senha.
- CEP automático via ViaCEP.
- Catálogo com busca, categorias e ordenação.
- Produto com tamanho, quantidade e estoque.
- Carrinho e favoritos locais.
- Minha conta e histórico de pedidos.
- Checkout com Pix, cartão ou dinheiro.
- Frete fixo de R$ 15,00.
- Registro do pedido no Supabase e envio do resumo para o WhatsApp (11) 97693-5076.
- Painel administrativo (`admin.html`) para produtos, categorias, pedidos, clientes e níveis de acesso.
- Suporte a 2 administradores iniciais e a múltiplos admins depois pelo painel.

## PASSO OBRIGATÓRIO — configurar os 2 administradores
1. Crie as duas contas normalmente na loja ou em **Supabase > Authentication > Users**.
2. Abra `supabase_upgrade.sql`.
3. Vá até a seção **24. DEFINIR OS 2 ADMINISTRADORES**.
4. Troque:
   - `PRIMEIRO_ADMIN@gmail.com`
   - `SEGUNDO_ADMIN@gmail.com`
   pelos dois e-mails reais.
5. Execute o arquivo inteiro no **Supabase SQL Editor**.
6. No resultado da seção 25, confirme que as contas aparecem com `role = admin` e que `auth_id = profile_id`.
7. Saia da conta na loja, faça login novamente e depois abra `admin.html`.

## Banco / RLS
O SQL revisado inclui políticas para:
- leitura pública de produtos ativos e categorias;
- clientes criarem/consultarem os próprios pedidos;
- clientes criarem/alterarem o próprio perfil e endereço;
- admins gerenciarem produtos, categorias, pedidos, itens e perfis;
- proteção para impedir cliente comum de promover a própria conta a admin.

## Status dos pedidos
Os valores internos foram padronizados para:
- `received`
- `preparing`
- `shipped`
- `completed`
- `cancelled`

A interface continua mostrando os nomes em português.

## Arquivos principais
- `index.html`
- `styles.css`
- `script.js`
- `admin.html`
- `admin.css`
- `admin.js`
- `supabase-config.js`
- `supabase_upgrade.sql`
- `JMG-LOGO.jpeg`
- `JMG-ITENS.jpeg`

## Segurança
O projeto usa somente a Publishable key no navegador. Nunca coloque a `service_role`/secret key nos arquivos públicos.
