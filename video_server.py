from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import subprocess
import os

app = FastAPI()

# 🔹 Set Video Source (Change to Drone URL When Available)
VIDEO_SOURCE = "output_720p.mp4"  # Change to "udp://@:5000" when drone is ready

# 🔹 HLS Output Folder
HLS_FOLDER = "hls_output"
os.makedirs(HLS_FOLDER, exist_ok=True)

# 🔹 Start FFmpeg for HLS Streaming
def start_hls_stream():
    command = [
        "ffmpeg", "-re", "-i", VIDEO_SOURCE, "-c:v", "libx264",
        "-preset", "ultrafast", "-tune", "zerolatency",
        "-f", "hls", "-hls_time", "1", "-hls_list_size", "5",
        "-hls_flags", "delete_segments", f"{HLS_FOLDER}/stream.m3u8"
    ]
    return subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Start FFmpeg Process
process = start_hls_stream()

# 🔹 Serve HLS Files
app.mount("/hls", StaticFiles(directory=HLS_FOLDER), name="hls")

@app.get("/")
def index():
    return {"message": "HLS Video Streaming Active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
