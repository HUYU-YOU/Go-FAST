// js/map.js
class CityMap {
    constructor() {
        this.tileSize = 250; 
        this.cols = 40;     
        this.rows = 40;     
        this.width = this.cols * this.tileSize;
        this.height = this.rows * this.tileSize;
        this.grid = []; this.keys = []; this.fuels = []; this.wrenches = [];
        this.bankSpawn = {x: 0, y: 0};
        this.generateMap(); this.placeInteractables();
    }

    generateMap() {
        let bankPlaced = false;
        for (let y = 0; y < this.rows; y++) {
            let row = [];
            for (let x = 0; x < this.cols; x++) {
                let type = 0; 
                let riverCenter = 20 + Math.floor(Math.sin(y * 0.4) * 4);
                if (x >= riverCenter - 2 && x <= riverCenter + 2) type = 2; 
                
                if (x % 3 === 0 || y % 3 === 0) type = (type === 2) ? 3 : 1; 
                
                if (type === 0) {
                    let r = Math.random();
                    if (!bankPlaced && x > 15 && x < 25 && y > 15 && y < 25) {
                        type = 5; bankPlaced = true; this.bankSpawn = {x: x, y: y};
                    } 
                    else if (r < 0.03) type = 5; 
                    else if (r < 0.08) type = 6; // Hopital
                    else if (r < 0.13) type = 7; // Garage
                    else if (r < 0.18) type = 8; // Police Station
                    else if (r < 0.30) type = 4; // Parc
                }
                row.push(type);
            }
            this.grid.push(row);
        }
    }

