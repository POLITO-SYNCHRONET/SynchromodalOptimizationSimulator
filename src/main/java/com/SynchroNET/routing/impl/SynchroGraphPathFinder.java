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

package com.SynchroNET.routing.impl;

import com.SynchroNET.api.resource.GTFSResource;
import com.SynchroNET.api.resource.GTFSRoute;
import com.SynchroNET.routing.algorithm.SynchroStar;
import com.SynchroNET.routing.algorithm.strategies.SynchroHeuristic;
import com.SynchroNET.utilities.QualityCalculator;
import com.beust.jcommander.internal.Sets;
import com.google.common.collect.Lists;
import org.onebusaway.gtfs.model.AgencyAndId;
import org.onebusaway.gtfs.model.Route;
import org.onebusaway.gtfs.model.Stop;
import org.onebusaway.gtfs.serialization.GtfsReader;
import org.opentripplanner.common.model.GenericLocation;
import org.opentripplanner.gtfs.GtfsLibrary;
import org.opentripplanner.routing.algorithm.strategies.RemainingWeightHeuristic;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.edgetype.LegSwitchingEdge;
import org.opentripplanner.routing.edgetype.PatternHop;
import org.opentripplanner.routing.edgetype.TripPattern;
import org.opentripplanner.routing.error.PathNotFoundException;
import org.opentripplanner.routing.error.VertexNotFoundException;
import org.opentripplanner.routing.graph.Edge;
import org.opentripplanner.routing.graph.GraphIndex;
import org.opentripplanner.routing.graph.Vertex;
import org.opentripplanner.routing.impl.GraphPathFinder;
import org.opentripplanner.routing.impl.PathComparatorPhuong;
import org.opentripplanner.routing.request.BannedStopSet;
import org.opentripplanner.routing.spt.DominanceFunction;
import org.opentripplanner.routing.spt.GraphPath;
import org.opentripplanner.standalone.Router;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
//import org.opentripplanner.api.model.PlaceP;



import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

/**
 * This class contains the logic for repeatedly building shortest path trees and accumulating paths through
 * the graph until the requested number of them have been found.
 * It is used in point-to-point (i.e. not one-to-many / analyst) routing.
 *
 * Its exact behavior will depend on whether the routing request allows transit.
 *
 * When using transit it will incorporate techniques from what we called "long distance" mode, which is designed to
 * provide reasonable response times when routing over large graphs (e.g. the entire Netherlands or New York State).
 * In this case it only uses the street network at the first and last legs of the trip, and all other transfers
 * between transit vehicles will occur via SimpleTransfer edges which are pre-computed by the graph builder.
 * 
 * More information is available on the OTP wiki at:
 * https://github.com/openplans/OpenTripPlanner/wiki/LargeGraphs
 *
 * One instance of this class should be constructed per search (i.e. per RoutingRequest: it is request-scoped).
 * Its behavior is undefined if it is reused for more than one search.
 *
 * It is very close to being an abstract library class with only static functions. However it turns out to be convenient
 * and harmless to have the OTPServer object etc. in fields, to avoid passing context around in function parameters.
 */
public class SynchroGraphPathFinder {

    private static final Logger LOG = LoggerFactory.getLogger(GraphPathFinder.class);
    private static final double DEFAULT_MAX_WALK = 2000;
    private static final double CLAMP_MAX_WALK = 15000;

    Router router;
    //List<PlaceP> OriginDestination = Lists.newArrayList();

    public SynchroGraphPathFinder(Router router) {
        this.router = router;
        //this.OriginDestination = Lists.newArrayList();
        
    }

