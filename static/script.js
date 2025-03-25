function updateTelemetry(battery, gps, altitude) {
    document.getElementById("battery").textContent = `Battery: ${battery}%`;
    document.getElementById("gps").textContent = `GPS: ${gps}`;
    document.getElementById("altitude").textContent = `Altitude: ${altitude}m`;
}

function addLog(message) {
    const logContainer = document.getElementById("logs-content");
    const newLog = document.createElement("p");
    newLog.textContent = message;
    logContainer.appendChild(newLog);
}

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

// Automatically update telemetry every 5 seconds (example)
setInterval(() => {
    // Simulating telemetry data updates (Replace with real data fetch)
    const battery = Math.floor(Math.random() * 100);  // Fake battery percentage
    const gps = `${(Math.random() * 90).toFixed(4)}, ${(Math.random() * 180).toFixed(4)}`;
    const altitude = Math.floor(Math.random() * 500); // Fake altitude

    updateTelemetry(battery, gps, altitude);
}, 5000);

// Load video when the page is ready
document.addEventListener("DOMContentLoaded", function () {
    loadVideoStream();
});
