package com.SynchroNET.risk.montecarlo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.eclipse.xsd.ecore.XSDEcoreBuilder.Comparator;
import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.gtfs.GtfsLibrary;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.routing.graph.GraphIndex;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.risk.profiler.DisturbanceGeneration;
import com.SynchroNET.risk.profiler.RiskDataBaseManager;
import com.SynchroNET.utilities.SpecialRouteFinder;

public class MonteCarlo {
    private static final Logger LOG = LoggerFactory.getLogger(MonteCarlo.class);
    private final double standardMode = 0.05;
    private final double standardPath = 0.025;
    // MCwidth could be adjusted according to the different need
	int MCwidth = 25;
	SpecialRouteFinder srf = null;
	RoutingRequest request = null;
	List<Long> timeDevMap; 
	// store the waiting time of each run for the adaption of each itinerary
	HashMap<Long, Map<Integer, Long>> waitingMap;
	// EDIT: Yuanyuan(09/18) store the cost of each link of each itinerary
	HashMap<Long, Map<Integer, Double>> costMap;
	// store the times of mode changed and unable to change
	Map<Long, Integer> modeChange;
	Map<Long, Integer> modeUnableToChange;
	// EDIT: Yuanyuan(14/06/2018) store the seeds to generate same disturbance for each time disturbance on the link(same test conditions done for all alternatives) 
    int[] seeds = new int[100];
	
	public MonteCarlo(SpecialRouteFinder srf, RoutingRequest request) {
   	 this.srf= srf;
   	 this.request = request;
   	 int initialSeed = 100;
   	 for (int i=0; i<seeds.length; i++)
   		 seeds[i] = initialSeed++;
	}
    
    public void doMC(Itinerary itinerary) {
   	 timeDevMap = new ArrayList<Long>();
   	 waitingMap = new HashMap<Long, Map<Integer, Long>>();
   	 costMap = new HashMap<Long, Map<Integer, Double>>();
   	 modeChange = new HashMap<Long, Integer>();
   	 modeUnableToChange = new HashMap<Long, Integer>();
   	 for (int i=0; i<MCwidth; i++)
   		 doMCRun (itinerary, i);
   	 /* For debugging purpose
   	 int countModeChange = 0;
   	 int unableToChange = 0;
   	 if (modeChange.containsKey(itinerary.getID()))
   		 countModeChange = modeChange.get(itinerary.getID());
   	 System.out.println("The total changes of mode is " + countModeChange);
   	 if (modeUnableToChange.containsKey(itinerary.getID()))
   		 unableToChange = modeUnableToChange.get(itinerary.getID());
   	 System.out.println("The total unabled changes of mode is " + unableToChange); */
    }

    private void doMCRun(Itinerary itinerary, int turn) {
   	 try {
   		LOG.info("The old iId is "+itinerary.getID());
   		 disturbance(itinerary, turn);
   	 } catch (Exception e) {
   		 e.printStackTrace();
   	 }
   		 
    }

    /*For testing*/
    public void printAvgWaitingTime(Itinerary itinerary) {
   	 if (!waitingMap.containsKey(itinerary.getID()))
   		 LOG.info("No information currently" + itinerary.getID());
   	 else {
   		 long sum = waitingMap.get(itinerary.getID()).values().stream().mapToLong(Long::longValue).sum();
   		 double avg = sum/MCwidth;
   		 LOG.info("The average waiting time is " + avg);
   	 }
    }
    
