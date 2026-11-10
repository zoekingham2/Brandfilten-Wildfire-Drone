let map;
let drone;
let isLoggingAlarm = false; 

// Inställningar för ritläge
let drawMode = false;
let isDrawing = false;
let startPoint = null;
let previewCircle = null;
let patrolCircle = null;
let oldStartPoint = null;
let oldRadius = null;

// Drönarrörelse och rutt
let patrolInterval = null;
let arrivalInterval = null;
let waypoints = [];
let wpIndex = 0;

const SPEED = 0.2;

let fireMarker = null; 
let showSavedArea = false;

// Skapa själva ikonen
const fireIcon = L.icon({
    iconUrl: '/static/images/fir.png', 
    iconSize: [75, 60], 
    iconAnchor: [36, 40],
});

// KOORDINAT-KONFIGURATION 
const mapConfig = {
    topLeft: { lat: 61.01223, lng: 14.44084 },   
    bottomRight: { lat: 60.97735, lng: 14.57560 }, 
    width: 968,  
    height: 768  
};

// INITIERING
document.addEventListener("DOMContentLoaded", function () {
    //  Initiera kartan
    map = L.map("map", {
        crs: L.CRS.Simple,
        minZoom: 0
    });

    const w = 968;
    const h = 768;
    const bounds = [[0, 0], [h, w]];

    L.imageOverlay("/static/images/karta.png", bounds).addTo(map);
    map.fitBounds(bounds);

    //  Skapa drönaren
    drone = L.circleMarker([h * 0.5, w * 0.5], {
        radius: 8,
        color: "green",
        fillColor: "yellow",
        fillOpacity: 1
    }).addTo(map);

    // Uppdatera koordinatvisningen direkt vid start
    updateDroneCoordsDisplay(drone.getLatLng());

    // Koppla knappar
    document.getElementById("draw-btn").onclick = toggleDrawMode;
    document.getElementById("clear-btn").onclick = clearArea;

    //  Kart-events för ritning
    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    //  Starta sensoruppdatering (körs var 0.5:e sekund)
    updateSensorValues(); 
    setInterval(updateSensorValues, 500);

    // Starta area-uppdatering (körs varje sekund)
    updateArea();
    setInterval(updateArea, 1000);
});

// KOORDINAT-LOGIK 
// Omvandlar Leaflet-pixlar till riktiga koordinater (Lat/Lng)
function updateDroneCoordsDisplay(pos) {
    // Beräkna var drönaren är i procent (0.0 till 1.0)
    let latPercent = pos.lat / mapConfig.height;
    let lngPercent = pos.lng / mapConfig.width;

    let realLat = mapConfig.topLeft.lat + (latPercent * (mapConfig.bottomRight.lat - mapConfig.topLeft.lat));
    let realLng = mapConfig.topLeft.lng + (lngPercent * (mapConfig.bottomRight.lng - mapConfig.topLeft.lng));

    const coordsElement = document.getElementById("coords");
    if (coordsElement) {
        coordsElement.innerText = `${realLat.toFixed(5)}, ${realLng.toFixed(5)}`;
    }
}

// RITLÄGE 
function toggleDrawMode() {
    drawMode = !drawMode;
    const btn = document.getElementById("draw-btn");

    if (drawMode) {
        btn.textContent = "Avbryt";
        map.dragging.disable();
        map.getContainer().classList.add("draw-mode");
    } else {
        resetDraw();
    }
}

function resetDraw() {
    drawMode = false;
    map.dragging.enable();
    map.getContainer().classList.remove("draw-mode");

    if (previewCircle) {
        map.removeLayer(previewCircle);
        previewCircle = null;
    }
    document.getElementById("draw-btn").textContent = "Markera område";
}

//  MUS-HÄNDELSER 
function onMouseDown(e) {
    if (!drawMode) return;
    isDrawing = true;
    startPoint = e.latlng;

    if (previewCircle) {
        map.removeLayer(previewCircle);
    }

    previewCircle = L.circle(startPoint, {
        radius: 1,
        color: "blue",
        fillOpacity: 0.15
    }).addTo(map);
}

