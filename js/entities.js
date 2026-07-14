const ASSETS = {
    civilians: [], peds: [], buildings: [], parks: [],
    gti: [], cab: [], fer: [], cops: [],
    police: new Image(), chu: new Image(), garage: new Image(), bank: new Image(),
    water: new Image(), roadH: new Image(), roadV: new Image(), crossroad: new Image(),
    bridgeH: new Image(), bridgeV: new Image(), crossroadBridge: new Image(),
    van: new Image(), tank: new Image(), helico: new Image()
};

function loadImg(path) { let img = new Image(); img.src = path; return img; }

for(let i=1; i<=12; i++) ASSETS.civilians.push(loadImg(`img/car${i}.png`));
for(let i=1; i<=13; i++) ASSETS.peds.push(loadImg(`img/pnj${i}.png`));
for(let i=1; i<=15; i++) ASSETS.buildings.push(loadImg(`img/bat${i}.png`));
for(let i=1; i<=5; i++) {
    ASSETS.gti.push(loadImg(`img/GTI${i}.png`));
    ASSETS.cab.push(loadImg(`img/CAB${i}.png`));
    ASSETS.fer.push(loadImg(`img/FER${i}.png`));
}
for(let i=1; i<=2; i++) ASSETS.cops.push(loadImg(`img/cops${i}.png`));
for(let i=1; i<=3; i++) ASSETS.parks.push(loadImg(`img/parc${i}.png`));

ASSETS.police = loadImg('img/police.png');
ASSETS.chu = loadImg('img/chu.png');
ASSETS.garage = loadImg('img/garage.png');
ASSETS.bank = loadImg('img/bank.png');
ASSETS.water = loadImg('img/eau.png');
ASSETS.roadH = loadImg('img/roadhorizontale.png');
ASSETS.roadV = loadImg('img/roadverticale.png');
ASSETS.crossroad = loadImg('img/carrefour.png');
ASSETS.bridgeH = loadImg('img/road_bridgehorizontale.png');
ASSETS.bridgeV = loadImg('img/road_bridgeverticale.png');
ASSETS.crossroadBridge = loadImg('img/carrefour_bridge.png');
ASSETS.van = loadImg('img/Van.png');
ASSETS.tank = loadImg('img/Tank.png');
ASSETS.helico = loadImg('img/helico.png');

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 6; this.vy = (Math.random() - 0.5) * 6;
        this.life = 100; this.color = color; this.size = Math.random() * 4 + 2;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vx *= 0.9; this.vy *= 0.9; this.life--; }
    draw(ctx, camX, camY) {
        ctx.globalAlpha = Math.max(0, this.life / 100); ctx.fillStyle = this.color;
        ctx.fillRect(this.x - camX, this.y - camY, this.size, this.size); ctx.globalAlpha = 1;
    }
}

class Bullet {
    constructor(x, y, angle) {
        this.x = x; this.y = y; this.angle = angle;
        this.speed = 15; this.life = 100;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; }
    draw(ctx, camX, camY) {
        ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(this.x - camX, this.y - camY, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(this.x - camX, this.y - camY, 3, 0, Math.PI*2); ctx.fill();
    }
    getBounds() { return {x: this.x-6, y: this.y-6, w: 12, h: 12}; }
}

class Car {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
        this.vx = 0; this.vy = 0; this.angle = 0; this.speed = 0;
        this.friction = 0.94; this.turnSpeed = 0.055;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    getBounds() { return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h }; }
}

class Player extends Car {
    constructor(x, y, carType) {
        let color = '#222'; 
        let maxSpeed = 31.8; let maxHealth = 5; let fuelDrain = 0.04; 
        if (carType === 'fer') { color = '#ffcc00'; maxSpeed = 37.0; maxHealth = 3; } 
        else if (carType === 'cab') { color = '#a32cc4'; maxSpeed = 26.5; maxHealth = 7; }
        else { color = '#111111'; maxSpeed = 31.8; maxHealth = 5; }

        super(x, y, 84, 48, color); 
        this.carType = carType || 'gti'; 
        this.baseMaxSpeed = maxSpeed; this.acceleration = 0.45; 
        this.health = maxHealth; this.maxHealth = maxHealth; this.fuelDrainRate = fuelDrain;
        this.fuel = 100; this.nitro = 0; this.keysCollected = 0; this.arrestTimer = 0;
        this.underHeliSpotlight = false;
    }
    
