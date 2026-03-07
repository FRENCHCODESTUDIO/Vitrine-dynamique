const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

// 1. Charger les données et générer l'interface
async function chargerBoutique() {
    try {
        // Récupération de la collection 'produits'
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        
        // Génération automatique des boutons de catégories
        genererBoutonsCategories();
        
        // Affichage initial
        afficherProduits(tousLesProduits);
        updateCartDisplay();
    } catch (err) {
        console.error("Erreur PocketBase:", err);
        document.getElementById('vitrine').innerHTML = `
            <div style="color:white; text-align:center; padding:50px;">
                <p>⚠️ PocketBase n'est pas connecté.</p>
                <small>Lancez pocketbase.exe sur votre PC</small>
            </div>`;
    }
}

// 2. Créer les boutons de catégories dynamiquement
function genererBoutonsCategories() {
    const barre = document.getElementById('category-bar');
    if (!barre) return;

    // On extrait les catégories uniques (on enlève les doublons et les cases vides)
    const categoriesUniques = [...new Set(tousLesProduits.map(p => p.categorie).filter(c => c))];

    let html = `<button onclick="filtrerParCategorie('Tous')" class="btn-cat">Tout voir</button>`;
    
    categoriesUniques.forEach(cat => {
        // Le bouton envoie exactement le nom stocké en base de données
        html += `<button onclick="filtrerParCategorie('${cat}')" class="btn-cat">${cat}</button>`;
    });

    barre.innerHTML = html;
}

// 3. Affichage des cartes produits
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

// 4. Filtrage
function filtrerParCategorie(cat) {
    if (cat === 'Tous') {
        afficherProduits(tousLesProduits);
    } else {
        const resultats = tousLesProduits.filter(p => p.categorie === cat);
        afficherProduits(resultats);
    }
}

function filtrer() {
    const query = document.getElementById('search').value.toLowerCase();
    const resultats = tousLesProduits.filter(p => p.nom.toLowerCase().includes(query));
    afficherProduits(resultats);
}

// 5. Gestion du Panier (Sidebar & LocalStorage)
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
                <span>${item.prix} € <button onclick="retirerDuPanier(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;">❌</button></span>
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

async function validerCommande() {
    if (panier.length === 0) return alert("Le panier est vide !");
    
    try {
        for (const item of panier) {
            const record = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, { "stock": record.stock - 1 });
        }
        alert("Commande validée !");
        panier = [];
        localStorage.removeItem('monPanier');
        updateCartDisplay();
        toggleCart();
        chargerBoutique();
    } catch (err) {
        alert("Erreur. Vérifiez que PocketBase est lancé.");
    }
}

function showNotify(msg) {
    const n = document.getElementById('notification');
    n.innerText = msg;
    n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 3000);
}

// Lancement
chargerBoutique();
