const canvas = document.getElementById('gameCanvas');
canvas.width = 1600; 
canvas.height = 960;
canvas.style.width = "1000px"; 
canvas.style.height = "600px";
const ctx = canvas.getContext('2d');

let map, player, civilians, police, helicopters, pedestrians, particles, bullets;
let gameState = 'menu', camera, invulnerabilityTimer;
let escCooldown = 0, wantedLevel = 0;
let creditsY = 0;
let startTime = 0;

let currentSelectedCar = 'gti'; // Présélection par défaut

const creditsText = [
    "Realisateur: Romain Contant", "Developpeur: Romain Contant", "Compositeur: Romain Contant and Tupac",
    "Graphisme: Romain Contant", "Musicien: Romain Contant and Hanz zimmer", "Producteur : Romain Contant",
    "Psychologue : Romain Contant", "Armurerier : Romain Contant", "Activiste : Romain Contant",
    "Financement : Jean Luc Melenchon", "Beta testeur: Nathan et Antoine",
    "Merci a : Kelim, Antoine, Amelie, Nathan, Lucas, Emre le boss, Tom, Asgad",
    "Et surtout merci a", "Romain Contant"
];

const backgrounds = ['url("img/background1.png")', 'url("img/background2.png")', 'url("img/background3.png")', 'url("img/background4.png")', 'url("img/background5.png")', 'url("img/background6.png")', 'url("img/background7.png")', 'url("img/background8.png")'];
let bgInterval = null;

