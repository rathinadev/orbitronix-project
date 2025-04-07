# README: Setting Up RTSP Video Streaming on Raspberry Pi Drone

## Purpose

This guide explains how to set up your Raspberry Pi (with a camera module attached) to act as an **RTSP (Real Time Streaming Protocol)** video server. This allows your main Flask server (running `app.py`) to efficiently connect to the Pi's camera feed using a URL like `rtsp://<PI_IP_ADDRESS>:<PORT>/<STREAM_NAME>`.

This method uses dedicated tools (`rtsp-simple-server` and `libcamera-vid`) which are generally more efficient in terms of Pi CPU usage and network bandwidth compared to streaming MJPEG directly from a Python script on the Pi, primarily because it uses efficient codecs like H.264.

## Prerequisites

1.  **Raspberry Pi:** Any model with a camera connector (Pi Zero might struggle with higher resolutions/framerates).
2.  **Raspberry Pi OS:** Bullseye (or later) recommended, as it uses the `libcamera` framework.
3.  **Camera Module:** A Raspberry Pi compatible camera module (v1, v2, v3, HQ, etc.).
4.  **Camera Enabled:** Ensure the camera interface is enabled using `sudo raspi-config` (Interface Options -> Camera -> Enable).
5.  **Network Connection:** The Pi must be connected to the same network as your main Flask server (via WiFi or Ethernet).
6.  **SSH Access:** You need to be able to connect to your Pi via SSH to run commands.

## Installation Steps

Connect to your Raspberry Pi via SSH and run the following commands:

1.  **Update System:**
    ```bash
    sudo apt update
    sudo apt upgrade -y
    ```

2.  **Install `libcamera-utils`:** This package contains the `libcamera-vid` tool needed to access the camera.
    ```bash
    sudo apt install -y libcamera-utils
    ```

