const pb = new PocketBase('http://127.0.0.1:8090');

// Variables d'état
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let catActuelle = 'Tous';
let reduction = 0; // Pourcentage de réduction

// --- 1. INITIALISATION ---
async function init() {
    updateNavbar(); // Affiche ton nom et l'onglet Admin
    await chargerProduits();
    renderCart(); // Affiche le contenu du panier
}

// --- 2. CHARGEMENT & AFFICHAGE ---
async function chargerProduits() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        renderCats();
        filtrerEtTrier();
    } catch (err) {
        console.error("Erreur chargement produits:", err);
    }
}

function filtrerEtTrier() {
    const query = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;
    
    // Filtre
    let resultats = tousLesProduits.filter(p => 
        p.nom.toLowerCase().includes(query) && 
        (catActuelle === 'Tous' || p.categorie === catActuelle)
    );

    // Tri
    if (tri === 'prix-asc') resultats.sort((a, b) => a.prix - b.prix);
    if (tri === 'prix-desc') resultats.sort((a, b) => b.prix - a.prix);

    // Affichage Vitrine
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = resultats.map(p => `
        <div class="card">
            <div style="height:180px; display:flex; align-items:center; justify-content:center; background:#111827;">
                <img src="${p.photo ? pb.files.getUrl(p, p.photo) : ''}" style="max-height:90%;">
            </div>
            <div style="padding:15px;">
                <small style="color:#64748b;">${p.categorie}</small>
                <h3 style="margin:5px 0;">${p.nom}</h3>
                <p style="color:#4ade80; font-weight:bold; font-size:1.2rem;">${p.prix} €</p>
                <button class="btn-buy" onclick="addToCart('${p.id}', '${p.nom.replace(/'/g, " ")}', ${p.prix})" 
                        ${p.stock <= 0 ? 'disabled' : ''} style="border-radius:8px;">
                    ${p.stock <= 0 ? 'Rupture' : '🛒 Ajouter'}
                </button>
            </div>
        </div>
    `).join('');
}

// --- 3. GESTION DU PANIER & PROMO ---
function addToCart(id, nom, prix) {
    panier.push({ id, nom, prix });
    localStorage.setItem('monPanier', JSON.stringify(panier));
    renderCart();
}

function remove(index) {
    panier.splice(index, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-items');
    let totalBrut = 0;
    
    list.innerHTML = panier.map((item, i) => {
        totalBrut += item.prix;
        return `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #334155; padding-bottom:5px;">
                <span style="font-size:0.9rem;">${item.nom}</span>
                <span style="font-weight:bold;">${item.prix}€ <button onclick="remove(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer;">✕</button></span>
            </div>`;
    }).join('');

    const totalFinal = totalBrut * (1 - reduction / 100);
    const totalDiv = document.getElementById('cart-total');
    
    if (reduction > 0) {
        totalDiv.innerHTML = `<s style="color:#64748b; font-size:0.8rem;">${totalBrut}€</s> <span style="color:#fbbf24; margin-left:5px;">${totalFinal.toFixed(2)}€</span>`;
    } else {
        totalDiv.innerText = `${totalBrut}€`;
    }
    
    document.getElementById('cart-count').innerText = panier.length;
}

async function appliquerPromo() {
    const code = document.getElementById('promo-
