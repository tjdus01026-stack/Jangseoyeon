let x = 0;
let speed = 3;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(240);
  x += speed;
  if (x > width || x < 0) {
    speed *= -1;
  }
  fill(100, 200, 100);
  circle(x, height / 2, 50);
}
