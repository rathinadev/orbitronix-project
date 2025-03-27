function fetchLatestData() {
  fetch("/latest")
    .then(response => response.json())
    .then(data => {
      if (data) {
        document.getElementById("ir_value").innerText = data.ir_sensor_1 || "-";
        document.getElementById("temp_value").innerText = data.temperature || "-";
        document.getElementById("humidity_value").innerText = data.humidity || "-";
        document.getElementById("ultrasonic_value").innerText = data.ultrasonic_distance || "-";
        document.getElementById("mq7_value").innerText = data.co2_ppm || "-";
        
        // Format timestamp to show only time
        if (data.timestamp) {
            const date = new Date(data.timestamp);
            const timeString = date.toLocaleTimeString(); // Get time in HH:MM:SS format
            document.getElementById("timestamp").innerText = timeString;
        } else {
            document.getElementById("timestamp").innerText = "-";
        }
      }
    })
    .catch(error => console.error("Error fetching data:", error));
}

// Fetch data every 2 seconds
setInterval(fetchLatestData, 500);
fetchLatestData(); // Initial fetch

// Initialize Leaflet map
var map = L.map("map").setView([13.0827, 80.2707], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);