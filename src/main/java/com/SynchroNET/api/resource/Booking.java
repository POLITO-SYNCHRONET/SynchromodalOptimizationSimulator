package com.SynchroNET.api.resource;

import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
public class Booking {
	
	// Edit-Yuanyuan(07/12/2017): to retrieve the previous route from database is faster with just one id
	private int id;
	private String username;
	private String departure;
	private String arrival;
	private String vertices;
	
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
	public String getVertices() {
		return vertices;
	}
	public void setVertices(String vertices) {
		this.vertices = vertices;
	}	
}
