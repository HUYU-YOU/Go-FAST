const keys = { up: false, down: false, left: false, right: false, nitro: false, shoot: false, enter: false, esc: false };

window.addEventListener('keydown', (e) => {
    let k = e.key.toLowerCase();
    if(k === 'arrowup' || k === 'z' || k === 'w') keys.up = true;
    if(k === 'arrowdown' || k === 's') keys.down = true;
    if(k === 'arrowleft' || k === 'q' || k === 'a') keys.left = true;
    if(k === 'arrowright' || k === 'd') keys.right = true;
    if(e.key === ' ') { keys.nitro = true; keys.shoot = true; e.preventDefault(); }
    if(k === 'f' || e.key === 'Shift') { keys.shoot = true; keys.nitro = true; e.preventDefault(); }
    if(e.key === 'Enter') { keys.enter = true; e.preventDefault(); }
    if(e.key === 'Escape') { keys.esc = true; e.preventDefault(); }
});

window.addEventListener('keyup', (e) => {
    let k = e.key.toLowerCase();
    if(k === 'arrowup' || k === 'z' || k === 'w') keys.up = false;
    if(k === 'arrowdown' || k === 's') keys.down = false;
    if(k === 'arrowleft' || k === 'q' || k === 'a') keys.left = false;
    if(k === 'arrowright' || k === 'd') keys.right = false;
    if(e.key === ' ') { keys.nitro = false; keys.shoot = false; }
    if(k === 'f' || e.key === 'Shift') { keys.shoot = false; keys.nitro = false; }
    if(e.key === 'Enter') keys.enter = false;
    if(e.key === 'Escape') keys.esc = false;
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // 2 = Clic Droit
        keys.nitro = true;
        keys.shoot = true;
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
        keys.nitro = false;
        keys.shoot = false;
    }
});

window.addEventListener('contextmenu', e => e.preventDefault());
