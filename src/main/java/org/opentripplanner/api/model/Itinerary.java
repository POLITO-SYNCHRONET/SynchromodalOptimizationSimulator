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
package org.opentripplanner.api.model;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Iterator;
import java.util.List;
import java.util.TimeZone;
import java.util.concurrent.atomic.AtomicLong;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElementWrapper;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;

import org.onebusaway.gtfs.model.calendar.CalendarServiceData;
import org.opentripplanner.routing.core.Fare;

import com.SynchroNET.risk.analysis.KeyRiskIndicators;

/**
 * An Itinerary is one complete way of getting from the start location to the end location.
 */
@XmlRootElement (name="itinerary")
@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name="")
public class Itinerary {

    /**
     * Duration of the trip on this itinerary, in seconds.
     */
	
	public String verticesLabels; //EDIT - Riccardo (28/03/2017): vertex label to recreate routes from db
	
    //Riccardo:  store different types of times (seconds) and costs
    public Long operationalTime = 0L;
    public Long travelTime = 0L;
    public Long waitingTime = 0L;
    
    public double costDistance = 0;
    public double costCO2 = 0;
    public double costTime = 0;
    
    public double travelTimeCost = 0;
    public double operationalCost = 0;
    public double waitingCost = 0;
    public double travelCost = 0; // consider distance, time and CO2 costs
    
    public Long duration = 0L;

    public boolean fromDatabase = false; //EDIT - Riccardo (19/04/2017): itinerary previous booked

    public Long elapsedTime = 0L; //EDIT - Riccardo (28/03/2017): time passed between the booking and the arrival
    
    /**
     * Time that the trip departs.
     */
    public Calendar startTime = null;
    /**
     * Time that the trip arrives.
     */
    public Calendar endTime = null;

    /***************************************  PHUONG ***********************************************************/
    /**
     * The distance, in km.
     */
    public Double distance = 0.0; public Double distanceSHIP = 0.0;public Double distanceTRUCK = 0.0;public Double distanceTRAIN = 0.0;    
    
    /**
     * The CO2, in kg.
     */
    public Double CO2 = 0.0;public Double CO2SHIP = 0.0;public Double CO2TRUCK = 0.0;public Double CO2TRAIN = 0.0;
    
    public Double totalcost = 0.0; public Double totalcostSHIP = 0.0;public Double totalcostTRUCK = 0.0;public Double totalcostTRAIN = 0.0;
    //int quality = 0;
    
    public boolean haveTRUCK = false;
    public boolean haveSHIP = false;
    public boolean haveTRAIN = false;
    public int quality = 0;
    
    /*
     * EDIT:Yuanyuan-06/08/2017--add one more field id, and initialize it in the constructor
     * */
    public static final AtomicLong NEXT_ID = new AtomicLong(0);
    private long id;
    
    public Itinerary() {
    	id = NEXT_ID.getAndIncrement(); 
    }
    
    public Itinerary(Itinerary itinerary) {
    	id = NEXT_ID.getAndIncrement(); 
    	this.cloneItinerary(itinerary, true);
    }
    
    public long getID() {
    	return id;
    }
    /*
     * EDIT:Yuanyuan-06/23/2017--add one more field for storing risk indicators
     * */
    public KeyRiskIndicators KRIs = new KeyRiskIndicators();
    /***************************************   ***********************************************************/
    
    /**
     * The cost of this trip
     */
    // @XmlTransient
    // this annotation indicates that the class shouldn't be mapped to XML by itself, resolves the name collision about money
    public Fare fare = new Fare();

    /**
     * A list of Legs. Each Leg is either a walking (cycling, car) portion of the trip, or a transit
     * trip on a particular vehicle. So a trip where the use walks to the Q train, transfers to the
     * 6, then walks to their destination, has four legs.
     */
    @XmlElementWrapper(name = "legs")
    @XmlElement(name = "leg")
    public List<Leg> legs = new ArrayList<Leg>();

    /**
     * This itinerary has a greater slope than the user requested (but there are no possible 
     * itineraries with a good slope). 
     */
    public boolean tooSloped = false;

    /** 
     * adds leg to array list
     * @param leg
     */
    public void addLeg(Leg leg) {
        if(leg != null)
        {
            legs.add(leg);
            //PHUONG:
            if (leg.isSHIPLeg())
            {
            	this.CO2SHIP += leg.CO2;
            	this.distanceSHIP += leg.distance;
            	this.totalcostSHIP += leg.totalcost;
            	haveSHIP = true;
            }
            else if (leg.isTRAINLeg())
            {
            	this.CO2TRAIN += leg.CO2;
            	this.distanceTRAIN += leg.distance;
            	this.totalcostTRAIN += leg.totalcost;
            	haveTRAIN = true;
            }
            else if (leg.isTRUCKLeg())
            {
            	this.CO2TRUCK += leg.CO2;
            	this.distanceTRUCK += leg.distance;
            	this.totalcostTRUCK += leg.totalcost;
            	haveTRUCK = true;
            } 
        }
    }
    