function onMouseMove(e) {
    if (!isDrawing || !startPoint) return;
    const r = dist(startPoint, e.latlng);
    if (previewCircle) previewCircle.setRadius(r);
}

function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    
    showSavedArea = true;

    radius = dist(startPoint, e.latlng);

    if (previewCircle) {
        map.removeLayer(previewCircle);
        previewCircle = null;
    }

    if (patrolCircle) {
        map.removeLayer(patrolCircle);
    }

    patrolCircle = L.circle(startPoint, {
        radius: radius,
        color: "orange",
        fillOpacity: 0.15
    }).addTo(map);
    
    document.getElementById("clear-btn").style.display = "inline-block";

    resetDraw();

    const payload = {
        latitude: startPoint.lat,
        longitude: startPoint.lng,
        radius: radius
    };

    fetch('http://localhost:5000/area', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(
        response => console.log("Koordinater skickade till Redis-kön")
    ).catch(
        err => console.error("Kunde inte skicka till Redis:", err)
    );

    generatePatrol(startPoint, radius);
}

function dist(a, b) {
    return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
}

//PATRULLERING OCH RÖRELSE
function generatePatrol(center, radius) {
    if (patrolInterval) clearInterval(patrolInterval);
    if (arrivalInterval) clearInterval(arrivalInterval);

    waypoints = [];
    wpIndex = 0;

    let step = Math.max(6, radius / 8);
    for (let y = -radius; y <= radius; y += step) {
        let width = Math.sqrt(Math.max(0, radius * radius - y * y));
        waypoints.push({ lat: center.lat + y, lng: center.lng - width });
        waypoints.push({ lat: center.lat + y, lng: center.lng + width });
    }

    let target = waypoints[0];

    // Flyg till startpositionen
    arrivalInterval = setInterval(() => {
        let pos = drone.getLatLng();
        let dx = target.lat - pos.lat;
        let dy = target.lng - pos.lng;
        let d = Math.sqrt(dx*dx + dy*dy);

        if (d < 2) {
            clearInterval(arrivalInterval);
            arrivalInterval = null;
            startPatrol();
            return;
        }

        moveDrone(pos, dx, dy, d);
    }, 20);
}

function startPatrol() {
    wpIndex = 0;
    patrolInterval = setInterval(() => {
        let target = waypoints[wpIndex];
        let pos = drone.getLatLng();
        let dx = target.lat - pos.lat;
        let dy = target.lng - pos.lng;
        let d = Math.sqrt(dx*dx + dy*dy);

        if (d < 1.5) {
            wpIndex = (wpIndex + 1) % waypoints.length;
            return;
        }

        moveDrone(pos, dx, dy, d);
    }, 20);
}

// Hjälpfunktion för att flytta drönaren och uppdatera koordinaterna samtidigt
function moveDrone(pos, dx, dy, d) {
    let vx = (dx / d) * SPEED;
    let vy = (dy / d) * SPEED;
    let newLatLng = [pos.lat + vx, pos.lng + vy];
    
    drone.setLatLng(newLatLng);
    updateDroneCoordsDisplay(drone.getLatLng()); // Uppdaterar siffrorna i gränssnittet
}
// RENSA OCH ÅTERSTÄLL 

function clearArea() {
    
    showSavedArea = false;
    
    if (patrolInterval) { clearInterval(patrolInterval); patrolInterval = null; }
    if (arrivalInterval) { clearInterval(arrivalInterval); arrivalInterval = null; }

    waypoints = [];
    wpIndex = 0;

    if (patrolCircle) {
        map.removeLayer(patrolCircle);
        patrolCircle = null;
    }
    
    if (fireMarker) {
        map.removeLayer(fireMarker);
        fireMarker = null;
        }

    // Återställ drönaren till mitten
    const h = 768;
    const w = 968;
    drone.setLatLng([h * 0.5, w * 0.5]);
    updateDroneCoordsDisplay(drone.getLatLng());

    document.getElementById("clear-btn").style.display = "none";
    document.getElementById("draw-btn").textContent = "Markera område";

    drawMode = false;
    isDrawing = false;
    startPoint = null;
    if (previewCircle) { map.removeLayer(previewCircle); previewCircle = null; }

    map.dragging.enable();
    map.getContainer().classList.remove("draw-mode");
}

