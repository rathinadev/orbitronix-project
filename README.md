 python -m venv myvenv

 pip install -r requirements.txt




**In PI**

 1. Install GStreamer (if not installed)

Run this once on the Raspberry Pi:

sudo apt install -y gstreamer1.0-tools gstreamer1.0-plugins-bad \
                    gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly \
                    gstreamer1.0-libav


2. Run Script on Raspberry Pi Startup

To start streaming automatically when the drone boots, add the script to cron jobs.

Run:

crontab -e

At the bottom, add:

@reboot /usr/bin/python3 /home/pi/stream_video.py

**In laptop**

gst-launch-1.0 udpsrc port=5000 caps="application/x-rtp,media=video,encoding-name=H264,payload=96" \
    ! rtph264depay ! h264parse ! matroskamux \
    ! tcpserversink host=0.0.0.0 port=8554
