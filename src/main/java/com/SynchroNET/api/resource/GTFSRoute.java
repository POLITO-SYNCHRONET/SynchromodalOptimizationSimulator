package com.SynchroNET.api.resource;

import java.util.List;

import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
public class GTFSRoute {
	
	private String routeId;
	private String from;
	private String to;
	private String mode;
	private String agency;
	private List shape;
	private String username;
	private List length;
	private String service;
	private String gtfs;
	
	private boolean singleDate;
	private String arrive;
	private String departure;
	private int arriveDays;
		
	private boolean frequency;
	private String startTime;
	private String endTime;
	private String headway;
	
	public String getRouteId() {
		return routeId;
	}
	public void setRouteId(String routeId) {
		this.routeId = routeId;
	}
	public String getGtfs() {
		return gtfs;
	}
	public void setGtfs(String gtfs) {
		this.gtfs = gtfs;
	}
	public boolean getSingleDate() {
		return singleDate;
	}
	public void setSingleDate(boolean singleDate) {
		this.singleDate = singleDate;
	}
	public int getArriveDays() {
		return arriveDays;
	}
	public void setArriveDays(int arriveDays) {
		this.arriveDays = arriveDays;
	}
	public String getStartTime() {
		return startTime;
	}
	public void setStartTime(String startTime) {
		this.startTime = startTime;
	}
	public String getEndTime() {
		return endTime;
	}
	public void setEndTime(String endTime) {
		this.endTime = endTime;
	}
	public String getHeadway() {
		return headway;
	}
	public void setHeadway(String headway) {
		this.headway = headway;
	}	
	public String getService() {
		return service;
	}
	public void setService(String service) {
		this.service = service;
	}
	public boolean getFrequency() {
		return frequency;
	}
	public void setFrequency(boolean frequency) {
		this.frequency = frequency;
	}
	public String getArrive() {
		return arrive;
	}
	public void setArrive(String arrive) {
		this.arrive = arrive;
	}
	public String getDeparture() {
		return departure;
	}
	public void setDeparture(String departure) {
		this.departure = departure;
	}
	public List getLength() {
		return length;
	}
	public void setLength(List length) {
		this.length = length;
	}
	public String getUsername() {
		return username;
	}
	public void setUsername(String username) {
		this.username = username;
	}
	public String getFrom() {
		return from;
	}
	public void setFrom(String from) {
		this.from = from;
	}
	public String getTo() {
		return to;
	}
	public void setTo(String to) {
		this.to = to;
	}
	public String getMode() {
		return mode;
	}
	public void setMode(String mode) {
		this.mode = mode;
	}
	public String getAgency() {
		return agency;
	}
	public void setAgency(String agency) {
		this.agency = agency;
	}
	public List getShape() {
		return shape;
	}
	public void setShape(List shape) {
		this.shape = shape;
	}
}
