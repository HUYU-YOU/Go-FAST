const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let map, player, civilians, police, gameState = 'menu', camera, invulnerabilityTimer;
let globalVolume = 0.5;
let isMuted = false;
let audioInitialized = false;

// --- AUDIO TRACKS ---
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
let currentRadioIndex = 0;
let radioCooldown = 0;
let escCooldown = 0;

window.addEventListener('click', () => {
    if(!audioInitialized) {
        audioInitialized = true;
        applyVolumeSettings();
        if(gameState === 'menu' || gameState === 'car-select' || gameState === 'options') menuMusic.play().catch(e=>Math.abs(0));
    }
});

function changeGlobalVolume(val) {
    globalVolume = parseFloat(val);
    document.getElementById('volume-text').innerText = Math.round(globalVolume * 100) + "%";
    if(!isMuted) applyVolumeSettings();
}

function adjustVolume(amount) {
    globalVolume = Math.max(0, Math.min(1, globalVolume + amount));
    document.getElementById('volume-slider').value = globalVolume;
    document.getElementById('volume-text').innerText = Math.round(globalVolume * 100) + "%";
    if(globalVolume > 0) { isMuted = false; document.getElementById('mute-btn').innerText = "🔊"; }
    applyVolumeSettings();
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('mute-btn').innerText = isMuted ? "❌" : "🔊";
    applyVolumeSettings();
}

function applyVolumeSettings() {
    let targetVol = isMuted ? 0 : globalVolume;
    menuMusic.volume = targetVol;
    radioStations.forEach((r, idx) => {
        if(gameState === 'playing' && idx === currentRadioIndex) r.audio.volume = targetVol;
        else r.audio.volume = 0;
    });
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('bottom-hud').style.display = 'none';
    document.getElementById('radio-wrapper').style.display = 'none';
    if(id) document.getElementById(id).style.display = 'flex';
}

function resumeGame() { gameState = 'playing'; showScreen(null); document.getElementById('bottom-hud').style.display = 'flex'; document.getElementById('radio-wrapper').style.display = 'flex'; applyVolumeSettings(); }

