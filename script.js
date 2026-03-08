const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let categorieActuelle = 'Tous'; 

// 1. INITIALISATION
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
        filtrerEtTrier(); 
    } catch (err) {
        console.error("Erreur PocketBase:", err);
    }
}

// 3. RECHERCHE, TRI ET FILTRAGE (DEMANDÉ PAR TON COLLÈGUE)
function filtrerEtTrier() {
    const query = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;

    let resultats = tousLesProduits.filter(p => {
        const matchNom = p.nom.toLowerCase().includes(query);
        const matchCat = (categorieActuelle === 'Tous' || p.categorie === categorieActuelle);
        return matchNom && matchCat;
    });

    if (tri === 'prix-asc') {
        resultats.sort((a, b) => a.prix - b.prix);
    } else if (tri === 'prix-desc') {
        resultats.sort((a, b) => b.prix - a.prix);
    } else if (tri === 'nom') {
        resultats.sort((a, b) => a.nom.localeCompare(b.nom));
    } else if (tri === 'stock-desc') {
        resultats.sort((a, b) => b.stock - a.stock);
    }

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

function retirer
