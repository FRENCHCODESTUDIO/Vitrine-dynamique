const pb = new PocketBase('http://127.0.0.1:8090');

let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let catActuelle = 'Tous';
let reduction = 0;

async function init() {
    updateNavbar();
    await chargerProduits();
    renderCart();
}

// 1. CHARGEMENT
async function chargerProduits() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        renderCats();
        filtrerEtTrier();
    } catch (err) { console.error("Erreur produits:", err); }
}

function filtrerEtTrier() {
    const q = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;
    
    let res = tousLesProduits.filter(p => 
        p.nom.toLowerCase().includes(q) && (catActuelle === 'Tous' || p.categorie === catActuelle)
    );

    if (tri === 'prix-asc') res.sort((a,b) => a.prix - b.prix);
    if (tri === 'prix-desc') res.sort((a,b) => b.prix - a.prix);

    document.getElementById('vitrine').innerHTML = res.map(p => `
        <div class="card">
            <div class="card-img">
                <img src="${p.photo ? pb.files.getUrl(p, p.photo) : ''}">
            </div>
            <div style="padding:15px;">
                <small>${p.categorie}</small>
                <h3>${p.nom}</h3>
                <p class="price">${p.prix} €</p>
                <button class="btn-buy" onclick="addToCart('${p.id}','${p.nom.replace(/'/g," ")}',${p.prix})" ${p.stock <=0 ? 'disabled':''}>
                    ${p.stock <=0 ? 'Rupture' : 'Ajouter'}
                </button>
            </div>
        </div>`).join('');
}

// 2. PANIER & PROMO
function addToCart(id, nom, prix) {
    panier.push({id, nom, prix});
    localStorage.setItem('monPanier', JSON.stringify(panier));
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-items');
    let brut = 0;
    list.innerHTML = panier.map((item, i) => {
        brut += item.prix;
        return `<div class="cart-item">
                    <span>${item.nom}</span>
                    <span>${item.prix}€ <button onclick="remove(${i})" class="btn-remove">✕</button></span>
                </div>`;
    }).join('');

    const net = brut * (1 - reduction / 100);
    document.getElementById('cart-total').innerHTML = reduction > 0 ? 
        `<s>${brut}€</s> <span style="color:#fbbf24; margin-left:8px;">${net.toFixed(2)}€</span>` : `${brut}€`;
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
        document.getElementById('promo-msg').innerHTML = `<span style="color:#ef4444">❌ Invalide</span>`;
    }
    renderCart();
}

// 3. NAVBAR & ONGLET ADMIN
function updateNavbar() {
    const menu = document.getElementById('user-menu');
    if(!menu) return;

    if(pb.authStore.isValid) {
        const user = pb.authStore.model;
        let html = `<span>👋 ${user.name || 'User'}</span>`;

        // ICI : Remplace par ton email pour voir l'onglet
        if(user.email === 'admin@test.com' || user.username === 'admin') {
            html += `<a href="admin.html" class="nav-admin-btn">⚙️ ADMINISTRATION</a>`;
        }

        html += `<button onclick="logout()" class="btn-logout">Quitter</button>`;
        menu.innerHTML = html;
    } else {
        menu.innerHTML = `<a href="login.html" class="nav-login">Connexion</a>`;
    }
}

function logout() { pb.authStore.clear(); location.reload(); }

function renderCats() {
    const cats = ['Tous', ...new Set(tousLesProduits.map(p => p.categorie))];
    document.getElementById('category-bar').innerHTML = cats.map(c => 
        `<button onclick="catActuelle='${c}'; renderCats(); filtrerEtTrier();" class="btn-cat ${catActuelle===c?'active':''}">
            ${c}
        </button>`).join('');
}

function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }

async function validerCommande() {
    if(!pb.authStore.isValid) return window.location.href="login.html";
    if(panier.length === 0) return;
    alert("Commande confirmée !"); // Simulation
}

init();
