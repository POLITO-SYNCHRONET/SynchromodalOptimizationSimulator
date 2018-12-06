package com.SynchroNET.api.resource;

public class UserExperience {

	private String slocation;
	private String elocation;
	private String dateTime;
	private String serviceProvider;
	private String reason;
	private String summary;
	private String[] type;
	private String incidentPlace;
	private String transportation;
	
	public String getIncidentPlace() {
		return incidentPlace;
	}

	public void setIncidentPlace(String incidentPlace) {
		this.incidentPlace = incidentPlace;
	}

	public String getTransportation() {
		return transportation;
	}

	public void setTransportation(String transportation) {
		this.transportation = transportation;
	}

	public String[] getType() {
		return type;
	}

	public void setType(String[] type) {
		this.type = type;
	}

	public String getDateTime() {
		return dateTime;
	}

	public void setDateTime(String dateTime) {
		this.dateTime = dateTime;
	}

	public String getServiceProvider() {
		return serviceProvider;
	}

	public void setServiceProvider(String serviceProvider) {
		this.serviceProvider = serviceProvider;
	}

	public String getReason() {
		return reason;
	}

	public void setReason(String reason) {
		this.reason = reason;
	}

	public String getSummary() {
		return summary;
	}

	public void setSummary(String summary) {
		this.summary = summary;
	}
	
	public String getSLocation() {
		return slocation;
	}

	public void setSLocation(String sLocation) {
		this.slocation = sLocation;
	}

	public String getELocation() {
		return elocation;
	}

	public void setELocation(String eLocation) {
		this.elocation = eLocation;
	}
	
}
