const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

// 1. Initialisation
async function initialiser() {
    updateNavbar();
    await chargerBoutique();
}

// 2. Charger les produits
async function chargerBoutique() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        genererBoutonsCategories();
        afficherProduits(tousLesProduits);
        updateCartDisplay();
    } catch (err) {
        console.error("Erreur PocketBase:", err);
    }
}

// 3. Affichage des cartes produits
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
                    <div style="color: ${rupture ? '#ef4444' : (alerteStock ? '#fbbf24' : '#4ade80')}; font-weight: bold; font-size: 0.85rem; margin-top:5px;">
                        ${rupture ? '❌ Rupture' : `✅ Stock: ${p.stock}`}
                    </div>
                    <h3>${p.nom}</h3>
                    <div class="price">${p.prix} €</div>
                </div>
                <button class="btn-buy" onclick="ajouterAuPanier('${p.id}', '${p.nom.replace(/'/g, "\\'")}', ${p.prix})" ${rupture ? 'disabled' : ''}>
                    ${rupture ? 'Indisponible' : 'Ajouter au panier'}
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
            <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:12px; background:#0f172a; padding:10px; border-radius:8px; border: 1px solid #334155;">
                <span style="font-size:0.9rem;">${item.nom}</span>
                <span style="font-weight:bold;">${item.prix} € <button onclick="retirerDuPanier(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:5px;">✕</button></span>
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

// 5. VALIDATION ET REDIRECTION PAIEMENT
async function validerCommande() {
    // Sécurité : On vérifie si le client est connecté
    if (!pb.authStore.isValid) {
        alert("🔒 Veuillez vous connecter pour finaliser votre commande.");
        window.location.href = "login.html";
        return;
    }

    if (panier.length === 0) return alert("Votre panier est vide !");
    
    try {
        // Déduction des stocks dans PocketBase
        for (const item of panier) {
            const record = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, {
                "stock": record.stock - 1
            });
        }
        
        // On sauvegarde le total pour la page de paiement
        const total = document.getElementById('cart-total').innerText;
        localStorage.setItem('dernierTotal', total);

        // On vide le panier avant de partir
        panier = [];
        localStorage.removeItem('monPanier');

        // REDIRECTION VERS LA PAGE DE PAIEMENT
        window.location.assign("paiement.html");

    } catch (err) {
        console.error(err);
        alert("Erreur lors de la validation : " + err.message);
    }
}

// 6. Navbar (Admin / Client)
function updateNavbar() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    if (pb.authStore.isValid) {
        const user = pb.authStore.model;
        let html = `<span style="color: #4ade80;">👋 ${user.name || 'Client'}</span>`;
        
        if (user.email === 'admin@test.com') {
            html += `<a href="admin.html" style="margin-left:15px; color: #fbbf24; text-decoration: none; border: 1px solid #fbbf24; padding: 4px 8px; border-radius: 5px;">⚙️ Gestion</a>`;
        }
        
        html += `<button onclick="logout()" style="margin-left:15px; background:none; border:none; color:#ef4444; cursor:pointer;">Déconnexion</button>`;
        userMenu.innerHTML = html;
    } else {
        userMenu.innerHTML = `<a href="login.html" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Se connecter</a>`;
    }
}

function logout() {
    pb.authStore.clear();
    window.location.reload();
}

// Utilitaires
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

initialiser();
