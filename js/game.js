// js/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let map, player, civilians, police, helicopters, pedestrians, particles, bullets;
let gameState = 'menu', camera, invulnerabilityTimer;
let escCooldown = 0;

// --- GESTION BACKGROUND SLIDER ---
const backgrounds = [
    'url("img/background1.jpg")',
    'url("img/background2.jpg")',
    'url("img/background3.jpg")',
    'url("img/background4.jpg")',
    'url("img/background5.jpg")',
    'url("img/background6.jpg")',
    'url("img/background7.jpg")',
    'url("img/background8.jpg")'
];
let currentBgIndex = 0;
let bgInterval = null;

function startBgSlider() {
    const slider = document.getElementById('bg-slider');
    slider.style.display = 'block';
    if(!bgInterval) {
        bgInterval = setInterval(() => {
            currentBgIndex = (currentBgIndex + 1) % backgrounds.length;
            slider.style.backgroundImage = backgrounds[currentBgIndex];
        }, 4000);
    }
}

function stopBgSlider() {
    document.getElementById('bg-slider').style.display = 'none';
    if(bgInterval) { clearInterval(bgInterval); bgInterval = null; }
}

// --- GESTION AUDIO ---
let globalVolume = 0.5, isMuted = false, audioInitialized = false, radioCooldown = 0, currentRadioIndex = 0;
const menuMusic = new Audio('audio/menu.mp3'); menuMusic.loop = true;
const radioStations = [
    { name: "MAMACITA.fm", audio: new Audio('audio/MAMACITA.fm.mp3') },
    { name: "Skyrap", audio: new Audio('audio/Skyrap.mp3') },
    { name: "FunnyRadio", audio: new Audio('audio/FunnyRadio.mp3') }
];

window.addEventListener('click', () => {
    if(!audioInitialized) {
        audioInitialized = true; applyVolumeSettings();
        if(gameState === 'menu' || gameState === 'car-select') menuMusic.play().catch(e=>e);
    }
});
function changeGlobalVolume(val) { globalVolume = parseFloat(val); if(!isMuted) applyVolumeSettings(); }
function toggleMute() { isMuted = !isMuted; document.getElementById('mute-btn').innerText = isMuted ? "❌" : "🔊"; applyVolumeSettings(); }
function applyVolumeSettings() {
    let targetVol = isMuted ? 0 : globalVolume; menuMusic.volume = targetVol;
    radioStations.forEach((r, idx) => { if(gameState === 'playing' && idx === currentRadioIndex) r.audio.volume = targetVol; else r.audio.volume = 0; });
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('bottom-hud').style.display = 'none';
    document.getElementById('radio-wrapper').style.display = 'none';
    if(id) document.getElementById(id).style.display = 'flex';

    // Le slider reste actif pendant le chargement (loading-screen)
    if(id === 'main-menu' || id === 'car-select' || id === 'pause-screen' || id === 'message-screen' || id === 'loading-screen') {
        startBgSlider();
    } else if (id === null && gameState === 'playing') {
        stopBgSlider();
    }
}
function resumeGame() { 
    gameState = 'playing'; showScreen(null); 
    document.getElementById('bottom-hud').style.display = 'flex'; 
    document.getElementById('radio-wrapper').style.display = 'flex'; applyVolumeSettings();
}

// On lance le slider au tout début
startBgSlider();

// --- LOGIQUE DE CHARGEMENT ---
function startGame(carType) {
    gameState = 'loading';
    showScreen('loading-screen');
    
    let progress = 0;
    let loadingBar = document.getElementById('loading-bar');
    let loadingText = document.getElementById('loading-text');
    loadingBar.style.width = '0%';
    loadingText.innerText = '0%';

    // Simule un temps de chargement
    let loadInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if(progress >= 100) {
            progress = 100;
            clearInterval(loadInterval);
            setTimeout(() => {
                finishStartGame(carType);
            }, 600); // Petite pause à 100% avant de lancer
        }
        loadingBar.style.width = progress + '%';
        loadingText.innerText = progress + '%';
    }, 250);
}

