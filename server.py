from flask import Flask, Response, jsonify, render_template, current_app
import cv2
import time
import threading
from pymongo import MongoClient

# --- Configuration ---
VIDEO_SOURCE = "output_720p.mp4" # Path to your placeholder video (ensure it exists!)
# VIDEO_SOURCE = 0               # Example: Use 0 for default webcam when drone is ready
# VIDEO_SOURCE = "rtsp://..."    # Example: Use RTSP URL from drone camera

FRAME_RATE_DELAY = 1 / 30       # Target delay (~30 FPS). Adjust if needed. Use 0 for max speed.
JPEG_QUALITY = 75               # JPEG quality (0-100)

app = Flask(__name__)

# --- MongoDB Connection ---
try:
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000) # Added timeout
    # The ismaster command is cheap and does not require auth.
    client.admin.command('ismaster')
    db = client["drone_data"]
    collection = db["sensor_readings"]
    print("MongoDB connection successful.")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    # Depending on requirements, you might want to exit or run without DB
    db = None
    collection = None

# --- Video Streaming Setup ---
video_lock = threading.Lock()
output_frame = None # Global frame placeholder (optional)

def generate_video_frames():
    """Generator function to yield video frames as MJPEG."""
    global output_frame

    cap = None
    last_connection_attempt = 0
    connection_retry_delay = 5 # seconds

    is_file = isinstance(VIDEO_SOURCE, str) and VIDEO_SOURCE.lower().endswith(('.mp4', '.avi', '.mov'))
    print(f"Video source type determined as: {'File' if is_file else 'Live/Stream'}")

    while True:
        now = time.time()
        frame_data_to_yield = None # Store frame data here to release lock sooner

        try:
            with video_lock:
                # Initialize or re-initialize capture object if needed
                if cap is None:
                    if now - last_connection_attempt < connection_retry_delay:
                        time.sleep(0.5) # Avoid busy-waiting when connection fails
                        continue

                    print(f"Attempting to open video source: {VIDEO_SOURCE}")
                    last_connection_attempt = now
                    cap = cv2.VideoCapture(VIDEO_SOURCE)
                    if not cap.isOpened():
                        print(f"Error: Cannot open video source: {VIDEO_SOURCE}")
                        cap = None # Ensure cap is None to trigger retry logic
                        continue # Skip to next iteration
                    else:
                        print("Video source opened successfully.")

                # Read frame
                ret, frame = cap.read()

                # Handle read failure
                if not ret:
                    print(f"Warning: Failed to grab frame from {VIDEO_SOURCE}.")
                    if is_file:
                        print("End of video file reached, looping...")
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # Reset video to beginning
                        time.sleep(0.1) # Small delay before retrying read
                        continue
                    else:
                        # For live feeds, release and retry connection
                        print("Attempting to reconnect to live source...")
                        cap.release()
                        cap = None
                        continue # Will trigger re-initialization logic

                # --- Frame Processing & Encoding (inside lock for frame consistency) ---
                # Optional: Resize frame
                # frame = cv2.resize(frame, (new_width, new_height))

                # Encode frame to JPEG
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
                flag, encodedImage = cv2.imencode(".jpg", frame, encode_param)

                if not flag:
                    print("Error: Frame encoding to JPEG failed.")
                    continue

                # Store the encoded image bytes to be yielded outside the lock
                frame_data_to_yield = (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' +
                                       bytearray(encodedImage) + b'\r\n')

        except Exception as e:
            print(f"Error in video generation thread: {e}")
            # Ensure resource release even on unexpected errors
            with video_lock:
                if cap:
                    cap.release()
                    cap = None
            time.sleep(connection_retry_delay) # Wait before full retry

        # Yield the frame data outside the lock to allow other threads access sooner
        if frame_data_to_yield:
            yield frame_data_to_yield

        # Control frame rate (outside lock)
        if FRAME_RATE_DELAY > 0:
             elapsed = time.time() - now
             sleep_time = FRAME_RATE_DELAY - elapsed
             if sleep_time > 0:
                 time.sleep(sleep_time)

# --- Flask Routes ---

@app.route("/video_feed")
def video_feed():
    """Route to stream video frames using MJPEG."""
    return Response(generate_video_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/latest")
def get_latest():
    """Route to get the latest sensor data from MongoDB."""
    if collection is None:
        return jsonify({"error": "Database not connected"}), 500

    try:
        latest_doc = collection.find_one(sort=[("_id", -1)])
        if latest_doc:
            latest_doc["_id"] = str(latest_doc["_id"]) # Convert ObjectId to string
            return jsonify(latest_doc)
        else:
            return jsonify({}) # Return empty object if no data found
    except Exception as e:
        print(f"Error fetching data from MongoDB: {e}")
        return jsonify({"error": "Failed to fetch data from database"}), 500

@app.route('/')
def index():
    """Serve the main dashboard page."""
    return render_template('index.html')

# --- Main Execution ---
if __name__ == "__main__":
    print("Starting Flask development server...")
    # Use threaded=True for the development server to handle concurrent requests (video + data)
    # For production, use a proper WSGI server like Gunicorn or Waitress.
    app.run(debug=True, host="0.0.0.0", port=5000, threaded=True)