let events = [];
let circles = [];
let csvLoaded = false;

// Simple black and red color scheme (matching boid system)
const colors = {
    background: [5, 5, 5], // Dark background
    red: [255, 100, 100], // Bright red-pink
    white: [255, 255, 255], // Pure white
    gray: [150, 150, 150] // Light gray
};

// Generate red color variations based on attendance
function getCircleColor(attendance, maxAttendance, minAttendance) {
    // Invert the ratio so lower attendance = higher ratio (brighter red)
    let ratio = 1 - ((attendance - minAttendance) / (maxAttendance - minAttendance));
    
    // All red, just different intensities
    let intensity = 100 + (ratio * 155); // Range from 100 to 255
    return [intensity, intensity * 0.4, intensity * 0.4, 200]; // Red with some transparency
}

function preload() {
    // Load your CSV file - make sure the file is in the same directory
    loadTable('cleaned_event31.csv', 'csv', 'header', onCSVLoaded, onCSVError);
}

function onCSVLoaded(table) {
    console.log('CSV loaded successfully');
    csvLoaded = true;
    
    // Convert p5.Table to array of objects
    let allEvents = [];
    for (let i = 0; i < table.getRowCount(); i++) {
        let row = table.getRow(i);
        let attendance = parseInt(row.get('Number of guests attending'));
        
        // Filter out events with no attendance or missing data
        if (attendance > 0 && 
            row.get('Venue') && 
            row.get('Event name') && 
            row.get('Event URL')) {
            
            allEvents.push({
                eventName: row.get('Event name'),
                venue: row.get('Venue'),
                url: row.get('Event URL'),
                attendance: attendance
            });
        }
    }
    
    // Sort by attendance and filter out top 50% (keep lower attendance events)
    allEvents.sort((a, b) => b.attendance - a.attendance);
    let filteredEvents = allEvents.slice(Math.floor(allEvents.length / 2));
    
    // Find min and max attendance for proper scaling
    let maxAttendance = Math.max(...filteredEvents.map(e => e.attendance));
    let minAttendance = Math.min(...filteredEvents.map(e => e.attendance));
    
    // Create circle objects
    for (let event of filteredEvents) {
        // Invert the mapping so lower attendance = bigger circles
        let radius = map(event.attendance, minAttendance, maxAttendance, 70, 15);
        
        circles.push({
            x: random(radius, windowWidth - radius),
            y: random(radius, windowHeight - radius),
            vx: random(-0.5, 0.5),
            vy: random(-0.5, 0.5),
            radius: radius,
            venue: event.venue,
            eventName: event.eventName,
            url: event.url,
            attendance: event.attendance,
            color: getCircleColor(event.attendance, maxAttendance, minAttendance),
            hovered: false
        });
    }
}

function onCSVError(error) {
    console.error('Error loading CSV:', error);
    // Display error message on canvas
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(colors.red[0], colors.red[1], colors.red[2]);
    text('Error loading CSV file. Make sure cleaned_event31.csv is in the same directory.', 
         windowWidth/2, windowHeight/2);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont('Arial');
}

