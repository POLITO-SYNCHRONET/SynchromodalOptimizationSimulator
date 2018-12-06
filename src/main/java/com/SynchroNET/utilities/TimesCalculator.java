package com.SynchroNET.utilities;

import java.util.Calendar;
import java.util.List;

import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.routing.core.RoutingRequest;

public class TimesCalculator {
	
	public static void calculateTimesofParallelLegs(List<Itinerary> itineraries, RoutingRequest request){
		for(Itinerary itinerary : itineraries){
			
			if(itinerary.legs != null && itinerary.legs.size() > 1) {
				
				TimeSlot firstTravelTS = null;
				TimeSlot currentTravelTS = null;
				TimeSlot firstOperationalTS = null;
				TimeSlot currentOperationalTS = null;
				TimeSlot firstWaitingTS = null;
				TimeSlot currentWaitingTS = null;
				
				for(Leg leg : itinerary.legs) {
					if(firstTravelTS == null) {
						//Travel Time Slot
						firstTravelTS = new TimeSlot(leg.startTime, leg.endTime, null);
						//Waiting Time Slot
						Calendar waitingStart = Calendar.getInstance();
						waitingStart.setTimeInMillis(leg.startTime.getTimeInMillis() - leg.boarding*1000 - leg.waiting*1000);
						Calendar waitingEnd = Calendar.getInstance();
						waitingEnd.setTimeInMillis(leg.startTime.getTimeInMillis() - leg.boarding*1000);
						firstWaitingTS = new TimeSlot(waitingStart, waitingEnd, null);
						
						currentTravelTS = firstTravelTS;
						currentWaitingTS = firstWaitingTS;

						//Operational Time Slot
						currentOperationalTS = createOperationalTimeSlot(leg, currentOperationalTS);
						if(currentOperationalTS.prev != null) firstOperationalTS = currentOperationalTS.prev;
						else firstOperationalTS = currentOperationalTS;
						
						
					}
					else {
						//Travel Time Slot
						currentTravelTS = new TimeSlot(leg.startTime, leg.endTime, currentTravelTS);
						Calendar waitingStart = Calendar.getInstance();
						waitingStart.setTimeInMillis(leg.startTime.getTimeInMillis() - leg.boarding*1000 - leg.waiting*1000);
						Calendar waitingEnd = Calendar.getInstance();
						waitingEnd.setTimeInMillis(leg.startTime.getTimeInMillis() - leg.boarding*1000);
						currentWaitingTS = new TimeSlot(waitingStart, waitingEnd, currentWaitingTS);
						//Operational Time Slot
						currentOperationalTS = createOperationalTimeSlot(leg, currentOperationalTS);
					}
//					System.out.println(leg.tripId.toString());
				}
				
//				System.out.println();
//				TimeSlot printTS = firstWaitingTS;
//				while(printTS != null){
//					System.out.println(printTS.startTime.getTime() + " " + printTS.endTime.getTime());
//					printTS = printTS.next;
//				}
//				System.out.println();
				
				itinerary.travelTime = calculateTime(firstTravelTS);
				itinerary.operationalTime = calculateTime(firstOperationalTS);
				itinerary.waitingTime = calculateTime(firstWaitingTS);
			
//				System.out.println(itinerary.travelTime/3600);
//				System.out.println();

			}
			
		}
		
	}
	
	private static TimeSlot createOperationalTimeSlot(Leg leg, TimeSlot currentOperationalTS){
		//operational time slot
		Calendar startTime = Calendar.getInstance();
		Calendar endTime = Calendar.getInstance();

		//boarding
		endTime.setTimeInMillis(leg.startTime.getTimeInMillis());
		if(leg.boarding > 0) startTime.setTimeInMillis(endTime.getTimeInMillis() - leg.boarding * 1000);
		else startTime.setTimeInMillis(endTime.getTimeInMillis() - leg.transit * 1000);
		if(currentOperationalTS == null) currentOperationalTS = new TimeSlot(startTime, endTime, null);
		else currentOperationalTS = new TimeSlot(startTime, endTime, currentOperationalTS);

		//transit/alighting
		startTime = Calendar.getInstance();
		endTime = Calendar.getInstance();
		if(leg.alighting > 0){
			startTime.setTimeInMillis(leg.endTime.getTimeInMillis());
			endTime.setTimeInMillis(startTime.getTimeInMillis() + leg.alighting * 1000);
			currentOperationalTS = new TimeSlot(startTime, endTime, currentOperationalTS);
		}

		return currentOperationalTS;
	}
	