    /**
     * Repeatedly build shortest path trees, retaining the best path to the destination after each try.
     * For search N, all trips used in itineraries retained from trips 0..(N-1) are "banned" to create variety.
     * The goal direction heuristic is reused between tries, which means the later tries have more information to
     * work with (in the case of the more sophisticated bidirectional heuristic, which improves over time).
     */
    public List<GraphPath> getPaths(RoutingRequest options) {

        if (options == null) {
            LOG.error("PathService was passed a null routing request.");
            return null;
        }


        // Reuse one instance of AStar for all N requests, which are carried out sequentially
        //AStar aStar = new AStar();
        if (options.rctx == null) {
            options.setRoutingContext(router.graph);
            // The special long-distance heuristic should be sufficient to constrain the search to the right area.
        }
        
        // Without transit, we'd just just return multiple copies of the same on-street itinerary.
        if (!options.modes.isTransit()) {
            options.numItineraries = 1;
        }

        options.dominanceFunction = new DominanceFunction.MinimumWeight(); // FORCING the dominance function to weight only

        LOG.debug("rreq={}", options);

        RemainingWeightHeuristic heuristic = new SynchroHeuristic();
        options.rctx.remainingWeightHeuristic = heuristic;

        /* In RoutingRequest, maxTransfers defaults to 2. Over long distances, we may see
         * itineraries with far more transfers. We do not expect transfer limiting to improve
         * search times on the LongDistancePathService, so we set it to the maximum we ever expect
         * to see. Because people may use either the traditional path services or the 
         * LongDistancePathService, we do not change the global default but override it here. */
        options.maxTransfers = 10;
        // Now we always use what used to be called longDistance mode. Non-longDistance mode is no longer supported.
        options.longDistance = true;

        /* In long distance mode, maxWalk has a different meaning than it used to.
         * It's the radius around the origin or destination within which you can walk on the streets.
         * If no value is provided, max walk defaults to the largest double-precision float.
         * This would cause long distance mode to do unbounded street searches and consider the whole graph walkable. */
        if (options.maxWalkDistance == Double.MAX_VALUE) options.maxWalkDistance = DEFAULT_MAX_WALK;
        if (options.maxWalkDistance > CLAMP_MAX_WALK) options.maxWalkDistance = CLAMP_MAX_WALK;
        long searchBeginTime = System.currentTimeMillis();
        LOG.debug("BEGIN SEARCH");
        List<GraphPath> paths = Lists.newArrayList();
//        findShortestPaths_DifferentWeight(paths,options,false);  
        
        //DELETE IT LATER
        double co2_w = options.co2_w; double time_w = options.time_w; double distance_w = options.distance_w;
//   	 options.co2_w = 1.0; options.distance_w = 1.0; options.time_w = 1.0;
        findShortestPaths_DifferentWeight(paths,options,false);
        
	   	 //Riccardo (12-07-2017): avoid duplicated GraphPath
//	   	 for(int i = 0; i < paths.size() - 1; i++){
//	   		 for(int j = 1; j < paths.size(); j++){
//	   			 if(paths.get(i).equals(paths.get(j))){
//	   				paths.remove(j);
//	   			 }
//	   		 }
//	   	 }
	   	 //Riccardo (12-07-2017): END
	   	 
	   	//Shuai (11-01-2018): function for avoiding duplicated rework
	   	for(int i = 0; i < paths.size() - 1; i++){
			for(int j = i+1; j < paths.size(); j++){
				if(paths.get(i).equals(paths.get(j))){
					paths.remove(j);
					j--;
				}
			}
	   	}

        LOG.info("END SEARCH ({} msec)", System.currentTimeMillis() - searchBeginTime);
        //LOG.info("Cost CO2 {})", options.co2_cost_per_kg);
   
        if (options.slowSteaming == true)
        {
        	int tt = 2;
        	Collections.sort(paths, new PathComparatorPhuong(tt)); //PHUONG: sort obtained paths duration
       		GraphPath path = paths.get(0);  path.velocity = 20.0;
       		path = paths.get(1);  path.velocity = 15.0;   
       		path = paths.get(2);  path.velocity = 10.0;   
        }
        if (options.timeArriveVisible == false)
        {
                 if (options.sortResultType == 0)
	             	LOG.info("options.sortResultType0 = {} ", options.sortResultType);
	             else if (options.sortResultType == 1)
	             	LOG.info("options.sortResultType1 = {} ", options.sortResultType);
	             else if (options.sortResultType == 2)
	             	LOG.info("options.sortResultType2 = {} ", options.sortResultType);
	             else if (options.sortResultType == 3)
	             	LOG.info("options.sortResultType3 = {} ", options.sortResultType);
	             
	         	LOG.info("BEFORE SORTING"); 
	         	int k = 0;
	         	 for (GraphPath path : paths) {
	         		 //  	LOG.info("Path {}: cost = {}; CO2 = {}; duration = {}; distance = {} ",k,path.getWeight(), path.getCO2(), path.getDuration(), path.getDistance()); 
	     		 		k++;
	              }
	             
	             
	           //sort Results presented on the web use-interface: 0: weight ascending; 1: C02 ascending; 2:duration ascending,  3: distance ascending; 4:departure ascending; 5: arrival ascending
//	           	Collections.sort(paths, new PathComparatorPhuong(options.sortResultType)); //PHUONG: sort obtained paths //Riccardo: Obsolete sorting
	            	// Collections.sort(paths, new PathComparator(options.arriveBy)); //PHUONG: sort obtained paths
	         	 QualityCalculator.calculatePathsQuality(paths, options);//Riccardo (10-05-2017) - right sorting by quality
	         	 //For depart-after [arriveby = false] search results sort by arrival time ascending
	           	LOG.info("After SORTING"); 
	         	k = 0;
	         	for (GraphPath path : paths) {
	         		    double cc = path.states.getLast().costCO2 + path.states.getLast().costDistance + path.states.getLast().costTime;
	         		   	LOG.info("Path {}: cost = {}; CO2 = {}; duration = {}; distance = {}; ",k,path.getWeight(),path.getCO2(), path.getDuration(), path.getDistance()); 
	     		 		k++;
	            } 
	         	return paths;
         }
         else
         {
        	    int sortT = 5;
        		Collections.sort(paths, new PathComparatorPhuong(sortT)); //PHUONG: sort obtained paths according to arrival time [ascending]
        		List<GraphPath> pathsN = Lists.newArrayList();
        		int k = 0;
        		for (GraphPath path : paths) {
        			if (path.getEndTime() <= options.dateTimeArrive)
        				{
        					pathsN.add(k,path);
        					k++;
        				}
        			else break;
                }
        		LOG.info("BEFORE SORTING with time windows");
	         	k = 0;
	         	for (GraphPath path : pathsN) {
	         		    LOG.info("Path {}: cost = {}; CO2 = {}; duration = {}; distance = {} ",k,path.getWeight(), path.getCO2(), path.getDuration(), path.getDistance());
	         		    LOG.info("path.getEndTime = {}; options.dateTimeArrive = {}; delta = {} ",path.getEndTime(), options.dateTimeArrive, (path.getEndTime() - options.dateTimeArrive));
	     		 		k++;
	            }
	             
	             
	           //sort Results presented on the web use-interface: 0: weight ascending; 1: C02 ascending; 2:duration ascending,  3: distance ascending; 4:departure ascending; 5: arrival ascending
	           	Collections.sort(pathsN, new PathComparatorPhuong(options.sortResultType)); //PHUONG: sort obtained paths 
	           	LOG.info("After SORTING with time windows");
	         	k = 0;
	         	for (GraphPath path : pathsN) {
	         		   	LOG.info("Path {}: cost = {}; CO2 = {}; duration = {}; distance = {} ",k,path.getWeight(), path.getCO2(), path.getDuration(), path.getDistance());
	     		 		k++;
	            } 
	         	return pathsN;
         }
       
    }

