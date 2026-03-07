const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

// 1. Initialisation au chargement
async function initialiser() {
    updateNavbar();
    await chargerBoutique();
}

// 2. Charger les produits depuis PocketBase
async function chargerBoutique() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        genererBoutonsCategories();
        afficherProduits(tousLesProduits);
        updateCartDisplay();
    } catch (err) {
        console.error("Erreur PocketBase:", err);
        document.getElementById('vitrine').innerHTML = `<p style="color:white; text-align:center;">⚠️ Erreur serveur PocketBase</p>`;
    }
}

// 3. Afficher les produits avec badges de STOCK
function afficherProduits(liste) {
    const vitrine = document.getElementById('vitrine');
    if (!vitrine) return;
    
    vitrine.innerHTML = liste.map(p => {
        const urlPhoto = p.photo ? pb.files.getUrl(p, p.photo) : 'https://via.placeholder.com/400x300?text=Composant';
        const alerteStock = p.stock < 5;
        const rupture = p.stock <= 0;

        return `
            <div class="card">
                <div class="image-container"><img src="${urlPhoto}" alt="${p.nom}"></div>
                <div class="content">
                    <small style="color:#94a3b8">${p.categorie || 'Général'}</small>
                    
                    <span class="stock-badge ${alerteStock ? 'low-stock' : ''}" 
                          style="color: ${rupture ? '#ef4444' : (alerteStock ? '#fbbf24' : '#4ade80')}; font-weight: bold; font-size: 0.8rem;">
                        ${rupture ? 'Rupture' : p.stock + ' en stock'}
                    </span>

                    <h3>${p.nom}</h3>
                    <div class="price">${p.prix} €</div>
                </div>
                <button class="btn-buy" 
                        onclick="ajouterAuPanier('${p.id}', '${p.nom.replace(/'/g, "\\'")}', ${p.prix})" 
                        ${rupture ? 'disabled style="background:#444; cursor:not-allowed;"' : ''}>
                    ${rupture ? 'Indisponible' : 'Ajouter'}
                </button>
            </div>`;
    }).join('');
}

// 4. Gestion du Panier
function ajouterAuPanier(id, nom, prix) {
    panier.push({ id, nom, prix });
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
    showNotify(nom + " ajouté !");
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cart-items');
    const countSpan = document.getElementById('cart-count');
    const totalSpan = document.getElementById('cart-total');
    
    if(!itemsDiv) return;
    itemsDiv.innerHTML = '';
    let total = 0;
    
    panier.forEach((item, index) => {
        total += item.prix;
        itemsDiv.innerHTML += `
            <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:10px; background:#1e293b; padding:8px; border-radius:5px;">
                <span>${item.nom}</span>
                <span>${item.prix} € <button onclick="retirerDuPanier(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;">❌</button></span>
            </div>`;
    });
    
    if(countSpan) countSpan.innerText = panier.length;
    if(totalSpan) totalSpan.innerText = total;
}

function retirerDuPanier(index) {
    panier.splice(index, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
}

// 5. VALIDATION COMMANDE (Correction de l'erreur 404/Not Found)
async function validerCommande() {
    if (panier.length === 0) return alert("Votre panier est vide !");
    
    try {
        for (const item of panier) {
            // Récupération en temps réel pour éviter les erreurs de stock
            const record = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, {
                "stock": record.stock - 1
            });
        }
        
        alert("🎉 Commande validée !");
        panier = [];
        localStorage.removeItem('monPanier');
        updateCartDisplay();
        toggleCart();
        await chargerBoutique(); // On rafraîchit la vitrine
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la validation. Assurez-vous d'être connecté.");
    }
}

// 6. Gestion barre de navigation (Admin)
function updateNavbar() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    const user = pb.authStore.model;

    if (pb.authStore.isValid && user) {
        let html = `<span style="color: #4ade80; font-weight: bold;">👋 ${user.name || 'Admin'}</span>`;
        
        if (user.email === 'admin@test.com' || user.name === 'Admin') {
            html += `<a href="admin.html" style="margin-left:15px; color: #fbbf24; text-decoration: none; font-weight: bold; border: 1px solid #fbbf24; padding: 5px 10px; border-radius: 5px;">⚙️ Gestion</a>`;
        }
        
        html += `<button onclick="logout()" style="margin-left:15px; background:none; border:none; color:#ef4444; cursor:pointer;">[Déconnexion]</button>`;
        userMenu.innerHTML = html;
    } else {
        userMenu.innerHTML = `<a href="login.html" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Connexion</a>`;
    }
}

function logout() {
    pb.authStore.clear();
    window.location.reload();
}

// Fonctions utilitaires (Filtres, Notif, Sidebar)
function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('open');
}

function showNotify(msg) {
    const n = document.getElementById('notification');
    if(n) {
        n.innerText = msg;
        n.style.display = 'block';
        setTimeout(() => n.style.display = 'none', 3000);
    }
}

function genererBoutonsCategories() {
    const barre = document.getElementById('category-bar');
    if (!barre) return;
    const cats = [...new Set(tousLesProduits.map(p => p.categorie).filter(c => c))];
    let html = `<button onclick="filtrerParCategorie('Tous')" class="btn-cat">Tous</button>`;
    cats.forEach(c => html += `<button onclick="filtrerParCategorie('${c}')" class="btn-cat">${c}</button>`);
    barre.innerHTML = html;
}

function filtrerParCategorie(cat) {
    cat === 'Tous' ? afficherProduits(tousLesProduits) : afficherProduits(tousLesProduits.filter(p => p.categorie === cat));
}

function filtrer() {
    const q = document.getElementById('search').value.toLowerCase();
    afficherProduits(tousLesProduits.filter(p => p.nom.toLowerCase().includes(q)));
}

// Lancement global
initialiser();
