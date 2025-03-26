from flask import Flask, render_template
from flask_socketio import SocketIO
import paho.mqtt.client as mqtt
import json

app = Flask(__name__,static_folder='static')
socketio = SocketIO(app, cors_allowed_origins="*")  # Allow frontend connections

BROKER_IP = "192.168.1.100"  # Laptop/Base Station IP
TOPIC = "drone/sensors"

# MQTT Callback - When a message is received
def on_message(client, userdata, msg):
    sensor_data = msg.payload.decode()
    print(f"Forwarding: {sensor_data}")
    
    # Emit data to frontend (WebSockets)
    socketio.emit("sensor_update", sensor_data)

# Setup MQTT
mqtt_client = mqtt.Client()
mqtt_client.on_message = on_message
mqtt_client.connect(BROKER_IP, 1883, 60)
mqtt_client.subscribe(TOPIC)
mqtt_client.loop_start()  # Run MQTT listener in the background

@app.route("/")
def index():
    return render_template("index.html")

# Start Flask with WebSockets
if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0")  # Host on local network
