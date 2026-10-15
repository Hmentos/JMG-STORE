# Atualização: envio de imagens do dispositivo

## Para atualizar a loja que já está funcionando
1. Faça uma cópia da pasta atual do site.
2. Extraia este pacote e substitua os arquivos correspondentes na pasta do site.
   Todos os nomes já estão corretos, sem números entre parênteses.
3. No SQL Editor do seu projeto Supabase, execute apenas
   `ativar-upload-imagens.sql`, caso ainda não tenha executado essa atualização.
   Não é necessário executar o upgrade completo ou configurar administradores
   novamente apenas para ativar o upload.
4. Atualize o painel (Ctrl + F5), entre como administrador e abra Produtos.
5. Crie ou edite um produto, escolha a imagem do dispositivo e salve.
6. Confira a imagem no painel e na vitrine.

Seu arquivo supabase-config.js foi preservado exatamente como enviado.
As duas imagens originais da loja estão incluídas no pacote.

## Imagens dos produtos
- Uma imagem por produto, com prévia antes de salvar.
- JPG, PNG, WebP e GIF de até 5 MB.
- A opção de colar um link continua disponível.
- Cancelar seleção restaura a prévia do link anterior.
- O upload ocorre ao salvar, com permissão de administrador no Supabase.
- Se o produto falhar depois do upload, a URL fica no formulário para repetir
  o salvamento sem reenviar o arquivo.
- Imagens antigas não são excluídas automaticamente do Storage.

## Banco existente e upgrade completo
O supabase_upgrade.sql também inclui o upload na seção 26.
Ele é um upgrade para as tabelas existentes, não uma instalação do banco do zero.
As instruções anteriores abaixo são mantidas para quem ainda precisa configurar
o restante do projeto; para somente esta atualização, siga o procedimento acima.

## Verificações desta entrega
Sintaxe JavaScript, referências locais, integridade das imagens e conteúdo do ZIP
verificados. Fluxos de upload, edição por URL, validação de arquivo e recuperação
após falha testados com Supabase simulado. O SQL não foi executado no seu projeto
e o envio real ainda precisa ser validado após a instalação.

---

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
