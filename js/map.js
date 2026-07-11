class GameMap {
    constructor() {
        this.cityWidth = 2500;
        this.numCities = 5;
        this.totalWidth = this.cityWidth * this.numCities;
        this.height = 1000;
        this.buildings = [];
        this.gates = [];
        this.keys = [];
        this.fuels = []; // Nouvelle liste pour les bidons de fuel

        this.generate();
    }

    generate() {
        for(let i = 0; i < this.numCities; i++) {
            let cityStart = i * this.cityWidth;

            // --- CRÉATION DES CHEMINS (OBSTACLES) ---
            // Pour créer des chemins alternatifs, on place des gros blocs de bâtiments au milieu
            // qui séparent la ville en une "Autoroute Centrale" (rapide mais risquée)
            // et des "Chemins de traverse" (en haut Y: 50-250 et en bas Y: 750-950)
            
            for(let j = 0; j < 25; j++) {
                let bx = cityStart + Math.random() * this.cityWidth;
                let by = 0;
                
                // On crée des barrières de bâtiments pour séparer les voies
                let rand = Math.random();
                if (rand < 0.3) {
                    by = Math.random() * 100; // Obstacles tout en haut
                } else if (rand < 0.75) {
                    // Obstacles du milieu qui séparent le chemin central des chemins alternatifs
                    by = 300 + Math.random() * 100; 
                    if(Math.random() > 0.5) by = 600 + Math.random() * 100;
                } else {
                    by = 850 + Math.random() * 100; // Obstacles tout en bas
                }

                this.buildings.push({ x: bx, y: by, w: 120 + Math.random()*100, h: 120 + Math.random()*100 });
            }

            // --- PLACEMENT DU FUEL ---
            // Chemin Central court (Peu de fuel : 2 bidons)
            for(let f = 0; f < 2; f++) {
                this.fuels.push({
                    x: cityStart + 300 + Math.random() * 1800,
                    y: 450 + Math.random() * 100, // Plein milieu
                    w: 25, h: 25, collected: false, amount: 30 // Donne un peu de fuel
                });
            }

            // Chemins alternatifs longs (Beaucoup de fuel : 5 bidons au total en haut/bas)
            for(let f = 0; f < 5; f++) {
                let iy = Math.random() > 0.5 ? 100 + Math.random() * 100 : 800 + Math.random() * 100;
                this.fuels.push({
                    x: cityStart + 200 + Math.random() * 2000,
                    y: iy,
                    w: 25, h: 25, collected: false, amount: 55 // Donne beaucoup de fuel
                });
            }

            // --- CLÉS ET BARRAGES ---
            if (i < this.numCities - 1) {
                // On cache la clé plutôt dans les chemins alternatifs pour forcer l'exploration
                this.keys.push({
                    id: i,
                    x: cityStart + 800 + Math.random() * 1200,
                    y: Math.random() > 0.5 ? 120 : 880,
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

        // Dessiner les "voies" visuellement (lignes de délimitation légères)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0 - camX, 300 - camY); ctx.lineTo(this.totalWidth - camX, 300 - camY);
        ctx.moveTo(0 - camX, 700 - camY); ctx.lineTo(this.totalWidth - camX, 700 - camY);
        ctx.stroke();

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

        // BIDONS DE FUEL (Orange/Néon)
        for(let f of this.fuels) {
            if(!f.collected) {
                ctx.fillStyle = '#FF5500';
                ctx.fillRect(f.x - camX, f.y - camY, f.w, f.h);
                // Petit effet visuel "F" au milieu du bidon
                ctx.fillStyle = '#FFF';
                ctx.font = '12px Courier';
                ctx.fillText('F', f.x - camX + 8, f.y - camY + 18);
            }
        }
        
        // Ligne d'arrivée
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.totalWidth - 50 - camX, 0 - camY, 50, this.height);
    }
}