    //Giovanni: chiedere a Riccardo se considerare la distanza
    /** 
     * adds leg to array list for alternative leg for capacity. Trucks cost is already * for the assignedcontainers
     * @param leg
     */
    public void addLegFromAnotherItineraryForCapacity(Leg leg) {
        if(leg != null)
        {
            legs.add(leg);
            if (leg.isSHIPLeg())
            {
            	this.CO2SHIP += leg.CO2;
            	this.distanceSHIP += leg.distance; 
            	this.totalcostSHIP += leg.totalcost;
            	haveSHIP = true;
            }
            else if (leg.isTRAINLeg())
            {
            	this.CO2TRAIN += leg.CO2;
            	this.distanceTRAIN += leg.distance;
            	this.totalcostTRAIN += leg.totalcost;
            	haveTRAIN = true;
            }
            else if (leg.isTRUCKLeg())
            {
            	this.CO2TRUCK += leg.CO2;
            	this.distanceTRUCK += leg.distance;
            	this.totalcostTRUCK += leg.totalcost;
            	haveTRUCK = true;
            }
            this.totalcost+=leg.totalcost;
            this.CO2+=leg.CO2;
            this.costCO2+=leg.costCO2;
        }
    }

    /** 
     * remove the leg from the list of legs 
     * @param leg object to be removed
     */
    public void removeLeg(Leg leg) {
        if(leg != null) {
            legs.remove(leg);
        }
    }
    
    public void fixupDates(CalendarServiceData service) {
        TimeZone startTimeZone = null;
        TimeZone timeZone = null;
        Iterator<Leg> it = legs.iterator();
        while (it.hasNext()) {
            Leg leg = it.next();
            if (leg.agencyId == null) {
                if (timeZone != null) {
                    leg.setTimeZone(timeZone);
                }
            } else {
                timeZone = service.getTimeZoneForAgencyId(leg.agencyId);
                if (startTimeZone == null) {
                    startTimeZone = timeZone; 
                 }
            }
        }
        if (timeZone != null) {
            Calendar calendar = Calendar.getInstance(startTimeZone);
            calendar.setTime(startTime.getTime());
            startTime = calendar;
            // go back and set timezone for legs prior to first transit
            it = legs.iterator();
            while (it.hasNext()) {
                Leg leg = it.next();
                if (leg.agencyId == null) {
                    leg.setTimeZone(startTimeZone);
                } else {
                    break;
                }
            }
            calendar = Calendar.getInstance(timeZone);
            calendar.setTime(endTime.getTime());
            endTime = calendar;
        }
    }
    
    //EDIT - Riccardo (31/03/2017): add vertices labels to the object itinerary  
    public void setVerticesLabels(String verticesLabels){
    	this.verticesLabels = verticesLabels;
    }
    //EDIT - Riccardo (31/03/2017): END
    
    /*
     * 21-02-18 Giovanni
     * @param Itinerary it: the itinerary to copy.
     */
    public void cloneItinerary(Itinerary it, Boolean flagleg) {
		this.CO2 = it.CO2;
		this.CO2SHIP = it.CO2SHIP;
		this.CO2TRAIN = it.CO2TRAIN;
		this.CO2TRUCK = it.CO2TRUCK;
		this.costCO2 = it.costCO2;
		this.costDistance = it.costDistance;
		this.costTime = it.costTime;
		this.distance = it.distance;
		this.distanceSHIP = it.distanceSHIP;
		this.distanceTRAIN = it.distanceTRAIN;
		this.distanceTRUCK = it.distanceTRUCK;
		this.duration = it.duration;
		this.elapsedTime = it.elapsedTime;
		this.endTime = it.endTime;
		this.fare = it.fare;
		this.fromDatabase = it.fromDatabase;
		this.haveSHIP = it.haveSHIP;
		this.haveTRAIN = it.haveTRAIN;
		this.haveTRUCK = it.haveTRUCK;
		this.KRIs = it.KRIs;
		this.operationalCost = it.operationalCost;
		this.operationalTime = it.operationalTime;
		this.quality = it.quality;
		this.startTime = it.startTime;
		this.tooSloped = it.tooSloped;
		this.totalcost = it.totalcost;
		this.totalcostSHIP = it.totalcostSHIP;
		this.totalcostTRAIN = it.totalcostTRAIN;
		this.totalcostTRUCK = it.totalcostTRUCK;
		this.travelCost = it.travelCost;
		this.travelTime = it.travelTime;
		this.travelTimeCost = it.travelTimeCost;
		this.verticesLabels = it.verticesLabels;
		this.waitingCost = it.waitingCost;
		this.waitingTime = it.waitingTime;

		if (flagleg) {
			for (Leg leg : it.legs) {
				Leg nl = new Leg(leg);
				this.legs.add(nl);
			}
		}
	}
}
