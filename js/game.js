const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let map, player, civilians, police, gameState = 'menu', camera, invulnerabilityTimer;

// --- AUDIO SYSTEM ---
let audioEnabled = true;
let audioInitialized = false;

const menuMusic = new Audio('audio/menu.mp3');
menuMusic.loop = true;

const radioStations = [
    { name: "agressi.fm", audio: new Audio('audio/agressi.fm.mp3') },
    { name: "epicUrien.radio", audio: new Audio('audio/epicUrien.radio.mp3') },
    { name: "cyberponk.fm", audio: new Audio('audio/cyberponk.fm.mp3') },
    { name: "TahLaBrazil.ontadit", audio: new Audio('audio/TahLaBrazil.ontadit.mp3') },
    { name: "Slowwly.radio", audio: new Audio('audio/Slowwly.radio.mp3') },
    { name: "OldSchoolFM", audio: new Audio('audio/OldSchoolFM.mp3') },
    { name: "NightCarCrash", audio: new Audio('audio/NightCarCrash.mp3') }
];

let currentRadioIndex = 0;
let radioCooldown = 0; // Prevent spamming ENTER key

// Initialize audio on first user interaction
window.addEventListener('click', () => {
    if(!audioInitialized && audioEnabled) {
        audioInitialized = true;
        menuMusic.play().catch(e => console.log("Audio play prevented:", e));
    }
});