    private void disturbance(Itinerary itinerary, int turn) throws Exception {
   	 List<Leg> legs = itinerary.legs;
   	 Itinerary newItinerary = itinerary;
   	 long waitTime = 0;
   	// LOG.info("Start...");
   	 int size = legs.size();
   	 for (int i=0; i<size; i++) {
   		// LOG.info("Iterating..."+i+" "+legs.size());
   		 Leg leg = legs.get(i);
   		 leg.startTimeDisturbed = leg.startTime.getTimeInMillis()/(60*1000);
   		 leg.endTimeDisturbed = leg.endTime.getTimeInMillis()/(60*1000);
   		 boolean modeDev = false;
   		 String departureS = leg.from.name+"::"+leg.from.lat+","+leg.from.lon;
   		 Leg arrival = itinerary.legs.get(itinerary.legs.size() - 1);
   		 String arrivalS = arrival.to.name+"::"+arrival.to.lat+","+arrival.to.lon;
   		 // convert long into Date
   		 Calendar c = Calendar.getInstance();
   		 c.setTimeInMillis(leg.endTimeDisturbed*1000*60);
   		 Date departureDate = (Date)c.getTime();
   		 // get the seed with the correct order
		int order = (turn*size+i)%100; // reuse same seed when there are more than one 100 times be tested
	    int seed = seeds[order];
   		 DisturbanceGeneration disturbance = new DisturbanceGeneration(leg, seed);
   		 /****************************** Mode disturbance ******************************/
   		 /*Yuanyuan-31/05/2018: just try to do time disturbance for Mid Review persentation*/
   		 modeDev = false;// disturbance.changePathMode(standardMode);
   		 if (modeDev) {
   			 LOG.info("Need to get a new route mode from " + departureS + " to " + arrivalS);
   			 String oldMode="";
   			 try {
   			 if (leg.isSHIPLeg()) {
   				 oldMode = "Ferry";
   				//  LOG.info("The old mode is "+oldMode);
   				 newItinerary = srf.findLaterItinerary(departureS, arrivalS, departureDate, TraverseMode.FERRY);
   			 }
   			 if (leg.isTRAINLeg()) {
   				 // LOG.info("The old mode is "+oldMode);
   				 newItinerary = srf.findLaterItinerary(departureS, arrivalS, departureDate, TraverseMode.RAIL);
   				 oldMode = "Rail";
   			 }
   			 if (leg.isTRUCKLeg()) {
   				 // LOG.info("The old mode is "+oldMode);
   				 newItinerary = srf.findLaterItinerary(departureS, arrivalS, departureDate, TraverseMode.BUS);
   				 oldMode = "Bus";
   			 }
   			// LOG.info("Get a new route");

   			 // update the legs for checking the new leg list
   			 legs = newItinerary.legs;
   			 size = legs.size();
   			 i=-1;
   			 if (modeChange.containsKey(itinerary.getID()))
   				 modeChange.put(itinerary.getID(), modeChange.get(itinerary.getID())+1);
   			 else
   				 modeChange.put(itinerary.getID(), 1);
   			 
   			 // add cost
   			 Leg newLeg = legs.get(0);
   			/* LOG.info("The old mode is "+oldMode+" new mode is ");
   			 if (newLeg.isSHIPLeg())
   				 LOG.info("Ferry");
   			 else { if (newLeg.isTRAINLeg()) {
   				 LOG.info("Rail");
   			 } else {
   				 LOG.info("BUs");
   			 } 
   			 } */
   			 String newMode = newLeg.isSHIPLeg()? "Ferry": newLeg.isTRAINLeg()? "Rail":"Bus";
   			 // LOG.info("new mode is "+newMode);
   			 calculateModeDevCost(newMode, oldMode, itinerary, turn);
   			 // add to waitTime map for calculating flexibility, assume the new route is asked when start the leg
   			 waitTime = newItinerary.startTime.getTimeInMillis()/(60*1000) - leg.startTime.getTimeInMillis()/(60*1000);
   			 
   			 // test the mode of the leg of the new route
   			 /*Leg test = legs.get(0);
   			 if (test.isTRUCKLeg())
   				 LOG.info("The new mode is truck "+waitTime+test.from.name+" "+test.to.name);
   			 if (test.isSHIPLeg())
   				 LOG.info("The new mode is ship "+waitTime+test.from.name+" "+test.to.name);
   			 if (test.isTRAINLeg())
   				 LOG.info("The new mode is train "+waitTime+test.from.name+" "+test.to.name);*/
   			 
   			 addToWaitingMap(itinerary.getID(), turn, waitTime);
   			 
   			 // LOG.info("itinerary "+itinerary.getID() + " changes " + modeChange.get(itinerary.getID()));
   			 } catch (Exception e) {
   				 LOG.info("Failed to get a new plan " + itinerary.getID());
   				 if (modeUnableToChange.containsKey(itinerary.getID()))
   					 modeUnableToChange.put(itinerary.getID(), modeUnableToChange.get(itinerary.getID())+1);
   				 else
   					 modeUnableToChange.put(itinerary.getID(), 1);
   				 // may add some additional cost here?
   			 }
   		 }
   		 /****************************Mode Disturbance finished*************************/
   		 else {
   			 /***************************path disturbance***********************************/
   			 // no sense to add this disturbance for the last link
   			 if (i!=size-1) {
   				/*Yuanyuan-31/05/2018: just try to do time disturbance for Mid Review persentation*/
   				 boolean pathDev = false;//disturbance.changePathMode(standardPath);
   				 if (pathDev) {
   					 LOG.info("Need to get a new route path from " + departureS + " to " + arrivalS);
   					 String nextNodeS = leg.to.name;//+"::"+leg.to.lat+","+leg.to.lon;
   					 newItinerary = srf.findLaterItinerary(departureS, arrivalS, departureDate, nextNodeS);
   					 LOG.info("Get a new route with different path");
    
   					 // update the legs for checking the new leg list
   					 legs = newItinerary.legs;
   					 size = legs.size();
   					 i=-1;
   					 // add to waitTime map for calculating flexibility, assume the new route is asked when start the leg
   					 waitTime = newItinerary.startTime.getTimeInMillis()/(60*1000) - leg.startTime.getTimeInMillis()/(60*1000);
   					 // test the mode of the leg of the new route
   					 Leg test = legs.get(0);
   					 if (test.isTRUCKLeg())
   						 LOG.info("The new mode is truck "+waitTime+test.from.name+" "+test.to.name);
   					 if (test.isSHIPLeg())
   						 LOG.info("The new mode is ship "+waitTime+test.from.name+" "+test.to.name);
   					 if (test.isTRAINLeg())
   						 LOG.info("The new mode is train "+waitTime+test.from.name+" "+test.to.name);
   					 addToWaitingMap(itinerary.getID(), turn, waitTime);
   				 }
   			 }
   			 /***************************path disturbance finished*****************************/
   			 // else {
   				/***************************time disturbance for the leg*****************************/
   				 long LastID = newItinerary.getID();
   				 newItinerary = timeDisturbance(leg, itinerary, newItinerary, turn, seed);
   				 if (newItinerary.getID()!=LastID) {// it means a new route is generated, so legs should be updated
   					 LOG.info("Iterate a new route "+newItinerary.getID()+" with "+newItinerary.endTime+" old is "+leg.endTime);
   					 legs = newItinerary.legs;
   					 size = legs.size();
   					// LOG.info("THe size is "+size);
   					 i=-1;
   				 }/* else {
   					 LOG.info("The id is same"); // same route
   				 } */
   				 incrementCost(turn, itinerary.getID(), leg.totalcost);
   			// }
   		 }
      }
   	// LOG.info("Finished loop");
    }
    
