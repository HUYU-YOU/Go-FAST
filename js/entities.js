class Car {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.z = 0; // Ajout de l'altitude pour les sauts
        this.w = w; this.h = h; this.color = color;
        this.vx = 0; this.vy = 0; this.vz = 0; // Vélocité d'altitude
        this.angle = 0; this.speed = 0;
        this.maxSpeed = 15; this.acceleration = 0.3; this.friction = 0.94; this.turnSpeed = 0.06;
    }
    update() { 
        this.x += this.vx; this.y += this.vy; 
        // Physique du saut (Gravité)
        if(this.z > 0 || this.vz > 0) {
            this.z += this.vz;
            this.vz -= 0.5; // Gravité
            if(this.z < 0) { this.z = 0; this.vz = 0; } // Atterrissage
        }
    }
    draw(ctx, camX, camY) {
        ctx.save(); 
        ctx.translate(this.x - camX, this.y - camY); 
        ctx.rotate(this.angle);
        
        // Effet d'agrandissement pendant un saut
        let scale = 1 + (this.z * 0.02);
        ctx.scale(scale, scale);
        
        // Ombre (reste au sol)
        if(this.z > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-this.w/2 + 10, -this.h/2 + 10, this.w, this.h);
        }

        ctx.fillStyle = this.color; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.fillStyle = '#050505'; ctx.fillRect(this.w/6, -this.h/2 + 2, this.w/4, this.h - 4);
        ctx.restore();
    }
}

class Pedestrian {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 8; this.h = 8;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.alive = true;
    }
    update() {
        if(!this.alive) return;
        this.x += this.vx; this.y += this.vy;
        // Changement de direction aléatoire
        if(Math.random() < 0.02) {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
        }
    }
    draw(ctx, camX, camY) {
        ctx.fillStyle = this.alive ? '#f0d0b0' : 'rgba(255,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y - camY, this.w, 0, Math.PI*2);
        ctx.fill();
    }
}

// Le Camion Tremplin
class RampTruck {
    constructor(x, y, angle) {
        this.x = x; this.y = y; this.angle = angle;
        this.w = 80; this.h = 30;
    }
    draw(ctx, camX, camY) {
        ctx.save();
        ctx.translate(this.x - camX, this.y - camY);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#555'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h); // Remorque
        ctx.fillStyle = '#ffaa00'; ctx.fillRect(this.w/2, -this.h/2, 20, this.h); // Cabine
        // Dessin de la flèche de rampe
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-this.w/2 + 10, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.fill();
        ctx.restore();
    }
    checkJump(playerObj) {
        // Logique de collision simplifiée pour la rampe
        let dist = Math.hypot(playerObj.x - this.x, playerObj.y - this.y);
        if (dist < 40 && playerObj.z === 0 && playerObj.speed > 5) {
            playerObj.vz = playerObj.speed * 0.4; // Propulsion en l'air !
        }
    }
}