    public void findShortestPaths_DifferentWeight(List<GraphPath> paths, RoutingRequest options, boolean addAll) {

    	 LOG.info("CO2 = {}, time = {}, distance = {}", options.co2_w, options.time_w,options.distance_w);
    	 SynchroStar aStar = new SynchroStar();
   	    /** Do not use certain trips */
   	    HashMap<AgencyAndId, BannedStopSet> bannedTrip = new HashMap<AgencyAndId, BannedStopSet>();

   	     double timeout = 100.0;

   	     int num = 0; boolean cont = true;
    	 boolean banAll = false;
    	 LOG.info("Destination " + options.to.toString());
   	     while (paths.size() < options.numItineraries) 
         {
   	    	 long singleAstarDuration = System.currentTimeMillis();
         	 LOG.info("The call Astar number {})", num); 
             aStar.getShortestPathTree(options, timeout); //PHUONG: = startSearch + runSearch [iterate]; 
             if (options.rctx.aborted) {
                 break; // Search timed out or was gracefully aborted for some other reason.
             }
             // Don't dig through the SPT object, just ask the A star algorithm for the states that reached the target.
             List<GraphPath> newPaths = aStar.getPathsToTarget();
             if (newPaths.isEmpty()) {
            	 LOG.info("Does not find any new path");
            	 if (bannedTrip.isEmpty()) {
                	 //Riccardo: do again the search without truck limitation
                	 if(!options.fromTruckToTruck && paths.isEmpty()) {
                		 LOG.info("Try without from Truck to Truck ban");
                		 options.fromTruckToTruck = true;
                		 continue;
                	 } else break;
            	 }
            	 options.bannedTrips.clear();
            	 options.bannedTrips = bannedTrip;
            	 LOG.info("size of firstBan = {}, size of option = {}",bannedTrip.size(),options.bannedTrips.size());
            	 cont = false;
            	 

             } else {

            	 for (GraphPath path : newPaths) { //BUC1.Remove banned trip for the next search
                     // path.dump();
            	  		
                     List<AgencyAndId> tripIds = path.getTrips();
                     //options.banTrip(tripIds.get(0));//Riccardo Ban just the first one
                     for (int i = 0; i < tripIds.size(); i++) {
//                    	 if(i == 0 && tripIds.size() > 1) continue;
//                    	 if(i == tripIds.size() - 1 && tripIds.size() > 2) continue;
                    	 AgencyAndId tripId = tripIds.get(i);
                    	 
                    	 //Riccardo don't ban a trip if the stop has too few links (< 2)
                    	 GraphIndex index = router.graph.index;
                         TripPattern pattern = index.patternForTrip.get(index.tripForId.get(tripId));
                         Stop stop = pattern.getStops().get(0);
                         Set<TripPattern> patterns = new HashSet<TripPattern>(index.patternsForStop.get(stop));
                         int link = patterns.size();
                         if(link > 2 || banAll){
                        	 options.banTrip(tripId);
                          //   LOG.info("banned tripID = {}",tripId);
                         } else {
                          //   LOG.info("Don't ban tripID = {}",tripId);
                         }
                     }
                     	
                     if (tripIds.isEmpty()) {
                         // This path does not use transit (is entirely on-street). Do not repeatedly find the same one.
                         options.onlyTransitTrips = true;
                     }
                 }     
            	 bannedTrip.clear();
            	 for (GraphPath path : newPaths) { //BUC1.Remove banned trip for the next search
                     List<AgencyAndId> tripIds = path.getTrips();
                     for (AgencyAndId tripId : tripIds) {
                    	 bannedTrip.put(tripId, BannedStopSet.ALL);
                         break;
                     }
                     break;
                 }     
                 if (addAll)  paths.addAll(newPaths);
                 else 
                 {   //checking the similarity before adding to the results
                	int count = 0;
                    int size = newPaths.size();
                     for (GraphPath path : newPaths) {
                     	if (!path.similarPaths(paths)) 
                     		paths.add(path);
                     	else count++;
                     }

                     if (count == size) {
             	 		LOG.info("Does not find any new paths");
             	 		//ban all routes found if the result are the same of the previous one
             	 		if (!banAll) {
             	 			banAll = true;  
             	 			for (GraphPath path : newPaths) {
                                List<AgencyAndId> tripIds = path.getTrips();
                                for (int i = 0; i < tripIds.size(); i++) {
                                	AgencyAndId tripId = tripIds.get(i);
                                	options.banTrip(tripId);
                                	bannedTrip.put(tripId, BannedStopSet.ALL);
                                }
             	 			}
                           	 
             	 		} else {
             	 			LOG.info("STOP");
             	 			break;
             	 		}
                     }
                 }
                 LOG.info("--> we have {} paths ", paths.size()); 
             }
             int si = options.bannedTrips.size();
            // LOG.info("Number of bannedTrips = {}",si); 
             for (AgencyAndId ret : options.bannedTrips.keySet())
             	LOG.info("Banned trip {}",ret); 
             singleAstarDuration = System.currentTimeMillis() - singleAstarDuration;
           //  LOG.info("Time to execute Astar " + num + ": " + singleAstarDuration + "ms"); 
             
//             if(newPaths.isEmpty()) break; //EDIT - Riccardo (31/03/2017): Stop the search if it can't find new paths
             num++;
         }
    }

