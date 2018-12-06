package com.SynchroNET.api.resource;

import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
public class GTFSLocation {

	private String location;
	private String latitude;
	private String longitude;
	private String type;
	private String country;
	private String username;
	private String gtfs;
	
	public String getGtfs() {
		return gtfs;
	}
	public void setGtfs(String gtfs) {
		this.gtfs = gtfs;
	}
	public String getUsername() {
		return username;
	}
	public void setUsername(String username) {
		this.username = username;
	}
	public String getType() {
		return type;
	}
	public void setType(String type) {
		this.type = type;
	}
	public String getCountry() {
		return country;
	}
	public void setCountry(String country) {
		this.country = country;
	}
	public String getLocation() {
		return location;
	}
	public void setLocation(String location) {
		this.location = location;
	}
	public String getLatitude() {
		return latitude;
	}
	public void setLatitude(String latitude) {
		this.latitude = latitude;
	}
	public String getLongitude() {
		return longitude;
	}
	public void setLongitude(String longitude) {
		this.longitude = longitude;
	}
	
	
}
