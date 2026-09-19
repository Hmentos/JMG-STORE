const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const WHATSAPP_NUMBER = "5511976935076";
const SHIPPING_FEE = 15;

const DEMO_PRODUCTS = [
  {
    id: 1,
    name: "Camiseta Fé & Propósito",
    category: "Camisetas",
    price: 79.90,
    stock: 10,
    sizes: ["P", "M", "G", "GG"],
    description: "Modelo de teste da coleção JMG.",
    icon: "👕",
    tag: "Destaque",
    featured: true
  },
  {
    id: 2,
    name: "Camiseta Graça",
    category: "Camisetas",
    price: 79.90,
    stock: 8,
    sizes: ["P", "M", "G", "GG"],
    description: "Modelo de teste da coleção JMG.",
    icon: "👕",
    tag: "Novo",
    featured: true
  },
  {
    id: 3,
    name: "Blusa Caminho",
    category: "Blusas",
    price: 119.90,
    stock: 6,
    sizes: ["P", "M", "G", "GG"],
    description: "Modelo de teste da coleção JMG.",
    icon: "🧥",
    tag: "Destaque",
    featured: true
  },
  {
    id: 4,
    name: "Blusa Faith",
    category: "Blusas",
    price: 119.90,
    stock: 7,
    sizes: ["P", "M", "G", "GG"],
    description: "Modelo de teste da coleção JMG.",
    icon: "🧥",
    tag: "Novo",
    featured: false
  },
  {
    id: 5,
    name: "Boné JMG",
    category: "Bonés",
    price: 59.90,
    stock: 12,
    sizes: ["Único"],
    description: "Modelo de teste da coleção JMG.",
    icon: "🧢",
    tag: "",
    featured: false
  },
  {
    id: 6,
    name: "Boné Fé",
    category: "Bonés",
    price: 59.90,
    stock: 9,
    sizes: ["Único"],
    description: "Modelo de teste da coleção JMG.",
    icon: "🧢",
    tag: "",
    featured: false
  },
  {
    id: 7,
    name: "Pochete JMG",
    category: "Pochetes",
    price: 69.90,
    stock: 11,
    sizes: ["Único"],
    description: "Modelo de teste da coleção JMG.",
    icon: "🎒",
    tag: "",
    featured: false
  },
  {
    id: 8,
    name: "Pochete Propósito",
    category: "Pochetes",
    price: 69.90,
    stock: 5,
    sizes: ["Único"],
    description: "Modelo de teste da coleção JMG.",
    icon: "🎒",
    tag: "",
    featured: false
  }
];

let products = [];
let categories = ["Camisetas", "Blusas", "Bonés", "Pochetes"];

let cart = JSON.parse(
  localStorage.getItem("jmg_cart") || "[]"
);

let favorites = new Set(
  JSON.parse(
    localStorage.getItem("jmg_favorites") || "[]"
  ).map(Number)
);

let authMode = "login";
let cepTimer;

const $ = s => document.querySelector(s);

const money = n =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function toast(msg) {
  const t = $("#toast");

  if (!t) return;

  t.textContent = msg;
  t.classList.add("show");

  clearTimeout(window.__toast);

  window.__toast = setTimeout(
    () => t.classList.remove("show"),
    2600
  );
}

function saveCart() {
  localStorage.setItem(
    "jmg_cart",
    JSON.stringify(cart)
  );

  const count = $("#cartCount");

  if (count) {
    count.textContent = cart.reduce(
      (a, i) => a + i.qty,
      0
    );
  }
}

function saveFavorites() {
  localStorage.setItem(
    "jmg_favorites",
    JSON.stringify([...favorites])
  );

  const count = $("#favoriteCount");

  if (count) {
    count.textContent = favorites.size;
  }
}

function productById(id) {
  return products.find(
    p => Number(p.id) === Number(id)
  );
}

function normalizeProduct(p) {
  return {
    ...p,
    id: Number(p.id),
    price: Number(p.price),
    stock: Number(p.stock || 0),
    sizes:
      Array.isArray(p.sizes) && p.sizes.length
        ? p.sizes
        : ["Único"],
    featured: Boolean(p.featured),
    tag: p.tag || "",
    icon: p.icon || "👕",
    description:
      p.description || "Produto JMG STORE."
  };
}


/* ============================================
   PRODUTOS
============================================ */

