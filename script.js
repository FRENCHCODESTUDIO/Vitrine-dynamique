const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

// 1. Initialisation au chargement de la page
async function initialiser() {
    updateNavbar(); // On vérifie la connexion tout de suite
    await chargerBoutique();
}

// 2. Charger les données PocketBase
async function chargerBoutique() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        genererBoutonsCategories();
        afficherProduits(tousLesProduits);
        updateCartDisplay();
    } catch (err) {
        console.error("Erreur PocketBase:", err);
        document.getElementById('vitrine').innerHTML = `<p style="color:white; text-align:center;">⚠️ Erreur de connexion au serveur.</p>`;
    }
}

// 3. Gérer l'affichage du menu (Connexion / Admin)
function updateNavbar() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    if (pb.authStore.isValid && pb.authStore.model) {
        const user = pb.authStore.model;
        let html = `<span style="color: #4ade80; font-weight: bold;">👋 ${user.name || 'Admin'}</span>`;
        
        // Si c'est l'admin (email ou nom)
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

// 4. Fonctions de la boutique
function afficherProduits(liste) {
    const vitrine = document.getElementById('vitrine');
    if (!vitrine) return;
    vitrine.innerHTML = liste.map(p => {
        const urlPhoto = p.photo ? pb.files.getUrl(p, p.photo) : 'https://via.placeholder.com/400x300?text=Composant';
        return `
            <div class="card">
                <div class="image-container"><img src="${urlPhoto}" alt="${p.nom}"></div>
                <div class="content">
                    <small style="color:#94a3b8">${p.categorie}</small>
                    <h3>${p.nom}</h3>
                    <div class="price">${p.prix} €</div>
                </div>
                <button class="btn-buy" onclick="ajouterAuPanier('${p.id}', '${p.nom.replace(/'/g, "\\'")}', ${p.prix})">Ajouter</button>
            </div>`;
    }).join('');
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

// 5. Panier
function ajouterAuPanier(id, nom, prix) {
    panier.push({ id, nom, prix });
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
}

function updateCartDisplay() {
    const count = document.getElementById('cart-count');
    if (count) count.innerText = panier.length;
    // (Tu peux ajouter ici le rendu visuel de la liste du panier si besoin)
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('open');
}

// Lancement
initialiser();
