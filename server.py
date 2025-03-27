from flask import Flask, jsonify,render_template
from pymongo import MongoClient

app = Flask(__name__)

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["drone_data"]
collection = db["sensor_readings"]

@app.route("/latest")
def get_latest():
    # Find the most recent document
    latest_doc = collection.find_one(sort=[("_id", -1)])
    if latest_doc:
        # Convert ObjectId to string to avoid JSON issues
        latest_doc["_id"] = str(latest_doc["_id"])
        return jsonify(latest_doc)
    else:
        return jsonify({})  # If no data yet

# Serve the HTML page
@app.route('/')
def index():
    return render_template('index.html')


if __name__ == "__main__":
    # Run on port 5000 by default
    app.run(debug=True, host="0.0.0.0", port=5000)
