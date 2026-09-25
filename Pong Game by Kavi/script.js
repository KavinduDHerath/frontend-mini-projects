const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");

const playerScoreElement = document.getElementById("playerScore");
const computerScoreElement = document.getElementById("computerScore");
const restartButton = document.getElementById("restartButton");
const diffButtons = document.querySelectorAll(".diff-btn");

const paddleWidth = 14;
const paddleHeight = 100;
const paddleSpeed = 7;
const ballSize = 14;
const WINNING_SCORE = 10;

let isGameOver = false;
let animationId;

// Web Audio API for simple generated sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'paddle') {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime); // High pitch
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'wall') {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(250, audioCtx.currentTime); // Lower pitch
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'score') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.4);
    oscillator.stop(audioCtx.currentTime + 0.4);
  }
}

const player = {
  x: 25,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  score: 0,
  movement: 0
};

const computer = {
  x: canvas.width - 25 - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  score: 0,
  speed: 4.5
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: ballSize,
  speed: 6,
  velocityX: 6,
  velocityY: 3,
  trail: []
};

// Difficulty Selection
diffButtons.forEach(btn => {
  btn.addEventListener("click", (e) => {
    diffButtons.forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    computer.speed = parseFloat(e.target.dataset.speed);
  });
});

function resetBall(direction = 1) {
  ball.x = canvas.width / 2 - ball.size / 2;
  ball.y = canvas.height / 2 - ball.size / 2;
  ball.trail = []; // Clear trail on reset

  const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
  ball.velocityX = Math.cos(angle) * ball.speed * direction;
  ball.velocityY = Math.sin(angle) * ball.speed;

  if (Math.abs(ball.velocityY) < 1) {
    ball.velocityY = ball.velocityY < 0 ? -1 : 1;
  }
}

function resetGame() {
  player.score = 0;
  computer.score = 0;
  playerScoreElement.textContent = player.score;
  computerScoreElement.textContent = computer.score;

  player.y = canvas.height / 2 - paddleHeight / 2;
  computer.y = canvas.height / 2 - paddleHeight / 2;
  
  isGameOver = false;
  cancelAnimationFrame(animationId);

  resetBall(Math.random() > 0.5 ? 1 : -1);
  gameLoop();
}

function keepPaddleOnScreen(paddle) {
  paddle.y = Math.max(0, Math.min(canvas.height - paddle.height, paddle.y));
}

function movePlayer() {
  player.y += player.movement;
  keepPaddleOnScreen(player);
}

function moveComputer() {
  const computerCenter = computer.y + computer.height / 2;

  if (computerCenter < ball.y - 10) {
    computer.y += computer.speed;
  } else if (computerCenter > ball.y + 10) {
    computer.y -= computer.speed;
  }

  keepPaddleOnScreen(computer);
}

function ballTouchesPaddle(paddle) {
  return (
    ball.x < paddle.x + paddle.width &&
    ball.x + ball.size > paddle.x &&
    ball.y < paddle.y + paddle.height &&
    ball.y + ball.size > paddle.y
  );
}

function bounceFromPaddle(paddle, direction) {
  playSound('paddle');
  const paddleCenter = paddle.y + paddle.height / 2;
  const ballCenter = ball.y + ball.size / 2;
  const hitPosition = (ballCenter - paddleCenter) / (paddle.height / 2);

  const angle = hitPosition * (Math.PI / 3);

  ball.speed = Math.min(ball.speed + 0.25, 13);
  ball.velocityX = Math.cos(angle) * ball.speed * direction;
  ball.velocityY = Math.sin(angle) * ball.speed;

  if (direction === 1) {
    ball.x = paddle.x + paddle.width;
  } else {
    ball.x = paddle.x - ball.size;
  }
}

function updateBall() {
  // Add current position to trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 10) ball.trail.shift();

  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  // Collision with the top and bottom walls
  if (ball.y <= 0) {
    ball.y = 0;
    ball.velocityY *= -1;
    playSound('wall');
  }

  if (ball.y + ball.size >= canvas.height) {
    ball.y = canvas.height - ball.size;
    ball.velocityY *= -1;
    playSound('wall');
  }

  // Collision with the paddles
  if (ball.velocityX < 0 && ballTouchesPaddle(player)) {
    bounceFromPaddle(player, 1);
  }

  if (ball.velocityX > 0 && ballTouchesPaddle(computer)) {
    bounceFromPaddle(computer, -1);
  }

  // Ball passed left wall
  if (ball.x + ball.size < 0) {
    playSound('score');
    computer.score++;
    computerScoreElement.textContent = computer.score;
    checkWinCondition();
    if (!isGameOver) {
      ball.speed = 6;
      resetBall(-1);
    }
  }

  // Ball passed right wall
  if (ball.x > canvas.width) {
    playSound('score');
    player.score++;
    playerScoreElement.textContent = player.score;
    checkWinCondition();
    if (!isGameOver) {
      ball.speed = 6;
      resetBall(1);
    }
  }
}

