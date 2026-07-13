const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let map, player, civilians, police, helicopters, pedestrians, particles, bullets;
let gameState = 'menu', camera, invulnerabilityTimer;
let escCooldown = 0;
let wantedLevel = 0; // MODE CHILL PAR DEFAUT !

const backgrounds = [
    'url("img/background1.png")', 'url("img/background2.png")', 'url("img/background3.png")',
    'url("img/background4.png")', 'url("img/background5.png")', 'url("img/background6.png")',
    'url("img/background7.png")', 'url("img/background8.png")'
];
let currentBgIndex = Math.floor(Math.random() * backgrounds.length);
document.getElementById('bg-slider').style.backgroundImage = backgrounds[currentBgIndex];
let bgInterval = null;

function startBgSlider() {
    const slider = document.getElementById('bg-slider'); slider.style.display = 'block';
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

let globalVolume = 0.5, isMuted = false, audioInitialized = false, radioCooldown = 0, currentRadioIndex = 0;
const menuMusic = new Audio('audio/menu.mp3'); menuMusic.loop = true;
const radioStations = [
    { name: "MAMACITA.fm", audio: new Audio('audio/MAMACITA.fm.mp3') },
    { name: "Skyrap", audio: new Audio('audio/Skyrap.mp3') },
    { name: "FunnyRadio", audio: new Audio('audio/FunnyRadio.mp3') },
    { name: "NightCarCrash", audio: new Audio('audio/NightCarCrash.mp3') },
    { name: "Skyrap", audio: new Audio('audio/Skyrap.mp3') },
    { name: "FunnyRadio", audio: new Audio('audio/FunnyRadio.mp3') },
    { name: "MAMACITA.fm", audio: new Audio('audio/MAMACITA.FM.mp3') },
    { name: "OLDSchoolFM", audio: new Audio('audio/OLDSchoolFM.mp3') },
    { name: "TahLaBrazil.ontadit", audio: new Audio('audio/TahLaBrazil.ontadit.mp3') },
    { name: "agressi.fm", audio: new Audio('audio/agressi.fm.mp3') },
    { name: "cyberponk.fm", audio: new Audio('audio/cyberponk.fm.mp3') },
    { name: "epicOUrien.radio", audio: new Audio('audio/epicUrien.radio.mp3') },
];

window.addEventListener('click', () => {
    if(!audioInitialized) {
        audioInitialized = true; applyVolumeSettings();
        if(gameState === 'menu' || gameState === 'car-select') menuMusic.play().catch(e=>e);
    }
});
function changeGlobalVolume(val) { globalVolume = parseFloat(val); document.getElementById('volume-slider').value = val; if(!isMuted) applyVolumeSettings(); }
function toggleMute() { isMuted = !isMuted; document.getElementById('mute-btn').innerText = isMuted ? "❌" : "🔊"; applyVolumeSettings(); }
function applyVolumeSettings() {
    let targetVol = isMuted ? 0 : globalVolume; menuMusic.volume = targetVol;
    radioStations.forEach((r, idx) => { if(gameState === 'playing' && idx === currentRadioIndex) r.audio.volume = targetVol; else r.audio.volume = 0; });
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('bottom-hud').style.display = 'none'; document.getElementById('radio-wrapper').style.display = 'none';
    if(id) document.getElementById(id).style.display = 'flex';
    if(['main-menu', 'car-select', 'pause-screen', 'message-screen', 'loading-screen'].includes(id)) {
        startBgSlider();
    } else if (id === null && gameState === 'playing') { stopBgSlider(); }
}
function resumeGame() { gameState = 'playing'; showScreen(null); document.getElementById('bottom-hud').style.display = 'flex'; document.getElementById('radio-wrapper').style.display = 'flex'; applyVolumeSettings(); }

startBgSlider();

function startGame(carType) {
    gameState = 'loading'; showScreen('loading-screen');
    let progress = 0; let loadingBar = document.getElementById('loading-bar'); let loadingText = document.getElementById('loading-text');
    loadingBar.style.width = '0%'; loadingText.innerText = '0%';

    let loadInterval = setInterval(() => {
        progress += (Math.random() * 2 + 2); 
        if(progress >= 100) {
            progress = 100; clearInterval(loadInterval);
            setTimeout(() => { finishStartGame(carType); }, 600); 
        }
        loadingBar.style.width = progress + '%'; loadingText.innerText = Math.floor(progress) + '%';
    }, 200);
}

function finishStartGame(carType) {
    map = new CityMap(); 
    let px = map.bankSpawn.x * map.tileSize; let py = map.bankSpawn.y * map.tileSize;
    while(map.getTileTypeAt(px, py) !== 1) { px += map.tileSize; } 
    
    player = new Player(px, py, carType);
    player.keysCollected = 0;
    wantedLevel = 0; // Mode Chill !
    
    civilians = []; police = []; helicopters = []; pedestrians = []; particles = []; bullets = [];
    camera = { x: 0, y: 0 }; invulnerabilityTimer = 0; gameState = 'playing';
    
    showScreen(null); 
    document.getElementById('bottom-hud').style.display = 'flex';
    document.getElementById('radio-wrapper').style.display = 'block';
    
    currentRadioIndex = 0; 
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
        let t = map.getTileTypeAt(px, py); if([0,4,5,6,7,8].includes(t)) pedestrians.push(new Pedestrian(px, py));
    }
    
    // Flics n'apparaissent que si wantedLevel > 0
    if (wantedLevel > 0) {
        let maxCops = (wantedLevel === 1) ? 1 : ((wantedLevel === 2) ? 2 : wantedLevel + 1);

        if(police.length < maxCops) {
            // Tente de spawner près d'un commissariat (8) sinon n'importe où sur route
            let px, py;
            let spawnFound = false;
            // Essai de trouver un commissariat dans un rayon
            for(let y = Math.max(0, Math.floor(player.y/map.tileSize)-10); y < Math.min(map.rows, Math.floor(player.y/map.tileSize)+10); y++) {
                for(let x = Math.max(0, Math.floor(player.x/map.tileSize)-10); x < Math.min(map.cols, Math.floor(player.x/map.tileSize)+10); x++) {
                    if(map.grid[y][x] === 8 && Math.random() < 0.3) {
                        px = x * map.tileSize; py = y * map.tileSize; spawnFound = true; break;
                    }
                }
                if(spawnFound) break;
            }
            if(!spawnFound) {
                px = player.x + (Math.random() > 0.5 ? 1200 : -1200); py = player.y + (Math.random() > 0.5 ? 900 : -900);
            }

            if(spawnFound || map.getTileTypeAt(px, py) === 1) {
                let type = 1;
                if (wantedLevel === 3 && Math.random() < 0.5) type = 2;
                if (wantedLevel === 4) type = 2; 
                if (wantedLevel >= 5) type = 3; 
                police.push(new Police(px, py, type, wantedLevel));
            }
        }
        if (wantedLevel >= 4 && helicopters.length < 1) {
            helicopters.push(new Helicopter(player.x - 1200, player.y - 1200));
        }
    }
}

