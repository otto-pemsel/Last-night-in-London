let flock;
let attractors = [];
let venuesTable;

let video;
let handPose;
let hands = [];
let handPoseReady = false;

// Projection settings - adjust these for your wall projection
const PROJECTION_WIDTH = 1920;  // Your projector's width
const PROJECTION_HEIGHT = 1080; // Your projector's height
const CENTER_OFFSET_X = 0;      // Adjust if projection is off-center horizontally
const CENTER_OFFSET_Y = 0;      // Adjust if projection is off-center vertically

function preload() {
  venuesTable = loadTable('first_5_events.csv', 'csv', 'header');
}

function setup() {
  // Use projection dimensions for better wall display
  createCanvas(PROJECTION_WIDTH, PROJECTION_HEIGHT);
  flock = new Flock();

  // Set up hand tracking - UPDATED FOR ML5.js v1+
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  
  // Initialize handPose with simplified options
  let options = {
    runtime: 'mediapipe',
    modelType: 'full',
    maxHands: 2,
    detectionConfidence: 0.5,
    trackingConfidence: 0.5
  };
  
  handPose = ml5.handPose(video, options, modelReady);

  // Add initial boids in a more distributed pattern
  let cols = 15;
  let rows = 10;
  let xSpacing = width / (cols + 1);
  let ySpacing = height / (rows + 1);
  for (let i = 1; i <= cols; i++) {
    for (let j = 1; j <= rows; j++) {
      let x = i * xSpacing + CENTER_OFFSET_X;
      let y = j * ySpacing + CENTER_OFFSET_Y;
      flock.addBoid(new Boid(x, y));
    }
  }

  // Create EQUALLY SPACED attractors in a pentagon pattern
  createEquallySpacedAttractors();
}

function createEquallySpacedAttractors() {
  let venueCount = min(venuesTable.getRowCount(), 5); // Ensure we only use 5 venues
  
  // Pentagon arrangement - equally spaced around a circle
  let centerX = width / 2 + CENTER_OFFSET_X;
  let centerY = height / 2 + CENTER_OFFSET_Y;
  let radius = min(width, height) * 0.3; // 30% of the smaller dimension
  
  for (let i = 0; i < venueCount; i++) {
    let row = venuesTable.getRow(i);
    
    // Calculate angle for equal spacing (pentagon = 5 points, 72 degrees apart)
    let angle = (TWO_PI / venueCount) * i - HALF_PI; // Start from top
    
    let x = centerX + cos(angle) * radius;
    let y = centerY + sin(angle) * radius;

    let attendance = parseInt(row.get('attendance'));
    let strength = map(attendance, 0, 2100, 0.05, 1);
    strength = constrain(strength, 0.05, 1);
    let venueName = row.get('name');

    attractors.push({
      position: createVector(x, y),
      strength: strength,
      name: venueName,
      angle: angle // Store angle for potential animation
    });
  }
  
  console.log(`Created ${attractors.length} equally spaced attractors in pentagon formation`);
}

// Alternative: Linear arrangement if you prefer
function createLinearAttractors() {
  let venueCount = min(venuesTable.getRowCount(), 5);
  let spacing = width / (venueCount + 1);
  let y = height / 2 + CENTER_OFFSET_Y;
  
  for (let i = 0; i < venueCount; i++) {
    let row = venuesTable.getRow(i);
    let x = (i + 1) * spacing + CENTER_OFFSET_X;

    let attendance = parseInt(row.get('attendance'));
    let strength = map(attendance, 0, 2100, 0.05, 1);
    strength = constrain(strength, 0.05, 1);
    let venueName = row.get('name');

    attractors.push({
      position: createVector(x, y),
      strength: strength,
      name: venueName
    });
  }
}

// Callback function for when handPose model is ready
function modelReady() {
  handPoseReady = true;
  // Start detecting hands - UPDATED API
  handPose.detectStart(video, gotHands);
}

// Callback function for when hands are detected
function gotHands(results) {
  hands = results;
}

