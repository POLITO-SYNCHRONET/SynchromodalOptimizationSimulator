package com.SynchroNET.utilities;

import org.onebusaway.gtfs.model.Stop;
import org.onebusaway.gtfs.model.Trip;
import org.opentripplanner.gtfs.GtfsLibrary;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.TraverseMode;

public class GTFSExtraDataManager {
	//Riccardo (31-05-2017): manage the extra data in the GTFS
	
	
	public static int getBoardingTime(Trip trip, RoutingRequest request){
		int boardingTime = 0;
		String key = "boarding";
		
		if(trip != null){
			if(trip.getTripHeadsign() != null && trip.getTripHeadsign().contains(key)){
				String[] extraData = trip.getTripHeadsign().split(";");
				
				for(int i = 0; i < extraData.length; i++){
					
					if(extraData[i].contains(key)) {
						boardingTime = Integer.parseInt(extraData[i].split(":")[1]);
						break;
					}
					
				}
				
			} else {
				boardingTime = getDefaultBoardingTimeByMode(trip, request);
			}
		}
		
		
		return boardingTime;
	}

	public static int getAlightingTime(Trip trip, RoutingRequest request){
		int alightingTime = 0;

		String key = "alighting";
		
		if(trip != null){
			if(trip.getTripHeadsign() != null && trip.getTripHeadsign().contains(key)){
				String[] extraData = trip.getTripHeadsign().split(";");
				
				for(int i = 0; i < extraData.length; i++){
					
					if(extraData[i].contains(key)) {
						alightingTime = Integer.parseInt(extraData[i].split(":")[1]);
						break;
					}
					
				}
			} else {
				alightingTime = getDefaultAlightingTimeByMode(trip, request);
			}
		}
		
		return alightingTime;
	}
	
	public static int getTransitTime(Trip trip, Trip previousTrip, RoutingRequest request){
		int transitTime = 0;
		
		if(trip == null || previousTrip == null) return 0;
		
		//Riccardo make change between trucks super expensive to avoid it when it is possible
//		TraverseMode mode = GtfsLibrary.getTraverseMode(trip.getRoute());
//		TraverseMode previousMode = GtfsLibrary.getTraverseMode(previousTrip.getRoute());
//		if(mode.equals(previousMode) && mode.equals(TraverseMode.BUS)) return 360000;
		
		String key = "alighting";
			
		if(previousTrip.getTripHeadsign() != null && previousTrip.getTripHeadsign().contains(key)){

			String[] extraData = previousTrip.getTripHeadsign().split(";");

			for(int i = 0; i < extraData.length; i++){
				if(extraData[i].contains(key)) {
					transitTime += Integer.parseInt(extraData[i].split(":")[1]);
					break;
				}
				
			}
			
		} else {
			transitTime += getDefaultAlightingTimeByMode(previousTrip, request);
		}
		
		key = "boarding";
		if(trip.getTripHeadsign() != null && trip.getTripHeadsign().contains(key)){

			String[] extraData = trip.getTripHeadsign().split(";");

			for(int i = 0; i < extraData.length; i++){
				if(extraData[i].contains(key)) {
					transitTime += Integer.parseInt(extraData[i].split(":")[1]);
					break;
				}
				
			}
			
		} else {
			transitTime += getDefaultBoardingTimeByMode(trip, request);
		}
		return transitTime;
	}
	
	private static int getDefaultAlightingTimeByMode(Trip trip, RoutingRequest request){
		TraverseMode mode = GtfsLibrary.getTraverseMode(trip.getRoute());
		int transitTime = 0;
		
		if(mode.equals(TraverseMode.BUS)){
			transitTime = request.alighting_time_truck;
		} else if(mode.equals(TraverseMode.RAIL)) {
			transitTime = request.alighting_time_rail;
		} else if(mode.equals(TraverseMode.FERRY)) {
			if(trip.getId().toString().contains("RORO")){
				transitTime = request.alighting_time_ship_roro;
			} else {
				transitTime = request.alighting_time_ship_lolo;
			}
		}
		
		return transitTime;
	}
	
