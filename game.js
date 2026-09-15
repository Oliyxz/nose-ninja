import { initVision, nosePositions } from './vision.js';
import { playSound } from './audio.js';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('uiOverlay');
const loadingScreen = document.getElementById('loadingScreen');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const profileSelectScreen = document.getElementById('profileSelectScreen');
const vsSetupScreen = document.getElementById('vsSetupScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const adminScreen = document.getElementById('adminScreen');
const adminProfileList = document.getElementById('adminProfileList');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const secretLogo = document.getElementById('secretLogo');

const start1PBtn = document.getElementById('start1PBtn');
const start2PBtn = document.getElementById('start2PBtn');
const showLeaderboardBtn = document.getElementById('showLeaderboardBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const restartBtn = document.getElementById('restartBtn');

// 1P Profile UI
const profileSelectTitle = document.getElementById('profileSelectTitle');
const profileList = document.getElementById('profileList');
const newProfileInput = document.getElementById('newProfileInput');
const createProfileBtn = document.getElementById('createProfileBtn');
const cancelProfileBtn = document.getElementById('cancelProfileBtn');

// 2P VS Lobby UI
const p1Input = document.getElementById('p1Input');
const p2Input = document.getElementById('p2Input');
const startFightBtn = document.getElementById('startFightBtn');
const cancelVsBtn = document.getElementById('cancelVsBtn');

const gameHud = document.getElementById('gameHud');
const currentScoreEl = document.getElementById('currentScore');
const finalScoreEl = document.getElementById('finalScore');
const highScoreEl = document.getElementById('highScore');
const leaderboardList = document.getElementById('leaderboardList');

// Resize canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game State
let gameState = 'loading';
let score = 0;
let mode = 1;
let gameSpeed = 5;
let frameCount = 0;
let animationId = null;

// Profiles
let profiles = JSON.parse(localStorage.getItem('noseNinjaProfiles')) || [];
let activeProfiles = [];

// Entities
let players = [];
let obstacles = [];
let collectibles = [];
let particles = [];

// Initialize Vision
initVision(() => {
    loadingScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Event Listeners
start1PBtn.addEventListener('click', () => openProfileSelect());
start2PBtn.addEventListener('click', () => openVsLobby());
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
});
showLeaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
});

cancelProfileBtn.addEventListener('click', () => {
    profileSelectScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
});

cancelVsBtn.addEventListener('click', () => {
    vsSetupScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
});

// Secret Admin Access
let logoClickCount = 0;
let logoClickTimer = null;

secretLogo.addEventListener('click', () => {
    logoClickCount++;
    if (logoClickTimer) clearTimeout(logoClickTimer);
    
    if (logoClickCount >= 3) {
        logoClickCount = 0;
        let passcode = prompt("ENTER ADMIN PASSCODE:");
        if (passcode === "SCA") {
            openAdminPanel();
        } else if (passcode !== null) {
            alert("ACCESS DENIED");
        }
    } else {
        logoClickTimer = setTimeout(() => {
            logoClickCount = 0;
        }, 1000);
    }
});

function openAdminPanel() {
    gameState = 'admin';
    startScreen.classList.add('hidden');
    adminScreen.classList.remove('hidden');
    renderAdminProfileList();
}

closeAdminBtn.addEventListener('click', () => {
    adminScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
});

function renderAdminProfileList() {
    adminProfileList.innerHTML = '';
    let sorted = [...profiles].sort((a,b) => a.name.localeCompare(b.name));
    
    sorted.forEach(p => {
        let div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '10px';
        div.style.background = 'rgba(255, 0, 255, 0.1)';
        div.style.border = '1px solid var(--danger)';
        div.style.borderRadius = '5px';
        
        let span = document.createElement('span');
        span.innerText = `${p.name} (High Score: ${p.highScore})`;
        span.style.color = '#fff';
        
        let delBtn = document.createElement('button');
        delBtn.innerText = 'DELETE';
        delBtn.style.background = 'var(--danger)';
        delBtn.style.color = '#fff';
        delBtn.style.border = 'none';
        delBtn.style.padding = '5px 10px';
        delBtn.style.borderRadius = '3px';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontWeight = 'bold';
        
        delBtn.onclick = () => {
            if (confirm(`Are you sure you want to permanently delete ${p.name}?`)) {
                profiles = profiles.filter(x => x.name !== p.name);
                saveProfiles();
                renderAdminProfileList();
            }
        };
        
        div.appendChild(span);
        div.appendChild(delBtn);
        adminProfileList.appendChild(div);
    });
    
    if(profiles.length === 0) {
        adminProfileList.innerHTML = '<p style="color:#aaa;">No profiles found.</p>';
    }
}

