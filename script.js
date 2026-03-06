// Connexion au serveur
const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];

async function chargerBoutique() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        filtrer();
    } catch (err) { console.error("Erreur PocketBase:", err); }
}

function filtrer() {
    const query = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort').value;
    const vitrine = document.getElementById('vitrine');
    
    let produits = tousLesProduits.filter(p => p.nom.toLowerCase().includes(query));

    if (tri === 'prix_asc') produits.sort((a,b) => a.prix - b.prix);
    if (tri === 'prix_desc') produits.sort((a,b) => b.prix - a.prix);

    vitrine.innerHTML = ''; 
    produits.forEach(p => {
        const urlPhoto = p.photo ? pb.files.getUrl(p, p.photo) : 'https://via.placeholder.com/400';
        const alerte = p.stock < 5;

        vitrine.innerHTML += `
            <div class="card">
                <div class="image-container"><img src="${urlPhoto}"></div>
                <div class="content">
                    <span class="stock-badge ${alerte ? 'low-stock' : ''}">
                        ${alerte ? '⚠️ Urgent : ' : '✅ '}${p.stock} en stock
                    </span>
                    <h3>${p.nom}</h3>
                    <div class="price">${p.prix} €</div>
                </div>
                <div style="display:flex; padding: 0 25px 25px;">
                    <button class="btn-buy" style="flex:3; margin:0;" onclick="acheter('${p.id}', ${p.stock}, '${p.nom}')">Acheter</button>
                    <button onclick="ajouterStock('${p.id}', ${p.stock})" style="flex:1; margin-left:5px; border-radius:12px; border:1px solid #ddd; cursor:pointer;">+1</button>
                </div>
            </div>
        `;
    });
}

function showNotify(msg) {
    const n = document.getElementById('notification');
    n.innerText = msg; n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 3000);
}

async function acheter(id, stock, nom) {
    if (stock <= 0) return alert("Rupture !");
    await pb.collection('produits').update(id, { "stock": stock - 1 });
    showNotify("Vendu : " + nom);
    chargerBoutique();
}

async function ajouterStock(id, stock) {
    await pb.collection('produits').update(id, { "stock": stock + 1 });
    showNotify("Stock augmenté !");
    chargerBoutique();
}

// Lancement automatique
chargerBoutique();

// Fonction pour n'afficher qu'une seule catégorie
function filtrerParCategorie(nomCategorie) {
    const vitrine = document.getElementById('vitrine');
    
    // On filtre notre liste principale
    let produitsFiltrés = tousLesProduits.filter(p => p.categorie === nomCategorie);
    
    // Si on clique sur "Tout", on affiche tout
    if (nomCategorie === 'Tous') produitsFiltrés = tousLesProduits;

    // On relance l'affichage avec la liste filtrée
    afficherProduits(produitsFiltrés); 
}

let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.style.right = sidebar.style.right === '0px' ? '-400px' : '0px';
    updateCartDisplay();
}

function ajouterAuPanier(id, nom, prix) {
    panier.push({ id, nom, prix });
    localStorage.setItem('monPanier', JSON.stringify(panier));
    showNotify(nom + " ajouté au panier !");
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
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>${item.nom}</span>
                <span>${item.prix} € <button onclick="retirerDuPanier(${index})" style="color:red; border:none; background:none; cursor:pointer;">❌</button></span>
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

// La fonction qui fait enfin baisser le stock dans PocketBase
async function validerCommande() {
    if (panier.length === 0) return alert("Le panier est vide !");
    
    try {
        for (const item of panier) {
            // Ici, on pourrait ajouter une logique pour vérifier le stock réel avant de valider
            const record = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, { "stock": record.stock - 1 });
        }
        
        alert("Commande validée ! Merci de votre confiance.");
        panier = [];
        localStorage.removeItem('monPanier');
        toggleCart();
        chargerBoutique(); // Rafraîchit les cartes pour voir les nouveaux stocks
    } catch (err) {
        alert("Erreur lors de la validation. Vérifie tes stocks !");
    }
}
