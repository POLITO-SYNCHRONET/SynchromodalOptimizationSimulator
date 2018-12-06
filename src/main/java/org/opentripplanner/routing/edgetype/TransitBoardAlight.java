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

import java.util.BitSet;
import java.util.Calendar;
import java.util.Locale;
import org.onebusaway.gtfs.model.Stop;
import org.onebusaway.gtfs.model.Trip;
import org.opentripplanner.gtfs.GtfsLibrary;
import org.opentripplanner.routing.core.RoutingContext;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.ServiceDay;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.core.StateEditor;
import org.opentripplanner.routing.core.TransferTable;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.routing.core.TraverseModeSet;
import org.opentripplanner.routing.trippattern.TripTimes;
import org.opentripplanner.routing.vertextype.PatternStopVertex;
import org.opentripplanner.routing.vertextype.TransitStop;
import org.opentripplanner.routing.vertextype.TransitStopArrive;
import org.opentripplanner.routing.vertextype.TransitStopDepart;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.utilities.DriverRestModule;
import com.SynchroNET.utilities.GTFSExtraDataManager;
import com.conveyal.r5.streets.VertexStore.Vertex;
import com.vividsolutions.jts.geom.LineString;


/**
 * Models boarding or alighting a vehicle - that is to say, traveling from a state off 
 * vehicle to a state on vehicle. When traversed forward on a boarding or backwards on an 
 * alighting, the the resultant state has the time of the next departure, in addition the pattern
 * that was boarded. When traversed backward on a boarding or forward on an alighting, the result
 * state is unchanged. A boarding penalty can also be applied to discourage transfers. In an on
 * the fly reverse-optimization search, the overloaded traverse method can be used to give an
 * initial wait time. Also, in reverse-opimization, board costs are correctly applied.
 * 
 * This is the result of combining the classes formerly known as PatternBoard and PatternAlight.
 * 
 * @author mattwigway
 */
public class TransitBoardAlight extends TablePatternEdge implements OnboardEdge {

    private static final long serialVersionUID = 1042740795612978747L;

    private static final Logger LOG = LoggerFactory.getLogger(TransitBoardAlight.class);

    private final int stopIndex;

    private int modeMask; // TODO: via TablePatternEdge it should be possible to grab this from the pattern
   
    /** True if this edge represents boarding a vehicle, false if it represents alighting. */
    public boolean boarding;

    /** Boarding constructor (TransitStopDepart --> PatternStopVertex) */
    public TransitBoardAlight (TransitStopDepart fromStopVertex, PatternStopVertex toPatternVertex, 
            int stopIndex, TraverseMode mode) {
        super(fromStopVertex, toPatternVertex);
        this.stopIndex = stopIndex;
        this.modeMask = new TraverseModeSet(mode).getMask();
        this.boarding = true;
    }
    
    /** Alighting constructor (PatternStopVertex --> TransitStopArrive) */
    public TransitBoardAlight (PatternStopVertex fromPatternStop, TransitStopArrive toStationVertex,
            int stopIndex, TraverseMode mode) {
        super(fromPatternStop, toStationVertex);
        this.stopIndex = stopIndex;
        this.modeMask = new TraverseModeSet(mode).getMask();
        this.boarding = false;
    }
    
    /** 
     * Find the TripPattern this edge is boarding or alighting from. Overrides the general
     * method which always looks at the from-vertex.
     * @return the pattern of the to-vertex when boarding, and that of the from-vertex 
     * when alighting. 
     */
    @Override 
    public TripPattern getPattern() {
        if (boarding)
            return ((PatternStopVertex) tov).getTripPattern();
        else
            return ((PatternStopVertex) fromv).getTripPattern();
    }
                           
    public String getDirection() {
        return null;
    }

    public double getDistanceInMeters() {
        return 0;
    }

    public LineString getGeometry() {
        return null;
    }

    public TraverseMode getMode() {
        return TraverseMode.LEG_SWITCH;
    }

    public String getName() {
        return boarding ? "leave street network for transit network" : 
            "leave transit network for street network";
    }
    
    @Override
    public String getName(Locale locale) {
        //TODO: localize
        return this.getName();
    }