// 1P Profile Creation
createProfileBtn.addEventListener('click', () => {
    const name = newProfileInput.value.trim().toUpperCase();
    if(name.length > 0) {
        getOrCreateProfile(name);
        newProfileInput.value = '';
        renderProfileList();
    }
});

// VS Fight Start
startFightBtn.addEventListener('click', () => {
    let name1 = p1Input.value.trim().toUpperCase() || 'P1';
    let name2 = p2Input.value.trim().toUpperCase() || 'P2';
    
    let prof1 = getOrCreateProfile(name1);
    let prof2 = getOrCreateProfile(name2);
    
    activeProfiles = [prof1, prof2];
    vsSetupScreen.classList.add('hidden');
    startGame(2);
});

function getOrCreateProfile(name) {
    let existing = profiles.find(p => p.name === name);
    if(existing) return existing;
    
    let newProf = { name: name, highScore: 0, gamesPlayed: 0 };
    profiles.push(newProf);
    saveProfiles();
    return newProf;
}

function saveProfiles() {
    localStorage.setItem('noseNinjaProfiles', JSON.stringify(profiles));
}

function openProfileSelect() {
    activeProfiles = [];
    gameState = 'profile_select';
    startScreen.classList.add('hidden');
    profileSelectScreen.classList.remove('hidden');
    renderProfileList();
}

function openVsLobby() {
    activeProfiles = [];
    gameState = 'vs_setup';
    startScreen.classList.add('hidden');
    vsSetupScreen.classList.remove('hidden');
}

function renderProfileList() {
    profileList.innerHTML = '';
    let sorted = [...profiles].sort((a,b) => a.name.localeCompare(b.name));
    
    sorted.forEach(p => {
        let btn = document.createElement('button');
        btn.className = 'profile-btn';
        btn.innerHTML = `<span>${p.name}</span> <span class="score">High: ${p.highScore}</span>`;
        btn.onclick = () => {
            activeProfiles = [p];
            profileSelectScreen.classList.add('hidden');
            startGame(1);
        };
        profileList.appendChild(btn);
    });
}

function initPlayers() {
    players = [];
    for(let i=0; i<mode; i++) {
        players.push({
            id: i,
            profile: activeProfiles[i],
            x: canvas.width * (i + 1) / (mode + 1),
            y: canvas.height - 100,
            width: 60,
            height: 60,
            color: i === 0 ? '#0ff' : '#f0f',
            isDead: false
        });
    }
}

function startGame(numPlayers) {
    mode = numPlayers;
    gameHud.classList.remove('hidden');
    
    gameState = 'playing';
    score = 0;
    gameSpeed = 5;
    frameCount = 0;
    obstacles = [];
    collectibles = [];
    particles = [];
    updateScoreUI();
    
    initPlayers();
    playSound('start');
    
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

function updateScoreUI() {
    let names = activeProfiles.map(p => p.name).join(' & ');
    currentScoreEl.innerHTML = `${names} <br/> SCORE: ${score}`;
}

function spawnObstacle() {
    let size = 40 + Math.random() * 30;
    obstacles.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size: size,
        speedY: gameSpeed + Math.random() * 3,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 0.2
    });
}

function spawnCollectible() {
    let size = 30;
    collectibles.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size: size,
        speedY: gameSpeed - 1
    });
}

function spawnParticles(x, y, color) {
    for(let i=0; i<15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            color: color
        });
    }
}