async function loadProducts() {
  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("products")
      .select(
        "id,name,description,price,stock,image_url,active,sizes,featured,tag,icon,categories(name)"
      )
      .eq("active", true)
      .order("featured", {
        ascending: false
      })
      .order("created_at", {
        ascending: false
      });

    if (error) throw error;

    if (data?.length) {
      products = data.map(p =>
        normalizeProduct({
          ...p,
          category:
            p.categories?.name ||
            "Sem categoria"
        })
      );

      categories = [
        ...new Set(
          products.map(p => p.category)
        )
      ];
    } else {
      products =
        DEMO_PRODUCTS.map(normalizeProduct);
    }

  } catch (e) {
    console.warn(
      "Usando produtos de teste:",
      e
    );

    products =
      DEMO_PRODUCTS.map(normalizeProduct);
  }

  syncCartStock();
  renderProducts();
  renderCart();
}

function syncCartStock() {
  cart = cart
    .filter(
      i =>
        productById(i.id) &&
        productById(i.id).stock > 0
    )
    .map(i => ({
      ...i,
      qty: Math.min(
        i.qty,
        productById(i.id).stock
      )
    }))
    .filter(i => i.qty > 0);

  saveCart();
}

function renderProducts() {
  const search =
    $("#searchInput")?.value
      .trim()
      .toLowerCase() || "";

  const cat =
    $("#categoryFilter")?.value ||
    "Todos";

  const sort =
    $("#sortFilter")?.value ||
    "featured";

  let list = products.filter(
    p =>
      (cat === "Todos" ||
        p.category === cat) &&
      (!search ||
        `${p.name} ${p.description} ${p.category}`
          .toLowerCase()
          .includes(search))
  );

  if (sort === "priceAsc") {
    list.sort(
      (a, b) => a.price - b.price
    );
  }

  if (sort === "priceDesc") {
    list.sort(
      (a, b) => b.price - a.price
    );
  }

  if (sort === "name") {
    list.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  if (sort === "featured") {
    list.sort(
      (a, b) =>
        Number(b.featured) -
        Number(a.featured)
    );
  }

  const empty = $("#catalogEmpty");
  const grid = $("#productGrid");

  if (!grid) return;

  if (empty) {
    empty.classList.toggle(
      "hidden",
      !!list.length
    );
  }

  grid.innerHTML = list
    .map(
      p => `
      <article
        class="product-card"
        data-id="${p.id}"
      >

        <button
          class="favorite-btn ${
            favorites.has(p.id)
              ? "active"
              : ""
          }"
          onclick="toggleFavorite(${p.id})"
          aria-label="Favoritar"
        >
          ${
            favorites.has(p.id)
              ? "♥"
              : "♡"
          }
        </button>

        <div
          class="product-image"
          onclick="openProduct(${p.id})"
        >

          ${
            p.tag
              ? `<span class="tag">${p.tag}</span>`
              : ""
          }

          ${
            p.image_url
              ? `<img
                  src="${p.image_url}"
                  alt="${p.name}"
                >`
              : `<span class="mock">${p.icon}</span>`
          }

        </div>

        <div class="product-info">

          <span class="product-category">
            ${p.category}
          </span>

          <h3>${p.name}</h3>

          <p class="product-desc">
            ${p.description}
          </p>

          <span class="price">
            ${money(p.price)}
          </span>

          <small
            class="stock ${
              p.stock <= 3
                ? "low"
                : ""
            }"
          >
            ${
              p.stock > 0
                ? p.stock <= 3
                  ? `Últimas ${p.stock} unidades`
                  : `${p.stock} disponíveis`
                : "Esgotado"
            }
          </small>

          <button
            class="add-btn"
            ${
              p.stock <= 0
                ? "disabled"
                : ""
            }
            onclick="openProduct(${p.id})"
          >
            ${
              p.stock > 0
                ? "Ver produto"
                : "Esgotado"
            }
          </button>

        </div>

      </article>
    `
    )
    .join("");
}


/* ============================================
   PRODUTO
============================================ */

function openProduct(id) {
  const p = productById(id);

  if (!p) return;

  $("#productDetail").innerHTML = `
    <div class="detail-grid">

      <div class="detail-image">
        ${
          p.image_url
            ? `<img
                src="${p.image_url}"
                alt="${p.name}"
              >`
            : `<span>${p.icon}</span>`
        }
      </div>

      <div>

        <span class="product-category">
          ${p.category}
        </span>

        <h2>${p.name}</h2>

        <p class="detail-desc">
          ${p.description}
        </p>

        <strong class="detail-price">
          ${money(p.price)}
        </strong>

        <p
          class="stock ${
            p.stock <= 3
              ? "low"
              : ""
          }"
        >
          ${
            p.stock > 0
              ? p.stock <= 3
                ? `Últimas ${p.stock} unidades`
                : `${p.stock} unidades em estoque`
              : "Produto esgotado"
          }
        </p>

        ${
          p.stock > 0
            ? `
              <label class="field">
                Tamanho

                <select id="detailSize">
                  ${p.sizes
                    .map(
                      s =>
                        `<option>${s}</option>`
                    )
                    .join("")}
                </select>

              </label>

              <label class="field">
                Quantidade

                <input
                  id="detailQty"
                  type="number"
                  min="1"
                  max="${p.stock}"
                  value="1"
                >

              </label>

              <button
                class="btn btn-gold full"
                onclick="addDetailToCart(${p.id})"
              >
                Adicionar ao carrinho
              </button>
            `
            : `
              <button
                class="btn full"
                disabled
              >
                Esgotado
              </button>
            `
        }

      </div>

    </div>
  `;

  openModal("#productModal");
}

function addDetailToCart(id) {
  const p = productById(id);

  const size =
    $("#detailSize")?.value ||
    "Único";

  const qty = Math.max(
    1,
    Math.min(
      Number(
        $("#detailQty")?.value || 1
      ),
      p.stock
    )
  );

  const existing = cart.find(
    i =>
      i.id === id &&
      i.size === size
  );

  if (existing) {
    existing.qty = Math.min(
      existing.qty + qty,
      p.stock
    );
  } else {
    cart.push({
      id,
      qty,
      size
    });
  }

  saveCart();

  toast(
    "Produto adicionado ao carrinho."
  );

  openModal("#cartModal");
}

function addToCart(
  id,
  size = "Único",
  qty = 1
) {
  const p = productById(id);

  if (!p || p.stock < 1) return;

  const e = cart.find(
    i =>
      i.id === id &&
      i.size === size
  );

  if (e) {
    e.qty = Math.min(
      e.qty + qty,
      p.stock
    );
  } else {
    cart.push({
      id,
      qty,
      size
    });
  }

  saveCart();

  toast(
    "Produto adicionado ao carrinho."
  );
}


/* ============================================
   CARRINHO
============================================ */

function changeQty(index, delta) {
  const item = cart[index];
  const p = productById(item.id);

  if (!p) return;

  if (delta > 0) {
    item.qty = Math.min(
      item.qty + delta,
      p.stock
    );
  } else {
    item.qty -= 1;
  }

  if (item.qty <= 0) {
    cart.splice(index, 1);
  }

  saveCart();
  renderCart();
}

function removeCart(index) {
  cart.splice(index, 1);

  saveCart();
  renderCart();
}

function getTotals() {
  const subtotal = cart.reduce(
    (s, i) => {
      const p = productById(i.id);

      return (
        s +
        (p
          ? p.price * i.qty
          : 0)
      );
    },
    0
  );

  return {
    subtotal,
    total:
      subtotal +
      (cart.length
        ? SHIPPING_FEE
        : 0)
  };
}

function renderCart() {
  const box = $("#cartItems");

  if (!box) return;

  if (!cart.length) {
    box.innerHTML = `
      <div class="empty-state">
        Seu carrinho está vazio.
        <br>
        <a
          href="#produtos"
          onclick="closeModal()"
        >
          Continuar comprando
        </a>
      </div>
    `;
  } else {
    box.innerHTML = cart
      .map(
        (i, index) => {
          const p =
            productById(i.id);

          return `
            <div class="cart-line">

              <div class="cart-thumb">
                ${
                  p.image_url
                    ? `<img
                        src="${p.image_url}"
                        alt=""
                      >`
                    : p.icon
                }
              </div>

              <div class="cart-main">

                <strong>
                  ${p.name}
                </strong>

                <small>
                  Tamanho:
                  ${i.size || "Único"}
                </small>

                <span>
                  ${money(
                    p.price * i.qty
                  )}
                </span>

                <div class="qty">

                  <button
                    onclick="changeQty(${index},-1)"
                  >
                    −
                  </button>

                  <b>${i.qty}</b>

                  <button
                    onclick="changeQty(${index},1)"
                  >
                    +
                  </button>

                  <button
                    class="remove-btn"
                    onclick="removeCart(${index})"
                  >
                    Remover
                  </button>

                </div>

              </div>

            </div>
          `;
        }
      )
      .join("");
  }

  const {
    subtotal,
    total
  } = getTotals();

  if ($("#subtotal")) {
    $("#subtotal").textContent =
      money(subtotal);
  }

  if ($("#total")) {
    $("#total").textContent =
      money(total);
  }
}


/* ============================================
   MODAIS
============================================ */

function openModal(id) {
  $("#modalBackdrop").classList.add(
    "open"
  );

  document
    .querySelectorAll(".modal")
    .forEach(
      m =>
        (m.style.display = "none")
    );

  $(id).style.display = "block";

  if (id === "#cartModal") {
    renderCart();
  }

  if (id === "#favoritesModal") {
    renderFavorites();
  }
}

function closeModal() {
  $("#modalBackdrop").classList.remove(
    "open"
  );
}

document.addEventListener(
  "click",
  e => {
    if (
      e.target.matches("[data-close]")
    ) {
      closeModal();
    }
  }
);

$("#modalBackdrop").addEventListener(
  "click",
  e => {
    if (
      e.target.id ===
      "modalBackdrop"
    ) {
      closeModal();
    }
  }
);


/* ============================================
   NAVEGAÇÃO
============================================ */

$("#menuToggle").addEventListener(
  "click",
  () =>
    $("#mainNav").classList.toggle(
      "open"
    )
);

document
  .querySelectorAll("#mainNav a")
  .forEach(a =>
    a.addEventListener(
      "click",
      () =>
        $("#mainNav").classList.remove(
          "open"
        )
    )
  );

$("#cartBtn").addEventListener(
  "click",
  () =>
    openModal("#cartModal")
);

$("#searchInput").addEventListener(
  "input",
  renderProducts
);

$("#categoryFilter").addEventListener(
  "change",
  renderProducts
);

$("#sortFilter").addEventListener(
  "change",
  renderProducts
);

document
  .querySelectorAll(".category-card")
  .forEach(b =>
    b.addEventListener(
      "click",
      () => {
        $("#categoryFilter").value =
          b.dataset.category;

        renderProducts();

        $("#produtos").scrollIntoView({
          behavior: "smooth"
        });
      }
    )
  );


/* ============================================
   FAVORITOS
============================================ */

function toggleFavorite(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }

  saveFavorites();
  renderProducts();
}

