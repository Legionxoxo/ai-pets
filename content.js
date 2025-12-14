const ASSETS_PATH = "characters";
const GRAVITY = 0.5;
const GROUND_OFFSET = 10;
let isContextValid = true;
let userInteracted = false;

// Listen for first interaction to unlock audio
const interactionEvents = ['click', 'keydown', 'touchstart'];
function onInteraction() {
    userInteracted = true;
    interactionEvents.forEach(e => window.removeEventListener(e, onInteraction));
}
interactionEvents.forEach(e => window.addEventListener(e, onInteraction));

function getAssetUrl(path) {
    if (!isContextValid) return "";
    try {
        return chrome.runtime.getURL(`${ASSETS_PATH}/${path}`);
    } catch (e) {
        // Context invalidated
        isContextValid = false;
        return "";
    }
}

class BasePet {
    constructor(id, type, scale = 0.5) {
        this.id = id;
        this.type = type;
        this.scale = scale;
        this.x = 100;
        this.y = 100;
        this.vx = 0;
        this.vy = 0;
        this.width = 150;
        this.height = 150;

        this.element = document.createElement('img');
        this.element.className = 'chibi-pet';
        this.element.style.width = `${this.width * this.scale}px`;
        this.element.style.height = `${this.height * this.scale}px`;
        this.element.draggable = false; // Disable native drag

        document.body.appendChild(this.element);

        // State
        this.state = "IDLE";
        this.facingRight = true;
        this.onGround = false;
        this.isDragging = false;

        // Interaction
        this.setupEvents();

        // Sounds
        this.audioPlayer = new Audio();
        this.isPlaying = false;

        this.audioPlayer.onplay = () => { this.isPlaying = true; };
        this.audioPlayer.onended = () => { this.isPlaying = false; };
        this.audioPlayer.onerror = () => { this.isPlaying = false; };
    }

    setupEvents() {
        this.element.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.vx = 0;
            this.vy = 0;
            this.onDragStart(); // Hook for subclasses
            // Prevent text selection
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.x = e.clientX - (this.width * this.scale) / 2;
                this.y = e.clientY - (this.height * this.scale) / 2;
                this.vx = e.movementX * 0.5; // impart some velocity
                this.vy = e.movementY * 0.5;
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.onGround = false;
            }
        });
    }

    playSound(filename) {
        if (!soundEnabled) return;

        // Warning: Browsers might block auto-playing audio without interaction
        try {
            const url = getAssetUrl(`${this.type}/sound/${filename}`);
            this.audioPlayer.src = url;
            this.audioPlayer.play().catch(e => {
                if (e.name !== "NotAllowedError") {
                    console.warn("Audio play failed", e);
                }
            });
        } catch (e) {
            if (e.name === "NotAllowedError") {
                // Autoplay blocked, ignore or log info
                // console.log("Audio autoplay blocked until user interaction.");
            } else {
                console.warn("Sound error", e.message);
            }
        }
    }

    setAnimation(filename) {
        const url = getAssetUrl(`${this.type}/${filename}`);
        // console.log("Loading image:", url); 
        if (this.element.src !== url) {
            this.element.src = url;
        }
    }

    updateFrame() {
        // CSS transform for flipping
        const transform = `translate(${this.x}px, ${this.y}px) scaleX(${this.facingRight ? -1 : 1})`;
        this.element.style.transform = transform;
    }

    updateBoundaries() {
        // Try to find ChatGPT input box
        const inputArea = document.querySelector('form') || document.querySelector('textarea')?.parentElement;

        if (inputArea) {
            const rect = inputArea.getBoundingClientRect();
            return {
                y: rect.top - (this.height * this.scale) + GROUND_OFFSET,
                minX: rect.left,
                maxX: rect.right - (this.width * this.scale)
            };
        }

        // Fallback to window bottom
        return {
            y: window.innerHeight - (this.height * this.scale),
            minX: 0,
            maxX: window.innerWidth - (this.width * this.scale)
        };
    }

    physicsTick() {
        if (this.isDragging) {
            this.updateFrame();
            return;
        }

        const boundaries = this.updateBoundaries();
        const floorY = boundaries.y;

        this.vy += GRAVITY;
        this.y += this.vy;
        this.x += this.vx;

        if (this.y >= floorY) {
            this.y = floorY;
            this.vy = 0;
            if (!this.onGround) {
                this.onGround = true;
                this.vx *= 0.8;

                if (this.state === "JUMPING") {
                    this.state = "IDLE";
                    // Reset animation on land
                    if (this.type === "speaki") this.setAnimation("Speaki-Cherrful.png");
                    else if (this.type === "erpin") this.setAnimation("Erpin-Cherrful.png");
                }
            }
            this.vx *= 0.95; // Ground friction
        } else {
            this.onGround = false;
        }

        // Wall collision
        if (this.x <= boundaries.minX) {
            this.x = boundaries.minX;
            this.vx *= -0.5;
            this.onHitWall('left');
        } else if (this.x >= boundaries.maxX) {
            this.x = boundaries.maxX;
            this.vx *= -0.5;
            this.onHitWall('right');
        }

        this.updateFrame();
    }

    onDragStart() {
        // Override
    }

    onHitWall(side) {
        // Override
    }

    behaviorTick() {
        // Override in subclasses
    }
}

