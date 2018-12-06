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

package org.opentripplanner.routing.impl;

import com.SynchroNET.routing.algorithm.SynchroStar;
import com.SynchroNET.routing.algorithm.strategies.SynchroHeuristic;
import com.google.common.collect.Lists;
import org.onebusaway.gtfs.model.AgencyAndId;
import org.opentripplanner.common.model.GenericLocation;
import org.opentripplanner.routing.algorithm.AStar;
import org.opentripplanner.routing.algorithm.strategies.EuclideanRemainingWeightHeuristic;
import org.opentripplanner.routing.algorithm.strategies.InterleavedBidirectionalHeuristic;
import org.opentripplanner.routing.algorithm.strategies.RemainingWeightHeuristic;
import org.opentripplanner.routing.algorithm.strategies.TrivialRemainingWeightHeuristic;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.edgetype.LegSwitchingEdge;
import org.opentripplanner.routing.error.PathNotFoundException;
import org.opentripplanner.routing.error.VertexNotFoundException;
import org.opentripplanner.routing.graph.Edge;
import org.opentripplanner.routing.graph.Vertex;
import org.opentripplanner.routing.request.BannedStopSet;
import org.opentripplanner.routing.spt.DominanceFunction;
import org.opentripplanner.routing.spt.GraphPath;
import org.opentripplanner.standalone.Router;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
//import org.opentripplanner.api.model.PlaceP;



import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;

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
public class GraphPathFinder {

    private static final Logger LOG = LoggerFactory.getLogger(GraphPathFinder.class);
    private static final double DEFAULT_MAX_WALK = 2000;
    private static final double CLAMP_MAX_WALK = 15000;

    Router router;
    //List<PlaceP> OriginDestination = Lists.newArrayList();