    @Override
    public State traverse(State state0) {
        return traverse(state0, 0);
    }
    
    
    /**
     * NOTE: We do not need to check the pickup/drop off type. TransitBoardAlight edges are simply
     * not created for pick/drop type 1 (no pick/drop).
     * 
     * @param arrivalTimeAtStop TODO: clarify what this is.
     */
    public State traverse(State s0, long arrivalTimeAtStop) {
    	

    	
    	//Riccardo (07-06-2017): MANAGE HERE THE ALIGHT ON FINAL DESTINATION
    	if(s0.getBackEdge().getToVertex().getLat() == s0.stateData.opt.to.lat && s0.getBackEdge().getToVertex().getLon() == s0.stateData.opt.to.lng ){ 
    		s0.alighting = GTFSExtraDataManager.getAlightingTime(s0.getBackTrip(), s0.getOptions());
//    		s0.setTimeSeconds(s0.getTimeSeconds() - s0.alighting);
        }
    	//Riccardo (07-06-2017): END
        
        RoutingContext rctx    = s0.getContext();
        RoutingRequest options = s0.getOptions();

        // Forbid taking shortcuts composed of two board-alight edges in a row. Also avoids spurious leg transitions.
        if (s0.backEdge instanceof TransitBoardAlight) {
            return null;
        }

        /* If the user requested a wheelchair accessible trip, check whether and this stop is not accessible. */
        if (options.wheelchairAccessible && ! getPattern().wheelchairAccessible(stopIndex)) {
            LOG.info("NULL1");
        	return null;
        };

        /*
         * Determine whether we are going onto or off of transit. Entering and leaving transit is
         * not the same thing as boarding and alighting. When arriveBy == true, we are entering
         * transit when traversing an alight edge backward.
         */
        
//        if(!s0.getVertex().getOutgoingArray()[0].getClass().equals(PreAlightEdge.class))System.out.println(s0.getVertex().getLabel()  + " " + s0.getVertex().getOutgoingArray()[0].getToVertex().getLabel() + " " + s0.getVertex().getOutgoingArray()[0].getClass());
//        else System.out.println(s0.getVertex().getIncomingArray()[0].getFromVertex().getLabel() + " " + s0.getVertex().getLabel()  + " " +  s0.getVertex().getIncomingArray()[0].getClass());
//        System.out.println(boarding + " " + options.arriveBy);
        
        boolean leavingTransit = 
                ( boarding &&  options.arriveBy) || 
                (!boarding && !options.arriveBy); 

        /* TODO pull on/off transit out into two functions. */

        if (leavingTransit) { 

            /* We are leaving transit, not as much to do. */
            // When a dwell edge has been eliminated, do not alight immediately after boarding.
            // Perhaps this should be handled by PathParser.
            if (s0.getBackEdge() instanceof TransitBoardAlight) {
            	LOG.info("NULL2");
                return null;
            }

            StateEditor s1 = s0.edit(this);
            s1.setTripId(null);
            s1.setLastAlightedTimeSeconds(s0.getTimeSeconds()); //=current time at the state s0 (PHUONG: ONLY this type of edge call function setLastAlightedTimeSeconds --> can change the lastAlightedTime parameters of StateData
            // Store the stop we are alighting at, for computing stop-to-stop transfer times,
            // preferences, and permissions.
            // The vertices in the transfer table are stop arrives/departs, not pattern
            // arrives/departs, so previousStop is direction-dependent.
            s1.setPreviousStop(getStop()); 
            s1.setLastPattern(this.getPattern());

            if (boarding) {

            	int boardingTime = options.getBoardTime(this.getPattern().mode); //PHUONG: from org.opentripplanner.routing.graph/Graph.java: boarding time that the vehicle will take for this transport mode
            	if (boardingTime != 0) {
                    // When traveling backwards the time travels also backwards
                    s1.incrementTimeInSeconds(boardingTime);
                    double cost_timeP = options.cost_per_hour * boardingTime/3600.0;
                    double increaseP = options.time_w  * cost_timeP;
                    s1.incrementWeight(increaseP);
                    s1.incrementcostTime(cost_timeP);
                    //s1.incrementWeight(boardingTime * options.waitReluctance);
                }
            } else {

//            	System.out.println(s0.getVertex().getLabel() + " / Alighting " + this.getStop().getDesc());
                int alightTime = options.getAlightTime(this.getPattern().mode);
          	    //Riccardo (16/05/2017): edit the alightTime here (alightTime = ?)
                if (alightTime != 0) {
                    s1.incrementTimeInSeconds(alightTime);
                    double cost_timeP = options.cost_per_hour * alightTime/3600.0;
                    double increaseP = options.time_w  * cost_timeP;
                    s1.incrementWeight(increaseP);
                    s1.incrementcostTime(cost_timeP);
                    //s1.incrementWeight(alightTime * options.waitReluctance);
                    // TODO: should we have different cost for alighting and boarding compared to regular waiting?
                }
                
            }
            /* Determine the wait. */
            if (arrivalTimeAtStop > 0) { // FIXME what is this arrivalTimeAtStop?
                int wait = (int) Math.abs(s0.getTimeSeconds() - arrivalTimeAtStop);
                
                s1.incrementTimeInSeconds(wait);
                // this should only occur at the beginning
                double cost_timeP = options.cost_per_hour * wait/3600.0;
                double increaseP = options.time_w  * cost_timeP;
                s1.incrementWeight(increaseP);
                s1.incrementcostTime(cost_timeP);
                //s1.incrementWeight(wait * options.waitAtBeginningFactor); //set waitAtBeginningFactor = 0.4 at RoutingRequest.java
                s1.setInitialWaitTimeSeconds(wait);

                //LOG.debug("Initial wait time set to {} in PatternBoard", wait);
            }
            
            // during reverse optimization, board costs should be applied to PatternBoards
            // so that comparable trip plans result (comparable to non-optimized plans)
            if (options.reverseOptimizing)
            {
                s1.incrementWeight(options.getBoardCost(s0.getNonTransitMode()));
                s1.incrementWAIT2(options.getBoardCost(s0.getNonTransitMode()));
            }
            if (options.reverseOptimizeOnTheFly) {
                TripPattern pattern = getPattern();
                int thisDeparture = s0.getTripTimes().getDepartureTime(stopIndex);
                int numTrips = getPattern().getNumScheduledTrips(); 
                int nextDeparture;

                s1.setLastNextArrivalDelta(Integer.MAX_VALUE);

                for (int tripIndex = 0; tripIndex < numTrips; tripIndex++) {
                    Timetable timetable = pattern.getUpdatedTimetable(options, s0.getServiceDay());
                    nextDeparture = timetable.getTripTimes(tripIndex).getDepartureTime(stopIndex);
        
                    if (nextDeparture > thisDeparture) {
                        s1.setLastNextArrivalDelta(nextDeparture - thisDeparture);
                        break;
                    }
                }
            }            

            s1.setBackMode(getMode());
            return s1.makeState();
        } else { 
            /* We are going onto transit and must look for a suitable transit trip on this pattern. */   
            
            /* Disallow ever re-boarding the same trip pattern. */

            if (s0.getLastPattern() == this.getPattern()) {
            	//LOG.info("RouteID = {}",this.getPattern().route.getId().getId());
            	//LOG.info("NULL3");
                return null; 
            }
            
            /* Check this pattern's mode against those allowed in the request. */
            if (!options.modes.get(modeMask)) {
               // LOG.info("NULL4");
            	return null;
            }

            
        	//Riccardo (09-06-2017): if you are in a stop where a forced route should be used skip the ones out of the list
            String forcedRoutes = options.preferredRoutes.getForcedRoutes();
            	  
            if(forcedRoutes != null && !forcedRoutes.toString().equals("")){
            		
                  String lat = Double.toString(getPattern().getStop(stopIndex).getLat());
                  String lon = Double.toString(getPattern().getStop(stopIndex).getLon());

                  
                  boolean forcedNode = false;
                  
                  for(String s : forcedRoutes.split(",")) {
                      String[] routeInfo = s.split("\\+");
                      //String route = routeInfo[0].trim();
                      String origin = routeInfo[1].trim();
                      String[] originInfo = origin.split("_");
                      String originLat = originInfo[1];
                      String originLon = originInfo[2];
                      
                	  if(originLat.equals(lat) && originLon.equals(lon)) {
                		  forcedNode = true;
//                		  TransitStop destinationStop = getPattern().stopVertices[1];
//                		  lat = Double.toString(destinationStop.getLat());
//                		  lon = Double.toString(destinationStop.getLon());
//                          String destination = routeInfo[2].trim();
//                          String[] destinationInfo = destination.split("_");
//                          String destinationLat = destinationInfo[1];
//                          String destinationLon = destinationInfo[2];
//                          if( !(destinationLat.equals(lat) && destinationLon.equals(lon)) ) return null;
                		  break;
                	  }
                  }

              	if(forcedNode && !options.preferredRoutes.matches( getPattern().route ) ) return null;

              	if (!forcedNode && options.bannedRoutes != null && options.bannedRoutes.matches(getPattern().route) )	return null;
                  
            } else if (options.bannedRoutes != null && options.bannedRoutes.matches(getPattern().route))	return null;
        	//Riccardo (09-06-2017): END
            

            /*
             * Find the next boarding/alighting time relative to the current State. Check lists of
             * transit serviceIds running yesterday, today, and tomorrow relative to the initial
             * state. Choose the closest board/alight time among trips starting yesterday, today, or
             * tomorrow. Note that we cannot skip searching on service days that have not started
             * yet: Imagine a state at 23:59 Sunday, that should take a bus departing at 00:01
             * Monday (and coded on Monday in the GTFS); disallowing Monday's departures would
             * produce a strange plan. We also can't break off the search after we find trips today.
             * Imagine a trip on a pattern at 25:00 today and another trip on the same pattern at
             * 00:30 tommorrow. The 00:30 trip should be taken, but if we stopped the search after
             * finding today's 25:00 trip we would never find tomorrow's 00:30 trip.
             */
            TripPattern tripPattern = this.getPattern();
            //LOG.info("Phuong:TransitBoardAlight for routeID = {}, stop = {}",this.getPattern().route.getId().getId(),this.getPattern().getStop(stopIndex));
            //boolean Phuong = true; //tripPattern.route.getId().getId().contains("ATHEN_MILAN1");
            int bestWait = -1;
            TripTimes  bestTripTimes  = null;
            ServiceDay bestServiceDay = null;
            //int count = 0;
            
            boolean boardingCalculated = false;
            boolean transitCalculated = false;
            
            for (int i = 0; i < rctx.serviceDays.size(); i++) {
            	ServiceDay sd = rctx.serviceDays.get(i);
                /* Find the proper timetable (updated or original) if there is a realtime snapshot. */
                Timetable timetable = tripPattern.getUpdatedTimetable(options, sd);

                /* Skip this day/timetable if no trip in it could possibly be useful. */
                // TODO disabled until frequency representation is stable, and min/max timetable times are set from frequencies
                // However, experiments seem to show very little measurable improvement here (due to cache locality?)
                // if ( ! timetable.temporallyViable(sd, s0.getTimeSeconds(), bestWait, boarding)) continue;
                /* Find the next or prev departure depending on final boolean parameter. */
               // count++;
                TripTimes tripTimes;
                //LOG.info("Call getNextTrip lan thu {}",count);
                /*if (Phuong)
                	tripTimes = timetable.getNextTripPHUONG(s0, sd, stopIndex, boarding,tripPattern);
                else*/
                	tripTimes = timetable.getNextTrip(s0, sd, stopIndex, boarding);
                    
                	if (tripTimes != null) {
                		
      	      			Trip oldTrip = s0.getPreviousTrip();
      	      			//Riccardo: sometimes for some reason it consider a really close stop instead of the real departure, so we skip the trip
      	      			boolean origin = s0.getVertex().getLat() == s0.stateData.opt.from.lat && s0.getVertex().getLon() == s0.stateData.opt.from.lng;
      	      			if( !origin && oldTrip == null) return null;

      	      			Trip newTrip = tripTimes.trip;
      	      			TraverseMode oldMode = oldTrip != null ? GtfsLibrary.getTraverseMode(oldTrip.getRoute()) : null;
      	      			TraverseMode newMode = GtfsLibrary.getTraverseMode(newTrip.getRoute());

      	      			//Riccardo avoid modal changes between trucks
      	      			if(newMode.equals(oldMode) && newMode.equals(TraverseMode.BUS) && !options.fromTruckToTruck){
      	      				return null;
      	      			}
                		
                        /* Wait is relative to departures on board and arrivals on alight. */
                        int wait = boarding ? 
                            (int)(sd.time(tripTimes.getDepartureTime(stopIndex)) - s0.getTimeSeconds()):
                            (int)(s0.getTimeSeconds() - sd.time(tripTimes.getArrivalTime(stopIndex)));
                            
                        //Riccardo: manage here Boarding and Alighting
          	      	if(origin){
          	      		if(!boardingCalculated){
          	      			s0.boarding = GTFSExtraDataManager.getBoardingTime(newTrip, s0.getOptions());
	      	      			s0.alighting = GTFSExtraDataManager.getAlightingTime(newTrip, s0.getOptions());
	      	      			s0.setTimeSeconds(s0.getBackState().getStartTimeSeconds() + s0.boarding);
	      	      			boardingCalculated = true;
	      	      			wait = -1;
	      	      			i = 0;
          	      		}  	      		
	      	      	} else {
	      	      		if(!transitCalculated){
	      	      			int oldAlighting = GTFSExtraDataManager.getAlightingTime(oldTrip, s0.getOptions());
	      	      			s0.boarding = GTFSExtraDataManager.getBoardingTime(newTrip, s0.getOptions());
	      	      			s0.alighting = GTFSExtraDataManager.getAlightingTime(newTrip, s0.getOptions());

//	      	      			if(oldMode.equals(TraverseMode.BUS) && newMode.equals(TraverseMode.FERRY)) {
//	      	      				String type = GTFSExtraDataManager.getBoardingType(newTrip, s0.getOptions());
//	      	      				if(type.equals("roro")) s0.getBackState().getBackState().getBackState().alighting = 0;
//	      	      			} 
//	      	      			
	      	      			s0.setTimeSeconds(s0.getBackState().getTimeSeconds() + oldAlighting + s0.boarding);
	      	      			transitCalculated = true;
	      	      			i = 0;
	      	      			wait = -1;
	      	      		}
	      	        }
      	      			
//      	      			s0.setTimeSeconds(s0.getBackState().getTimeSeconds() + operationalTime);
      	      			//Riccardo: END
                        

                        
      	      			
////                	Riccardo (30-05-2017): MANAGE HERE THE TRANSFER

//          	      	if(s0.getVertex().getLat() == s0.stateData.opt.from.lat && s0.getVertex().getLon() == s0.stateData.opt.from.lng){
////                    	MANAGE HERE THE BOARDING IN THE ORIGIN
////          	      		wait = GTFSExtraDataManager.getBoardingTime(tripTimes.trip);
//          	      		if(!boardingCalculated){
//          	      			s0.boarding = GTFSExtraDataManager.getBoardingTime(tripTimes.trip, s0.getOptions());
//          	      			s0.setTimeSeconds(s0.getBackState().getStartTimeSeconds() + s0.boarding);
////          	      			s0.getBackState().setTimeSeconds(s0.getTimeSeconds());
//          	      			boardingCalculated = true;
//          	      			wait = -1;
//          	      			i = 0;
//          	      		}
////					Giovanni add capacity in s0.
//          	      	s0.capacity =0;// GTFSExtraDataManager.getCapacity(tripTimes.trip); 
////					Giovanni END          	      		
//
//          	      	} else {
////          	      	MANAGE HERE THE TRANSFER ON STOPS
//          	      		if(!transitCalculated){
//          	      			

//          	      			s0.alighting = GTFSExtraDataManager.getAlightingTime(oldTrip, s0.getOptions());
//          	      			s0.boarding = GTFSExtraDataManager.getBoardingTime(newTrip, s0.getOptions());
//          	      			s0.setTimeSeconds(s0.getBackState().getTimeSeconds() + s0.alighting + s0.boarding);
//          	      			transitCalculated = true;
//          	      			i = 0;
//          	      			wait = -1;
//          	      		}
//          	        }
          	    	//Riccardo (30-05-2017): END

//              	    System.out.println(wait + " " + bestWait);
          	      	
          	      	//                        if(s0.getPreviousTrip() != null){
//                        	if(GtfsLibrary.getTraverseMode(s0.getPreviousTrip().getRoute()) == TraverseMode.FERRY){
//                        		System.out.println("back " + s0.getPreviousTrip().getId() + " " + s0.getPreviousTrip().getTripHeadsign());
//                        		System.out.println(tripTimes.trip.getId() + " " + tripTimes.trip.getTripHeadsign());
//                        	}
////                        	System.out.println("boarding " + GtfsLibrary.getTraverseMode(s0.getPreviousTrip().getRoute()));
//                        }
                        
                       /* String routeP = tripTimes.trip.getRoute().getId().getId();
                        String tripP = tripTimes.trip.getId().getId();
                     if (Phuong)
                     {
                    	 if (boarding)
                    		 LOG.info("KL: Boarding: CurrentTime = {}, next = {}, routeID = {}, tripID = {}",s0.getTimeSeconds(),sd.time(tripTimes.getDepartureTime(stopIndex)),routeP,tripP);
                    	 else
                     		 LOG.info("KL: Alight: CurrentTime = {}, next = {}, routeID = {}, tripID = {}",s0.getTimeSeconds(),sd.time(tripTimes.getArrivalTime(stopIndex)),routeP,tripP);
                    }*/
                    /* A trip was found. The wait should be non-negative. */
          	      	//Riccardo (07-06-207): to make our transit time working well we need also negative wait
//                    if (wait < 0) LOG.error("Negative wait time when boarding.");
                    /* Track the soonest departure over all relevant schedules. */
                    if (bestWait < 0 || wait < bestWait ) {
                        bestWait       = wait;
                        bestServiceDay = sd;
                        bestTripTimes  = tripTimes;
                    }

                }
            }
        	
        	
        	
            //Riccardo: save wait time into the state
            s0.wait = bestWait;
            //Riccardo: avoid short rail trip
//            int minKm = 250
            int minKm = -1;
    		if(bestTripTimes != null && GtfsLibrary.getTraverseMode(bestTripTimes.trip.getRoute()).equals(TraverseMode.RAIL) && bestTripTimes.getDistance(stopIndex + 1) <= minKm){
				return null;
			}
    			
//        	System.out.println(s0.getBackEdge().getFromVertex().getLabel() + " " + s0.getBackEdge().getToVertex().getLabel());
//        	System.out.println(s0.getPreviousTrip() + " " + bestWait + " " + s0.boarding + " " + s0.transit + " " + s0.alighting);
             if (bestWait < 0) {return null;} // no appropriate trip was found
            Trip trip = bestTripTimes.trip;
            
            /* check if route and/or Agency are banned for this plan */
            // FIXME this should be done WHILE searching for a trip.
            if (options.tripIsBanned(trip)) return null;

            /* Check if route is preferred by the user. */
            long preferences_penalty = options.preferencesPenaltyForRoute(getPattern().route); //PHUONG: Check if route is preferred according to this request

        	/* Compute penalty for non-preferred transfers. */
            int transferPenalty = 0;
            /* If this is not the first boarding, then we are transferring. */
            if (s0.isEverBoarded()) {
                TransferTable transferTable = options.getRoutingContext().transferTable;
                int transferTime = transferTable.getTransferTime(s0.getPreviousStop(),  
                                   getStop(), s0.getPreviousTrip(), trip, boarding); //the transfer time that should be used when transferring from a trip to another trip
                transferPenalty  = transferTable.determineTransferPenalty(transferTime, 
                                   options.nonpreferredTransferPenalty); //PHUONG: from routing/core/TransferTable.java
            }            

            /* Found a trip to board. Now make the child state. */
            StateEditor s1 = s0.edit(this);
            s1.setBackMode(getMode());
            s1.setServiceDay(bestServiceDay);
            // Save the trip times in the State to ensure that router has a consistent view 
            // and constant-time access to them.
            s1.setTripTimes(bestTripTimes);
            s1.incrementTimeInSeconds(bestWait);
            s1.incrementNumBoardings(); //PHUONG: only this type of edge increase numBoardings of the state
            s1.setTripId(trip.getId());
            s1.setPreviousTrip(trip);
            s1.setZone(getPattern().getZone(stopIndex));
            s1.setRoute(trip.getRoute().getId());

            double wait_cost = 0;
            double cost_timeP;

            if (!s0.isEverBoarded() && !options.reverseOptimizing) {
                wait_cost = 0; //first waiting
                cost_timeP = 0;
                s1.setInitialWaitTimeSeconds(bestWait);
            } else {
            	cost_timeP = options.cost_per_hour * bestWait/3600.0;
            	wait_cost = options.time_w  * cost_timeP;
                
            }
            
            // when reverse optimizing, the board cost needs to be applied on
            // alight to prevent state domination due to free alights
            if (options.reverseOptimizing) {
                s1.incrementWeight(wait_cost);
                s1.incrementcostTime(cost_timeP);
            } else {
               s1.incrementWeight(wait_cost + options.getBoardCost(s0.getNonTransitMode())); //PHUONG: getBoardCost is bikeBoardCost OR walkBoardCost [= cost when boarding to a new vehicle]; I set it to 0 at the RoutingRequest.java because we just care about transit in GTFS
               s1.incrementcostTime(cost_timeP);
               s1.incrementWAIT3(options.getBoardCost(s0.getNonTransitMode())); //=1
            }

            
            /*double wait_cost = bestWait;

            if (!s0.isEverBoarded() && !options.reverseOptimizing) {
                wait_cost *= options.waitAtBeginningFactor;
                s1.setInitialWaitTimeSeconds(bestWait);
            } else {
                wait_cost *= options.waitReluctance; //PHUONG: How much worse is waiting for a transit vehicle than being on a transit vehicle
            }
            
            s1.incrementWeight(preferences_penalty);
            s1.incrementWeight(transferPenalty);

            // when reverse optimizing, the board cost needs to be applied on
            // alight to prevent state domination due to free alights
            if (options.reverseOptimizing) {
                s1.incrementWeight(wait_cost);
            } else {
                s1.incrementWeight(wait_cost + options.getBoardCost(s0.getNonTransitMode())); //PHUONG: getBoardCost is bikeBoardCost OR walkBoardCost
            }*/
            
            // On-the-fly reverse optimization
            // determine if this needs to be reverse-optimized.
            // The last alight can be moved forward by bestWait (but no further) without
            // impacting the possibility of this trip
            if (options.reverseOptimizeOnTheFly && 
               !options.reverseOptimizing && 
                s0.isEverBoarded() && 
                s0.getLastNextArrivalDelta() <= bestWait &&
                s0.getLastNextArrivalDelta() > -1) {
                // it is re-reversed by optimize, so this still yields a forward tree
                State optimized = s1.makeState().optimizeOrReverse(true, true);
                if (optimized == null) LOG.error("Null optimized state. This shouldn't happen.");
                return optimized;
            }
            
            /* If we didn't return an optimized path, return an unoptimized one. */
                        
            return s1.makeState();
        }
    }

