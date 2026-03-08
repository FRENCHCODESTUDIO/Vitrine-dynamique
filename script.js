const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let catChoisie = 'Tous';

async function init() {
    updateNavbar();
    await chargerProduits();
    updateCart();
}

async function chargerProduits() {
    tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
    genereCats();
    filtrerEtTrier();
}

function filtrerEtTrier() {
    const q = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;
    
    let res = tousLesProduits.filter(p => 
        p.nom.toLowerCase().includes(q) && (catChoisie === 'Tous' || p.categorie === catChoisie)
    );

    if (tri === 'prix-asc') res.sort((a,b) => a.prix - b.prix);
    if (tri === 'prix-desc') res.sort((a,b) => b.prix - a.prix);
    
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = res.map(p => `
        <div class="card">
            <div style="height:200px; background:#111827; display:flex; align-items:center; justify-content:center;">
                <img src="${p.photo ? pb.files.getUrl(p, p.photo) : ''}" style="max-height:90%;">
            </div>
            <div style="padding:15px;">
                <small style="color:#64748b">${p.categorie}</small>
                <h3 style="margin:5px 0;">${p.nom}</h3>
                <p style="color:#4ade80; font-weight:bold; font-size:1.2rem;">${p.prix} €</p>
                <button class="btn-buy" onclick="addToCart('${p.id}','${p.nom.replace(/'/g," ")}',${p.prix})" ${p.stock <=0 ? 'disabled':''}>
                    ${p.stock <=0 ? 'Rupture' : 'Ajouter'}
                </button>
            </div>
        </div>
    `).join('');
}

function addToCart(id, nom, prix) {
    panier.push({id, nom, prix});
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCart();
}

function updateCart() {
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = panier.map((item, i) => {
        total += item.prix;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span>${item.nom}</span>
                    <span>${item.prix}€ <button onclick="removeItem(${i})" style="color:red; background:none; border:none; cursor:pointer;">X</button></span>
                </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total;
    document.getElementById('cart-count').innerText = panier.length;
}

function removeItem(i) {
    panier.splice(i, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCart();
}

async function validerCommande() {
    if(!pb.authStore.isValid) return window.location.href="login.html";
    if(panier.length === 0) return;

    try {
        const total = document.getElementById('cart-total').innerText;
        // Créer l'historique dans PocketBase
        await pb.collection('commandes').create({
            client: pb.authStore.model.id,
            produits: panier.map(i => i.nom).join(', '),
            total: parseFloat(total)
        });

        // Baisser les stocks
        for(let item of panier) {
            const p = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, {stock: p.stock - 1});
        }

        localStorage.setItem('totalAPayer', total);
        panier = []; localStorage.removeItem('monPanier');
        window.location.href = "paiement.html";
    } catch(e) { alert("Erreur: Vérifiez la collection 'commandes'"); }
}

function updateNavbar() {
    const menu = document.getElementById('user-menu');
    if(pb.authStore.isValid) {
        menu.innerHTML = `
            <span style="color:#4ade80">👋 ${pb.authStore.model.name || 'Client'}</span>
            <a href="profil.html" style="margin-left:10px; color:#3b82f6; text-decoration:none;">Mes Commandes</a>
            <button onclick="pb.authStore.clear(); location.reload();" style="margin-left:10px; background:none; color:red; border:none; cursor:pointer;">Quitter</button>
        `;
    } else {
        menu.innerHTML = `<a href="login.html" style="color:#3b82f6; text-decoration:none; font-weight:bold;">Connexion</a>`;
    }
}

function genereCats() {
    const bar = document.getElementById('category-bar');
    const cs = ['Tous', ...new Set(tousLesProduits.map(p => p.categorie))];
    bar.innerHTML = cs.map(c => `<button onclick="catChoisie='${c}'; filtrerEtTrier();" style="padding:5px 15px; border-radius:20px; border:none; background:#1e293b; color:white; cursor:pointer;">${c}</button>`).join('');
}

function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }

init();
