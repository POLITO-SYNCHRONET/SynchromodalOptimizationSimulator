package com.SynchroNET.api.resource;

import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlSeeAlso;

import org.opentripplanner.api.model.Itinerary;

@XmlRootElement
public class Bookmark {

	// Edit-Yuanyuan(11/12/2017): to retrieve the preferred route from database is faster with just one id
	private int id;
	private String username;
	private Itinerary itinerary;
	private String departure;
	private String arrival;
	
	public int getId() {
		return id;
	}
	public void setId(int id) {
		this.id = id;
	}
	public String getUsername() {
		return username;
	}
	public void setUsername(String username) {
		this.username = username;
	}
	public Itinerary getItinerary() {
		return itinerary;
	}
	public void setItinerary(Itinerary itinerary) {
		this.itinerary = itinerary;
	}
	public String getDeparture() {
		return departure;
	}
	public void setDeparture(String departure) {
		this.departure = departure;
	}
	public String getArrival() {
		return arrival;
	}
	public void setArrival(String arrival) {
		this.arrival = arrival;
	}
}
