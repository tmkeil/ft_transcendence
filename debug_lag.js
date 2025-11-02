// Debug Tool: Lag Detection Script
// Run this in browser console to detect lag sources

console.log("🔍 LAG DIAGNOSTIC TOOL");
console.log("======================");

// 1. Check for multiple render loops
let renderLoopCount = 0;
const originalRunRenderLoop = BABYLON.Engine.prototype.runRenderLoop;
BABYLON.Engine.prototype.runRenderLoop = function(renderFunction) {
    renderLoopCount++;
    console.log(`🔴 RENDER LOOP #${renderLoopCount} STARTED`);
    return originalRunRenderLoop.call(this, renderFunction);
};

// 2. Monitor WebSocket connections
let wsCount = 0;
const originalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    wsCount++;
    console.log(`🔵 WEBSOCKET #${wsCount} CREATED: ${url}`);
    const ws = new originalWebSocket(url, protocols);
    
    ws.addEventListener('open', () => console.log(`✅ WebSocket #${wsCount} OPENED`));
    ws.addEventListener('close', () => console.log(`❌ WebSocket #${wsCount} CLOSED`));
    
    return ws;
};

// 3. Monitor setInterval calls (game loops)
let intervalCount = 0;
const originalSetInterval = window.setInterval;
window.setInterval = function(callback, delay) {
    intervalCount++;
    console.log(`⏰ INTERVAL #${intervalCount} CREATED (${delay}ms)`);
    return originalSetInterval.call(this, callback, delay);
};

// 4. Performance monitoring
let frameCount = 0;
let startTime = performance.now();

function monitorFrames() {
    frameCount++;
    if (frameCount % 60 === 0) { // Every 60 frames (~1 second at 60fps)
        const currentTime = performance.now();
        const avgFrameTime = (currentTime - startTime) / 60;
        console.log(`📊 AVG FRAME TIME: ${avgFrameTime.toFixed(2)}ms (${(1000/avgFrameTime).toFixed(1)} FPS)`);
        
        if (avgFrameTime > 20) {
            console.warn(`⚠️  LAG DETECTED: Frame time too high!`);
            console.warn(`   - Render Loops: ${renderLoopCount}`);
            console.warn(`   - WebSockets: ${wsCount}`);
            console.warn(`   - Intervals: ${intervalCount}`);
        }
        
        startTime = currentTime;
    }
    requestAnimationFrame(monitorFrames);
}

monitorFrames();

// 5. Memory monitoring
setInterval(() => {
    if (performance.memory) {
        const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
        console.log(`💾 MEMORY: ${used}MB / ${total}MB`);
        
        if (used > 100) {
            console.warn(`⚠️  HIGH MEMORY USAGE: ${used}MB`);
        }
    }
}, 5000);

console.log("✅ LAG DIAGNOSTIC ACTIVE - Check console for lag sources");