function checkWinCondition() {
  if (player.score >= WINNING_SCORE || computer.score >= WINNING_SCORE) {
    isGameOver = true;
  }
}

function drawRect(x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function drawCenterLine() {
  context.setLineDash([10, 12]);
  context.strokeStyle = "#29404d";
  context.lineWidth = 3;

  context.beginPath();
  context.moveTo(canvas.width / 2, 0);
  context.lineTo(canvas.width / 2, canvas.height);
  context.stroke();
  context.setLineDash([]);
}

function drawGameOver() {
  context.fillStyle = "rgba(7, 16, 24, 0.85)"; // Semi-transparent overlay
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#00d9ff";
  context.font = "bold 50px Arial";
  context.textAlign = "center";
  
  const text = player.score >= WINNING_SCORE ? "You Win! 🎉" : "Computer Wins! 🤖";
  context.fillText(text, canvas.width / 2, canvas.height / 2 - 20);
  
  context.fillStyle = "#ffffff";
  context.font = "20px Arial";
  context.fillText("Click 'Restart Game' below to play again.", canvas.width / 2, canvas.height / 2 + 30);
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawCenterLine();

  drawRect(player.x, player.y, player.width, player.height, "#00d9ff");
  drawRect(computer.x, computer.y, computer.width, computer.height, "#ff4d6d");

  // Draw the trail
  ball.trail.forEach((pos, index) => {
    const alpha = (index + 1) / ball.trail.length; // Fade out older positions
    const size = ball.size * alpha; // Shrink older positions
    context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    context.fillRect(pos.x + (ball.size - size) / 2, pos.y + (ball.size - size) / 2, size, size);
  });

  // Draw the actual ball
  drawRect(ball.x, ball.y, ball.size, ball.size, "#ffffff");

  if (isGameOver) {
    drawGameOver();
  }
}

function gameLoop() {
  if (isGameOver) {
    draw(); // Draw the final state and overlay
    return; // Stop looping
  }

  movePlayer();
  moveComputer();
  updateBall();
  draw();

  animationId = requestAnimationFrame(gameLoop);
}

// Mouse Controls
function movePlayerWithMouse(event) {
  const canvasBounds = canvas.getBoundingClientRect();
  const mouseY = event.clientY - canvasBounds.top;
  const scaleY = canvas.height / canvasBounds.height;

  player.y = mouseY * scaleY - player.height / 2;
  keepPaddleOnScreen(player);
}

// Touch Controls for Mobile
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault(); // Prevents the screen from scrolling when touching the canvas
  const touch = event.touches[0];
  const canvasBounds = canvas.getBoundingClientRect();
  const touchY = touch.clientY - canvasBounds.top;
  const scaleY = canvas.height / canvasBounds.height;
  
  player.y = touchY * scaleY - player.height / 2;
  keepPaddleOnScreen(player);
}, { passive: false });

// Keyboard Controls
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") event.preventDefault();
  if (event.key === "ArrowUp") player.movement = -paddleSpeed;
  if (event.key === "ArrowDown") player.movement = paddleSpeed;
});

window.addEventListener("keyup", (event) => {
  if (
    (event.key === "ArrowUp" && player.movement < 0) ||
    (event.key === "ArrowDown" && player.movement > 0)
  ) {
    player.movement = 0;
  }
});

canvas.addEventListener("mousemove", movePlayerWithMouse);
restartButton.addEventListener("click", resetGame);

// Draw the initial board but wait for a click to start the game
isGameOver = true;
draw();

// Draw a start message over the canvas
context.fillStyle = "rgba(7, 16, 24, 0.85)";
context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = "#00d9ff";
context.font = "bold 30px Arial";
context.textAlign = "center";
context.fillText("Click 'Restart Game' to Start! 🔊", canvas.width / 2, canvas.height / 2);
