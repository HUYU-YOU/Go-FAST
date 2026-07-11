class Car {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
        this.vx = 0; this.vy = 0; this.angle = 0; this.speed = 0;
        this.maxSpeed = 10; this.acceleration = 0.2; this.friction = 0.95; this.turnSpeed = 0.05;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    draw(ctx, camX, camY) {
        ctx.save(); ctx.translate(this.x - camX, this.y - camY); ctx.rotate(this.angle);
        ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.fillStyle = '#111'; ctx.fillRect(this.w/5, -this.h/2 + 2, this.w/4, this.h - 4);
        ctx.restore();
    }
    getBounds() { return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h }; }
}

class Player extends Car {
    constructor(x, y, carType) {
        let color = '#222'; let maxSpeed = 14; let maxHealth = 5; let fuelDrain = 0.05;
        if (carType === 'ferrari') { color = '#ffcc00'; maxSpeed = 17; maxHealth = 3; fuelDrain = 0.12; } 
        else if (carType === 'convertible') { color = '#ff66b2'; maxSpeed = 11; maxHealth = 7; fuelDrain = 0.02; } 
        else { color = '#333333'; maxSpeed = 14; maxHealth = 5; fuelDrain = 0.06; }

        super(x, y, 42, 24, color);
        this.baseMaxSpeed = maxSpeed; this.health = maxHealth; this.maxHealth = maxHealth; this.fuelDrainRate = fuelDrain;
        this.fuel = 100; this.nitro = 0; this.cargo = 100;
        this.arrestTimer = 0; this.decoyCooldown = 0; this.currentKey = false;
    }
    updatePlayer(keysInput) {
        if(this.decoyCooldown > 0) this.decoyCooldown--;
        let currentMax = this.baseMaxSpeed;
        if(keysInput.nitro && this.nitro > 0 && this.fuel > 0) {
            currentMax += 7; this.nitro -= 0.6; this.speed += this.acceleration * 2;
        } else {
            if (keysInput.up && this.fuel > 0) this.speed += this.acceleration;
            if (keysInput.down && this.fuel > 0) this.speed -= this.acceleration;
        }
        this.speed *= this.friction;
        if (Math.abs(this.speed) > 0.5) {
            let dir = this.speed > 0 ? 1 : -1;
            if (keysInput.left) this.angle -= this.turnSpeed * dir;
            if (keysInput.right) this.angle += this.turnSpeed * dir;
        }
        this.vx = this.vx * 0.84 + Math.cos(this.angle) * this.speed * 0.16;
        this.vy = this.vy * 0.84 + Math.sin(this.angle) * this.speed * 0.16;
        super.update();
    }
}

class Civilian extends Car {
    constructor(x, y) {
        super(x, y, 40, 24, '#6e6e7a');
        this.maxSpeed = 3 + Math.random() * 3; this.angle = Math.random() > 0.5 ? 0 : Math.PI;
        this.vx = Math.cos(this.angle) * this.maxSpeed; this.vy = Math.sin(this.angle) * this.maxSpeed;
    }
}

class Police extends Car {
    constructor(x, y, type) {
        super(x, y, 40, 24, 'blue'); this.type = type; this.spinTimer = 0;
        if (type === 1) { this.maxSpeed = 13.5; this.acceleration = 0.25; } 
        else if (type === 2) { this.w = 52; this.h = 30; this.maxSpeed = 9.5; this.acceleration = 0.15; } 
        else if (type === 3) { this.w = 65; this.h = 38; this.maxSpeed = 5.5; this.acceleration = 0.06; }
    }
    updateAI(playerObj) {
        if(this.spinTimer > 0) { this.spinTimer--; this.angle += 0.2; this.vx *= 0.92; this.vy *= 0.92; this.x += this.vx; this.y += this.vy; return; }
        let targetAngle = Math.atan2(playerObj.y - this.y, playerObj.x - this.x);
        let diff = targetAngle - this.angle;
        while(diff < -Math.PI) diff += Math.PI * 2; while(diff > Math.PI) diff -= Math.PI * 2;
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.05);
        this.speed += this.acceleration; if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed;
        super.update();
    }
    draw(ctx, camX, camY) {
        this.color = Math.floor(Date.now() / 120) % 2 === 0 ? (this.type === 3 ? '#1e4620' : '#ff1a1a') : (this.type === 3 ? '#0d260f' : '#1a1aff');
        super.draw(ctx, camX, camY);
    }
}