    /* Try to find N paths through the Graph */
    public List<GraphPath> graphPathFinderEntryPoint (RoutingRequest request) {

        // We used to perform a protective clone of the RoutingRequest here.
        // There is no reason to do this if we don't modify the request.
        // Any code that changes them should be performing the copy!

        List<GraphPath> paths = null;
        try {
            //COMMENT - Riccardo (13/03/2017): try to find the paths, if there aren't it tries again with an edited request.
        	//wheelchairAccessible is necessary?
        	
            paths = getGraphPathsConsideringIntermediates(request);
            
            if (paths == null && request.wheelchairAccessible) {
                // There are no paths that meet the user's slope restrictions.
                // Try again without slope restrictions, and warn the user in the response.
                RoutingRequest relaxedRequest = request.clone();
                relaxedRequest.maxSlope = Double.MAX_VALUE;
                request.rctx.slopeRestrictionRemoved = true;
                paths = getGraphPathsConsideringIntermediates(relaxedRequest);
            }
            //COMMENT - Riccardo (13/03/2017): END
            request.rctx.debugOutput.finishedCalculating();
        } catch (VertexNotFoundException e) {
            LOG.info("Vertex not found: " + request.from + " : " + request.to);
            throw e;
        }

        if (paths == null || paths.size() == 0) {
            LOG.debug("Path not found: " + request.from + " : " + request.to);
            request.rctx.debugOutput.finishedRendering(); // make sure we still report full search time
            //throw new PathNotFoundException();
        }

        /* Detect and report that most obnoxious of bugs: path reversal asymmetry. */
//        Iterator<GraphPath> gpi = paths.iterator();
//        while (gpi.hasNext()) {
//            GraphPath graphPath = gpi.next();
//            // TODO check, is it possible that arriveBy and time are modifed in-place by the search?
//            if (request.arriveBy) {
//                if (graphPath.states.getLast().getTimeSeconds() > request.dateTime) {
//                    LOG.error("A graph path arrives after the requested time. This implies a bug.");
//                    gpi.remove();
//                }
//            } else {
//                if (graphPath.states.getFirst().getTimeSeconds() < request.dateTime) {
//                    LOG.error("A graph path leaves before the requested time. This implies a bug.");
//                    //COMMENT - Riccardo (02/05/2017): commented because had conflicts with intermediate places
////                    gpi.remove();
//                    //COMMENT - Riccardo (02/05/2017): END
//                }
//            }
//        }
        return paths;
    }