3.  **Install `rtsp-simple-server`:**
    *   Go to the `rtsp-simple-server` releases page: [https://github.com/aler9/rtsp-simple-server/releases](https://github.com/aler9/rtsp-simple-server/releases)
    *   Find the latest release and identify the correct `.tar.gz` file for your Pi's architecture.
        *   Check your architecture: `uname -m`
        *   Common architectures: `armv7l` (32-bit Pi 2/3/ZeroW), `aarch64` (64-bit Pi 3/4/Zero2W with 64-bit OS). Download the corresponding `armv7` or `arm64v8` release file.
    *   Download the file using `wget` (replace the URL with the one you found):
        ```bash
        # --- EXAMPLE for arm64v8 ---
        # !!! Check GitHub releases for the LATEST version number and correct architecture !!!
        wget https://github.com/aler9/rtsp-simple-server/releases/download/v1.5.1/rtsp-simple-server_v1.5.1_linux_arm64v8.tar.gz

        # --- EXAMPLE for armv7 ---
        # wget https://github.com/aler9/rtsp-simple-server/releases/download/v1.5.1/rtsp-simple-server_v1.5.1_linux_armv7.tar.gz
        ```
    *   Extract the downloaded archive:
        ```bash
        # Replace the filename with the one you downloaded
        tar -xzf rtsp-simple-server_*.tar.gz
        ```
    *   This will create an `rtsp-simple-server` executable file and a default `rtsp-simple-server.yml` configuration file in your current directory.

## Running the Stream (Two Concurrent Processes)

You need **two** commands running simultaneously on the Pi: the RTSP server itself, and the camera command feeding video *into* the server. It's recommended to run these in separate terminals or using tools like `screen` or `tmux` so they keep running if you disconnect your SSH session.

1.  **Start the RTSP Server:**
    *   Navigate to the directory where you extracted `rtsp-simple-server`.
    *   Run the server:
        ```bash
        ./rtsp-simple-server
        ```
    *   It will start and print logs, indicating it's listening (usually on ports 8554 for RTSP, 888 for RTMP, 889 for HLS - we only need RTSP). **Keep this running.**

2.  **Start the Camera Feed (`libcamera-vid`) to the RTSP Server:**
    *   Open a **new SSH terminal** window connected to the same Pi.
    *   Run the `libcamera-vid` command:
        ```bash
        # Adjust width, height, framerate for performance vs quality trade-off
        libcamera-vid -t 0 --inline -o rtsp://127.0.0.1:8554/mystream --width 640 --height 480 --framerate 20 -n --codec h264
        ```
    *   **Explanation:**
        *   `libcamera-vid`: Command to capture video.
        *   `-t 0`: Run continuously (timeout 0).
        *   `--inline`: Embed SPS/PPS headers needed by some clients.
        *   `-o rtsp://127.0.0.1:8554/mystream`: **Output** the stream via RTSP protocol (`rtsp://`) to the server running on the **same Pi** (`127.0.0.1`) on the default RTSP port (`8554`) under the stream path name `mystream`. You can change `mystream` if desired, but make sure it matches in your server `app.py`.
        *   `--width 640 --height 480`: Set video resolution. Lower values use less CPU and bandwidth.
        *   `--framerate 20`: Set target frames per second.
        *   `-n`: No preview window on the Pi's display.
        *   `--codec h264`: Encode using the efficient H.264 codec.
    *   This command will also show logs, indicating it's streaming. **Keep this running.**

## Verification

1.  **Check Terminal Output:** Look at the output from both `./rtsp-simple-server` and `libcamera-vid`. Ensure there are no critical error messages. You should see logs indicating the server is listening and `libcamera-vid` is connected/streaming.
2.  **Test with VLC (Recommended):**
    *   On another computer on the **same network** as the Pi, install and open VLC Media Player.
    *   Go to `Media` -> `Open Network Stream...`.
    *   Enter the **RTSP URL** using the Pi's **actual network IP address** (find using `ip addr` or `hostname -I` on the Pi). For example:
        ```
        rtsp://192.168.1.105:8554/mystream
        ```
        (Replace `192.168.1.105` with your Pi's IP and `mystream` if you changed it).
    *   Click `Play`. If everything is working, you should see the live video feed from the Pi's camera in VLC.
3.  **Configure `app.py`:** Once verified in VLC, use the **same network RTSP URL** (e.g., `rtsp://192.168.1.105:8554/mystream`) for the `VIDEO_SOURCE` variable in your main Flask server's `app.py` file.

## How It Works

1.  **`libcamera-vid`:** Accesses the camera hardware directly using the `libcamera` framework. It captures raw video frames.
2.  **Encoding:** `libcamera-vid` encodes these raw frames into a compressed video format (H.264 in our command). This is much smaller than raw frames or JPEGs.
3.  **Local RTSP Publish:** It connects to the `rtsp-simple-server` running on the *same Pi* (`127.0.0.1`) and uses the RTSP protocol to "publish" or send the encoded H.264 data to the server.
4.  **`rtsp-simple-server`:** This acts as a broker or relay. It listens for incoming video data from `libcamera-vid` on a specific path (`/mystream`). It also listens for incoming *client connection requests* from the network (like your Flask server).
5.  **Client Connection (Flask Server):** Your `app.py` script, via `cv2.VideoCapture("rtsp://<PI_IP>...")`, acts as an RTSP client. It sends commands like `DESCRIBE`, `SETUP`, and `PLAY` to the `rtsp-simple-server` on the Pi using the RTSP protocol.
6.  **Streaming (RTP):** Once the connection is set up, `rtsp-simple-server` takes the H.264 data it's receiving from `libcamera-vid` and streams it over the network to your Flask server, typically using the **RTP** protocol.
7.  **Decoding (Flask Server):** `cv2.VideoCapture` on the server receives the incoming H.264/RTP data and **decodes** it back into raw video frames (like BGR format) that `cap.read()` can return.
8.  **Re-Encoding (Flask Server to Browser):** Your `generate_video_frames` function in `app.py` takes these decoded frames and **re-encodes** them as individual JPEGs to create the MJPEG stream compatible with the `<img>` tag in your web dashboard.

This flow uses an efficient codec (H.264) for the network transfer between the Pi and the server, saving bandwidth compared to sending JPEGs directly. The server then does the final conversion to MJPEG for browser compatibility.