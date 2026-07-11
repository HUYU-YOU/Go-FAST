// État global des touches
const keys = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', (e) => {
    let k = e.key.toLowerCase();
    if(k === 'arrowup' || k === 'z' || k === 'w') keys.up = true;
    if(k === 'arrowdown' || k === 's') keys.down = true;
    if(k === 'arrowleft' || k === 'q' || k === 'a') keys.left = true;
    if(k === 'arrowright' || k === 'd') keys.right = true;
});

window.addEventListener('keyup', (e) => {
    let k = e.key.toLowerCase();
    if(k === 'arrowup' || k === 'z' || k === 'w') keys.up = false;
    if(k === 'arrowdown' || k === 's') keys.down = false;
    if(k === 'arrowleft' || k === 'q' || k === 'a') keys.left = false;
    if(k === 'arrowright' || k === 'd') keys.right = false;
});
