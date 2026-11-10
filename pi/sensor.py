import redis
from sense_hat import SenseHat
import time
from pygame import mixer

# Initiera själva mixern
mixer.init()

alarm_sound = None

# försöker hitta ljudfilen genom sökvägen 
try:
    alarm_sound = mixer.Sound('../webserver/static/audio/Warrrning.mp3')
except Exception as e:
    print("Kunde inte hitta ljudfilen: {e}.")

db_redis = redis.Redis(host="localhost", port=6379, decode_responses=True)
sense = SenseHat()

temp_limit = 45
hum_limit = 70
play_alarm = False

# hämtar och uppdaterar temperatur och luftfuktighets värdena
while True:
    temperature = sense.get_temperature()
    humidity = sense.get_humidity()
    
    if humidity < 0:
        humidity = 0
    if humidity > 100:
        humidity = 100

    db_redis.set("temperature", temperature)
    db_redis.set("humidity", humidity)
    
    alarm_active = temperature >= temp_limit or humidity >= hum_limit
    
    db_redis.set("alarm", int(alarm_active))

    if alarm_active:
        
        # om tenmperaturen/fuktigheten överstiger ett visst värde så tjuter larmet
        if alarm_sound is not None and not play_alarm:
            alarm_sound.play(loops=-1) # -1 betyder att den loopar oavbrutet
            play_alarm = True

    else:
        # Om temperaturen är OK men ljudet fortfarande spelar -> Stoppa!
        if play_alarm:
            alarm_sound.stop()
            play_alarm = False

    time.sleep(0.5)


