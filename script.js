const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let catChoisie = 'Tous';
let reductionActuelle = 0; // Stocke la réduction en % (ex: 10 pour 10%)

async function init() {
    updateNavbar();
    await chargerProduits();
    updateCart();
}

// 1. CHARGEMENT ET FILTRAGE
async function chargerProduits() {
    try {
        tousLesProduits = await pb.collection('produits').getFullList({ sort: 'nom' });
        genereCats();
        filtrerEtTrier();
    } catch (e) { console.error("Erreur PB:", e); }
}

function filtrerEtTrier() {
    const q = document.getElementById('search').value.toLowerCase();
    const tri = document.getElementById('sort-select').value;
    
    let res = tousLesProduits.filter(p => 
        p.nom.toLowerCase().includes(q) && (catChoisie === 'Tous' || p.categorie === catChoisie)
    );

    if (tri === 'prix-asc') res.sort((a,b) => a.prix - b.prix);
    if (tri === 'prix-desc') res.sort((a,b) => b.prix - a.prix);
    
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = res.map(p => `
        <div class="card">
            <div style="height:200px; background:#111827; display:flex; align-items:center; justify-content:center;">
                <img src="${p.photo ? pb.files.getUrl(p, p.photo) : ''}" style="max-height:90%; max-width:90%;">
            </div>
            <div style="padding:15px;">
                <small style="color:#64748b; text-transform: uppercase; font-weight: bold;">${p.categorie}</small>
                <h3 style="margin:8px 0; font-size: 1.1rem;">${p.nom}</h3>
                <p style="color:#4ade80; font-weight:bold; font-size:1.3rem; margin-bottom:15px;">${p.prix} €</p>
                <button class="btn-buy" onclick="addToCart('${p.id}','${p.nom.replace(/'/g," ")}',${p.prix})" ${p.stock <=0 ? 'disabled':''} style="border-radius: 8px;">
                    ${p.stock <=0 ? '🚫 Rupture' : '🛒 Ajouter'}
                </button>
            </div>
        </div>
    `).join('');
}

// 2. GESTION DU PANIER & PROMO
function addToCart(id, nom, prix) {
    panier.push({id, nom, prix});
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCart();
}

async function appliquerPromo() {
    const input = document.getElementById('promo-input');
    const msg = document.getElementById('promo-msg');
    const codeSaisi = input.value.trim(); // On garde exactement ce qui est tapé

    console.log("Tentative de recherche pour le code :", codeSaisi);

    try {
        // On cherche le code. Note: si ta colonne s'appelle 'code', garde 'code'.
        // Si elle s'appelle 'Code', change le mot juste avant le =
        const promo = await pb.collection('promos').getFirstListItem(`code="${codeSaisi}" && actif=true`);
        
        console.log("Code trouvé dans PocketBase !", promo);
        
        reductionActuelle = Number(promo.reduction);
        msg.innerHTML = `<span style="color: #4ade80; font-weight: bold;">✅ Promo -${reductionActuelle}% appliquée !</span>`;
        
        updateCart(); // On force la mise à jour du prix
    } catch (err) {
        console.error("Erreur PocketBase :", err.status, err.message);
        reductionActuelle = 0;
        
        if (err.status === 404) {
            msg.innerHTML = `<span style="color: #ef4444;">❌ Code "${codeSaisi}" inconnu</span>`;
        } else if (err.status === 403) {
            msg.innerHTML = `<span style="color: #fbbf24;">⚠️ Erreur de droits (Cadenas PB)</span>`;
        } else {
            msg.innerHTML = `<span style="color: #ef4444;">❌ Erreur : ${err.message}</span>`;
        }
        updateCart();
    }
}
function updateCart() {
    const list = document.getElementById('cart-items');
    let totalBrut = 0;
    
    list.innerHTML = panier.map((item, i) => {
        totalBrut += item.prix;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size: 0.9rem; border-bottom: 1px solid #334155; padding-bottom: 5px;">
                    <span>${item.nom}</span>
                    <span style="font-weight:bold;">${item.prix}€ <button onclick="removeItem(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-weight:bold; margin-left:5px;">✕</button></span>
                </div>`;
    }).join('');

    // Calcul Final
    const totalNet = totalBrut * (1 - reductionActuelle / 100);
    const totalDiv = document.getElementById('cart-total');

    if (reductionActuelle > 0) {
        totalDiv.innerHTML = `<s style="color: #64748b; font-size: 0.9rem;">${totalBrut}€</s> <span style="color: #fbbf24;">${totalNet.toFixed(2)}€</span>`;
    } else {
        totalDiv.innerText = `${totalBrut}€`;
    }
    
    document.getElementById('cart-count').innerText = panier.length;
}

function removeItem(i) {
    panier.splice(i, 1);
    localStorage.setItem('monPanier', JSON.stringify(panier));
    updateCart();
}

// 3. VALIDATION COMMANDE
async function validerCommande() {
    if(!pb.authStore.isValid) {
        alert("🔒 Connectez-vous d'abord !");
        window.location.href="login.html";
        return;
    }
    if(panier.length === 0) return;

    try {
        const totalAffiche = document.getElementById('cart-total').innerText;
        
        // Enregistrer la commande
        await pb.collection('commandes').create({
            client: pb.authStore.model.id,
            produits: panier.map(i => i.nom).join(', '),
            total: parseFloat(totalAffiche.split('€')[0]) || 0 
        });

        // Baisser les stocks
        for(let item of panier) {
            const p = await pb.collection('produits').getOne(item.id);
            await pb.collection('produits').update(item.id, {stock: p.stock - 1});
        }

        localStorage.setItem('totalAPayer', totalAffiche);
        panier = []; localStorage.removeItem('monPanier');
        window.location.href = "paiement.html";
    } catch(e) { alert("Erreur serveur : Vérifiez vos collections PocketBase."); }
}

// 4. NAVBAR & UI
function updateNavbar() {
    const menu = document.getElementById('user-menu');
    if(pb.authStore.isValid) {
        menu.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="color:#4ade80; font-size:0.9rem;">👋 ${pb.authStore.model.name || 'Client'}</span>
                <a href="profil.html" style="color:#3b82f6; text-decoration:none; font-size:0.8rem; border: 1px solid #3b82f6; padding: 4px 8px; border-radius: 5px;">Historique</a>
                <button onclick="pb.authStore.clear(); location.reload();" style="background:none; color:#ef4444; border:none; cursor:pointer; font-size:0.8rem;">[Quitter]</button>
            </div>
        `;
    } else {
        menu.innerHTML = `<a href="login.html" style="color:#3b82f6; text-decoration:none; font-weight:bold; font-size:0.9rem;">Connexion</a>`;
    }
}

function genereCats() {
    const bar = document.getElementById('category-bar');
    const cs = ['Tous', ...new Set(tousLesProduits.map(p => p.categorie))];
    bar.innerHTML = cs.map(c => `<button onclick="catChoisie='${c}'; filtrerEtTrier();" style="padding:8px 18px; border-radius:20px; border:none; background:#1e293b; color:white; cursor:pointer; font-size:0.8rem;">${c}</button>`).join('');
}

function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }

init();
