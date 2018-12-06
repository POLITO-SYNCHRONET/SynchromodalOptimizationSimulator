package com.SynchroNET.utilities;

import java.util.List;

import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.api.model.TripPlan;
import org.opentripplanner.routing.core.TraverseMode;

public class CostCalculator {

	private static final double truckX1 = 1.0147;
	private static final double truckX2 = 1.687;
	private static final double truckX3 = 0.0113;

	private static final double railX1 = 0;
	private static final double railX2 = 0.7382;
	private static final double railX3 = 0.5768;
	private static final double railX4 = 0.0968;
	
	public static void calculateRealCosts(TripPlan plan){
		
		List<Itinerary> itineraries = plan.itinerary;
		
		for(Itinerary itinerary : itineraries) {
			calculateItineraryCosts(itinerary);
		}
		
	}
	
	public static void calculateItineraryCosts(Itinerary itinerary){
		
		List<Leg> legs = itinerary.legs;
				
		itinerary.totalcost = 0.0;
		itinerary.totalcostTRUCK = 0.0;
		itinerary.totalcostTRAIN = 0.0;
		itinerary.totalcostSHIP = 0.0;
		
		for(Leg leg : legs){
			if(leg.mode.equals(TraverseMode.BUS.toString())){
				leg.totalcost = calculateTruckLegCost(leg);
				itinerary.totalcost += leg.totalcost;
				itinerary.totalcostTRUCK += leg.totalcost;
//				System.out.println(leg.tripId.toString() + " " + leg.totalcost);
			} else if(leg.mode.equals(TraverseMode.RAIL.toString())){
				leg.totalcost = calculateRailLegCost(leg);
				itinerary.totalcost += leg.totalcost;
				itinerary.totalcostTRAIN += leg.totalcost;
//				System.out.println(leg.tripId.toString() + " " + leg.totalcost);
			} else if(leg.mode.equals(TraverseMode.FERRY.toString())){
				leg.totalcost = calculateShipLegCost(leg);
				itinerary.totalcost += leg.totalcost;
				itinerary.totalcostSHIP += leg.totalcost;
//				System.out.println(leg.tripId.toString() + " " + leg.totalcost);
			}
		}
//		System.out.println("Total Cost: " + itinerary.totalcost);
//		System.out.println();
	}
	
	private static double calculateTruckLegCost(Leg leg){
		double km = leg.distance / 1000;
		if(km <= 0) km = 1;
		double costKm = truckX1 + truckX2 * Math.pow(Math.E, - truckX3 * km);
		return costKm * km * leg.assignedcontainers;
	}
	
	private static double calculateRailLegCost(Leg leg){
		double km = leg.distance / 1000;
		if(km <= 0) km = 1;
		double costContainer = (railX1 + railX2 * km) * (1 + railX3 * Math.pow(Math.E, - railX4 * leg.assignedcontainers));
		return costContainer * leg.assignedcontainers;	
	}
	
	private static double calculateShipLegCost(Leg leg){
		return calculateRailLegCost(leg);
	}
	
}
