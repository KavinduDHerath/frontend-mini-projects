const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");

const playerScoreElement = document.getElementById("playerScore");
const computerScoreElement = document.getElementById("computerScore");
const restartButton = document.getElementById("restartButton");

const paddleWidth = 14;
const paddleHeight = 100;
const paddleSpeed = 7;
const ballSize = 14;

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
  velocityY: 3
};

function resetBall(direction = 1) {
  ball.x = canvas.width / 2 - ball.size / 2;
  ball.y = canvas.height / 2 - ball.size / 2;

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

  resetBall(Math.random() > 0.5 ? 1 : -1);
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
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  // Collision with the top and bottom walls.
  if (ball.y <= 0) {
    ball.y = 0;
    ball.velocityY *= -1;
  }

  if (ball.y + ball.size >= canvas.height) {
    ball.y = canvas.height - ball.size;
    ball.velocityY *= -1;
  }

  // Collision with the player's paddle.
  if (ball.velocityX < 0 && ballTouchesPaddle(player)) {
    bounceFromPaddle(player, 1);
  }

  // Collision with the computer's paddle.
  if (ball.velocityX > 0 && ballTouchesPaddle(computer)) {
    bounceFromPaddle(computer, -1);
  }

  // Ball passed the left wall.
  if (ball.x + ball.size < 0) {
    computer.score++;
    computerScoreElement.textContent = computer.score;
    ball.speed = 6;
    resetBall(-1);
  }

  // Ball passed the right wall.
  if (ball.x > canvas.width) {
    player.score++;
    playerScoreElement.textContent = player.score;
    ball.speed = 6;
    resetBall(1);
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

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawCenterLine();

  drawRect(
    player.x,
    player.y,
    player.width,
    player.height,
    "#00d9ff"
  );

  drawRect(
    computer.x,
    computer.y,
    computer.width,
    computer.height,
    "#ff4d6d"
  );

  drawRect(ball.x, ball.y, ball.size, ball.size, "#ffffff");
}

function gameLoop() {
  movePlayer();
  moveComputer();
  updateBall();
  draw();

  requestAnimationFrame(gameLoop);
}

function movePlayerWithMouse(event) {
  const canvasBounds = canvas.getBoundingClientRect();
  const mouseY = event.clientY - canvasBounds.top;
  const scaleY = canvas.height / canvasBounds.height;

  player.y = mouseY * scaleY - player.height / 2;
  keepPaddleOnScreen(player);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
  }

  if (event.key === "ArrowUp") {
    player.movement = -paddleSpeed;
  }

  if (event.key === "ArrowDown") {
    player.movement = paddleSpeed;
  }
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

resetGame();
gameLoop();