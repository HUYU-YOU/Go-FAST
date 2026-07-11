class Car {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
        this.vx = 0; this.vy = 0; this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 10;
        this.acceleration = 0.2;
        this.friction = 0.95;
        this.turnSpeed = 0.06;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx, camX, camY) {
        ctx.save();
        ctx.translate(this.x - camX, this.y - camY);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        // Pare-brise pour voir l'avant
        ctx.fillStyle = '#000';
        ctx.fillRect(this.w/4, -this.h/2 + 2, this.w/4, this.h - 4);
        ctx.restore();
    }

    getBounds() {
        return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h };
    }
}

class Player extends Car {
    constructor(x, y) {
        super(x, y, 40, 24, '#00aaff'); // Go-Fast Bleu
        this.maxSpeed = 14;
        this.health = 5;
        this.arrestTimer = 0;
        this.currentKey = false;
    }

    updatePlayer(keysInput) {
        if (keysInput.up) this.speed += this.acceleration;
        if (keysInput.down) this.speed -= this.acceleration;
        this.speed *= this.friction; // Frein moteur

        // Tourner seulement si on roule
        if (Math.abs(this.speed) > 0.5) {
            let dir = this.speed > 0 ? 1 : -1;
            if (keysInput.left) this.angle -= this.turnSpeed * dir;
            if (keysInput.right) this.angle += this.turnSpeed * dir;
        }

        // Physique de dérapage (Inertie + nouvelle direction)
        this.vx = this.vx * 0.85 + Math.cos(this.angle) * this.speed * 0.15;
        this.vy = this.vy * 0.85 + Math.sin(this.angle) * this.speed * 0.15;

        super.update();
    }
}

class Civilian extends Car {
    constructor(x, y) {
        super(x, y, 40, 24, '#888'); // Gris
        this.maxSpeed = 3 + Math.random() * 3;
        this.angle = Math.random() > 0.5 ? 0 : Math.PI; // Droite ou gauche
        this.vx = Math.cos(this.angle) * this.maxSpeed;
        this.vy = Math.sin(this.angle) * this.maxSpeed;
    }
}

class Police extends Car {
    constructor(x, y, type) {
        super(x, y, 40, 24, 'blue');
        this.type = type;
        if (type === 1) { // Flic normal
            this.color = '#0000ff'; this.maxSpeed = 14; this.acceleration = 0.3;
        } else if (type === 2) { // Van (Lourd)
            this.color = '#000055'; this.w = 55; this.h = 30; this.maxSpeed = 9; this.acceleration = 0.15;
        } else if (type === 3) { // Tank (Mortel)
            this.color = '#005500'; this.w = 70; this.h = 40; this.maxSpeed = 5; this.acceleration = 0.05;
        }
    }

    updateAI(player) {
        // Poursuite basique : pointer vers le joueur
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let targetAngle = Math.atan2(dy, dx);

        // Rotation douce
        let diff = targetAngle - this.angle;
        while(diff < -Math.PI) diff += Math.PI * 2;
        while(diff > Math.PI) diff -= Math.PI * 2;
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed);

        this.speed += this.acceleration;
        if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;

        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        super.update();
    }

    draw(ctx, camX, camY) {
        // Gyrophare clignotant
        if (Math.floor(Date.now() / 150) % 2 === 0) {
            this.color = this.type === 3 ? '#00aa00' : (this.type === 1 ? '#ff0000' : '#880000');
        } else {
            this.color = this.type === 3 ? '#003300' : (this.type === 1 ? '#0000ff' : '#000055');
        }
        super.draw(ctx, camX, camY);
    }
}