async function renderFavorites() {
  if (!favorites.size) {
    $("#favoritesContent").innerHTML =
      `
        <div class="empty-state">
          Você ainda não tem favoritos.
        </div>
      `;

    return;
  }

  const list = products.filter(
    p => favorites.has(p.id)
  );

  $("#favoritesContent").innerHTML = `
    <div class="mini-grid">

      ${list
        .map(
          p => `
            <button
              class="mini-product"
              onclick="openProduct(${p.id})"
            >

              <span>
                ${
                  p.image_url
                    ? `<img
                        src="${p.image_url}"
                        alt=""
                      >`
                    : p.icon
                }
              </span>

              <strong>
                ${p.name}
              </strong>

              <small>
                ${money(p.price)}
              </small>

            </button>
          `
        )
        .join("")}

    </div>
  `;
}

$("#favoritesBtn").addEventListener(
  "click",
  () =>
    openModal(
      "#favoritesModal"
    )
);


/* ============================================
   ENDEREÇO
============================================ */

async function getAddress(user) {
  const {
    data,
    error
  } = await supabaseClient
    .from("addresses")
    .select(
      "id,cep,street,number,complement,neighborhood,city,state"
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

function addressText(a) {
  return `${a.street || "Rua não informada"}, ${
    a.number || "s/n"
  }${
    a.complement
      ? ` — ${a.complement}`
      : ""
  } — ${
    a.neighborhood || ""
  } — ${
    a.city || ""
  }/${
    a.state || ""
  } — CEP ${
    a.cep || ""
  }`;
}


/* ============================================
   CHECKOUT
============================================ */

async function renderCheckout(user) {
  const {
    subtotal,
    total
  } = getTotals();

  $("#checkoutStatus").textContent =
    `Pedido de ${
      user.user_metadata?.full_name ||
      user.email
    }`;

  $("#checkoutItems").innerHTML =
    cart
      .map(i => {
        const p =
          productById(i.id);

        return `
          <div class="checkout-line">

            <span>
              ${p.name}
              —
              ${i.size || "Único"}
              × ${i.qty}
            </span>

            <strong>
              ${money(
                p.price * i.qty
              )}
            </strong>

          </div>
        `;
      })
      .join("");

  $("#checkoutSubtotal").textContent =
    money(subtotal);

  $("#checkoutTotal").textContent =
    money(total);

  try {
    const a =
      await getAddress(user);

    $("#checkoutAddress").innerHTML =
      a
        ? addressText(a)
        : `
          <span class="warning-text">
            Cadastre um endereço para continuar.
          </span>
        `;
  } catch (e) {
    $("#checkoutAddress").textContent =
      "Não foi possível carregar o endereço.";
  }
}

$("#checkoutBtn").addEventListener(
  "click",
  async () => {
    if (!cart.length) {
      return toast(
        "Adicione um produto primeiro."
      );
    }

    const {
      data
    } =
      await supabaseClient.auth.getSession();

    if (!data.session) {
      toast(
        "Entre na sua conta para finalizar o pedido."
      );

      openAuth();

      return;
    }

    openModal("#checkoutModal");

    renderCheckout(
      data.session.user
    );
  }
);


/* ============================================
   CRIAR PEDIDO
============================================ */

async function createOrder(
  user,
  payment
) {
  const {
    subtotal,
    total
  } = getTotals();

  const a =
    await getAddress(user);

  if (!a) {
    throw new Error(
      "Cadastre seu endereço antes de finalizar."
    );
  }

  const {
    data: order,
    error
  } =
    await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: a.id,
        status: "recebido",
        subtotal,
        shipping: SHIPPING_FEE,
        total,
        payment_method: payment,
        whatsapp_sent: true
      })
      .select()
      .single();

  if (error) throw error;

  const rows = cart.map(i => {
    const p =
      productById(i.id);

    return {
      order_id: order.id,
      product_id: p.id,
      product_name: p.name,
      quantity: i.qty,
      unit_price: p.price,
      size: i.size || "Único"
    };
  });

  const {
    error: itemError
  } =
    await supabaseClient
      .from("order_items")
      .insert(rows);

  if (itemError) {
    console.warn(
      "Pedido criado, mas itens não foram registrados:",
      itemError
    );
  }

  return {
    order,
    address: a,
    subtotal,
    total
  };
}