//SENSOR-DATA 
async function updateSensorValues() {
    try {
        // Hämta data från din Python-server
        const response = await fetch('http://localhost:5000/warn');
        const data = await response.json();
        
        // Uppdatera siffrorna i gränssnittet
        document.getElementById("temp").innerText = data.temperature.toFixed(1);
        document.getElementById("hum").innerText = data.humidity.toFixed(1);
        
        
        const warningElement = document.getElementById("fire-warning");

        // LOGIK FÖR BRANDLARM
        if (data.warning) {
            // Visa den blinkande varningsrutan
            warningElement.style.display = "block";

            // Om vi inte redan har markerat en brand på kartan...
            if (!fireMarker) {
                const dronePos = drone.getLatLng(); // Hämta var drönaren är JUST NU
                
                // Rita ut eld-ikonen på kartan
                fireMarker = L.marker(dronePos, {icon: fireIcon}).addTo(map);
                
                // Lägg till händelsen i logglistan
                addToLog(`BRAND DETEKTERAD! Temp: ${data.temperature.toFixed(1)}°C. Pos: ${dronePos.lat.toFixed(2)}, ${dronePos.lng.toFixed(2)}`);
                
            }
        } 
        //  ÅTERSTÄLLNING (Om temperaturen sjunkit under gränsen)
        else {
            // Dölj varningsrutan
            warningElement.style.display = "none";
            
            // Om det fanns en eld-ikon, ta bort den och logga att det är säkert
            if (fireMarker) {
//                map.removeLayer(fireMarker);
                fireMarker = null;
                
                addToLog("Status: Miljön har svalnat.");
                console.log("Larm avaktiverat/*: Eld-ikon borttagen*/.");
            }
        }
        
        // Debug-logg i webbläsarkonsolen
        console.log("Sensoruppdatering:", data);

    } catch (error) {
        console.error("Kunde inte hämta data från sensorn:", error);
    }
}



async function updateArea() {
    if (!showSavedArea) return;
    
    try {
        const response = await fetch('http://localhost:5000/area');
        const data = await response.json();
        
        if (!data || data.latitude == null) {
            return;
        }
        
        var latlng = L.latLng(data.latitude, data.longitude);
        
        if (oldStartPoint != latlng || oldRadius != data.radius) {
            if (patrolCircle) {
                map.removeLayer(patrolCircle);
            }
        
            oldStartPoint = latlng;
            oldRadius = data.radius;
        
            patrolCircle = L.circle(latlng, {
                radius: data.radius,
                color: "orange",
                fillOpacity: 0.15
            }).addTo(map);
        }
    } catch (error) {
        console.error("Kunde inte hämta data från area:", error);
    }
}

/**
 * Hjälpfunktion för att skriva händelser till logglistan i HTML
 */
function addToLog(message) {
    const logList = document.getElementById("event-log");
    if (!logList) return;

    // Ta bort "Inga händelser"-texten om den finns kvar
    const placeholder = logList.querySelector(".log-placeholder");
    if (placeholder) placeholder.remove();

    // Skapa tidsstämpel (HH:MM:SS)
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    // Skapa ett nytt list-element
    const li = document.createElement("li");
    li.innerHTML = `<strong>[${timeStr}]</strong> ${message}`;
    
    // Om meddelandet innehåller "BRAND", lägg till en CSS-klass för röd färg
    if (message.includes("BRAND")) {
        li.className = "log-alert";
    }

    // Lägg till högst upp i listan (nyast först)
    logList.insertBefore(li, logList.firstChild);
}