function draw() {
    // Simple dark background
    background(colors.background[0], colors.background[1], colors.background[2]);
    
    if (!csvLoaded) {
        // Show loading message
        fill(colors.white[0], colors.white[1], colors.white[2]);
        textAlign(CENTER, CENTER);
        textSize(20);
        text('Loading CSV data...', width/2, height/2);
        return;
    }
    
    if (circles.length === 0) {
        // Show message if no data
        fill(colors.white[0], colors.white[1], colors.white[2]);
        textAlign(CENTER, CENTER);
        textSize(16);
        text('No event data found or CSV file not loaded properly.', width/2, height/2);
        return;
    }
    
    // Check for hover
    for (let circle of circles) {
        let d = dist(mouseX, mouseY, circle.x, circle.y);
        circle.hovered = d < circle.radius;
    }
    
    // Update and draw circles
    for (let circle of circles) {
        // Update position
        circle.x += circle.vx;
        circle.y += circle.vy;
        
        // Bounce off edges
        if (circle.x - circle.radius <= 0 || circle.x + circle.radius >= width) {
            circle.vx *= -1;
        }
        if (circle.y - circle.radius <= 0 || circle.y + circle.radius >= height) {
            circle.vy *= -1;
        }
        
        // Keep within bounds
        circle.x = constrain(circle.x, circle.radius, width - circle.radius);
        circle.y = constrain(circle.y, circle.radius, height - circle.radius);
        
        // Draw glow effect for hovered circles
        if (circle.hovered) {
            for (let r = circle.radius * 2.5; r > circle.radius * 2; r -= 2) {
                let alpha = map(r, circle.radius * 2, circle.radius * 2.5, 50, 0);
                fill(colors.red[0], colors.red[1], colors.red[2], alpha);
                noStroke();
                ellipse(circle.x, circle.y, r);
            }
        }
        
        // Draw main circle - all red
        fill(circle.color[0], circle.color[1], circle.color[2], circle.hovered ? 255 : circle.color[3]);
        
        // White stroke for definition
        stroke(colors.white[0], colors.white[1], colors.white[2], 50);
        strokeWeight(1);
        ellipse(circle.x, circle.y, circle.radius * 2);
        
        // Draw text
        noStroke();
        
        // Add text shadow for readability
        fill(0, 0, 0, 100);
        textAlign(CENTER, CENTER);
        
        // Venue name shadow
        let venueSize = map(circle.radius, 15, 60, 8, 16);
        textSize(venueSize);
        textStyle(BOLD);
        text(circle.venue, circle.x + 1, circle.y - 7);
        
        // Event name shadow
        let eventSize = map(circle.radius, 15, 60, 6, 12);
        textSize(eventSize);
        textStyle(NORMAL);
        let eventText = circle.eventName;
        if (eventText.length > 30) {
            eventText = eventText.substring(0, 27) + "...";
        }
        text(eventText, circle.x + 1, circle.y + 9);
        
        // Main text - white
        fill(colors.white[0], colors.white[1], colors.white[2]);
        
        // Venue name
        textSize(venueSize);
        textStyle(BOLD);
        text(circle.venue, circle.x, circle.y - 8);
        
        // Event name
        textSize(eventSize);
        textStyle(NORMAL);
        text(eventText, circle.x, circle.y + 8);
        
        // Show attendance on hover
        if (circle.hovered) {
            fill(colors.gray[0], colors.gray[1], colors.gray[2]);
            textSize(eventSize * 0.8);
            text(`${circle.attendance} attendees`, circle.x, circle.y + 20);
        }
    }
    
    // Draw legend
    drawLegend();
}

function drawLegend() {
    // Semi-transparent background for legend
    fill(0, 0, 0, 120);
    noStroke();
    rect(20, 20, 200, 120, 10);
    
    // Legend title
    fill(colors.white[0], colors.white[1], colors.white[2]);
    textAlign(LEFT, CENTER);
    textSize(14);
    textStyle(BOLD);
    text('Attendance Levels', 30, 40);
    
    // Legend items - all red, different intensities
    let legendItems = [
        { label: 'Lowest Attendance', intensity: 255 },
        { label: 'Low Attendance', intensity: 220 },
        { label: 'Medium-Low', intensity: 185 },
        { label: 'Medium', intensity: 150 },
        { label: 'Higher Attendance', intensity: 115 }
    ];
    
    textStyle(NORMAL);
    textSize(11);
    
    for (let i = 0; i < legendItems.length; i++) {
        let y = 60 + i * 15;
        
        // Red circle with varying intensity
        let intensity = legendItems[i].intensity;
        fill(intensity, intensity * 0.4, intensity * 0.4);
        ellipse(40, y, 12);
        
        // Label
        fill(colors.gray[0], colors.gray[1], colors.gray[2]);
        text(legendItems[i].label, 55, y);
    }
}

function mousePressed() {
    // Check if mouse is over any circle
    for (let circle of circles) {
        let d = dist(mouseX, mouseY, circle.x, circle.y);
        if (d < circle.radius) {
            window.open(circle.url, '_blank');
            break;
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Reposition circles within new bounds
    for (let circle of circles) {
        circle.x = constrain(circle.x, circle.radius, width - circle.radius);
        circle.y = constrain(circle.y, circle.radius, height - circle.radius);
    }
}