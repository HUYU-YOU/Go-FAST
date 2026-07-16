const canvas = document.getElementById('gameCanvas');

// --- TECHNIQUE DE DEZOOM ---
// On augmente la résolution interne du jeu pour voir plus loin
canvas.width = 1600; 
canvas.height = 960;
canvas.style.width = "1000px"; // L'affichage web reste le même
canvas.style.height = "600px";

const ctx = canvas.getContext('2d');

let map, player, civilians, police, helicopters, pedestrians, particles, bullets;
let gameState = 'menu', camera, invulnerabilityTimer;
let escCooldown = 0;
let wantedLevel = 0;
let globalJSError = "";

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
    { name: "FunnyRadio", audio: new Audio('audio/FunnyRadio.mp3') },
    { name: "MAMACITA.FM", audio: new Audio('audio/MAMACITA.FM.mp3') },
    { name: "NightCarCrash", audio: new Audio('audio/NightCarCrash.mp3') },
    { name: "OLDSchoolFM", audio: new Audio('audio/OLDSchoolFM.mp3') },
    { name: "Skyrap", audio: new Audio('audio/Skyrap.mp3') },
    { name: "TahLaBrazil", audio: new Audio('audio/TahLaBrazil.ontadit.mp3') },
    { name: "Agressi", audio: new Audio('audio/agressi.fm.mp3') },
    { name: "Cyberponk", audio: new Audio('audio/cyberponk.fm.mp3') },
    { name: "EpicUrien", audio: new Audio('audio/epicUrien.radio.mp3') }
];

window.addEventListener('keydown', (e) => {
    if(e.key.toLowerCase() === 'p' && gameState === 'playing') {
        console.log("📸 Capture satellite de la map en cours (le jeu peut figer 2 secondes)...");
        
        // 1. Création d'un canvas géant en mémoire (10 000 x 10 000 pixels)
        let exportCanvas = document.createElement('canvas');
        exportCanvas.width = map.cols * map.tileSize;
        exportCanvas.height = map.rows * map.tileSize;
        let eCtx = exportCanvas.getContext('2d');
        
        // 2. Astuce : on trompe temporairement la fonction draw() en modifiant les variables globales
        let oldW = canvas.width;
        let oldH = canvas.height;
        canvas.width = exportCanvas.width;
        canvas.height = exportCanvas.height;
        
        // 3. On dessine toute la map (caméra fixée à 0,0) sur notre canvas géant
        map.draw(eCtx, 0, 0);
        
        // 4. On remet la vraie taille du canvas pour ne pas casser le jeu
        canvas.width = oldW;
        canvas.height = oldH;
        
        // 5. Création et déclenchement automatique du téléchargement
        let link = document.createElement('a');
        link.download = 'GoFast_Map_Secrete.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
        
        console.log("✅ Map sauvegardée avec succès !");
    }
});

