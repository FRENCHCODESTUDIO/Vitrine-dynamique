const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let categorieActuelle = 'Tous'; // Variable pour mémoriser l'onglet choisi

// 1. INITIALISATION
async function initialiser() {
    updateNavbar();
    await chargerBoutique();
    updateCartDisplay();
}

// 2. CHARGEMENT
async function chargerBoutique() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        genererBoutonsCategories();
        filtrerEtTrier(); // Affiche les produits avec le tri par défaut
    } catch (err) {
        console.error("Erreur PocketBase:", err);
    }
}

// 3. LA NOUVELLE LOGIQUE DE TRI ET FILTRE (RECHERCHE + PRIX + CATÉGORIE)
function filtrerEtTrier() {
    const query = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;

    // A. On filtre par recherche ET par catégorie en même temps
    let resultats = tousLesProduits.filter(p => {
        const matchNom = p.nom.toLowerCase().includes(query);
        const matchCat = (categorieActuelle === 'Tous' || p.categorie === categorieActuelle);
        return matchNom && matchCat;
    });

    // B. On applique le tri sur les résultats filtrés
    if (tri === 'prix-asc') {
        resultats.sort((a, b) => a.prix - b.prix); // Croissant
    } else if (tri === 'prix-desc') {
        resultats.sort((a, b) => b.prix - a.prix); // Décroissant
    } else if (tri === 'nom') {
        resultats.sort((a, b) => a.nom.localeCompare(b.nom)); // A-Z
    } else if (tri === 'stock-desc') {
        resultats.sort((a, b) => b.stock - a.stock); // Plus gros stock en premier
    }

    // C. On envoie les résultats à l'affichage
    afficherProduits(resultats);
}

// 4. AFFICHAGE DES PRODUITS
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

// 5. GESTION DU PANIER
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
                <span>${item.prix} € <button onclick="retirerDuPanier(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:8px;">✕</button></span>
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

// 6. VALIDATION ET REDIRECTION
async function validerCommande() {
    if (!pb.authStore.isValid) {
        alert("🔒 Connectez-vous pour finaliser votre commande.");
        window.location.href = "login.html";
        return;
    }

    if (panier.length === 0) return alert("Votre panier est vide !");
    
    try {
        for (const item of panier) {
            const record = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, { "stock": record.stock - 1 });
        }
        
        localStorage.setItem('totalAPayer', document.getElementById('cart-total').innerText);
        panier = [];
        localStorage.removeItem('monPanier');
        window.location.assign("paiement.html");
    } catch (err) {
        alert("Erreur de validation : " + err.message);
    }
}

// 7. NAVIGATION ET CATEGORIES
function updateNavbar() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    if (pb.authStore.isValid) {
        const user = pb.authStore.model;
        let html = `<span style="color: #4ade80;">👋 ${user.name || 'Client'}</span>`;
        if (user.email === 'admin@test.com' || user.name === 'Admin') {
            html += `<a href="admin.html" style="margin-left:15px; color: #fbbf24; text-decoration: none; border: 1px solid #fbbf24; padding: 4px 8px; border-radius: 5px; font-size: 0.8rem;">⚙️ GESTION</a>`;
        }
        html += `<button onclick="logout()" style="margin-left:15px; background:none; border:none; color:#ef4444; cursor:pointer;">Quitter</button>`;
        userMenu.innerHTML = html;
    } else {
        userMenu.innerHTML = `<a href="login.html" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Se connecter</a>`;
    }
}

function logout() {
    pb.authStore.clear();
    window.location.reload();
}

function genererBoutonsCategories() {
    const barre = document.getElementById('category-bar');
    if (!barre) return;
    const cats = [...new Set(tousLesProduits.map(p => p.categorie).filter(c => c))];
    let html = `<button onclick="filtrerParCategorie('Tous')" class="btn-cat active">Tous</button>`;
    cats.forEach(c => html += `<button onclick="filtrerParCategorie('${c}')" class="btn-cat">${c}</button>`);
    barre.innerHTML = html;
}

function filtrerParCategorie(cat) {
    categorieActuelle = cat;
    // Mise à jour visuelle des boutons
    document.querySelectorAll('.btn-cat').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === cat);
    });
    filtrerEtTrier(); // On relance le filtrage global
}

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

initialiser();