    // define the cost for changing the mode
    private void calculateModeDevCost(String newMode, String oldMode, Itinerary itinerary, int turn) {
   	 // Ferry: 0 	Rail: 1	Bus: 2    
   	 Double[][] costMatrix = new Double[3][3];
   	 costMatrix[0][1] = 200.0; // the cost to change from ferry to rail
   	 costMatrix[0][2] = 500.0;
   	 costMatrix[1][0] = 200.0;
   	 costMatrix[1][2] = 600.0;
   	 costMatrix[2][0] = 500.0;
   	 costMatrix[2][1] = 300.0;
   	 Map<String, Integer> map = new HashMap<String, Integer>();
   	 map.put("Ferry", 0);
   	 map.put("Rail", 1);
   	 map.put("Bus", 2);
   	 if (!map.containsKey(newMode) || !map.containsKey(oldMode)) {
   		 throw new IllegalArgumentException("Unknown mode!");
   	 } else {
   		 int index1 = map.get(oldMode);
   		 int index2 = map.get(newMode);
   		// LOG.info(index1+" "+index2+" The cost of mode deviation is " + costMatrix[index1][index2]);
   		 incrementCost(turn, itinerary.getID(), costMatrix[index1][index2]);
   	 }
    }
    
    private TraverseMode getTraverseMode(Leg leg) {
   	 if (leg.isSHIPLeg())
   		 return TraverseMode.FERRY;
   	 else {
   		 if (leg.isTRAINLeg())
   			 return TraverseMode.BUS;
   		 else
   			 return TraverseMode.RAIL;
   	 }
    }
    