    /**
     * Break up a RoutingRequest with intermediate places into separate requests, in the given order.
     * If there are no intermediate places, issue a single request.
     */
    private List<GraphPath> getGraphPathsConsideringIntermediates (RoutingRequest request) {
    	//System.out.println(request.dateTime);
    	if (request.hasIntermediatePlaces()) {
    		
    		//Shuai(24-07-2018) keep the original dateTime since trip plan stores this value for comparison of time.
    		long originDate = request.dateTime;
    		
            long time = request.dateTime;
            GenericLocation from = request.from;
            List<GenericLocation> places = Lists.newLinkedList(request.intermediatePlaces);
            places.add(request.to);
            request.clearIntermediatePlaces();
            List<List<GraphPath>> paths = new ArrayList<>();
            int NItinerary = 5;
            request.numItineraries = NItinerary;
            int copy = -1;
            
        	for (int node = 0; node < places.size(); node++) {
        		GenericLocation to = places.get(node);
                request.from = from;
                request.to = to;
                request.rctx = null;
                request.setRoutingContext(router.graph);
                
                int loops = paths.size() != 0 ? paths.size() : 1;
                //iterate all the partial trips
                for (int i = 0; i < loops; i++){
                	
                	//skip if there aren't partials
                    if(paths.size() != 0) {                    	
                    	List<GraphPath> singlePath = paths.get(i);
                    	GraphPath lastPath = singlePath.get(singlePath.size() - 1);
                    	time = lastPath.getEndTime() + lastPath.states.getLast().alighting;   
//                    	request.numItineraries = 1;
                    }

                    request.dateTime = time;

                    //search for partial Paths,
                    //remove this path if no partial are found and return null if there aren't other paths 
                    List<GraphPath> partialPaths = getPaths(request.clone());
                    if (partialPaths == null || partialPaths.size() == 0) {
                    	if(paths.size() > 1) {
                    		paths.remove(i);
                    		i--;
                    		continue;
                    	}
                    	else return null;
                    }
                       
                    //add partial paths
                    if(paths.size() == 0) {
                    	//copy all the partial starting points
                    	for(int j = 0; j < NItinerary; j++) {
                    		int index = j;
                    		if(j >= partialPaths.size()) {
                    			index = 0;
                    			if(copy == -1) copy = j;
                    		}
                    		paths.add(new ArrayList<>());
                    		paths.get(j).add(partialPaths.get(index));
                    	}
                    } else {
                    	//add partial
//                        System.out.println("Copy " + copy + " J: " + i + " Index: " + 0 + " Loop " + loops + " size " + partialPaths.size());
                    	paths.get(i).add(partialPaths.get(0));
                    	//check for copy
                    	if(i == 0 && copy >= 0) {
                    		int index = 1;
                    		boolean wasCopied = false;
                    		//iterate all the copies  
                    		for(int j = copy; j < NItinerary; j++){

                    			//if there aren't other new paths for the second part
                        		if(index >= partialPaths.size()) {
                        			//prepare to make a copy of the first itinerary
                        			index = 0;
                        			wasCopied = true;
                        			if(copy == -1) copy = j;
                        		}
//                                System.out.println("Copy " + copy + " J: " + j + " Index: " + index + " Loop " + loops + " size " + partialPaths.size());
                        		//add partial
                        		paths.get(j).add(partialPaths.get(index));
                        		if(j == NItinerary - 1 && !wasCopied && copy >= 0) copy = -1;
                        		loops--;
                        		if(index != 0) {
                        			index++;
                        			copy++;
                        		}
                    		}
                    	}
                    }
                } 
                
                from = to;
            }
            
        	List<GraphPath> finalPaths = new ArrayList<>();
        	
        	for(List<GraphPath> singlePaths : paths){
        		GraphPath newPath = joinPaths(singlePaths).get(0);
        		if(!newPath.similarPaths(finalPaths)) finalPaths.add(newPath);
        	}
        	
            return finalPaths;
//                time = path.getEndTime();       
//                System.out.println("time: " + time);
//            }
//            
//            request.dateTime = originDate;
//            
//            return joinPaths(paths);//EDIT - Riccardo (03/05/2017): remove Arrays.asList
        } else {
            return getPaths(request);
        }
    }

