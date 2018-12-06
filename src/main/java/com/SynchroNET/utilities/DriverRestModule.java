package com.SynchroNET.utilities;

import org.onebusaway.gtfs.model.StopTime;

public class DriverRestModule {

	public static void addRestTime(StopTime stopTime){
//    	System.out.println(stopTime.getTrip().getRoute().getShortName() + " " + stopTime.getDepartureTime() + " " + stopTime.getArrivalTime());
    	int time = stopTime.getArrivalTime();
    	double hours = (double) time / 3600;
    	int rest = (int) (hours / 9);
    	int fastBreak = (int) (hours / 4.5) - rest;
//    	if(hours >= 4 )
    	int newTime = time + 45 * 60 * fastBreak + 11 * 3600 * rest;
    	stopTime.setArrivalTime(newTime);
    	stopTime.setDepartureTime(newTime);
    	//System.out.println(stopTime.getTrip().getRoute().getShortName() + " " + hours + " rest=" + rest + " break=" + fastBreak);
	}
	
	public static int addRestTimeSeconds(double hours){
    	int rest = (int) (hours / 9);
    	int fastBreak = (int) (hours / 4.5) - rest;
//    	System.out.println(hours + " rest=" + rest + " break=" + fastBreak);
//    	System.out.println(hours + 45.0 * fastBreak / 60.0 + 11.0 * rest);
    	return (int) ((45.0 * fastBreak / 60.0 + 11.0 * rest) * 3600);
	}
	
}
