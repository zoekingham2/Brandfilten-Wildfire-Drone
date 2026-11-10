from cmath import pi
from flask import Flask, request, render_template, jsonify
from flask.globals import current_app 
from geopy.geocoders import Nominatim
from flask_cors import CORS
import redis
import json
import requests

# initiera flask appen
app = Flask(__name__)

# # Aktivera CORS så att frontend kan prata med denna API
CORS(app, supports_credentials=True)
app.secret_key = 'dljsaklqk24e21cjn!Ew@@dsa5'

redis_server = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Verktyg för att omvandla textadresser till koordinater
geolocator = Nominatim(user_agent="my_request")

# En fast sträng som läggs till för att begränsa sökningen till Lund/Skåne
region = ", Lund, Skåne, Sweden" # ändra senare!!!

# Example to send coords as request to the drone
def send_request(drone_url, coords):
    with requests.Session() as session:
        resp = session.post(drone_url, json=coords)

# API-endpoint för att planera en rutt
@app.route('/planner', methods=['POST'])
def route_planner():

    # Ta emot och tolka JSON-data från användarens anrop
    Addresses =  json.loads(request.data.decode())
    FromAddress = Addresses['faddr']
    ToAddress = Addresses['taddr']

    # Omvandla textadresserna till geografiska koordinater via Nominatim
    from_location = geolocator.geocode(FromAddress + region, timeout=None)
    to_location = geolocator.geocode(ToAddress + region, timeout=None)

    # Felhantering om adresserna inte hittas
    if from_location is None:
        message = 'Departure address not found, please input a correct address'
        return message
    elif to_location is None:
        message = 'Destination address not found, please input a correct address'
        return message
    else:
        # If the coodinates are found by Nominatim, the coords will need to be sent the a drone that is available
        coords = {'from': (from_location.longitude, from_location.latitude),
                  'to': (to_location.longitude, to_location.latitude),
                  }

        # Hitta en ledig drönare i Redis-databasen genom att leta efter alla nycklar som börjar på "DRONE"
        drone_keys = redis_server.keys("DRONE*")
        target_drone_ip = None
        
        for key in drone_keys:
            # Hämta all info om drönaren
            drone_data = redis_server.hgetall(key)

            # Kontrollera om drönaren är ledig
            if drone_data.get('status') == 'idle':
                target_drone_ip = drone_data.get('ip')
                break
        # Om ingen drönare var ledig, meddela användaren
        if target_drone_ip is None:
            return 'No available drone, try later'
            # Get the IP of available drone, 
        DRONE_URL = 'http://' + target_drone_ip +':5000'
            # Send coords to the URL of available drone
        send_request(DRONE_URL, coords)
        return 'Got address and sent request to the drone'


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port='5002')