function startBgSlider() {
    const slider = document.getElementById('bg-slider'); slider.style.display = 'block';
    slider.style.backgroundImage = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    if(!bgInterval) {
        bgInterval = setInterval(() => {
            slider.style.backgroundImage = backgrounds[Math.floor(Math.random() * backgrounds.length)];
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

function updateMenuBestScore() {
    let best = localStorage.getItem('gofast_best_time');
    let el = document.getElementById('global-best-score');
    if(el) {
        if(best) {
            let mins = Math.floor(best / 60000).toString().padStart(2, '0');
            let secs = Math.floor((best % 60000) / 1000).toString().padStart(2, '0');
            let ms = (best % 1000).toString().padStart(3, '0');
            el.innerText = `Best Score: ${mins}:${secs}.${ms}`;
        } else {
            el.innerText = `Best Score: --:--.---`;
        }
    }
}

// --- LOGIQUE DE PRÉSÉLECTION DE VÉHICULE ---
window.selectCar = function(carType) {
    currentSelectedCar = carType;
    let cards = document.querySelectorAll('.car-card');
    cards.forEach(c => {
        c.style.boxShadow = 'none';
        c.style.transform = 'scale(1)';
    });
    
    let card = document.getElementById('card-' + carType);
    if(card) {
        card.style.boxShadow = '0 0 25px #00ffcc';
        card.style.transform = 'scale(1.05)';
    }
    
    let bestSpecific = localStorage.getItem('gofast_best_time_' + carType);
    let el = document.getElementById('specific-best-score');
    if(el) {
        if(bestSpecific) {
            let mins = Math.floor(bestSpecific / 60000).toString().padStart(2, '0');
            let secs = Math.floor((bestSpecific % 60000) / 1000).toString().padStart(2, '0');
            let ms = (bestSpecific % 1000).toString().padStart(3, '0');
            el.innerText = `Record Véhicule: ${mins}:${secs}.${ms}`;
        } else {
            el.innerText = `Record Véhicule: --:--.---`;
        }
    }
}

window.confirmCarSelection = function() {
    if(currentSelectedCar) {
        startGame(currentSelectedCar);
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('bottom-hud').style.display = 'none'; 
    document.getElementById('radio-wrapper').style.display = 'none';
    let timerDisplay = document.getElementById('timer-display');
    if(timerDisplay) timerDisplay.style.display = 'none';

    if(id) document.getElementById(id).style.display = 'flex';
    
    if(['main-menu', 'car-select', 'pause-screen', 'message-screen', 'loading-screen'].includes(id)) {
        startBgSlider();
        if(id === 'main-menu') updateMenuBestScore();
        if(id === 'car-select') {
            if(localStorage.getItem('gofast_unlocked_moto') === 'true') document.getElementById('card-moto').style.display = 'block';
            if(localStorage.getItem('gofast_unlocked_tank') === 'true') document.getElementById('card-tank_p').style.display = 'block';
            selectCar(currentSelectedCar); // Présélectionne automatiquement le dernier joué
        }
    } else if (id === null && gameState === 'playing') { 
        stopBgSlider(); 
        if(timerDisplay) timerDisplay.style.display = 'block';
    }
}

function resumeGame() { gameState = 'playing'; showScreen(null); document.getElementById('bottom-hud').style.display = 'flex'; document.getElementById('radio-wrapper').style.display = 'flex'; applyVolumeSettings(); }

startBgSlider();
updateMenuBestScore();

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
    wantedLevel = 0; 
    startTime = Date.now(); 
    
    civilians = []; police = []; helicopters = []; pedestrians = []; particles = []; bullets = [];
    camera = { x: player.x - canvas.width / 2, y: player.y - canvas.height / 2 }; 
    invulnerabilityTimer = 0; 
    gameState = 'playing';
    
    showScreen(null); 
    document.getElementById('bottom-hud').style.display = 'flex';
    document.getElementById('radio-wrapper').style.display = 'block';
    
    currentRadioIndex = Math.floor(Math.random() * radioStations.length);
    if(audioInitialized) {
        menuMusic.pause(); radioStations.forEach(r => { r.audio.loop = true; r.audio.volume = 0; r.audio.play().catch(e=>console.log(e)); });
        applyVolumeSettings(); document.getElementById('radio-display').innerText = `📻 RADIO: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }
}

function rectIntersect(r1, r2) { return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y); }

function triggerGameOver(reason) {
    if (gameState.startsWith('gameover')) return; 
    gameState = 'gameover_' + reason;
    
    radioStations.forEach(r => r.audio.volume = 0);
    showScreen('message-screen'); 
    
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

        if(reason === 'crash') { 
            title.innerText = ""; sub.innerText = "Apprend a conduire"; sub.style.color = "#ff1a1a";
            msgScreen.style.backgroundImage = "url('img/broken_end.png')";
        } 
        else if (reason === 'arrest') { 
            title.innerText = ""; sub.innerText = "Tu t'es chopper"; sub.style.color = "#1a1aff";
            msgScreen.style.backgroundImage = "url('img/police_end.png')";
        } 
        else if (reason === 'drown') { 
            title.innerText = ""; sub.innerText = "T'es tombe a l'eau"; sub.style.color = "#1a8cff";
            msgScreen.style.backgroundImage = "url('img/water_end.png')";
        }
        else if (reason === 'fuel') { 
            title.innerText = ""; sub.innerText = "Panne seche !"; sub.style.color = "#ff5500";
            msgScreen.style.backgroundImage = "url('img/fuel_end.png')";
        }
        else if (reason === 'tank') { 
            title.innerText = ""; sub.innerText = "Ecrase par un tank !"; sub.style.color = "#1e4620";
            msgScreen.style.backgroundImage = "url('img/tank_end.png')";
        }
    }
}

function triggerWin() {
    if (gameState === 'win' || gameState === 'credits') return;
    
    let finalTime = Date.now() - startTime;
    
    // Sauvegarde score global
    let best = localStorage.getItem('gofast_best_time');
    if (!best || finalTime < parseInt(best)) {
        localStorage.setItem('gofast_best_time', finalTime.toString());
    }

    // Sauvegarde score de ce véhicule spécifique
    let bestSpecific = localStorage.getItem('gofast_best_time_' + player.carType);
    if (!bestSpecific || finalTime < parseInt(bestSpecific)) {
        localStorage.setItem('gofast_best_time_' + player.carType, finalTime.toString());
    }

    if (player.carType === 'tank_p') {
        gameState = 'credits';
        creditsY = canvas.height;
        radioStations.forEach(r => r.audio.volume = 0);
        menuMusic.play().catch(e=>e);
    } else {
        if (player.carType === 'moto') localStorage.setItem('gofast_unlocked_tank', 'true');
        else localStorage.setItem('gofast_unlocked_moto', 'true');
        
        gameState = 'win';
        radioStations.forEach(r => r.audio.volume = 0);
        showScreen('message-screen');
        
        let title = document.getElementById('msg-title'); 
        let sub = document.getElementById('msg-sub');
        let msgScreen = document.getElementById('message-screen');
        
        if(msgScreen) {
            msgScreen.style.backgroundSize = "cover";
            msgScreen.style.backgroundPosition = "center";
            msgScreen.style.backgroundColor = "rgba(0,0,0,0.9)"; 
            msgScreen.style.backgroundImage = "url('img/win_end.png')";
        }
        if(title && sub) {
            title.style.textShadow = "3px 3px 6px black";
            sub.style.textShadow = "2px 2px 4px black";
            sub.style.fontSize = "30px";
            sub.style.fontWeight = "bold";
            title.innerText = "GO-FAST RÉUSSI !"; title.style.color = "#00ff66"; 
            sub.innerText = "Nouveau vehicule debloque au menu !"; 
        }
    }
}

function applyDamage(amount) {
    if (invulnerabilityTimer > 0) return;
    
    player.health -= amount;
    invulnerabilityTimer = 42; 
    player.speed *= 0.5; 
    for(let i=0; i<10; i++) particles.push(new Particle(player.x, player.y, '#ff3300'));
    
    let now = Date.now();
    player.hitTimestamps.push(now);
    player.hitTimestamps = player.hitTimestamps.filter(t => now - t <= 5000);
    
    if (player.hitTimestamps.length >= 3 && !player.nitroUnlocked) {
        player.nitroUnlocked = true;
        player.nitro = 100;
        for(let i=0; i<40; i++) particles.push(new Particle(player.x, player.y, '#00e5ff'));
    }

    if(player.health <= 0) triggerGameOver('crash');
}

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
        let py = player.y + (player.vx > 0 ? 800 : -800);
        let type = (wantedLevel >= 4) ? 3 : (wantedLevel === 3 ? 2 : 1);
        police.push(new Police(px, py, type, wantedLevel));
    }
}

function drawMinimap() {
    let mmSize = 250; let mmRadius = mmSize / 2;
    let mmX = 40 + mmRadius; let mmY = 105 + mmRadius; 
    let viewRadius = 6000; let scale = mmSize / (viewRadius * 2);

    ctx.save();
    ctx.beginPath(); ctx.arc(mmX, mmY, mmRadius, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    
    ctx.fillStyle = 'rgba(15, 15, 25, 0.85)';
    ctx.fillRect(mmX - mmRadius, mmY - mmRadius, mmSize, mmSize);

    function drawDot(worldX, worldY, color, size, isCircle = false) {
        let dx = worldX - player.x; let dy = worldY - player.y;
        if(Math.hypot(dx, dy) < viewRadius) {
            ctx.fillStyle = color;
            if (isCircle) {
                ctx.beginPath(); ctx.arc(mmX + dx * scale, mmY + dy * scale, size/2, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillRect(mmX + dx * scale - size/2, mmY + dy * scale - size/2, size, size);
            }
        }
    }

    for(let y=0; y<map.rows; y++) {
        for(let x=0; x<map.cols; x++) {
            if(map.grid[y][x] === 2) drawDot(x * map.tileSize, y * map.tileSize, '#1a8cff', map.tileSize * scale);
            if(map.grid[y][x] === 5) drawDot(x * map.tileSize, y * map.tileSize, '#f1c40f', map.tileSize * scale); 
            if(map.grid[y][x] === 7) drawDot(x * map.tileSize, y * map.tileSize, '#00ffcc', map.tileSize * scale);
            if(map.grid[y][x] === 8) drawDot(x * map.tileSize, y * map.tileSize, '#3498db', map.tileSize * scale);
        }
    }
    for(let f of map.fuels) if(!f.collected) drawDot(f.x, f.y, '#e67e22', 8, true);
    for(let k of map.keys) if(!k.collected) drawDot(k.x, k.y, '#f1c40f', 10, true);
    for(let p of police) drawDot(p.x, p.y, '#e74c3c', 8, true);
    for(let h of helicopters) drawDot(h.x, h.y, '#9b59b6', 10, true);

    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(mmX, mmY, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(mmX, mmY); ctx.lineTo(mmX + Math.cos(player.angle) * 14, mmY + Math.sin(player.angle) * 14); ctx.stroke();

    ctx.restore(); 

    ctx.beginPath(); ctx.arc(mmX, mmY, mmRadius, 0, Math.PI * 2);
    ctx.lineWidth = 4; ctx.strokeStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 10;
    ctx.stroke(); ctx.shadowBlur = 0; 
}

function update() {
    try {
        if(escCooldown > 0) escCooldown--;
        if(typeof keys !== 'undefined' && keys.esc && escCooldown <= 0) { escCooldown = 20; if(gameState === 'playing') { gameState = 'paused'; showScreen('pause-screen'); radioStations.forEach(r=>r.audio.volume=0); return; } }
        if(gameState !== 'playing') return;
        if(typeof keys === 'undefined') return;
        
        let currentTime = Date.now() - startTime;
        let timerNode = document.getElementById('timer-display');
        if (timerNode) {
            let mins = Math.floor(currentTime / 60000).toString().padStart(2, '0');
            let secs = Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0');
            let ms = (currentTime % 1000).toString().padStart(3, '0');
            timerNode.innerText = `TIME: ${mins}:${secs}.${ms}`;
        }
        
        if(invulnerabilityTimer > 0) invulnerabilityTimer--;
        if(radioCooldown > 0) radioCooldown--;

        if(keys.enter && radioCooldown <= 0) {
            radioCooldown = 22; currentRadioIndex = (currentRadioIndex + 1) % radioStations.length; applyVolumeSettings();
            document.getElementById('radio-display').innerText = `📻 RADIO: ${radioStations[currentRadioIndex].name} [ENTER]`;
        }

        if (keys.up || keys.down || keys.left || keys.right || (keys.nitro && player.nitroUnlocked)) player.fuel -= keys.nitro ? player.fuelDrainRate * 1.8 : player.fuelDrainRate;
        
        if(player.fuel <= 0) { 
            player.fuel = 0; 
            player.baseMaxSpeed = 0; 
            if (Math.abs(player.speed) < 0.1 && player.health > 0) {
                triggerGameOver('fuel');
            }
        }

        let currentTile = map.getTileTypeAt(player.x, player.y);

        player.underHeliSpotlight = false;
        for(let h of helicopters) {
            h.updateAI(player);
            if(Math.hypot(player.x - h.x, player.y - h.y) < 200) player.underHeliSpotlight = true;
        }

        if (keys.shoot && player.carType === 'tank_p' && player.shootCooldown <= 0) {
            bullets.push(new Bullet(player.x, player.y, player.angle, 'player'));
            player.shootCooldown = 40; 
        }

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

        if (currentTile === 2) { triggerGameOver('drown'); return; }
        
        let nextTileX = map.getTileTypeAt(player.x + player.vx * 1.5, player.y);
        let nextTileY = map.getTileTypeAt(player.x, player.y + player.vy * 1.5);
        if([0, 5, 6, 8].includes(nextTileX)) { player.vx = 0; } 
        if([0, 5, 6, 8].includes(nextTileY)) { player.vy = 0; }

        let pBounds = player.getBounds();
        for(let f of map.fuels) { if(!f.collected && Math.hypot(player.x - f.x, player.y - f.y) < 50) { f.collected = true; player.fuel = Math.min(100, player.fuel + f.amount); } }
        
        for(let w of map.wrenches) {
            if(!w.collected && Math.hypot(player.x - w.x, player.y - w.y) < 40) {
                w.collected = true;
                player.fuel = 100; // GARAGE REPARE ET FAIT LE PLEIN
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
            if (b.life <= 0) continue;
            if (b.owner === 'player') {
                let hit = false;
                for (let c of civilians) {
                    if (!c.dead && rectIntersect(c.getBounds(), b.getBounds())) {
                        c.dead = true; c.vx = 0; c.vy = 0; b.life = 0; hit = true;
                        for(let i=0; i<20; i++) particles.push(new Particle(c.x, c.y, '#ff6600'));
                        break;
                    }
                }
                if (!hit) {
                    for (let p of police) {
                        if (!p.dead && rectIntersect(p.getBounds(), b.getBounds())) {
                            if (p.type !== 3) {
                                p.dead = true; p.vx = 0; p.vy = 0;
                                for(let i=0; i<25; i++) particles.push(new Particle(p.x, p.y, '#ff3300'));
                            } else {
                                for(let i=0; i<5; i++) particles.push(new Particle(b.x, b.y, '#ffff00'));
                            }
                            b.life = 0; hit = true;
                            break;
                        }
                    }
                }
            } else {
                if (rectIntersect(pBounds, b.getBounds())) {
                    b.life = 0; applyDamage(2);
                }
            }
        }

        for(let c of civilians) {
            if(rectIntersect(pBounds, c.getBounds())) {
                if(!c.dead) {
                    wantedLevel = Math.max(wantedLevel, 1); 
                    c.dead = true; c.vx = 0; c.vy = 0;
                    if (player.carType !== 'tank_p') {
                        applyDamage(1);
                    } else {
                        for(let i=0; i<20; i++) particles.push(new Particle(c.x, c.y, '#ff6600'));
                    }
                }
                let dx = player.x - c.x; let dy = player.y - c.y; let dist = Math.hypot(dx, dy);
                if (dist > 0) { 
                    player.vx += (dx / dist) * 2; player.vy += (dy / dist) * 2; 
                    c.vx -= (dx / dist) * 2; c.vy -= (dy / dist) * 2;
                }
            }
        }

        let underArrest = false;
        for(let p of police) {
            if (!p.dead && wantedLevel === 2 && Math.hypot(player.x - p.x, player.y - p.y) < 300 && Math.random() < 0.01) alertOppositeCop();

            if(rectIntersect(pBounds, p.getBounds())) {
                if(!p.dead) {
                    if(p.type === 3 && player.carType !== 'tank_p') {
                        player.health = 0; 
                        triggerGameOver('tank'); 
                        break;
                    }
                    if (player.carType === 'tank_p') {
                        p.dead = true; p.vx = 0; p.vy = 0;
                        for(let i=0; i<20; i++) particles.push(new Particle(p.x, p.y, '#ff3300'));
                    } else {
                        applyDamage(1);
                    }
                }

                let dx = player.x - p.x; let dy = player.y - p.y; let dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    player.vx += (dx / dist) * 3; player.vy += (dy / dist) * 3;
                    p.vx -= (dx / dist) * 3; p.vy -= (dy / dist) * 3;
                }
                player.speed *= 0.70; 
                if(!p.dead) p.speed *= 0.50;
                
                if(!p.dead && Math.abs(player.speed) < 2.0 && player.carType !== 'tank_p') underArrest = true; 
            }
        }
        
        if(underArrest) { 
            player.arrestTimer++; 
            if(player.arrestTimer > 100) triggerGameOver('arrest'); 
        } else { 
            player.arrestTimer = Math.max(0, player.arrestTimer - 2); 
        }

        if(player.keysCollected >= player.targetCargo) {
            triggerWin();
        }

        camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2;

        let healthNode = document.getElementById('health');
        if (healthNode) healthNode.innerText = `HULL: ${player.health}/${player.maxHealth}`;
        let fuelNode = document.getElementById('fuel');
        if (fuelNode) fuelNode.innerText = `FUEL: ${Math.ceil(player.fuel)}%`;
        let nitroNode = document.getElementById('nitro');
        if (nitroNode) {
            if(player.carType === 'tank_p') {
                nitroNode.innerText = `SHOOT: [RIGHT CLICK]`;
                nitroNode.style.color = '#ffcc00';
            } else if(player.nitroUnlocked) {
                nitroNode.innerText = `NITRO: ${Math.ceil(player.nitro)}% [RIGHT CLICK]`;
                nitroNode.style.color = '#00e5ff';
            } else {
                nitroNode.innerText = `NITRO: LOCKED`;
                nitroNode.style.color = '#555';
            }
        }
        let cargoNode = document.getElementById('cargo');
        if (cargoNode) cargoNode.innerText = `CARGO: ${player.keysCollected}/${player.targetCargo}`;
        let wantedNode = document.getElementById('wanted-display');
        if (wantedNode) wantedNode.innerText = wantedLevel > 0 ? `WANTED: ${'★'.repeat(Math.min(5, wantedLevel))}` : `WANTED: CHILL MODE 😎`;

    } catch (e) { console.error("Erreur Update: ", e); }
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
        else if(gameState === 'credits') {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00ffcc';
            ctx.font = 'bold 40px Courier';
            ctx.textAlign = 'center';
            ctx.fillText("Bien joue, t'es un vrai bandit", canvas.width/2, 80);
            
            ctx.fillStyle = 'white';
            ctx.font = '30px Courier';
            for(let i=0; i<creditsText.length; i++) {
                ctx.fillText(creditsText[i], canvas.width/2, creditsY + i*50);
            }
            creditsY -= 1.5; 
        }
    } catch (e) {
        console.error("Erreur Draw: ", e);
    }
    requestAnimationFrame(draw);
}

window.addEventListener('keydown', (e) => {
    if(e.key.toLowerCase() === 'p' && gameState === 'playing') {
        let exportCanvas = document.createElement('canvas');
        exportCanvas.width = map.cols * map.tileSize; exportCanvas.height = map.rows * map.tileSize;
        let eCtx = exportCanvas.getContext('2d');
        let oldW = canvas.width; let oldH = canvas.height;
        canvas.width = exportCanvas.width; canvas.height = exportCanvas.height;
        map.draw(eCtx, 0, 0);
        canvas.width = oldW; canvas.height = oldH;
        let link = document.createElement('a');
        link.download = 'GoFast_Map_Secrete.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }
});

setInterval(update, 1000 / 60); draw();