    private void incrementCost(int turn, long id, double cost) {
   	 if (!costMap.containsKey(id)) {
   		 Map<Integer, Double> m = new HashMap<Integer, Double>();
   		 m.put(turn, cost);
   		 costMap.put(id, m);
   	 } else {
   		 if (!costMap.get(id).containsKey(turn))
   			 costMap.get(id).put(turn, cost);
   		 else {
   			 Double temp = costMap.get(id).get(turn);
   			 costMap.get(id).put(turn, temp+cost);
   		 }
   	 }
    }
    
    // calculate the original cost for all legs in one itinerary
    private double getOriginalCost(Itinerary itinerary) {
   	 double cost = 0;
   	 for (Leg leg: itinerary.legs)
   		 cost+=leg.totalcost;
   	 return cost;
    }
    
    private Itinerary timeDisturbance(Leg leg, Itinerary oldItinerary, Itinerary itinerary, int turn, int seed) throws Exception {
   	 boolean feasibility = true;
   	 int timeDev = 0;
   	 long waitTime = 0;
   	 Itinerary newItinerary = itinerary;
   	 
   	 leg.startTimeDisturbed = leg.startTime.getTimeInMillis()/(60*1000);
   	 leg.endTimeDisturbed = leg.endTime.getTimeInMillis()/(60*1000);
   	 String departureS = leg.to.name+"::"+leg.to.lat+","+leg.to.lon;
   	 Leg arrival = itinerary.legs.get(itinerary.legs.size() - 1);
   	 String arrivalS = arrival.to.name+"::"+arrival.to.lat+","+arrival.to.lon;
   	 
   	 DisturbanceGeneration disturbance = new DisturbanceGeneration(leg, seed);
   	 
   	 LOG.info("For itinerary "+itinerary.startTime.getTime());
   	 LOG.info("For leg "+leg.startTime.getTime());
   	 /* Time disturbance */
   	 timeDev = disturbance.getTimeDev(leg);
   	 // change time deviation into non negative values
   	 if (timeDev < 0)
   		 timeDev = 0;
   	 
   	 leg.endTimeDisturbed += timeDev;
   	 // convert long into Date
   	 Calendar c = Calendar.getInstance();
   	 
   	 // if current link is the last link of the route, no need to do next steps
   	 if (itinerary.legs.indexOf(leg) == itinerary.legs.size()-1) {
   		// LOG.info("It is the last leg");
   		 addMCRating(turn, oldItinerary, newItinerary, (long) timeDev);
   		LOG.info("Add timeDev "+timeDev);
   		 // some itinerary only have one leg
   		 addToWaitingMap(itinerary.getID(), turn, waitTime);
   	 } else     {  
	   	 Leg next = findNextLink(leg, itinerary.legs);
   		 if (next == null)
   			 throw new NullPointerException();
   		/**EDIT-Yuanyuan-15/06/2018: Add the transit time**/
   		 int transit = leg.alighting + next.boarding+next.transit;
   		 LOG.info("Transit time is "+transit);
   		 c.setTimeInMillis(leg.endTimeDisturbed*1000*60+transit*1000);
      	 Date departureDate = (Date)c.getTime();
   		 feasibility = checkFeasibility(leg, next);
   		 if (!feasibility) {
   			 // call for a new route
   			 LOG.info("Asking for a new route from "+ departureS + " to " + arrivalS + " after " + departureDate + " to replace the route with departure time" + next.startTime.getTime());
   			 newItinerary = srf.findLaterItinerary(departureS, arrivalS, departureDate);
   			 // store the waiting time for adaption
   			 waitTime = newItinerary.startTime.getTimeInMillis()/(60*1000) - leg.endTimeDisturbed-transit/60; 
   			 LOG.info("Get a new route "+waitTime+" new start "+newItinerary.startTime.getTimeInMillis()/(60*1000)+" previous arrival "+leg.endTimeDisturbed);
   			 
   			 // test the mode of the leg of the new route
   			/* Leg test = newItinerary.legs.get(0);
   			 if (test.isTRUCKLeg())
   				 LOG.info("The new mode is truck "+waitTime);
   			 if (test.isSHIPLeg())
   				 LOG.info("The new mode is ship "+waitTime);
   			 if (test.isTRAINLeg())
   				 LOG.info("The new mode is train "+waitTime); */
   			 
   			 if (waitTime < 0)
   				 LOG.info("The time is less than 0 here(Something wrong)");
   			 addToWaitingMap(itinerary.getID(), turn, waitTime);
   		 }
   		 /* else store the waiting time according to the original plan
   		 else {
   			 waitTime = next.startTime.getTimeInMillis()/(60*1000) - leg.endTimeDisturbed; //?
   		 } */
   		 
   	 }    
   	 return newItinerary;
    }
    
