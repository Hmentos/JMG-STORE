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
    price: 79.9,
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
    price: 79.9,
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
    price: 119.9,
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
    price: 119.9,
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
    price: 59.9,
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
    price: 59.9,
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
    price: 69.9,
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
    price: 69.9,
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

let cart = JSON.parse(localStorage.getItem("jmg_cart") || "[]");

let favorites = new Set(
  JSON.parse(localStorage.getItem("jmg_favorites") || "[]").map(Number)
);

let authMode = "login";
let cepTimer;

const $ = (s) => document.querySelector(s);

const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const orderStatusLabel = (status) =>
  ({
    received: "Recebido",
    preparing: "Preparando",
    shipped: "Enviado",
    completed: "Concluído",
    cancelled: "Cancelado",
    recebido: "Recebido",
    preparando: "Preparando",
    enviado: "Enviado",
    concluído: "Concluído",
    cancelado: "Cancelado"
  }[status] || status || "Recebido");

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.classList.remove("show"), 2600);
}

function saveCart() {
  localStorage.setItem("jmg_cart", JSON.stringify(cart));
  const count = $("#cartCount");
  if (count) {
    count.textContent = cart.reduce((a, i) => a + i.qty, 0);
  }
}

function saveFavorites() {
  localStorage.setItem("jmg_favorites", JSON.stringify([...favorites]));
  const count = $("#favoriteCount");
  if (count) {
    count.textContent = favorites.size;
  }
}

function productById(id) {
  return products.find((p) => Number(p.id) === Number(id));
}

function normalizeProduct(p) {
  return {
    ...p,
    id: Number(p.id),
    price: Number(p.price),
    stock: Number(p.stock || 0),
    sizes: Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ["Único"],
    featured: Boolean(p.featured),
    tag: p.tag || "",
    icon: p.icon || "👕",
    description: p.description || "Produto JMG STORE."
  };
}

async function loadProducts() {
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select(
        "id,name,description,price,stock,image_url,active,sizes,featured,tag,icon,categories(name)"
      )
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data?.length) {
      products = data.map((p) =>
        normalizeProduct({
          ...p,
          category: p.categories?.name || "Sem categoria"
        })
      );
      categories = [...new Set(products.map((p) => p.category))];
    } else {
      products = DEMO_PRODUCTS.map(normalizeProduct);
    }
  } catch (e) {
    console.warn("Usando produtos de teste:", e);
    products = DEMO_PRODUCTS.map(normalizeProduct);
  }

  syncCartStock();
  renderProducts();
  renderCart();
}

function syncCartStock() {
  cart = cart
    .filter((i) => productById(i.id) && productById(i.id).stock > 0)
    .map((i) => ({
      ...i,
      qty: Math.min(i.qty, productById(i.id).stock)
    }))
    .filter((i) => i.qty > 0);
  saveCart();
}

function renderProducts() {
  const searchInput = $("#searchInput");
  const categoryFilter = $("#categoryFilter");
  const sortFilter = $("#sortFilter");
  if (!searchInput || !categoryFilter || !sortFilter) return;

  const search = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const sort = sortFilter.value;

  let list = products.filter(
    (p) =>
      (cat === "Todos" || p.category === cat) &&
      (!search ||
        `${p.name} ${p.description} ${p.category}`
          .toLowerCase()
          .includes(search))
  );

  if (sort === "priceAsc") list.sort((a, b) => a.price - b.price);
  if (sort === "priceDesc") list.sort((a, b) => b.price - a.price);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "featured") {
    list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  const empty = $("#catalogEmpty");
  if (empty) empty.classList.toggle("hidden", !!list.length);

  const grid = $("#productGrid");
  if (!grid) return;

  grid.innerHTML = list
    .map(
      (p) => `
      <article class="product-card" data-id="${p.id}">
        <button
          class="favorite-btn ${favorites.has(p.id) ? "active" : ""}"
          onclick="toggleFavorite(${p.id})"
          aria-label="Favoritar"
        >
          ${favorites.has(p.id) ? "♥" : "♡"}
        </button>
        <div class="product-image" onclick="openProduct(${p.id})">
          ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
          ${
            p.image_url
              ? `<img src="${p.image_url}" alt="${p.name}">`
              : `<span class="mock">${p.icon}</span>`
          }
        </div>
        <div class="product-info">
          <span class="product-category">${p.category}</span>
          <h3>${p.name}</h3>
          <p class="product-desc">${p.description}</p>
          <span class="price">${money(p.price)}</span>
          <small class="stock ${p.stock <= 3 ? "low" : ""}">
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
            ${p.stock <= 0 ? "disabled" : ""}
            onclick="openProduct(${p.id})"
          >
            ${p.stock > 0 ? "Ver produto" : "Esgotado"}
          </button>
        </div>
      </article>
    `
    )
    .join("");
}

