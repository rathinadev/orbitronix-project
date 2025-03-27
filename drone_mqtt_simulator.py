import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# MQTT Broker Configuration
MQTT_BROKER = "localhost"  # Change this to your base station IP
MQTT_PORT = 1883
MQTT_TOPIC = "drone/sensors"

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)

def generate_sensor_data():
    """ Simulates sensor readings from the drone """
    return {
        "ir_sensor_1": random.randint(0, 1023),
        "co2_ppm": random.randint(0, 1023),
        "ir_sensor_2": random.randint(0, 1023),
        "temperature": round(random.uniform(20.0, 40.0), 2),
        "humidity": round(random.uniform(30.0, 80.0), 2),
        "ultrasonic_distance": round(random.uniform(1.0, 10.0), 2),
        "timestamp": datetime.utcnow().isoformat()
    }

while True:
    sensor_data = generate_sensor_data()
    
    client.publish(MQTT_TOPIC, json.dumps(sensor_data))
    print("📡 Sent:", sensor_data)
    
    time.sleep(1)  # Sending data every 2 seconds
