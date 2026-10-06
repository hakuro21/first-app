const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.querySelector("#score");
const livesDisplay = document.querySelector("#lives");
const message = document.querySelector("#message");
const messageIcon = document.querySelector("#message-icon");
const messageTitle = document.querySelector("#message-title");
const messageText = document.querySelector("#message-text");

const WIDTH = 960;
const HEIGHT = 540;
const WORLD_WIDTH = 2700;
const GRAVITY = 1800;
const MOVE_SPEED = 270;
const JUMP_SPEED = 670;
const TOTAL_STARS = 8;

const platforms = [
    { x: 0, y: 458, width: 590, height: 100 },
    { x: 680, y: 458, width: 560, height: 100 },
    { x: 1340, y: 458, width: 690, height: 100 },
    { x: 2120, y: 458, width: 580, height: 100 },
    { x: 500, y: 365, width: 150, height: 18 },
    { x: 820, y: 350, width: 155, height: 18 },
    { x: 1080, y: 390, width: 130, height: 18 },
    { x: 1230, y: 325, width: 150, height: 18 },
    { x: 1510, y: 365, width: 150, height: 18 },
    { x: 1780, y: 335, width: 160, height: 18 },
    { x: 2030, y: 375, width: 140, height: 18 },
    { x: 2320, y: 355, width: 160, height: 18 }
];

const stars = [
    { x: 360, y: 405 }, { x: 555, y: 315 }, { x: 870, y: 300 },
    { x: 1140, y: 340 }, { x: 1290, y: 275 }, { x: 1570, y: 315 },
    { x: 1840, y: 285 }, { x: 2390, y: 305 }
].map((star) => ({ ...star, collected: false, phase: Math.random() * Math.PI * 2 }));

const enemyStarts = [
    { x: 760, min: 700, max: 1190 },
    { x: 1530, min: 1360, max: 1980 },
    { x: 2220, min: 2140, max: 2600 }
];

const player = {
    x: 70, y: 390, width: 34, height: 48,
    vx: 0, vy: 0, grounded: false, facing: 1, invulnerable: 0
};

const controls = { left: false, right: false, jump: false };
let enemies = [];
let cameraX = 0;
let score = 0;
let lives = 3;
let gameState = "playing";
let previousTime = 0;
let elapsed = 0;

function resetGame() {
    player.x = 70;
    player.y = 390;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.facing = 1;
    player.invulnerable = 0;
    cameraX = 0;
    score = 0;
    lives = 3;
    gameState = "playing";
    for (const star of stars) star.collected = false;
    enemies = enemyStarts.map((enemy, index) => ({
        ...enemy, x: enemy.x, y: 418, width: 38, height: 40,
        direction: index % 2 === 0 ? 1 : -1, alive: true
    }));
    message.hidden = true;
    updateHud();
}

function updateHud() {
    scoreDisplay.textContent = String(score);
    livesDisplay.textContent = `${"♥ ".repeat(lives).trim()}${"♡ ".repeat(3 - lives)}`.trim();
    livesDisplay.setAttribute("aria-label", `残りライフ ${lives}`);
}

function finish(won) {
    gameState = won ? "won" : "lost";
    messageIcon.textContent = won ? "🏁" : "💫";
    messageTitle.textContent = won ? "ゴール！" : "ゲームオーバー";
    messageText.textContent = won
        ? `星を ${score} 個集めたよ。おめでとう！`
        : "もう一度チャレンジしてみよう！";
    message.hidden = false;
}

function respawn() {
    lives -= 1;
    updateHud();
    if (lives <= 0) {
        finish(false);
        return;
    }
    player.x = Math.max(70, Math.min(player.x - 100, 2050));
    player.y = 370;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 1.5;
}

function movePlayer(dt) {
    const direction = Number(controls.right) - Number(controls.left);
    player.vx = direction * MOVE_SPEED;
    if (direction !== 0) player.facing = direction;
    if (controls.jump && player.grounded) {
        player.vy = -JUMP_SPEED;
        player.grounded = false;
    }

    const previousY = player.y;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.vx * dt));
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    player.grounded = false;

    if (player.vy >= 0) {
        for (const platform of platforms) {
            const overlapsX = player.x + player.width > platform.x && player.x < platform.x + platform.width;
            const crossedTop = previousY + player.height <= platform.y && player.y + player.height >= platform.y;
            if (overlapsX && crossedTop) {
                player.y = platform.y - player.height;
                player.vy = 0;
                player.grounded = true;
            }
        }
    }

    if (player.y > HEIGHT + 100) respawn();
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
}

