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
        
        // --- MISE À JOUR DU MENU UTILISATEUR ---
        updateNavbar();

    } catch (err) {
        console.error("Erreur PocketBase:", err);
        document.getElementById('vitrine').innerHTML = `
            <div style="color:white; text-align:center; padding:50px;">
                <p>⚠️ PocketBase n'est pas connecté.</p>
                <small>Lancez pocketbase.exe sur votre PC</small>
            </div>`;
        updateNavbar(); // On essaie quand même d'afficher le menu
    }
}

// 2. Créer les boutons de catégories dynamiquement
function genererBoutonsCategories() {
    const barre = document.getElementById('category-bar');
    if (!barre) return;

    const categoriesUniques = [...new Set(tousLesProduits.map(p => p.categorie).filter(c => c))];

    let html = `<button onclick="filtrerParCategorie('Tous')" class="btn-cat">Tout voir</button>`;
    
    categoriesUniques.forEach(cat => {
        html += `<button onclick="filtrerParCategorie('${cat}')" class="btn-cat">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`;
    });

    barre.innerHTML = html;
}

// 3. Afficher les produits dans la grille
function afficherProduits(liste) {
    const vitrine = document.getElementById('vitrine');
    if (!vitrine) return;

    if (liste.length === 0) {
        vitrine.innerHTML = "<p style='color:gray;'>Aucun produit trouvé.</p>";
        return;
    }

    vitrine.innerHTML = liste.map(p => {
        const urlPhoto = p.photo ? pb.files.getUrl(p, p.photo) : 'https://via.placeholder.com/200';
        return `
            <div class="product-card">
                <img src="${urlPhoto}" alt="${p.nom}">
                <h3>${p.nom}</h3>
                <p class="category-tag">${p.categorie}</p>
                <div class="price">${p.prix} €</div>
                <p style="font-size:0.8rem; color:${p.stock > 0 ? '#4ade80' : '#ef4444'}">
                    Stock: ${p.stock}
                </p>
                <button onclick="ajouterAuPanier('${p.id}')" class="btn-buy" ${p.stock <= 0 ? 'disabled' : ''}>
                    ${p.stock > 0 ? 'Ajouter au panier' : 'Rupture'}
                </button>
            </div>
        `;
    }).join('');
}

// 4. Filtrage
function filtrerParCategorie(cat) {
    if (cat === 'Tous') {
        afficherProduits(tousLesProduits);
    } else {
        const filtrés = tousLesProduits.filter(p => p.categorie === cat);
        afficherProduits(filtrés);
    }
}

function filtrer() {
    const query = document.getElementById('search').value.toLowerCase();
    const filtrés = tousLesProduits.filter(p => 
        p.nom.toLowerCase().includes(query) || 
        p.categorie.toLowerCase().includes(query)
    );
    afficherProduits(filtrés);
}

// 5. Gestion du Panier
function ajouterAuPanier(id) {
    const produit = tousLesProduits.find(p => p.id === id);
    if (produit) {
        panier.push(produit);
        localStorage.setItem('monPanier', JSON.stringify(panier));
        updateCartDisplay();
        showNotification(`${produit.nom} ajouté !`);
    }
}

function updateCartDisplay() {
    const count = document.getElementById('cart-count');
    const itemsContainer = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');

    if (count) count.innerText = panier.length;

    if (itemsContainer) {
        itemsContainer.innerHTML = panier.map((item, index) => `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; background:#1e293b; padding:10px; border-radius:5px;">
                <span>${item.nom}</span>
                <span>${item.prix} € <button onclick="retirerDuPanier(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button></span>
            </div>
        `).join('');
    }

    const total = panier.reduce((sum, item) => sum + item.prix, 0);
    if (totalSpan) totalSpan.innerText = total;
}

function retirerDuPanier(index) {
    panier.splice(index, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

function showNotification(msg) {
    const div = document.getElementById('notification');
    if (div) {
        div.innerText = msg;
        div.classList.add('show');
        setTimeout(() => div.classList.remove('show'), 2000);
    }
}

// --- NOUVELLE PARTIE : GESTION ADMIN / UTILISATEUR ---

function updateNavbar() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    const user = pb.authStore.model;

    if (pb.authStore.isValid && user) {
        // Si connecté
        let html = `<span style="color: #4ade80; font-weight: bold;">👋 ${user.name || 'Admin'}</span>`;
        
        // Si c'est l'admin
        if (user.email === 'admin@test.com' || user.name === 'Admin') {
            html += `<a href="admin.html" style="margin-left:15px; color: #fbbf24; text-decoration: none; font-weight: bold; border: 1px solid #fbbf24; padding: 5px 10px; border-radius: 5px;">⚙️ Gestion</a>`;
        }
        
        html += `<button onclick="logout()" style="margin-left:15px; background:none; border:none; color:#ef4444; cursor:pointer; font-size: 0.9rem;">[Déconnexion]</button>`;
        userMenu.innerHTML = html;
    } else {
        // Si déconnecté
        userMenu.innerHTML = `<a href="login.html" id="btn-login" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Connexion</a>`;
    }
}

function logout() {
    pb.authStore.clear();
    alert("Vous avez été déconnecté.");
    window.location.reload();
}

// Lancement au chargement
chargerBoutique();