function openProduct(id) {
  const p = productById(id);
  if (!p) return;
  const detail = $("#productDetail");
  if (!detail) return;

  detail.innerHTML = `
    <div class="detail-grid">
      <div class="detail-image">
        ${
          p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}">`
            : `<span>${p.icon}</span>`
        }
      </div>
      <div>
        <span class="product-category">${p.category}</span>
        <h2>${p.name}</h2>
        <p class="detail-desc">${p.description}</p>
        <strong class="detail-price">${money(p.price)}</strong>
        <p class="stock ${p.stock <= 3 ? "low" : ""}">
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
                  ${p.sizes.map((s) => `<option>${s}</option>`).join("")}
                </select>
              </label>
              <label class="field">
                Quantidade
                <input id="detailQty" type="number" min="1" max="${p.stock}" value="1">
              </label>
              <button class="btn btn-gold full" onclick="addDetailToCart(${p.id})">
                Adicionar ao carrinho
              </button>
            `
            : `<button class="btn full" disabled>Esgotado</button>`
        }
      </div>
    </div>
  `;
  openModal("#productModal");
}

function addDetailToCart(id) {
  const p = productById(id);
  if (!p) return;
  const size = $("#detailSize")?.value || "Único";
  const qty = Math.max(
    1,
    Math.min(Number($("#detailQty")?.value || 1), p.stock)
  );
  const existing = cart.find((i) => i.id === id && i.size === size);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, p.stock);
  } else {
    cart.push({ id, qty, size });
  }
  saveCart();
  toast("Produto adicionado ao carrinho.");
  openModal("#cartModal");
}

function addToCart(id, size = "Único", qty = 1) {
  const p = productById(id);
  if (!p || p.stock < 1) return;
  const e = cart.find((i) => i.id === id && i.size === size);
  if (e) {
    e.qty = Math.min(e.qty + qty, p.stock);
  } else {
    cart.push({ id, qty, size });
  }
  saveCart();
  toast("Produto adicionado ao carrinho.");
}

