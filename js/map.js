class CityMap {
    constructor() {
        this.tileSize = 250; // Taille d'un bloc de ville
        this.cols = 40;      // Largeur de la carte (10 000 px)
        this.rows = 20;      // Hauteur de la carte (5 000 px)
        this.width = this.cols * this.tileSize;
        this.height = this.rows * this.tileSize;
        
        // 0: Bâtiment, 1: Route, 2: Eau (Fleuve), 3: Pont, 4: Parc (Herbe)
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
                let type = 0; // Par défaut, un bâtiment
                
                // 1. Génération du fleuve sinueux au milieu de la map
                let riverCenter = 20 + Math.floor(Math.sin(y * 0.4) * 4);
                if (x >= riverCenter - 2 && x <= riverCenter + 2) {
                    type = 2; // Eau
                }

                // 2. Génération du quadrillage routier (routes toutes les 3 cases)
                if (x % 3 === 0 || y % 3 === 0) {
                    if (type === 2) {
                        type = 3; // Si la route croise l'eau, ça devient un pont
                    } else {
                        type = 1; // Route normale
                    }
                }

                // 3. Génération des Parcs (remplace certains bâtiments)
                if (type === 0 && Math.random() < 0.15) {
                    type = 4; // Parc
                }

                row.push(type);
            }
            this.grid.push(row);
        }
    }

    placeInteractables() {
        // Placer des clés dorées aléatoirement sur des routes ou dans des parcs
        for(let i=0; i<5; i++) {
            let kx, ky;
            do {
                kx = Math.floor(Math.random() * this.cols);
                ky = Math.floor(Math.random() * this.rows);
            } while (this.grid[ky][kx] !== 1 && this.grid[ky][kx] !== 4); // Seulement sur route ou parc
            
            this.keys.push({
                x: kx * this.tileSize + this.tileSize/2,
                y: ky * this.tileSize + this.tileSize/2,
                w: 30, h: 30, collected: false
            });
        }

        // Placer du carburant
        for(let i=0; i<20; i++) {
            let fx, fy;
            do {
                fx = Math.floor(Math.random() * this.cols);
                fy = Math.floor(Math.random() * this.rows);
            } while (this.grid[fy][fx] !== 1);
            
            this.fuels.push({
                x: fx * this.tileSize + this.tileSize/2,
                y: fy * this.tileSize + this.tileSize/2,
                w: 24, h: 24, collected: false, amount: 40
            });
        }
    }

    draw(ctx, camX, camY) {
        // Fond noir par défaut
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Optimisation du rendu : on ne dessine que ce qui est visible par la caméra
        let startCol = Math.max(0, Math.floor(camX / this.tileSize));
        let endCol = Math.min(this.cols, Math.ceil((camX + canvas.width) / this.tileSize));
        let startRow = Math.max(0, Math.floor(camY / this.tileSize));
        let endRow = Math.min(this.rows, Math.ceil((camY + canvas.height) / this.tileSize));

        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                let px = x * this.tileSize - camX;
                let py = y * this.tileSize - camY;
                let type = this.grid[y][x];

                if (type === 0) { // Bâtiment (Gris GTA 1)
                    ctx.fillStyle = '#6b6b6b'; // Trottoir
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#4a4a52'; // Toit du bâtiment
                    ctx.fillRect(px + 15, py + 15, this.tileSize - 30, this.tileSize - 30);
                    // Détails toit
                    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
                    ctx.strokeRect(px + 15, py + 15, this.tileSize - 30, this.tileSize - 30);
                } 
                else if (type === 1) { // Route
                    ctx.fillStyle = '#36363d'; // Asphalte foncé
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    // Marquage au sol
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 2; ctx.setLineDash([20, 20]);
                    ctx.beginPath();
                    ctx.moveTo(px, py + this.tileSize/2); ctx.lineTo(px + this.tileSize, py + this.tileSize/2);
                    ctx.moveTo(px + this.tileSize/2, py); ctx.lineTo(px + this.tileSize/2, py + this.tileSize);
                    ctx.stroke(); ctx.setLineDash([]);
                }
                else if (type === 2) { // Eau (Fleuve bleu clair GTA)
                    ctx.fillStyle = '#1a8cff';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    // Petites vagues
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect(px + 20, py + 20, 40, 10);
                    ctx.fillRect(px + 120, py + 180, 50, 10);
                }
                else if (type === 3) { // Pont (sur l'eau)
                    ctx.fillStyle = '#444'; // Base du pont
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#6b6b6b'; // Trottoir du pont
                    ctx.fillRect(px, py, this.tileSize, 15);
                    ctx.fillRect(px, py + this.tileSize - 15, this.tileSize, 15);
                    ctx.fillRect(px, py, 15, this.tileSize);
                    ctx.fillRect(px + this.tileSize - 15, py, 15, this.tileSize);
                }
                else if (type === 4) { // Parc
                    ctx.fillStyle = '#4d8a2a'; // Herbe
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#3a6b1e'; // Arbres (cercles)
                    ctx.beginPath(); ctx.arc(px + 50, py + 50, 20, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(px + 180, py + 160, 30, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(px + 80, py + 200, 25, 0, Math.PI*2); ctx.fill();
                }
            }
        }

        // Dessin des objets interactifs
        ctx.fillStyle = '#ffd700'; 
        for(let k of this.keys) {
            if(!k.collected && k.x > camX && k.x < camX+canvas.width && k.y > camY && k.y < camY+canvas.height) {
                ctx.fillRect(k.x - camX - k.w/2, k.y - camY - k.h/2, k.w, k.h);
                ctx.strokeStyle = 'white'; ctx.strokeRect(k.x - camX - k.w/2, k.y - camY - k.h/2, k.w, k.h);
            }
        }
        ctx.fillStyle = '#ff5500'; 
        for(let f of this.fuels) {
            if(!f.collected && f.x > camX && f.x < camX+canvas.width && f.y > camY && f.y < camY+canvas.height) {
                ctx.fillRect(f.x - camX - f.w/2, f.y - camY - f.h/2, f.w, f.h);
            }
        }
    }

    // Renvoie le type de terrain à une coordonnée exacte
    getTileTypeAt(x, y) {
        let gridX = Math.floor(x / this.tileSize);
        let gridY = Math.floor(y / this.tileSize);
        if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return 0; // Bâtiment par défaut (Mur invisible)
        return this.grid[gridY][gridX];
    }
}