function finishStartGame(carType) {
    map = new CityMap(); 
    let px = map.bankSpawn.x * map.tileSize; let py = map.bankSpawn.y * map.tileSize;
    while(map.getTileTypeAt(px, py) !== 1) { px += map.tileSize; } // Move to road
    
    player = new Player(px, py, carType);
    player.keysCollected = 0;
    
    civilians = []; police = []; helicopters = []; pedestrians = []; particles = []; bullets = [];
    camera = { x: 0, y: 0 }; invulnerabilityTimer = 0; gameState = 'playing';
    
    showScreen(null); 
    document.getElementById('bottom-hud').style.display = 'flex';
    document.getElementById('radio-wrapper').style.display = 'flex';
    
    if(audioInitialized) {
        menuMusic.pause(); radioStations.forEach(r => { r.audio.loop = true; r.audio.volume = 0; r.audio.play().catch(e=>e); });
        applyVolumeSettings(); document.getElementById('radio-display').innerText = `📻 RADIO: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }
}

function rectIntersect(r1, r2) { return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y); }

function spawnEntities() {
    if(civilians.length < 25) {
        let cx = player.x + (Math.random() > 0.5 ? 1000 : -1000); let cy = player.y + (Math.random() > 0.5 ? 800 : -800);
        if(map.getTileTypeAt(cx, cy) === 1) civilians.push(new Civilian(cx, cy)); 
    }
    if(pedestrians.length < 30) {
        let px = player.x + (Math.random()*1600 - 800); let py = player.y + (Math.random()*1600 - 800);
        let t = map.getTileTypeAt(px, py); if(t === 0 || t === 4 || t === 5 || t === 6) pedestrians.push(new Pedestrian(px, py));
    }
    
    let stars = player.keysCollected + 1;
    let maxCops = (stars === 1) ? 1 : ((stars === 2) ? 2 : 4);

    if(police.length < maxCops) {
        let px = player.x + (Math.random() > 0.5 ? 900 : -900); let py = player.y + (Math.random() > 0.5 ? 700 : -700);
        if(map.getTileTypeAt(px, py) === 1) {
            let type = 1;
            if (stars === 3 && Math.random() < 0.5) type = 2;
            if (stars === 4) type = 2; 
            if (stars >= 5) type = 3; 
            police.push(new Police(px, py, type, player.keysCollected));
        }
    }
    
    if (stars >= 4 && helicopters.length < 1) {
        helicopters.push(new Helicopter(player.x - 1200, player.y - 1200));
    }
}

function spawnInstantCopNearPlayer() {
    let px = player.x + (Math.random() > 0.5 ? 500 : -500); 
    let py = player.y + (Math.random() > 0.5 ? 500 : -500);
    let type = player.keysCollected >= 4 ? 3 : (player.keysCollected >= 2 ? 2 : 1);
    police.push(new Police(px, py, type, player.keysCollected));
}

function drawMinimap() {
    let mmSize = 160; let mmX = 20; let mmY = 20;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(mmX, mmY, mmSize, mmSize);
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2; ctx.strokeRect(mmX, mmY, mmSize, mmSize);
    let viewRadius = 4000; let scale = mmSize / (viewRadius * 2);

    function drawDot(worldX, worldY, color, size) {
        let dx = worldX - player.x; let dy = worldY - player.y;
        if(Math.abs(dx) < viewRadius && Math.abs(dy) < viewRadius) {
            ctx.fillStyle = color; ctx.fillRect(mmX + mmSize/2 + dx * scale - size/2, mmY + mmSize/2 + dy * scale - size/2, size, size);
        }
    }

    for(let y=0; y<map.rows; y++) {
        for(let x=0; x<map.cols; x++) {
            if(map.grid[y][x] === 2) drawDot(x * map.tileSize, y * map.tileSize, '#1a8cff', map.tileSize * scale);
            if(map.grid[y][x] === 5) drawDot(x * map.tileSize, y * map.tileSize, '#ffd700', map.tileSize * scale); 
        }
    }
    for(let f of map.fuels) if(!f.collected) drawDot(f.x, f.y, '#ff5500', 4);
    for(let k of map.keys) if(!k.collected) drawDot(k.x, k.y, '#ffd700', 6);
    for(let p of police) drawDot(p.x, p.y, 'red', 4);
    for(let h of helicopters) drawDot(h.x, h.y, 'magenta', 5);

    ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.arc(mmX + mmSize/2, mmY + mmSize/2, 4, 0, Math.PI*2); ctx.fill();
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
    
    player.underHeliSpotlight = false;
    for(let h of helicopters) {
        h.updateAI(player);
        if(Math.hypot(player.x - h.x, player.y - h.y) < 200) player.underHeliSpotlight = true;
    }
    document.getElementById('heli-warning').style.display = player.underHeliSpotlight ? 'block' : 'none';

    player.updatePlayer(keys, currentTile); spawnEntities();
    
    for(let c of civilians) c.updateAI(map); 
    for(let p of police) p.updateAI(player, map, bullets); 
    for(let ped of pedestrians) ped.update(map);
    for(let pt of particles) pt.update();
    for(let b of bullets) b.update();

    civilians = civilians.filter(c => Math.abs(c.x - player.x) < 2200 && Math.abs(c.y - player.y) < 2200);
    police = police.filter(p => Math.abs(p.x - player.x) < 2200 && Math.abs(p.y - player.y) < 2200);
    pedestrians = pedestrians.filter(p => p.alive && Math.abs(p.x - player.x) < 1800);
    particles = particles.filter(p => p.life > 0);
    bullets = bullets.filter(b => b.life > 0);

    if (currentTile === 2) { gameState = 'gameover_drown'; return; }
    
    let nextTileX = map.getTileTypeAt(player.x + player.vx * 1.5, player.y);
    let nextTileY = map.getTileTypeAt(player.x, player.y + player.vy * 1.5);
    if(nextTileX === 0 || nextTileX === 5 || nextTileX === 6) { player.vx = 0; player.speed *= 0.5; }
    if(nextTileY === 0 || nextTileY === 5 || nextTileY === 6) { player.vy = 0; player.speed *= 0.5; }

    let pBounds = player.getBounds();
    for(let f of map.fuels) { if(!f.collected && Math.hypot(player.x - f.x, player.y - f.y) < 50) { f.collected = true; player.fuel = Math.min(100, player.fuel + f.amount); } }
    
    for(let k of map.keys) { 
        if(!k.collected && Math.hypot(player.x - k.x, player.y - k.y) < 50) { 
            k.collected = true; player.keysCollected++; spawnInstantCopNearPlayer(); 
        } 
    }

    for(let ped of pedestrians) {
        if(ped.alive && Math.hypot(player.x - ped.x, player.y - ped.y) < 25) {
            ped.alive = false; for(let i=0; i<15; i++) particles.push(new Particle(ped.x, ped.y, '#cc0000'));
        }
    }

    for(let b of bullets) {
        if (rectIntersect(pBounds, b.getBounds())) {
            b.life = 0;
            if (invulnerabilityTimer <= 0) {
                player.health--; invulnerabilityTimer = 60; player.speed *= 0.5; 
                for(let i=0; i<10; i++) particles.push(new Particle(player.x, player.y, '#ff3300'));
                if(player.health <= 0) gameState = 'gameover_crash';
            }
        }
    }

    for(let c of civilians) {
        if(rectIntersect(pBounds, c.getBounds())) {
            let dx = player.x - c.x; let dy = player.y - c.y; let dist = Math.hypot(dx, dy);
            if (dist > 0) { 
                player.vx += (dx / dist) * 2; player.vy += (dy / dist) * 2; 
                let pushX = -(dx / dist) * 2; let pushY = -(dy / dist) * 2;
                let cNextT = map.getTileTypeAt(c.x + pushX, c.y + pushY);
                if (cNextT !== 0 && cNextT !== 5 && cNextT !== 6 && cNextT !== 2) { c.vx += pushX; c.vy += pushY; }
            }
            if (invulnerabilityTimer <= 0) {
                player.health--; invulnerabilityTimer = 60; player.speed *= 0.5; 
                for(let i=0; i<10; i++) particles.push(new Particle(player.x, player.y, '#555'));
                if(player.health <= 0) gameState = 'gameover_crash';
            }
        }
    }

    let underArrest = false;
    for(let p of police) {
        if(rectIntersect(pBounds, p.getBounds())) {
            let dx = player.x - p.x; let dy = player.y - p.y; let dist = Math.hypot(dx, dy);
            if (dist > 0) {
                player.vx += (dx / dist) * 3; player.vy += (dy / dist) * 3;
                let pNextT = map.getTileTypeAt(p.x - (dx/dist)*3, p.y - (dy/dist)*3);
                if(pNextT !== 0 && pNextT !== 5 && pNextT !== 6 && pNextT !== 2) {
                    p.vx -= (dx / dist) * 3; p.vy -= (dy / dist) * 3;
                }
            }
            player.speed *= 0.70; p.speed *= 0.50;

            if (invulnerabilityTimer <= 0) {
                player.health--; invulnerabilityTimer = 60; 
                for(let i=0; i<10; i++) particles.push(new Particle(player.x, player.y, '#555'));
                if(player.health <= 0) gameState = 'gameover_crash';
            }
            if(Math.abs(player.speed) < 2.0) underArrest = true; 
        }
    }
    
    if(underArrest) { 
        player.arrestTimer++; document.getElementById('arrest-warning').style.display = 'block'; 
        if(player.arrestTimer > 100) gameState = 'gameover_arrest'; 
    } else { 
        player.arrestTimer = Math.max(0, player.arrestTimer - 2); 
        if(player.arrestTimer === 0) document.getElementById('arrest-warning').style.display = 'none'; 
    }

    if(player.keysCollected >= 5) gameState = 'win';

    camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2;
    if (player.health <= 1 && Math.random() < 0.3) particles.push(new Particle(player.x, player.y, '#333'));

    document.getElementById('health').innerText = `HULL: ${player.health}/${player.maxHealth}`;
    document.getElementById('fuel').innerText = `FUEL: ${Math.ceil(player.fuel)}%`;
    document.getElementById('nitro').innerText = `NITRO: ${Math.ceil(player.nitro)}% [SPACE]`;
    document.getElementById('cargo').innerText = `CARGO: ${player.keysCollected}/5`;
    document.getElementById('wanted-display').innerText = `WANTED: ${'★'.repeat(Math.min(5, player.keysCollected + 1))}`;
}

function draw() {
    if(gameState === 'playing') {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        map.draw(ctx, camera.x, camera.y);
        for(let pt of particles) pt.draw(ctx, camera.x, camera.y);
        for(let ped of pedestrians) ped.draw(ctx, camera.x, camera.y);
        for(let c of civilians) c.draw(ctx, camera.x, camera.y); 
        for(let p of police) p.draw(ctx, camera.x, camera.y);
        for(let b of bullets) b.draw(ctx, camera.x, camera.y);
        if(invulnerabilityTimer % 10 < 5) player.draw(ctx, camera.x, camera.y);
        for(let h of helicopters) h.draw(ctx, camera.x, camera.y);
        
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