    updatePlayer(keysInput, currentTileType) {
        let currentMax = this.baseMaxSpeed;
        if (currentTileType === 4) currentMax *= 0.5;
        if (this.underHeliSpotlight) currentMax *= 0.6; 

        if(keysInput.nitro && this.nitro > 0 && this.fuel > 0) {
            currentMax += 8; this.nitro -= 0.5; this.speed += this.acceleration * 1.8;
        } else {
            if (keysInput.up && this.fuel > 0) this.speed += this.acceleration;
            if (keysInput.down && this.fuel > 0) this.speed -= this.acceleration;
        }
        
        this.speed *= this.friction;
        if (this.speed > currentMax) this.speed = currentMax;

        if (Math.abs(this.speed) > 0.5) {
            let dir = this.speed > 0 ? 1 : -1;
            if (keysInput.left) this.angle -= this.turnSpeed * dir;
            if (keysInput.right) this.angle += this.turnSpeed * dir;
        }
        
        let driftFactor = 0.94; 
        this.vx = this.vx * driftFactor + Math.cos(this.angle) * this.speed * (1 - driftFactor);
        this.vy = this.vy * driftFactor + Math.sin(this.angle) * this.speed * (1 - driftFactor);
        
        super.update();
    }

    draw(ctx, camX, camY) {
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        
        let arr = ASSETS[this.carType];
        let img = null;
        
        if (arr && arr.length > 0) {
            let state = Math.ceil((this.health / this.maxHealth) * 5);
            let idx = 5 - state; 
            idx = Math.max(0, Math.min(arr.length - 1, idx));
            img = arr[idx];
        }
        
        if(img && img.complete && img.naturalWidth > 0) {
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, -this.h/2, -this.w/2, this.h, this.w);
            ctx.rotate(-Math.PI / 2);
        } else {
            ctx.fillStyle = 'magenta'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            ctx.fillStyle = 'cyan'; ctx.fillRect(this.w/6, -this.h/2 + 2, this.w/4, this.h - 4);
        }
        ctx.restore();
    }
}

class Civilian extends Car {
    constructor(x, y) {
        super(x, y, 80, 48, '#555560'); 
        this.maxSpeed = (4 + Math.random() * 3) * 0.7; 
        let dirs = [0, Math.PI/2, Math.PI, -Math.PI/2];
        this.angle = dirs[Math.floor(Math.random() * dirs.length)];
        this.vx = Math.cos(this.angle) * this.maxSpeed; this.vy = Math.sin(this.angle) * this.maxSpeed;
        this.skinIndex = Math.floor(Math.random() * 12); 
    }
    updateAI(mapObj) {
        let nextX = this.x + this.vx * 2; let nextY = this.y + this.vy * 2;
        let nextTile = mapObj.getTileTypeAt(nextX, nextY);
        if([0, 2, 5, 6, 7, 8].includes(nextTile)) {
            this.angle += Math.PI/2;
            this.vx = Math.cos(this.angle) * this.maxSpeed;
            this.vy = Math.sin(this.angle) * this.maxSpeed;
        }
        super.update();
    }
    draw(ctx, camX, camY) {
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        let img = ASSETS.civilians[this.skinIndex];
        if(img && img.complete && img.naturalWidth > 0) {
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, -this.h/2, -this.w/2, this.h, this.w);
            ctx.rotate(-Math.PI / 2);
        } else {
            ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        }
        ctx.restore();
    }
}

class Police extends Car {
    constructor(x, y, type, wantedLevel) {
        super(x, y, 80, 48, 'blue'); this.type = type; this.spinTimer = 0; this.shootTimer = 0;
        this.dead = false; 
        this.skinIndex = Math.floor(Math.random() * 2);
        
        let speedBoost = (wantedLevel >= 3) ? (wantedLevel * 0.4) : 0; 
        if (type === 1) { this.maxSpeed = 7.3 + speedBoost; this.acceleration = 0.07; this.turnSpeed = 0.025; } 
        else if (type === 2) { this.w = 104; this.h = 60; this.maxSpeed = 5.9 + speedBoost; this.acceleration = 0.05; this.turnSpeed = 0.020; } 
        else if (type === 3) { this.w = 130; this.h = 76; this.maxSpeed = 3.5 + speedBoost; this.acceleration = 0.02; this.turnSpeed = 0.012; }
    }

