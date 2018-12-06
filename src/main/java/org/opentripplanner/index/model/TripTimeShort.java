package org.opentripplanner.index.model;

import java.util.Iterator;
import java.util.List;

import org.onebusaway.gtfs.model.AgencyAndId;
import org.onebusaway.gtfs.model.Stop;
import org.onebusaway.gtfs.model.Trip;
import org.opentripplanner.routing.core.ServiceDay;
import org.opentripplanner.routing.edgetype.Timetable;
import org.opentripplanner.routing.trippattern.FrequencyEntry;
import org.opentripplanner.routing.trippattern.RealTimeState;
import org.opentripplanner.routing.trippattern.TripTimes;

import com.beust.jcommander.internal.Lists;

public class TripTimeShort {

    public static final int UNDEFINED = -1;
    public AgencyAndId stopId;
    public int scheduledArrival = UNDEFINED ;
    public int scheduledDeparture = UNDEFINED ;
    public int realtimeArrival = UNDEFINED ;
    public int realtimeDeparture = UNDEFINED ;
    public int arrivalDelay = UNDEFINED ;
    public int departureDelay = UNDEFINED ;
    public boolean timepoint = false;
    public boolean realtime = false;
    public RealTimeState realtimeState = RealTimeState.SCHEDULED ;
    public long serviceDay;
    public AgencyAndId tripId;

    /**
     * This is stop-specific, so the index i is a stop index, not a hop index.
     */
    public TripTimeShort(TripTimes tt, int i, Stop stop) {
        stopId = stop.getId();
        scheduledArrival   = tt.getScheduledArrivalTime(i);
        realtimeArrival    = tt.getArrivalTime(i);
        arrivalDelay       = tt.getArrivalDelay(i);
        scheduledDeparture = tt.getScheduledDepartureTime(i);
        realtimeDeparture  = tt.getDepartureTime(i);
        departureDelay     = tt.getDepartureDelay(i);
        timepoint          = tt.isTimepoint(i);
        realtime           = !tt.isScheduled();
        realtimeState      = tt.getRealTimeState();
    }

    public TripTimeShort(TripTimes tt, int i, Stop stop, ServiceDay sd) {
        this(tt, i, stop);
        tripId = tt.trip.getId();
        serviceDay = sd.time(0);
    }

    /**
     * must pass in both table and trip, because tripTimes do not have stops.
     */
	//Shuai(16-10-2017) fix "outOfBound" error & get tripTimes from frequencyEntry as well
    public static List<TripTimeShort> fromTripTimes (Timetable table, Trip trip) {
//    	Iterator it = table.tripTimes.iterator();
//    	System.out.println("from trip times! :" + table.tripTimes.size());
//    	while(it.hasNext())
//    		System.out.println(it.next());
//    	System.out.println("fromTripTimes! : " + table.getTripIndex(trip.getId())); 	
//    	
//    	Iterator it2 = table.frequencyEntries.iterator();
//    	System.out.println("from trip times frequencyEntries! :" + table.frequencyEntries.size());
//    	while(it2.hasNext()){
//    		System.out.println(it2.next());
//    	}
    	
    	List<TripTimeShort> out = Lists.newArrayList();
    	TripTimes times;
    	
    	if(table.getTripIndex(trip.getId()) != -1){
    		times = table.getTripTimes(table.getTripIndex(trip.getId()));        
	        // one per stop, not one per hop, thus the <= operator
	        for (int i = 0; i < times.getNumStops(); ++i) {
	            out.add(new TripTimeShort(times, i, table.pattern.getStop(i)));
	        }	
    	}
    	if(table.frequencyEntries.size() > 0){
    		Iterator iterator = table.frequencyEntries.iterator();
    		while(iterator.hasNext()){
    			times = ((FrequencyEntry)iterator.next()).tripTimes;
    			for (int i = 0; i < times.getNumStops(); ++i) {
    	            out.add(new TripTimeShort(times, i, table.pattern.getStop(i)));
    	        }
    		}
    	}
        return out;
    }
    
}
