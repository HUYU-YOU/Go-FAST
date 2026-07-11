class GameMap {
    constructor() {
        this.cityWidth = 2500;
        this.numCities = 5;
        this.totalWidth = this.cityWidth * this.numCities;
        this.height = 1000;
        this.buildings = [];
        this.gates = [];
        this.keys = [];

        this.generate();
    }

    generate() {
        for(let i = 0; i < this.numCities; i++) {
            // Génération des bâtiments (obstacles) en haut et en bas de la route centrale
            for(let j = 0; j < 30; j++) {
                let bx = i * this.cityWidth + Math.random() * this.cityWidth;
                // La route centrale (Y: 300 à 700) est dégagée
                let by = Math.random() > 0.5 ? Math.random() * 200 : 750 + Math.random() * 200; 
                this.buildings.push({ x: bx, y: by, w: 100 + Math.random()*150, h: 100 + Math.random()*150 });
            }

            // Clés et Barrages (pas de barrage après la dernière ville, c'est l'arrivée)
            if (i < this.numCities - 1) {
                this.keys.push({
                    id: i,
                    x: i * this.cityWidth + 500 + Math.random() * 1500,
                    y: 100 + Math.random() * 800,
                    w: 30, h: 30, collected: false
                });

                this.gates.push({
                    id: i,
                    x: (i + 1) * this.cityWidth,
                    y: 0,
                    w: 40, h: this.height, active: true
                });
            }
        }
    }

    draw(ctx, camX, camY) {
        // Fond (Asphalte)
        ctx.fillStyle = '#222';
        ctx.fillRect(0 - camX, 0 - camY, this.totalWidth, this.height);

        // Ligne médiane
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.setLineDash([40, 40]);
        ctx.beginPath();
        ctx.moveTo(0 - camX, this.height/2 - camY);
        ctx.lineTo(this.totalWidth - camX, this.height/2 - camY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Bâtiments
        ctx.fillStyle = '#444';
        for(let b of this.buildings) {
            ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
        }

        // Barrages (Rouge)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        for(let g of this.gates) {
            if(g.active) ctx.fillRect(g.x - camX, g.y - camY, g.w, g.h);
        }

        // Clés (Or)
        ctx.fillStyle = '#FFD700';
        for(let k of this.keys) {
            if(!k.collected) ctx.fillRect(k.x - camX, k.y - camY, k.w, k.h);
        }
        
        // Ligne d'arrivée
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.totalWidth - 50 - camX, 0 - camY, 50, this.height);
    }
}
