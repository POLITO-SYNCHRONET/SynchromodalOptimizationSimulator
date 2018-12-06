package com.SynchroNET.utilities;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.opentripplanner.api.common.ParameterException;
import org.opentripplanner.api.common.RoutingResource;
import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.api.model.TripPlan;
import org.opentripplanner.api.resource.GraphPathToTripPlanConverter;
import org.opentripplanner.api.resource.PlannerResource;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.routing.spt.GraphPath;
import org.opentripplanner.standalone.OTPServer;
import org.opentripplanner.standalone.Router;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.routing.impl.SynchroGraphPathFinder;

public class SpecialRouteFinder extends RoutingResource{
	
	//Riccardo (10-07-2017): class used to recalculate itinerary
	private static final Logger LOG = LoggerFactory.getLogger(SpecialRouteFinder.class);

	public SpecialRouteFinder(RoutingResource rs, OTPServer otpServer){
		this.copyRequest(rs);
		this.otpServer = otpServer;
	}
	
	public Itinerary findLaterItineraryByLegs(Leg firstToChange, Leg lastToChange){
		String departure = firstToChange.from.name + "::" + firstToChange.from.lat + "," + firstToChange.from.lon;
		String arrival = lastToChange.to.name + "::" + lastToChange.to.lat + "," + lastToChange.to.lon;
		Date departureDate = new Date ( firstToChange.startTime.getTimeInMillis() + 1);
		return findLaterItinerary(departure, arrival, departureDate);
	}
	
	public Itinerary findLaterItineraryByLegs(Leg firstToChange, Leg lastToChange, TraverseMode mode){
		String departure = firstToChange.from.name + "::" + firstToChange.from.lat + "," + firstToChange.from.lon;
		String arrival = lastToChange.to.name + "::" + lastToChange.to.lat + "," + lastToChange.to.lon;
		Date departureDate = new Date ( firstToChange.startTime.getTimeInMillis() + 1);
		return findLaterItinerary(departure, arrival, departureDate, mode);
	}
	
	public Itinerary findLaterItineraryByLegs(Leg firstToChange, Leg lastToChange, String bannedStop){
		String departure = firstToChange.from.name + "::" + firstToChange.from.lat + "," + firstToChange.from.lon;
		String arrival = lastToChange.to.name + "::" + lastToChange.to.lat + "," + lastToChange.to.lon;
		Date departureDate = new Date ( firstToChange.startTime.getTimeInMillis() + 1);
		return findLaterItinerary(departure, arrival, departureDate, bannedStop);
	}
	
	public Itinerary findLaterItinerary(String departure, String arrival, Date departureDate){
		return findOtherItinerary(departure, arrival, departureDate, null, null);
	}
	
	public Itinerary findLaterItinerary(String departure, String arrival, Date departureDate, TraverseMode mode){
		return findOtherItinerary(departure, arrival, departureDate, mode, null);
	}
	
	public Itinerary findLaterItinerary(String departure, String arrival, Date departureDate, String bannedStop){
		return findOtherItinerary(departure, arrival, departureDate, null, bannedStop);
	}
	
	public Itinerary findOtherItinerary(String departure, String arrival, Date departureDate, TraverseMode mode, String bannedStop){

		Itinerary itinerary = null;
		TripPlan plan = null;
		
		RoutingRequest request;
		try {
			request = super.buildRequest(otpServer);
			Router router = otpServer.getRouter(this.username);

			request.setFromString(departure);
			request.setToString(arrival);
			request.setDateTime(departureDate);
			request.setNumItineraries(1);
			
			if( mode != null) {
//				request.clearModes();
				request.removeMode(mode);
				System.out.println("remove the mode "+mode);
//				request.setMode(mode);
			}
			
			if( bannedStop != null ) {
				System.out.println("The banned stop is "+bannedStop);
	        	String stops = "";
	        	bannedStop = bannedStop.toUpperCase();
	            for(String feed : router.graph.getFeedIds()){                
	            	stops += feed + ":" + bannedStop + ",";
	            }
	            request.setBannedStops(stops);
			}
			
			SynchroGraphPathFinder gpFinder = new SynchroGraphPathFinder(router);
            List<GraphPath> paths = gpFinder.graphPathFinderEntryPoint(request);
            plan = GraphPathToTripPlanConverter.generatePlan(paths, request);
            
            System.out.println("Get new plan!");
	            
		} catch (ParameterException e) {
			e.printStackTrace();
		}
		
		if(plan != null && plan.itinerary.size() > 0) {
			itinerary = plan.itinerary.get(0);
		}
		
		return itinerary;
		
	}
	
	public List<Itinerary> findOtherItineraryForCapacity(String departure, String arrival, Date departureDate, TraverseMode mode, ArrayList<String> bannedStops, Date arrivalDate, int containers){

		List<Itinerary> itineraries = null;
		TripPlan plan = null;
		
		RoutingRequest request;
		try {
			request = super.buildRequest(otpServer);
			Router router = otpServer.getRouter(this.username);

			request.setFromString(departure);
			request.setToString(arrival);
			request.setDateTime(departureDate);
			if(arrivalDate!=null) {
			request.setArriveTimeVisible(true);
			//request.setArriveBy(true);
			request.setDateTimeArrive(arrivalDate);
			}
			request.setNumItineraries(5);
			
			//Riccardo: just route with enough capacity are allowed
			request.enoughCapacity = true;
			request.capacityRequest = containers;
			
			if( mode != null) {
//				request.clearModes();
				request.removeMode(mode);
//				System.out.println("remove the mode "+mode);
//				request.setMode(mode);
			}
//			System.out.println(departure + "->" + arrival);
			if( bannedStops != null ) {
	        	String stops = "";
	        	for(String bannedStop : bannedStops){
//	        		System.out.println("The banned stop is "+bannedStop);
		        	bannedStop = bannedStop.toUpperCase();
		            for(String feed : router.graph.getFeedIds()){                
		            	stops += feed + "_" + bannedStop + ";";
		            }
	        	}
	            System.out.println(stops);

	            request.setBannedStops(stops);
			}
			
			
			SynchroGraphPathFinder gpFinder = new SynchroGraphPathFinder(router);
            List<GraphPath> paths = gpFinder.graphPathFinderEntryPoint(request);
            if(paths.isEmpty())
            	return null;
            plan = GraphPathToTripPlanConverter.generatePlan(paths, request);
            
           // System.out.println("Get new plan!");
	            
		} catch (ParameterException e) {
			e.printStackTrace();
		}
		
		if(plan != null && plan.itinerary.size() > 0) {
			itineraries = plan.itinerary;
		}

		 LOG.info("plan itinerary size:" + plan.itinerary.size());

		return itineraries;
		
	}

}
