class CityMap {
    constructor() {
        this.tileSize = 200; // Taille d'un bloc (route ou bâtiment)
        // 0: Bâtiment/Vide, 1: Route Horizontale, 2: Route Verticale, 3: Intersection, 4: Parking
        this.grid = [
            [0, 0, 2, 0, 0, 4, 2, 0, 0],
            [1, 1, 3, 1, 1, 1, 3, 1, 1],
            [0, 0, 2, 0, 0, 0, 2, 0, 0],
            [0, 4, 3, 1, 1, 1, 3, 0, 0],
            [0, 0, 2, 0, 0, 0, 2, 0, 0],
            [1, 1, 3, 1, 1, 1, 3, 1, 1],
            [0, 0, 2, 0, 4, 0, 2, 0, 0]
        ];
        this.width = this.grid[0].length * this.tileSize;
        this.height = this.grid.length * this.tileSize;
        
        this.pedestrianCrossings = []; // Passages piétons
        this.generateDetails();
    }

    generateDetails() {
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (this.grid[y][x] === 3) {
                    // Ajouter des passages piétons autour des intersections
                    this.pedestrianCrossings.push({x: x * this.tileSize, y: y * this.tileSize});
                }
            }
        }
    }

    draw(ctx, camX, camY) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0 - camX, 0 - camY, this.width, this.height);

        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                let px = x * this.tileSize - camX;
                let py = y * this.tileSize - camY;
                let type = this.grid[y][x];

                if (type === 0) {
                    // Bâtiments avec trottoirs
                    ctx.fillStyle = '#555'; // Trottoir
                    ctx.fillRect(px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
                    ctx.fillStyle = '#2b2b36'; // Bâtiment
                    ctx.fillRect(px + 20, py + 20, this.tileSize - 40, this.tileSize - 40);
                    ctx.strokeStyle = '#0e0e14'; ctx.strokeRect(px + 20, py + 20, this.tileSize - 40, this.tileSize - 40);
                } 
                else if (type === 1 || type === 2 || type === 3) {
                    // Asphalte de la route
                    ctx.fillStyle = '#1c1c24';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    
                    // Lignes blanches pointillées
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([15, 15]);
                    ctx.beginPath();
                    if (type === 1) { // Ligne Horizontale
                        ctx.moveTo(px, py + this.tileSize / 2); ctx.lineTo(px + this.tileSize, py + this.tileSize / 2);
                    } else if (type === 2) { // Ligne Verticale
                        ctx.moveTo(px + this.tileSize / 2, py); ctx.lineTo(px + this.tileSize / 2, py + this.tileSize);
                    }
                    ctx.stroke(); ctx.setLineDash([]);
                }
                else if (type === 4) {
                    // Parking
                    ctx.fillStyle = '#222';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 30px monospace';
                    ctx.fillText('P', px + this.tileSize / 2 - 10, py + this.tileSize / 2 + 10);
                }
            }
        }
        
        // Dessin des passages piétons
        ctx.fillStyle = '#eee';
        for (let cross of this.pedestrianCrossings) {
            // Un petit exemple visuel de passage piéton à l'intersection
            for(let i=0; i<4; i++) {
                ctx.fillRect(cross.x - camX + 20 + (i*40), cross.y - camX - 10, 20, 10);
            }
        }
    }

    // Vérifie si la voiture touche un bâtiment (collision)
    isSolid(x, y) {
        let gridX = Math.floor(x / this.tileSize);
        let gridY = Math.floor(y / this.tileSize);
        if(gridY < 0 || gridY >= this.grid.length || gridX < 0 || gridX >= this.grid[0].length) return true;
        return this.grid[gridY][gridX] === 0;
    }
}