/* ============================================
   WHATSAPP
============================================ */

$("#whatsappCheckoutBtn").addEventListener(
  "click",
  async () => {
    if (!cart.length) {
      return toast(
        "Seu carrinho está vazio."
      );
    }

    const {
      data
    } =
      await supabaseClient.auth.getSession();

    if (!data.session) {
      openAuth();
      return;
    }

    const payment =
      document.querySelector(
        'input[name="paymentMethod"]:checked'
      )?.value || "Pix";

    try {
      const {
        order,
        address,
        subtotal,
        total
      } = await createOrder(
        data.session.user,
        payment
      );

      const name =
        data.session.user
          .user_metadata
          ?.full_name ||
        data.session.user.email ||
        "Cliente";

      const lines = cart
        .map(i => {
          const p =
            productById(i.id);

          return `• ${p.name} — ${
            i.size || "Único"
          } — ${i.qty}x — ${money(
            p.price * i.qty
          )}`;
        })
        .join("\n");

      const msg = [
        "Olá! Gostaria de finalizar um pedido na JMG STORE.",
        "",
        `*Pedido:* #${order.id}`,
        `*Cliente:* ${name}`,
        `*E-mail:* ${
          data.session.user.email || ""
        }`,
        "",
        "*Produtos:*",
        lines,
        "",
        `*Subtotal:* ${money(
          subtotal
        )}`,
        `*Frete:* ${money(
          SHIPPING_FEE
        )}`,
        `*Total:* ${money(total)}`,
        `*Pagamento:* ${payment}`,
        "",
        `*Endereço:* ${addressText(
          address
        )}`
      ].join("\n");

      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          msg
        )}`,
        "_blank",
        "noopener,noreferrer"
      );

      cart = [];

      saveCart();

      closeModal();

      toast(
        "Pedido enviado para o WhatsApp!"
      );

    } catch (e) {
      console.error(e);

      toast(
        e.message ||
          "Não foi possível finalizar o pedido."
      );
    }
  }
);


/* ============================================
   EDITAR ENDEREÇO
============================================ */

$("#editAddressBtn").addEventListener(
  "click",
  () => {
    closeModal();
    openAuth();
    setAuthMode("register");
  }
);


/* ============================================
   AUTENTICAÇÃO
============================================ */

const authForm = $("#authForm");
const authTitle = $("#authTitle");
const authSubmit = $("#authSubmit");
const toggleAuth = $("#toggleAuth");
const registerFields = $("#registerFields");
const authMessage = $("#authMessage");
const logoutBtn = $("#logoutBtn");
const forgotPasswordBtn =
  $("#forgotPasswordBtn");
const backToLoginBtn =
  $("#backToLoginBtn");
const cepInput = $("#cep");
const addressPreview =
  $("#addressPreview");


/* ============================================
   CORREÇÃO DO LOGIN
============================================ */

function setAuthMode(mode) {
  authMode = mode;

  const r = mode === "register";

  authTitle.textContent =
    r ? "Criar minha conta" : "Entrar";

  authSubmit.textContent =
    r ? "Criar conta" : "Entrar";

  registerFields.classList.toggle(
    "hidden",
    !r
  );

  toggleAuth.classList.remove(
    "hidden"
  );

  toggleAuth.textContent =
    r
      ? "Já tenho uma conta"
      : "Ainda não tenho conta";

  forgotPasswordBtn.classList.toggle(
    "hidden",
    r
  );

  backToLoginBtn.classList.add(
    "hidden"
  );

  authMessage.textContent = "";

  /*
   * CORREÇÃO:
   * Os campos de cadastro só são
   * obrigatórios quando estamos
   * realmente cadastrando.
   */

  $("#fullName").required = r;
  $("#phone").required = r;
  $("#cep").required = r;
  $("#addressNumber").required = r;

  /*
   * E-mail e senha são obrigatórios
   * tanto no login quanto no cadastro.
   */

  $("#authEmail").required = true;
  $("#authPassword").required = true;

  $("#authPassword").autocomplete =
    r
      ? "new-password"
      : "current-password";

  $("#authPassword").type =
    "password";
}


/* ============================================
   RECUPERAÇÃO DE SENHA
============================================ */

function setForgotMode() {
  authMode = "forgot";

  authTitle.textContent =
    "Recuperar senha";

  authMessage.textContent =
    "Digite seu e-mail para receber o link.";

  registerFields.classList.add(
    "hidden"
  );

  toggleAuth.classList.add(
    "hidden"
  );

  forgotPasswordBtn.classList.add(
    "hidden"
  );

  backToLoginBtn.classList.remove(
    "hidden"
  );

  authSubmit.textContent =
    "Enviar link";

  $("#authPassword").required =
    false;

  $("#authPassword").type =
    "hidden";
}

function setResetMode() {
  authMode = "reset";

  authTitle.textContent =
    "Redefinir senha";

  authMessage.textContent =
    "Digite sua nova senha.";

  registerFields.classList.add(
    "hidden"
  );

  toggleAuth.classList.add(
    "hidden"
  );

  forgotPasswordBtn.classList.add(
    "hidden"
  );

  backToLoginBtn.classList.remove(
    "hidden"
  );

  authSubmit.textContent =
    "Salvar nova senha";

  $("#authPassword").type =
    "password";

  $("#authPassword").required =
    true;

  $("#authPassword").value = "";

  $("#authPassword").placeholder =
    "Nova senha (mínimo 6 caracteres)";
}


/* ============================================
   ABRIR LOGIN
============================================ */

async function openAuth() {
  const {
    data
  } =
    await supabaseClient.auth.getSession();

  if (data.session) {
    await showAccount();
    return;
  }

  openModal("#loginModal");

  authForm.classList.remove(
    "hidden"
  );

  logoutBtn.classList.add(
    "hidden"
  );

  setAuthMode("login");
}


/* ============================================
   CEP
============================================ */

function formatCep(v) {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(
      /^(\d{5})(\d)/,
      "$1-$2"
    );
}

async function lookupCep() {
  const cep =
    cepInput.value.replace(
      /\D/g,
      ""
    );

  if (cep.length !== 8) {
    addressPreview.textContent = "";

    delete addressPreview.dataset
      .street;

    return;
  }

  addressPreview.textContent =
    "Buscando endereço...";

  try {
    const r = await fetch(
      `https://viacep.com.br/ws/${cep}/json/`
    );

    const d = await r.json();

    if (d.erro) {
      throw new Error(
        "CEP não encontrado."
      );
    }

    Object.assign(
      addressPreview.dataset,
      {
        street:
          d.logradouro || "",

        neighborhood:
          d.bairro || "",

        city:
          d.localidade || "",

        state:
          d.uf || ""
      }
    );

    addressPreview.textContent =
      `${
        d.logradouro ||
        "Rua não informada"
      } — ${
        d.bairro || ""
      } — ${
        d.localidade || ""
      }/${
        d.uf || ""
      }`;

  } catch (e) {
    addressPreview.textContent =
      e.message ||
      "Não foi possível consultar o CEP.";

    delete addressPreview.dataset
      .street;
  }
}

