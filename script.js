const pb = new PocketBase('http://127.0.0.1:8090');

// État global de l'application
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let categorieActuelle = 'Tous';
let reductionActuelle = 0; // En pourcentage (ex: 30 pour 30%)

// 1. INITIALISATION
async function initialiser() {
    updateNavbar();
    await chargerProduits();
    updateCartDisplay();
}

// 2. CHARGEMENT DE LA VITRINE
async function chargerProduits() {
    try {
        // On récupère les produits triés par nom
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        genererBoutonsCategories();
        filtrerEtTrier();
    } catch (err) {
        console.error("Erreur PocketBase produits:", err);
    }
}

// 3. MOTEUR DE RECHERCHE ET TRI
function filtrerEtTrier() {
    const query = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;

    // Filtrage par nom et catégorie
    let resultats = tousLesProduits.filter(p => {
        const matchNom = p.nom.toLowerCase().includes(query);
        const matchCat = (categorieActuelle === 'Tous' || p.categorie === categorieActuelle);
        return matchNom && matchCat;
    });

    // Tri des résultats
    if (tri === 'prix-asc') resultats.sort((a, b) => a.prix - b.prix);
    else if (tri === 'prix-desc') resultats.sort((a, b) => b.prix - a.prix);
    else if (tri === 'nom') resultats.sort((a, b) => a.nom.localeCompare(b.nom));

    afficherProduits(resultats);
}

// 4. AFFICHAGE DES CARTES PRODUITS
function afficherProduits(liste) {
    const vitrine = document.getElementById('vitrine');
    if (!vitrine) return;

    vitrine.innerHTML = liste.map(p => {
        const urlPhoto = p.photo ? pb.files.getUrl(p, p.photo) : 'https://via.placeholder.com/300';
        const enRupture = p.stock <= 0;

        return `
            <div class="card">
                <div style="height:200px; background:#111827; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <img src="${urlPhoto}" style="max-height:90%; max-width:90%; object-fit:contain;">
                </div>
                <div style="padding:15px;">
                    <small style="color:#64748b; text-transform:uppercase;">${p.categorie || 'Composant'}</small>
                    <h3 style="margin:8px 0; font-size:1.1rem; min-height:2.4em;">${p.nom}</h3>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#4ade80; font-weight:bold; font-size:1.3rem;">${p.prix} €</span>
                        <span style="font-size:0.8rem; color:${enRupture ? '#ef4444' : '#94a3b8'}">
                            ${enRupture ? 'Rupture' : 'Stock: '+p.stock}
                        </span>
                    </div>
                    <button class="btn-buy" onclick="ajouterAuPanier('${p.id}', '${p.nom.replace(/'/g, "\\'")}', ${p.prix})" 
                            style="margin-top:15px; border-radius:8px;" ${enRupture ? 'disabled' : ''}>
                        ${enRupture ? 'Indisponible' : 'Ajouter au panier'}
                    </button>
                </div>
            </div>`;
    }).join('');
}

// 5. GESTION DU PANIER & PROMO
function ajouterAuPanier(id, nom, prix) {
    panier.push({ id, nom, prix });
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
    // Animation ou notification ici si tu veux
}

function removeItem(index) {
    panier.splice(index, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCartDisplay();
}

async function appliquerPromo() {
    const input = document.getElementById('promo-input');
    const msg = document.getElementById('promo-msg');
    const codeSaisi = input.value.trim().toUpperCase();

    if (!codeSaisi) return;

    try {
        const promo = await pb.collection('promos').getFirstListItem(`code="${codeSaisi}" && actif=true`);
        reductionActuelle = Number(promo.reduction);
        msg.innerHTML = `<span style="color:#4ade80;">✅ Promo -${reductionActuelle}% appliquée !</span>`;
    } catch (err) {
        reductionActuelle = 0;
        msg.innerHTML = `<span style="color:#ef4444;">❌ Code invalide</span>`;
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cart-items');
    const totalDiv = document.getElementById('cart-total');
    const countSpan = document.getElementById('cart-count');
    
    if (!itemsDiv) return;

    let totalBrut = 0;
    itemsDiv.innerHTML = panier.map((item, i) => {
        totalBrut += item.prix;
        return `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:5px; border-bottom:1px solid #334155;">
                <span style="font-size:0.9rem;">${item.nom}</span>
                <span style="font-weight:bold;">${item.prix}€ <button onclick="removeItem(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer; margin-left:5px;">✕</button></span>
            </div>`;
    }).join('');

    // Calcul Final
    const totalFinal = totalBrut * (1 - reductionActuelle / 100);
    
    if (reductionActuelle > 0) {
        totalDiv.innerHTML = `<s style="color:#64748b; font-size:0.9rem;">${totalBrut}€</s> <span style="color:#fbbf24; margin-left:10px;">${totalFinal.toFixed(2)}€</span>`;
    } else {
        totalDiv.innerText = `${totalBrut}€`;
    }

    if (countSpan) countSpan.innerText = panier.length;
}

// 6. VALIDATION ET HISTORIQUE
async function validerCommande() {
    if (!pb.authStore.isValid) {
        alert("🔒 Connectez-vous pour commander.");
        window.location.href = "login.html";
        return;
    }

    if (panier.length === 0) return alert("Panier vide !");

    try {
        const totalFinal = document.getElementById('cart-total').innerText.split('€')[0].trim();

        // Création de l'historique
        await pb.collection('commandes').create({
            client: pb.authStore.model.id,
            produits: panier.map(i => i.nom).join(', '),
            total: parseFloat(totalFinal)
        });

        // Mise à jour des stocks
        for (let item of panier) {
            const prod = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, { stock: prod.stock - 1 });
        }

        // Nettoyage et redirection
        localStorage.setItem('totalAPayer', totalFinal);
        panier = [];
        localStorage.removeItem('monPanier');
        window.location.assign("paiement.html");

    } catch (err) {
        alert("Erreur lors de la validation : " + err.message);
    }
}

// 7. INTERFACE (NAVBAR & CATÉGORIES)
function updateNavbar() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    if (pb.authStore.isValid) {
        const user = pb.authStore.model;
        userMenu.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <span style="color:#4ade80;">👋 ${user.name || 'Client'}</span>
                <a href="profil.html" style="color:#3b82f6; text-decoration:none; font-size:0.85rem; border:1px solid #3b82f6; padding:5px 10px; border-radius:5px;">MES COMMANDES</a>
                <button onclick="logout()" style="background:none; border:none; color:#ef4444; cursor:pointer;">Quitter</button>
            </div>`;
    } else {
        userMenu.innerHTML = `<a href="login.html" style="color:#3b82f6; text-decoration:none; font-weight:bold;">Se connecter</a>`;
    }
}

function logout() {
    pb.authStore.clear();
    window.location.reload();
}

function genererBoutonsCategories() {
    const barre = document.getElementById('category-bar');
    if (!barre) return;
    const cats = ['Tous', ...new Set(tousLesProduits.map(p => p.categorie).filter(c => c))];
    barre.innerHTML = cats.map(c => `
        <button onclick="filtrerParCat('${c}')" class="btn-cat ${categorieActuelle === c ? 'active' : ''}" 
                style="padding:8px 15px; border-radius:20px; border:none; background:#1e293b; color:white; cursor:pointer;">
            ${c}
        </button>`).join('');
}

function filtrerParCat(cat) {
    categorieActuelle = cat;
    genererBoutonsCategories(); // Pour mettre à jour le bouton actif
    filtrerEtTrier();
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('open');
}

// Lancement
initialiser();
