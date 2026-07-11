class GameMap {
    constructor() {
        this.cityWidth = 2500; this.numCities = 5; this.totalWidth = this.cityWidth * this.numCities;
        this.height = 1000; this.buildings = []; this.gates = []; this.keys = []; this.fuels = [];
        const bTypes = ['generic', 'hospital', 'police', 'parking', 'restaurant'];

        for(let i = 0; i < this.numCities; i++) {
            let cityStart = i * this.cityWidth;
            for(let j = 0; j < 25; j++) {
                let bx = cityStart + 150 + Math.random() * (this.cityWidth - 300);
                let by = 0; let rand = Math.random();
                if (rand < 0.25) by = Math.random() * 80;
                else if (rand < 0.75) { by = 280 + Math.random() * 120; if(Math.random() > 0.5) by = 580 + Math.random() * 120; } 
                else by = 860 + Math.random() * 80;
                let bType = bTypes[Math.floor(Math.random() * bTypes.length)];
                this.buildings.push({ x: bx, y: by, w: 130 + Math.random() * 120, h: 130 + Math.random() * 120, type: bType });
            }
            for(let f = 0; f < 2; f++) this.fuels.push({ x: cityStart + 400 + Math.random() * 1600, y: 450 + Math.random() * 100, w: 24, h: 24, collected: false, amount: 25 });
            for(let f = 0; f < 4; f++) this.fuels.push({ x: cityStart + 300 + Math.random() * 1800, y: Math.random() > 0.5 ? 100 + Math.random() * 100 : 800 + Math.random() * 100, w: 24, h: 24, collected: false, amount: 50 });
            if (i < this.numCities - 1) {
                this.keys.push({ id: i, x: cityStart + 600 + Math.random() * 1300, y: Math.random() > 0.5 ? 120 : 880, w: 30, h: 30, collected: false });
                this.gates.push({ id: i, x: (i + 1) * this.cityWidth, y: 0, w: 45, h: this.height, active: true });
            }
        }
    }
    draw(ctx, camX, camY) {
        ctx.fillStyle = '#22222b'; ctx.fillRect(0 - camX, 0 - camY, this.totalWidth, this.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 4; ctx.setLineDash([30, 30]);
        ctx.beginPath(); ctx.moveTo(0 - camX, 300 - camY); ctx.lineTo(this.totalWidth - camX, 300 - camY);
        ctx.moveTo(0 - camX, 700 - camY); ctx.lineTo(this.totalWidth - camX, 700 - camY); ctx.stroke(); ctx.setLineDash([]);

        for(let b of this.buildings) {
            ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
            if(b.type === 'hospital') {
                ctx.fillStyle = '#eeeeee'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = 'red'; ctx.fillRect(b.x - camX + b.w/2 - 10, b.y - camY + b.h/2 - 30, 20, 60); ctx.fillRect(b.x - camX + b.w/2 - 30, b.y - camY + b.h/2 - 10, 60, 20);
            } else if(b.type === 'police') {
                ctx.fillStyle = '#1a3c5e'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = 'white'; ctx.font = 'bold 20px monospace'; ctx.fillText('POLICE', b.x - camX + 10, b.y - camY + 30);
            } else if(b.type === 'parking') {
                ctx.fillStyle = '#444'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = 'white'; ctx.font = 'bold 30px monospace'; ctx.fillText('P', b.x - camX + b.w/2 - 10, b.y - camY + b.h/2 + 10);
                ctx.strokeStyle = '#fff'; ctx.setLineDash([10, 10]); ctx.strokeRect(b.x - camX + 10, b.y - camY + 10, b.w - 20, b.h - 20); ctx.setLineDash([]);
            } else if(b.type === 'restaurant') {
                ctx.fillStyle = '#b35900'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
                ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 16px monospace'; ctx.fillText('DINER', b.x - camX + 10, b.y - camY + 25);
            } else {
                ctx.fillStyle = '#3a3a45'; ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h); ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
            }
        }
        for(let g of this.gates) if(g.active) { ctx.fillStyle = 'rgba(230, 30, 30, 0.85)'; ctx.fillRect(g.x - camX, g.y - camY, g.w, g.h); }
        ctx.fillStyle = '#ffd700'; for(let k of this.keys) if(!k.collected) ctx.fillRect(k.x - camX, k.y - camY, k.w, k.h);
        ctx.fillStyle = '#ff5500'; for(let f of this.fuels) if(!f.collected) ctx.fillRect(f.x - camX, f.y - camY, f.w, f.h);
        ctx.fillStyle = '#00ff66'; ctx.fillRect(this.totalWidth - 60 - camX, 0 - camY, 60, this.height);
    }
}
