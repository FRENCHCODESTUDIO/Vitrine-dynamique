const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let catActuelle = 'Tous';
let reduction = 0;

async function init() {
    updateNavbar();
    await charger();
    renderCart();
}

async function charger() {
    tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
    renderCats();
    filtrerEtTrier();
}

function filtrerEtTrier() {
    const q = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;
    let res = tousLesProduits.filter(p => p.nom.toLowerCase().includes(q) && (catActuelle === 'Tous' || p.categorie === catActuelle));
    
    if (tri === 'prix-asc') res.sort((a,b) => a.prix - b.prix);
    if (tri === 'prix-desc') res.sort((a,b) => b.prix - a.prix);

    document.getElementById('vitrine').innerHTML = res.map(p => `
        <div class="card">
            <div style="height:180px; display:flex; align-items:center; justify-content:center; background:#111827;">
                <img src="${p.photo ? pb.files.getUrl(p, p.photo) : ''}" style="max-height:90%;">
            </div>
            <div style="padding:15px;">
                <small>${p.categorie}</small>
                <h3>${p.nom}</h3>
                <p style="color:#4ade80; font-weight:bold;">${p.prix} €</p>
                <button class="btn-buy" onclick="add('${p.id}','${p.nom.replace(/'/g," ")}',${p.prix})" ${p.stock <=0 ? 'disabled':''}>
                    ${p.stock <=0 ? 'Rupture' : 'Ajouter'}
                </button>
            </div>
        </div>`).join('');
}

function add(id, nom, prix) {
    panier.push({id, nom, prix});
    localStorage.setItem('monPanier', JSON.stringify(panier));
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-items');
    let brut = 0;
    list.innerHTML = panier.map((item, i) => {
        brut += item.prix;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>${item.nom}</span>
                <span>${item.prix}€ <button onclick="remove(${i})" style="color:red; background:none; border:none; cursor:pointer;">X</button></span>
                </div>`;
    }).join('');

    const net = brut * (1 - reduction / 100);
    document.getElementById('cart-total').innerHTML = reduction > 0 ? `<s>${brut}€</s> <span style="color:#fbbf24">${net.toFixed(2)}€</span>` : `${brut}€`;
    document.getElementById('cart-count').innerText = panier.length;
}

function remove(i) {
    panier.splice(i, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    renderCart();
}

async function appliquerPromo() {
    const code = document.getElementById('promo-input').value.trim().toUpperCase();
    try {
        const p = await pb.collection('promos').getFirstListItem(`code="${code}" && actif=true`);
        reduction = p.reduction;
        document.getElementById('promo-msg').innerHTML = `<span style="color:#4ade80">✅ -${reduction}%</span>`;
    } catch (e) {
        reduction = 0;
        document.getElementById('promo-msg').innerHTML = `<span style="color:red">❌ Invalide</span>`;
    }
    renderCart();
}

async function validerCommande() {
    if(!pb.authStore.isValid) return window.location.href="login.html";
    if(panier.length === 0) return;
    const total = document.getElementById('cart-total').innerText.split('€')[0];
    await pb.collection('commandes').create({ client: pb.authStore.model.id, produits: panier.map(i=>i.nom).join(', '), total: parseFloat(total) });
    for(let i of panier) {
        const p = await pb.collection('produits').getOne(i.id);
        await pb.collection('produits').update(i.id, {stock: p.stock - 1});
    }
    panier = []; localStorage.removeItem('monPanier');
    window.location.href = "paiement.html";
}

function updateNavbar() {
    const menu = document.getElementById('user-menu');
    if(pb.authStore.isValid) {
        menu.innerHTML = `
            <span>👋 ${pb.authStore.model.name || 'User'}</span>
            <a href="admin.html" style="margin-left:10px; color:#fbbf24;">Gérer</a>
            <a href="profil.html" style="margin-left:10px; color:#3b82f6;">Commandes</a>
            <button onclick="pb.authStore.clear(); location.reload();" style="color:red; background:none; border:none; cursor:pointer;">X</button>
        `;
    } else {
        menu.innerHTML = `<a href="login.html" style="color:#3b82f6; text-decoration:none;">Connexion</a>`;
    }
}

function renderCats() {
    const cats = ['Tous', ...new Set(tousLesProduits.map(p => p.categorie))];
    document.getElementById('category-bar').innerHTML = cats.map(c => `<button onclick="catActuelle='${c}'; renderCats(); filtrerEtTrier();" style="padding:5px 15px; border-radius:20px; border:none; background:${catActuelle===c?'#3b82f6':'#1e293b'}; color:white; cursor:pointer;">${c}</button>`).join('');
}

function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }

init();
