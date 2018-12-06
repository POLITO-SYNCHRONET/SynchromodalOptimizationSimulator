package com.SynchroNET.utilities;


import java.util.LinkedList;
import java.util.ArrayList;
import java.util.List;

import org.opentripplanner.api.common.RoutingResource;
import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.TripPlan;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.spt.GraphPath;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class QualityCalculator {

	private static final Logger LOG = LoggerFactory.getLogger(RoutingResource.class);
	
	public static int[] calculatePathsQuality(List<GraphPath> paths, RoutingRequest request){
		return calculateQuality(paths, null, request);
	}
	
	public static int[] calculateItinerariesQuality(List<Itinerary> itineraries, RoutingRequest request){
		return calculateQuality(null, itineraries, request);
	}

	//EDIT - Yuanyuan (22-11-2017) add the quality of KRIs to the itinerary(50%), used when the itinerary has had quality of KPIs(50%)
	public static TripPlan addKRIQuality(TripPlan plan, RoutingRequest request) {
		List<Itinerary> itineraries = new LinkedList<Itinerary>();
		for (Itinerary itinerary: plan.itinerary) {
			double flexibility = (100-itinerary.KRIs.flexibility*60*100/itinerary.duration);
			double time = itinerary.KRIs.timeRating;
			double cost = itinerary.KRIs.costRating;
			double safety = itinerary.KRIs.safety;
			double flexibility_quality = flexibility * request.KRI_flexibility_w;
			double time_quality = time * request.KRI_time_w;
			double cost_quality = cost * request.KRI_cost_w;
			double safety_quality = safety * request.KRI_safety_w;
			int KRIs_quality = (int) (flexibility_quality + time_quality + cost_quality + safety_quality);
			KRIs_quality = (int) (KRIs_quality * 0.5);
			int KPIs_quality = (int) (itinerary.quality * 0.5);
			// LOG.info("Before adding KRI "+itinerary.quality);
			itinerary.quality = KRIs_quality + KPIs_quality;
			// LOG.info("After adding KRI "+itinerary.quality);
			itineraries.add(itinerary);
		}
		plan.itinerary = itineraries;
		return plan;
	}
	
	//Giovanni: create a new method for return a sort List and not a int array. 
	//Giovanni: The list is now already sorted. 
	//Riccardo: commented, itineraries are already sorted in calculateQuality
//	public static List<Itinerary> calculateItinerariesQualityListSort(List<Itinerary> itineraries, RoutingRequest request){
//		List<Itinerary> finalList = new ArrayList<>();
//		int[] intarray = calculateQuality(null, itineraries, request);
//		for(int i=0; i<intarray.length; i++) {
//			itineraries.get(i).quality= intarray[i];
//			finalList.add(itineraries.get(i));
//		}
//		return finalList;
//	}

	private static int[] calculateQuality(List<GraphPath> paths, List<Itinerary> itineraries, RoutingRequest request){
        boolean pathsQuality = paths != null ? true : false;
        boolean itinerariesQuality = itineraries != null ? true : false;
        
        int size = 0;
		if(pathsQuality) size = paths.size();
		if(itinerariesQuality) size = itineraries.size();
		
		int [] quality = new int[size];
		if(size == 0) return quality;
		
//        double [] cost = new double[size];
        
		//EDIT - Riccardo (07-03-2017): Here is starting the process to calculate the Quality of the paths.
        //First three are used to save the values, the others to save the Quality for each one of the three values.
		double [] weight = new double[size]; 
		//EDIT - Riccardo (07-03-2017): END
		
		int ii = 0;
		
		if(pathsQuality){
	        for (GraphPath path : paths) {
	        	State lastState = path.states.getLast();	        	
	        	weight[ii] = lastState.costCO2 * request.co2_w + lastState.costDistance * request.distance_w + lastState.costTime * request.time_w;
	        	ii++;
	        }
		}

		if(itinerariesQuality){
	        for (Itinerary itinerary : itineraries) {
	        	weight[ii] = itinerary.costCO2 * request.co2_w + itinerary.costDistance * request.distance_w + itinerary.costTime * request.time_w;
	        	ii++;
	        }
		}

        //EDIT - Riccardo (07-03-2017): Calculate 3 Quality value based on the CO2, the distance and the time 
        //EDIT - Riccardo (07-03-2017): END
        
        //EDIT - Riccardo (07-03-2017): Calculate the Quality of the path by summing the quality values of CO2, distance and time.
        // The three quality value are proportioned to the weight decided from the user.
        // It also find the maximum and the minimum Quality value.     
        double minWeight = Double.MAX_VALUE;

        for(int j = 0; j < size; j++){
        	if(weight[j] < minWeight){
        		minWeight = weight[j];
        	}
        }
        //EDIT - Riccardo (07-03-2017): END
        
        //EDIT - Riccardo (07-03-2017): Adjust the range of the quality between 1 and 100.
        double multiplier = 100 / minWeight;
        for ( int j = 0; j < size; j++ ) {
        	if ( weight[j] == minWeight ) quality[j] = 100; 
        	else {
        		quality[j] = 200 - (int) (weight[j] * multiplier);
        		if(quality[j] == 100) quality[j]--;
        	}
        	
        	if(quality[j] <= 0) quality[j] = 1;
        }
        //EDIT - Riccardo (07-03-2017): END
		
        //EDIT - Riccardo (13-03-2017): Sorting based on quality
        int qualityTemp;
        double weightTemp;
        
        if(pathsQuality){
        	GraphPath graphTemp;
            for(int i = paths.size() - 1; i >= 0; i--){
            	for(int j = 0; j < i; j ++){
                  	if(quality[j] < quality[j + 1] || (quality[j] == quality[j + 1] && weight[j] > weight[j + 1])){
                  		qualityTemp = quality[j];
                  		quality[j] = quality[j + 1];
                  		quality[j + 1] = qualityTemp;
                  		
                		weightTemp = weight[j];
                		weight[j] = weight[j + 1];
                		weight[j + 1] = weightTemp;
                		
                  		graphTemp = paths.get(j);
                  		paths.set(j, paths.get(j + 1));
                  		paths.set(j + 1, graphTemp);
                  	}	
            	}
            }
        }
      
        if(itinerariesQuality){
      	  	Itinerary itineraryTemp;
            for(int i = itineraries.size() - 1; i >= 0; i--){
              	for(int j = 0; j < i; j ++){
                	if(quality[j] < quality[j + 1] || (quality[j] == quality[j + 1] && weight[j] > weight[j + 1])){
                		qualityTemp = quality[j];
                		quality[j] = quality[j + 1];
                		quality[j + 1] = qualityTemp;
                		
                		weightTemp = weight[j];
                		weight[j] = weight[j + 1];
                		weight[j + 1] = weightTemp;
                		
                		itineraryTemp = itineraries.get(j);
                		itineraries.set(j, itineraries.get(j + 1));
                		itineraries.set(j + 1, itineraryTemp);
                    } 	
              	}
            }

            for(int i = 0; i < quality.length; i++) itineraries.get(i).quality = quality[i];

        }
        //EDIT - Riccardo (13-03-2017): END

        return quality;
	}
	
    //EDIT - Riccardo (07-03-2017): method used to calculate the quality value of CO2, the quality value of distance and the quality value of time.
//    private static int[] getQuality ( double[] values ){
//    	
//    	int size = values.length;
//    	int[] quality = new int[size];
//    	double min, max;
//    	min = values[0]; 
//    	max = values[0];
//        
//        //Calculate the minimum and the maximum value.
//        for ( int ii=1; ii<size; ii++ ) {
//        	if ( values[ii]<min ) {
//        		min = values[ii];
//        	}
//           	else if ( values[ii]>max ) {
//           		max = values[ii];
//           	}
//        }
//        
//        //Calculate the quality comparing the value of each path with the minimum and maximum value.
//        double rate = (max - min) / 99;
//        if(rate == 0) rate = 0.0001;
//   		for (int ii=0; ii<size; ii++) {
////   			System.out.println("rate:" + rate);
//   			quality[ii] = (int) (100 - ((values[ii]-min)/rate)); //EDIT - Riccardo (07-03-2017): reverse quality.
////   			System.out.println(quality[ii]);
//
//   		}
//   		
//    	return quality;
//    	
//    }
    //EDIT - Riccardo (07-03-2017): END
    
}
