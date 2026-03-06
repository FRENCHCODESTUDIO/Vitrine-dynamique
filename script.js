const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

// 1. Charger les données depuis PocketBase
async function chargerBoutique() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        afficherProduits(tousLesProduits);
        updateCartDisplay();
    } catch (err) {
        console.error("Erreur PocketBase:", err);
        document.getElementById('vitrine').innerHTML = "<p style='color:white; text-align:center;'>⚠️ Erreur : Lancez PocketBase sur votre PC !</p>";
    }
}

// 2. Afficher les cartes produits
function afficherProduits(liste) {
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = ''; 

    liste.forEach(p => {
        const urlPhoto = p.photo ? pb.files.getUrl(p, p.photo) : 'https://via.placeholder.com/400x300?text=Pas+d+image';
        const alerte = p.stock < 5;

        vitrine.innerHTML += `
            <div class="card">
                <div class="image-container"><img src="${urlPhoto}" alt="${p.nom}"></div>
                <div class="content">
                    <small style="color:#94a3b8">${p.categorie || 'Général'}</small>
                    <span class="stock-badge ${alerte ? 'low-stock' : ''}">
                        ${p.stock} en stock
                    </span>
                    <h3>${p.nom}</h3>
                    <div class="price">${p.prix} €</div>
                </div>
                <button class="btn-buy" onclick="ajouterAuPanier('${p.id}', '${p.nom.replace(/'/g, "\\'")}', ${p.prix})">
                    Ajouter au panier
                </button>
            </div>
        `;
    });
}

// 3. Gestion du Panier
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('open');
}

function ajouterAuPanier(id, nom, prix) {
    panier.push({ id, nom, prix });
    localStorage.setItem('monPanier', JSON.stringify(panier));
    showNotify(nom + " ajouté !");
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cart-items');
    const countSpan = document.getElementById('cart-count');
    const totalSpan = document.getElementById('cart-total');
    
    itemsDiv.innerHTML = '';
    let total = 0;
    
    panier.forEach((item, index) => {
        total += item.prix;
        itemsDiv.innerHTML += `
            <div class="cart-item">
                <span>${item.nom}</span>
                <span>${item.prix} € <button onclick="retirerDuPanier(${index})">❌</button></span>
            </div>`;
    });
    
    countSpan.innerText = panier.length;
    totalSpan.innerText = total;
}

function retirerDuPanier(index) {
    panier.splice(index, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
}

// 4. Validation et mise à jour du stock PocketBase
async function validerCommande() {
    if (panier.length === 0) return alert("Le panier est vide !");
    
    try {
        for (const item of panier) {
            const record = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, { "stock": record.stock - 1 });
        }
        alert("Commande validée ! Le stock a été mis à jour.");
        panier = [];
        localStorage.removeItem('monPanier');
        updateCartDisplay();
        toggleCart();
        chargerBoutique();
    } catch (err) {
        alert("Erreur lors de la validation. Vérifie que PocketBase est ouvert !");
    }
}

// 5. Filtres et Recherche
function filtrerParCategorie(cat) {
    const resultats = (cat === 'Tous') ? tousLesProduits : tousLesProduits.filter(p => p.categorie === cat);
    afficherProduits(resultats);
}

function filtrer() {
    const query = document.getElementById('search').value.toLowerCase();
    const resultats = tousLesProduits.filter(p => p.nom.toLowerCase().includes(query));
    afficherProduits(resultats);
}

function showNotify(msg) {
    const n = document.getElementById('notification');
    n.innerText = msg; n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 3000);
}

chargerBoutique();
