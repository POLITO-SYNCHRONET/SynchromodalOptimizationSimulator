package org.opentripplanner.api.model;

public class PlaceP {
    public String name = null;
    public String stopCode = null;

    /**
     * The longitude of the place.
     */
    public Double lon = null;
    
    /**
     * The latitude of the place.
     */
    public Double lat = null;
    
    public PlaceP() {
    }

    public PlaceP(Double lon, Double lat, String name) {
        this.lon = lon;
        this.lat = lat;
        this.name = name;
    }
}