function changeQty(index, delta) {
  const item = cart[index];
  const p = productById(item.id);
  if (!p) return;
  if (delta > 0) {
    item.qty = Math.min(item.qty + delta, p.stock);
  } else {
    item.qty -= 1;
  }
  if (item.qty <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

function removeCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function getTotals() {
  const subtotal = cart.reduce((s, i) => {
    const p = productById(i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
  return {
    subtotal,
    total: subtotal + (cart.length ? SHIPPING_FEE : 0)
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
        <a href="#produtos" onclick="closeModal()">Continuar comprando</a>
      </div>
    `;
  } else {
    box.innerHTML = cart
      .map((i, index) => {
        const p = productById(i.id);
        if (!p) return "";
        return `
          <div class="cart-line">
            <div class="cart-thumb">
              ${p.image_url ? `<img src="${p.image_url}" alt="">` : p.icon}
            </div>
            <div class="cart-main">
              <strong>${p.name}</strong>
              <small>Tamanho: ${i.size || "Único"}</small>
              <span>${money(p.price * i.qty)}</span>
              <div class="qty">
                <button onclick="changeQty(${index}, -1)">−</button>
                <b>${i.qty}</b>
                <button onclick="changeQty(${index}, 1)">+</button>
                <button class="remove-btn" onclick="removeCart(${index})">Remover</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const { subtotal, total } = getTotals();
  const subtotalEl = $("#subtotal");
  const totalEl = $("#total");
  if (subtotalEl) subtotalEl.textContent = money(subtotal);
  if (totalEl) totalEl.textContent = money(total);
}

function openModal(id) {
  const backdrop = $("#modalBackdrop");
  if (!backdrop) return;
  backdrop.classList.add("open");
  document.querySelectorAll(".modal").forEach((m) => {
    m.style.display = "none";
  });
  const modal = $(id);
  if (modal) modal.style.display = "block";
  if (id === "#cartModal") renderCart();
  if (id === "#favoritesModal") renderFavorites();
}

function closeModal() {
  const backdrop = $("#modalBackdrop");
  if (backdrop) backdrop.classList.remove("open");
}

document.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]")) closeModal();
});

if ($("#modalBackdrop")) {
  $("#modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
}

if ($("#menuToggle")) {
  $("#menuToggle").addEventListener("click", () =>
    $("#mainNav")?.classList.toggle("open")
  );
}

document.querySelectorAll("#mainNav a").forEach((a) =>
  a.addEventListener("click", () => $("#mainNav")?.classList.remove("open"))
);

if ($("#cartBtn")) {
  $("#cartBtn").addEventListener("click", () => openModal("#cartModal"));
}

if ($("#searchInput")) {
  $("#searchInput").addEventListener("input", renderProducts);
}

if ($("#categoryFilter")) {
  $("#categoryFilter").addEventListener("change", renderProducts);
}

if ($("#sortFilter")) {
  $("#sortFilter").addEventListener("change", renderProducts);
}

document.querySelectorAll(".category-card").forEach((b) =>
  b.addEventListener("click", () => {
    if ($("#categoryFilter")) {
      $("#categoryFilter").value = b.dataset.category;
    }
    renderProducts();
    $("#produtos")?.scrollIntoView({ behavior: "smooth" });
  })
);

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
  const content = $("#favoritesContent");
  if (!content) return;
  if (!favorites.size) {
    content.innerHTML = `
      <div class="empty-state">
        Você ainda não tem favoritos.
      </div>
    `;
    return;
  }
  const list = products.filter((p) => favorites.has(p.id));
  content.innerHTML = `
    <div class="mini-grid">
      ${list
        .map(
          (p) => `
            <button class="mini-product" onclick="openProduct(${p.id})">
              <span>
                ${p.image_url ? `<img src="${p.image_url}" alt="">` : p.icon}
              </span>
              <strong>${p.name}</strong>
              <small>${money(p.price)}</small>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

if ($("#favoritesBtn")) {
  $("#favoritesBtn").addEventListener("click", () =>
    openModal("#favoritesModal")
  );
}

async function getAddress(user) {
  const { data, error } = await supabaseClient
    .from("addresses")
    .select("id,cep,street,number,complement,neighborhood,city,state")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function addressText(a) {
  return `${a.street || "Rua não informada"}, ${a.number || "s/n"}${
    a.complement ? ` — ${a.complement}` : ""
  } — ${a.neighborhood || ""} — ${a.city || ""}/${a.state || ""} — CEP ${
    a.cep || ""
  }`;
}

async function renderCheckout(user) {
  const { subtotal, total } = getTotals();
  if ($("#checkoutStatus")) {
    $("#checkoutStatus").textContent = `Pedido de ${
      user.user_metadata?.full_name || user.email
    }`;
  }
  if ($("#checkoutItems")) {
    $("#checkoutItems").innerHTML = cart
      .map((i) => {
        const p = productById(i.id);
        return `
          <div class="checkout-line">
            <span>${p.name} — ${i.size || "Único"} × ${i.qty}</span>
            <strong>${money(p.price * i.qty)}</strong>
          </div>
        `;
      })
      .join("");
  }
  if ($("#checkoutSubtotal")) {
    $("#checkoutSubtotal").textContent = money(subtotal);
  }
  if ($("#checkoutTotal")) {
    $("#checkoutTotal").textContent = money(total);
  }
  try {
    const a = await getAddress(user);
    if ($("#checkoutAddress")) {
      $("#checkoutAddress").innerHTML = a
        ? addressText(a)
        : `<span class="warning-text">Cadastre um endereço para continuar.</span>`;
    }
  } catch (e) {
    if ($("#checkoutAddress")) {
      $("#checkoutAddress").textContent =
        "Não foi possível carregar o endereço.";
    }
  }
}

if ($("#checkoutBtn")) {
  $("#checkoutBtn").addEventListener("click", async () => {
    if (!cart.length) {
      toast("Adicione um produto primeiro.");
      return;
    }
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
      toast("Entre na sua conta para finalizar o pedido.");
      openAuth();
      return;
    }
    openModal("#checkoutModal");
    renderCheckout(data.session.user);
  });
}

async function createOrder(user, payment) {
  const { subtotal, total } = getTotals();
  const a = await getAddress(user);
  if (!a) {
    throw new Error("Cadastre seu endereço antes de finalizar.");
  }
  const { data: order, error } = await supabaseClient
    .from("orders")
    .insert({
      user_id: user.id,
      address_id: a.id,
      status: "received",
      subtotal,
      shipping: SHIPPING_FEE,
      total,
      payment_method: payment,
      whatsapp_sent: true
    })
    .select()
    .single();
  if (error) throw error;

  const rows = cart.map((i) => {
    const p = productById(i.id);
    return {
      order_id: order.id,
      product_id: p.id,
      product_name: p.name,
      quantity: i.qty,
      unit_price: p.price,
      size: i.size || "Único"
    };
  });

  const { error: itemError } = await supabaseClient
    .from("order_items")
    .insert(rows);
  if (itemError) {
    console.warn("Pedido criado, mas itens não foram registrados:", itemError);
  }
  return { order, address: a, subtotal, total };
}

if ($("#whatsappCheckoutBtn")) {
  $("#whatsappCheckoutBtn").addEventListener("click", async () => {
    if (!cart.length) {
      toast("Seu carrinho está vazio.");
      return;
    }
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
      openAuth();
      return;
    }
    const payment =
      document.querySelector('input[name="paymentMethod"]:checked')?.value ||
      "Pix";
    try {
      const { order, address, subtotal, total } = await createOrder(
        data.session.user,
        payment
      );
      const name =
        data.session.user.user_metadata?.full_name ||
        data.session.user.email ||
        "Cliente";
      const lines = cart
        .map((i) => {
          const p = productById(i.id);
          return `• ${p.name} — ${i.size || "Único"} — ${i.qty}x — ${money(
            p.price * i.qty
          )}`;
        })
        .join("\n");
      const msg = [
        "Olá! Gostaria de finalizar um pedido na JMG STORE.",
        "",
        `*Pedido:* #${order.id}`,
        `*Cliente:* ${name}`,
        `*E-mail:* ${data.session.user.email || ""}`,
        "",
        "*Produtos:*",
        lines,
        "",
        `*Subtotal:* ${money(subtotal)}`,
        `*Frete:* ${money(SHIPPING_FEE)}`,
        `*Total:* ${money(total)}`,
        `*Pagamento:* ${payment}`,
        "",
        `*Endereço:* ${addressText(address)}`
      ].join("\n");
      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener,noreferrer"
      );
      cart = [];
      saveCart();
      closeModal();
      toast("Pedido enviado para o WhatsApp!");
    } catch (e) {
      console.error(e);
      toast(e.message || "Não foi possível finalizar o pedido.");
    }
  });
}

if ($("#editAddressBtn")) {
  $("#editAddressBtn").addEventListener("click", () => {
    closeModal();
    openEditAccount();
  });
}

const authForm = $("#authForm");
const authTitle = $("#authTitle");
const authSubmit = $("#authSubmit");
const toggleAuth = $("#toggleAuth");
const registerFields = $("#registerFields");
const authMessage = $("#authMessage");
const logoutBtn = $("#logoutBtn");
const forgotPasswordBtn = $("#forgotPasswordBtn");
const backToLoginBtn = $("#backToLoginBtn");
const cepInput = $("#cep");
const addressPreview = $("#addressPreview");
const fullNameInput = $("#fullName");
const phoneInput = $("#phone");
const addressNumberInput = $("#addressNumber");
const complementInput = $("#complement");
const authEmailInput = $("#authEmail");
const authPasswordInput = $("#authPassword");

function configureRegisterFields(enabled) {
  const fields = [fullNameInput, phoneInput, cepInput, addressNumberInput];

  fields.forEach((field) => {
    if (!field) return;
    field.required = !!enabled;
    field.disabled = !enabled;
    if (!enabled) {
      field.removeAttribute("required");
    }
  });

  if (complementInput) {
    complementInput.disabled = !enabled;
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const register = mode === "register";
  const edit = mode === "edit";
  const showRegister = register || edit;

  if (edit) {
    authTitle.textContent = "Editar cadastro";
    authSubmit.textContent = "Salvar alterações";
  } else {
    authTitle.textContent = register ? "Criar minha conta" : "Entrar";
    authSubmit.textContent = register ? "Criar conta" : "Entrar";
  }

  registerFields.classList.toggle("hidden", !showRegister);

  if (edit) {
    toggleAuth.classList.add("hidden");
    forgotPasswordBtn.classList.add("hidden");
    backToLoginBtn.classList.remove("hidden");
    backToLoginBtn.textContent = "Voltar para minha conta";
  } else {
    toggleAuth.classList.remove("hidden");
    toggleAuth.textContent = register
      ? "Já tenho uma conta"
      : "Ainda não tenho conta";
    forgotPasswordBtn.classList.toggle("hidden", register);
    backToLoginBtn.classList.add("hidden");
    backToLoginBtn.textContent = "Voltar para entrar";
  }

  authMessage.textContent = "";

  const passwordLabel = authPasswordInput?.closest("label");

  if (edit) {
    authPasswordInput.required = false;
    authPasswordInput.removeAttribute("required");
    authPasswordInput.value = "";
    if (passwordLabel) passwordLabel.classList.add("hidden");
    if (authEmailInput) {
      authEmailInput.readOnly = true;
      authEmailInput.style.opacity = "0.7";
    }
  } else {
    authPasswordInput.autocomplete = register
      ? "new-password"
      : "current-password";
    authPasswordInput.type = "password";
    authPasswordInput.required = true;
    if (passwordLabel) passwordLabel.classList.remove("hidden");
    if (authEmailInput) {
      authEmailInput.readOnly = false;
      authEmailInput.style.opacity = "";
    }
  }

  if (authForm) {
    authForm.noValidate = !showRegister;
  }

  configureRegisterFields(showRegister);
}

function setForgotMode() {
  authMode = "forgot";
  authTitle.textContent = "Recuperar senha";
  authMessage.textContent = "Digite seu e-mail para receber o link.";
  registerFields.classList.add("hidden");
  toggleAuth.classList.add("hidden");
  forgotPasswordBtn.classList.add("hidden");
  backToLoginBtn.classList.remove("hidden");
  backToLoginBtn.textContent = "Voltar para entrar";
  authSubmit.textContent = "Enviar link";
  authPasswordInput.required = false;
  authPasswordInput.removeAttribute("required");
  authPasswordInput.value = "";
  const passwordLabel = authPasswordInput?.closest("label");
  if (passwordLabel) passwordLabel.classList.add("hidden");
  if (authEmailInput) {
    authEmailInput.readOnly = false;
    authEmailInput.style.opacity = "";
  }
  if (authForm) authForm.noValidate = true;
  configureRegisterFields(false);
}

function setResetMode() {
  authMode = "reset";
  authTitle.textContent = "Redefinir senha";
  authMessage.textContent = "Digite sua nova senha.";
  registerFields.classList.add("hidden");
  toggleAuth.classList.add("hidden");
  forgotPasswordBtn.classList.add("hidden");
  backToLoginBtn.classList.remove("hidden");
  backToLoginBtn.textContent = "Voltar para entrar";
  authSubmit.textContent = "Salvar nova senha";
  authPasswordInput.type = "password";
  authPasswordInput.required = true;
  authPasswordInput.value = "";
  authPasswordInput.placeholder = "Nova senha (mínimo 6 caracteres)";
  const passwordLabel = authPasswordInput?.closest("label");
  if (passwordLabel) passwordLabel.classList.remove("hidden");
  if (authEmailInput) {
    authEmailInput.readOnly = false;
    authEmailInput.style.opacity = "";
  }
  if (authForm) authForm.noValidate = true;
  configureRegisterFields(false);
}

async function openAuth() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await showAccount();
    return;
  }
  openModal("#loginModal");
  authForm.classList.remove("hidden");
  if (logoutBtn) logoutBtn.classList.add("hidden");
  setAuthMode("login");
}

async function openEditAccount() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    openAuth();
    return;
  }
  const user = data.session.user;
  openModal("#loginModal");
  authForm.classList.remove("hidden");
  if (logoutBtn) logoutBtn.classList.add("hidden");
  setAuthMode("edit");

  if (authEmailInput) authEmailInput.value = user.email || "";
  if (fullNameInput) {
    fullNameInput.value = user.user_metadata?.full_name || "";
  }
  if (phoneInput) {
    phoneInput.value = user.user_metadata?.phone || "";
  }

  try {
    const a = await getAddress(user);
    if (a) {
      if (cepInput) cepInput.value = formatCep(a.cep || "");
      if (addressNumberInput) addressNumberInput.value = a.number || "";
      if (complementInput) complementInput.value = a.complement || "";
      Object.assign(addressPreview.dataset, {
        street: a.street || "",
        neighborhood: a.neighborhood || "",
        city: a.city || "",
        state: a.state || ""
      });
      addressPreview.textContent = `${a.street || "Rua não informada"} — ${
        a.neighborhood || ""
      } — ${a.city || ""}/${a.state || ""}`;
    } else {
      if (cepInput) cepInput.value = "";
      if (addressNumberInput) addressNumberInput.value = "";
      if (complementInput) complementInput.value = "";
      addressPreview.textContent = "";
      delete addressPreview.dataset.street;
    }
  } catch (e) {
    console.warn("Não foi possível carregar endereço para edição:", e);
  }
}