    /***EDIT-Yuanyuan(15/06/2018): Get the transit time(Boarding+Alighting) for the leg***/
    /* private static int getDefaultBoardingTimeByMode(Leg leg, RoutingRequest request) {
    		int transitTime = 0;
    		if (leg.isSHIPLeg())
    } */
    
    private void addToWaitingMap(long id, int turn, long waitTime) {
   	 if (!waitingMap.containsKey(id)) {
   		 Map<Integer, Long> temp = new HashMap<Integer, Long>();
   		 temp.put(turn, waitTime);
   		 waitingMap.put(id, temp);
   		// if (waitTime!=0)
   		//	 LOG.info("I put " + id+" "+waitTime+" "+waitingMap.get(id).values());
   		 
   	 } else {
   		 if (!waitingMap.get(id).containsKey(turn))
   			 waitingMap.get(id).put(turn, waitTime);
   		 else {
   			 long time= waitingMap.get(id).get(turn);
   			 waitingMap.get(id).put(turn, time+waitTime);
   		 }
   	 }
    }
    
    // timeDev is the time deviation for the last link
    private void addMCRating(int turn, Itinerary itinerary, Itinerary newItinerary, long timeDev) {
   	// LOG.info("Add the MCRating");
   	 long difference = 0;
   	 if (newItinerary != null) {
      	difference = (newItinerary.endTime.getTimeInMillis()- itinerary.endTime.getTimeInMillis())/(60*1000); // in minutes
        // add cost increased cz of time delay
      	double costTime = difference/60.0 * request.cost_per_hour;
      	// LOG.info("The cost spent cz of time delay is "+costTime+" "+request.cost_per_hour);
      	incrementCost(turn, itinerary.getID(), costTime); // the cost is accumulated on the cost of original itinerary
   	 }
   	 difference += timeDev;
   	 // add to r.MCratings
   	 timeDevMap.add(difference);
   	 
   	 // For testing 
   	 Date date1 = new Date(newItinerary.endTime.getTimeInMillis());
   	 Date date2 = new Date(itinerary.endTime.getTimeInMillis());
   	 LOG.info("The time difference added is "+difference+" old endtime is "+date2.toString()+" new is "+date1.toString());
    }

