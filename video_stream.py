import subprocess

# Set the laptop's IP address (where you receive the stream)
LAPTOP_IP = "192.168.1.100"  # Change this to your laptop's IP

# GStreamer command to stream video from the Raspberry Pi camera
gst_command = f"""
gst-launch-1.0 libcamerasrc ! video/x-raw,width=1280,height=720,framerate=30/1 \
    ! videoconvert ! x264enc tune=zerolatency bitrate=500 speed-preset=ultrafast \
    ! rtph264pay config-interval=1 pt=96 ! udpsink host={LAPTOP_IP} port=5000
"""

# Run the command
try:
    subprocess.run(gst_command, shell=True, check=True)
except subprocess.CalledProcessError as e:
    print(f"Error starting GStreamer: {e}")