function formatCep(v) {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

async function lookupCep() {
  const cep = cepInput.value.replace(/\D/g, "");
  if (cep.length !== 8) {
    addressPreview.textContent = "";
    delete addressPreview.dataset.street;
    return;
  }
  addressPreview.textContent = "Buscando endereço...";
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) throw new Error("CEP não encontrado.");
    Object.assign(addressPreview.dataset, {
      street: d.logradouro || "",
      neighborhood: d.bairro || "",
      city: d.localidade || "",
      state: d.uf || ""
    });
    addressPreview.textContent = `${d.logradouro || "Rua não informada"} — ${
      d.bairro || ""
    } — ${d.localidade || ""}/${d.uf || ""}`;
  } catch (e) {
    addressPreview.textContent =
      e.message || "Não foi possível consultar o CEP.";
    delete addressPreview.dataset.street;
  }
}

if (cepInput) {
  cepInput.addEventListener("input", () => {
    cepInput.value = formatCep(cepInput.value);
    clearTimeout(cepTimer);
    cepTimer = setTimeout(lookupCep, 350);
  });
}

if (toggleAuth) {
  toggleAuth.addEventListener("click", () =>
    setAuthMode(authMode === "login" ? "register" : "login")
  );
}

if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", setForgotMode);
}

if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", async () => {
    if (authMode === "edit") {
      closeModal();
      await showAccount();
      return;
    }
    authForm.classList.remove("hidden");
    setAuthMode("login");
  });
}