	private static int getDefaultBoardingTimeByMode(Trip trip, RoutingRequest request){
		TraverseMode mode = GtfsLibrary.getTraverseMode(trip.getRoute());
		int transitTime = 0;
		
		if(mode.equals(TraverseMode.BUS)){
			transitTime = request.boarding_time_truck;
		} else if(mode.equals(TraverseMode.RAIL)) {
			transitTime = request.boarding_time_rail;
		} else if(mode.equals(TraverseMode.FERRY)) {
			if(trip.getId().toString().contains("RORO")){
				transitTime = request.boarding_time_ship_roro;
			} else {
				transitTime = request.boarding_time_ship_lolo;
			}
		}
		
		return transitTime;
	}
	
	public static int getEmission(Trip trip, RoutingRequest request){
		String key = "emission";
		int emission = -1;

		String gtfsExtra = trip.getTripHeadsign();

		if(gtfsExtra != null && gtfsExtra.contains(key)){
			String[] extraData = gtfsExtra.split(";");

			for(int i = 0; i < extraData.length; i++){

				if(extraData[i].contains(key)) {
					emission = Integer.parseInt(extraData[i].split(":")[1]);
					break;
				}
				
			}
		}
		
		return emission;
		
	}
	
	public static int getCost(Trip trip, RoutingRequest request){
		String key = "cost";
		int cost = -1;

		String gtfsExtra = trip.getTripHeadsign();

		if(gtfsExtra != null && gtfsExtra.contains(key)){
			String[] extraData = gtfsExtra.split(";");

			for(int i = 0; i < extraData.length; i++){

				if(extraData[i].contains(key)) {
					cost = Integer.parseInt(extraData[i].split(":")[1]);
					break;
				}
				
			}
		}
		
		return cost;
		
	}
	
	public static String getSteaming(Trip trip, RoutingRequest request){
		String key = "steaming";
		String steaming = "medium";

		String gtfsExtra = trip.getTripHeadsign();

		if(gtfsExtra != null && gtfsExtra.contains(key)){
			String[] extraData = gtfsExtra.split(";");

			for(int i = 0; i < extraData.length; i++){

				if(extraData[i].contains(key)) {
					steaming = extraData[i].split(":")[1];
					break;
				}
				
			}
		}
		
		return steaming;
		
	}
	
	public static String getBoardingType(Trip trip, RoutingRequest request){
		TraverseMode mode = GtfsLibrary.getTraverseMode(trip.getRoute());
		if(!mode.equals(TraverseMode.FERRY)) return null;
		String key = "boardingType";
		String boardingType = "lolo";
		String gtfsExtra = trip.getTripHeadsign();

		if(gtfsExtra != null && gtfsExtra.contains(key)){
			String[] extraData = gtfsExtra.split(";");

			for(int i = 0; i < extraData.length; i++){

				if(extraData[i].contains(key)) {
					boardingType = extraData[i].split(":")[1];
					break;
				}
				
			}
		}
		
		return boardingType;
	}
	
//	Giovanni: capacity method, TODO: read form GTFS, now it is standard
	public static int getCapacity(Trip trip, RoutingRequest request) {
		int capacity = -1;
		
		String key = "capacity";

		String gtfsExtra = trip.getTripHeadsign();
		if(gtfsExtra != null && gtfsExtra.contains(key)){
			String[] extraData = gtfsExtra.split(";");

			for(int i = 0; i < extraData.length; i++){

				if(extraData[i].contains(key)) {
					capacity = Integer.parseInt(extraData[i].split(":")[1]);
					break;
				}
				
			}
		}
		
		if(capacity < 0) capacity = getDefaultCapacity(trip, request);
		
		return capacity;
	}
	
	private static int getDefaultCapacity(Trip trip, RoutingRequest request){
		int capacity = 0;
		
		TraverseMode mode = GtfsLibrary.getTraverseMode(trip.getRoute());
		if (mode.equals(TraverseMode.BUS))
			capacity = 1;
		else if (mode.equals(TraverseMode.RAIL)) 
			capacity = request.capacity_rail;
		else if (mode.equals(TraverseMode.FERRY)) 
			capacity = request.capacity_feeder_ship;
		
		return capacity;
	}
	
	public static int getDefaultCapacity(TraverseMode mode, RoutingRequest request){
		int capacity = 0;
		
		if (mode.equals(TraverseMode.BUS))
			capacity = 1;
		else if (mode.equals(TraverseMode.RAIL)) 
			capacity = request.capacity_rail;
		else if (mode.equals(TraverseMode.FERRY)) 
			capacity = request.capacity_feeder_ship;
		
		return capacity;
	}
// END giovanni
}