    /***EDIT-Yuanyuan(15/06/2018): Add the transit time(Boarding+Alighting) for the leg***/
    private boolean checkFeasibility(Leg leg, Leg next) {
   // 	LOG.info("boarding "+next.boarding/60+" "+leg.alighting/60);
   	 long timeDif = next.startTime.getTimeInMillis()/(1000*60)-next.boarding/60 - leg.endTimeDisturbed-leg.alighting/60-next.transit/60;
   	 /* Calendar c = Calendar.getInstance();
   	 c.setTimeInMillis(leg.endTimeDisturbed*1000*60);
   	 Date departureDate = (Date)c.getTime(); */
   	 
   	 LOG.info("The time difference is " + timeDif);
   	 if (timeDif < 0) {
   		 LOG.info("The time is not feasible "+next.startTime.getTime());
   		 return false;
   	 }
   	 else
   		 //System.out.println("It's feasible");
   		 return true;
    }
    
    private Leg findNextLink(Leg leg, List<Leg> legs) {
   	 boolean next = false;
   	 //System.out.println("Try to find the leg starting from " + leg.from.name);
   	 //System.out.println("1Index is " + legs.indexOf(leg) + " size is " + legs.size());
   	 for (Leg l : legs) {
   		 // try to find the next links
   		 //System.out.println("Check leg " + l.from.name);
   		 if (!next) {
   			 // use the name of departure place to check it is same leg or not
   			 if (l.from.name.equals(leg.from.name)) {
   				 //System.out.println("2Index is " + legs.indexOf(l) + " size is " + legs.size());
   				 next = true;
   			 }
   		 } else {
   			 //System.out.println("Return leg " + l.from.name);
   		 	return l;
   		 }
   	 }
   	 // this should not happen
   	 return null;
    }