    placeInteractables() {
        for(let i=0; i<8; i++) {
            let kx, ky;
            do { kx = Math.floor(Math.random() * this.cols); ky = Math.floor(Math.random() * this.rows);
            } while (this.grid[ky][kx] !== 1 && this.grid[ky][kx] !== 4); 
            this.keys.push({ x: kx * this.tileSize + this.tileSize/2, y: ky * this.tileSize + this.tileSize/2, w: 30, h: 30, collected: false });
        }
        for(let i=0; i<40; i++) {
            let fx, fy;
            do { fx = Math.floor(Math.random() * this.cols); fy = Math.floor(Math.random() * this.rows);
            } while (this.grid[fy][fx] !== 1);
            this.fuels.push({ x: fx * this.tileSize + this.tileSize/2, y: fy * this.tileSize + this.tileSize/2, w: 24, h: 24, collected: false, amount: 40 });
        }
        // Clés à molette dans chaque garage
        for(let y = 0; y < this.rows; y++) {
            for(let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === 7) {
                    this.wrenches.push({ x: x * this.tileSize + this.tileSize/2, y: y * this.tileSize + this.tileSize/2, w: 24, h: 24, collected: false });
                }
            }
        }
    }

    draw(ctx, camX, camY) {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        let startCol = Math.max(0, Math.floor(camX / this.tileSize));
        let endCol = Math.min(this.cols, Math.ceil((camX + canvas.width) / this.tileSize));
        let startRow = Math.max(0, Math.floor(camY / this.tileSize));
        let endRow = Math.min(this.rows, Math.ceil((camY + canvas.height) / this.tileSize));

        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                let px = x * this.tileSize - camX; let py = y * this.tileSize - camY;
                let type = this.grid[y][x];

                // Base de trottoir pour les bâtiments
                if ([0, 5, 6, 7, 8].includes(type)) {
                    ctx.fillStyle = '#8a8a8a'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                }

                if (type === 0) { 
                    // Bâtiment Random
                    let bgIdx = (x * 13 + y * 7) % 15; 
                    let img = ASSETS.buildings[bgIdx];
                    if(img && img.complete && img.naturalWidth) {
                        ctx.drawImage(img, px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
                    } else {
                        ctx.fillStyle = '#4a4a52'; ctx.fillRect(px + 25, py + 25, this.tileSize - 50, this.tileSize - 50);
                    }
                } 
                else if (type === 5) { // Banque
                    ctx.fillStyle = '#f2e8c9'; ctx.fillRect(px + 20, py + 20, this.tileSize - 40, this.tileSize - 40);
                    ctx.fillStyle = '#d4af37'; ctx.fillRect(px + 40, py + 40, this.tileSize - 80, this.tileSize - 80);
                    ctx.fillStyle = 'black'; ctx.font = 'bold 40px Courier'; ctx.fillText('$', px + this.tileSize/2 - 12, py + this.tileSize/2 + 15);
                }
                else if (type === 6) { // CHU
                    if(ASSETS.chu && ASSETS.chu.complete && ASSETS.chu.naturalWidth) {
                        ctx.drawImage(ASSETS.chu, px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
                    } else {
                        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(px + 25, py + 25, this.tileSize - 50, this.tileSize - 50);
                        ctx.fillStyle = '#ff3333'; ctx.fillRect(px + this.tileSize/2 - 10, py + 40, 20, this.tileSize - 80); ctx.fillRect(px + 40, py + this.tileSize/2 - 10, this.tileSize - 80, 20);
                    }
                }
                else if (type === 7) { // Garage
                    if(ASSETS.garage && ASSETS.garage.complete && ASSETS.garage.naturalWidth) {
                        ctx.drawImage(ASSETS.garage, px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
                    } else {
                        ctx.fillStyle = '#222'; ctx.fillRect(px + 20, py + 20, this.tileSize - 40, this.tileSize - 40);
                        ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 30px Courier'; ctx.fillText('🔧', px + this.tileSize/2 - 15, py + this.tileSize/2 + 10);
                    }
                }
                else if (type === 8) { // Police Station
                    if(ASSETS.police && ASSETS.police.complete && ASSETS.police.naturalWidth) {
                        ctx.drawImage(ASSETS.police, px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
                    } else {
                        ctx.fillStyle = '#1a1aff'; ctx.fillRect(px + 20, py + 20, this.tileSize - 40, this.tileSize - 40);
                        ctx.fillStyle = 'white'; ctx.font = 'bold 24px Courier'; ctx.fillText('POLICE', px + 35, py + this.tileSize/2 + 10);
                    }
                }
                else if (type === 1) { // Road
                    ctx.fillStyle = '#36363d'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 2; ctx.setLineDash([20, 20]); ctx.beginPath();
                    ctx.moveTo(px, py + this.tileSize/2); ctx.lineTo(px + this.tileSize, py + this.tileSize/2);
                    ctx.moveTo(px + this.tileSize/2, py); ctx.lineTo(px + this.tileSize/2, py + this.tileSize); ctx.stroke(); ctx.setLineDash([]);
                }
                else if (type === 2) { 
                    ctx.fillStyle = '#1a8cff'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(px + 20, py + 20, 40, 10);
                }
                else if (type === 3) { 
                    ctx.fillStyle = '#444'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#222'; ctx.fillRect(px, py, this.tileSize, 10); ctx.fillRect(px, py + this.tileSize - 10, this.tileSize, 10);
                }
                else if (type === 4) { 
                    ctx.fillStyle = '#4d8a2a'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#3a6b1e'; ctx.beginPath(); ctx.arc(px + 50, py + 50, 20, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(px + 180, py + 160, 30, 0, Math.PI*2); ctx.fill();
                }
            }
        }
        
        // Items
        for(let k of this.keys) {
            if(!k.collected && k.x > camX && k.x < camX+canvas.width && k.y > camY && k.y < camY+canvas.height) {
                ctx.fillStyle = '#ffd700'; ctx.fillRect(k.x - camX - k.w/2, k.y - camY - k.h/2, k.w, k.h);
                ctx.fillStyle = '#000'; ctx.font = '16px Courier'; ctx.fillText('K', k.x - camX - 5, k.y - camY + 5);
            }
        }
        for(let f of this.fuels) {
            if(!f.collected && f.x > camX && f.x < camX+canvas.width && f.y > camY && f.y < camY+canvas.height) {
                ctx.fillStyle = '#ff5500'; ctx.fillRect(f.x - camX - f.w/2, f.y - camY - f.h/2, f.w, f.h);
                ctx.fillStyle = 'white'; ctx.font = '12px Courier'; ctx.fillText('F', f.x - camX - 4, f.y - camY + 4);
            }
        }
        for(let w of this.wrenches) {
            if(!w.collected && w.x > camX && w.x < camX+canvas.width && w.y > camY && w.y < camY+canvas.height) {
                ctx.fillStyle = '#00ffcc'; ctx.fillRect(w.x - camX - w.w/2, w.y - camY - w.h/2, w.w, w.h);
                ctx.fillStyle = 'black'; ctx.font = '16px Courier'; ctx.fillText('🔧', w.x - camX - 8, w.y - camY + 6);
            }
        }
    }

    getTileTypeAt(x, y) {
        let gridX = Math.floor(x / this.tileSize); let gridY = Math.floor(y / this.tileSize);
        if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return 0; 
        return this.grid[gridY][gridX];
    }
}