window.addEventListener('click', () => {
    if(!audioInitialized) {
        audioInitialized = true; applyVolumeSettings();
        if(gameState === 'menu' || gameState === 'car-select') menuMusic.play().catch(e=>console.log(e));
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
    let progress = 0; 
    let loadingBar = document.getElementById('loading-bar');
    let loadingText = document.getElementById('loading-text');
    
    if(loadingBar) loadingBar.style.width = '0%';
    if(loadingText) loadingText.innerText = '0%';

    let loadInterval = setInterval(() => {
        progress += (Math.random() * 2 + 2); 
        if(progress >= 100) {
            progress = 100; clearInterval(loadInterval);
            setTimeout(() => { finishStartGame(carType); }, 600); 
        }
        if(loadingBar) loadingBar.style.width = progress + '%';
        if(loadingText) loadingText.innerText = Math.floor(progress) + '%';
    }, 150);
}

function finishStartGame(carType) {
    map = new CityMap(); 
    
    let px = map.bankSpawn.x * map.tileSize + map.tileSize / 2; 
    let py = map.bankSpawn.y * map.tileSize + map.tileSize / 2;
    
    let searchRadius = 1;
    let foundRoad = false;
    while(searchRadius <= 10 && !foundRoad) {
        for(let dx = -searchRadius; dx <= searchRadius; dx++) {
            for(let dy = -searchRadius; dy <= searchRadius; dy++) {
                let nx = map.bankSpawn.x + dx;
                let ny = map.bankSpawn.y + dy;
                if(nx >= 0 && nx < map.cols && ny >= 0 && ny < map.rows) {
                    if(map.grid[ny][nx] === 1) { 
                        px = nx * map.tileSize + map.tileSize / 2;
                        py = ny * map.tileSize + map.tileSize / 2;
                        foundRoad = true; break;
                    }
                }
            }
            if(foundRoad) break;
        }
        searchRadius++;
    }

    player = new Player(px, py, carType);
    player.keysCollected = 0;
    wantedLevel = 0; 
    
    civilians = []; police = []; helicopters = []; pedestrians = []; particles = []; bullets = [];
    camera = { x: 0, y: 0 }; 
    invulnerabilityTimer = 0; 
    gameState = 'playing';
    
    showScreen(null); 
    document.getElementById('bottom-hud').style.display = 'flex';
    document.getElementById('radio-wrapper').style.display = 'block';
    
    currentRadioIndex = 0; 
    if(audioInitialized) {
        menuMusic.pause(); radioStations.forEach(r => { r.audio.loop = true; r.audio.volume = 0; r.audio.play().catch(e=>console.log(e)); });
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
    
    if (wantedLevel > 0) {
        let maxCops = (wantedLevel === 1) ? 1 : ((wantedLevel === 2) ? 3 : (wantedLevel === 3 ? 5 : wantedLevel * 2 - 1));

        if(police.length < maxCops) {
            let px, py;
            let spawnFound = false;
            
            if(wantedLevel >= 3 && Math.random() < 0.5) {
                px = player.x + (Math.random() > 0.5 ? 500 : -500); py = player.y + (Math.random() > 0.5 ? 500 : -500);
            } else {
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
            }

            if(spawnFound || map.getTileTypeAt(px, py) === 1) {
                let type = 1;
                if (wantedLevel === 3 && Math.random() < 0.5) type = 2;
                if (wantedLevel === 4) type = (Math.random() < 0.3) ? 3 : 2; 
                if (wantedLevel >= 5) type = (Math.random() < 0.5) ? 3 : 2; 
                police.push(new Police(px, py, type, wantedLevel));
            }
        }
        if (wantedLevel >= 3 && helicopters.length < 1) {
            helicopters.push(new Helicopter(player.x - 1200, player.y - 1200));
        }
    }
}

function alertOppositeCop() {
    if(wantedLevel >= 2) {
        let px = player.x + (player.vx > 0 ? 800 : -800); 
        let py = player.y + (player.vy > 0 ? 800 : -800);
        let type = (wantedLevel >= 4) ? 3 : (wantedLevel === 3 ? 2 : 1);
        police.push(new Police(px, py, type, wantedLevel));
    }
}

function drawMinimap() {
    let mmSize = 250; let mmX = 30; let mmY = 105; 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(mmX, mmY, mmSize, mmSize);
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 3; ctx.strokeRect(mmX, mmY, mmSize, mmSize);
    let viewRadius = 6000; let scale = mmSize / (viewRadius * 2);

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
            if(map.grid[y][x] === 7) drawDot(x * map.tileSize, y * map.tileSize, '#00ffcc', map.tileSize * scale);
            if(map.grid[y][x] === 8) drawDot(x * map.tileSize, y * map.tileSize, '#1a1aff', map.tileSize * scale);
        }
    }
    for(let f of map.fuels) if(!f.collected) drawDot(f.x, f.y, '#ff5500', 6);
    for(let k of map.keys) if(!k.collected) drawDot(k.x, k.y, '#ffd700', 8);
    
    for(let p of police) drawDot(p.x, p.y, 'red', 6);
    for(let h of helicopters) drawDot(h.x, h.y, 'magenta', 7);

    ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.arc(mmX + mmSize/2, mmY + mmSize/2, 6, 0, Math.PI*2); ctx.fill();
}

function update() {
    try {
        if(escCooldown > 0) escCooldown--;
        if(typeof keys !== 'undefined' && keys.esc && escCooldown <= 0) { escCooldown = 20; if(gameState === 'playing') { gameState = 'paused'; showScreen('pause-screen'); radioStations.forEach(r=>r.audio.volume=0); return; } }
        if(gameState !== 'playing') return;
        if(typeof keys === 'undefined') return;
        
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
        let w = document.getElementById('heli-warning');
        if(w) w.style.display = player.underHeliSpotlight ? 'block' : 'none';

        player.updatePlayer(keys, currentTile); spawnEntities();
        
        for(let c of civilians) c.updateAI(map); 
        for(let p of police) p.updateAI(player, map, bullets); 
        for(let ped of pedestrians) ped.update(map);
        for(let pt of particles) pt.update();
        for(let b of bullets) b.update();

        civilians = civilians.filter(c => Math.abs(c.x - player.x) < 2200 && Math.abs(c.y - player.y) < 2200);
        police = police.filter(p => !p.dead && Math.abs(p.x - player.x) < 2200 && Math.abs(p.y - player.y) < 2200);
        pedestrians = pedestrians.filter(p => p.alive && Math.abs(p.x - player.x) < 1800);
        particles = particles.filter(p => p.life > 0);
        bullets = bullets.filter(b => b.life > 0);

        if (currentTile === 2) { gameState = 'gameover_drown'; return; }
        
        let nextTileX = map.getTileTypeAt(player.x + player.vx * 1.5, player.y);
        let nextTileY = map.getTileTypeAt(player.x, player.y + player.vy * 1.5);
        if([0, 5, 6, 8].includes(nextTileX)) { player.vx = 0; } 
        if([0, 5, 6, 8].includes(nextTileY)) { player.vy = 0; }

        let pBounds = player.getBounds();
        for(let f of map.fuels) { if(!f.collected && Math.hypot(player.x - f.x, player.y - f.y) < 50) { f.collected = true; player.fuel = Math.min(100, player.fuel + f.amount); } }
        
        for(let w of map.wrenches) {
            if(!w.collected && Math.hypot(player.x - w.x, player.y - w.y) < 40) {
                w.collected = true;
                player.health = Math.min(player.maxHealth, player.health + 1);
                for(let i=0; i<15; i++) particles.push(new Particle(player.x, player.y, '#00ffcc'));
            }
        }

        for(let k of map.keys) { 
            if(!k.collected && Math.hypot(player.x - k.x, player.y - k.y) < 50) { 
                k.collected = true; 
                player.keysCollected++; 
                wantedLevel = player.keysCollected; 
            } 
        }

        for(let ped of pedestrians) {
            if(ped.alive && Math.hypot(player.x - ped.x, player.y - ped.y) < 25) {
                ped.alive = false; 
                wantedLevel = Math.max(wantedLevel, 1); 
                for(let i=0; i<15; i++) particles.push(new Particle(ped.x, ped.y, '#cc0000'));
            }
        }

        for(let b of bullets) {
            if (rectIntersect(pBounds, b.getBounds())) {
                b.life = 0;
                if (invulnerabilityTimer <= 0) {
                    player.health -= 2; 
                    invulnerabilityTimer = 42; player.speed *= 0.5; 
                    for(let i=0; i<10; i++) particles.push(new Particle(player.x, player.y, '#ff3300'));
                    if(player.health <= 0) gameState = 'gameover_crash';
                }
            }
        }

        for(let c of civilians) {
            if(rectIntersect(pBounds, c.getBounds())) {
                wantedLevel = Math.max(wantedLevel, 1); 

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
            if (wantedLevel === 2 && Math.hypot(player.x - p.x, player.y - p.y) < 300 && Math.random() < 0.01) {
                alertOppositeCop();
            }

            if(rectIntersect(pBounds, p.getBounds())) {
                if(p.type === 3) {
                    player.health = 0;
                    gameState = 'gameover_crash';
                    break;
                }

                let dx = player.x - p.x; let dy = player.y - p.y; let dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    player.vx += (dx / dist) * 3; player.vy += (dy / dist) * 3;
                    let pNextT = map.getTileTypeAt(p.x - (dx/dist)*3, p.y - (dy/dist)*3);
                    if(![0, 5, 6, 7, 2].includes(pNextT)) { 
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
        
        let aw = document.getElementById('arrest-warning');
        if(underArrest) { 
            player.arrestTimer++; if(aw) aw.style.display = 'block'; 
            if(player.arrestTimer > 100) gameState = 'gameover_arrest'; 
        } else { 
            player.arrestTimer = Math.max(0, player.arrestTimer - 2); 
            if(player.arrestTimer === 0 && aw) aw.style.display = 'none'; 
        }

        if(player.keysCollected >= 5) gameState = 'win';

        camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2;
        if (player.health <= 1 && Math.random() < 0.3) particles.push(new Particle(player.x, player.y, '#333'));

        let healthNode = document.getElementById('health');
        if (healthNode) healthNode.innerText = `HULL: ${player.health}/${player.maxHealth}`;
        let fuelNode = document.getElementById('fuel');
        if (fuelNode) fuelNode.innerText = `FUEL: ${Math.ceil(player.fuel)}%`;
        let nitroNode = document.getElementById('nitro');
        if (nitroNode) nitroNode.innerText = `NITRO: ${Math.ceil(player.nitro)}% [SPACE]`;
        let cargoNode = document.getElementById('cargo');
        if (cargoNode) cargoNode.innerText = `CARGO: ${player.keysCollected}/5`;
        let wantedNode = document.getElementById('wanted-display');
        if (wantedNode) wantedNode.innerText = wantedLevel > 0 ? `WANTED: ${'★'.repeat(Math.min(5, wantedLevel))}` : `WANTED: CHILL MODE 😎`;

    } catch (e) {
        console.error("Erreur Update: ", e);
    }
}

function draw() {
    try {
        if(gameState === 'playing') {
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            map.draw(ctx, camera.x, camera.y);
            for(let pt of particles) pt.draw(ctx, camera.x, camera.y);
            for(let ped of pedestrians) ped.draw(ctx, camera.x, camera.y);
            for(let c of civilians) c.draw(ctx, camera.x, camera.y); 
            for(let p of police) p.draw(ctx, camera.x, camera.y);
            for(let b of bullets) b.draw(ctx, camera.x, camera.y);
            
            if(invulnerabilityTimer === undefined || invulnerabilityTimer % 10 < 5) {
                player.draw(ctx, camera.x, camera.y);
            }
            
            for(let h of helicopters) h.draw(ctx, camera.x, camera.y);
            
            drawMinimap();
        }
        
        if(gameState.startsWith('gameover') || gameState === 'win') {
            showScreen('message-screen'); 
            radioStations.forEach(r=>r.audio.volume=0);
            
            let title = document.getElementById('msg-title'); 
            let sub = document.getElementById('msg-sub');
            let msgScreen = document.getElementById('message-screen');
            
            if(msgScreen) {
                msgScreen.style.backgroundSize = "cover";
                msgScreen.style.backgroundPosition = "center";
                msgScreen.style.backgroundColor = "rgba(0,0,0,0.9)"; 
            }
            
            if(title && sub) {
                title.style.textShadow = "3px 3px 6px black";
                sub.style.textShadow = "2px 2px 4px black";
                sub.style.fontSize = "30px";
                sub.style.fontWeight = "bold";

                if(gameState === 'gameover_crash') { 
                    title.innerText = ""; sub.innerText = "Apprends a conduire SALOPE"; sub.style.color = "#ff1a1a";
                    msgScreen.style.backgroundImage = "url('img/broken_end.png')";
                } 
                else if (gameState === 'gameover_arrest') { 
                    title.innerText = ""; sub.innerText = "Tu t'es fait chopper, CHEHHHH"; sub.style.color = "#1a1aff";
                    msgScreen.style.backgroundImage = "url('img/police_end.png')";
                } 
                else if (gameState === 'gameover_drown') { 
                    title.innerText = ""; sub.innerText = "T'es tombe a l'eau MEC"; sub.style.color = "#1a8cff";
                    msgScreen.style.backgroundImage = "url('img/water_end.png')";
                }
                else if (gameState === 'win') { 
                    title.innerText = "Tout comme Tom, t'es riche, MEC"; title.style.color = "#00ff66"; sub.innerText = ""; 
                    msgScreen.style.backgroundImage = "url('img/win_end.png')";
                }
            }
        }
    } catch (e) {
        console.error("Erreur Draw: ", e);
        ctx.fillStyle = "red"; ctx.font = "24px Courier";
        ctx.fillText("ERREUR FATALE (F12 pour voir la console)", 20, 100);
    }
    requestAnimationFrame(draw);
}

setInterval(update, 1000 / 60); draw();
