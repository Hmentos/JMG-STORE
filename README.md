# JMG STORE — projeto completo

Projeto de teste da JMG STORE com Supabase e fechamento de pedido pelo WhatsApp.

## O que já foi adicionado
- Cadastro/login com Supabase Auth.
- Recuperação e redefinição de senha.
- CEP automático via ViaCEP.
- Catálogo com busca, categorias e ordenação.
- Página/modal individual do produto.
- Tamanhos, quantidade e controle visual de estoque.
- Carrinho com alteração de quantidade.
- Favoritos.
- Minha conta e histórico de pedidos.
- Checkout com Pix, cartão ou dinheiro.
- Frete fixo de R$ 15,00.
- Registro do pedido no Supabase e envio do resumo para o WhatsApp **(11) 97693-5076**.
- Painel administrativo em `admin.html` para produtos e status dos pedidos.
- Layout responsivo para celular.

## Antes de usar os novos recursos do banco
1. Abra o **SQL Editor** do Supabase.
2. Execute o arquivo `supabase_upgrade.sql`.
3. Para transformar sua conta em administradora, altere o e-mail no final do SQL e execute o `update` indicado.
4. Não coloque a `service_role`/secret key no projeto. O arquivo `supabase-config.js` usa somente a Publishable key.

## Produtos de teste
O SQL cria produtos de teste sem fotos. Quando você tiver as fotos reais, poderá cadastrá-las pelo painel administrativo usando uma URL de imagem.

## Painel
Abra `admin.html` no mesmo local do `index.html` e entre com a conta que recebeu `role = 'admin'` no Supabase.

## Importante sobre o cadastro
Para criar a conta e entrar sem confirmação de e-mail, mantenha o provedor Email ativado e a confirmação de e-mail desativada no Supabase, como você configurou.
