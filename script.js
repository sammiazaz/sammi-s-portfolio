const canvas = document.getElementById("dinoCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const startMsg = document.getElementById("dinoStartMsg");
const scoreEl = document.getElementById("dinoScore");
const highScoreEl = document.getElementById("dinoHighScore");
const highScoreDisplay = document.getElementById("dinoHighScoreDisplay");

if (canvas && ctx) {
  let frames = 0;
  let score = 0;
  let highScore = localStorage.getItem("dinoHighScore") || 0;
  
  if (highScore > 0 && highScoreEl && highScoreDisplay) {
    highScoreEl.innerText = highScore.toString().padStart(5, '0');
    highScoreDisplay.style.display = "inline";
  }

  let gameSpeed = 3.5;
  let isGameOver = false;
  let isPlaying = false;
  let spawnTimer = 0;
  
  const pixelSize = 2.5; // Scale multiplier for the pixel art

  // ASCII art arrays for 8-bit aesthetic
  const dinoSpriteIdle = [
    "             xxxxxxxx ",
    "            xxxxxxxxx ",
    "            xx xxxxxx ",
    "            xxxxxxxxx ",
    "            xxxxxxxx  ",
    "            xxxx      ",
    "            xxxxxxx   ",
    "xx         xxxxx      ",
    "xxx       xxxxxx      ",
    "xxxx    xxxxxxxx      ",
    "xxxxxxxxxxxxxxxx      ",
    " xxxxxxxxxxxxxxx      ",
    "  xxxxxxxxxxxxxx      ",
    "   xxxxxxxxxxx        ",
    "    xxxxxxx           ",
    "     xxxx             ",
    "     xx               ",
    "     xx               ",
    "     xx               ",
    "      xx              "
  ];
  
  const dinoSpriteRun1 = [
    "             xxxxxxxx ",
    "            xxxxxxxxx ",
    "            xx xxxxxx ",
    "            xxxxxxxxx ",
    "            xxxxxxxx  ",
    "            xxxx      ",
    "            xxxxxxx   ",
    "xx         xxxxx      ",
    "xxx       xxxxxx      ",
    "xxxx    xxxxxxxx      ",
    "xxxxxxxxxxxxxxxx      ",
    " xxxxxxxxxxxxxxx      ",
    "  xxxxxxxxxxxxxx      ",
    "   xxxxxxxxxxx        ",
    "    xxxxxxx           ",
    "     xxxx             ",
    "     x                ",
    "     xx               ",
    "      x               ",
    "                      "
  ];

  const dinoSpriteRun2 = [
    "             xxxxxxxx ",
    "            xxxxxxxxx ",
    "            xx xxxxxx ",
    "            xxxxxxxxx ",
    "            xxxxxxxx  ",
    "            xxxx      ",
    "            xxxxxxx   ",
    "xx         xxxxx      ",
    "xxx       xxxxxx      ",
    "xxxx    xxxxxxxx      ",
    "xxxxxxxxxxxxxxxx      ",
    " xxxxxxxxxxxxxxx      ",
    "  xxxxxxxxxxxxxx      ",
    "   xxxxxxxxxxx        ",
    "    xxxxxxx           ",
    "     xxxx             ",
    "       x              ",
    "       xx             ",
    "        x             ",
    "                      "
  ];

  const cactusSprite = [
    "   xx  ",
    " x xx  ",
    " x xx  ",
    " x xx x",
    " x xx x",
    " xxxx x",
    "   xx x",
    "   xx  ",
    "   xx  ",
    "   xx  "
  ];
  
  const cloudSprite = [
    "      xxxx      ",
    "   xxxxxxxxx    ",
    " xxxxxxxxxxxxx  ",
    "xxxxxxxxxxxxxxx "
  ];

  // Helper function to draw ASCII sprite
  function drawSprite(sprite, x, y, color = "#535353") {
    ctx.fillStyle = color;
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        if (sprite[r][c] === 'x') {
          ctx.fillRect(x + c * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }

  // Pre-generate scattered ground dust
  const groundDust = [];
  for(let i=0; i<30; i++) {
    groundDust.push({
      x: Math.random() * canvas.width,
      y: (canvas.height - 20) + Math.random() * 10
    });
  }

  // Dino object
  const dino = {
    x: 40,
    y: 100,
    w: 22 * pixelSize,
    h: 20 * pixelSize,
    dy: 0,
    jumpForce: 10,
    gravity: 0.6,
    grounded: false,
    jump: function () {
      if (this.grounded) {
        this.dy = -this.jumpForce;
        this.grounded = false;
      }
    },
    update: function () {
      this.y += this.dy;
      // Gravity handling based on ground level
      if (this.y + this.h < canvas.height - 20) {
        this.dy += this.gravity;
        this.grounded = false;
      } else {
        this.dy = 0;
        this.grounded = true;
        this.y = canvas.height - 20 - this.h;
      }
    },
    draw: function () {
      let spriteToDraw = dinoSpriteIdle;
      if (this.grounded && isPlaying) {
        // Switch run frames every 10 game frames
        spriteToDraw = Math.floor(frames / 10) % 2 === 0 ? dinoSpriteRun1 : dinoSpriteRun2;
      }
      // Color Dino retro blue
      drawSprite(spriteToDraw, this.x, this.y, "#4fc3f7");
    }
  };

  let obstacles = [];
  let clouds = [];

  function drawGround() {
    ctx.fillStyle = "#535353";
    // Main horizon line
    ctx.fillRect(0, canvas.height - 20, canvas.width, 1);
    
    // Draw scattered ground dust (sandy color)
    ctx.fillStyle = "#c8c0a8";
    for(let i=0; i<groundDust.length; i++) {
      let dust = groundDust[i];
      ctx.fillRect(dust.x, dust.y, Math.random() > 0.5 ? 2 : 1, 1);
      
      // Move dust to create parallax effect
      if(isPlaying) dust.x -= gameSpeed * 0.8;
      
      // Loop dust back to right side
      if(dust.x < 0) {
        dust.x = canvas.width;
        dust.y = (canvas.height - 20) + Math.random() * 10;
      }
    }
  }

  function handleObstacles() {
    spawnTimer--;
    // Generate new obstacles progressively based on speed
    if (spawnTimer <= 0) {
      if (Math.random() > 0.1) {
        let obsWidth = 7 * pixelSize;
        let obsHeight = 10 * pixelSize;
        obstacles.push({
          x: canvas.width,
          y: canvas.height - 20 - obsHeight,
          w: obsWidth,
          h: obsHeight
        });
      }
      // Calculate next spawn based on current speed
      spawnTimer = Math.max(45, 130 - Math.floor(gameSpeed * 8)) + Math.floor(Math.random() * 30);
    }

    for (let i = 0; i < obstacles.length; i++) {
      let obs = obstacles[i];
      obs.x -= gameSpeed;

      // Draw obstacle sprite (retro green)
      drawSprite(cactusSprite, obs.x, obs.y, "#5ec870");

      // Simple AABB Collision Detection (shrunk slightly for fairer gameplay)
      let hitboxShrink = 6;
      if (
        dino.x + hitboxShrink < obs.x + obs.w - hitboxShrink &&
        dino.x + dino.w - hitboxShrink > obs.x + hitboxShrink &&
        dino.y + hitboxShrink < obs.y + obs.h - hitboxShrink &&
        dino.y + dino.h - hitboxShrink > obs.y + hitboxShrink
      ) {
        isGameOver = true;
      }
      
      // Remove off-screen obstacles and increase score
      if (obs.x + obs.w < 0) {
        obstacles.splice(i, 1);
        i--;
      }
    }
  }

  function handleClouds() {
    // Generate new clouds slowly
    if (frames % 150 === 0 && Math.random() > 0.3) {
      clouds.push({
        x: canvas.width,
        y: Math.random() * 50 + 10, // Top area
      });
    }

    for (let i = 0; i < clouds.length; i++) {
      let cloud = clouds[i];
      // Clouds move much slower than obstacles
      cloud.x -= gameSpeed * 0.3;

      drawSprite(cloudSprite, cloud.x, cloud.y, "#cccccc");

      if (cloud.x + 60 < 0) {
        clouds.splice(i, 1);
        i--;
      }
    }
  }

  function animate() {
    if (isGameOver) {
      // Check and set High Score
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("dinoHighScore", highScore);
        if (highScoreEl && highScoreDisplay) {
          highScoreEl.innerText = highScore.toString().padStart(5, '0');
          highScoreDisplay.style.display = "inline";
        }
      }

      // Draw idle dino
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      handleClouds(); // still draw them even when over
      drawGround();
      for (let obs of obstacles) drawSprite(cactusSprite, obs.x, obs.y, "#5ec870");
      drawSprite(dinoSpriteIdle, dino.x, dino.y, "#4fc3f7");
      
      startMsg.innerText = "GAME OVER";
      startMsg.style.display = "block";
      startMsg.style.animation = "none";
      isPlaying = false;
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    handleClouds();
    drawGround();
    dino.update();
    dino.draw();
    handleObstacles();

    frames++;
    if(frames % 10 === 0) {
        score++;
        // Update score with zeropadding (e.g. 00042)
        scoreEl.innerText = score.toString().padStart(5, '0');
    }
    
    // Increase difficulty gradually and continuously 
    if (gameSpeed < 12) {
        gameSpeed += 0.002; 
    }

    requestAnimationFrame(animate);
  }

  function resetGame() {
    obstacles = [];
    clouds = [];
    score = 0;
    frames = 0;
    gameSpeed = 3.5;
    spawnTimer = 0;
    scoreEl.innerText = "00000";
    isGameOver = false;
    dino.y = canvas.height - 20 - dino.h;
    dino.dy = 0;
    
    // Draw initial view
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGround();
    dino.draw();
  }

  function startGame() {
    if (!isPlaying) {
      resetGame();
      isPlaying = true;
      startMsg.style.display = "none";
      animate();
    } else {
      dino.jump();
    }
  }

  // Draw initial poster state
  drawGround();
  dino.y = canvas.height - 20 - (20 * pixelSize);
  drawSprite(dinoSpriteIdle, dino.x, dino.y, "#4fc3f7");

  // Event Listeners for Spacebar / Up Arrow
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault(); 
      startGame();
    }
  });

  const wrapper = document.querySelector(".dino-game-wrapper");
  if(wrapper) {
    wrapper.addEventListener("mousedown", startGame);
    wrapper.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startGame();
    }, {passive: false});
  }
}
