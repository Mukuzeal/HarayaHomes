// Seller dashboard client-side features: products CRUD (localStorage), search/filter, cart, checkout, orders, payments, ratings.

document.addEventListener('DOMContentLoaded', () => {

	const dropdowns = document.querySelectorAll('.dropdown-btn');
      dropdowns.forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          const container = btn.nextElementSibling;
          if (!container) return;
          if (container.style.maxHeight) container.style.maxHeight = null;
          else container.style.maxHeight = container.scrollHeight + "px";
        });
      });
	// Simple sample catalog (persisted to localStorage)
	const PROD_KEY = 'sd_products_v1';
	const CART_KEY = 'sd_cart_v1';
	const ORDERS_KEY = 'sd_orders_v1';

	const sample = [
		{ id: 'p1', name: 'Electric Kettle', category: 'Kitchen Appliances', price: 1250.00, stock: 12, status: 'active', description: '1.7L electric kettle, stainless steel.' },
		{ id: 'p2', name: 'Dining Table', category: 'Furniture & Decor', price: 8990.00, stock: 4, status: 'active', description: 'Solid wood dining table, seats 6.' },
		{ id: 'p3', name: 'Pruning Shears', category: 'Gardening Tools', price: 299.00, stock: 30, status: 'active', description: 'High-carbon steel pruning shears.' },
		{ id: 'p4', name: 'Patio Set', category: 'Outdoor Living', price: 15999.00, stock: 2, status: 'active', description: '4-piece outdoor patio furniture set.' },
		{ id: 'p5', name: 'Cordless Drill', category: 'Home Improvement Tools', price: 3499.00, stock: 6, status: 'active', description: '18V cordless drill kit with battery.' },
		{ id: 'p6', name: 'Towel Set', category: 'Bedding & Bath', price: 799.00, stock: 20, status: 'active', description: '6-piece cotton towel set.' }
	];

	function loadProducts(){
		const raw = localStorage.getItem(PROD_KEY);
		if(!raw){ localStorage.setItem(PROD_KEY, JSON.stringify(sample)); return sample.slice(); }
		return JSON.parse(raw);
	}
	function saveProducts(list){ localStorage.setItem(PROD_KEY, JSON.stringify(list)); renderProducts(list); }
	function getCart(){ return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
	function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartBadge(); }

	// Render products table if exists
	function renderProducts(list){
		const tbody = document.getElementById('products-table-body');
		if(!tbody) return;
		tbody.innerHTML = '';
		if(!list || list.length===0){
			tbody.innerHTML = '<tr><td colspan="6" class="small">No products</td></tr>'; return;
		}
		list.forEach(p=> {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>${escapeHtml(p.name)}</td>
				<td>${escapeHtml(p.category || '')}</td>
				<td>₱ ${p.price.toFixed(2)}</td>
				<td>${p.stock}</td>
				<td>${escapeHtml(p.status || 'active')}</td>
				<td>
					<button class="icon-btn edit" data-id="${p.id}" title="Edit"><i class="fa fa-pen"></i></button>
					<button class="icon-btn archive" data-id="${p.id}" title="Archive"><i class="fa fa-box-archive"></i></button>
					<button class="icon-btn delete" data-id="${p.id}" title="Delete"><i class="fa fa-trash"></i></button>
					<button class="btn add-to-cart" data-id="${p.id}">Add to cart</button>
				</td>
			`;
			tbody.appendChild(tr);
		});
		// Attach events
		document.querySelectorAll('.edit').forEach(b=> b.addEventListener('click', onEditClick));
		document.querySelectorAll('.delete').forEach(b=> b.addEventListener('click', onDeleteClick));
		document.querySelectorAll('.archive').forEach(b=> b.addEventListener('click', onArchiveClick));
		document.querySelectorAll('.add-to-cart').forEach(b=> b.addEventListener('click', onAddToCartClick));
	}

	// Helpers
	function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

	// Search/filter
	document.getElementById('apply-product-filters')?.addEventListener('click', ()=>{
		const products = loadProducts();
		const q = (document.getElementById('search-products')?.value || '').toLowerCase().trim();
		const cat = (document.getElementById('filter-category')?.value || '');
		let result = products;
		if(cat) result = result.filter(p=> p.category === cat);
		if(q) result = result.filter(p=> p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
		renderProducts(result);
	});

	// Modal helpers
	function openModal(id){ document.getElementById(id).style.display = 'flex'; }
	function closeModal(id){ document.getElementById(id).style.display = 'none'; }

	// Add product modal open
	document.getElementById('open-add-product')?.addEventListener('click', ()=>{
		document.getElementById('modal-product-title').textContent = 'Add Product';
		document.getElementById('modal-product-id').value = '';
		document.getElementById('modal-product-form').reset();
		openModal('modal-product');
	});

	// Save product from modal
	document.getElementById('modal-product-form')?.addEventListener('submit', function(ev){
		ev.preventDefault();
		const id = document.getElementById('modal-product-id').value || 'p' + Date.now();
		const name = document.getElementById('modal-product-name').value.trim();
		const category = document.getElementById('modal-product-category').value.trim();
		const desc = document.getElementById('modal-product-desc').value.trim();
		const price = parseFloat(document.getElementById('modal-product-price').value) || 0;
		const stock = parseInt(document.getElementById('modal-product-stock').value) || 0;
		let products = loadProducts();
		const existing = products.find(p=> p.id === id);
		if(existing){
			existing.name = name; existing.category = category; existing.description = desc; existing.price = price; existing.stock = stock;
		} else {
			products.push({ id, name, category, description: desc, price, stock, status: 'active' });
		}
		saveProducts(products);
		closeModal('modal-product');
	});

	document.getElementById('modal-product-cancel')?.addEventListener('click', ()=> closeModal('modal-product'));

	// Edit product click
	function onEditClick(e){
		const id = e.currentTarget.dataset.id;
		const products = loadProducts();
		const p = products.find(x=>x.id===id);
		if(!p) return alert('Product not found');
		document.getElementById('modal-product-title').textContent = 'Edit Product';
		document.getElementById('modal-product-id').value = p.id;
		document.getElementById('modal-product-name').value = p.name;
		document.getElementById('modal-product-category').value = p.category;
		document.getElementById('modal-product-desc').value = p.description || '';
		document.getElementById('modal-product-price').value = p.price;
		document.getElementById('modal-product-stock').value = p.stock;
		openModal('modal-product');
	}

	// Delete flow
	let pendingDeleteId = null;
	function onDeleteClick(e){
		pendingDeleteId = e.currentTarget.dataset.id;
		document.getElementById('modal-confirm-title').textContent = 'Delete product';
		document.getElementById('modal-confirm-body').textContent = 'Permanently delete this product? This action cannot be undone.';
		openModal('modal-confirm');
	}
	document.getElementById('modal-confirm-yes')?.addEventListener('click', ()=>{
		if(!pendingDeleteId) return closeModal('modal-confirm');
		let products = loadProducts();
		products = products.filter(p=> p.id !== pendingDeleteId);
		saveProducts(products);
		pendingDeleteId = null;
		closeModal('modal-confirm');
	});
	document.getElementById('modal-confirm-no')?.addEventListener('click', ()=> { pendingDeleteId = null; closeModal('modal-confirm'); });

	// Archive flow (mark status archived)
	function onArchiveClick(e){
		const id = e.currentTarget.dataset.id;
		pendingDeleteId = id;
		document.getElementById('modal-confirm-title').textContent = 'Archive product';
		document.getElementById('modal-confirm-body').textContent = 'Archive this product (will hide from buyers)?';
		openModal('modal-confirm');
		// override yes handler temporarily
		const yes = document.getElementById('modal-confirm-yes');
		const prev = yes.onclick;
		yes.onclick = function(){
			let products = loadProducts();
			const it = products.find(p=> p.id===id);
			if(it){ it.status = 'archived'; saveProducts(products); }
			closeModal('modal-confirm');
			yes.onclick = prev;
		};
	}

	// Add to cart
	function onAddToCartClick(e){
		const id = e.currentTarget.dataset.id;
		const products = loadProducts();
		const p = products.find(x=>x.id===id);
		if(!p) return alert('Product not found');
		const cart = getCart();
		const it = cart.find(x=>x.id===id);
		if(it) it.qty = Math.min(it.qty + 1, p.stock);
		else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
		saveCart(cart);
		alert('Added to cart');
	}
	function updateCartBadge(){
		const el = document.getElementById('cart-count');
		if(!el) return;
		const total = getCart().reduce((s,i)=> s + (i.qty||0),0);
		el.textContent = total;
	}

	// Orders / Checkout handling
	// Render cart page if present
	function renderCartIfPresent(){
		const tbody = document.getElementById('cart-items');
		if(!tbody) return;
		const cart = getCart();
		tbody.innerHTML = '';
		if(cart.length===0){ tbody.innerHTML = '<tr><td colspan="5" class="small">Your cart is empty</td></tr>'; return; }
		let total = 0;
		cart.forEach(it=>{
			const line = it.price * it.qty; total += line;
			const tr = document.createElement('tr');
			tr.innerHTML = `<td>${escapeHtml(it.name)}</td><td>₱ ${it.price.toFixed(2)}</td><td><input class="input cart-qty" data-id="${it.id}" type="number" min="1" value="${it.qty}" style="width:70px"></td><td>₱ ${line.toFixed(2)}</td><td><button class="btn btn-outline cart-remove" data-id="${it.id}">Remove</button></td>`;
			tbody.appendChild(tr);
		});
		document.getElementById('cart-total') && (document.getElementById('cart-total').textContent = `₱ ${total.toFixed(2)}`);
		// events
		document.querySelectorAll('.cart-remove').forEach(b=> b.addEventListener('click', (ev)=>{
			const id = ev.currentTarget.dataset.id;
			let c = getCart(); c = c.filter(x=> x.id !== id); saveCart(c); renderCartIfPresent();
		}));
		document.querySelectorAll('.cart-qty').forEach(inp=> inp.addEventListener('change', (ev)=>{
			const id = ev.currentTarget.dataset.id; const v = parseInt(ev.currentTarget.value) || 1;
			const c = getCart(); const it = c.find(x=> x.id===id); if(it){ it.qty = Math.max(1, v); saveCart(c); renderCartIfPresent(); }
		}));
	}
	// Checkout submit handler (if checkout form present)
	document.getElementById('checkout-form')?.addEventListener('submit', function(ev){
		ev.preventDefault();
		const name = document.getElementById('delivery-name').value.trim();
		const phone = document.getElementById('delivery-phone').value.trim();
		const address = document.getElementById('delivery-address').value.trim();
		const payment = document.querySelector('input[name="payment"]:checked') ? document.querySelector('input[name="payment"]:checked').value : 'cod';
		if(!name || !phone || !address) return alert('Please fill delivery info');
		const cart = getCart();
		if(cart.length===0) return alert('Cart empty');
		let orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
		const orderId = 'ORD' + Date.now();
		const total = cart.reduce((s,i)=> s + i.price*i.qty,0);
		const order = { id: orderId, items: cart, total, delivery:{name,phone,address}, payment, status: 'pending', created: new Date().toISOString() };
		orders.push(order);
		localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
		localStorage.removeItem(CART_KEY);
		updateCartBadge();
		// redirect to order confirmation page if route exists
		location.href = `/seller/order_confirmation?order_id=${encodeURIComponent(orderId)}`;
	});

	// Order confirmation page rendering
	function renderOrderConfirmationIfPresent(){
		const el = document.getElementById('order-id');
		if(!el) return;
		const params = new URLSearchParams(location.search);
		const id = params.get('order_id'); if(!id) return;
		const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
		const order = orders.find(o=> o.id === id);
		if(!order) return;
		document.getElementById('order-id').textContent = order.id;
		document.getElementById('order-total') && (document.getElementById('order-total').textContent = `₱ ${order.total.toFixed(2)}`);
		const ul = document.getElementById('order-items-list');
		if(ul){
			ul.innerHTML = '';
			order.items.forEach(it => ul.innerHTML += `<li>${escapeHtml(it.name)} x ${it.qty} — ₱ ${(it.price*it.qty).toFixed(2)}</li>`);
		}
		// wire pay-on-delivery button if present
		document.getElementById('pay-cod')?.addEventListener('click', ()=>{
			order.payment = 'cod';
			order.status = 'awaiting_delivery';
			localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
			alert('Payment set to Cash on Delivery. Order confirmed.');
		});
		document.getElementById('mark-received')?.addEventListener('click', ()=>{
			order.status = 'completed';
			localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
			alert('Order marked as received. Thank you!');
		});
		
	}


	// Order detail page actions (accept/update)
	document.getElementById('accept-order')?.addEventListener('click', ()=> openModal('modal-order-accept'));
	document.getElementById('confirm-accept')?.addEventListener('click', ()=>{
		alert('Order accepted and rider notified (simulated).');
		closeModal('modal-order-accept');
	});
	document.getElementById('cancel-accept')?.addEventListener('click', ()=> closeModal('modal-order-accept'));

	document.getElementById('save-status')?.addEventListener('click', ()=> openModal('modal-order-status'));
	document.getElementById('modal-status-save')?.addEventListener('click', ()=>{
		const newStatus = document.getElementById('modal-status-select').value;
		alert('Order status updated to: ' + newStatus + ' (simulated)');
		closeModal('modal-order-status');
	});
	document.getElementById('modal-status-cancel')?.addEventListener('click', ()=> closeModal('modal-order-status'));

	// Payments modal
	document.getElementById('mark-paid')?.addEventListener('click', ()=> {
		document.getElementById('modal-payment-body').textContent = 'Mark this transaction as paid?';
		openModal('modal-payment');
	});
	document.getElementById('modal-payment-yes')?.addEventListener('click', ()=>{
		alert('Payment marked as paid (simulated).');
		closeModal('modal-payment');
	});
	document.getElementById('modal-payment-no')?.addEventListener('click', ()=> closeModal('modal-payment'));

	// Orders helpers (load/save)
	function loadOrdersList(){ return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
	function saveOrdersList(list){ localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); }

	// Render orders table on /seller/orders
	function renderOrdersList(){
		const tbody = document.getElementById('orders-table-body');
		if(!tbody) return;
		const orders = loadOrdersList();
		tbody.innerHTML = '';
		if(!orders || orders.length === 0){
			tbody.innerHTML = '<tr><td colspan="7" class="small">No orders found</td></tr>';
			return;
		}
		orders.forEach(o => {
			const qty = (o.items || []).reduce((s,i)=> s + (i.qty||0), 0);
			const products = (o.items || []).map(i=> i.name).join(', ');
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td><a href="/seller/order_detail?order_id=${encodeURIComponent(o.id)}">${o.id}</a></td>
				<td>${escapeHtml(o.delivery?.name || '—')}</td>
				<td>${escapeHtml(products)}</td>
				<td>${qty}</td>
				<td>₱ ${Number(o.total||0).toFixed(2)}</td>
				<td>${escapeHtml(o.status || 'pending')}</td>
				<td>
					<button class="btn orders-accept" data-id="${o.id}">Accept</button>
					<button class="btn btn-outline orders-decline" data-id="${o.id}">Decline</button>
					<a class="btn btn-light" href="/seller/order_detail?order_id=${encodeURIComponent(o.id)}">View</a>
				</td>
			`;
			tbody.appendChild(tr);
		});
		// attach handlers
		document.querySelectorAll('.orders-accept').forEach(b=> b.addEventListener('click', onAcceptOrder));
		document.querySelectorAll('.orders-decline').forEach(b=> b.addEventListener('click', onDeclineOrder));
	}

	function onAcceptOrder(e){
		const id = e.currentTarget.dataset.id;
		let orders = loadOrdersList();
		const ord = orders.find(x=>x.id===id);
		if(!ord) { alert('Order not found'); return; }
		ord.status = 'confirmed';
		saveOrdersList(orders);
		renderOrdersList();
		alert('Order accepted (status updated).');
	}

	function onDeclineOrder(e){
		const id = e.currentTarget.dataset.id;
		let orders = loadOrdersList();
		const ord = orders.find(x=>x.id===id);
		if(!ord) { alert('Order not found'); return; }
		ord.status = 'declined';
		saveOrdersList(orders);
		renderOrdersList();
		alert('Order declined.');
	}

	// Init
	renderProducts(loadProducts());
	renderCartIfPresent();
	renderOrderConfirmationIfPresent();
	renderOrdersList(); // <-- render orders on the orders page
	updateCartBadge();	
});


