const socket = new WebSocket("ws://localhost:8000/ws"); // WebSocket to FastAPI

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  document.getElementById("ir_value").innerText = data.ir;
  document.getElementById("temp_value").innerText = data.temperature;
  document.getElementById("humidity_value").innerText = data.humidity;
  document.getElementById("ultrasonic_value").innerText = data.ultrasonic;
  document.getElementById("mq7_value").innerText = data.mq7;
  document.getElementById("timestamp").innerText = data.timestamp;
};

// Initialize Leaflet map
var map = L.map('map').setView([13.0827, 80.2707], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