async function saveCustomer(user, d) {
  const { error: p } = await supabaseClient.from("profiles").upsert(
    {
      id: user.id,
      full_name: d.fullName,
      email: user.email || "",
      phone: d.phone
    },
    { onConflict: "id" }
  );
  if (p) throw p;

  const a = await getAddress(user);
  if (a) {
    const { error } = await supabaseClient
      .from("addresses")
      .update({
        cep: d.cep,
        street: d.street,
        number: d.number,
        complement: d.complement || null,
        neighborhood: d.neighborhood,
        city: d.city,
        state: d.state
      })
      .eq("id", a.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseClient.from("addresses").insert({
      user_id: user.id,
      cep: d.cep,
      street: d.street,
      number: d.number,
      complement: d.complement || null,
      neighborhood: d.neighborhood,
      city: d.city,
      state: d.state
    });
    if (error) throw error;
  }
}

if (authForm) {
  authForm.setAttribute("novalidate", "novalidate");

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authSubmit.disabled = true;
    authMessage.textContent = "";

    if (authMode !== "register" && authMode !== "edit") {
      configureRegisterFields(false);
    }

    try {
      const email = $("#authEmail").value.trim();
      const password = $("#authPassword").value;

      if (authMode === "forgot") {
        if (!email) throw new Error("Digite seu e-mail.");
        const { error } = await supabaseClient.auth.resetPasswordForEmail(
          email,
          { redirectTo: window.location.href.split("#")[0] }
        );
        if (error) throw error;
        authMessage.textContent =
          "Se o e-mail estiver cadastrado, o link foi enviado.";
        return;
      }

      if (authMode === "reset") {
        if (password.length < 6) {
          throw new Error(
            "A nova senha precisa ter pelo menos 6 caracteres."
          );
        }
        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) throw error;
        toast("Senha redefinida com sucesso!");
        setAuthMode("login");
        authMessage.textContent = "Senha alterada. Agora faça login.";
        return;
      }

      if (authMode === "login") {
        if (!email || !password) {
          throw new Error("Digite e-mail e senha.");
        }
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast("Login realizado!");
        closeModal();
        return;
      }

      const fullName = $("#fullName").value.trim();
      const phone = $("#phone").value.trim();
      const cep = cepInput.value.replace(/\D/g, "");
      const number = $("#addressNumber").value.trim();
      const complement = $("#complement").value.trim();

      if (!fullName || !phone || cep.length !== 8 || !number) {
        throw new Error("Preencha nome, telefone, CEP e número.");
      }

      if (!addressPreview.dataset.street) {
        await lookupCep();
      }

      if (!addressPreview.dataset.street) {
        throw new Error("Informe um CEP válido.");
      }

      const d = {
        fullName,
        phone,
        cep,
        number,
        complement,
        street: addressPreview.dataset.street,
        neighborhood: addressPreview.dataset.neighborhood,
        city: addressPreview.dataset.city,
        state: addressPreview.dataset.state
      };

      if (authMode === "edit") {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        const user = sessionData.session.user;
        const { error: metaError } = await supabaseClient.auth.updateUser({
          data: { full_name: fullName, phone }
        });
        if (metaError) throw metaError;
        await saveCustomer(user, d);
        toast("Cadastro atualizado com sucesso!");
        closeModal();
        await showAccount();
        return;
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone }
        }
      });
      if (error) throw error;

      if (data.session) {
        await saveCustomer(data.user, d);
        toast("Conta criada com sucesso!");
        closeModal();
      } else {
        toast("Conta criada. Faça login quando estiver liberada.");
        setAuthMode("login");
      }
    } catch (err) {
      console.error("Erro de autenticação:", err);
      authMessage.textContent = err.message || "Não foi possível concluir.";
    } finally {
      authSubmit.disabled = false;
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    toast("Você saiu da conta.");
    closeModal();
  });
}

