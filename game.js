const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiScore = document.getElementById('score');
const uiMessage = document.getElementById('message');

canvas.width = 800;
canvas.height = 400;

const tileSize = 40;
const gravity = 0.5;
const friction = 0.8;

let score = 0;
let gameOver = false;
let gameWon = false;

// 键盘控制
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// 地图设计: 0-空, 1-砖块, 2-金币, 3-终点旗杆, 4-水管
const map = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,4,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,3,0],
    [0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,3,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

class Player {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = 50;
        this.y = 200;
        this.width = 30;
        this.height = 30;
        this.dx = 0;
        this.dy = 0;
        this.speed = 4;
        this.jumpPower = -12;
        this.grounded = false;
    }
    update() {
        if (gameOver || gameWon) return;

        // 移动
        if (keys['ArrowLeft']) this.dx = -this.speed;
        else if (keys['ArrowRight']) this.dx = this.speed;
        else this.dx *= friction;

        // 跳跃
        if ((keys['ArrowUp'] || keys['Space']) && this.grounded) {
            this.dy = this.jumpPower;
            this.grounded = false;
        }

        this.dy += gravity;
        this.x += this.dx;
        this.y += this.dy;

        // 碰撞检测
        this.grounded = false;
        this.checkCollisions();

        // 掉落死亡
        if (this.y > canvas.height) {
            die();
        }
    }
    checkCollisions() {
        // 与瓦片的碰撞
        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[r].length; c++) {
                const tile = map[r][c];
                if (tile === 0) continue;

                const tx = c * tileSize - camera.x;
                const ty = r * tileSize;

                if (this.x < tx + tileSize && this.x + this.width > tx &&
                    this.y < ty + tileSize && this.y + this.height > ty) {
                    
                    if (tile === 1 || tile === 4) { // 砖块或水管
                        // 简单的碰撞反应
                        const overlapX = Math.min(this.x + this.width - tx, tx + tileSize - this.x);
                        const overlapY = Math.min(this.y + this.height - ty, ty + tileSize - this.y);

                        if (overlapX < overlapY) {
                            if (this.dx > 0) this.x = tx - this.width;
                            else this.x = tx + tileSize;
                            this.dx = 0;
                        } else {
                            if (this.dy > 0) {
                                this.y = ty - this.height;
                                this.grounded = true;
                                this.dy = 0;
                        } else {
                            this.y = ty + tileSize;
                            this.dy = 0;
                        }
                    }
                } else if (tile === 2) { // 金币
                    map[r][c] = 0;
                    score += 10;
                    uiScore.innerText = `份数: ${score}`;
                } else if (tile === 3) { // 旗杆
                    win();
                }
            }
        }
    }
    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // 眼睛
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + this.width - 10, this.y + 5, 5, 5);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.dx = -2;
        this.alive = true;
    }
    update() {
        if (!this.alive) return;
        this.x += this.dx;

        // 简单的墙壁检测
        const col = Math.floor((this.x + (this.dx > 0 ? this.width : 0) + camera.x) / tileSize);
        const row = Math.floor((this.y + this.height / 2) / tileSize);
        if (map[row] && (map[row][col] === 1 || map[row][col] === 4)) {
            this.dx *= -1;
        }

        // 与玩家碰撞
        const px = player.x;
        const py = player.y;
        if (px < this.x + this.width && px + player.width > this.x &&
            py < this.y + this.height && py + player.height > this.y) {
            
            if (player.dy > 0 && py + player.height < this.y + 15) {
                // 踩死
                this.alive = false;
                player.dy = -8;
                score += 50;
                uiScore.innerText = `分数: ${score}`;
            } else {
                die();
            }
        }
    }
    draw() {
        if (!this.alive) return;
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

const player = new Player();
const enemies = [
    new Enemy(400, 290),
    new Enemy(700, 290),
    new Enemy(1200, 290)
];
const camera = { x: 0 };

function die() {
    if (gameOver) return;
    gameOver = true;
    uiMessage.innerText = '游戏结束!';
    uiMessage.style.color = 'red';
}

function win() {
    if (gameWon) return;
    gameWon = true;
    uiMessage.innerText = '你赢了!';
    uiMessage.style.color = 'yellow';
}

function drawMap() {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            const tile = map[r][c];
            if (tile === 0) continue;

            const x = c * tileSize - camera.x;
            const y = r * tileSize;

            if (x < -tileSize || x > canvas.width) continue;

            if (tile === 1) { // 砖块
                ctx.fillStyle = '#a52a2a';
                ctx.fillRect(x, y, tileSize, tileSize);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x, y, tileSize, tileSize);
            } else if (tile === 2) { // 金币
                ctx.fillStyle = 'gold';
                ctx.beginPath();
                ctx.arc(x + tileSize/2, y + tileSize/2, 10, 0, Math.PI * 2);
                ctx.fill();
            } else if (tile === 3) { // 旗杆
                ctx.fillStyle = 'green';
                ctx.fillRect(x + 15, y, 10, tileSize);
                if (r === 6) { // 旗子
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x + 25, y, 20, 15);
                }
            } else if (tile === 4) { // 水管
                ctx.fillStyle = '#008000';
                ctx.fillRect(x, y, tileSize, tileSize);
                ctx.strokeStyle = 'darkgreen';
                ctx.strokeRect(x, y, tileSize, tileSize);
            }
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 相机跟随
    if (player.x > canvas.width / 2) {
        const diff = player.x - canvas.width / 2;
        camera.x += diff;
        player.x = canvas.width / 2;
        enemies.forEach(e => e.x -= diff);
    }

    drawMap();
    
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });

    player.update();
    player.draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();