function updateEnemies(dt) {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.x += enemy.direction * 75 * dt;
        if (enemy.x < enemy.min || enemy.x + enemy.width > enemy.max) enemy.direction *= -1;
        const overlaps = player.x + player.width > enemy.x && player.x < enemy.x + enemy.width
            && player.y + player.height > enemy.y && player.y < enemy.y + enemy.height;
        if (!overlaps || player.invulnerable > 0) continue;

        if (player.vy > 100 && player.y + player.height - enemy.y < 25) {
            enemy.alive = false;
            player.vy = -JUMP_SPEED * 0.48;
        } else {
            player.invulnerable = 1;
            player.vy = -JUMP_SPEED * 0.48;
            player.vx = player.x < enemy.x ? -220 : 220;
            lives -= 1;
            updateHud();
            if (lives <= 0) finish(false);
        }
    }
}

function collectStars() {
    for (const star of stars) {
        if (star.collected) continue;
        const dx = player.x + player.width / 2 - star.x;
        const dy = player.y + player.height / 2 - star.y;
        if (Math.hypot(dx, dy) < 32) {
            star.collected = true;
            score += 1;
            updateHud();
        }
    }
}

function update(dt) {
    if (gameState !== "playing") return;
    movePlayer(dt);
    if (gameState !== "playing") return;
    updateEnemies(dt);
    if (gameState !== "playing") return;
    collectStars();
    cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.36));
    if (player.x >= WORLD_WIDTH - 120) finish(true);
}

