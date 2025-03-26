// Connect to Flask-SocketIO server
var socket = io.connect("http://" + document.domain + ":" + location.port);

// Function to update telemetry data on UI
function updateTelemetry(sensorData) {
    document.getElementById("battery").textContent = `Battery: ${sensorData.battery}%`;
    document.getElementById("gps").textContent = `GPS: ${sensorData.gps}`;
    document.getElementById("altitude").textContent = `Altitude: ${sensorData.altitude}m`;
    document.getElementById("temperature").textContent = `Temperature: ${sensorData.temperature}°C`;
    document.getElementById("gas").textContent = `Gas Level: ${sensorData.gas}`;
    document.getElementById("distance").textContent = `Distance: ${sensorData.distance}cm`;
}

// Function to add logs
function addLog(message) {
    const logContainer = document.getElementById("logs-content");
    const newLog = document.createElement("p");
    newLog.textContent = message;
    logContainer.appendChild(newLog);
}

// Listen for incoming sensor data from Flask-SocketIO
socket.on("sensor_update", function(data) {
    console.log("Received Sensor Data:", data);
    
    try {
        let sensorData = JSON.parse(data);  // Convert JSON string to object
        updateTelemetry(sensorData);
        addLog(`New Sensor Update: Battery ${sensorData.battery}%, Altitude ${sensorData.altitude}m, Temp ${sensorData.temperature}°C`);
    } catch (error) {
        console.error("Error parsing sensor data:", error);
    }
});

// Function to load the video stream from Raspberry Pi
function loadVideoStream() {
    const videoElement = document.getElementById("video-stream");
    const streamUrl = "http://192.168.1.100:8554";  // Change this to your actual stream URL

    if (videoElement) {
        videoElement.src = streamUrl;
        videoElement.load();
        console.log("Video stream loaded:", streamUrl);
    } else {
        console.error("Video element not found!");
    }
}

// Load video when the page is ready
document.addEventListener("DOMContentLoaded", function () {
    loadVideoStream();
});