class Speaki extends BasePet {
    constructor(id, scale = 1.0) {
        super(id, "speaki", scale);
        this.setAnimation("Speaki-Cherrful.png"); // Note: using typo from python code if file exists
        this.stateTimer = 100;

        this.walkSoundIndex = 1;
        this.walkSoundDelay = 0;
    }

    onDragStart() {
        this.setAnimation("Speaki-Cry.png");
        this.playSound("cry-drag.mp3");
    }

    onHitWall(side) {
        // Jump only at boundary
        if (this.onGround) {
            this.vy = -10;
            this.onGround = false;
            this.state = "JUMPING"; // Explicit state
            this.setAnimation("Speaki-Happu.png");
            this.playSound("jump.mp3");

            // Force turnaround velocity but keep Jumping state
            if (side === 'left') {
                this.vx = 2;
                this.facingRight = true;
            } else {
                this.vx = -2;
                this.facingRight = false;
            }
        }
    }

    behaviorTick() {
        if (this.isDragging) return;
        this.stateTimer--;

        if (this.onGround) {
            // Logic: Mostly walk, rarely idle
            if (this.stateTimer <= 0) {
                const action = Math.random();
                if (action < 0.02) { // 2% Idle (was 5%)
                    this.state = "IDLE";
                    this.stateTimer = 50 + Math.random() * 50; // Short idle
                    this.setAnimation("Speaki-Cherrful.png");
                } else if (action < 0.52) {
                    this.state = "WALK_LEFT";
                    this.stateTimer = 600 + Math.random() * 400; // Much longer walk (10-16s)
                    this.setAnimation("Speaki-Cherrful.png");

                    if (this.state !== "WALK_LEFT") this.walkSoundIndex = 1;
                } else {
                    this.state = "WALK_RIGHT";
                    this.stateTimer = 600 + Math.random() * 400; // Much longer walk
                    this.setAnimation("Speaki-Cherrful.png");
                    if (this.state !== "WALK_RIGHT") this.walkSoundIndex = 1;
                }
            }

            if (this.state === "WALK_LEFT") {
                this.vx -= 0.05; // Slower acceleration
                this.facingRight = false;
            } else if (this.state === "WALK_RIGHT") {
                this.vx += 0.05; // Slower acceleration
                this.facingRight = true;
            }

            // Speed cap (Slower max speed)
            if (this.vx > 1.5) this.vx = 1.5;
            if (this.vx < -1.5) this.vx = -1.5;

            // Walking Sounds (Natural Queue)
            if ((this.state === "WALK_LEFT" || this.state === "WALK_RIGHT") && !this.isPlaying) {
                this.playSound(`walk-${this.walkSoundIndex}.mp3`);
                this.walkSoundIndex++;
                if (this.walkSoundIndex > 3) this.walkSoundIndex = 1;
            }
        }
    }
}

class Erpin extends BasePet {
    constructor(id, scale = 1.0) {
        super(id, "erpin", scale);
        this.setAnimation("Erpin-Cherrful.png");
        this.stateTimer = 100;
    }

    onDragStart() {
        this.setAnimation("Erpin-Cry.png");
        const punchSounds = ["Erpin-Punch-1.mp3", "Erpin-Punch-2.mp3"];
        const randomSound = punchSounds[Math.floor(Math.random() * punchSounds.length)];
        this.playSound(randomSound);
    }

    onHitWall(side) {
        // Immediate turnaround
        if (side === 'left') {
            this.state = "WALK";
            this.facingRight = true;
            this.vx = 1.5;
        } else {
            this.state = "WALK";
            this.facingRight = false;
            this.vx = -1.5;
        }
    }

