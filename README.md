# Brandfilten – Wildfire Monitoring Drone
Brandfilten is a university group project developed by four students at Lund University, exploring how drone technology can assist emergency services with wildfire monitoring.

Project features

The prototype combines interactive map-based drone simulation, live video, temperature and humidity monitoring, and fire alerts displayed through a web interface.

My contributions

I took primary responsibility for the Python programming of the interactive map. I also worked on the HTML-based web interface and contributed to development and Raspberry Pi integration throughout the project.

Technologies

Python · JavaScript · HTML · Raspberry Pi · Git/GitHub

<img width="1323" height="445" alt="bfs" src="https://github.com/user-attachments/assets/aa1dfb94-e94f-437e-b7c7-7336f4912981" />

<img width="1334" height="774" alt="a5bef61a-be8e-4fc8-a70c-f839e21f87b1" src="https://github.com/user-attachments/assets/63cde393-bf18-4af8-b991-165460e29e9e" />
<img width="721" height="509" alt="ba059381-44ab-422d-8222-0fa5b9f30d81" src="https://github.com/user-attachments/assets/8e7e66d6-c950-4438-83be-bdab41a42dc6" />

https://github.com/user-attachments/assets/1f88eff8-9caf-4867-9ce5-e6bebc265401


----------------------------------------------------------------------------------------------------------------------------------------
## On the Server Pi:
Go to `/webserver`, start your Redis server (if it is not already running, which it probably is – test using `redis-cli`) and run the three flask servers that make up the server side of the drone application:

1. Run the server for writing data to the redis server
    ```
    export FLASK_APP=database.py
    export FLASK_DEBUG=1
    flask run --port=5001 --host 0.0.0.0
    ```

## On the Drone Pis:
When the database Flask server is running, start the drone Flask servers on the drone Pis:

2. On each of the drone Pis, go to `/pi`, run `drone.py`
```
export FLASK_APP=drone.py
export FLASK_DEBUG=1
flask run --host 0.0.0.0
```

## On the Server Pi:
3. Open a new terminal, go to `/webserver`, and run the route planner
    ```
    export FLASK_APP=route_planner.py
    export FLASK_DEBUG=1
    flask run --port=5002 --host 0.0.0.0
    ```

4. Open a new terminal, go to `/webserver`,  and run the website server
    ```
    export FLASK_APP=build.py
    export FLASK_DEBUG=1
    flask run --host 0.0.0.0
    ```

5.  Open a web browser (e.g. Chromium) on your Raspberry Pi and enter the following URL. You should see a map of Lund as in the previous assignment. Make sure you see two red dots on top of each other representing the drone at the LTH location.

    ```
    http://localhost:5000
    ```