	private static long calculateTime(TimeSlot curr){
		long time = 0;
		TimeSlot first = curr;
//		System.out.println("processing");

		while(first != null) {
			Calendar startTime = first.startTime;
			Calendar endTime = first.endTime;
//			System.out.println("iteration 1");
			while(curr != null) {
//				System.out.println(startTime.getTime() + " " + endTime.getTime() + " " + curr.startTime.getTime() + " " + curr.endTime.getTime());
				if(parallelLegs(startTime, endTime, curr)) {
//					System.out.print("Parallel ");
					if(outsideBound(startTime, endTime, curr)) {
//						System.out.println("outside");
						startTime = curr.startTime;
						endTime = curr.endTime;
					} else if(startBefore(startTime, endTime, curr)) {
//						System.out.println("startBefore");
						startTime = curr.startTime;
					} else if(endAfter(startTime, endTime, curr)) {
						endTime = curr.endTime;
//						System.out.println("endAfter");
					} 
					
					first = curr.removeAndStartAgain();
					curr = first;

				}
				curr = curr.next;
			}
			
			time += (endTime.getTimeInMillis() - startTime.getTimeInMillis()) / 1000;
			first = first.next;
			if(first != null) {
				first.prev = null;
				curr = first.next;
			}
//			System.out.println((double)time/3600);
		}
		return time;
	}
	
	private static boolean parallelLegs(Calendar startTime, Calendar endTime, TimeSlot curr){
		return curr.startTime.compareTo(endTime) <= 0 && curr.endTime.compareTo(startTime) >= 0;
	}
	
	//leg start in the same moment and end in the same moment
	private static boolean same(Calendar startTime, Calendar endTime, TimeSlot curr){
		return startTime.compareTo(curr.startTime) == 0 && endTime.compareTo(curr.endTime) == 0;
	}
	
	private static boolean startBefore(Calendar startTime, Calendar endTime, TimeSlot curr){
		return startTime.after(curr.startTime) && endTime.compareTo(curr.endTime) >= 0;
	}
	
	private static boolean endAfter(Calendar startTime, Calendar endTime, TimeSlot curr){
		return endTime.before(curr.endTime) && startTime.compareTo(curr.startTime) <= 0;
	}
	
	//leg start before or in the same moment and end after or in the same moment
	private static boolean outsideBound(Calendar startTime, Calendar endTime, TimeSlot curr){
		return startTime.compareTo(curr.startTime) >= 0 && endTime.compareTo(curr.endTime) <= 0;
	}
	
	//leg start after or in the same moment and end before or in the same moment
	private static boolean insideBound(Calendar startTime, Calendar endTime, TimeSlot curr){
		return startTime.compareTo(curr.startTime) <= 0 && endTime.compareTo(curr.endTime) >= 0;
	}
	
}

class TimeSlot {
	TimeSlot next, prev;
	Calendar startTime, endTime;
	
	TimeSlot(Calendar startTime, Calendar endTime, TimeSlot prev){
		this.startTime = startTime;
		this.endTime = endTime;
		this.prev = prev;
		this.next = null;
		if(prev != null) prev.next = this;
	}
	

	TimeSlot removeAndStartAgain(){
		if(this.prev != null) this.prev.next = this.next;
		if(this.next != null) this.next.prev = this.prev;
		TimeSlot ts = this;
		while(ts.prev != null){
			ts = ts.prev;
		}
		
//		TimeSlot first = ts;
//		int count = 0;
//		while(first != null){
//			count++;
//			first = first.next;
//		}
//		System.out.println("Size: " + count);
		
		return ts;
	}
}