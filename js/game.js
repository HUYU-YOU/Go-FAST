const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiHealth = document.getElementById('health');
const uiWanted = document.getElementById('wanted');
const uiKeys = document.getElementById('keys');
const uiArrest = document.getElementById('arrest-warning');

const msgScreen = document.getElementById('message-screen');
const msgTitle = document.getElementById('msg-title');
const msgSub = document.getElementById('msg-sub');

let map = new GameMap();
let player = new Player(200, map.height / 2);
let civilians = [];
let police = [];
let gameState = 'playing'; // playing, gameover_crash, gameover_arrest, win
let camera = { x: 0, y: 0 };
let invulnerabilityTimer = 0;

// Utilitaire de collision AABB (boîtes englobantes)
function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

function spawnEntities() {
    let cityLevel = Math.floor(player.x / map.cityWidth) + 1;
    if(cityLevel > 5) cityLevel = 5;

    // Civils (Trafic)
    if(civilians.length < 15) {
        let cx = player.x + (Math.random() > 0.5 ? 900 : -900);
        let cy = 350 + Math.random() * 300; // Majoritairement sur la route
        civilians.push(new Civilian(cx, cy));
    }

    // Police
    let maxPolice = cityLevel * 2;
    if(police.length < maxPolice) {
        let px = player.x + (Math.random() > 0.5 ? 800 : -800);
        let py = player.y + (Math.random() > 0.5 ? 600 : -600);
        
        let type = 1;
        if(cityLevel >= 2 && Math.random() < 0.3) type = 2; // Van
        if(cityLevel >= 3 && Math.random() < 0.2) type = 3; // Tank
        
        police.push(new Police(px, py, type));
    }
}

function checkCollisions() {
    let pBounds = player.getBounds();
    let currentCity = Math.floor(player.x / map.cityWidth);

    // Bordures de map
    if(player.y < 20) { player.y = 20; player.vy = 0; }
    if(player.y > map.height - 20) { player.y = map.height - 20; player.vy = 0; }
    if(player.x < 20) { player.x = 20; player.vx = 0; }

    // Bâtiments
    for(let b of map.buildings) {
        if(rectIntersect(pBounds, b)) {
            player.vx *= -1; player.vy *= -1; // Rebond
            player.speed *= -0.5;
            player.x += player.vx * 2; player.y += player.vy * 2;
        }
    }

    // Clés
    for(let k of map.keys) {
        if(!k.collected && k.id === currentCity && rectIntersect(pBounds, k)) {
            k.collected = true;
            player.currentKey = true;
        }
    }

    // Barrages (Gates)
    for(let g of map.gates) {
        if(g.active && rectIntersect(pBounds, g)) {
            if(player.currentKey && g.id === currentCity) {
                g.active = false; // Ouvre le barrage
                player.currentKey = false;
            } else {
                player.vx = -5; // Repousse violemment
                player.speed = -5;
                player.x -= 10;
            }
        }
    }

    // Civils (Dégâts)
    if(invulnerabilityTimer <= 0) {
        for(let i = 0; i < civilians.length; i++) {
            if(rectIntersect(pBounds, civilians[i].getBounds())) {
                player.health--;
                invulnerabilityTimer = 60; // 1 seconde d'invincibilité
                player.speed *= -0.5; player.vx *= -1;
                civilians.splice(i, 1); // Détruit le civil
                if(player.health <= 0) gameState = 'gameover_crash';
                break;
            }
        }
    }

    // Police (Arrestation)
    let touchingPolice = false;
    for(let p of police) {
        if(rectIntersect(pBounds, p.getBounds())) {
            if(p.type === 3) gameState = 'gameover_crash'; // Tank = Mort instantanée
            
            // Ralentissement au contact
            player.speed *= 0.8; player.vx *= 0.8; player.vy *= 0.8;

            if(Math.abs(player.speed) < 0.5 && Math.abs(player.vx) < 0.5) {
                touchingPolice = true;
            }
        }
    }

    if(touchingPolice) {
        player.arrestTimer++;
        uiArrest.style.display = 'block';
        if(player.arrestTimer > 120) gameState = 'gameover_arrest'; // 2 secondes à 60fps
    } else {
        player.arrestTimer = Math.max(0, player.arrestTimer - 2);
        if(player.arrestTimer === 0) uiArrest.style.display = 'none';
    }
}

function update() {
    if(gameState !== 'playing') return;

    if(invulnerabilityTimer > 0) invulnerabilityTimer--;

    player.updatePlayer(keys);
    spawnEntities();

    for(let c of civilians) c.update();
    for(let p of police) p.updateAI(player);

    // Nettoyage des entités trop lointaines pour la performance
    civilians = civilians.filter(c => Math.abs(c.x - player.x) < 1500);
    police = police.filter(p => Math.abs(p.x - player.x) < 1500);

    checkCollisions();

    // Condition de victoire
    if(player.x > map.totalWidth) {
        gameState = 'win';
    }

    // Caméra dynamique
    camera.x = player.x - canvas.width / 3; // Le joueur est à 1/3 de l'écran (pour voir devant)
    camera.y = player.y - canvas.height / 2;

    // Mise à jour de l'UI
    let cityLvl = Math.floor(player.x / map.cityWidth) + 1;
    uiHealth.innerText = `Dégâts : ${5 - player.health}/5`;
    uiWanted.innerText = `Ville : ${cityLvl > 5 ? 5 : cityLvl} | Wanted : ${'★'.repeat(cityLvl > 5 ? 5 : cityLvl)}`;
    uiKeys.innerText = player.currentKey ? "Clé : OUI (Passez le barrage !)" : "Clé : Cherchez le cube doré";
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    map.draw(ctx, camera.x, camera.y);

    for(let c of civilians) c.draw(ctx, camera.x, camera.y);
    for(let p of police) p.draw(ctx, camera.x, camera.y);

    // Clignotement si dégâts récents
    if(invulnerabilityTimer % 10 < 5) {
        player.draw(ctx, camera.x, camera.y);
    }

    // Gestion des écrans de fin
    if(gameState !== 'playing' && msgScreen.style.display !== 'flex') {
        msgScreen.style.display = 'flex';
        uiArrest.style.display = 'none';
        if(gameState === 'gameover_crash') {
            msgTitle.innerText = "GAME OVER";
            msgTitle.style.color = "red";
            msgSub.innerText = "Votre véhicule a été détruit.";
        } else if (gameState === 'gameover_arrest') {
            msgTitle.innerText = "BUSTED !";
            msgTitle.style.color = "blue";
            msgSub.innerText = "Vous avez été arrêté par la police.";
        } else if (gameState === 'win') {
            msgTitle.innerText = "GO-FAST RÉUSSI !";
            msgTitle.style.color = "lime";
            msgSub.innerText = "Cargaison livrée avec succès.";
        }
    }

    requestAnimationFrame(draw);
}

// Lancement du jeu
setInterval(update, 1000/60); // Logique à 60 FPS
draw(); // Rendu graphique
