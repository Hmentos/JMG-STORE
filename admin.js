const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state = { user:null, profile:null, products:[], categories:[], orders:[], items:[], customers:[], addresses:[] };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const money = (v) => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc = (v='') => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast = (msg) => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),2600); };
const showMessage = (msg,type='success') => { const el=$('#message'); el.textContent=msg; el.className=`message show ${type}`; clearTimeout(window.__msg); window.__msg=setTimeout(()=>el.className='message',4500); };
const setLoading = (v) => $('#loading').classList.toggle('hidden',!v);

function openModal(id){ $('#'+id).classList.add('open'); }
function closeModal(id){ $('#'+id).classList.remove('open'); }
function categoryName(id){ return state.categories.find(c=>String(c.id)===String(id))?.name || 'Sem categoria'; }
function statusLabel(s){ return ({received:'Recebido',preparing:'Preparando',shipped:'Enviado',completed:'Concluído',cancelled:'Cancelado',recebido:'Recebido',preparando:'Preparando',enviado:'Enviado',concluído:'Concluído',cancelado:'Cancelado'})[s] || s || 'Recebido'; }
function statusClass(s){ return s==='completed'||s==='concluído'?'success':s==='cancelled'||s==='cancelado'?'danger':s==='shipped'||s==='enviado'?'warning':''; }
function fmtDate(d){ return d ? new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—'; }
function customerFor(id){ return state.customers.find(c=>c.id===id); }
function addressFor(id){ return state.addresses.find(a=>String(a.id)===String(id)); }

async function requireAdmin(){
  const {data:{session}} = await supabaseClient.auth.getSession();
  if(!session){ window.location.href='index.html'; return false; }
  state.user=session.user;
  const {data:profile,error} = await supabaseClient.from('profiles').select('id,full_name,email,phone,role').eq('id',session.user.id).single();
  if(error || !profile || profile.role!=='admin'){
    alert('Esta conta não tem acesso administrativo.');
    await supabaseClient.auth.signOut();
    window.location.href='index.html';
    return false;
  }
  state.profile=profile;
  $('#adminName').textContent=profile.full_name || 'Administrador';
  $('#adminEmailLabel').textContent=profile.email || session.user.email || '—';
  $('#adminAvatar').textContent=(profile.full_name||'A').trim().charAt(0).toUpperCase();
  return true;
}

async function loadAll(){
  setLoading(true);
  const [products,categories,orders,items,customers,addresses] = await Promise.all([
    supabaseClient.from('products').select('*').order('created_at',{ascending:false}),
    supabaseClient.from('categories').select('*').order('name'),
    supabaseClient.from('orders').select('*').order('created_at',{ascending:false}),
    supabaseClient.from('order_items').select('*').order('created_at'),
    supabaseClient.from('profiles').select('id,full_name,email,phone,role,created_at').order('created_at',{ascending:false}),
    supabaseClient.from('addresses').select('*').order('created_at',{ascending:false})
  ]);
  const firstError=[products,categories,orders,items,customers,addresses].find(x=>x.error);
  if(firstError){ console.error(firstError.error); showMessage('Não foi possível carregar todos os dados. Confira as políticas RLS do Supabase.','error'); }
  state.products=products.data||[]; state.categories=categories.data||[]; state.orders=orders.data||[]; state.items=items.data||[]; state.customers=customers.data||[]; state.addresses=addresses.data||[];
  renderAll(); setLoading(false);
}

function renderAll(){ renderDashboard(); renderProducts(); renderCategories(); renderOrders(); renderCustomers(); fillCategorySelect(); }
function renderDashboard(){
  $('#statProducts').textContent=state.products.length;
  $('#statActive').textContent=state.products.filter(p=>p.active).length;
  $('#statOrders').textContent=state.orders.length;
  $('#statCustomers').textContent=state.customers.length;
  const recent=state.orders.slice(0,5);
  $('#recentOrders').innerHTML=recent.length?recent.map(o=>{const c=customerFor(o.user_id);return `<div class="compact-item"><div><strong>Pedido #${esc(o.id)}</strong><small>${esc(c?.full_name||'Cliente')} · ${fmtDate(o.created_at)}</small></div><span class="badge ${statusClass(o.status)}">${esc(statusLabel(o.status))}</span></div>`}).join(''):'<div class="empty">Nenhum pedido ainda.</div>';
  const low=state.products.filter(p=>Number(p.stock)<=5).sort((a,b)=>a.stock-b.stock).slice(0,6);
  $('#lowStock').innerHTML=low.length?low.map(p=>`<div class="compact-item"><div><strong>${esc(p.name)}</strong><small>${esc(categoryName(p.category_id))}</small></div><span class="badge ${Number(p.stock)===0?'danger':'warning'}">${p.stock} un.</span></div>`).join(''):'<div class="empty">Nenhum produto com estoque baixo.</div>';
}

function renderProducts(){
  const q=($('#productSearch')?.value||'').toLowerCase(); const f=$('#productStatusFilter')?.value||'all';
  let arr=state.products.filter(p=>p.name.toLowerCase().includes(q));
  if(f==='active')arr=arr.filter(p=>p.active); if(f==='inactive')arr=arr.filter(p=>!p.active); if(f==='low')arr=arr.filter(p=>Number(p.stock)<=5);
  $('#productsTable').innerHTML=`<table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>${arr.length?arr.map(p=>`<tr><td><div class="product-cell">${p.image_url?`<img class="product-thumb" src="${esc(p.image_url)}" alt="">`:`<div class="product-thumb placeholder">${esc(p.icon||'👕')}</div>`}<div><strong>${esc(p.name)}</strong><small class="muted">${esc(p.tag||'')}</small></div></div></td><td>${esc(categoryName(p.category_id))}</td><td>${money(p.price)}</td><td><span class="badge ${Number(p.stock)<=5?'warning':''}">${p.stock}</span></td><td><span class="badge ${p.active?'success':'danger'}">${p.active?'Ativo':'Inativo'}</span></td><td><div class="actions"><button class="mini-btn" data-edit-product="${p.id}">Editar</button><button class="mini-btn" data-toggle-product="${p.id}">${p.active?'Desativar':'Ativar'}</button><button class="mini-btn danger" data-delete-product="${p.id}">Excluir</button></div></td></tr>`).join(''):`<tr><td colspan="6"><div class="empty">Nenhum produto encontrado.</div></td></tr>`}</tbody></table>`;
}

function fillCategorySelect(){ $('#productCategory').innerHTML=state.categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join(''); }
function renderCategories(){ $('#categoriesList').innerHTML=state.categories.length?state.categories.map(c=>`<div class="category-row"><strong>${esc(c.name)}</strong><div class="actions"><span class="muted">${state.products.filter(p=>String(p.category_id)===String(c.id)).length} produto(s)</span><button class="mini-btn danger" data-delete-category="${c.id}">Excluir</button></div></div>`).join(''):'<div class="empty">Nenhuma categoria cadastrada.</div>'; }

function renderOrders(){
  const q=($('#orderSearch')?.value||'').toLowerCase(); const f=$('#orderStatusFilter')?.value||'all';
  let arr=state.orders.filter(o=>{const c=customerFor(o.user_id);return `${o.id} ${o.status} ${c?.full_name||''} ${c?.email||''}`.toLowerCase().includes(q)});
  if(f!=='all')arr=arr.filter(o=>o.status===f);
  $('#ordersList').innerHTML=arr.length?arr.map(o=>{
    const c=customerFor(o.user_id),a=addressFor(o.address_id),items=state.items.filter(i=>String(i.order_id)===String(o.id));
    return `<article class="order-card"><div class="order-head"><div><div class="order-id">Pedido #${esc(o.id)}</div><div class="order-meta">${fmtDate(o.created_at)} · ${esc(c?.full_name||'Cliente')}</div></div><span class="badge ${statusClass(o.status)}">${esc(statusLabel(o.status))}</span></div><div class="order-body"><div class="order-block"><h4>Cliente</h4><p>${esc(c?.full_name||'—')}</p><p>${esc(c?.email||'—')}</p><p>${esc(c?.phone||'—')}</p></div><div class="order-block"><h4>Endereço</h4><p>${esc(a?.street||'—')}, ${esc(a?.number||'s/n')}</p><p>${esc(a?.neighborhood||'')} · ${esc(a?.city||'')} / ${esc(a?.state||'')}</p><p>CEP ${esc(a?.cep||'—')}</p></div><div class="order-block"><h4>Itens</h4><div class="order-items">${items.length?items.map(i=>`<div class="order-item">${esc(i.product_name)} · ${i.quantity}x ${i.size?`· ${esc(i.size)}`:''}</div>`).join(''):'<div class="order-item">Sem itens registrados</div>'}</div></div></div><div class="order-footer"><div><small class="muted">Pagamento: ${esc(o.payment_method||'Não informado')}</small><div class="order-total">${money(o.total)}</div></div><div class="actions"><select class="status-select" data-status-order="${o.id}">${['received','preparing','shipped','completed','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select><button class="mini-btn" data-view-order="${o.id}">Detalhes</button></div></div></article>`;
  }).join(''):'<div class="panel"><div class="empty">Nenhum pedido encontrado.</div></div>';
}

function renderCustomers(){
  const q=($('#customerSearch')?.value||'').toLowerCase(); const arr=state.customers.filter(c=>`${c.full_name||''} ${c.email||''} ${c.phone||''}`.toLowerCase().includes(q));
  $('#customersTable').innerHTML=`<table><thead><tr><th>Cliente</th><th>Contato</th><th>Cadastro</th><th>Acesso</th><th>Ação</th></tr></thead><tbody>${arr.length?arr.map(c=>`<tr><td><div class="customer-name">${esc(c.full_name||'Sem nome')}</div><small class="muted">${esc(c.id)}</small></td><td>${esc(c.email||'—')}<br><span class="muted">${esc(c.phone||'—')}</span></td><td>${fmtDate(c.created_at)}</td><td><span class="badge ${c.role==='admin'?'warning':''}">${c.role==='admin'?'Administrador':'Cliente'}</span></td><td><button class="mini-btn" data-role-customer="${c.id}" data-current-role="${esc(c.role||'customer')}">${c.role==='admin'?'Tornar cliente':'Tornar admin'}</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">Nenhum cliente encontrado.</div></td></tr>'}</tbody></table>`;
}

function clearProductForm(){ $('#productId').value=''; $('#productName').value=''; $('#productPrice').value=''; $('#productStock').value='0'; $('#productSizes').value=''; $('#productImage').value=''; $('#productTag').value=''; $('#productIcon').value='👕'; $('#productDescription').value=''; $('#productActive').checked=true; $('#productFeatured').checked=false; $('#productModalTitle').textContent='Novo produto'; updateImagePreview(); }
function editProduct(id){ const p=state.products.find(x=>String(x.id)===String(id)); if(!p)return; $('#productId').value=p.id;$('#productName').value=p.name||'';$('#productCategory').value=p.category_id||'';$('#productPrice').value=p.price||'';$('#productStock').value=p.stock??0;$('#productSizes').value=Array.isArray(p.sizes) ? p.sizes.join(',') : (typeof p.sizes === 'string' ? p.sizes.replace(/^[{]|[}]$/g,'').replace(/"/g,'') : '');$('#productImage').value=p.image_url||'';$('#productTag').value=p.tag||'';$('#productIcon').value=p.icon||'👕';$('#productDescription').value=p.description||'';$('#productActive').checked=!!p.active;$('#productFeatured').checked=!!p.featured;$('#productModalTitle').textContent='Editar produto';updateImagePreview();openModal('productModal'); }
function normalizeSizes(value){
  if(Array.isArray(value)) return value.map(v=>String(v).trim()).filter(Boolean);
  const text=String(value??'').trim();
  if(!text) return [];
  // Aceita P,M,G,GG, P, M, G, GG, ou {P,M,G,GG}.
  const clean=text.replace(/^\{/, '').replace(/\}$/, '').replace(/\"/g,'').trim();
  return clean.split(',').map(v=>v.trim()).filter(Boolean);
}

function updateImagePreview(){ const url=$('#productImage').value.trim(); $('#imagePreview').innerHTML=url?`<img src="${esc(url)}" alt="Prévia" onerror="this.parentElement.innerHTML='<span>Não foi possível carregar a imagem</span>'">`:'<span>Prévia da imagem</span>'; }

async function saveProduct(e){
  e.preventDefault();
  const id=$('#productId').value.trim();
  const price=Number(String($('#productPrice').value).replace(',','.'));
  const stock=Number($('#productStock').value);
  if(!Number.isFinite(price)||price<0) return showMessage('Digite um preço válido.','error');
  if(!Number.isInteger(stock)||stock<0) return showMessage('Digite um estoque válido.','error');
  const payload={
    name:$('#productName').value.trim(),
    category_id:$('#productCategory').value?Number($('#productCategory').value):null,
    price, stock,
    sizes: normalizeSizes($('#productSizes').value),
    image_url:$('#productImage').value.trim()||null,
    tag:$('#productTag').value.trim()||null,
    icon:$('#productIcon').value.trim()||null,
    description:$('#productDescription').value.trim()||null,
    active:$('#productActive').checked,
    featured:$('#productFeatured').checked
  };
  let res;
  if(id){
    // Não usamos .select().single() no UPDATE: com algumas configurações de RLS
    // o Supabase aplica a alteração, mas não devolve a linha atualizada.
    res=await supabaseClient.from('products').update(payload).eq('id',id);
  }else{
    res=await supabaseClient.from('products').insert(payload).select('*').single();
  }
  if(res.error){
    console.error('SUPABASE SAVE PRODUCT:',res.error);
    showMessage(`Não foi possível salvar. ${res.error.message}${res.error.code?` (código ${res.error.code})`:''}`,'error');
    return;
  }
  if(id){
    // Recarrega os produtos para mostrar exatamente o que ficou salvo no banco.
    await loadAll();
  }else{
    if(!res.data){ showMessage('O Supabase não confirmou a criação do produto.','error'); return; }
    state.products.unshift(res.data);
    renderAll();
  }
  toast(id?'Produto atualizado com sucesso!':'Produto criado com sucesso!');
  closeModal('productModal');
}
async function toggleProduct(id){
  const p=state.products.find(x=>String(x.id)===String(id));
  if(!p)return;
  const next=!p.active;

  // Importante: não usamos .select().single() aqui. O PGRST116 acontece quando
  // o UPDATE é permitido, mas o PostgREST não devolve a linha atualizada por causa
  // das políticas de RLS. Para alterar o status, só precisamos do resultado do UPDATE.
  const res=await supabaseClient.from('products').update({active:next}).eq('id',id);
  if(res.error){
    console.error('SUPABASE TOGGLE PRODUCT:',res.error);
    return showMessage(`Não foi possível alterar o status. ${res.error.message}${res.error.code?` (código ${res.error.code})`:''}`,'error');
  }

  // Atualiza a tela imediatamente e depois sincroniza com o banco.
  p.active=next;
  renderAll();
  toast(next?'Produto ativado!':'Produto desativado!');

  // Se a leitura encontrar o produto, mantém a tela sincronizada com o banco.
  await loadAll();
}
async function deleteProduct(id){const p=state.products.find(x=>String(x.id)===String(id));if(!p||!confirm(`Excluir "${p.name}"?`))return;const {error}=await supabaseClient.from('products').delete().eq('id',id);if(error){showMessage('Não foi possível excluir. Se o produto já estiver em pedidos, mantenha-o inativo.','error');return;}toast('Produto excluído.');await loadAll();}

async function addCategory(e){e.preventDefault();const name=$('#categoryName').value.trim();if(!name)return;const {error}=await supabaseClient.from('categories').insert({name});if(error){showMessage('Erro ao criar categoria: '+error.message,'error');return;}$('#categoryName').value='';toast('Categoria adicionada.');await loadAll();}
async function deleteCategory(id){const c=state.categories.find(x=>String(x.id)===String(id));if(!c)return;if(state.products.some(p=>String(p.category_id)===String(id))){showMessage('Essa categoria possui produtos. Mova os produtos para outra categoria antes de excluir.','error');return;}if(!confirm(`Excluir a categoria "${c.name}"?`))return;const {error}=await supabaseClient.from('categories').delete().eq('id',id);if(error){showMessage('Erro ao excluir categoria: '+error.message,'error');return;}toast('Categoria excluída.');await loadAll();}

async function updateOrderStatus(id,status){
  const order=state.orders.find(o=>String(o.id)===String(id));
  if(!order)return;
  const previous=order.status;
  const {data,error}=await supabaseClient
    .from('orders')
    .update({status,updated_at:new Date().toISOString()})
    .eq('id',id)
    .select('id,status,updated_at')
    .maybeSingle();

  if(error){
    console.error('SUPABASE UPDATE ORDER STATUS:',error);
    showMessage(`Erro ao atualizar pedido: ${error.message}${error.code?` (código ${error.code})`:''}`,'error');
    renderOrders();
    return;
  }

  // Se o UPDATE não encontrou/alterou a linha, o PostgREST pode retornar data null sem erro.
  if(!data){
    console.error('UPDATE DO PEDIDO NÃO ALTEROU NENHUMA LINHA',{id,status,previous});
    showMessage('O status não foi salvo. Verifique a política de administrador da tabela orders no Supabase.','error');
    renderOrders();
    return;
  }

  order.status=data.status;
  order.updated_at=data.updated_at;
  renderOrders();
  toast('Status do pedido atualizado.');
} // updateOrderStatus

function viewOrder(id){const o=state.orders.find(x=>String(x.id)===String(id));if(!o)return;const c=customerFor(o.user_id),a=addressFor(o.address_id),items=state.items.filter(i=>String(i.order_id)===String(id));$('#orderDetails').innerHTML=`<span class="eyebrow">Pedido #${esc(o.id)}</span><h2>Detalhes do pedido</h2><div class="order-body"><div class="order-block"><h4>Cliente</h4><p>${esc(c?.full_name||'—')}</p><p>${esc(c?.email||'—')}</p><p>${esc(c?.phone||'—')}</p></div><div class="order-block"><h4>Endereço</h4><p>${esc(a?.street||'—')}, ${esc(a?.number||'s/n')}</p><p>${esc(a?.complement||'')}</p><p>${esc(a?.neighborhood||'')} · ${esc(a?.city||'')} / ${esc(a?.state||'')}</p><p>CEP ${esc(a?.cep||'—')}</p></div><div class="order-block"><h4>Resumo</h4><p>Pagamento: ${esc(o.payment_method||'—')}</p><p>Subtotal: ${money(o.subtotal)}</p><p>Frete: ${money(o.shipping)}</p><p><strong>Total: ${money(o.total)}</strong></p></div></div><h3 style="margin-top:22px">Itens</h3><div class="order-items">${items.map(i=>`<div class="order-item">${esc(i.product_name)} — ${i.quantity}x — ${money(i.unit_price)} ${i.size?`— tamanho ${esc(i.size)}`:''}</div>`).join('')||'<div class="empty">Nenhum item.</div>'}</div>`;openModal('orderModal');}

async function changeRole(id,current){const next=current==='admin'?'customer':'admin';if(id===state.user.id&&next!=='admin'){showMessage('Você não pode remover o acesso admin da própria conta por este painel.','error');return;}if(!confirm(`Alterar este usuário para ${next==='admin'?'administrador':'cliente'}?`))return;const {error}=await supabaseClient.from('profiles').update({role:next}).eq('id',id);if(error){showMessage('Erro ao alterar acesso: '+error.message,'error');return;}toast('Acesso atualizado.');await loadAll();}

function showSection(name){$$('.side-link').forEach(b=>b.classList.toggle('active',b.dataset.section===name));$$('.page-section').forEach(s=>s.classList.remove('active'));$('#section-'+name).classList.add('active');window.scrollTo({top:0,behavior:'smooth'});}

function bindEvents(){
  $$('.side-link').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.section)));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.go)));
  $('#refreshAll').addEventListener('click',loadAll); $('#newProductBtn').addEventListener('click',()=>{clearProductForm();openModal('productModal')});
  $('#productForm').addEventListener('submit',saveProduct); $('#categoryForm').addEventListener('submit',addCategory);
  $('#productImage').addEventListener('input',updateImagePreview); ['productSearch','productStatusFilter'].forEach(id=>$('#'+id).addEventListener('input',renderProducts));
  ['orderSearch','orderStatusFilter'].forEach(id=>$('#'+id).addEventListener('input',renderOrders)); $('#customerSearch').addEventListener('input',renderCustomers);
  $('#logoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();window.location.href='index.html';});
  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-product]'); if(edit) return editProduct(edit.dataset.editProduct);
    const tog=e.target.closest('[data-toggle-product]'); if(tog) return toggleProduct(tog.dataset.toggleProduct);
    const del=e.target.closest('[data-delete-product]'); if(del) return deleteProduct(del.dataset.deleteProduct);
    const dc=e.target.closest('[data-delete-category]'); if(dc) return deleteCategory(dc.dataset.deleteCategory);
    const vr=e.target.closest('[data-view-order]'); if(vr) return viewOrder(vr.dataset.viewOrder);
    const role=e.target.closest('[data-role-customer]'); if(role) return changeRole(role.dataset.roleCustomer,role.dataset.currentRole);
    const close=e.target.closest('[data-close]'); if(close)return closeModal(close.dataset.close);
  });
  document.addEventListener('change',e=>{const s=e.target.closest('[data-status-order]');if(s)updateOrderStatus(s.dataset.statusOrder,s.value);});
}

(async()=>{try{if(await requireAdmin()){bindEvents();await loadAll();}}finally{setLoading(false);}})();
