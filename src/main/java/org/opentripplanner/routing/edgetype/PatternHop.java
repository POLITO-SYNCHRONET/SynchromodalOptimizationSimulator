/* This program is free software: you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public License
 as published by the Free Software Foundation, either version 3 of
 the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>. */

package org.opentripplanner.routing.edgetype;

import java.util.Calendar;
import java.util.Locale;
import org.onebusaway.gtfs.model.Stop;
import org.onebusaway.gtfs.model.Trip;
import org.opentripplanner.common.geometry.GeometryUtils;
import org.opentripplanner.common.geometry.SphericalDistanceLibrary;
import org.opentripplanner.common.model.GenericLocation;
import org.opentripplanner.gtfs.GtfsLibrary;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.core.StateEditor;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.routing.trippattern.TripTimes;
import org.opentripplanner.routing.vertextype.PatternStopVertex;

import com.SynchroNET.utilities.DriverRestModule;
import com.SynchroNET.utilities.GTFSExtraDataManager;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.LineString;

/**
 * A transit vehicle's journey between departure at one stop and arrival at the next.
 * This version represents a set of such journeys specified by a TripPattern.
 */
public class PatternHop extends TablePatternEdge implements OnboardEdge, HopEdge {

    private static final long serialVersionUID = 1L;

    private Stop begin, end;

    public int stopIndex;
    
    private LineString geometry = null;

    public PatternHop(PatternStopVertex from, PatternStopVertex to, Stop begin, Stop end, int stopIndex) {
        super(from, to);
        this.begin = begin;
        this.end = end;
        this.stopIndex = stopIndex;
        getPattern().setPatternHop(stopIndex, this);
    }
    
    //EDIT - Riccardo (08-05-2017): read distance from GTFS
    public double getDistanceInMeters() {
//    	return distance * 1000;
        return getLinearDistance() * 1000;
    }
    //EDIT - Riccardo (08-05-2017): end
    
    public double getLinearDistance() {
        return SphericalDistanceLibrary.distanceP(begin.getLat(), begin.getLon(), end.getLat(),
                end.getLon());
    }    
    
    public double getLinearDistance(GenericLocation a, GenericLocation b) {
        return SphericalDistanceLibrary.distanceP(a.lat, a.lng, b.lat, b.lng);
    }

    public TraverseMode getMode() {
        return GtfsLibrary.getTraverseMode(getPattern().route); //PHUONG: getPattern() --> return TripPattern of 'from';
                                                                        //getPattern().route --> return route of TripPattern
    }
    
    //EDIT - Riccardo (04-05-2017): Retrieve extra data of the routes (ex. costs, CO2,...) 
    public String getRouteInformation() {
        return GtfsLibrary.getRouteInformation(getPattern().route);
    }
    //EDIT - Riccardo (04-05-2017): END

    public String getName() {
        return GtfsLibrary.getRouteName(getPattern().route);
    }
    
    public String getRouteID(){ //PHUONG
    	return GtfsLibrary.getRouteID(getPattern().route);
    }
    
    @Override
    public String getName(Locale locale) {
        return this.getName();
    }

