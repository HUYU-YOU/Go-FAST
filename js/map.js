class GameMap {
    constructor() {
        this.cityWidth = 2500; this.numCities = 5; this.totalWidth = this.cityWidth * this.numCities;
        this.height = 1000; this.buildings = []; this.gates = []; this.keys = []; this.fuels = [];
        const bTypes = ['generic', 'hospital', 'police', 'parking', 'restaurant'];

        for(let i = 0; i < this.numCities; i++) {
            let cityStart = i * this.cityWidth;
            for(let j = 0; j < 22; j++) {
                let bx = cityStart + 200 + Math.random() * (this.cityWidth - 400);
                let by = 0; let rand = Math.random();
                if (rand < 0.25) by = Math.random() * 60;
                else if (rand < 0.75) { by = 280 + Math.random() * 120; if(Math.random() > 0.5) by = 600 + Math.random() * 120; } 
                else by = 880 + Math.random() * 60;
                let bType = bTypes[Math.floor(Math.random() * bTypes.length)];
                this.buildings.push({ x: bx, y: by, w: 140 + Math.random() * 100, h: 140 + Math.random() * 100, type: bType });
            }
            for(let f = 0; f < 3; f++) this.fuels.push({ x: cityStart + 400 + Math.random() * 1600, y: 460 + Math.random() * 80, w: 24, h: 24, collected: false, amount: 30 });
            for(let f = 0; f < 4; f++) this.fuels.push({ x: cityStart + 300 + Math.random() * 1800, y: Math.random() > 0.5 ? 120 : 840, w: 24, h: 24, collected: false, amount: 55 });
            if (i < this.numCities - 1) {
                this.keys.push({ id: i, x: cityStart + 600 + Math.random() * 1300, y: Math.random() > 0.5 ? 130 : 850, w: 30, h: 30, collected: false });
                this.gates.push({ id: i, x: (i + 1) * this.cityWidth, y: 0, w: 45, h: this.height, active: true });
            }
        }
    }
    draw(ctx, camX, camY) {
        ctx.fillStyle = '#1c1c24'; ctx.fillRect(0 - camX, 0 - camY, this.totalWidth, this.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 4; ctx.setLineDash([30, 30]);
        ctx.beginPath(); ctx.moveTo(0 - camX, 300 - camY); ctx.lineTo(this.totalWidth - camX, 300 - camY);
        ctx.moveTo(0 - camX, 700 - camY); ctx.lineTo(this.totalWidth - camX, 700 - camY); ctx.stroke(); ctx.setLineDash([]);

        for(let b of this.buildings) {
            ctx.strokeStyle = '#0e0e14'; ctx.lineWidth = 3;
            if(b.type === 'hospital') {
                ctx.fillStyle = '#e8e8f0'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = '#ff2a2a'; ctx.fillRect(b.x - camX + b.w/2 - 8, b.y - camY + b.h/2 - 25, 16, 50); ctx.fillRect(b.x - camX + b.w/2 - 25, b.y - camY + b.h/2 - 8, 50, 16);
            } else if(b.type === 'police') {
                ctx.fillStyle = '#1e354d'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.fillText('POLICE', b.x - camX + 15, b.y - camY + 30);
            } else if(b.type === 'parking') {
                ctx.fillStyle = '#333'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 28px monospace'; ctx.fillText('P', b.x - camX + b.w/2 - 8, b.y - camY + b.h/2 + 10);
            } else if(b.type === 'restaurant') {
                ctx.fillStyle = '#8a4f1d'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 15px monospace'; ctx.fillText('DINER', b.x - camX + 12, b.y - camY + 28);
            } else {
                ctx.fillStyle = '#2b2b36'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
            }
        }
        for(let g of this.gates) if(g.active) { ctx.fillStyle = 'rgba(220, 40, 40, 0.85)'; ctx.fillRect(g.x - camX, g.y - camY, g.w, g.h); }
        ctx.fillStyle = '#ffd700'; for(let k of this.keys) if(!k.collected) ctx.fillRect(k.x - camX, k.y - camY, k.w, k.h);
        ctx.fillStyle = '#ff5500'; for(let f of this.fuels) if(!f.collected) ctx.fillRect(f.x - camX, f.y - camY, f.w, f.h);
        ctx.fillStyle = '#00ff66'; ctx.fillRect(this.totalWidth - 60 - camX, 0 - camY, 60, this.height);
    }
}
