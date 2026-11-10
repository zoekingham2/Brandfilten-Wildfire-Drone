from flask import Flask, request, jsonify
from flask_cors import CORS
import redis
import json


app = Flask(__name__)
CORS(app)

# change this to connect to your redis server
# ===============================================
# redis_server = redis.Redis("REDIS_SERVER", decode_responses=True)
redis_server = redis.Redis(host="localhost", port=6379, decode_responses=True)
# ===============================================

@app.route('/drone', methods=['POST'])
def drone():
    drone = request.get_json()
    droneIP = request.remote_addr
    droneID = drone['id']
    drone_longitude = drone['longitude']
    drone_latitude = drone['latitude']
    drone_status = drone['status']
    # Get the infomation of the drone in the request, and update the information in Redis database
    # Data that need to be stored in the database: 
    # Drone ID, logitude of the drone, latitude of the drone, drone's IP address, the status of the drone
    # Note that you need to store the metioned infomation for all drones in Redis, think carefully how to store them
    # =========================================================================================
    redis_server.hset(droneID, mapping={
        'longitude': drone_longitude,
        'latitude': drone_latitude,
        'ip': droneIP,
        'status': drone_status
    })
     # =======================================================================================
    return 'Get data'

# Lägg till detta i din Flask-server (port 5000)
@app.route('/set_target', methods=['POST'])
def set_target():
    data = request.get_json()
    
    # Vi paketerar informationen och lägger den i en Redis-lista (en kö)
    task = {
        "id": data.get("id", "DRONE_2"),
        "lat": data.get("lat"),
        "lng": data.get("lng"),
        "radius": data.get("radius", 50)
    }
    
    # lpush lägger till uppdraget i kön
    redis_server.lpush("drone_tasks", json.dumps(task))
    
    return jsonify({"status": "success", "message": "Uppdrag skickat till Redis"})

if __name__ == "__main__":


    app.run(debug=True, host='0.0.0.0', port='5001')