const loginBtn = $("#loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", openAuth);
}

async function showAccount() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    openAuth();
    return;
  }
  openModal("#accountModal");
  const user = data.session.user;
  const a = await getAddress(user);
  const content = $("#accountContent");
  if (!content) return;

  content.innerHTML = `
    <div class="account-card">
      <strong>${user.user_metadata?.full_name || "Cliente"}</strong>
      <span>${user.email || ""}</span>
      <span>${user.user_metadata?.phone || ""}</span>
      ${a ? `<p>${addressText(a)}</p>` : `<p>Endereço não cadastrado.</p>`}
      <div class="account-actions">
        <button class="btn btn-outline" id="editAccountBtn" type="button">
          Editar cadastro/endereço
        </button>
        <button class="btn btn-outline" id="myOrdersBtn" type="button">
          Meus pedidos
        </button>
        <button class="btn btn-outline" id="accountLogoutBtn" type="button">
          Sair da conta
        </button>
      </div>
    </div>
  `;

  const editBtn = $("#editAccountBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      closeModal();
      openEditAccount();
    });
  }

  const ordersBtn = $("#myOrdersBtn");
  if (ordersBtn) {
    ordersBtn.addEventListener("click", () => loadOrders());
  }

  const accountLogout = $("#accountLogoutBtn");
  if (accountLogout) {
    accountLogout.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      toast("Você saiu da conta.");
      closeModal();
    });
  }
}