function toggleAudio() {
    audioEnabled = !audioEnabled;
    document.getElementById('audio-status').innerText = audioEnabled ? 'ON' : 'OFF';
    if(!audioEnabled) {
        menuMusic.pause();
        radioStations.forEach(r => r.audio.volume = 0);
    } else if (audioInitialized) {
        if(gameState === 'menu' || gameState === 'car-select' || gameState === 'options') {
            menuMusic.play();
        } else if (gameState === 'playing') {
            radioStations[currentRadioIndex].audio.volume = 1;
        }
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('ui').style.display = 'none';
    if(id) document.getElementById(id).style.display = 'flex';
}

function startGame(carType) {
    map = new GameMap();
    player = new Player(200, map.height / 2, carType);
    civilians = []; police = [];
    camera = { x: 0, y: 0 };
    invulnerabilityTimer = 0;
    gameState = 'playing';
    
    showScreen(null); 
    document.getElementById('ui').style.display = 'block';

    // Swap Audio from Menu to Radio Simulation
    if(audioEnabled && audioInitialized) {
        menuMusic.pause();
        // Start all radios simultaneously but muted to simulate live broadcast
        radioStations.forEach(r => {
            r.audio.loop = true;
            r.audio.volume = 0; 
            r.audio.play().catch(e => console.log("Audio block:", e));
        });
        // Unmute the first station
        radioStations[currentRadioIndex].audio.volume = 1;
        document.getElementById('radio-display').innerText = `Radio: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }
}

function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

function spawnEntities() {
    let cityLevel = Math.floor(player.x / map.cityWidth) + 1;
    if(civilians.length < 15) {
        civilians.push(new Civilian(player.x + (Math.random() > 0.5 ? 900 : -900), 100 + Math.random() * 800));
    }
    if(police.length < cityLevel * 2) {
        let type = 1;
        if(cityLevel >= 2 && Math.random() < 0.3) type = 2;
        if(cityLevel >= 3 && Math.random() < 0.2) type = 3;
        police.push(new Police(player.x + (Math.random() > 0.5 ? 900 : -900), player.y + (Math.random() > 0.5 ? 500 : -500), type));
    }
}

function update() {
    if(gameState !== 'playing') return;
    if(invulnerabilityTimer > 0) invulnerabilityTimer--;
    if(radioCooldown > 0) radioCooldown--;

    // Radio Swap Logic
    if(keys.enter && radioCooldown <= 0) {
        radioCooldown = 20; // 333ms cooldown
        if(audioEnabled) {
            // Mute current
            radioStations[currentRadioIndex].audio.volume = 0;
            // Next station
            currentRadioIndex = (currentRadioIndex + 1) % radioStations.length;
            // Unmute new
            radioStations[currentRadioIndex].audio.volume = 1;
        } else {
            currentRadioIndex = (currentRadioIndex + 1) % radioStations.length;
        }
        document.getElementById('radio-display').innerText = `Radio: ${radioStations[currentRadioIndex].name} [ENTER]`;
    }

    // Fuel logic
    if (keys.up || keys.down || keys.left || keys.right || keys.nitro) {
        player.fuel -= keys.nitro ? player.fuelDrainRate * 2 : player.fuelDrainRate; 
    }
    if(player.fuel <= 0) { player.fuel = 0; player.baseMaxSpeed = 0; }

    player.updatePlayer(keys);
    spawnEntities();

    for(let c of civilians) c.update();
    for(let p of police) p.updateAI(player);

    civilians = civilians.filter(c => Math.abs(c.x - player.x) < 1600);
    police = police.filter(p => Math.abs(p.x - player.x) < 1600);

    let pBounds = player.getBounds();
    let currentCity = Math.floor(player.x / map.cityWidth);

    if(player.y < 20) { player.y = 20; player.vy = 0; }
    if(player.y > map.height - 20) { player.y = map.height - 20; player.vy = 0; }

    for(let b of map.buildings) {
        if(rectIntersect(pBounds, b)) {
            player.vx *= -0.8; player.vy *= -0.8; player.speed *= -0.4;
            player.x += player.vx * 2; player.y += player.vy * 2;
        }
    }

    for(let f of map.fuels) { if(!f.collected && rectIntersect(pBounds, f)) { f.collected = true; player.fuel = Math.min(100, player.fuel + f.amount); } }
    for(let k of map.keys) { if(!k.collected && k.id === currentCity && rectIntersect(pBounds, k)) { k.collected = true; player.currentKey = true; } }
    for(let g of map.gates) {
        if(g.active && rectIntersect(pBounds, g)) {
            if(player.currentKey && g.id === currentCity) { g.active = false; player.currentKey = false; } 
            else { player.vx = -6; player.speed = -5; player.x -= 12; }
        }
    }

    for(let c of civilians) {
        if(rectIntersect(pBounds, c.getBounds())) {
            if(invulnerabilityTimer <= 0) {
                player.health--; invulnerabilityTimer = 60; player.speed *= -0.5; player.vx *= -0.7;
                if(player.health <= 0) gameState = 'gameover_crash';
            }
        }
    }

    let underArrest = false;
    for(let p of police) {
        if(rectIntersect(pBounds, p.getBounds())) {
            if(p.type === 3) gameState = 'gameover_crash';
            player.speed *= 0.78; player.vx *= 0.78;
            if(Math.abs(player.speed) < 0.6) underArrest = true;
        }
    }

    if(underArrest) {
        player.arrestTimer++; document.getElementById('arrest-warning').style.display = 'block';
        if(player.arrestTimer > 120) gameState = 'gameover_arrest';
    } else {
        player.arrestTimer = Math.max(0, player.arrestTimer - 2);
        if(player.arrestTimer === 0) document.getElementById('arrest-warning').style.display = 'none';
    }

    if(player.x > map.totalWidth - 60) gameState = 'win';

    camera.x = player.x - canvas.width / 3.5;
    camera.y = player.y - canvas.height / 2;

    let cityLvl = Math.floor(player.x / map.cityWidth) + 1;
    document.getElementById('health').innerText = `Hull Integrity: ${player.health}/${player.maxHealth}`;
    document.getElementById('fuel').innerText = `Fuel: ${Math.ceil(player.fuel)}%`;
    document.getElementById('wanted').innerText = `City: ${cityLvl > 5 ? 5 : cityLvl} | Wanted: ${'★'.repeat(cityLvl > 5 ? 5 : cityLvl)}`;
    document.getElementById('keys').innerText = player.currentKey ? "Objective: Breach the Gate!" : "Objective: Find the Golden Key";
}

function draw() {
    if(gameState === 'playing') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        map.draw(ctx, camera.x, camera.y);
        for(let c of civilians) c.draw(ctx, camera.x, camera.y);
        for(let p of police) p.draw(ctx, camera.x, camera.y);
        if(invulnerabilityTimer % 10 < 5) player.draw(ctx, camera.x, camera.y);
    }

    if(gameState === 'gameover_crash' || gameState === 'gameover_arrest' || gameState === 'win') {
        showScreen('message-screen');
        if(gameState === 'gameover_crash') {
            document.getElementById('msg-title').innerText = "VEHICLE DESTROYED";
            document.getElementById('msg-title').style.color = "#ff1a1a";
            document.getElementById('msg-sub').innerText = "Your ride is totalled.";
        } else if (gameState === 'gameover_arrest') {
            document.getElementById('msg-title').innerText = "BUSTED!";
            document.getElementById('msg-title').style.color = "#1a1aff";
            document.getElementById('msg-sub').innerText = "The police caught you. Cargo seized.";
        } else if (gameState === 'win') {
            document.getElementById('msg-title').innerText = "DELIVERY SUCCESSFUL!";
            document.getElementById('msg-title').style.color = "#00ff66";
            document.getElementById('msg-sub').innerText = "You made it across the border.";
        }
    }

    requestAnimationFrame(draw);
}

setInterval(update, 1000 / 60);
draw();
