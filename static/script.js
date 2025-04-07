document.addEventListener("DOMContentLoaded", function() {
  // --- HLS Video Setup ---
  var video = document.getElementById("videoStream");
  // IMPORTANT: Replace with your actual HLS stream URL
  var videoSrc = "http://localhost:8001/hls/stream.m3u8";

  if (Hls.isSupported()) {
      console.log("HLS supported, initializing player.");
      var hls = new Hls({
           // Optional HLS configuration
           // maxBufferLength: 30, // Example: Set buffer length
      });
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
          console.log("Manifest parsed, attempting to play.");
          video.play().catch(error => {
               console.error("Video play failed on manifest parsed:", error);
               // User interaction might be needed to start playback
          });
      });
      hls.on(Hls.Events.ERROR, function (event, data) {
           console.error("HLS Error:", data);
           if (data.fatal) {
               switch(data.type) {
                   case Hls.ErrorTypes.NETWORK_ERROR:
                       console.warn("HLS Network error, attempting to recover...");
                       hls.startLoad(); // Try reloading source
                       break;
                   case Hls.ErrorTypes.MEDIA_ERROR:
                       console.warn("HLS Media error, attempting to recover...");
                       hls.recoverMediaError();
                       break;
                   default:
                       console.error("Unrecoverable HLS error, destroying player.");
                       hls.destroy(); // Destroy instance on fatal error
                       break;
               }
           }
      });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("Native HLS support detected (Safari).");
      video.src = videoSrc;
      video.addEventListener("loadedmetadata", function() {
           video.play().catch(error => {
               console.error("Video play failed (native):", error);
           });
      });
       video.addEventListener('error', (e) => {
          console.error('Error loading native HLS:', e);
          if(video.error) {
              console.error('Video error code:', video.error.code);
              console.error('Video error message:', video.error.message);
          }
      });
  } else {
      console.error("HLS is not supported in this browser.");
      // Optionally display a message to the user in the video area
  }


  // --- Helper Functions ---

  // Function to update text content safely
  function updateText(elementId, value, defaultValue = "-") {
      const element = document.getElementById(elementId);
      if (element) {
          element.innerText = value !== null && value !== undefined && value !== '' ? value : defaultValue;
      }
      // else { console.warn(`Element with ID ${elementId} not found.`); } // Keep console less noisy
  }

   // Function to format numbers (e.g., to 1 decimal place)
  function formatNumber(value, decimalPlaces = 1) {
      const num = parseFloat(value);
      if (isNaN(num)) {
          return null; // Return null if not a valid number
      }
      return num.toFixed(decimalPlaces);
  }

  // --- Data Fetching and Display ---
  function fetchLatestData() {
      fetch("/latest")
          .then(response => {
              if (!response.ok) {
                  updateText("headerTimestamp", `Error ${response.status}`);
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
          })
          .then(data => {
              if (data && Object.keys(data).length > 0) {
                  // Update Telemetry Values
                  updateText("ir_value", data.ir_sensor_1);
                  updateText("temp_value", formatNumber(data.temperature, 1));
                  updateText("humidity_value", formatNumber(data.humidity, 1));
                  updateText("ultrasonic_value", data.ultrasonic_distance);
                  updateText("mq7_value", formatNumber(data.co2_ppm, 2)); // Assuming MQ7 is CO

                  // Update Timestamp in Header
                  if (data.timestamp) {
                      try {
                          const date = new Date(data.timestamp);
                          const timeString = !isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Invalid Date";
                          updateText("headerTimestamp", timeString);
                      } catch (e) {
                           console.error("Error parsing timestamp:", e);
                           updateText("headerTimestamp", "Time Error");
                      }
                  } else {
                       updateText("headerTimestamp", "--:--:--");
                  }

                  // Update Battery (Ensure IDs: batteryLevelDisplay, batteryPercent)
                  if (data.battery_level !== undefined) {
                      const batteryLevel = Math.max(0, Math.min(100, data.battery_level));
                      const batteryLevelDisplay = document.getElementById('batteryLevelDisplay');
                      const batteryPercentText = document.getElementById('batteryPercent');
                      if (batteryLevelDisplay) batteryLevelDisplay.style.width = `${batteryLevel}%`;
                      if (batteryPercentText) batteryPercentText.innerText = `${batteryLevel.toFixed(0)}%`;
                  }

              } else {
                   // Handle empty data from backend
                   console.log("Received empty data from /latest");
                   // Optionally clear fields or show a 'No Data' state
                   updateText("ir_value", "-");
                   updateText("temp_value", "-");
                   updateText("humidity_value", "-");
                   updateText("ultrasonic_value", "-");
                   updateText("mq7_value", "-");
                   // updateText("headerTimestamp", "No Data"); // Or keep last time
              }
          })
          .catch(error => {
              console.error("Error fetching data:", error);
              // Display error state
               updateText("headerTimestamp", "Fetch Err");
               updateText("ir_value", "Err");
               updateText("temp_value", "Err");
               updateText("humidity_value", "Err");
               updateText("ultrasonic_value", "Err");
               updateText("mq7_value", "Err");
          });
  }

  // --- Mode Toggle ---
  const modeRadios = document.querySelectorAll('input[name="flightMode"]');
  const currentModeDisplay = document.getElementById('currentMode');

  modeRadios.forEach(radio => {
      radio.addEventListener('change', function() {
          if (this.checked) {
              const modeValue = this.value.charAt(0).toUpperCase() + this.value.slice(1);
              if (currentModeDisplay) {
                  currentModeDisplay.innerText = modeValue;
              }
               console.log(`Mode changed to: ${this.value}`);
               // TODO: Add backend call if needed: sendModeUpdate(this.value);
          }
      });
  });

  // --- VIRTUAL JOYSTICK LOGIC ---
  const leftStick = document.getElementById('left_joystick_stick');
  const leftBase = document.getElementById('left_joystick_base');
  const rightStick = document.getElementById('right_joystick_stick');
  const rightBase = document.getElementById('right_joystick_base');

  let activeStick = null;
  let startPos = { x: 0, y: 0 };
  let stickStartPos = { x: 0, y: 0 }; // We know this is center (50, 50) initially

  function handleStickStart(event, stickId) {
      // Prevent default only for touch to avoid issues like page scroll
      if (event.type === 'touchstart') {
           event.preventDefault();
      }
      activeStick = stickId;
      const stickElement = (stickId === 'left') ? leftStick : rightStick;
      stickElement.style.transition = 'none'; // Disable transition during drag

      if (event.type === 'touchstart') {
          startPos.x = event.touches[0].clientX;
          startPos.y = event.touches[0].clientY;
      } else { // mousedown
          startPos.x = event.clientX;
          startPos.y = event.clientY;
          // Add mouse listeners only after mousedown
          document.addEventListener('mousemove', handleStickMove);
          document.addEventListener('mouseup', handleStickEnd);
      }

      // Add touch listeners regardless of start event type (for consistency)
      document.addEventListener('touchmove', handleStickMove, { passive: false });
      document.addEventListener('touchend', handleStickEnd);
      document.addEventListener('touchcancel', handleStickEnd);

      console.log(`Stick ${stickId} engaged`);
  }

  function handleStickMove(event) {
      if (!activeStick) return;
       // Prevent default only for touchmove
      if (event.type === 'touchmove') {
          event.preventDefault();
      }

      let currentX, currentY;
      if (event.type === 'touchmove') {
          // If no touches are registered (e.g., gesture cancelled), end the interaction
          if (event.touches.length === 0) {
              handleStickEnd(event);
              return;
          }
          currentX = event.touches[0].clientX;
          currentY = event.touches[0].clientY;
      } else { // mousemove
          currentX = event.clientX;
          currentY = event.clientY;
      }

      const deltaX = currentX - startPos.x;
      const deltaY = currentY - startPos.y;

      const stickElement = (activeStick === 'left') ? leftStick : rightStick;
      const baseElement = (activeStick === 'left') ? leftBase : rightBase;
      const baseRect = baseElement.getBoundingClientRect();
      // Ensure we use offsetWidth which reflects actual rendered size
      const baseRadius = baseElement.offsetWidth / 2;
      const stickRadius = stickElement.offsetWidth / 2;
      // Max distance center of stick can move from center of base
      const maxDelta = baseRadius - stickRadius > 0 ? baseRadius - stickRadius : 0;


      let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      let constrainedX = deltaX;
      let constrainedY = deltaY;

      if (distance > maxDelta && maxDelta > 0) {
          constrainedX = (deltaX / distance) * maxDelta;
          constrainedY = (deltaY / distance) * maxDelta;
          distance = maxDelta;
      } else if (maxDelta <= 0) { // Handle case where stick is larger than base or calculation is off
          constrainedX = 0;
          constrainedY = 0;
          distance = 0;
      }


      // Calculate new CSS percentages relative to base dimensions
      // Ensure baseRect width/height are not zero to avoid division by zero
      const newCssLeft = baseRect.width > 0 ? (50 + (constrainedX / baseRect.width) * 100) : 50;
      const newCssTop = baseRect.height > 0 ? (50 + (constrainedY / baseRect.height) * 100) : 50;

      stickElement.style.left = `${newCssLeft}%`;
      stickElement.style.top = `${newCssTop}%`;

      // Convert to control values (-1 to +1)
      const controlX = maxDelta > 0 ? (constrainedX / maxDelta) : 0;
      const controlY = maxDelta > 0 ? (-constrainedY / maxDelta) : 0; // Y inverted

      // Send control data
      if (activeStick === 'left') {
          sendControlCommand('throttle', controlY.toFixed(2));
          sendControlCommand('yaw', controlX.toFixed(2));
      } else {
          sendControlCommand('pitch', controlY.toFixed(2));
          sendControlCommand('roll', controlX.toFixed(2));
      }
  }

  function handleStickEnd(event) {
      if (!activeStick) return;

      const stickElement = (activeStick === 'left') ? leftStick : rightStick;
      // Re-enable transition for smooth reset
      stickElement.style.transition = 'transform 0.1s linear, left 0.1s linear, top 0.1s linear';
      stickElement.style.left = '50%';
      stickElement.style.top = '50%';

      // Send zero commands
       if (activeStick === 'left') {
          sendControlCommand('throttle', 0);
          sendControlCommand('yaw', 0);
      } else {
          sendControlCommand('pitch', 0);
          sendControlCommand('roll', 0);
      }
      console.log(`Stick ${activeStick} released - commands zeroed.`);

      // Clean up all potential listeners
      document.removeEventListener('mousemove', handleStickMove);
      document.removeEventListener('mouseup', handleStickEnd);
      document.removeEventListener('touchmove', handleStickMove);
      document.removeEventListener('touchend', handleStickEnd);
      document.removeEventListener('touchcancel', handleStickEnd);

      activeStick = null;
  }

  // Add initial listeners
  leftStick.addEventListener('mousedown', (e) => handleStickStart(e, 'left'));
  leftStick.addEventListener('touchstart', (e) => handleStickStart(e, 'left'), { passive: false }); // Use passive: false for preventDefault
  rightStick.addEventListener('mousedown', (e) => handleStickStart(e, 'right'));
  rightStick.addEventListener('touchstart', (e) => handleStickStart(e, 'right'), { passive: false });


  // --- Backend Communication Placeholder ---
  function sendControlCommand(axis, value) {
      // !! REPLACE THIS with your actual logic !!
      // Use WebSockets (preferred) or Fetch API to send data to your Flask server
      console.log(`CMD -> ${axis}: ${value}`);

      /* Example using Fetch (less suitable for real-time):
      fetch('/control', { // You'd need a '/control' endpoint in Flask
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ axis: axis, value: parseFloat(value) })
      })
      .then(response => { if (!response.ok) console.error("Control send failed:", response.status); })
      .catch(err => console.error("Control send error:", err));
      */

      /* Example using WebSocket (assuming 'ws' variable is your WebSocket connection):
      if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'control', axis: axis, value: parseFloat(value) }));
      } else {
          // console.warn("WebSocket not open. Cannot send control command.");
      }
      */
  }
  // --- End Backend Communication Placeholder ---

  // --- Initial Load & Interval ---
  fetchLatestData(); // Fetch data on page load
  setInterval(fetchLatestData, 1000); // Fetch data every 1 second

}); // End DOMContentLoaded