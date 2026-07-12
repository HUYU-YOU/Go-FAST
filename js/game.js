// js/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let map, player, civilians, police, pedestrians, particles, gameState = 'menu', camera, invulnerabilityTimer;
let globalVolume = 0.5, isMuted = false, audioInitialized = false;

const menuMusic = new Audio('audio/menu.mp3'); menuMusic.loop = true;
const radioStations = [
    { name: "MAMACITA.fm", audio: new Audio('audio/MAMACITA.fm.mp3') },
    { name: "Skyrap", audio: new Audio('audio/Skyrap.mp3') },
    { name: "FunnyRadio", audio: new Audio('audio/FunnyRadio.mp3') },
    { name: "agressi.fm", audio: new Audio('audio/agressi.fm.mp3') },
    { name: "epicUrien.radio", audio: new Audio('audio/epicUrien.radio.mp3') },
    { name: "cyberponk.fm", audio: new Audio('audio/cyberponk.fm.mp3') },
    { name: "TahLaBrazil.ontadit", audio: new Audio('audio/TahLaBrazil.ontadit.mp3') },
    { name: "Slowwly.radio", audio: new Audio('audio/Slowwly.radio.mp3') },
    { name: "OldSchoolFM", audio: new Audio('audio/OldSchoolFM.mp3') },
    { name: "NightCarCrash", audio: new Audio('audio/NightCarCrash.mp3') }
];
let currentRadioIndex = 0, radioCooldown = 0, escCooldown = 0;

window.addEventListener('click', () => {
    if(!audioInitialized) {
        audioInitialized = true; applyVolumeSettings();
        if(gameState === 'menu' || gameState === 'car-select' || gameState === 'options') menuMusic.play().catch(e=>Math.abs(0));
    }
});

function changeGlobalVolume(val) { globalVolume = parseFloat(val); document.getElementById('volume-text').innerText = Math.round(globalVolume * 100) + "%"; if(!isMuted) applyVolumeSettings(); }
function adjustVolume(amount) {
    globalVolume = Math.max(0, Math.min(1, globalVolume + amount)); document.getElementById('volume-slider').value = globalVolume;
    document.getElementById('volume-text').innerText = Math.round(globalVolume * 100) + "%";
    if(globalVolume > 0) { isMuted = false; document.getElementById('mute-btn').innerText = "🔊"; }
    applyVolumeSettings();
}
function toggleMute() { isMuted = !isMuted; document.getElementById('mute-btn').innerText = isMuted ? "❌" : "🔊"; applyVolumeSettings(); }
function applyVolumeSettings() {
    let targetVol = isMuted ? 0 : globalVolume; menuMusic.volume = targetVol;
    radioStations.forEach((r, idx) => { if(gameState === 'playing' && idx === currentRadioIndex) r.audio.volume = targetVol; else r.audio.volume = 0; });
}
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('bottom-hud').style.display = 'none'; document.getElementById('radio-wrapper').style.display = 'none';
    if(id) document.getElementById(id).style.display = 'flex';
}
function resumeGame() { gameState = 'playing'; showScreen(null); document.getElementById('bottom-hud').style.display = 'flex'; document.getElementById('radio-wrapper').style.display = 'flex'; applyVolumeSettings(); }