function update() {
    frameCount++;
    
    // Sort nose positions by X coordinate so the person physically on the left is always Index 0
    let sortedNoses = [...nosePositions].filter(n => n.isDetected).sort((a, b) => a.x - b.x);
    
    // Player movement
    for(let i=0; i<players.length; i++) {
        let p = players[i];
        if (p.isDead) continue;

        if (i < sortedNoses.length) {
            let targetX = sortedNoses[i].x * canvas.width;
            targetX = Math.max(p.width/2, Math.min(targetX, canvas.width - p.width/2));
            p.x += (targetX - p.x) * 0.2; // Smooth lerp
        }
    }

    // Spawn logic
    let spawnRate = Math.max(15, Math.floor(100 - gameSpeed*5));
    if (mode === 2) spawnRate = Math.max(10, Math.floor(spawnRate * 0.7)); // Faster in 2P
    if (frameCount % spawnRate === 0) spawnObstacle();
    if (frameCount % 120 === 0) spawnCollectible();
    if (frameCount % 300 === 0) gameSpeed += 0.5;

    // Update Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.y += obs.speedY;
        obs.rotation += obs.rotSpeed;
        
        let hitSomeone = false;
        for(let p of players) {
            if (p.isDead) continue;
            let dx = (obs.x + obs.size/2) - p.x;
            let dy = (obs.y + obs.size/2) - p.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < obs.size/2 + p.width/3) {
                playSound('hit');
                spawnParticles(p.x, p.y, p.color);
                p.isDead = true;
                hitSomeone = true;
            }
        }
        
        if (hitSomeone) {
            obstacles.splice(i, 1);
        } else if (obs.y > canvas.height) {
            obstacles.splice(i, 1);
            score += 10;
            updateScoreUI();
        }
    }

    // Update Collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
        let col = collectibles[i];
        col.y += col.speedY;
        
        let collectedBy = null;
        for(let p of players) {
            if (p.isDead) continue;
            let dx = (col.x + col.size/2) - p.x;
            let dy = (col.y + col.size/2) - p.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < col.size/2 + p.width/2) {
                collectedBy = p;
                break;
            }
        }
        
        if (collectedBy) {
            playSound('coin');
            spawnParticles(col.x, col.y, '#0f0');
            collectibles.splice(i, 1);
            score += 100;
            updateScoreUI();
        } else if (col.y > canvas.height) {
            collectibles.splice(i, 1);
        }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Check game over
    let allDead = players.every(p => p.isDead);
    if (allDead) {
        gameOver();
    }
}

function draw() {
    ctx.fillStyle = 'rgba(9, 10, 15, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(let p of players) {
        if (p.isDead) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.height/2);
        ctx.lineTo(p.width/2, p.height/2);
        ctx.lineTo(-p.width/2, p.height/2);
        ctx.closePath();
        ctx.fill();
        
        // draw name above player
        ctx.fillStyle = '#fff';
        ctx.font = '14px Orbitron';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000';
        ctx.fillText(p.profile.name, 0, -p.height);
        
        ctx.restore();
    }

    for (let obs of obstacles) {
        ctx.save();
        ctx.translate(obs.x + obs.size/2, obs.y + obs.size/2);
        ctx.rotate(obs.rotation);
        ctx.fillStyle = '#f0f';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f0f';
        ctx.beginPath();
        for(let j=0; j<8; j++) {
            let angle = j * Math.PI / 4;
            let radius = j % 2 === 0 ? obs.size/2 : obs.size/4;
            let px = Math.cos(angle) * radius;
            let py = Math.sin(angle) * radius;
            if(j===0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    for (let col of collectibles) {
        ctx.save();
        ctx.translate(col.x + col.size/2, col.y + col.size/2);
        ctx.fillStyle = '#0f0';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#0f0';
        ctx.beginPath();
        ctx.arc(0, 0, col.size/2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '20px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        ctx.restore();
    }

    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function gameLoop() {
    if (gameState !== 'playing') return;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'gameover';
    gameHud.classList.add('hidden');
    
    // Automatically update profiles
    activeProfiles.forEach(p => {
        p.gamesPlayed = (p.gamesPlayed || 0) + 1;
        if (score > p.highScore) {
            p.highScore = score;
        }
        
        let idx = profiles.findIndex(x => x.name === p.name);
        if (idx !== -1) {
            profiles[idx] = p;
        }
    });
    
    saveProfiles();
    
    let sorted = [...profiles].sort((a,b) => b.highScore - a.highScore);

    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = score;
    highScoreEl.innerText = sorted.length > 0 ? sorted[0].highScore : score;
}

function showLeaderboard() {
    gameState = 'leaderboard';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('hidden');
    
    leaderboardList.innerHTML = '';
    
    let sorted = [...profiles].sort((a,b) => b.highScore - a.highScore).slice(0, 10);
    
    sorted.forEach((entry, idx) => {
        let li = document.createElement('li');
        li.innerText = `#${idx+1} ${entry.name} - ${entry.highScore}`;
        leaderboardList.appendChild(li);
    });
    
    if(sorted.length === 0) {
        leaderboardList.innerHTML = '<li>NO PROFILES YET</li>';
    }
}
