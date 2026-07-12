class Car {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
        this.vx = 0; this.vy = 0; this.angle = 0; this.speed = 0;
        this.maxSpeed = 10; this.acceleration = 0.25; this.friction = 0.94; this.turnSpeed = 0.055;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    draw(ctx, camX, camY) {
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.fillStyle = '#050505'; ctx.fillRect(this.w/6, -this.h/2 + 2, this.w/4, this.h - 4);
        ctx.restore();
    }
    getBounds() { return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h }; }
}

class Player extends Car {
    constructor(x, y, carType) {
        let color = '#222'; let maxSpeed = 17.5; let maxHealth = 5; let fuelDrain = 0.04;
        if (carType === 'ferrari') { color = '#ffcc00'; maxSpeed = 21.5; maxHealth = 3; fuelDrain = 0.09; } 
        else if (carType === 'convertible') { color = '#ff66b2'; maxSpeed = 14.0; maxHealth = 7; fuelDrain = 0.015; } 
        else { color = '#111111'; maxSpeed = 17.5; maxHealth = 5; fuelDrain = 0.045; }

        super(x, y, 42, 24, color);
        this.baseMaxSpeed = maxSpeed; this.health = maxHealth; this.maxHealth = maxHealth; this.fuelDrainRate = fuelDrain;
        this.fuel = 100; this.nitro = 0; this.cargo = 100;
        this.arrestTimer = 0; this.decoyCooldown = 0; this.keysCollected = 0;
    }
    updatePlayer(keysInput, currentTileType) {
        if(this.decoyCooldown > 0) this.decoyCooldown--;
        let currentMax = this.baseMaxSpeed;
        
        // Malus de vitesse si on roule sur l'herbe (Parc = type 4)
        if (currentTileType === 4) currentMax *= 0.5;

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
        
        this.vx = this.vx * 0.82 + Math.cos(this.angle) * this.speed * 0.18;
        this.vy = this.vy * 0.82 + Math.sin(this.angle) * this.speed * 0.18;
        super.update();
    }
}

class Civilian extends Car {
    constructor(x, y) {
        super(x, y, 40, 24, '#555560');
        this.maxSpeed = 4 + Math.random() * 3; 
        // Civils roulent de manière orthogonale (Haut/Bas/Gauche/Droite pour suivre les routes)
        let dirs = [0, Math.PI/2, Math.PI, -Math.PI/2];
        this.angle = dirs[Math.floor(Math.random() * dirs.length)];
        this.vx = Math.cos(this.angle) * this.maxSpeed; this.vy = Math.sin(this.angle) * this.maxSpeed;
    }
}

class Police extends Car {
    constructor(x, y, type) {
        super(x, y, 40, 24, 'blue'); this.type = type; this.spinTimer = 0;
        if (type === 1) { this.maxSpeed = 14.5; this.acceleration = 0.16; this.turnSpeed = 0.04; } 
        else if (type === 2) { this.w = 52; this.h = 30; this.maxSpeed = 10.5; this.acceleration = 0.11; this.turnSpeed = 0.03; } 
        else if (type === 3) { this.w = 65; this.h = 38; this.maxSpeed = 6.5; this.acceleration = 0.04; this.turnSpeed = 0.02; }
    }
    updateAI(playerObj) {
        if(this.spinTimer > 0) { this.spinTimer--; this.angle += 0.2; this.vx *= 0.92; this.vy *= 0.92; this.x += this.vx; this.y += this.vy; return; }
        let targetAngle = Math.atan2(playerObj.y - this.y, playerObj.x - this.x);
        let diff = targetAngle - this.angle;
        while(diff < -Math.PI) diff += Math.PI * 2; while(diff > Math.PI) diff -= Math.PI * 2;
        
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed);
        this.speed += this.acceleration; if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed;
        super.update();
    }
    draw(ctx, camX, camY) {
        this.color = Math.floor(Date.now() / 150) % 2 === 0 ? (this.type === 3 ? '#1e4620' : '#d91e1e') : (this.type === 3 ? '#0d260f' : '#1e3ee6');
        super.draw(ctx, camX, camY);
    }
}
