package com.SynchroNET.risk.profiler;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.List;

import org.opentripplanner.api.model.Leg;
import org.opentripplanner.routing.graph.GraphIndex;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DisturbanceGeneration {
/*
 * (EDIT)6/22/2017-Yuanyuan-the class is for generating random disturbance for leg 
 * */
	private static final Logger LOG = LoggerFactory.getLogger(DisturbanceGeneration.class);
	Leg leg = new Leg();
	int seed;
	public DisturbanceGeneration(Leg leg, int seed) {
		this.leg = leg;
		this.seed = seed;
	}
	
	// generate time deviation
	public int getTimeDev(Leg leg) throws Exception {
		LOG.info("The leg is from "+leg.from.name+" to "+leg.to.name+" by "+leg.mode);
		int timeDev = getTimeDevFromFeature(leg);
		if (timeDev<0) {
			// LOG.info("The time deviation will be generated from distribution function");
			RandomNumber rn = new RandomNumber();
			long duration = leg.endTime.getTimeInMillis()/(60*1000) - leg.startTime.getTimeInMillis()/(60*1000);
			if (leg.isTRUCKLeg()) {
				timeDev = rn.timeDevTruck((int)duration, seed); // It is BUS
				LOG.info("The time deviation is "+timeDev);
			} else {
				if (leg.isSHIPLeg()) {
					// MODIFY-Yuanyuan(23/06/2018): the steaming type stores in trips.txt 
					if (leg.route.toLowerCase().equals("fast")) {
					// if (leg.steamingType.toLowerCase().equals("fast")) {
						LOG.info("the leg is fast ship");
						timeDev = rn.timeDevFastShip((int)duration, seed);
					}
					else {
						 if (leg.route.toLowerCase().equals("slow")) {
							LOG.info("the leg is slow ship");
							timeDev = rn.timeDevSlowShip((int)duration, seed);
						 } else
							 // EDIT-Yuanyuan(28/06/2018): consider as fastship when there is no steaming distinction
							 timeDev = rn.timeDevFastShip((int)duration, seed);
					}
				} else {
					if (leg.isTRAINLeg()) {
						timeDev = rn.timeDevTrain((int)duration, seed);
					} else {
						LOG.info("Unknown freight!");
						// throw excpetion?
					}
				}
			}
		}// else 
			// LOG.info("The time deviation is generated from historical samples");
		return timeDev;
	}
	
	// get time deviation related to the most discriminative feature
	public int getTimeDevFromFeature(Leg leg) throws Exception {
		String from = leg.from.name;
		String to = leg.to.name;
		String mode = leg.mode;
		RandomNumber rn = new RandomNumber();
    	String feature = rn.getMainFeature(from, to, mode);
    	// if the historical date amount is null
    	if (feature == null)
    		return -1;
    	RiskDataBaseManager db= new RiskDataBaseManager();
    	Calendar start = leg.startTime;
    	Calendar end = leg.endTime;
    	List<Integer> timeDevs = db.getData(feature, from, to, mode, start, end);
    	// EDIT- Yuanyuan 5/9/2017: If there are not enough existing time deviations in the selected range
    	if (timeDevs.size()<3) //MODIFY: 3 should be changed to the number checked by comparing the graph
    		return -1;
    	return rn.getTimeDeviation(timeDevs); 
	}
	
	/*
	 * EDIT - Yuanyuan(21/07/2017) Generate random number to estimate mode change probability
	 * */
	/*public boolean changeMode(double standard) {
		RandomNumber rn = new RandomNumber();
		double randomNum = rn.changeNum();
		if (randomNum<=standard)
			return true;
		return false;
	} */
	
	/*
	 * EDIT - Yuanyuan(29/09/2017) Generate random number to estimate mode/path change probability
	 * */
	public boolean changePathMode(double standard) {
		RandomNumber rn = new RandomNumber();
		double randomNum = rn.changeNum();
		if (randomNum<=standard)
			return true;
		return false;
	} 
}