    updateAI(playerObj, mapObj, bulletsArr) {
        if(this.spinTimer > 0) { 
            this.spinTimer--; this.angle += 0.2; this.vx *= 0.92; this.vy *= 0.92; 
            this.x += this.vx; this.y += this.vy; return; 
        }

        let nextX = this.x + Math.cos(this.angle) * (this.speed * 3);
        let nextY = this.y + Math.sin(this.angle) * (this.speed * 3);
        let nextTile = mapObj.getTileTypeAt(nextX, nextY);

        let targetAngle;
        if ([0, 5, 6, 7].includes(nextTile)) {
            targetAngle = this.angle + (Math.PI / 1.5); this.speed *= 0.8;
        } else {
            targetAngle = Math.atan2(playerObj.y - this.y, playerObj.x - this.x);
        }

        let diff = targetAngle - this.angle;
        while(diff < -Math.PI) diff += Math.PI * 2; while(diff > Math.PI) diff -= Math.PI * 2;
        
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed);
        this.speed += this.acceleration; if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        
        this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed;
        
        let currentTileX = mapObj.getTileTypeAt(this.x + this.vx, this.y);
        let currentTileY = mapObj.getTileTypeAt(this.x, this.y + this.vy);
        
        if ([0, 5, 6, 7].includes(currentTileX)) { this.vx = 0; this.speed *= 0.8; }
        if ([0, 5, 6, 7].includes(currentTileY)) { this.vy = 0; this.speed *= 0.8; }

        super.update();

        if(mapObj.getTileTypeAt(this.x, this.y) === 2) { this.dead = true; }

        if (this.type === 3) {
            this.shootTimer--;
            if (this.shootTimer <= 0 && Math.hypot(playerObj.x - this.x, playerObj.y - this.y) < 800) {
                bulletsArr.push(new Bullet(this.x, this.y, targetAngle));
                this.shootTimer = 90; 
            }
        }
    }
    draw(ctx, camX, camY) {
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        
        let img = null;
        if (this.type === 1) img = ASSETS.cops[this.skinIndex];
        else if (this.type === 2) img = ASSETS.van;
        else if (this.type === 3) img = ASSETS.tank;

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, -this.h/2, -this.w/2, this.h, this.w);
            ctx.rotate(-Math.PI / 2);
        } else {
            this.color = (this.type === 3) ? '#1e4620' : '#1e3ee6';
            ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        }
        
        if (this.type === 1 || this.type === 2) {
            let time = Date.now();
            ctx.fillStyle = (time % 300 < 150) ? 'red' : 'blue';
            ctx.fillRect(-12, -this.h/2 + 4, 8, 8);
            ctx.fillStyle = (time % 300 < 150) ? 'blue' : 'red';
            ctx.fillRect(4, -this.h/2 + 4, 8, 8);
        }
        ctx.restore();
    }
}

class Helicopter {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 100; this.h = 100; this.angle = 0; this.speed = 18;
    }
    updateAI(playerObj) {
        let targetAngle = Math.atan2(playerObj.y - this.y, playerObj.x - this.x);
        let diff = targetAngle - this.angle;
        while(diff < -Math.PI) diff += Math.PI * 2; while(diff > Math.PI) diff -= Math.PI * 2;
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.05);
        this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
    }
    draw(ctx, camX, camY) {
        ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
        ctx.beginPath(); ctx.arc(this.x - camX, this.y - camY, 200, 0, Math.PI*2); ctx.fill();
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        
        if (ASSETS.helico && ASSETS.helico.complete && ASSETS.helico.naturalWidth > 0) {
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(ASSETS.helico, -this.h/2, -this.w/2, this.h, this.w);
            ctx.rotate(-Math.PI / 2);
        } else {
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
}

class Pedestrian {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 40; this.h = 40; 
        this.vx = (Math.random() - 0.5); this.vy = (Math.random() - 0.5);
        this.alive = true;
        this.skinIndex = Math.floor(Math.random() * 13); 
    }
    update(mapObj) {
        if(!this.alive) return;
        let nextX = this.x + this.vx; let nextY = this.y + this.vy;
        let tile = mapObj.getTileTypeAt(nextX, nextY);
        if(tile === 2) {
            this.vx *= -1; this.vy *= -1; 
        } else {
            this.x += this.vx; this.y += this.vy;
        }
        if(Math.random() < 0.02) { this.vx = (Math.random() - 0.5)*1.5; this.vy = (Math.random() - 0.5)*1.5; }
    }
    draw(ctx, camX, camY) {
        if(!this.alive) return;
        let img = ASSETS.peds[this.skinIndex];
        if(img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.translate(this.x - camX, this.y - camY);
            let angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle + Math.PI / 2);
            ctx.drawImage(img, -this.w/2, -this.h/2, this.w, this.h);
            ctx.restore();
        } 
        // AUCUN ROND BEIGE PAR DEFAUT !
    }
}
