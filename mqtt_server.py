import paho.mqtt.client as mqtt
from pymongo import MongoClient
import json

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["drone_data"]
collection = db["sensor_readings"]

# MQTT Configuration
MQTT_BROKER = "localhost"  # Change to your broker IP
MQTT_PORT = 1883
MQTT_TOPIC = "drone/sensors"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT Broker with result code {rc}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        collection.insert_one(payload)
        print("Data stored:", payload)
    
    except Exception as e:
        print("Error processing message:", e)

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()
