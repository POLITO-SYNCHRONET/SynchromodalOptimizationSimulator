package com.SynchroNET.risk.analysis;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.TraverseMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.risk.montecarlo.MonteCarlo;
import com.SynchroNET.risk.profiler.DisturbanceGeneration;
import com.SynchroNET.risk.profiler.RiskDataBaseManager;
import com.SynchroNET.utilities.SpecialRouteFinder;

public class Analysis {
	private static final Logger LOG = LoggerFactory.getLogger(Analysis.class);
	public List<Itinerary> routes = new ArrayList<> ();
	SpecialRouteFinder srf = null;
	RoutingRequest request = new RoutingRequest();
	
	public Analysis(SpecialRouteFinder srf, List<Itinerary> routes, RoutingRequest request) {
		this.routes = routes;
		this.srf = srf;
		this.request = request;
	}
	
	public void runRiskAnalysis() {
		MonteCarlo MC = new MonteCarlo(srf, request);
		
		for (Itinerary itinerary : routes) {
			// testCost(itinerary);
			MC.doMC(itinerary);
			MC.getKRIs(itinerary); 
			// safety analysis: check from database whether the percent of incident happened in the route
			double safety = safetyAnalysis(itinerary);
			itinerary.KRIs.safety = safety;
			// MC.printAvgWaitingTime(itinerary);
		}
	}

	// for testing the cost of all legs compared to the cost of the whole itinerary
	private void testCost(Itinerary itinerary) {
		double cost=0.0;
		int size = itinerary.legs.size();
		int i=0;
		// long arrivalAtStop = 0;
		for (Leg leg:itinerary.legs) {
			cost+=leg.totalcost;
			++i;
			// there's only boarding cost for the first leg 
			if (i==1) {
				LOG.info("Traverse mode is "+getTraverseMode(leg));
				int boardTime = request.getBoardTime(getTraverseMode(leg));
				LOG.info("board time is "+boardTime);
				cost+=request.cost_per_hour * boardTime/3600.0;
				// arrivalAtStop = leg.endTime.getTimeInMillis()/1000;	
			} else {
				// all these legs should be both boarding and alighting
				if (i < size) {
					// int boarding = leg.boarding;
					// LOG.info("The boarding time is "+boarding);
					// cost+=request.cost_per_hour * (boarding-arrivalAtStop)/3600.0;
					int boardTime = request.getBoardTime(getTraverseMode(leg));
					cost+=request.cost_per_hour * boardTime/3600.0;
					int alightTime = request.getAlightTime(getTraverseMode(leg));
					cost+=request.cost_per_hour * alightTime/3600.0;
					// arrivalAtStop = leg.endTime.getTimeInMillis()/1000;
				} else {
					// there's only alighting for the last leg
					int alightTime = request.getAlightTime(getTraverseMode(leg));
					cost+=request.cost_per_hour * alightTime/3600.0;
				}
			}
			
		}
		if (itinerary.totalcost==cost)
			LOG.info("The cost is same");
		else
			LOG.info("The cost is not same "+cost+" "+itinerary.totalcost);
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
	
	private double safetyAnalysis(Itinerary itinerary) {
		double safety=0.0;
		for (Leg leg:itinerary.legs) {
			String start = leg.from.name;
			String end = leg.to.name;
			String mode = null;
			if (leg.isSHIPLeg())
				mode = "ferry";
			else {
				if (leg.isTRAINLeg())
					mode = "rail";
				else {
					if (leg.isTRUCKLeg())
						mode = "bus";
				}
			}
			
			int executionNum = RiskDataBaseManager.countLink(start, end, mode);
			double safetySingle = 0.0;
			if (executionNum == 0)
				safetySingle = 0;
			else {
				// int incidentTime = RiskDataBaseManager.countIncident(start, end, mode);
				// maybe more precise version(months are indexed deom 0 not 1, so+1 here)
				double incidentNum = RiskDataBaseManager.countPreciseIncident(start, end, mode, leg.startTime.get(Calendar.MONTH)+1, leg.agencyName);
				// LOG.info("!!!Incident time is "+incidentTime+" start "+start+" end "+end+" mode "+mode + " dateTime is "+leg.startTime.getTime().toString());
				safetySingle = 100*incidentNum/(double)executionNum;
				// LOG.info("single safety is "+safetySingle);
			}
			safety += safetySingle;
		}
		safety = safety/itinerary.legs.size();
		safety = 100 - safety;
		LOG.info("The overall safety for the route is "+safety);
		return safety;
	}

}
