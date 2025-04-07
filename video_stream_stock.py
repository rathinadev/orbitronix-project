import subprocess

# Set the laptop's IP address (where you receive the stream)
LAPTOP_IP = "192.168.1.100"  # Change this to your laptop's IP

# GStreamer command to stream a stock video in a loop
gst_command = f"""
gst-launch-1.0 filesrc location=/home/pi/sample.mp4 ! decodebin ! videoconvert \
    ! x264enc tune=zerolatency bitrate=500 speed-preset=ultrafast \
    ! rtph264pay config-interval=1 pt=96 ! udpsink host={LAPTOP_IP} port=5000
"""

# Run the command
try:
    subprocess.run(gst_command, shell=True, check=True)
except subprocess.CalledProcessError as e:
    print(f"Error starting GStreamer: {e}")
