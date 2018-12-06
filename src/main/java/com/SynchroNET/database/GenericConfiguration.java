package com.SynchroNET.database;

import com.fasterxml.jackson.annotation.JsonProperty;

public class GenericConfiguration {

	// Edit-Yuanyuan(05/12/2017): to retrieve the configuration from database is faster with just one id
	private int id; 
	private String username, configurationName;
	private double costPerHour, costPerKgCO2, KPICO2, KPIDistance, KPITime, KRITime, KRISafety, KRICost, KRIFlexibility;
	private int transfer;
	private boolean current;
	
	public GenericConfiguration(){
	}
	
	public GenericConfiguration(int id, String username, String configurationName, double costPerHour, double costPerKgCO2,
			double kPICO2, double kPIDistance, double kPITime, double KRITime, double KRISafety, double KRICost,
			double KRIFlexibility, int transfer, boolean current) {
		this.id = id;
		this.username = username;
		this.configurationName = configurationName;
		this.costPerHour = costPerHour;
		this.costPerKgCO2 = costPerKgCO2;
		this.KPICO2 = kPICO2;
		this.KPIDistance = kPIDistance;
		this.KPITime = kPITime;
		this.transfer = transfer;
		this.current = current;
		this.KRISafety = KRISafety;
		this.KRICost = KRICost;
		this.KRIFlexibility = KRIFlexibility;
		this.KRITime = KRITime;
	}
	public int getId() {
		return id;
	}

	public void setId(int id) {
		this.id = id;
	}

	public double getKRITime() {
		return KRITime;
	}

	@JsonProperty("KRITime")
	public void setKRITime(double kRITime) {
		KRITime = kRITime;
	}

	public double getKRISafety() {
		return KRISafety;
	}

	@JsonProperty("KRISafety")
	public void setKRISafety(double kRISafety) {
		KRISafety = kRISafety;
	}

	public double getKRICost() {
		return KRICost;
	}

	@JsonProperty("KRICost")
	public void setKRICost(double kRICost) {
		KRICost = kRICost;
	}

	public double getKRIFlexibility() {
		return KRIFlexibility;
	}

	@JsonProperty("KRIFlexibility")
	public void setKRIFlexibility(double kRIFlexibility) {
		KRIFlexibility = kRIFlexibility;
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

	public double getCostPerHour() {
		return costPerHour;
	}

	public void setCostPerHour(double costPerHour) {
		this.costPerHour = costPerHour;
	}

	public double getCostPerKgCO2() {
		return costPerKgCO2;
	}

	public void setCostPerKgCO2(double costPerKgCO2) {
		this.costPerKgCO2 = costPerKgCO2;
	}

	public double getKPICO2() {
		return KPICO2;
	}

	@JsonProperty("KPICO2")
	public void setKPICO2(double kPICO2) {
		this.KPICO2 = kPICO2;
	}

	public double getKPIDistance() {
		return KPIDistance;
	}

	@JsonProperty("KPIDistance")
	public void setKPIDistance(double kPIDistance) {
		KPIDistance = kPIDistance;
	}
	
	public double getKPITime() {
		return KPITime;
	}

	@JsonProperty("KPITime")
	public void setKPITime(double kPITime) {
		KPITime = kPITime;
	}

	public int getTransfer() {
		return transfer;
	}

	public void setTransfer(int transfer) {
		this.transfer = transfer;
	}

	public boolean isCurrent() {
		return current;
	}

	public void setCurrent(boolean current) {
		this.current = current;
	}

	@Override
	public String toString() {
		return "GenericConfiguration [username=" + username + ", configurationName=" + configurationName
				+ ", costPerHour=" + costPerHour + ", costPerKgCO2=" + costPerKgCO2 + ", KPICO2=" + KPICO2
				+ ", KPIDistance=" + KPIDistance + ", KPITime=" + KPITime + ", transfer=" + transfer + ", current="
				+ current + "]";
	}

}
