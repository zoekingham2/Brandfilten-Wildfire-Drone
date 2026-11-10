document.getElementById("map").addEventListener("load", function () {
    console.log("SVG map loaded");
});

// ------------------------------------------------------------
// Load or update a drone marker on the SVG map
// ------------------------------------------------------------
function LoadDrone(droneID, x, y, status) {

    // Get the <object> element that contains the SVG
    var mapObject = document.getElementById("map");

    // Wait until the SVG is fully loaded
    var doc_svg = mapObject.getSVGDocument();
    if (!doc_svg) {
        console.log("SVG not ready yet");
        return;
    }

    // Get the root <svg id="map-svg">
    var svg = doc_svg.getElementById("map-svg");
    if (!svg) {
        console.log("map-svg not found in SVG file");
        return;
    }

    // Try to find an existing drone marker
    var droneNode = doc_svg.getElementById(droneID);

    // Choose color based on status
    var color = (status === "idle") ? "green" : "red";

    // ------------------------------------------------------------
    // Create the drone marker if it doesn't exist
    // ------------------------------------------------------------
    if (!droneNode) {
        droneNode = doc_svg.createElementNS("http://www.w3.org/2000/svg", "circle");
        droneNode.setAttributeNS(null, "id", droneID);
        droneNode.setAttributeNS(null, "r", "5");
        svg.appendChild(droneNode);
    }

    // ------------------------------------------------------------
    // Update the drone marker position + color
    // ------------------------------------------------------------
    droneNode.setAttributeNS(null, "cx", x);
    droneNode.setAttributeNS(null, "cy", y);
    droneNode.setAttributeNS(null, "fill", color);
}
