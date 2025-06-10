let classifier;
const imageModelURL = 'https://teachablemachine.withgoogle.com/models/2RWYcWeO8/';

let video;
let label = "";
let smoothedLabel = "";
let lastChangeTime = 0;
let delayBetweenChanges = 500;

let facingFront = true;
let flipButton;

function preload() {
  classifier = ml5.imageClassifier(imageModelURL + 'model.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Flip camera button
  flipButton = createButton('Flip Camera');
  flipButton.position(20, 20);
  flipButton.style('z-index', '10');
  flipButton.mousePressed(toggleCamera);

  setupVideo();
}

function setupVideo() {
  if (video) video.remove();

  const constraints = {
    video: {
      facingMode: facingFront ? "user" : "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  video = createCapture(constraints, () => {
    console.log("Camera started");
    classifyVideo();
  });

  video.size(width, height);
  video.hide();
}

function toggleCamera() {
  facingFront = !facingFront;
  setupVideo();
}

function draw() {
  background(0);

  // Mirror the video if front-facing
  push();
  if (facingFront) {
    translate(width, 0);
    scale(-1, 1);
  }
  image(video, 0, 0, width, height);
  pop();

  // Overlay
  noStroke();
  if (smoothedLabel === "At Risk") {
    fill(255, 0, 0, 100);
    rect(0, 0, width, height);
  } else if (smoothedLabel === "Safe") {
    fill(0, 255, 0, 100);
    rect(0, 0, width, height);
  }

  // Label
  fill(255);
  textSize(32);
  textAlign(CENTER, BOTTOM);
  text(smoothedLabel, width / 2, height - 10);
}

function classifyVideo() {
  classifier.classify(video, gotResult);
}

function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }

  label = results[0].label;
  let currentTime = millis();
  if (label !== smoothedLabel && currentTime - lastChangeTime > delayBetweenChanges) {
    smoothedLabel = label;
    lastChangeTime = currentTime;
  }

  classifyVideo();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(windowWidth, windowHeight);
}

  