cepInput.addEventListener(
  "input",
  () => {
    cepInput.value =
      formatCep(
        cepInput.value
      );

    clearTimeout(cepTimer);

    cepTimer = setTimeout(
      lookupCep,
      350
    );
  }
);


/* ============================================
   BOTÕES DE AUTENTICAÇÃO
============================================ */

toggleAuth.addEventListener(
  "click",
  () =>
    setAuthMode(
      authMode === "login"
        ? "register"
        : "login"
    )
);

forgotPasswordBtn.addEventListener(
  "click",
  setForgotMode
);

backToLoginBtn.addEventListener(
  "click",
  () => {
    authForm.classList.remove(
      "hidden"
    );

    setAuthMode("login");
  }
);


/* ============================================
   SALVAR CLIENTE
============================================ */

async function saveCustomer(
  user,
  d
) {
  const {
    error: p
  } =
    await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: d.fullName,
          email:
            user.email || "",
          phone: d.phone
        },
        {
          onConflict: "id"
        }
      );

  if (p) throw p;

  const a =
    await getAddress(user);

  if (a) {
    const {
      error
    } =
      await supabaseClient
        .from("addresses")
        .update({
          cep: d.cep,
          street: d.street,
          number: d.number,
          complement:
            d.complement || null,
          neighborhood:
            d.neighborhood,
          city: d.city,
          state: d.state
        })
        .eq("id", a.id);

    if (error) throw error;

  } else {
    const {
      error
    } =
      await supabaseClient
        .from("addresses")
        .insert({
          user_id: user.id,
          cep: d.cep,
          street: d.street,
          number: d.number,
          complement:
            d.complement || null,
          neighborhood:
            d.neighborhood,
          city: d.city,
          state: d.state
        });

    if (error) throw error;
  }
}