function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#091d39");
    sky.addColorStop(0.28, "#183d6b");
    sky.addColorStop(0.62, "#4d8cc7");
    sky.addColorStop(1, "#cdeaef");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(255, 232, 140, .95)";
    ctx.beginPath();
    ctx.arc(790 - cameraX * 0.08, 92, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, .9)";
    for (const cloud of [{ x: 130, y: 115 }, { x: 490, y: 78 }, { x: 880, y: 150 }, { x: 1180, y: 105 }, { x: 1740, y: 115 }, { x: 2220, y: 85 }]) {
        const x = cloud.x - cameraX * 0.22;
        if (x < -100 || x > WIDTH + 100) continue;
        ctx.beginPath();
        ctx.ellipse(x, cloud.y, 36, 13, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 22, cloud.y + 3, 19, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 21, cloud.y + 4, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.42)";
    for (let i = 0; i < 28; i++) {
        const x = ((i * 101) + (cameraX * 0.45)) % (WIDTH + 90) - 40;
        const y = 38 + ((i * 47) % 180);
        const radius = 1.2 + (i % 3) * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#7ec7b4";
    ctx.beginPath();
    ctx.moveTo(0, 420);
    for (let x = 0; x <= WIDTH + 60; x += 60) {
        const worldX = x + cameraX * 0.35;
        ctx.lineTo(x, 342 + Math.sin(worldX * 0.009) * 30 + Math.sin(worldX * 0.017) * 12);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.fill();

    ctx.fillStyle = "#4cb19d";
    ctx.beginPath();
    ctx.moveTo(0, 446);
    for (let x = 0; x <= WIDTH + 70; x += 70) {
        const worldX = x + cameraX * 0.55;
        ctx.lineTo(x, 402 + Math.sin(worldX * 0.006 + 1.5) * 18);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.fill();

    ctx.fillStyle = "rgba(25, 42, 69, .12)";
    for (let i = 0; i < 12; i++) {
        const x = (i * 120) - (cameraX * 0.48) % 120;
        ctx.fillRect(x, 430, 80, 100);
    }
}

function drawPlatforms() {
    for (const platform of platforms) {
        const x = platform.x - cameraX;
        if (x + platform.width < -10 || x > WIDTH + 10) continue;
        ctx.fillStyle = platform.height > 30 ? "#436f5b" : "#3b775d";
        roundedRect(x, platform.y, platform.width, platform.height, platform.height > 30 ? 8 : 7);
        ctx.fill();
        ctx.fillStyle = platform.height > 30 ? "#7ecf87" : "#7dd68f";
        roundedRect(x, platform.y, platform.width, platform.height > 30 ? 12 : 7, 6);
        ctx.fill();
        if (platform.height > 30) {
            ctx.fillStyle = "rgba(16, 57, 48, .16)";
            for (let detail = 18; detail < platform.width; detail += 43) {
                ctx.fillRect(x + detail, platform.y + 28, 5, 3);
            }
        }
    }
}

function drawStars() {
    for (const star of stars) {
        if (star.collected) continue;
        const x = star.x - cameraX;
        if (x < -20 || x > WIDTH + 20) continue;
        const y = star.y + Math.sin(elapsed * 3 + star.phase) * 5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(elapsed * 2 + star.phase) * 0.12);
        ctx.fillStyle = "#fff0a6";
        ctx.strokeStyle = "#e6a742";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let point = 0; point < 10; point++) {
            const radius = point % 2 === 0 ? 13 : 6;
            const angle = -Math.PI / 2 + point * Math.PI / 5;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (point === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const x = enemy.x - cameraX;
        if (x < -50 || x > WIDTH + 50) continue;

        ctx.fillStyle = "#d54d68";
        roundedRect(x, enemy.y + 11, enemy.width, enemy.height - 9, 13);
        ctx.fill();

        ctx.fillStyle = "#f3a0aa";
        ctx.beginPath();
        ctx.arc(x + 11, enemy.y + 13, 8, Math.PI, 0);
        ctx.arc(x + 27, enemy.y + 13, 8, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.fillRect(x + 9, enemy.y + 21, 7, 9);
        ctx.fillRect(x + 23, enemy.y + 21, 7, 9);

        ctx.fillStyle = "#432d3d";
        ctx.fillRect(x + (enemy.direction > 0 ? 12 : 10), enemy.y + 24, 3, 5);
        ctx.fillRect(x + (enemy.direction > 0 ? 26 : 24), enemy.y + 24, 3, 5);

        ctx.strokeStyle = "rgba(255,255,255,.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 7, enemy.y + 38);
        ctx.lineTo(x + 32, enemy.y + 38);
        ctx.stroke();
    }
}

function drawGoal() {
    const x = WORLD_WIDTH - 115 - cameraX;
    ctx.fillStyle = "#fff6d8";
    ctx.fillRect(x, 328, 7, 130);
    ctx.fillStyle = "#ff8d78";
    ctx.beginPath();
    ctx.moveTo(x + 7, 332);
    ctx.lineTo(x + 64, 348);
    ctx.lineTo(x + 7, 365);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe98d";
    ctx.beginPath();
    ctx.ellipse(x + 3, 458, 21, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9f57";
    ctx.fillRect(x + 2, 320, 12, 20);
}

function drawPlayer() {
    if (player.invulnerable > 0 && Math.floor(elapsed * 12) % 2 === 0) return;
    const x = player.x - cameraX;
    const y = player.y;

    ctx.fillStyle = "rgba(32, 59, 77, .18)";
    ctx.beginPath();
    ctx.ellipse(x + player.width / 2, 458, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff986d";
    roundedRect(x + 2, y + 19, 30, 27, 10);
    ctx.fill();

    ctx.fillStyle = "#f5d6aa";
    ctx.beginPath();
    ctx.arc(x + 17, y + 14, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2d3d67";
    ctx.beginPath();
    ctx.arc(x + 17, y + 10, 14, Math.PI, Math.PI * 2);
    ctx.lineTo(x + 31, y + 16);
    ctx.quadraticCurveTo(x + 22, y + 11, x + 8, y + 17);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#182743";
    const eyeX = x + (player.facing > 0 ? 22 : 12);
    ctx.beginPath();
    ctx.ellipse(eyeX, y + 17, 2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#bb6259";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + (player.facing > 0 ? 20 : 14), y + 23, 4, .15, 1.5);
    ctx.stroke();

    ctx.fillStyle = "#4f68b6";
    roundedRect(x + 3, y + 43, 11, 6, 3);
    ctx.fill();
    roundedRect(x + 20, y + 43, 11, 6, 3);
    ctx.fill();

    ctx.fillStyle = "#ffd76a";
    ctx.fillRect(x + 11, y + 3, 13, 5);
    ctx.fillStyle = "#394d8b";
    ctx.fillRect(x + 8, y + 6, 18, 5);
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    drawPlatforms();
    drawGoal();
    drawStars();
    drawEnemies();
    drawPlayer();
}

function frame(time) {
    const dt = Math.min((time - previousTime) / 1000 || 0, 1 / 30);
    previousTime = time;
    elapsed += dt;
    update(dt);
    draw();
    requestAnimationFrame(frame);
}

function setControl(control, pressed) {
    controls[control] = pressed;
}

window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setControl("left", true);
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setControl("right", true);
    if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") setControl("jump", true);
    if (event.key.toLowerCase() === "r") resetGame();
});

window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setControl("left", false);
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setControl("right", false);
    if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") setControl("jump", false);
});

window.addEventListener("blur", () => {
    controls.left = false;
    controls.right = false;
    controls.jump = false;
});

document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        setControl(control, true);
    });
    for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
        button.addEventListener(eventName, () => setControl(control, false));
    }
});

document.querySelector("#restart").addEventListener("click", resetGame);
document.querySelector("#play-again").addEventListener("click", resetGame);

function prepareCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", prepareCanvas);
prepareCanvas();
resetGame();
requestAnimationFrame(frame);