function drawMinimap() {
    let mmSize = 160; let mmX = 20; let mmY = 70; 
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
            if(map.grid[y][x] === 5) drawDot(x * map.tileSize, y * map.tileSize, '#cccccc', map.tileSize * scale); 
            if(map.grid[y][x] === 7) drawDot(x * map.tileSize, y * map.tileSize, '#00ffcc', map.tileSize * scale); // Garage cyan
            if(map.grid[y][x] === 8) drawDot(x * map.tileSize, y * map.tileSize, '#1a1aff', map.tileSize * scale); // Police station bleu
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
    
    // --- GARAGE HEAL INSTANTANÉ ---
    if(currentTile === 7 && player.health < player.maxHealth) {
        player.health = player.maxHealth;
        for(let i=0; i<15; i++) particles.push(new Particle(player.x, player.y, '#00ffcc'));
    }

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
    // Filtrer les policiers qui sont morts dans l'eau
    police = police.filter(p => !p.dead && Math.abs(p.x - player.x) < 2200 && Math.abs(p.y - player.y) < 2200);
    pedestrians = pedestrians.filter(p => p.alive && Math.abs(p.x - player.x) < 1800);
    particles = particles.filter(p => p.life > 0);
    bullets = bullets.filter(b => b.life > 0);

    if (currentTile === 2) { gameState = 'gameover_drown'; return; }
    
    // --- GLISSADE SUR LES MURS (Pas de ralentissement de la speed, juste annulation du vecteur de la direction bloquée) ---
    let nextTileX = map.getTileTypeAt(player.x + player.vx * 1.5, player.y);
    let nextTileY = map.getTileTypeAt(player.x, player.y + player.vy * 1.5);
    // Batiments solides: 0 (Normal), 5 (Bank), 6 (Hospital), 8 (Police Station). 7 (Garage) est ouvert !
    if([0, 5, 6, 8].includes(nextTileX)) { player.vx = 0; } 
    if([0, 5, 6, 8].includes(nextTileY)) { player.vy = 0; }

    let pBounds = player.getBounds();
    for(let f of map.fuels) { if(!f.collected && Math.hypot(player.x - f.x, player.y - f.y) < 50) { f.collected = true; player.fuel = Math.min(100, player.fuel + f.amount); } }
    
    for(let k of map.keys) { 
        if(!k.collected && Math.hypot(player.x - k.x, player.y - k.y) < 50) { 
            k.collected = true; 
            player.keysCollected++; 
            wantedLevel = player.keysCollected; // Prise de cargo = Etoiles = Spawn Police
        } 
    }

    for(let ped of pedestrians) {
        if(ped.alive && Math.hypot(player.x - ped.x, player.y - ped.y) < 25) {
            ped.alive = false; 
            wantedLevel = Math.max(wantedLevel, 1); // Ecraser un piéton donne min 1 étoile
            for(let i=0; i<15; i++) particles.push(new Particle(ped.x, ped.y, '#cc0000'));
        }
    }

    for(let b of bullets) {
        if (rectIntersect(pBounds, b.getBounds())) {
            b.life = 0;
            if (invulnerabilityTimer <= 0) {
                player.health--; invulnerabilityTimer = 42; player.speed *= 0.5; 
                for(let i=0; i<10; i++) particles.push(new Particle(player.x, player.y, '#ff3300'));
                if(player.health <= 0) gameState = 'gameover_crash';
            }
        }
    }

    for(let c of civilians) {
        if(rectIntersect(pBounds, c.getBounds())) {
            wantedLevel = Math.max(wantedLevel, 1); // Frapper un civil donne min 1 étoile

            let dx = player.x - c.x; let dy = player.y - c.y; let dist = Math.hypot(dx, dy);
            if (dist > 0) { 
                player.vx += (dx / dist) * 2; player.vy += (dy / dist) * 2; 
                let pushX = -(dx / dist) * 2; let pushY = -(dy / dist) * 2;
                let cNextT = map.getTileTypeAt(c.x + pushX, c.y + pushY);
                if (![0, 5, 6, 8, 2].includes(cNextT)) { c.vx += pushX; c.vy += pushY; }
            }
            if (invulnerabilityTimer <= 0) {
                player.health--; invulnerabilityTimer = 42; player.speed *= 0.5; 
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
                if(![0, 5, 6, 7, 2].includes(pNextT)) { // Police ignore la station (8)
                    p.vx -= (dx / dist) * 3; p.vy -= (dy / dist) * 3;
                }
            }
            player.speed *= 0.70; p.speed *= 0.50;

            if (invulnerabilityTimer <= 0) {
                player.health--; invulnerabilityTimer = 42; 
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
    document.getElementById('wanted-display').innerText = wantedLevel > 0 ? `WANTED: ${'★'.repeat(Math.min(5, wantedLevel))}` : `WANTED: CHILL MODE 😎`;
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
        showScreen('message-screen'); 
        radioStations.forEach(r=>r.audio.volume=0);
        
        let title = document.getElementById('msg-title'); 
        let sub = document.getElementById('msg-sub');
        let msgScreen = document.getElementById('message-screen');
        
        msgScreen.style.backgroundSize = "cover";
        msgScreen.style.backgroundPosition = "center";
        msgScreen.style.backgroundColor = "rgba(0,0,0,0.9)"; 
        
        title.style.textShadow = "3px 3px 6px black";
        sub.style.textShadow = "2px 2px 4px black";
        sub.style.fontSize = "30px";
        sub.style.fontWeight = "bold";

        if(gameState === 'gameover_crash') { 
            title.innerText = ""; sub.innerText = "Apprend a conduire"; sub.style.color = "#ff1a1a";
            msgScreen.style.backgroundImage = "url('img/broken_end.png')";
        } 
        else if (gameState === 'gameover_arrest') { 
            title.innerText = ""; sub.innerText = "Tu t'es chopper"; sub.style.color = "#1a1aff";
            msgScreen.style.backgroundImage = "url('img/police_end.png')";
        } 
        else if (gameState === 'gameover_drown') { 
            title.innerText = ""; sub.innerText = "T'es tombe a l'eau"; sub.style.color = "#1a8cff";
            msgScreen.style.backgroundImage = "url('img/water_end.png')";
        }
        else if (gameState === 'win') { 
            title.innerText = "GO-FAST RÉUSSI !"; title.style.color = "#00ff66"; sub.innerText = ""; 
            msgScreen.style.backgroundImage = "url('img/win_end.png')";
        }
    }
    requestAnimationFrame(draw);
}

setInterval(update, 1000 / 60); draw();
