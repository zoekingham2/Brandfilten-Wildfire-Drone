from picamera2 import Picamera2
import cv2

camera = None  

#Startar kameran
def init_camera():
    global camera #global gör att variablen utanför funktionen används
    if camera is None:
        camera = Picamera2()
        camera.configure(camera.create_preview_configuration(main={"size": (640, 480)}))
        camera.start()

#Tar in bilderna från kameran och sparar
def get_frame():
    global camera
    if camera is None: #om kameran inte är startad så starta den
        init_camera()
    frame = camera.capture_array() #samlar bilderna från kameran i en array
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB) #styr färger
    _, buffer = cv2.imencode('.jpg', frame_rgb) #gör om bilder till en jpg
    return buffer.tobytes()
