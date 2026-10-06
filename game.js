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
const ENEMY_SPEED = 120;
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
    { x: 740, min: 700, max: 960 },
    { x: 990, min: 970, max: 1190 },
    { x: 1400, min: 1360, max: 1650 },
    { x: 1700, min: 1680, max: 1980 },
    { x: 2180, min: 2140, max: 2390 },
    { x: 2440, min: 2420, max: 2600 }
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
        enemy.x += enemy.direction * ENEMY_SPEED * dt;
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
    sky.addColorStop(0, "#08091d");
    sky.addColorStop(0.52, "#17113d");
    sky.addColorStop(1, "#35134a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(745 - cameraX * 0.08, 205, 8, 745 - cameraX * 0.08, 205, 290);
    glow.addColorStop(0, "rgba(255, 35, 178, .2)");
    glow.addColorStop(1, "rgba(255, 35, 178, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(224, 244, 255, .72)";
    for (let i = 0; i < 58; i++) {
        const x = ((i * 167) - cameraX * 0.06) % (WIDTH + 30);
        const y = 24 + ((i * 71) % 240);
        ctx.globalAlpha = 0.35 + (i % 4) * 0.15;
        ctx.beginPath();
        ctx.arc(x < 0 ? x + WIDTH + 30 : x, y, i % 7 === 0 ? 1.7 : 1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = -1; i < 15; i++) {
        const worldX = i * 100;
        const x = worldX - cameraX * 0.28;
        const height = 95 + ((i * 47 + 900) % 105);
        const top = 365 - height;
        if (x > WIDTH || x + 105 < 0) continue;
        ctx.fillStyle = i % 2 === 0 ? "#11142f" : "#171331";
        ctx.fillRect(x, top, 86, height + 100);
        ctx.fillStyle = "rgba(0, 239, 255, .48)";
        ctx.fillRect(x, top, 86, 2);
        ctx.fillStyle = "rgba(255, 49, 193, .62)";
        ctx.fillRect(x + 9, top + 13, 3, Math.min(28, height - 12));
        for (let row = 0; row < Math.floor(height / 19); row++) {
            for (let col = 0; col < 4; col++) {
                ctx.fillStyle = (row + col + i) % 3 === 0
                    ? "rgba(255, 50, 191, .65)"
                    : "rgba(0, 220, 255, .52)";
                ctx.fillRect(x + 14 + col * 16, top + 13 + row * 19, 5, 8);
            }
        }
    }

    ctx.fillStyle = "rgba(0, 239, 255, .16)";
    ctx.fillRect(0, 365, WIDTH, 2);

    const floorGlow = ctx.createLinearGradient(0, 365, 0, HEIGHT);
    floorGlow.addColorStop(0, "rgba(10, 17, 47, .35)");
    floorGlow.addColorStop(1, "rgba(8, 10, 26, .9)");
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, 367, WIDTH, HEIGHT - 367);

    ctx.strokeStyle = "rgba(0, 218, 255, .13)";
    ctx.lineWidth = 1;
    for (let x = -120 - (cameraX * 0.7) % 120; x < WIDTH + 120; x += 120) {
        ctx.beginPath();
        ctx.moveTo(WIDTH / 2 + (x - WIDTH / 2) * 0.16, 367);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 44, 190, .12)";
    for (let y = 385; y < HEIGHT; y += 19) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }
}