    behaviorTick() {
        if (this.isDragging) return;
        this.stateTimer--;

        if (this.state === "SLEEPING") {
            this.vx = 0;
            if (this.stateTimer <= 0) {
                // Wake up
                this.state = "IDLE";
                this.stateTimer = 100;
                this.setAnimation("Erpin-Cherrful.png");
            }
            return;
        }

        if (this.onGround) {
            // Interruption during walk to sleep
            if (this.state === "WALK" && Math.random() < 0.003) {
                this.state = "SLEEPING";
                this.stateTimer = 300 + Math.random() * 300; // 5-10 seconds
                this.setAnimation("Erpin-Sleeping.png");
                return;
            }

            if (this.stateTimer <= 0) {
                const action = Math.random();
                if (action < 0.02) {
                    // Sleep Chance (Less Frequent now, ~2%)
                    this.state = "SLEEPING";
                    this.stateTimer = 500 + Math.random() * 500;
                    this.setAnimation("Erpin-Sleeping.png");
                } else if (action < 0.12) {
                    this.state = "IDLE";
                    this.stateTimer = 100 + Math.random() * 100;
                    this.setAnimation("Erpin-Cherrful.png");
                } else if (action < 0.82) { // Mostly Walk
                    this.state = "WALK";
                    this.stateTimer = 200 + Math.random() * 200;
                    this.setAnimation("Erpin-Cherrful.png");
                    // Walk Sound Chance
                    if (Math.random() < 0.3 && !this.isPlaying) {
                        this.playSound("Erpin-humu.mp3");
                    }
                }
            }

            if (this.state === "WALK") {
                // Change direction less frequently
                if (Math.random() < 0.02) this.facingRight = !this.facingRight;

                this.vx += this.facingRight ? 1.5 : -1.5;
            }

            // Speed limit
            if (this.vx > 2.5) this.vx = 2.5;
            if (this.vx < -2.5) this.vx = -2.5;
        }
    }
}

let pets = [];
let soundEnabled = true;

function syncPets(config) {
    soundEnabled = config.soundEnabled !== undefined ? config.soundEnabled : true;
    const targetSpeaki = config.speakiCount !== undefined ? config.speakiCount : 1;
    const targetErpin = config.erpinCount !== undefined ? config.erpinCount : 1;
    const targetScale = config.petScale !== undefined ? config.petScale : 0.5;

    // console.log("Syncing pets. Config:", config, "Target Scale:", targetScale);

    // Update existing pets scale
    pets.forEach(p => {
        if (p.scale !== targetScale) {
            p.scale = targetScale;
            // Update CSS immediately
            p.element.style.width = `${p.width * p.scale}px`;
            p.element.style.height = `${p.height * p.scale}px`;
        }
    });

    // Count current
    let currentSpeaki = pets.filter(p => p.type === "speaki").length;
    let currentErpin = pets.filter(p => p.type === "erpin").length;

    // Add Speaki
    while (currentSpeaki < targetSpeaki) {
        pets.push(new Speaki(Date.now() + Math.random(), targetScale));
        currentSpeaki++;
    }
    // Remove Speaki
    while (currentSpeaki > targetSpeaki) {
        const idx = pets.findIndex(p => p.type === "speaki");
        if (idx !== -1) {
            pets[idx].element.remove();
            pets.splice(idx, 1);
        }
        currentSpeaki--;
    }

    // Add Erpin
    while (currentErpin < targetErpin) {
        pets.push(new Erpin(Date.now() + Math.random(), targetScale));
        currentErpin++;
    }
    // Remove Erpin
    while (currentErpin > targetErpin) {
        const idx = pets.findIndex(p => p.type === "erpin");
        if (idx !== -1) {
            pets[idx].element.remove();
            pets.splice(idx, 1);
        }
        currentErpin--;
    }
}

function init() {
    console.log("Trickcal Chibi Go Pet Extensions Started!");

    chrome.storage.local.get(['speakiCount', 'erpinCount', 'petScale', 'soundEnabled'], (result) => {
        syncPets(result);
        gameLoop();
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        chrome.storage.local.get(['speakiCount', 'erpinCount', 'petScale', 'soundEnabled'], (result) => {
            syncPets(result);
        });
    });
}

function gameLoop() {
    if (!isContextValid) return; // Stop loop if extension updated/reloaded
    for (const pet of pets) {
        pet.physicsTick();
        pet.behaviorTick();
    }
    requestAnimationFrame(gameLoop);
}

// Check if sound should play global override
const originalPlaySound = BasePet.prototype.playSound;
BasePet.prototype.playSound = function (filename) {
    if (!soundEnabled) return;
    originalPlaySound.call(this, filename);
};

// Start after a short delay
setTimeout(init, 1000);
