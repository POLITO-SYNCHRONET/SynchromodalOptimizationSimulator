package com.SynchroNET.database;

//Shuai(27-03-2018)
public class RoutesConfiguration {

	private int id;
	private String username, configurationName, bannedRoutes, forcedRoutes, passBy, bannedStops;
	private boolean current;
	
	public RoutesConfiguration(){}
	
	public int getId() {
		return id;
	}

	public void setId(int id) {
		this.id = id;
	}
	
	public boolean isCurrent() {
		return current;
	}

	public void setCurrent(boolean current) {
		this.current = current;
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

	public String getBannedRoutes() {
		return bannedRoutes;
	}

	public void setBannedRotues(String bannedRoutes) {
		this.bannedRoutes = bannedRoutes;
	}

	public String getForcedRoutes() {
		return forcedRoutes;
	}

	public void setForcedRoutes(String forcedRoutes) {
		this.forcedRoutes = forcedRoutes;
	}

	public String getPassBy() {
		return passBy;
	}

	public void setPassBy(String passBy) {
		this.passBy = passBy;
	}

	public String getBannedStops() {
		return bannedStops;
	}

	public void setBannedStops(String bannedStops) {
		this.bannedStops = bannedStops;
	}
}