/* ============================================
   FORMULÁRIO DE AUTENTICAÇÃO
============================================ */

authForm.addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    authSubmit.disabled = true;

    authMessage.textContent = "";

    try {
      const email =
        $("#authEmail").value.trim();

      const password =
        $("#authPassword").value;

      /* LOGIN */

      if (authMode === "login") {
        const {
          data,
          error
        } =
          await supabaseClient.auth
            .signInWithPassword({
              email,
              password
            });

        if (error) {
          throw error;
        }

        toast(
          "Login realizado com sucesso!"
        );

        closeModal();

        /*
         * Atualiza a interface
         * depois do login.
         */

        await updateAuthUI(
          data.user
        );

        return;
      }


      /* RECUPERAR SENHA */

      if (authMode === "forgot") {
        if (!email) {
          throw new Error(
            "Digite seu e-mail."
          );
        }

        const {
          error
        } =
          await supabaseClient.auth
            .resetPasswordForEmail(
              email,
              {
                redirectTo:
                  window.location.href
                    .split("#")[0]
              }
            );

        if (error) {
          throw error;
        }

        authMessage.textContent =
          "Se o e-mail estiver cadastrado, o link foi enviado.";

        return;
      }


      /* REDEFINIR SENHA */

      if (authMode === "reset") {
        if (password.length < 6) {
          throw new Error(
            "A nova senha precisa ter pelo menos 6 caracteres."
          );
        }

        const {
          error
        } =
          await supabaseClient.auth
            .updateUser({
              password
            });

        if (error) {
          throw error;
        }

        toast(
          "Senha redefinida com sucesso!"
        );

        setAuthMode("login");

        authMessage.textContent =
          "Senha alterada. Agora faça login.";

        return;
      }


      /* CADASTRO */

      const fullName =
        $("#fullName")
          .value.trim();

      const phone =
        $("#phone")
          .value.trim();

      const cep =
        cepInput.value.replace(
          /\D/g,
          ""
        );

      const number =
        $("#addressNumber")
          .value.trim();

      const complement =
        $("#complement")
          .value.trim();

      if (
        !fullName ||
        !phone ||
        cep.length !== 8 ||
        !number
      ) {
        throw new Error(
          "Preencha nome, telefone, CEP e número."
        );
      }

      if (
        !addressPreview.dataset
          .street
      ) {
        await lookupCep();
      }

      if (
        !addressPreview.dataset
          .street
      ) {
        throw new Error(
          "Informe um CEP válido."
        );
      }

      const d = {
        fullName,
        phone,
        cep,
        number,
        complement,
        street:
          addressPreview.dataset
            .street,
        neighborhood:
          addressPreview.dataset
            .neighborhood,
        city:
          addressPreview.dataset
            .city,
        state:
          addressPreview.dataset
            .state
      };

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signUp({
            email,
            password,
            options: {
              data: {
                full_name:
                  fullName,
                phone
              }
            }
          });

      if (error) {
        throw error;
      }

      if (data.session) {
        await saveCustomer(
          data.user,
          d
        );

        toast(
          "Conta criada com sucesso!"
        );

        closeModal();

        await updateAuthUI(
          data.user
        );

      } else {
        toast(
          "Conta criada. Faça login quando estiver liberada."
        );

        setAuthMode("login");
      }

    } catch (err) {
      console.error(
        "Erro de autenticação:",
        err
      );

      authMessage.textContent =
        err.message ||
        "Não foi possível concluir.";

    } finally {
      authSubmit.disabled = false;
    }
  }
);


