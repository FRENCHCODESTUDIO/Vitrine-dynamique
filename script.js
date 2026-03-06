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
