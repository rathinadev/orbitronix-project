document.addEventListener("DOMContentLoaded", function() {
  // No HLS setup needed for MJPEG stream via <img> tag

  // --- Helper Functions ---
  function updateText(elementId, value, defaultValue = "-") {
      const element = document.getElementById(elementId);
      if (element) {
          // Ensure the value is treated as text, prevents potential XSS if data somehow contains HTML
          element.textContent = value !== null && value !== undefined && value !== '' ? value : defaultValue;
      }
  }

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
                  // Log the detailed error response if possible
                  response.text().then(text => console.error(`HTTP error! status: ${response.status}, body: ${text}`));
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
          })
          .then(data => {
              if (data && data.error) {
                  console.error("Error from /latest endpoint:", data.error);
                  // Potentially update UI to show backend error
                  updateText("headerTimestamp", "DB Err");
                  return; // Don't process further if backend reported an error
              }

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
                          // Check if timestamp is already a string that looks like a date/time
                          let date;
                          if (typeof data.timestamp === 'string' && data.timestamp.includes(':')) {
                              date = new Date(data.timestamp); // Attempt direct parsing
                          } else if (typeof data.timestamp === 'number') {
                              date = new Date(data.timestamp); // Assume milliseconds if number
                          } else {
                              // Fallback or specific parsing logic if needed
                              date = new Date(data.timestamp);
                          }

                          const timeString = !isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Invalid Date";
                          updateText("headerTimestamp", timeString);
                      } catch (e) {
                           console.error("Error parsing timestamp:", data.timestamp, e);
                           updateText("headerTimestamp", "Time Error");
                      }
                  } else {
                       updateText("headerTimestamp", "--:--:--");
                  }

                  // Update Battery (Ensure IDs: batteryLevelDisplay, batteryPercent)
                  if (data.battery_level !== undefined) {
                      const batteryLevel = Math.max(0, Math.min(100, parseFloat(data.battery_level))); // Ensure float
                      const batteryLevelDisplay = document.getElementById('batteryLevelDisplay');
                      const batteryPercentText = document.getElementById('batteryPercent');
                      if (!isNaN(batteryLevel)){ // Check if parsing was successful
                          if (batteryLevelDisplay) batteryLevelDisplay.style.width = `${batteryLevel}%`;
                          if (batteryPercentText) batteryPercentText.textContent = `${batteryLevel.toFixed(0)}%`;
                      }
                  }

              } else {
                   // Handle empty data from backend (but successful request)
                   // console.log("Received empty data object from /latest");
                   updateText("ir_value", "-");
                   updateText("temp_value", "-");
                   updateText("humidity_value", "-");
                   updateText("ultrasonic_value", "-");
                   updateText("mq7_value", "-");
                   // Keep last timestamp or show placeholder
                   // updateText("headerTimestamp", "--:--:--");
              }
          })
          .catch(error => {
              // Handle fetch network errors or JSON parsing errors
              console.error("Error fetching data:", error);
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
                  currentModeDisplay.textContent = modeValue; // Use textContent
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
  // We don't need stickStartPos if we always reset to center 50,50

  function handleStickStart(event, stickId) {
      if (event.type === 'touchstart') {
           event.preventDefault(); // Prevent page scroll, etc. on touch
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
          // Add mouse listeners ONLY on mousedown
          document.addEventListener('mousemove', handleStickMove);
          document.addEventListener('mouseup', handleStickEnd);
      }

      // Add touch listeners regardless (handle move/end same way)
      document.addEventListener('touchmove', handleStickMove, { passive: false }); // Need passive false for preventDefault
      document.addEventListener('touchend', handleStickEnd);
      document.addEventListener('touchcancel', handleStickEnd); // Handle cancellation (e.g., alert popup)

      stickElement.style.cursor = 'grabbing'; // Change cursor visual
      console.log(`Stick ${stickId} engaged`);
  }

  function handleStickMove(event) {
      if (!activeStick) return;
      if (event.type === 'touchmove') {
          event.preventDefault(); // Prevent scrolling during drag on touch
      }

      let currentX, currentY;
      if (event.type === 'touchmove' || event.type === 'touchstart') {
          if (event.touches.length === 0) return; // Safety check
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

      // Check for zero dimensions to prevent errors
      if(baseRect.width === 0 || baseRect.height === 0) return;

      const baseRadius = baseElement.offsetWidth / 2;
      const stickRadius = stickElement.offsetWidth / 2;
      const maxDelta = Math.max(0, baseRadius - stickRadius); // Ensure non-negative

      let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      let constrainedX = deltaX;
      let constrainedY = deltaY;

      if (distance > maxDelta && maxDelta > 0) {
          constrainedX = (deltaX / distance) * maxDelta;
          constrainedY = (deltaY / distance) * maxDelta;
      } else if (maxDelta <= 0) { // Stick is too big or base is zero width
          constrainedX = 0;
          constrainedY = 0;
      }

      const newCssLeft = 50 + (constrainedX / baseRect.width) * 100;
      const newCssTop = 50 + (constrainedY / baseRect.height) * 100;

      // Use requestAnimationFrame for smoother visual updates
      requestAnimationFrame(() => {
          stickElement.style.left = `${newCssLeft}%`;
          stickElement.style.top = `${newCssTop}%`;
      });


      // Convert to control values (-1 to +1)
      const controlX = maxDelta > 0 ? (constrainedX / maxDelta) : 0;
      // Invert Y axis: positive deltaY (down) means negative control value
      const controlY = maxDelta > 0 ? (-constrainedY / maxDelta) : 0;

      // Send control data (throttling might be needed for backend)
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
      stickElement.style.transition = 'left 0.1s linear, top 0.1s linear'; // Smooth reset transition

      requestAnimationFrame(() => {
          stickElement.style.left = '50%';
          stickElement.style.top = '50%';
          stickElement.style.cursor = 'grab'; // Reset cursor
      });


      // Send zero commands after stick release
       if (activeStick === 'left') {
          sendControlCommand('throttle', 0);
          sendControlCommand('yaw', 0);
      } else {
          sendControlCommand('pitch', 0);
          sendControlCommand('roll', 0);
      }
      console.log(`Stick ${activeStick} released - commands zeroed.`);

      // Clean up listeners added to the document
      document.removeEventListener('mousemove', handleStickMove);
      document.removeEventListener('mouseup', handleStickEnd);
      document.removeEventListener('touchmove', handleStickMove);
      document.removeEventListener('touchend', handleStickEnd);
      document.removeEventListener('touchcancel', handleStickEnd);

      activeStick = null; // Mark stick as inactive
  }

  // Add initial listeners to start interaction
  if (leftStick && rightStick) { // Check if elements exist before adding listeners
      leftStick.addEventListener('mousedown', (e) => handleStickStart(e, 'left'));
      leftStick.addEventListener('touchstart', (e) => handleStickStart(e, 'left'), { passive: false });
      rightStick.addEventListener('mousedown', (e) => handleStickStart(e, 'right'));
      rightStick.addEventListener('touchstart', (e) => handleStickStart(e, 'right'), { passive: false });
  } else {
      console.error("Joystick elements not found!");
  }


  // --- Backend Communication Placeholder ---
  // Debounce or throttle this function if sending too many updates
  function sendControlCommand(axis, value) {
      // !! REPLACE THIS with your actual logic !!
      console.log(`CMD -> ${axis}: ${value}`); // Log commands for debugging

      // Example: Implement WebSocket communication here
      // if (ws && ws.readyState === WebSocket.OPEN) {
      //     ws.send(JSON.stringify({ type: 'control', axis: axis, value: parseFloat(value) }));
      // }
  }
  // --- End Backend Communication Placeholder ---

  // --- Initial Load & Interval ---
  fetchLatestData(); // Fetch data on page load
  setInterval(fetchLatestData, 1000); // Fetch data every 1 second

}); // End DOMContentLoaded