    public GraphPathFinder(Router router) {
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
    	System.out.println("routeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");


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
      //=1 then min weight; =2 then min duration; =3 then earliest arrival time
       /* if (options.choiceOPT == 1) 
        	options.dominanceFunction = new DominanceFunction.MinimumWeight(); // FORCING the dominance function to weight only
        else if (options.choiceOPT == 2)  options.dominanceFunction = new DominanceFunction.MinimumDuration(); //PHUONG: FORCING the dominance function to duration only
        else if (options.choiceOPT == 3)  options.dominanceFunction = new DominanceFunction.EarliestArrival(); //PHUONG: FORCING the dominance function to earliest arrival only
        */
        //options.dominanceFunction = new DominanceFunction.MinimumWeight(); // FORCING the dominance function to weight only
        LOG.debug("rreq={}", options);

        // Choose an appropriate heuristic for goal direction.
        RemainingWeightHeuristic heuristic;
        if (options.disableRemainingWeightHeuristic) { //default = false
            heuristic = new TrivialRemainingWeightHeuristic();
        } else if (options.modes.isTransit()) {
            // Only use the BiDi heuristic for transit. It is not very useful for on-street modes.
            // heuristic = new InterleavedBidirectionalHeuristic(options.rctx.graph);
            // Use a simplistic heuristic until BiDi heuristic is improved, see #2153
        	//heuristic = new EuclideanRemainingWeightHeuristic();
            heuristic = new InterleavedBidirectionalHeuristic();
        } else {
            heuristic = new EuclideanRemainingWeightHeuristic();
        }
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
        if (options.KPIimportance) {
            findShortestPaths_DifferentWeight(paths,options,false);  
        }
        else{ //not options.KPIimportance
        	 options.co2_w = 1.0; options.distance_w = 1.0; options.time_w = 1.0;
             findShortestPaths_DifferentWeight(paths,options,false);
             if (!options.slowSteaming)
             {
                 options.distance_w = 0.0; options.time_w = 0.0;
                 findShortestPaths_DifferentWeight(paths,options,false);

                 options.co2_w = 0.0; options.distance_w = 1.0; options.bannedTrips.clear();
                 findShortestPaths_DifferentWeight(paths,options,false);
                 options.distance_w = 0.0; options.time_w = 1.0;options.bannedTrips.clear();
                 findShortestPaths_DifferentWeight(paths,options,false);
                 
                 int iP=1, jP=1,kP=1;
                 options.co2_w = 0.0; int step = 4;
                 boolean stop = false;
                 for (iP=1; iP<=9;iP+=step)
                 {
                 	options.co2_w += (double)iP;
                 	options.distance_w = 0.0;
                 	for (jP=1;jP<=9;jP+=step)
                 	{
                 		options.distance_w += (double)jP;
                 		options.time_w = 0.0;
                 		for (kP=1;kP<=9;kP+=step)
                 		{
                 			options.time_w += (double)kP;
                 			if (iP==kP && kP==jP) continue;
                 			options.bannedTrips.clear();
                 			findShortestPaths_DifferentWeight(paths,options,false);
                 	        if (paths.size() >= options.numItineraries) stop = true;
                 		}//end for k
                 		if (stop) break;
                 	}//end for j
         			if (stop) break;
                 }//end for i
                 
             	
             }
             
             /*AT THIS POINT, WE GET ALL THE FINAL ITINERARIES STORED in the paths variable
               WE SEND THEM TO THE RISK (RAO), and wait for the RISK VALUE FOR EACH ITINERARY
               method(intput,output,timeout)
               
             */
             LOG.info("END SEARCH ({} msec)", System.currentTimeMillis() - searchBeginTime);
             LOG.info("Cost CO2 {})", options.co2_cost_per_kg);
        }//end not options.KPIimportance
   
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
	         		   	LOG.info("Path {}: cost = {}; CO2 = {}; duration = {}; distance = {} ",k,path.getWeight(), path.getCO2(), path.getDuration(), path.getDistance());
	     		 		k++;
	              }
	             
	             
	           //sort Results presented on the web use-interface: 0: weight ascending; 1: C02 ascending; 2:duration ascending,  3: distance ascending; 4:departure ascending; 5: arrival ascending
	           	Collections.sort(paths, new PathComparatorPhuong(options.sortResultType)); //PHUONG: sort obtained paths 
	            	// Collections.sort(paths, new PathComparator(options.arriveBy)); //PHUONG: sort obtained paths
	             															  //For depart-after [arriveby = false] search results sort by arrival time ascending
	           	LOG.info("After SORTING");
	         	k = 0;
	         	for (GraphPath path : paths) {
	         		    double cc = path.states.getLast().costCO2 + path.states.getLast().costDistance + path.states.getLast().costTime;
	         		   	LOG.info("Path {}: cost = {} !{}, CO2 = {}; duration = {}; distance = {}; ",k,path.getWeight(),cc, path.getDuration(), path.getDistance());
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
    	 AStar aStar = new AStar();
   	    /** Do not use certain trips */
   	    HashMap<AgencyAndId, BannedStopSet> bannedTrip = new HashMap<AgencyAndId, BannedStopSet>();

   	     double timeout = 100.0;

   	     int num = 0; boolean cont = true;
   	     while (paths.size() < options.numItineraries) 
         {

   	    	 num++;
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
            	 if (bannedTrip.isEmpty()) break;
            	 options.bannedTrips.clear();
            	 options.bannedTrips = bannedTrip;
            	 LOG.info("size of firstBan = {}, size of option = {}",bannedTrip.size(),options.bannedTrips.size());
            	 cont = false;
            	
             }
             else
             {
            	 for (GraphPath path : newPaths) { //BUC1.Remove banned trip for the next search
                     // path.dump();
                     List<AgencyAndId> tripIds = path.getTrips();
                     for (AgencyAndId tripId : tripIds) {
                         options.banTrip(tripId);
                         LOG.info("banned tripID = {}",tripId);
                         //break;
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
                     if (count == size) 
                    	 {
                    	 		LOG.info("Does not find any new paths");
                    	 		if (cont == false) {LOG.info("STOP");break;}
                    	 }
                 }
                 LOG.info("--> we have {} paths ", paths.size());
             }
             int si = options.bannedTrips.size();
             LOG.info("Number of bannedTrips = {}",si);
             for (AgencyAndId ret : options.bannedTrips.keySet())
             	LOG.info("Banned trip {}",ret.getId());
             singleAstarDuration = System.currentTimeMillis() - singleAstarDuration;
             LOG.info("Time to execute Astar " + num + ": " + singleAstarDuration + "ms");
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
            //COMMENT - Riccardo (08/03/2017): Record the time that we needed to calculate the paths
            request.rctx.debugOutput.finishedCalculating();
        } catch (VertexNotFoundException e) {
            LOG.info("Vertex not found: " + request.from + " : " + request.to);
            throw e;
        }

        if (paths == null || paths.size() == 0) {
            LOG.debug("Path not found: " + request.from + " : " + request.to);
            request.rctx.debugOutput.finishedRendering(); // make sure we still report full search time
            throw new PathNotFoundException();
        }

        /* Detect and report that most obnoxious of bugs: path reversal asymmetry. */
        Iterator<GraphPath> gpi = paths.iterator();
        while (gpi.hasNext()) {
            GraphPath graphPath = gpi.next();
            // TODO check, is it possible that arriveBy and time are modifed in-place by the search?
            if (request.arriveBy) {
                if (graphPath.states.getLast().getTimeSeconds() > request.dateTime) {
                    LOG.error("A graph path arrives after the requested time. This implies a bug.");
                    gpi.remove();
                }
            } else {
                if (graphPath.states.getFirst().getTimeSeconds() < request.dateTime) {
                    LOG.error("A graph path leaves before the requested time. This implies a bug.");
                    gpi.remove();
                }
            }
        }
        return paths;
    }