    /** @return the stop where this board/alight edge is located. */
    private Stop getStop() {
        PatternStopVertex stopVertex = (PatternStopVertex) (boarding ? tov : fromv);
        return stopVertex.getStop();
    }

    public State optimisticTraverse(State state0) {
        StateEditor s1 = state0.edit(this);
        // no cost (see patternalight)
        s1.setBackMode(getMode());
        return s1.makeState();
    }

    /* See weightLowerBound comment. */
    public double timeLowerBound(RoutingRequest options) {
        if ((options.arriveBy && boarding) || (!options.arriveBy && !boarding)) {
            if (!options.modes.get(modeMask)) {
                return Double.POSITIVE_INFINITY;
            }
            BitSet services = getPattern().services;
            for (ServiceDay sd : options.rctx.serviceDays) {
                if (sd.anyServiceRunning(services)) return 0;
            }
            return Double.POSITIVE_INFINITY;
        } else {
            return 0;
        }
    }

    /* If the main search is proceeding backward, the lower bound search is proceeding forward.
     * Check the mode or serviceIds of this pattern at board time to see whether this pattern is
     * worth exploring. If the main search is proceeding forward, board cost is added at board
     * edges. The lower bound search is proceeding backward, and if it has reached a board edge the
     * pattern was already deemed useful. */
    public double weightLowerBound(RoutingRequest options) {
        // return 0; // for testing/comparison, since 0 is always a valid heuristic value
        if ((options.arriveBy && boarding) || (!options.arriveBy && !boarding))
            return timeLowerBound(options);
        else
            return options.getBoardCostLowerBound();
    }

    @Override
    public int getStopIndex() {
        return stopIndex;
    }

    public String toString() {
        return "TransitBoardAlight(" +
                (boarding ? "boarding " : "alighting ") +
                getFromVertex() + " to " + getToVertex() + ")";
    }

}
