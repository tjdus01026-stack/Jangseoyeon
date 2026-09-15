let bgColor = 220;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(bgColor);
  fill(250, 100, 100);
  circle(width / 2, height / 2, 100);
}

function mousePressed() {
  bgColor = random(255);
}