function startGame(carType) {
    map = new GameMap(); player = new Player(200, map.height / 2, carType);
    civilians = []; police = []; camera = { x: 0, y: 0 }; invulnerabilityTimer = 0;
    gameState = 'playing';
    showScreen(null);
    document.getElementById('bottom-hud').style.display = 'flex';
    document.getElementById('radio-wrapper').style.display = 'flex';

    if(audioInitialized) {
        menuMusic.pause();
        radioStations.forEach(r => { r.audio.loop = true; r.audio.volume = 0; r.audio.play().catch(e=>Math.abs(0)); });
        applyVolumeSettings();
        document.getElementById('radio-display').innerText = `📻 RADIO: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }
}

function rectIntersect(r1, r2) { return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y); }

function spawnEntities() {
    let cityLevel = Math.floor(player.x / map.cityWidth) + 1;
    if(civilians.length < 14) civilians.push(new Civilian(player.x + (Math.random() > 0.5 ? 950 : -950), 120 + Math.random() * 760));
    if(police.length < cityLevel * 2) {
        let type = 1; if(cityLevel >= 2 && Math.random() < 0.28) type = 2; if(cityLevel >= 3 && Math.random() < 0.18) type = 3;
        police.push(new Police(player.x + (Math.random() > 0.5 ? 950 : -950), player.y + (Math.random() > 0.5 ? 500 : -500), type));
    }
}

function update() {
    if(escCooldown > 0) escCooldown--;
    if(keys.esc && escCooldown <= 0) {
        escCooldown = 20;
        if(gameState === 'playing') { gameState = 'paused'; showScreen('pause-screen'); radioStations.forEach(r=>r.audio.volume=0); return; }
    }
    if(gameState !== 'playing') return;
    if(invulnerabilityTimer > 0) invulnerabilityTimer--;
    if(radioCooldown > 0) radioCooldown--;

    if(keys.enter && radioCooldown <= 0) {
        radioCooldown = 22;
        currentRadioIndex = (currentRadioIndex + 1) % radioStations.length;
        applyVolumeSettings();
        document.getElementById('radio-display').innerText = `📻 RADIO: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }

    if (keys.up || keys.down || keys.left || keys.right || keys.nitro) player.fuel -= keys.nitro ? player.fuelDrainRate * 1.8 : player.fuelDrainRate;
    if(player.fuel <= 0) { player.fuel = 0; player.baseMaxSpeed = 0; }

    player.updatePlayer(keys); spawnEntities();
    for(let c of civilians) c.update(); for(let p of police) p.updateAI(player);

    civilians = civilians.filter(c => Math.abs(c.x - player.x) < 1600);
    police = police.filter(p => Math.abs(p.x - player.x) < 1600);

    let pBounds = player.getBounds(); let currentCity = Math.floor(player.x / map.cityWidth);
    if(player.y < 20) { player.y = 20; player.vy = 0; } if(player.y > map.height - 20) { player.y = map.height - 20; player.vy = 0; }

    for(let b of map.buildings) { if(rectIntersect(pBounds, b)) { player.vx *= -0.8; player.vy *= -0.8; player.speed *= -0.4; player.x += player.vx * 2; player.y += player.vy * 2; } }
    for(let f of map.fuels) { if(!f.collected && rectIntersect(pBounds, f)) { f.collected = true; player.fuel = Math.min(100, player.fuel + f.amount); } }
    for(let k of map.keys) { if(!k.collected && k.id === currentCity && rectIntersect(pBounds, k)) { k.collected = true; player.currentKey = true; } }
    for(let g of map.gates) { if(g.active && rectIntersect(pBounds, g)) { if(player.currentKey && g.id === currentCity) { g.active = false; player.currentKey = false; } else { player.vx = -6; player.speed = -5; player.x -= 12; } } }

    for(let c of civilians) {
        if(rectIntersect(pBounds, c.getBounds()) && invulnerabilityTimer <= 0) {
            player.health--; invulnerabilityTimer = 60; player.speed *= -0.5; player.vx *= -0.7;
            if(player.health <= 0) gameState = 'gameover_crash';
        } else {
            if(!c.nearMissChecked && Math.sqrt(Math.pow(player.x-c.x,2)+Math.pow(player.y-c.y,2)) < 70) { player.nitro = Math.min(100, player.nitro + 15); c.nearMissChecked = true; }
        }
    }

    let underArrest = false;
    for(let p of police) {
        if(rectIntersect(pBounds, p.getBounds())) {
            if(p.type === 3) gameState = 'gameover_crash';
            player.speed *= 0.82; player.vx *= 0.82; if(Math.abs(player.speed) < 0.6) underArrest = true;
        }
    }
    if(underArrest) { player.arrestTimer++; document.getElementById('arrest-warning').style.display = 'block'; if(player.arrestTimer > 120) gameState = 'gameover_arrest'; } 
    else { player.arrestTimer = Math.max(0, player.arrestTimer - 2); if(player.arrestTimer === 0) document.getElementById('arrest-warning').style.display = 'none'; }

    if(player.x > map.totalWidth - 60) gameState = 'win';
    camera.x = player.x - canvas.width / 3.8; camera.y = player.y - canvas.height / 2;

    // UPDATE DYNAMIC HUDS
    let cityLvl = Math.floor(player.x / map.cityWidth) + 1; if(cityLvl > 5) cityLvl = 5;
    document.getElementById('health').innerText = `HULL: ${player.health}/${player.maxHealth}`;
    document.getElementById('fuel').innerText = `FUEL: ${Math.ceil(player.fuel)}%`;
    document.getElementById('nitro').innerText = `NITRO: ${Math.ceil(player.nitro)}% [SPACE]`;
    document.getElementById('wanted-display').innerText = `WANTED: ${'★'.repeat(cityLvl)}`;
    document.getElementById('objective').innerText = player.currentKey ? "Objective: Breach the Gate!" : "Objective: Find the Golden Key";
}

function draw() {
    if(gameState === 'playing') {
        ctx.clearRect(0, 0, canvas.width, canvas.height); map.draw(ctx, camera.x, camera.y);
        for(let c of civilians) c.draw(ctx, camera.x, camera.y); for(let p of police) p.draw(ctx, camera.x, camera.y);
        if(invulnerabilityTimer % 10 < 5) player.draw(ctx, camera.x, camera.y);
    }
    if(gameState === 'gameover_crash' || gameState === 'gameover_arrest' || gameState === 'win') {
        showScreen('message-screen'); radioStations.forEach(r=>r.audio.volume=0);
        let title = document.getElementById('msg-title'); let sub = document.getElementById('msg-sub');
        if(gameState === 'gameover_crash') { title.innerText = "VEHICLE DESTROYED"; title.style.color = "#ff1a1a"; sub.innerText = "Your ride is totalled."; } 
        else if (gameState === 'gameover_arrest') { title.innerText = "BUSTED!"; title.style.color = "#1a1aff"; sub.innerText = "The police boxed you in."; } 
        else if (gameState === 'win') { title.innerText = "DELIVERY SUCCESSFUL!"; title.style.color = "#00ff66"; sub.innerText = "Cargaison livrée au point mort."; }
    }
    requestAnimationFrame(draw);
}

setInterval(update, 1000 / 60);
draw();
