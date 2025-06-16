// src/js/hello-world.js

console.log('Hello World JS loaded!');

document.addEventListener('DOMContentLoaded', function() {
    const targetDiv = document.querySelector('.umig-hello-world');
    if (targetDiv) {
        targetDiv.textContent = 'Hello from JavaScript!';
    }
});
