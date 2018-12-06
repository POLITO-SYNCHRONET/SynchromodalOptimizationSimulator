package com.SynchroNET.database;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VehicleConfiguration {

	// Edit-Yuanyuan(05/12/2017): to retrieve the configuration from database is faster with just one id
	private int id;
	private String username, configurationName, mode;
	private double speed, costPerKm, CO2PerKm, CO2PerKmSlow, CO2PerKmFast, capacity;
	private int boarding, alighting, boardingRoRo, alightingRoRo;
	private boolean current;
	
	public VehicleConfiguration(){}
	
	public VehicleConfiguration(int id, String username, String configurationName, String mode, double speed, double capacity, double costPerKm,
			double cO2PerKm, double cO2PerKmSlow, double cO2PerKmFast, int boarding, int alighting, int boardingRoRo,
			int alightingRoRo, boolean current) {
		super();
		this.id = id;
		this.username = username;
		this.configurationName = configurationName;
		this.mode = mode;
		this.speed = speed;
		this.capacity = capacity;
		this.costPerKm = costPerKm;
		this.CO2PerKm = cO2PerKm;
		this.CO2PerKmSlow = cO2PerKmSlow;
		this.CO2PerKmFast = cO2PerKmFast;
		this.boarding = boarding;
		this.alighting = alighting;
		this.boardingRoRo = boardingRoRo;
		this.alightingRoRo = alightingRoRo;
		this.current = current;
	}
	
	public int getId() {
		return id;
	}

	public void setId(int id) {
		this.id = id;
	}
	public double getCapacity() {
		return capacity;
	}
	public void setCapacity(double capacity) {
		this.capacity = capacity;
	}
	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getConfigurationName() {
		return configurationName;
	}

	public void setConfigurationName(String configurationName) {
		this.configurationName = configurationName;
	}

	public String getMode() {
		return mode;
	}

	public void setMode(String mode) {
		this.mode = mode;
	}

	public double getSpeed() {
		return speed;
	}

	public void setSpeed(double speed) {
		this.speed = speed;
	}

	public double getCostPerKm() {
		return costPerKm;
	}

	public void setCostPerKm(double costPerKm) {
		this.costPerKm = costPerKm;
	}
	
	public double getCO2PerKm() {
		return CO2PerKm;
	}

	@JsonProperty("CO2PerKm")
	public void setCO2PerKm(double cO2PerKm) {
		CO2PerKm = cO2PerKm;
	}

	public double getCO2PerKmSlow() {
		return CO2PerKmSlow;
	}

	@JsonProperty("CO2PerKmSlow")
	public void setCO2PerKmSlow(double cO2PerKmSlow) {
		CO2PerKmSlow = cO2PerKmSlow;
	}

	public double getCO2PerKmFast() {
		return CO2PerKmFast;
	}

	@JsonProperty("CO2PerKmFast")
	public void setCO2PerKmFast(double cO2PerKmFast) {
		CO2PerKmFast = cO2PerKmFast;
	}

	public int getBoarding() {
		return boarding;
	}

	public void setBoarding(int boarding) {
		this.boarding = boarding;
	}

	public int getAlighting() {
		return alighting;
	}

	public void setAlighting(int alighting) {
		this.alighting = alighting;
	}

	public int getBoardingRoRo() {
		return boardingRoRo;
	}

	public void setBoardingRoRo(int boardingRoRo) {
		this.boardingRoRo = boardingRoRo;
	}

	public int getAlightingRoRo() {
		return alightingRoRo;
	}

	public void setAlightingRoRo(int alightingRoRo) {
		this.alightingRoRo = alightingRoRo;
	}

	public boolean isCurrent() {
		return current;
	}

	public void setCurrent(boolean current) {
		this.current = current;
	}

	@Override
	public String toString() {
		return "VehicleConfiguration [username=" + username + ", configurationName=" + configurationName + ", mode="
				+ mode + ", speed=" + speed + ", costPerKm=" + costPerKm + ", CO2PerKm=" + CO2PerKm + ", CO2PerKmSlow="
				+ CO2PerKmSlow + ", CO2PerKmFast=" + CO2PerKmFast + ", boarding=" + boarding + ", alighting="
				+ alighting + ", boardingRoRo=" + boardingRoRo + ", alightingRoRo=" + alightingRoRo + ", current="
				+ current + "]";
	}
	
}