async function loadOrders() {
  const { data: userData } = await supabaseClient.auth.getUser();
  if (!userData.user) return;
  openModal("#ordersModal");
  const content = $("#ordersContent");
  if (!content) return;
  content.innerHTML = "Carregando...";

  const { data, error } = await supabaseClient
    .from("orders")
    .select(
      "id,status,subtotal,shipping,total,payment_method,created_at,order_items(product_name,quantity,unit_price,size)"
    )
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    content.textContent = "Não foi possível carregar seus pedidos.";
    return;
  }

  if (!data?.length) {
    content.innerHTML = `
      <div class="empty-state">
        Você ainda não fez pedidos.
      </div>
    `;
    return;
  }

  content.innerHTML = data
    .map(
      (o) => `
        <div class="order-card">
          <div>
            <strong>Pedido #${o.id}</strong>
            <span>${new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
          <span class="status-pill">${orderStatusLabel(o.status)}</span>
          <div>
            ${(o.order_items || [])
              .map(
                (i) => `
                  <p>
                    ${i.product_name} — ${i.size || "Único"} × ${i.quantity}
                  </p>
                `
              )
              .join("")}
          </div>
          <strong>${money(o.total)}</strong>
        </div>
      `
    )
    .join("");
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    openModal("#loginModal");
    setResetMode();
  }
});

const favoriteCount = $("#favoriteCount");
if (favoriteCount) {
  favoriteCount.textContent = favorites.size;
}

saveCart();
loadProducts();