function draw() {
  background(20, 20, 30); // Darker background for better projection

  // Draw attractors with better visibility for projection
  textAlign(CENTER, BOTTOM);
  textSize(16); // Larger text for projection
  fill(255, 255, 100); // Bright yellow for visibility
  noStroke();
  
  for (let i = 0; i < attractors.length; i++) {
    let a = attractors[i];
    
    // Draw attractor with size based on strength
    let size = map(a.strength, 0.05, 1, 15, 30);
    fill(255, 150 + a.strength * 105, 100); // Color based on strength
    stroke(255);
    strokeWeight(2);
    ellipse(a.position.x, a.position.y, size, size);
    
    // Draw name with better visibility
    fill(255);
    noStroke();
    textSize(14);
    text(a.name, a.position.x, a.position.y - size/2 - 5);
    
    // Draw connection lines between attractors for visual appeal
    if (i < attractors.length - 1) {
      stroke(100, 100, 150, 100);
      strokeWeight(1);
      line(a.position.x, a.position.y, 
           attractors[(i + 1) % attractors.length].position.x, 
           attractors[(i + 1) % attractors.length].position.y);
    }
  }

  // Process hands and add boids at fingertip
  if (handPoseReady && hands.length > 0) {
    for (let i = 0; i < hands.length; i++) {
      let hand = hands[i];
      
      // Check if hand has keypoints
      if (hand.keypoints && hand.keypoints.length > 8) {
        // Index finger tip is keypoint 8
        let indexTip = hand.keypoints[8];
        
        // More robust checking of the keypoint
        if (indexTip && typeof indexTip.x === 'number' && typeof indexTip.y === 'number') {
          // Map coordinates from video to canvas (FLIPPED horizontally for mirror effect)
          let x = map(indexTip.x, 0, video.width, width, 0) + CENTER_OFFSET_X;
          let y = map(indexTip.y, 0, video.height, 0, height) + CENTER_OFFSET_Y;
          
          // Ensure coordinates are within canvas bounds
          x = constrain(x, 0, width);
          y = constrain(y, 0, height);
          
          // Draw bright circle at fingertip for projection visibility
          fill(255, 100, 100); // Bright red-pink
          stroke(255, 255, 255);
          strokeWeight(3);
          ellipse(x, y, 40, 40);
          
          // Add text label with better visibility
          fill(255);
          noStroke();
          textAlign(CENTER, CENTER);
          textSize(12);
          text("FINGER", x, y);
          
          // Add boid every few frames
          if (frameCount % 5 === 0) {
            flock.addBoid(new Boid(x, y));
          }
        }
      }
    }
  }

  flock.run();
  
  // Display status info with better projection visibility
  fill(255, 255, 100);
  textAlign(LEFT, TOP);
  textSize(18);
  text(`Hands: ${hands.length} | Boids: ${flock.boids.length} | Frame: ${frameCount}`, 20, 30);
  
  // Instructions with better visibility
  fill(100, 255, 100);
  textSize(20);
  text("Point your index finger at the camera to add boids!", 20, height - 120);
  text("Or drag mouse to add boids", 20, height - 90);
  text("Press 'F' for fullscreen | 'R' to reset | 'L' for linear layout", 20, height - 60);
  text("Press 'P' for pentagon layout", 20, height - 30);
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = fullscreen();
    fullscreen(!fs);
  }
  
  // Reset system
  if (key === 'r' || key === 'R') {
    flock = new Flock();
    // Re-add some initial boids
    for (let i = 0; i < 50; i++) {
      flock.addBoid(new Boid(random(width), random(height)));
    }
  }
  
  // Switch to linear layout
  if (key === 'l' || key === 'L') {
    attractors = [];
    createLinearAttractors();
  }
  
  // Switch to pentagon layout
  if (key === 'p' || key === 'P') {
    attractors = [];
    createEquallySpacedAttractors();
  }
}

function mouseDragged() {
  flock.addBoid(new Boid(mouseX + CENTER_OFFSET_X, mouseY + CENTER_OFFSET_Y));
}

// Flock and Boid classes (enhanced for better projection visibility)
class Flock {
  constructor() {
    this.boids = [];
  }

  run() {
    for (let boid of this.boids) {
      boid.run(this.boids);
    }
  }

  addBoid(b) {
    this.boids.push(b);
  }
}

class Boid {
  constructor(x, y) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.position = createVector(x, y);
    this.size = 4.0; // Slightly larger for projection
    this.maxSpeed = 0.8; // Slightly faster for more dynamic movement
    this.maxForce = 0.03;
    // Brighter colors for projection
    this.color = color(random(100, 255), random(100, 255), random(150, 255));
  }

  run(boids) {
    this.flock(boids);
    this.attractedTo(attractors);
    this.update();
    this.borders();
    this.render();
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  flock(boids) {
    let separation = this.separate(boids);
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);

    separation.mult(3);
    alignment.mult(1.5);
    cohesion.mult(2.0);

    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);
  }

  attractedTo(points) {
    for (let pt of points) {
      let dir = p5.Vector.sub(pt.position, this.position);
      let d = dir.mag();
      let comfortRadius = 50; // Slightly larger comfort zone
      let maxDistance = 300; // Larger influence range

      if (d < comfortRadius) {
        let repel = dir.copy().normalize().mult(-0.05);
        this.applyForce(repel);
        continue;
      }

      if (d > maxDistance) continue;

      let force = dir.copy().normalize();
      let strength = pt.strength * (1 / (d * d));
      force.mult(strength * 4000); // Slightly stronger attraction

      this.applyForce(force);
    }
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    desired.normalize();
    desired.mult(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }

  render() {
    let theta = this.velocity.heading() + radians(90);
    fill(this.color);
    stroke(255, 200); // Brighter stroke for visibility
    strokeWeight(1);
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);
    beginShape();
    vertex(0, -this.size * 2);
    vertex(-this.size, this.size * 2);
    vertex(this.size, this.size * 2);
    endShape(CLOSE);
    pop();
  }

  borders() {
    // Account for center offset in wrapping
    if (this.position.x < -this.size) this.position.x = width + this.size;
    if (this.position.y < -this.size) this.position.y = height + this.size;
    if (this.position.x > width + this.size) this.position.x = -this.size;
    if (this.position.y > height + this.size) this.position.y = -this.size;
  }

  separate(boids) {
    let desiredSeparation = 30.0; // Reduced for tighter flocking
    let steer = createVector(0, 0);
    let count = 0;

    for (let boid of boids) {
      let d = p5.Vector.dist(this.position, boid.position);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.position, boid.position);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steer.div(count);
    }

    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(this.maxSpeed);
      steer.sub(this.velocity);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  align(boids) {
    let neighborDist = 60; // Slightly larger alignment range
    let sum = createVector(0, 0);
    let count = 0;
    for (let boid of boids) {
      let d = p5.Vector.dist(this.position, boid.position);
      if (d > 0 && d < neighborDist) {
        sum.add(boid.velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    } else {
      return createVector(0, 0);
    }
  }

  cohesion(boids) {
    let neighborDist = 60; // Slightly larger cohesion range
    let sum = createVector(0, 0);
    let count = 0;
    for (let boid of boids) {
      let d = p5.Vector.dist(this.position, boid.position);
      if (d > 0 && d < neighborDist) {
        sum.add(boid.position);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    } else {
      return createVector(0, 0);
    }
  }
}