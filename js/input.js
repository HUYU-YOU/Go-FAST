const keys = { up: false, down: false, left: false, right: false, nitro: false, shoot: false, enter: false, esc: false };
window.mouse = { x: 800, y: 480, active: false }; // Track position souris par rapport au centre

window.addEventListener('keydown', (e) => {
    let k = e.key.toLowerCase();
    if(k === 'arrowup' || k === 'z' || k === 'w') keys.up = true;
    if(k === 'arrowdown' || k === 's') keys.down = true;
    if(k === 'arrowleft' || k === 'q' || k === 'a') keys.left = true;
    if(k === 'arrowright' || k === 'd') keys.right = true;
    if(e.key === ' ') { keys.nitro = true; keys.shoot = true; e.preventDefault(); }
    if(k === 'f' || e.key === 'shift') { keys.shoot = true; keys.nitro = true; e.preventDefault(); }
    if(e.key === 'enter') { keys.enter = true; e.preventDefault(); }
    if(e.key === 'escape') { keys.esc = true; e.preventDefault(); }
});

window.addEventListener('keyup', (e) => {
    let k = e.key.toLowerCase();
    if(k === 'arrowup' || k === 'z' || k === 'w') keys.up = false;
    if(k === 'arrowdown' || k === 's') keys.down = false;
    if(k === 'arrowleft' || k === 'q' || k === 'a') keys.left = false;
    if(k === 'arrowright' || k === 'd') keys.right = false;
    if(e.key === ' ') { keys.nitro = false; keys.shoot = false; }
    if(k === 'f' || e.key === 'shift') { keys.shoot = false; keys.nitro = false; }
    if(e.key === 'enter') keys.enter = false;
    if(e.key === 'escape') keys.esc = false;
});

// Suivi position souris pour viser
window.addEventListener('mousemove', (e) => {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1600 / rect.width;
    const scaleY = 960 / rect.height;
    window.mouse.x = (e.clientX - rect.left) * scaleX;
    window.mouse.y = (e.clientY - rect.top) * scaleY;
    window.mouse.active = true;
});

// GESTION DES CLICS SOURIS
window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Clic Gauche = Gaz + Action
        keys.up = true;
        keys.nitro = true;
        keys.shoot = true;
    }
    if (e.button === 2) { // Clic Droit = Frein/Recul
        keys.down = true;
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) { 
        keys.up = false;
        keys.nitro = false;
        keys.shoot = false;
    }
    if (e.button === 2) { 
        keys.down = false; 
    }
});

// Empêche le menu du navigateur au clic droit
window.addEventListener('contextmenu', e => e.preventDefault());
