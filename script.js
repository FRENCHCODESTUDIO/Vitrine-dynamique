const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

// 1. DÉMARRAGE
async function initialiser() {
    updateNavbar();
    await chargerBoutique();
    updateCartDisplay();
}

// 2. CHARGEMENT DES PRODUITS
async function chargerBoutique() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        genererBoutonsCategories();
        afficherProduits(tousLesProduits);
    } catch (err) {
        console.error("Erreur chargement boutique:", err);
    }
}

// 3. AFFICHAGE VITRINE
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
                        ${rupture ? '❌ Rupture' : `✅ En stock: ${p.stock}`}
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

// 4. GESTION DU PANIER
function ajouterAuPanier(id, nom, prix) {
    panier.push({ id, nom, prix });
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
    showNotify(nom + " ajouté au panier !");
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
                <span style="font-weight:bold;">${item.prix} € 
                    <button onclick="retirerDuPanier(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:8px;">✕</button>
                </span>
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

// 5. FONCTION DE VALIDATION (Avec redirection forcée)
async function validerCommande() {
    // A. Vérification connexion
    if (!pb.authStore.isValid) {
        alert("🔒 Vous devez être connecté pour commander.");
        window.location.href = "login.html";
        return;
    }

    // B. Vérification panier vide
    if (panier.length === 0) {
        alert("Votre panier est vide !");
        return;
    }

    try {
        // C. Mise à jour des stocks dans PocketBase
        for (const item of panier) {
            const record = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, {
                "stock": record.stock - 1
            });
        }
        
        // D. Sauvegarde du total pour la page de paiement
        const totalAffiche = document.getElementById('cart-total').innerText;
        localStorage.setItem('totalAPayer', totalAffiche);

        // E. Nettoyage
        panier = [];
        localStorage.removeItem('monPanier');

        // F. REDIRECTION VERS PAIEMENT.HTML
        console.log("Validation réussie, redirection...");
        window.location.assign("paiement.html");

    } catch (err) {
        console.error("Erreur lors de la validation:", err);
        alert("Erreur serveur : Impossible de mettre à jour le stock. Vérifiez vos droits d'accès dans PocketBase.");
    }
}

// 6. NAVBAR & AUTHENTIFICATION
function updateNavbar() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    if (pb.authStore.isValid) {
        const user = pb.authStore.model;
        let html = `<span style="color: #4ade80; font-weight: bold;">👋 ${user.name || 'Client'}</span>`;
        
        // Si c'est l'admin (ajuste l'email si besoin)
        if (user.email === 'admin@test.com' || user.name === 'Admin') {
            html += `<a href="admin.html" style="margin-left:15px; color: #fbbf24; text-decoration: none; border: 1px solid #fbbf24; padding: 5px 10px; border-radius: 5px; font-size: 0.8rem;">⚙️ GESTION</a>`;
        }
        
        html += `<button onclick="logout()" style="margin-left:15px; background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">[Quitter]</button>`;
        userMenu.innerHTML = html;
    } else {
        userMenu.innerHTML = `<a href="login.html" style="color: #3b82f6; text-decoration: none; font-weight: bold; border: 1px solid #3b82f6; padding: 5px 15px; border-radius: 5px;">Connexion</a>`;
    }
}

function logout() {
    pb.authStore.clear();
    window.location.reload();
}

// 7. UTILITAIRES
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    if(sidebar) sidebar.classList.toggle('open');
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
    const resultats = tousLesProduits.filter(p => p.nom.toLowerCase().includes(q));
    afficherProduits(resultats);
}

// LANCEMENT
initialiser();
