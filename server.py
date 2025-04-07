from flask import Flask, Response, jsonify, render_template
import cv2
from pymongo import MongoClient

app = Flask(__name__)

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["drone_data"]
collection = db["sensor_readings"]

@app.route("/latest")
def get_latest():
    latest_doc = collection.find_one(sort=[("_id", -1)])
    if latest_doc:
        latest_doc["_id"] = str(latest_doc["_id"])
        return jsonify(latest_doc)
    else:
        return jsonify({})  # If no data yet

@app.route('/')
def index():
    return render_template('index.html')


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

