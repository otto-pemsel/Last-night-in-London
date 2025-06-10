/* --- Joysticks --- */
const int xAxisPin   = A0;
const int yAxisPin   = A1;
const int buttonPin  = 2;    // joystick-1 button (active-low)

const int xRotPin    = A2;
const int yRotPin    = A3;
const int button2Pin = 3;    // joystick-2 button (active-low)

/* --- Additional Buttons --- */
const int button3Pin = 5;    // extra button 3 (active-low)
const int button4Pin = 6;    // extra button 4 (active-low)

/* --- MPR121 --- */
#include <Wire.h>
#include "Adafruit_MPR121.h"
Adafruit_MPR121 cap = Adafruit_MPR121();

/* --- State storage for change detection --- */
int16_t lastX = -1, lastY = -1, lastXR = -1, lastYR = -1;
bool lastBtn1 = false, lastBtn2 = false, lastBtn3 = false, lastBtn4 = false;
uint8_t lastTouched3 = 0;  // 3-bit mask for electrodes 0-2

unsigned long lastMessageTime = 0;
const unsigned long heartbeatInterval = 5000;  // 5 seconds

void setup() {
  Serial.begin(9600);

  pinMode(buttonPin,  INPUT_PULLUP);
  pinMode(button2Pin, INPUT_PULLUP);
  pinMode(button3Pin, INPUT_PULLUP);
  pinMode(button4Pin, INPUT_PULLUP);

  if (!cap.begin(0x5A)) {
    Serial.println("MPR121 not found, check wiring?");
    while (1);  // halt if not found
  }

  Serial.println("# Ready");
  lastMessageTime = millis();  // start heartbeat clock
}

void loop() {
  // ---------- 1. READ JOYSTICKS ----------
  int16_t x  = analogRead(xAxisPin);
  int16_t y  = analogRead(yAxisPin);
  int16_t xr = analogRead(xRotPin);
  int16_t yr = analogRead(yRotPin);

  bool btn1 = !digitalRead(buttonPin);   // active-low
  bool btn2 = !digitalRead(button2Pin);
  bool btn3 = !digitalRead(button3Pin);
  bool btn4 = !digitalRead(button4Pin);

  bool joyChanged =
        (abs(x  - lastX)  > 10) ||
        (abs(y  - lastY)  > 10) ||
        (abs(xr - lastXR) > 10) ||
        (abs(yr - lastYR) > 10) ||
        (btn1 != lastBtn1) ||
        (btn2 != lastBtn2) ||
        (btn3 != lastBtn3) ||
        (btn4 != lastBtn4);

  if (joyChanged) {
    Serial.print("j,");
    Serial.print(x);   Serial.print(',');
    Serial.print(y);   Serial.print(',');
    Serial.print(btn1);Serial.print(',');
    Serial.print(xr);  Serial.print(',');
    Serial.print(yr);  Serial.print(',');
    Serial.print(btn2);Serial.print(',');
    Serial.print(btn3);Serial.print(',');
    Serial.println(btn4);

    lastX = x;  lastY = y;  lastXR = xr;  lastYR = yr;
    lastBtn1 = btn1;  lastBtn2 = btn2;
    lastBtn3 = btn3;  lastBtn4 = btn4;

    lastMessageTime = millis();
  }

  // ---------- 2. READ CAP-TOUCH (ONLY FIRST 3 ELECTRODES) ----------
  uint8_t touched3 = cap.touched() & 0b00000111;  // only electrodes 0, 1, 2
  if (touched3 != lastTouched3) {
    Serial.print("t,");
    for (uint8_t i = 0; i < 3; i++) {
      Serial.print((touched3 & (1 << i)) ? '1' : '0');
    }
    Serial.println();
    lastTouched3 = touched3;
    lastMessageTime = millis();
  }

  // ---------- 3. HEARTBEAT ----------
  if (millis() - lastMessageTime >= heartbeatInterval) {
    Serial.println("h,heartbeat");
    lastMessageTime = millis();
  }

  Serial.flush(); // flush serial buffer to prevent overflow

  delay(10);  // ~100 FPS max
}