    private static ArrayList<GraphPath> joinPaths(List<GraphPath> paths) {//COMMENT - Riccardo (02/05/2017): return array list instead of GraphPath
        State lastState = paths.get(0).states.getLast();
        GraphPath newPath = new GraphPath(lastState, false);
        

  		
        Vertex lastVertex = lastState.getVertex();
        for (GraphPath path : paths.subList(1, paths.size())) {
      		
            lastState = newPath.states.getLast();
            // add a leg-switching state
//            LegSwitchingEdge legSwitchingEdge = new LegSwitchingEdge(lastVertex, lastVertex);
//            lastState = legSwitchingEdge.traverse(lastState);
//            newPath.edges.add(legSwitchingEdge);
//            newPath.states.add(lastState);
            // add the next subpath
//            for (Edge e : path.edges) {
//                lastState = e.traverse(lastState);
//                newPath.edges.add(e);
//                newPath.states.add(lastState);
//            }
            
            for(int i = 1; i < path.states.size(); i++){
            	State state = path.states.get(i);
            	
            	if(i == 1) {
            		state.setBackState(newPath.states.getLast());
            	}
            	
            	Edge e = path.edges.get(i - 1);
                newPath.edges.add(e);
            	newPath.states.add(state);
            }
            
            lastVertex = path.getEndVertex();
            
        }
        ArrayList<GraphPath> newPaths = new ArrayList<>();
        newPaths.add(newPath);
        
//        System.out.println();
//  		State state = newPath.states.getLast();
//  		do{
//        	Calendar c = Calendar.getInstance();
//        	c.setTimeInMillis(state.getTimeSeconds() * 1000);
//            if(state.getBackEdge() != null && state.getBackEdge().getClass().equals(PatternHop.class)) System.out.println(state.getRoute() + " " + (state.getBackEdge() != null ? state.getBackEdge().getClass() : null) + " " + c.getTime());	      		
//  		} while((state = state.getBackState()) != null);	
        
        return newPaths;
    }

}
