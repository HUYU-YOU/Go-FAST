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
        ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(this.x - camX, this.y - camY, 4, 0, Math.PI*2); ctx.fill();
    }
    getBounds() { return {x: this.x-4, y: this.y-4, w: 8, h: 8}; }
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
        // VITESSE JOUEUR +30% environ
        let maxSpeed = 31.8; let maxHealth = 5; let fuelDrain = 0.04; 
        if (carType === 'ferrari') { color = '#ffcc00'; maxSpeed = 37.0; maxHealth = 3; } 
        else { color = '#111111'; maxSpeed = 31.8; maxHealth = 5; }

        super(x, y, 42, 24, color);
        this.baseMaxSpeed = maxSpeed; this.acceleration = 0.45; // Accélération boostée
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
        ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.fillStyle = '#050505'; ctx.fillRect(this.w/6, -this.h/2 + 2, this.w/4, this.h - 4);
        if (this.health <= 3) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-this.w/4, -this.h/4, 4, 0, Math.PI*2); ctx.fill(); }
        if (this.health <= 2) { ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(this.w/3, this.h/3, 5, 0, Math.PI*2); ctx.fill(); }
        if (this.health <= 1) { ctx.fillStyle = '#ff3300'; ctx.fillRect(-this.w/2, -2, 6, 4); }
        ctx.restore();
    }
}

class Civilian extends Car {
    constructor(x, y) {
        super(x, y, 40, 24, '#555560');
        // VITESSE CIVILS -30%
        this.maxSpeed = (4 + Math.random() * 3) * 0.7; 
        let dirs = [0, Math.PI/2, Math.PI, -Math.PI/2];
        this.angle = dirs[Math.floor(Math.random() * dirs.length)];
        this.vx = Math.cos(this.angle) * this.maxSpeed; this.vy = Math.sin(this.angle) * this.maxSpeed;
    }
    updateAI(mapObj) {
        let nextX = this.x + this.vx * 2; let nextY = this.y + this.vy * 2;
        let nextTile = mapObj.getTileTypeAt(nextX, nextY);
        // Ne rentre pas dans les bâtiments
        if(nextTile === 0 || nextTile === 2 || nextTile === 5 || nextTile === 6 || nextTile === 7 || nextTile === 8) {
            this.angle += Math.PI/2;
            this.vx = Math.cos(this.angle) * this.maxSpeed;
            this.vy = Math.sin(this.angle) * this.maxSpeed;
        }
        super.update();
    }
    draw(ctx, camX, camY) {
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.fillStyle = '#050505'; ctx.fillRect(this.w/6, -this.h/2 + 2, this.w/4, this.h - 4);
        ctx.restore();
    }
}

class Police extends Car {
    constructor(x, y, type, wantedLevel) {
        super(x, y, 40, 24, 'blue'); this.type = type; this.spinTimer = 0; this.shootTimer = 0;
        this.dead = false; // Pour la mort dans l'eau
        
        // VITESSE POLICE -30% (Nerf massif). 
        // Pas de speedboost de fou avant le 3ème cargo (wantedLevel >= 3)
        let speedBoost = (wantedLevel >= 3) ? (wantedLevel * 0.4) : 0; 
        
        if (type === 1) { this.maxSpeed = 7.3 + speedBoost; this.acceleration = 0.07; this.turnSpeed = 0.025; } 
        else if (type === 2) { this.w = 52; this.h = 30; this.maxSpeed = 5.9 + speedBoost; this.acceleration = 0.05; this.turnSpeed = 0.020; } 
        else if (type === 3) { this.w = 65; this.h = 38; this.maxSpeed = 3.5 + speedBoost; this.acceleration = 0.02; this.turnSpeed = 0.012; }
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
        // La police galère dans les bâtiments normaux, mais traverse son commissariat (8)
        if (nextTile === 0 || nextTile === 5 || nextTile === 6 || nextTile === 7) {
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
        
        // Bloqué par les murs
        if (currentTileX === 0 || currentTileX === 5 || currentTileX === 6 || currentTileX === 7) { this.vx = 0; this.speed *= 0.8; }
        if (currentTileY === 0 || currentTileY === 5 || currentTileY === 6 || currentTileY === 7) { this.vy = 0; this.speed *= 0.8; }

        super.update();

        // Mort dans l'eau
        if(mapObj.getTileTypeAt(this.x, this.y) === 2) {
            this.dead = true;
        }

        if (this.type === 3) {
            this.shootTimer--;
            if (this.shootTimer <= 0 && Math.hypot(playerObj.x - this.x, playerObj.y - this.y) < 800) {
                bulletsArr.push(new Bullet(this.x, this.y, targetAngle));
                this.shootTimer = 90; 
            }
        }
    }
    draw(ctx, camX, camY) {
        this.color = Math.floor(Date.now() / 150) % 2 === 0 ? (this.type === 3 ? '#1e4620' : '#d91e1e') : (this.type === 3 ? '#0d260f' : '#1e3ee6');
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.fillStyle = '#050505'; ctx.fillRect(this.w/6, -this.h/2 + 2, this.w/4, this.h - 4);
        
        if (this.type === 2) {
            let time = Date.now();
            ctx.fillStyle = (time % 300 < 150) ? 'red' : '#1e3ee6';
            ctx.fillRect(-8, -this.h/2 + 2, 6, 4);
            ctx.fillStyle = (time % 300 < 150) ? '#1e3ee6' : 'red';
            ctx.fillRect(2, -this.h/2 + 2, 6, 4);
        }

        if(this.type === 3) { ctx.fillStyle = '#333'; ctx.fillRect(0, -4, 40, 8); }
        ctx.restore();
    }
}

class Helicopter {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 50; this.h = 50; this.angle = 0; this.speed = 18;
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
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.fillRect(0, -2, 30, 4); 
        ctx.fillStyle = '#555'; ctx.fillRect(-30, -2, 60, 4); 
        ctx.restore();
    }
}

class Pedestrian {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 14; this.h = 14;
        this.vx = (Math.random() - 0.5); this.vy = (Math.random() - 0.5);
        this.alive = true;
        let colors = ['#3366cc', '#cc3333', '#33cc33', '#ffffff', '#ff9900'];
        this.shirtColor = colors[Math.floor(Math.random() * colors.length)];
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
        ctx.fillStyle = this.shirtColor; ctx.beginPath(); ctx.arc(this.x - camX, this.y - camY, this.w/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffcc99'; ctx.beginPath(); ctx.arc(this.x - camX, this.y - camY - 2, 4, 0, Math.PI*2); ctx.fill(); 
    }
}