    public void getKRIs(Itinerary itinerary) {
   	 double sum = 0;
   	 LOG.info("MCRatings size is "+timeDevMap.size());
   	 double minTime = timeDevMap.stream().reduce((a, b)->a.compareTo(b)>0? b:a ).get();
   	 double maxTime = timeDevMap.stream().reduce((a, b)->a.compareTo(b)>0? a:b ).get();
   	 sum = timeDevMap.stream().mapToLong(Long::longValue).sum();
   	 double avg = sum / timeDevMap.size();
   	 double std = 0; // calculate standard deviation
   	 double stdError = 0; // calculate standard error
   	 double avgRating = 100-avg*60*100/itinerary.duration;
   	 // EDIT (Yuanyuan-31/07/2018): Avoid some extreme case
   	 if (avgRating<0) {
   		 LOG.info("!!!!!!!!!!!!!!!"+avgRating);
   		 avgRating = 0;
   	 }
   	 for (long rating: timeDevMap) {
   		 long temp = 100-rating*60*100/itinerary.duration;
   		 std += Math.pow(temp-avgRating, 2);
   	 }
   	 std /= timeDevMap.size();
   	 std = Math.sqrt(std);
   	 stdError = std/Math.sqrt(timeDevMap.size());
   	 itinerary.KRIs.setTimeStd(std);
   	 itinerary.KRIs.setTimeError(stdError);
   	 itinerary.KRIs.setTimeDeviation(avg);
   	 itinerary.KRIs.setTimeRating(avgRating);
   	 itinerary.KRIs.setMaxTime(maxTime);
   	 itinerary.KRIs.setMinTime(minTime);
   	 LOG.info("The time deviation of itinerary " + itinerary.getID() + " is " + avg+" sum is "+sum+" time rating is "+avgRating);
   	 
   	 // flexibility
   	 long maxSumF, minSumF, sum0;
   	 double avg0=0, std0=0, flexibilityError=0;
   	 if (!waitingMap.containsKey(itinerary.getID())) {
   		 maxSumF = 0;
   		 minSumF = 0;
   		 sum0 = 0;
   	 } else {
   		// LOG.info("Check the waitingMap "+waitingMap.toString()+waitingMap.size());
   		 Collection<Long> values = waitingMap.get(itinerary.getID()).values();
   		 Stream<Long> stream = values.stream();
   		 maxSumF = stream.reduce((a,b)->a.compareTo(b) > 0 ? a:b).get();
   		 minSumF = values.stream().reduce((a,b)->a.compareTo(b) < 0 ? a:b).get();
   		 sum0 = values.stream().mapToLong(Long::longValue).sum();
   		 avg0 = sum0/MCwidth;
   		// LOG.info("It is contained "+sum0+" "+minSumF+" "+maxSumF);
   		 std0 = 0;
   		 double avg0Rating = 100-avg0*60*100/itinerary.duration;
   		 for (long v : waitingMap.get(itinerary.getID()).values()){
   			 double temp = 100-v*60*100/itinerary.duration;
   			 std0 += Math.pow(temp-avg0Rating, 2);
   			 
   		 }    
   		 std0 /= values.size();
   		 std0 = Math.sqrt(std0);
   		 flexibilityError = std0/Math.sqrt(values.size());
   	 }
   	 itinerary.KRIs.setFlexibilityStd(std0);
   	 itinerary.KRIs.setFlexibilityError(flexibilityError);
   	 // itinerary.KRIs.setFlexibility(sumF);
   	 itinerary.KRIs.setFlexibility(avg0);
   	 itinerary.KRIs.setDuration(itinerary.duration);
   	 itinerary.KRIs.setMaxFlexibility(maxSumF);
   	 itinerary.KRIs.setMinFlexibility(minSumF);
   	// LOG.info("The feasibility of itinerary " +itinerary.getID() + " is " + avg0);
   			 
   	 // cost
   	 Collection<Double> values1 = costMap.get(itinerary.getID()).values();
   	 double originalCost = getOriginalCost(itinerary);
   	 // only consider the bigger cost than the original one
   	 Stream<Double> stream1 = values1.stream().filter(c->c>=originalCost);
   	 double maxSumC = originalCost;
   	 if (stream1.count()>0)
   		 maxSumC = values1.stream().filter(c->c>=originalCost).reduce((a,b)->a.compareTo(b) > 0 ? a:b).get();
   	 int num = 0;
   	 double sum1 = 0;
   	 double std1 = 0;
   	 double costError = 0;
   	 double minSumC = originalCost;
   	 Stream<Double> tempStream = values1.stream().filter(c->c>=originalCost);
   	 double avg1= originalCost;
   	 if (tempStream.count() != 0)    {
   		 minSumC = values1.stream().filter(c->c>=originalCost).reduce((a,b)->a.compareTo(b) < 0 ? a:b).get();
   		 // double sum1 = costMap.get(itinerary.getID()).values().stream().mapToDouble(Double::doubleValue).sum();
   		 
   		 for (double v : values1) {
   			 if (v>=originalCost) {// only calculates the value greater than the original cost
   				 ++num;
   				 sum1+= v;
   			 }
   		 }
   		 // average cost deviation
   		 avg1 = sum1/num;
   	 }    
   	 
   	 double costDev = avg1 - originalCost;//itinerary.totalcost;
   	 num = 0;
   	 double costDevRating = 100-100*costDev/originalCost;
   	 for (double v : values1) {
   		 if (v>originalCost) {
   			 double temp = 100-100*(v-avg1)/originalCost;
   			 std1 += Math.pow(temp-costDevRating, 2);
   			 ++num;
   		 }
   	 }
   	 if (num != 0) {
   		 std1 /= num;
   		 std1 = Math.sqrt(std1);
   		 costError = std1/Math.sqrt(num);
   		// LOG.info("The cost error is "+costError);
   	 }
   	 
   	 itinerary.KRIs.setCostStd(std1);
   	 itinerary.KRIs.setCostError(costError);
   	 itinerary.KRIs.setTotalCost(originalCost);
   	 itinerary.KRIs.setCostDeviation(costDev);
   	 itinerary.KRIs.setCostRating(100 - 100*costDev/originalCost);
   	 itinerary.KRIs.setMaxCost(maxSumC-originalCost);
   	 itinerary.KRIs.setMinCost(minSumC-originalCost);
   	// LOG.info("The cost deviation of itinerary " +itinerary.getID() + " is " + costDev);
    }

}