    /**
     * Break up a RoutingRequest with intermediate places into separate requests, in the given order.
     * If there are no intermediate places, issue a single request.
     */
    private List<GraphPath> getGraphPathsConsideringIntermediates (RoutingRequest request) {
        if (request.hasIntermediatePlaces()) {
            long time = request.dateTime;
            GenericLocation from = request.from;
            List<GenericLocation> places = Lists.newLinkedList(request.intermediatePlaces);
            places.add(request.to);
            request.clearIntermediatePlaces();
            List<GraphPath> paths = new ArrayList<>();

            for (GenericLocation to : places) {
                request.dateTime = time;
                request.from = from;
                request.to = to;
                request.rctx = null;
                request.setRoutingContext(router.graph);
                // TODO request only one itinerary here

                List<GraphPath> partialPaths = getPaths(request);
                if (partialPaths == null || partialPaths.size() == 0) {
                    return null;
                }
                
                GraphPath path = partialPaths.get(0);
                paths.add(path);
                from = to;
                time = path.getEndTime();
                
            }

            return Arrays.asList(joinPaths(paths));
        } else {
            return getPaths(request);
        }
    }

    private static GraphPath joinPaths(List<GraphPath> paths) {
        State lastState = paths.get(0).states.getLast();
        GraphPath newPath = new GraphPath(lastState, false);
        Vertex lastVertex = lastState.getVertex();
        for (GraphPath path : paths.subList(1, paths.size())) {
            lastState = newPath.states.getLast();
            // add a leg-switching state
            LegSwitchingEdge legSwitchingEdge = new LegSwitchingEdge(lastVertex, lastVertex);
            lastState = legSwitchingEdge.traverse(lastState);
            newPath.edges.add(legSwitchingEdge);
            newPath.states.add(lastState);
            // add the next subpath
            for (Edge e : path.edges) {
                lastState = e.traverse(lastState);
                newPath.edges.add(e);
                newPath.states.add(lastState);
            }
            lastVertex = path.getEndVertex();
        }
        return newPath;
    }

/*
    TODO reimplement
    This should probably be done with a special value in the departure/arrival time.

    public static TripPlan generateFirstTrip(RoutingRequest request) {
        request.setArriveBy(false);

        TimeZone tz = graph.getTimeZone();

        GregorianCalendar calendar = new GregorianCalendar(tz);
        calendar.setTimeInMillis(request.dateTime * 1000);
        calendar.set(Calendar.HOUR, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.AM_PM, 0);
        calendar.set(Calendar.SECOND, graph.index.overnightBreak);

        request.dateTime = calendar.getTimeInMillis() / 1000;
        return generate(request);
    }

    public static TripPlan generateLastTrip(RoutingRequest request) {
        request.setArriveBy(true);

        TimeZone tz = graph.getTimeZone();

        GregorianCalendar calendar = new GregorianCalendar(tz);
        calendar.setTimeInMillis(request.dateTime * 1000);
        calendar.set(Calendar.HOUR, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.AM_PM, 0);
        calendar.set(Calendar.SECOND, graph.index.overnightBreak);
        calendar.add(Calendar.DAY_OF_YEAR, 1);

        request.dateTime = calendar.getTimeInMillis() / 1000;

        return generate(request);
    }
*/

}
