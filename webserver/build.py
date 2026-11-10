from os import fdopen
from flask import Flask, render_template, request, Response
from flask.json import jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import time
import redis
import pickle
import json
import sys
import os
sys.path.append(os.path.abspath('../pi'))  
from camera import get_frame

app = Flask(__name__) #startar webservern
CORS(app) #frontend pratar med servern
app.secret_key = 'dljsaklqk24e21cjn!Ew@@dsa5'

redis_server = redis.Redis(host="localhost", port=6379, decode_responses=True) #kopplar till databasen

#översätter OSM koordinater (longitude, latitude) till SVG koordinater (x,y).
def translate(coords_osm):
    x_osm_lim = (13.143390664, 13.257501336)
    y_osm_lim = (55.678138854000004, 55.734680845999996)

    x_svg_lim = (212.155699, 968.644301)
    y_svg_lim = (103.68, 768.96)

    x_osm = coords_osm[0]
    y_osm = coords_osm[1]

    x_ratio = (x_svg_lim[1] - x_svg_lim[0]) / (x_osm_lim[1] - x_osm_lim[0])
    y_ratio = (y_svg_lim[1] - y_svg_lim[0]) / (y_osm_lim[1] - y_osm_lim[0])
    x_svg = x_ratio * (x_osm - x_osm_lim[0]) + x_svg_lim[0]
    y_svg = y_ratio * (y_osm_lim[1] - y_osm) + y_svg_lim[0]

    return x_svg, y_svg


#Hämtar bilderna från kameran
def generate_frames():
    while True:
        frame = get_frame()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


#Hämtar temperatur och luftfuktighet från redisservern
def get_sensor_values():
    temperature = redis_server.get("temperature")
    humidity = redis_server.get("humidity")

    try:
        temperature = float(temperature)
    except:
        temperature = 0
        
    try:
        humidity = float(humidity)
    except:
        humidity = 0

    return temperature, humidity


#Gör att vi kan komma åt temperaturen till hemsidan
@app.route('/', methods=['GET'])
def map():
    temperature, humidity = get_sensor_values()
    return render_template('index.html', temperature=temperature, humidity=humidity)


#Gör att vi kan komma åt videon till hemsidan
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/area', methods=['POST'])
def post_area():
    data = request.json

    radius = data['radius']
    longitude = data['longitude']
    latitude = data['latitude']

    redis_server.hset(
        "AREA",
        mapping={
            'radius': radius,
            'longitude': longitude,
            'latitude': latitude,
        }
    )


@app.route('/area', methods=['GET'])
def get_area():
    data = redis_server.hgetall("AREA")

    return jsonify({
        'radius': float(data['radius']),
        'longitude': float(data['longitude']),
        'latitude': float(data['latitude'])
    })


#Hämtar alla drönare från redis, konverterar koordinater och skickar till JSON(för att kommunicera med frontend)
@app.route('/get_drones', methods=['GET'])
def get_drones():
    drone_dict = {}
    
    drone_keys = redis_server.keys("DRONE*")
    
    for drone_id in drone_keys:
        
        data = redis_server.hgetall(drone_id)
        
        if data:
            
            long = float(data['longitude'])
            lat = float(data['latitude'])
            status = data['status']
            
            svg_long, svg_lat = translate((long, lat))
            
            drone_dict[drone_id] = {
                'longitude': svg_long,
                'latitude': svg_lat,
                'status': status
                }
    return jsonify(drone_dict)

#Hämtar temperatur och skickar till json
@app.route('/get_sensor_data', methods=['GET'])
def get_sensor_data():
    temperature, humidity = get_sensor_values()

    return jsonify({
        "temperature": round(temperature, 1),
        "humidity": round(humidity, 1)
    })

#Skickar en varning om temperatur och lufftfuktighet överskrider en viss grad
@app.route('/warn', methods=['GET'])
def warn():
    temperature, humidity = get_sensor_values()

    temp_limit = 45
    hum_limit = 70

    warning = temperature >= temp_limit or humidity > hum_limit

    return jsonify({
        "temperature": temperature,
        "humidity": humidity,
        "warning": warning
    })

#Startar servern
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port='5000')