/* ============================================
   INTERFACE DE LOGIN
============================================ */

async function updateAuthUI(
  user = null
) {
  try {
    if (!user) {
      const {
        data
      } =
        await supabaseClient.auth
          .getSession();

      user =
        data.session?.user ||
        null;
    }

    const loginBtn =
      $("#loginBtn");

    if (!loginBtn) return;

    if (user) {
      loginBtn.textContent =
        "Minha conta";

      loginBtn.classList.add(
        "logged-in"
      );
    } else {
      loginBtn.textContent =
        "Entrar";

      loginBtn.classList.remove(
        "logged-in"
      );
    }

  } catch (e) {
    console.warn(
      "Não foi possível atualizar a interface:",
      e
    );
  }
}


/* ============================================
   LOGOUT
============================================ */

logoutBtn.addEventListener(
  "click",
  async () => {
    const {
      error
    } =
      await supabaseClient.auth
        .signOut();

    if (error) {
      toast(
        error.message ||
        "Não foi possível sair."
      );

      return;
    }

    toast(
      "Você saiu da conta."
    );

    closeModal();

    await updateAuthUI(
      null
    );
  }
);


/* ============================================
   BOTÃO LOGIN
============================================ */

$("#loginBtn").addEventListener(
  "click",
  openAuth
);