    public State optimisticTraverse(State state0) {
        RoutingRequest options = state0.getOptions();
        
        // Ignore this edge if either of its stop is banned hard
        if (!options.bannedStopsHard.isEmpty()) {
            if (options.bannedStopsHard.matches(((PatternStopVertex) fromv).getStop())
                    || options.bannedStopsHard.matches(((PatternStopVertex) tov).getStop())) {
                return null;
            }
        }
        
    	int runningTime = getPattern().scheduledTimetable.getBestRunningTime(stopIndex); //PHUONG: the shortest time to reach the nextStop (stopIndex+1) from stopIndex in all trips taken from TimeTable
    	StateEditor s1 = state0.edit(this);
    	s1.incrementTimeInSeconds(runningTime); 
    	s1.setBackMode(getMode());
    	/*PHUONG: s1.incrementWeight(runningTime);*/
    	
        //PHUONG: Set Weight of s1 to infinity if either of this edge's stop is forced to go through
        boolean forced = false;
    	if (!options.forcedStops.isEmpty()) {
        	if (state0.existforcedStop) //PHUONG: there already exists the forcedStops on the path from the inital stop up to this state0
        	{
        		forced = true;
	        	s1 = getStatesWithIncrementedWeight(state0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition

	            /*Collect the PARTIAL itinerary up to this state --> SEND IT TO THE RISK (RAO) in the JSON/XML file using REST API
	              WAIT FOR THE answer in timeout (seconds), the answer is the value of RISK  in double format
	              method(input,output,timeout)
	            */

        	}
        	else  //PHUONG: there does not exist the forcedStops on the path from the initial stop up to this state0 -->need to check whether fromv/tov is the forcedStop
        	{
		        if (options.forcedStops.matches(((PatternStopVertex) fromv).getStop())
		                || options.forcedStops.matches(((PatternStopVertex) tov).getStop())) { //fromv/tov is the forcedStop
		        	forced = true;
		        	s1 = getStatesWithIncrementedWeight(state0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition
		        }
		        else {// there does not exist the forcedStops on the path from the initial stop up to this state0 AND fromv/tov is NOT the forcedStop --> penalty 10 times
		        	s1 = getStatesWithIncrementedWeight(state0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition            
		        }
        	}
        }  	
        else {
		            s1 = getStatesWithIncrementedWeight(state0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition
        }
        return s1.makeStatePHUONG(forced);
    }


    
    @Override
    public double timeLowerBound(RoutingRequest options) {
        return getPattern().scheduledTimetable.getBestRunningTime(stopIndex);
    }
    
    @Override
    public double weightLowerBound(RoutingRequest options) {
        return timeLowerBound(options);
    }
    
    public State traverse(State s0) {

        RoutingRequest options = s0.getOptions();

        // Ignore this edge if either of its stop is banned hard
        if (!options.bannedStopsHard.isEmpty()) {
            if (options.bannedStopsHard.matches(((PatternStopVertex) fromv).getStop())
                    || options.bannedStopsHard.matches(((PatternStopVertex) tov).getStop())) {
                return null;
            }
        }
       
        TripTimes tripTimes = s0.getTripTimes();
        
        int runningTime = tripTimes.getRunningTime(stopIndex); //PHUONG: the amount of time in seconds that the vehicle takes to reach the following stop
                                                              //getArrivalTime(stopIndex + 1) - getDepartureTime(stopIndex);        
        
        StateEditor s1 = s0.edit(this);
        s1.incrementTimeInSeconds(runningTime);
        if (s0.getOptions().arriveBy)
            s1.setZone(getBeginStop().getZoneId());
        else
            s1.setZone(getEndStop().getZoneId());
        //s1.setRoute(pattern.getExemplar().route.getId());
        
        /*PHUONG: s1.getIncrementedWeight(runningTime); */
        
        
        //PHUONG: Set Weight of s1 to infinity if either of this edge's stop is forced to go through
        boolean forced = false;
        if (!options.forcedStops.isEmpty()) {
        	if (s0.existforcedStop) {
        		//PHUONG: there already exists the forcedStops on the path from the initial stop up to this state s0
        	
        		forced = true;
        		s1 = getStatesWithIncrementedWeight(s0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition
	                    		
        	}
        	else {
	            if (options.forcedStops.matches(((PatternStopVertex) fromv).getStop())
	                    || options.forcedStops.matches(((PatternStopVertex) tov).getStop())) { //PHUONG: there does not exist the forcedStops on the path from the initial stop up to this state0 -->need to check whether fromv/tov is the forcedStop
	            	forced = true;
		            
	            	s1 = getStatesWithIncrementedWeight(s0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition

	            }
	            else {
	            	// there does not exist the forcedStops on the path from the initial stop up to this state s0 AND fromv/tov is NOT the forcedStop --> penalty 10 times  
		            s1 = getStatesWithIncrementedWeight(s0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition
	            }
        	}
        }
        else{            
	            s1 = getStatesWithIncrementedWeight(s0, s1, options, runningTime); //EDIT - Riccardo (13-03-2017): I introduced this method avoid code repetition

        }
            
        if(s1 == null) return null;
        
        s1.setBackMode(getMode());
        return s1.makeStatePHUONG(forced);
    }
    
    //EDIT - Riccardo (13-03-2017): This code was repeated multiple times so it was better to create this method
    public StateEditor getStatesWithIncrementedWeight(State s0, StateEditor s1, RoutingRequest options, int runningTime ){
    	   
    	//check forced routes
    	String forcedRoutes = options.preferredRoutes.getForcedRoutes();
        if(forcedRoutes != null && !forcedRoutes.toString().equals("")){
    		
            String lat = Double.toString(tov.getLat());
            String lon = Double.toString(tov.getLon());
            
            boolean forcedNode = false;
            
            for(String s : forcedRoutes.split(",")) {
                String[] routeInfo = s.split("\\+");
                //String route = routeInfo[0].trim();
                String destination = routeInfo[2].trim();
                String[] destinatioInfo = destination.split("_");
                String destinationLat = destinatioInfo[1];
                String destinationLon = destinatioInfo[2];
                
          	  if(destinationLat.equals(lat) && destinationLon.equals(lon)) {
          		  forcedNode = true;
          		  break;
          	  }
            }

        	if(forcedNode && !options.preferredRoutes.matches( getPattern().route ) ) return null;
        }
        
    	int changeTruckPenalty = 0;
    	
    	double durationHours = runningTime/3600.0;
    	if(options.driverRestTime && getMode() == TraverseMode.BUS) {
    		s1.incrementTimeInSeconds(DriverRestModule.addRestTimeSeconds(durationHours));
    	}
    	

			
    	//considering weights of boarding alighting
//    	double boarding = GTFSExtraDataManager.getBoardingTime(trip);
//    	double alighting = GTFSExtraDataManager.getAlightingTime(trip);
    	double boarding = s0.boarding;
    	double alighting = s0.alighting;
//    	double transit = s0.transit;
    	
        //Riccardo take wait time into account
    	double wait = s0.wait;

    	//    	durationHours += (boarding + alighting + transit + wait) / 3600;
    	durationHours += (boarding + alighting + wait) / 3600;
		if(s0.getBackEdge().getClass().equals(TransitBoardAlight.class)) {
				if(s0.getBackEdge().toString().contains("DOVER")) {
					Calendar c = Calendar.getInstance();
					c.setTimeInMillis(s0.getTimeInMillis());
//					System.out.println(s0.getPreviousTrip().toString() + " " + c.getTime() + " " + durationHours);
				}
			}
		
    	double cost_timeP = options.cost_per_hour * durationHours;
        
    	double distance = getLinearDistance();
    	double tempDistance = s0.getTripTimes().getDistance(stopIndex + 1) - s0.getTripTimes().getDistance(stopIndex);//EDIT - Riccardo (08-05-2017): read distance from GTFS
    	if(tempDistance > 0) distance = tempDistance;

    	double cost_distanceP = 0;
    	s1.incrementDistance(distance);
        double CO2_KM = 0; 
                
        //EDIT - Riccardo (10-05-2017): KPIs proportional weight
        int capacityGTFS = GTFSExtraDataManager.getCapacity(s0.getPreviousTrip(), options);
        
        if (getMode() == TraverseMode.FERRY)
        {
        	cost_distanceP = distance * options.cost_distance_per_km_ship;
//        	System.out.println(s0.getTripId());
        	
        	//TODO Shuai(16-01-2018) Already not the way we define the ID
        	if (getRouteID().endsWith("_1")){
        		//1: slow velocity
        		if(capacityGTFS > 3000) CO2_KM = distance * options.co2_per_km_big_ship_Slow;
        		else CO2_KM = distance * options.co2_per_km_feeder_ship_Slow;
        	}
        	else if (getRouteID().endsWith("_2")){
        		//2: medium velocity
        		if(capacityGTFS > 3000) CO2_KM = distance * options.co2_per_km_big_ship_Medium;
        		else CO2_KM = distance * options.co2_per_km_feeder_ship_Medium;
        	}

        	else if (getRouteID().endsWith("_3")){
        		//3: fast velocity
        		if(capacityGTFS > 3000) CO2_KM = distance * options.co2_per_km_big_ship_Fast;
        		else CO2_KM = distance * options.co2_per_km_feeder_ship_Fast;
        	}
        	else {
        		//velocity is not defined
        		if(capacityGTFS > 3000) CO2_KM = distance * options.co2_per_km_big_ship;
        		else CO2_KM = distance * options.co2_per_km_feeder_ship;
        	}
        } else if (getMode() == TraverseMode.BUS) {
        	cost_distanceP = distance * options.cost_distance_per_km_truck;
        	if(options.capacityRequest > 1) capacityGTFS = options.capacityRequest;
        	CO2_KM = distance * options.co2_per_km_truck * capacityGTFS;
        	
        	//Riccardo: penalty when changing truck
        	State tempState = s0;
        	while( (tempState = tempState.getBackState()) != null ) {
//        		if(tempState.getPreviousTrip() != null) System.out.println(s0.getPreviousTrip() + " " + tempState.getPreviousTrip() + " " + GtfsLibrary.getTraverseMode(tempState.getPreviousTrip().getRoute()));
        		if(tempState.getPreviousTrip() != null)
        			if(GtfsLibrary.getTraverseMode(tempState.getPreviousTrip().getRoute()).equals(TraverseMode.BUS)) changeTruckPenalty = 99999;
        			break;
        	}
//        	System.out.println();
        	
        } else if (getMode() == TraverseMode.RAIL) {
        	cost_distanceP = distance * options.cost_distance_per_km_train;
        	CO2_KM = distance * options.co2_per_km_train;
        }

        //Riccardo: emissions for generic search are calculated for one container
        int co2GTFS = GTFSExtraDataManager.getEmission(s0.getBackTrip(), options);
        if(co2GTFS >= 0) CO2_KM = co2GTFS;

        if(getMode() != TraverseMode.BUS){
            CO2_KM /= capacityGTFS;
            if(options.capacityRequest > 1) CO2_KM *= options.capacityRequest;
        }
        s0.capacity = capacityGTFS;
        //end

        double cost_C02 = CO2_KM * options.co2_cost_per_kg; 

        //Riccardo ferry weight bonus reduction (1 no reduction)
//        int reduction = 1;
//        if(getMode() == TraverseMode.FERRY) {
//        	cost_distanceP /= reduction;
//        	cost_timeP /= reduction;
//        	cost_C02 /= reduction;
//        }



        s1.incrementcostDistance(cost_distanceP);
        s1.incrementcostTime(cost_timeP);    
        s1.incrementCO2(CO2_KM);
        s1.incrementcostCO2(cost_C02);
   
        double weightP = options.distance_w * cost_distanceP + options.co2_w * cost_C02 + options.time_w * cost_timeP;
        if(s0.getBackEdge().getToVertex().toString().contains("GERAU")){
        	System.out.println(durationHours + " " + CO2_KM + " " + distance);
        	System.out.println(cost_timeP + " " + cost_C02 + " " + cost_distanceP );
        	System.out.println(s0.weight + " " + weightP);
        }
//        if(s0.getRoute().toString().contains("COSCORails_PIRAEUS_PARDUBICE") && options.to.name.equals("Pardubice")) weightP = 1;
        //double weightP = getWeight(options, distance, timeTraveled, CO2_KM);
        s1.incrementWeight(weightP + changeTruckPenalty);
        //EDIT - Riccardo (07-04-2017): END
        
        //only leg that can carry all the request containers are allowed
        if(getMode() != TraverseMode.BUS && options.enoughCapacity && options.capacityRequest > capacityGTFS) s1.incrementWeight(Double.MAX_VALUE);

        return s1;
    }
    //EDIT - Riccardo (13-03-2017): END
    
    
    //Riccardo test other way of optimization
//    private double getWeight(RoutingRequest options, double distance, double time, double CO2){
//    	
//    	double originDestinationDistance = getLinearDistance(options.from, options.to);
//    	//consider worst time (slow steaming ship)
////    	double originDestinationTime = originDestinationDistance / 32;
//    	//consider best time (truck)
//    	double originDestinationTime = originDestinationDistance / 80;
//    	//consider worst CO2 (truck)
////    	double originDestinationCO2 = originDestinationDistance * options.co2_per_km_truck * options.capacityRequest;
//    	//consider best CO2 (slow steaming ship)
//    	double originDestinationCO2 = originDestinationDistance * options.co2_per_km_feeder_ship_Slow * options.capacityRequest / GTFSExtraDataManager.getDefaultCapacity(TraverseMode.FERRY, options);
//
//    	
//    	double distanceWeight = (distance * 100) / originDestinationDistance;
//        double timeWeight = (time * 100) / originDestinationTime;
//        double co2Weight = (CO2 * 100) / originDestinationCO2;
////        System.out.println(distanceWeight + " " + options.distance_w);
////        System.out.println(timeWeight + " " + options.time_w);
////        System.out.println(co2Weight + " " + options.co2_w);
//        
//        double penalty;
//        TraverseMode mode = getMode();
//        if(mode.equals(TraverseMode.BUS)) penalty = options.cost_distance_per_km_truck;
//        else if(mode.equals(TraverseMode.RAIL)) penalty = options.cost_distance_per_km_train;
//        else penalty = options.cost_distance_per_km_ship;
//
//        double weightP = distanceWeight * options.distance_w + timeWeight * options.time_w + co2Weight * options.co2_w;
//        return weightP * penalty;
//    }
    
    public void setGeometry(LineString geometry) {
        this.geometry = geometry;
    }

    public LineString getGeometry() {
        if (geometry == null) {

            Coordinate c1 = new Coordinate(begin.getLon(), begin.getLat());
            Coordinate c2 = new Coordinate(end.getLon(), end.getLat());

            geometry = GeometryUtils.getGeometryFactory().createLineString(new Coordinate[] { c1, c2 });
        }
        return geometry;
    }

    @Override
    public Stop getEndStop() {
        return end;
    }

    @Override
    public Stop getBeginStop() {
        return begin;
    }

    public String toString() {
    	return "PatternHop(" + getFromVertex() + ", " + getToVertex() + ")";
    }

    @Override
    public int getStopIndex() {
        return stopIndex;
    }
}