function startGame(carType) {
    map = new CityMap(); 
    let px = 0, py = 0;
    while(map.getTileTypeAt(px, py) !== 1) { px = Math.random() * map.width; py = Math.random() * map.height; }
    player = new Player(px, py, carType);
    
    civilians = []; police = []; pedestrians = []; particles = []; 
    camera = { x: 0, y: 0 }; invulnerabilityTimer = 0; gameState = 'playing';
    
    showScreen(null); document.getElementById('bottom-hud').style.display = 'flex'; document.getElementById('radio-wrapper').style.display = 'flex';
    if(audioInitialized) {
        menuMusic.pause(); radioStations.forEach(r => { r.audio.loop = true; r.audio.volume = 0; r.audio.play().catch(e=>Math.abs(0)); });
        applyVolumeSettings(); document.getElementById('radio-display').innerText = `📻 RADIO: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }
}

function rectIntersect(r1, r2) { return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y); }

function spawnEntities() {
    // Civils en voiture sur la route (Type 1)
    if(civilians.length < 25) {
        let cx = player.x + (Math.random() > 0.5 ? 800 : -800); let cy = player.y + (Math.random() > 0.5 ? 600 : -600);
        if(map.getTileTypeAt(cx, cy) === 1) civilians.push(new Civilian(cx, cy)); 
    }
    // Police sur la route (Type 1)
    if(police.length < 4 + player.keysCollected * 2) {
        let px = player.x + (Math.random() > 0.5 ? 900 : -900); let py = player.y + (Math.random() > 0.5 ? 700 : -700);
        if(map.getTileTypeAt(px, py) === 1) {
            let type = 1; if(player.keysCollected >= 2 && Math.random() < 0.3) type = 2; if(player.keysCollected >= 4 && Math.random() < 0.2) type = 3;
            police.push(new Police(px, py, type));
        }
    }
    // Piétons sur les trottoirs (Type 0 ou 4)
    if(pedestrians.length < 30) {
        let px = player.x + (Math.random()*1200 - 600); let py = player.y + (Math.random()*1200 - 600);
        let tile = map.getTileTypeAt(px, py);
        if(tile === 0 || tile === 4) pedestrians.push(new Pedestrian(px, py));
    }
}

function drawMinimap() {
    let mmSize = 150;
    let mmX = 20;
    let mmY = 20;
    
    // Background minimap
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mmX, mmY, mmSize, mmSize);
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2; ctx.strokeRect(mmX, mmY, mmSize, mmSize);

    // Echelle pour afficher un rayon autour du joueur
    let viewRadius = 3000; 
    let scale = mmSize / (viewRadius * 2);

    // Fonction utilitaire pour dessiner les points
    function drawDot(worldX, worldY, color, size) {
        let dx = worldX - player.x;
        let dy = worldY - player.y;
        if(Math.abs(dx) < viewRadius && Math.abs(dy) < viewRadius) {
            ctx.fillStyle = color;
            ctx.fillRect(mmX + mmSize/2 + dx * scale - size/2, mmY + mmSize/2 + dy * scale - size/2, size, size);
        }
    }

    // Eau en bleu
    for(let y=0; y<map.rows; y++){
        for(let x=0; x<map.cols; x++){
            if(map.grid[y][x] === 2) {
                let wx = x * map.tileSize; let wy = y * map.tileSize;
                drawDot(wx, wy, '#1a8cff', map.tileSize * scale);
            }
        }
    }

    for(let f of map.fuels) if(!f.collected) drawDot(f.x, f.y, '#ff5500', 4);
    for(let k of map.keys) if(!k.collected) drawDot(k.x, k.y, '#ffd700', 6);
    for(let p of police) drawDot(p.x, p.y, 'red', 4);

    // Joueur au centre
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath(); ctx.arc(mmX + mmSize/2, mmY + mmSize/2, 3, 0, Math.PI*2); ctx.fill();
}

function update() {
    if(escCooldown > 0) escCooldown--;
    if(keys.esc && escCooldown <= 0) { escCooldown = 20; if(gameState === 'playing') { gameState = 'paused'; showScreen('pause-screen'); radioStations.forEach(r=>r.audio.volume=0); return; } }
    if(gameState !== 'playing') return;
    if(invulnerabilityTimer > 0) invulnerabilityTimer--;
    if(radioCooldown > 0) radioCooldown--;

    if(keys.enter && radioCooldown <= 0) {
        radioCooldown = 22; currentRadioIndex = (currentRadioIndex + 1) % radioStations.length; applyVolumeSettings();
        document.getElementById('radio-display').innerText = `📻 RADIO: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }

    if (keys.up || keys.down || keys.left || keys.right || keys.nitro) player.fuel -= keys.nitro ? player.fuelDrainRate * 1.8 : player.fuelDrainRate;
    if(player.fuel <= 0) { player.fuel = 0; player.baseMaxSpeed = 0; }

    let currentTile = map.getTileTypeAt(player.x, player.y);
    player.updatePlayer(keys, currentTile); spawnEntities();
    
    for(let c of civilians) c.update(); 
    for(let p of police) p.updateAI(player, map); 
    for(let ped of pedestrians) ped.update(map);
    for(let pt of particles) pt.update();

    civilians = civilians.filter(c => Math.abs(c.x - player.x) < 1800 && Math.abs(c.y - player.y) < 1800);
    police = police.filter(p => Math.abs(p.x - player.x) < 1800 && Math.abs(p.y - player.y) < 1800);
    pedestrians = pedestrians.filter(p => p.alive && Math.abs(p.x - player.x) < 1500);
    particles = particles.filter(p => p.life > 0);

    if (currentTile === 2) { gameState = 'gameover_drown'; return; }
    
    let nextTileX = map.getTileTypeAt(player.x + player.vx * 2, player.y);
    let nextTileY = map.getTileTypeAt(player.x, player.y + player.vy * 2);
    // Le joueur rebondit (collision) s'il rentre dans le bloc dur du batiment (les bords du type 0 sont les trottoirs, le centre = collision)
    // Simplification: le type 0 entier est dur pour les voitures.
    if(nextTileX === 0) { player.vx *= -0.5; player.speed *= 0.5; }
    if(nextTileY === 0) { player.vy *= -0.5; player.speed *= 0.5; }

    let pBounds = player.getBounds();
    for(let f of map.fuels) { if(!f.collected && Math.hypot(player.x - f.x, player.y - f.y) < 40) { f.collected = true; player.fuel = Math.min(100, player.fuel + f.amount); } }
    for(let k of map.keys) { if(!k.collected && Math.hypot(player.x - k.x, player.y - k.y) < 40) { k.collected = true; player.keysCollected++; } }

    // Hit piétons (SANG)
    for(let ped of pedestrians) {
        if(ped.alive && Math.hypot(player.x - ped.x, player.y - ped.y) < 25) {
            ped.alive = false;
            for(let i=0; i<15; i++) particles.push(new Particle(ped.x, ped.y, '#cc0000'));
        }
    }

    for(let c of civilians) {
        if(rectIntersect(pBounds, c.getBounds()) && invulnerabilityTimer <= 0) {
            player.health--; invulnerabilityTimer = 60; player.speed *= -0.5; player.vx *= -0.7;
            if(player.health <= 0) gameState = 'gameover_crash';
        }
    }

    let underArrest = false;
    for(let p of police) {
        if(rectIntersect(pBounds, p.getBounds())) {
            if(p.type === 3) gameState = 'gameover_crash';
            player.speed *= 0.82; player.vx *= 0.82; 
            // DELAI POUR ARRESTATION : Si la voiture de police te touche ET que tu roules très doucement, le compteur monte. Il faut repartir vite pour échapper.
            if(Math.abs(player.speed) < 1.5) underArrest = true; 
        }
    }
    
    if(underArrest) { 
        player.arrestTimer++; 
        document.getElementById('arrest-warning').style.display = 'block'; 
        if(player.arrestTimer > 120) gameState = 'gameover_arrest'; 
    } else { 
        player.arrestTimer = Math.max(0, player.arrestTimer - 2); 
        if(player.arrestTimer === 0) document.getElementById('arrest-warning').style.display = 'none'; 
    }

    if(player.keysCollected >= 5) gameState = 'win';

    camera.x = player.x - canvas.width / 2; 
    camera.y = player.y - canvas.height / 2;

    document.getElementById('health').innerText = `HULL: ${player.health}/${player.maxHealth}`;
    document.getElementById('fuel').innerText = `FUEL: ${Math.ceil(player.fuel)}%`;
    document.getElementById('nitro').innerText = `NITRO: ${Math.ceil(player.nitro)}% [SPACE]`;
    document.getElementById('wanted-display').innerText = `WANTED: ${'★'.repeat(Math.min(5, player.keysCollected + 1))}`;
    document.getElementById('objective').innerText = `Obj: Find Keys (${player.keysCollected}/5)`;
}

