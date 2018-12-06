package org.opentripplanner.api.model;

import java.util.ArrayList;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name="itineraries")
@XmlAccessorType(XmlAccessType.FIELD)
public class Itineraries {
	@XmlElement(name="itinerary")
	private List<Itinerary> itineraries = new ArrayList<Itinerary>();
	
	public List<Itinerary> getItineraries() {
		return itineraries;
	}
	public void setItineraries (List<Itinerary> itineraries) {
		this.itineraries = itineraries;
	}
	
	public void addItinerary (Itinerary itinerary) {
		itineraries.add(itinerary);
	}
}
