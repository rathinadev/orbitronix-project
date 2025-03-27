import paho.mqtt.client as mqtt
import json
import time
import datetime
import Adafruit_DHT
import random

# MQTT Configuration
MQTT_BROKER = "your_broker_ip"  # Change to your base station IP
MQTT_PORT = 1883
MQTT_TOPIC = "drone/sensors"

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)

# Simulated sensor read function (Replace with actual GPIO code)
def read_sensors():
    ir_sensor_1 = random.randint(0, 1023)  # Replace with actual IR sensor GPIO reading
    ir_sensor_2 = random.randint(0, 1023)
    
    humidity, temperature = Adafruit_DHT.read_retry(Adafruit_DHT.DHT11, 4)  # GPIO pin 4
    
    ultrasonic_distance = round(random.uniform(1.0, 5.0), 2)  # Replace with actual ultrasonic sensor reading
    
    return {
        "ir_sensor_1": ir_sensor_1,
        "ir_sensor_2": ir_sensor_2,
        "temperature": temperature,
        "humidity": humidity,
        "ultrasonic_distance": ultrasonic_distance,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

while True:
    sensor_data = read_sensors()
    
    client.publish(MQTT_TOPIC, json.dumps(sensor_data))
    print("Published:", sensor_data)
    
    time.sleep(2)  # Adjust sampling rate as needed