function draw() {
    if(gameState === 'playing') {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        map.draw(ctx, camera.x, camera.y);
        for(let pt of particles) pt.draw(ctx, camera.x, camera.y);
        for(let ped of pedestrians) ped.draw(ctx, camera.x, camera.y);
        for(let c of civilians) c.draw(ctx, camera.x, camera.y); 
        for(let p of police) p.draw(ctx, camera.x, camera.y);
        if(invulnerabilityTimer % 10 < 5) player.draw(ctx, camera.x, camera.y);
        
        drawMinimap();
    }
    if(gameState.startsWith('gameover') || gameState === 'win') {
        showScreen('message-screen'); radioStations.forEach(r=>r.audio.volume=0);
        let title = document.getElementById('msg-title'); let sub = document.getElementById('msg-sub');
        if(gameState === 'gameover_crash') { title.innerText = "VEHICLE DESTROYED"; title.style.color = "#ff1a1a"; sub.innerText = "Your ride is totalled."; } 
        else if (gameState === 'gameover_arrest') { title.innerText = "BUSTED!"; title.style.color = "#1a1aff"; sub.innerText = "The police boxed you in."; } 
        else if (gameState === 'gameover_drown') { title.innerText = "WASTED"; title.style.color = "#1a8cff"; sub.innerText = "You drove into the river."; }
        else if (gameState === 'win') { title.innerText = "DELIVERY SUCCESSFUL!"; title.style.color = "#00ff66"; sub.innerText = "All keys found. Escape complete."; }
    }
    requestAnimationFrame(draw);
}

setInterval(update, 1000 / 60); draw();