/* ============================================
   CONTA
============================================ */

async function showAccount() {
  const {
    data
  } =
    await supabaseClient.auth
      .getSession();

  if (!data.session) {
    openAuth();
    return;
  }

  openModal(
    "#accountModal"
  );

  const user =
    data.session.user;

  let a = null;

  try {
    a =
      await getAddress(user);
  } catch (e) {
    console.warn(
      "Não foi possível carregar endereço:",
      e
    );
  }

  $("#accountContent").innerHTML = `
    <div class="account-card">

      <strong>
        ${
          user.user_metadata
            ?.full_name ||
          "Cliente"
        }
      </strong>

      <span>
        ${user.email || ""}
      </span>

      <span>
        ${
          user.user_metadata
            ?.phone || ""
        }
      </span>

      ${
        a
          ? `<p>${addressText(a)}</p>`
          : `<p>Endereço não cadastrado.</p>`
      }

      <div class="account-actions">

        <button
          class="btn btn-outline"
          onclick="closeModal();openAuth();setAuthMode('register')"
        >
          Editar cadastro/endereço
        </button>

        <button
          class="btn btn-outline"
          onclick="loadOrders()"
        >
          Meus pedidos
        </button>

        <button
          class="btn btn-outline"
          onclick="logoutBtn.click()"
        >
          Sair da conta
        </button>

      </div>

    </div>
  `;
}


/* ============================================
   PEDIDOS
============================================ */

async function loadOrders() {
  const {
    data: userData
  } =
    await supabaseClient.auth
      .getUser();

  if (!userData.user) {
    return;
  }

  openModal(
    "#ordersModal"
  );

  $("#ordersContent").innerHTML =
    "Carregando...";

  const {
    data,
    error
  } =
    await supabaseClient
      .from("orders")
      .select(
        "id,status,subtotal,shipping,total,payment_method,created_at,order_items(product_name,quantity,unit_price,size)"
      )
      .eq(
        "user_id",
        userData.user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {
    console.error(error);

    $("#ordersContent").textContent =
      "Não foi possível carregar seus pedidos.";

    return;
  }

  if (!data?.length) {
    $("#ordersContent").innerHTML =
      `
        <div class="empty-state">
          Você ainda não fez pedidos.
        </div>
      `;

    return;
  }

  $("#ordersContent").innerHTML =
    data
      .map(
        o => `
          <div class="order-card">

            <div>

              <strong>
                Pedido #${o.id}
              </strong>

              <span>
                ${
                  new Date(
                    o.created_at
                  ).toLocaleDateString(
                    "pt-BR"
                  )
                }
              </span>

            </div>

            <span class="status-pill">
              ${o.status}
            </span>

            <div>

              ${
                (
                  o.order_items ||
                  []
                )
                  .map(
                    i =>
                      `
                        <p>
                          ${
                            i.product_name
                          }
                          —
                          ${
                            i.size ||
                            "Único"
                          }
                          ×
                          ${i.quantity}
                        </p>
                      `
                  )
                  .join("")
              }

            </div>

            <strong>
              ${money(o.total)}
            </strong>

          </div>
        `
      )
      .join("");
}


/* ============================================
   DUPLO CLIQUE - CONTA
============================================ */

$("#loginBtn").addEventListener(
  "dblclick",
  showAccount
);


/* ============================================
   SUPABASE AUTH STATE
============================================ */

supabaseClient.auth.onAuthStateChange(
  async event => {

    if (
      event ===
      "PASSWORD_RECOVERY"
    ) {
      openModal(
        "#loginModal"
      );

      setResetMode();

      return;
    }

    /*
     * Atualiza o botão quando:
     * - entra
     * - sai
     * - recarrega a sessão
     */

    if (
      event === "SIGNED_IN" ||
      event === "SIGNED_OUT" ||
      event === "INITIAL_SESSION"
    ) {
      await updateAuthUI();
    }
  }
);


/* ============================================
   INICIALIZAÇÃO
============================================ */

if ($("#favoriteCount")) {
  $("#favoriteCount").textContent =
    favorites.size;
}

saveCart();

loadProducts();

updateAuthUI();