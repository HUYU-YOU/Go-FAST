class CityMap {
    constructor() {
        this.tileSize = 250; 
        this.cols = 40;     
        this.rows = 20;     
        this.width = this.cols * this.tileSize;
        this.height = this.rows * this.tileSize;
        
        // 0: Bâtiment, 1: Route, 2: Eau (Fleuve), 3: Pont, 4: Parc
        this.grid = [];
        this.keys = [];
        this.fuels = [];
        
        this.generateMap();
        this.placeInteractables();
    }

    generateMap() {
        for (let y = 0; y < this.rows; y++) {
            let row = [];
            for (let x = 0; x < this.cols; x++) {
                let type = 0; 
                let riverCenter = 20 + Math.floor(Math.sin(y * 0.4) * 4);
                if (x >= riverCenter - 2 && x <= riverCenter + 2) type = 2;

                if (x % 3 === 0 || y % 3 === 0) {
                    if (type === 2) type = 3; 
                    else type = 1; 
                }

                if (type === 0 && Math.random() < 0.15) type = 4;
                row.push(type);
            }
            this.grid.push(row);
        }
    }

    placeInteractables() {
        for(let i=0; i<5; i++) {
            let kx, ky;
            do {
                kx = Math.floor(Math.random() * this.cols);
                ky = Math.floor(Math.random() * this.rows);
            } while (this.grid[ky][kx] !== 1 && this.grid[ky][kx] !== 4); 
            
            this.keys.push({ x: kx * this.tileSize + this.tileSize/2, y: ky * this.tileSize + this.tileSize/2, w: 30, h: 30, collected: false });
        }

        for(let i=0; i<20; i++) {
            let fx, fy;
            do {
                fx = Math.floor(Math.random() * this.cols);
                fy = Math.floor(Math.random() * this.rows);
            } while (this.grid[fy][fx] !== 1);
            
            this.fuels.push({ x: fx * this.tileSize + this.tileSize/2, y: fy * this.tileSize + this.tileSize/2, w: 24, h: 24, collected: false, amount: 40 });
        }
    }

    draw(ctx, camX, camY) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let startCol = Math.max(0, Math.floor(camX / this.tileSize));
        let endCol = Math.min(this.cols, Math.ceil((camX + canvas.width) / this.tileSize));
        let startRow = Math.max(0, Math.floor(camY / this.tileSize));
        let endRow = Math.min(this.rows, Math.ceil((camY + canvas.height) / this.tileSize));

        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                let px = x * this.tileSize - camX;
                let py = y * this.tileSize - camY;
                let type = this.grid[y][x];

                if (type === 0) { 
                    ctx.fillStyle = '#6b6b6b'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#4a4a52'; ctx.fillRect(px + 15, py + 15, this.tileSize - 30, this.tileSize - 30);
                    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(px + 15, py + 15, this.tileSize - 30, this.tileSize - 30);
                } 
                else if (type === 1) { 
                    ctx.fillStyle = '#36363d'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 2; ctx.setLineDash([20, 20]); ctx.beginPath();
                    ctx.moveTo(px, py + this.tileSize/2); ctx.lineTo(px + this.tileSize, py + this.tileSize/2);
                    ctx.moveTo(px + this.tileSize/2, py); ctx.lineTo(px + this.tileSize/2, py + this.tileSize); ctx.stroke(); ctx.setLineDash([]);
                }
                else if (type === 2) { 
                    ctx.fillStyle = '#1a8cff'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(px + 20, py + 20, 40, 10); ctx.fillRect(px + 120, py + 180, 50, 10);
                }
                else if (type === 3) { 
                    ctx.fillStyle = '#444'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#6b6b6b'; ctx.fillRect(px, py, this.tileSize, 15); ctx.fillRect(px, py + this.tileSize - 15, this.tileSize, 15);
                    ctx.fillRect(px, py, 15, this.tileSize); ctx.fillRect(px + this.tileSize - 15, py, 15, this.tileSize);
                }
                else if (type === 4) { 
                    ctx.fillStyle = '#4d8a2a'; ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#3a6b1e'; ctx.beginPath(); ctx.arc(px + 50, py + 50, 20, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(px + 180, py + 160, 30, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px + 80, py + 200, 25, 0, Math.PI*2); ctx.fill();
                }
            }
        }

        ctx.fillStyle = '#ffd700'; 
        for(let k of this.keys) {
            if(!k.collected && k.x > camX && k.x < camX+canvas.width && k.y > camY && k.y < camY+canvas.height) {
                ctx.fillRect(k.x - camX - k.w/2, k.y - camY - k.h/2, k.w, k.h); ctx.strokeStyle = 'white'; ctx.strokeRect(k.x - camX - k.w/2, k.y - camY - k.h/2, k.w, k.h);
            }
        }
        ctx.fillStyle = '#ff5500'; 
        for(let f of this.fuels) {
            if(!f.collected && f.x > camX && f.x < camX+canvas.width && f.y > camY && f.y < camY+canvas.height) {
                ctx.fillRect(f.x - camX - f.w/2, f.y - camY - f.h/2, f.w, f.h);
            }
        }
    }

    getTileTypeAt(x, y) {
        let gridX = Math.floor(x / this.tileSize);
        let gridY = Math.floor(y / this.tileSize);
        if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return 0; 
        return this.grid[gridY][gridX];
    }
}
