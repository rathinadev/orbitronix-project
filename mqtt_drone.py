import paho.mqtt.client as mqtt
import time
import random  # Simulating sensor data

BROKER_IP = "192.168.1.100"  # Change to your laptop/base station IP
TOPIC = "drone/sensors"

# Connect to MQTT Broker
client = mqtt.Client()
client.connect(BROKER_IP, 1883, 60)

while True:
    sensor_data = {
        "temperature": round(random.uniform(20, 35), 2),
        "gas_level": round(random.uniform(0, 100), 2),
        "altitude": round(random.uniform(100, 500), 2),
    }

    client.publish(TOPIC, str(sensor_data))
    print(f"Published: {sensor_data}")
    time.sleep(1)  # Send data every second
