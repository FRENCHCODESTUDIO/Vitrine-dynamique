const pb = new PocketBase('http://127.0.0.1:8090');
let tousLesProduits = [];
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
let catActuelle = 'Tous';
let reduction = 0;

async function init() {
    updateNavbar(); // <--- C'est ça qui va afficher ton onglet
    await charger();
    renderCart();
}

function updateNavbar() {
    const menu = document.getElementById('user-menu');
    if (!menu) return;

    if (pb.authStore.isValid) {
        const user = pb.authStore.model;
        
        // On prépare le contenu de la barre du haut
        let html = `<span>👋 ${user.name || 'Admin'}</span>`;

        // SI C'EST TON EMAIL ADMIN, ON RAJOUTE L'ONGLET DE GESTION
        // Remplace 'ton-email@test.com' par ton vrai email admin
        if (user.email === 'admin@test.com' || user.username === 'admin') {
            html += `<a href="admin.html" style="margin-left:15px; color:#fbbf24; font-weight:bold; text-decoration:none; border:1px solid #fbbf24; padding:5px 10px; border-radius:5px;">⚙️ ADMINISTRATION</a>`;
        }

        html += `<a href="profil.html" style="margin-left:10px; color:#3b82f6; text-decoration:none;">Commandes</a>`;
        html += `<button onclick="logout()" style="margin-left:10px; color:#ef4444; background:none; border:none; cursor:pointer;">[Quitter]</button>`;
        
        menu.innerHTML = html;
    } else {
        menu.innerHTML = `<a href="login.html" style="color:#3b82f6; text-decoration:none; font-weight:bold;">Connexion</a>`;
    }
}

function logout() {
    pb.authStore.clear();
    location.reload();
}

// ... (Garde le reste de tes fonctions charger, filtrer, renderCart telles quelles)
// Assure-toi juste d'appeler init() à la fin du fichier
init();