function drawPlatforms() {
    for (const platform of platforms) {
        const x = platform.x - cameraX;
        if (x + platform.width < -10 || x > WIDTH + 10) continue;
        ctx.save();
        ctx.shadowColor = platform.height > 30 ? "#00eaff" : "#ff39c8";
        ctx.shadowBlur = platform.height > 30 ? 16 : 12;
        ctx.fillStyle = platform.height > 30 ? "#101b3b" : "#20133f";
        roundedRect(x, platform.y, platform.width, platform.height, platform.height > 30 ? 8 : 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = platform.height > 30 ? "#00eaff" : "#ff39c8";
        roundedRect(x, platform.y, platform.width, platform.height > 30 ? 12 : 7, 6);
        ctx.fill();
        if (platform.height > 30) {
            ctx.fillStyle = "rgba(109, 241, 255, .25)";
            for (let detail = 18; detail < platform.width; detail += 43) {
                ctx.fillRect(x + detail, platform.y + 31, 12, 3);
            }
        }
        ctx.restore();
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
        ctx.shadowColor = "#ffe45e";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#fff8ae";
        ctx.strokeStyle = "#ffad35";
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

        ctx.save();
        ctx.shadowColor = "#ff31bd";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#b3238b";
        roundedRect(x, enemy.y + 11, enemy.width, enemy.height - 9, 13);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ff62d0";
        ctx.beginPath();
        ctx.arc(x + 11, enemy.y + 13, 8, Math.PI, 0);
        ctx.arc(x + 27, enemy.y + 13, 8, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = "#e6ffff";
        ctx.fillRect(x + 9, enemy.y + 21, 7, 9);
        ctx.fillRect(x + 23, enemy.y + 21, 7, 9);

        ctx.fillStyle = "#11132e";
        ctx.fillRect(x + (enemy.direction > 0 ? 12 : 10), enemy.y + 24, 3, 5);
        ctx.fillRect(x + (enemy.direction > 0 ? 26 : 24), enemy.y + 24, 3, 5);

        ctx.strokeStyle = "rgba(255, 194, 251, .7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 7, enemy.y + 38);
        ctx.lineTo(x + 32, enemy.y + 38);
        ctx.stroke();
        ctx.restore();
    }
}

function drawGoal() {
    const x = WORLD_WIDTH - 115 - cameraX;
    ctx.save();
    ctx.shadowColor = "#00edff";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#9effff";
    ctx.fillRect(x, 328, 7, 130);
    ctx.fillStyle = "#ff3fc8";
    ctx.beginPath();
    ctx.moveTo(x + 7, 332);
    ctx.lineTo(x + 64, 348);
    ctx.lineTo(x + 7, 365);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe45e";
    ctx.beginPath();
    ctx.ellipse(x + 3, 458, 21, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#00edff";
    ctx.fillRect(x + 2, 320, 12, 20);
    ctx.restore();
}

function drawPlayer() {
    if (player.invulnerable > 0 && Math.floor(elapsed * 12) % 2 === 0) return;
    const x = player.x - cameraX;
    const y = player.y;

    ctx.fillStyle = "rgba(0, 239, 255, .22)";
    ctx.beginPath();
    ctx.ellipse(x + player.width / 2, 458, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = "#00eaff";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#00c9e8";
    roundedRect(x + 2, y + 19, 30, 27, 10);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f5d6ff";
    ctx.beginPath();
    ctx.arc(x + 17, y + 14, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff35c8";
    ctx.beginPath();
    ctx.arc(x + 17, y + 10, 14, Math.PI, Math.PI * 2);
    ctx.lineTo(x + 31, y + 16);
    ctx.quadraticCurveTo(x + 22, y + 11, x + 8, y + 17);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#10102b";
    const eyeX = x + (player.facing > 0 ? 22 : 12);
    ctx.beginPath();
    ctx.ellipse(eyeX, y + 17, 2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ff58cf";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + (player.facing > 0 ? 20 : 14), y + 23, 4, .15, 1.5);
    ctx.stroke();

    ctx.fillStyle = "#252b68";
    roundedRect(x + 3, y + 43, 11, 6, 3);
    ctx.fill();
    roundedRect(x + 20, y + 43, 11, 6, 3);
    ctx.fill();

    ctx.fillStyle = "#ffe45e";
    ctx.fillRect(x + 11, y + 3, 13, 5);
    ctx.fillStyle = "#00eaff";
    ctx.fillRect(x + 8, y + 6, 18, 5);
    ctx.restore();
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
