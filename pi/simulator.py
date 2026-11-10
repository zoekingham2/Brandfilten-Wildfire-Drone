import redis
import json

# Anslut till Redis
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def start_simulation_loop():
    print("Simulatorn är startad och väntar på uppdrag...")
    
    while True:
        # BRPOP väntar tills det dyker upp något i "drone_tasks"
        # Det är som att drönaren står och sover tills ett meddelande kommer
        task_data = r.brpop("drone_tasks", timeout=0) 
        
        # task_data[1] innehåller själva JSON-strängen
        task = json.loads(task_data[1])
        
        target_lat = task['lat']
        target_lng = task['lng']
        drone_id = task['id']

        print(f"Mottog order för {drone_id}: Flyg till {target_lat}, {target_lng}")

        # Här anropas befintliga flyglogik
        current_lat, current_lng = get_location() 
        
        run(drone_id, (current_lng, current_lat), (current_lng, current_lat), (target_lng, target_lat), SERVER_URL)
        
        print("Framme vid målet! Väntar på nästa order...")

if __name__ == "__main__":
    SERVER_URL = "http://127.0.0.1:5001/drone"
    
    # Skapa Redis-anslutningen
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)

    print("Simulatorn väntar på uppdrag från Redis...")

    while True:
        task_data = r.brpop("drone_tasks")
        task = json.loads(task_data[1])
        
        print(f"Nytt uppdrag mottaget! Flyger till: {task['lat']}, {task['lng']}")

        # Hämta nuvarande position (från filen coordinates.txt)
        try:
            current_lat, current_long = get_location()
        except:
            # Om filen inte finns, använd en startposition
            current_lat, current_long = 55.7126, 13.2091 

        # Kör flyg-logiken
        run(task['id'], (current_long, current_lat), (current_long, current_lat), (task['lng'], task['lat']), SERVER_URL)
        
        print("Uppdrag slutfört! Väntar på nästa...")
