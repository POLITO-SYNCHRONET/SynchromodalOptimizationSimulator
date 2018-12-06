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
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.atomic.AtomicLong;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElementWrapper;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlSeeAlso;

import org.onebusaway.gtfs.model.AgencyAndId;
import org.opentripplanner.api.model.alertpatch.LocalizedAlert;
import org.opentripplanner.routing.alertpatch.Alert;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.util.model.EncodedPolylineBean;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

/**
 * One leg of a trip -- that is, a temporally continuous piece of the journey
 * that takes place on a particular vehicle (or on foot).
 */
//@XmlElement
@XmlAccessorType(XmlAccessType.FIELD)
public class Leg {

	public String destinationId = "1"; // EDIT - Riccardo (10/04/2017): we use that to know in which branch of the
										// itinerary is the leg in a multiple destination search

	public String previousDestinationId = "0"; // EDIT - Riccardo (17/05/2017): we use that to know from which branch
												// was starting this leg in a multiple destination search
	
	public int finalDestination = 0;//if is the last leg of an itinerary set it to the corresponding multidestination Id
	
	// EDIT - Riccardo (06/06/2017): store operational and waiting time in seconds
	public int boarding = 0;
	public int alighting = 0;
	public int transit = 0;
	public long waiting = 0;
	
	// EDIT - Riccardo (06/06/2017): END
	// Giovanni: add capacity
	public int capacity = 0;
	public int assignedcontainers = 0;
	public Double costforonecontainerTruck = null;
	public String capacityId = "1";
	public String prevCapacityId = "";
	public String nextCapacityId = "";
	// Giovanni: END

	/**
	 * The date and time this leg begins.
	 */
	public Calendar startTime = null;

	/**
	 * The date and time this leg ends.
	 */
	public Calendar endTime = null;

	/*
	 * EDIT:Yuanyuan-06/22/2017--add 3 more fields, for storing the time after
	 * disturbance(minutes) and id in risk analysis
	 */
	public long startTimeDisturbed = 0;
	public long endTimeDisturbed = 0;
	public static final AtomicLong NEXT_ID_Leg = new AtomicLong(0);
	private long id;
	
	/*EDIT-Yuanyuan(23/06/2018): add steaming type for the use of ship leg*/
	public String steamingType;

	public Leg() {
		id = NEXT_ID_Leg.getAndIncrement();
	}
	
	public Leg(Leg leg) {
		id = NEXT_ID_Leg.getAndIncrement();
		this.cloneLeg(leg);
	}

	public long getID() {
		return id;
	}

	/*********************************************************************************************/

	/**
	 * For transit leg, the offset from the scheduled departure-time of the boarding
	 * stop in this leg. "scheduled time of departure at boarding stop" = startTime
	 * - departureDelay
	 */
	public int departureDelay = 0;
	/**
	 * For transit leg, the offset from the scheduled arrival-time of the alighting
	 * stop in this leg. "scheduled time of arrival at alighting stop" = endTime -
	 * arrivalDelay
	 */
	public int arrivalDelay = 0;
	/**
	 * Whether there is real-time data about this Leg
	 */
	public Boolean realTime = false;

	/**
	 * Is this a frequency-based trip with non-strict departure times?
	 */
	public Boolean isNonExactFrequency = null;

	/**
	 * The best estimate of the time between two arriving vehicles. This is
	 * particularly important for non-strict frequency trips, but could become
	 * important for real-time trips, strict frequency trips, and scheduled trips
	 * with empirical headways.
	 */
	public Integer headway = null;

	/**
	 * The distance traveled while traversing the leg in meters.
	 */
	public Double distance = null;
	public Double costdistance = null;
	public Double costtime = null;

	/**
	 * The CO2 emission while traversing the leg in kgs.
	 */
	public Double CO2 = null;
	public Double costCO2 = null;

	public Double totalcost_multiobjective = null;
	public Double totalcost = null;

	/**
	 * Is this leg a traversing pathways?
	 */
	public Boolean pathway = false;

	/**
	 * The mode (e.g., <code>Walk</code>) used when traversing this leg.
	 */
	@XmlAttribute
	@JsonSerialize
	public String mode = TraverseMode.WALK.toString();

	/**
	 * For transit legs, the route of the bus or train being used. For non-transit
	 * legs, the name of the street being traversed.
	 */
	@XmlAttribute
	@JsonSerialize
	public String route = "";

	@XmlAttribute
	@JsonSerialize
	public String agencyName;

	@XmlAttribute
	@JsonSerialize
	public String agencyUrl;

	@XmlAttribute
	@JsonSerialize
	public int agencyTimeZoneOffset;

	/**
	 * For transit leg, the route's (background) color (if one exists). For
	 * non-transit legs, null.
	 */
	@XmlAttribute
	@JsonSerialize
	public String routeColor = null;

	/**
	 * For transit legs, the type of the route. Non transit -1 When 0-7: 0 Tram, 1
	 * Subway, 2 Train, 3 Bus, 4 Ferry, 5 Cable Car, 6 Gondola, 7 Funicular When
	 * equal or highter than 100, it is coded using the Hierarchical Vehicle Type
	 * (HVT) codes from the European TPEG standard Also see
	 * http://groups.google.com/group/gtfs-changes/msg/ed917a69cf8c5bef
	 */
	@XmlAttribute
	@JsonSerialize
	public Integer routeType = null;

	/**
	 * For transit legs, the ID of the route. For non-transit legs, null.
	 */
	public AgencyAndId routeId = null;

	/**
	 * For transit leg, the route's text color (if one exists). For non-transit
	 * legs, null.
	 */
	@XmlAttribute
	@JsonSerialize
	public String routeTextColor = null;

	/**
	 * For transit legs, if the rider should stay on the vehicle as it changes route
	 * names.
	 */
	@XmlAttribute
	@JsonSerialize
	public Boolean interlineWithPreviousLeg;

	/**
	 * For transit leg, the trip's short name (if one exists). For non-transit legs,
	 * null.
	 */
	@XmlAttribute
	@JsonSerialize
	public String tripShortName = null;

	/**
	 * For transit leg, the trip's block ID (if one exists). For non-transit legs,
	 * null.
	 */
	@XmlAttribute
	@JsonSerialize
	public String tripBlockId = null;

	/**
	 * For transit legs, the headsign of the bus or train being used. For
	 * non-transit legs, null.
	 */
	@XmlAttribute
	@JsonSerialize
	public String headsign = null;

	/**
	 * For transit legs, the ID of the transit agency that operates the service used
	 * for this leg. For non-transit legs, null.
	 */
	@XmlAttribute
	@JsonSerialize
	public String agencyId = null;

	/**
	 * For transit legs, the ID of the trip. For non-transit legs, null.
	 */
	public AgencyAndId tripId = null;

	/**
	 * For transit legs, the service date of the trip. For non-transit legs, null.
	 */
	@XmlAttribute
	@JsonSerialize
	public String serviceDate = null;

	/**
	 * The Place where the leg originates.
	 */
	public Place from = null;

	/**
	 * The Place where the leg begins.
	 */
	public Place to = null;

	/**
	 * For transit legs, intermediate stops between the Place where the leg
	 * originates and the Place where the leg ends. For non-transit legs, null. This
	 * field is optional i.e. it is always null unless "showIntermediateStops"
	 * parameter is set to "true" in the planner request.
	 */
	@XmlElementWrapper(name = "intermediateStops")
	@JsonProperty(value = "intermediateStops")
	public List<Place> stop;

	/**
	 * The leg's geometry.
	 */
	public EncodedPolylineBean legGeometry;

	/**
	 * A series of turn by turn instructions used for walking, biking and driving.
	 */
	@XmlElementWrapper(name = "steps")
	@JsonProperty(value = "steps")
	public List<WalkStep> walkSteps;

	@XmlElement
	@JsonSerialize
	public List<LocalizedAlert> alerts;

	@XmlAttribute
	@JsonSerialize
	public String routeShortName;

	@XmlAttribute
	@JsonSerialize
	public String routeLongName;

	@XmlAttribute
	@JsonSerialize
	public String boardRule;

	@XmlAttribute
	@JsonSerialize
	public String alightRule;

	@XmlAttribute
	@JsonSerialize
	public Boolean rentedBike;

	/**
	 * Whether this leg is a transit leg or not.
	 * 
	 * @return Boolean true if the leg is a transit leg
	 */
	public Boolean isTransitLeg() {
		if (mode == null)
			return null;
		else if (mode.equals(TraverseMode.WALK.toString()))
			return false;
		else if (mode.equals(TraverseMode.CAR.toString()))
			return false;
		else if (mode.equals(TraverseMode.BICYCLE.toString()))
			return false;
		else
			return true;
	}

	public Boolean isSHIPLeg() {
		if (mode == null)
			return null;
		else if (mode.equals(TraverseMode.FERRY.toString()))
			return true;
		else
			return false;
	}

	public Boolean isTRUCKLeg() {
		if (mode == null)
			return null;
		else if (mode.equals(TraverseMode.BUS.toString()))
			return true;
		else
			return false;
	}

	public Boolean isTRAINLeg() {
		if (mode == null)
			return null;
		else if (mode.equals(TraverseMode.RAIL.toString()))
			return true;
		else if (mode.equals(TraverseMode.SUBWAY.toString()))
			return true;
		else if (mode.equals(TraverseMode.TRAM.toString()))
			return true;
		else if (mode.equals(TraverseMode.FUNICULAR.toString()))
			return true;
		else if (mode.equals(TraverseMode.GONDOLA.toString()))
			return true;
		else
			return false;
	}

	/**
	 * The leg's duration in seconds
	 */
	@XmlElement
	@JsonSerialize
	public double getDuration() {
		return endTime.getTimeInMillis() / 1000.0 - startTime.getTimeInMillis() / 1000.0;
	}
	
	public long getDurationLong() {
		return endTime.getTimeInMillis() - startTime.getTimeInMillis();
	}

	public void addAlert(Alert alert, Locale locale) {
		if (alerts == null) {
			alerts = new ArrayList<>();
		}
		for (LocalizedAlert a : alerts) {
			if (a.alert.equals(alert)) {
				return;
			}
		}
		alerts.add(new LocalizedAlert(alert, locale));
	}

	public void setTimeZone(TimeZone timeZone) {
		Calendar calendar = Calendar.getInstance(timeZone);
		calendar.setTime(startTime.getTime());
		startTime = calendar;
		calendar = Calendar.getInstance(timeZone);
		calendar.setTime(endTime.getTime());
		endTime = calendar;
		agencyTimeZoneOffset = timeZone.getOffset(startTime.getTimeInMillis());
	}
	
	/*
	 * 21-02-18 Giovanni
	 * Method for clone an existent leg to this one
	 * @param Leg leg: the source leg to copy.
	 */
	public void cloneLeg(Leg leg) {
		this.agencyId = leg.agencyId;
		this.agencyName = leg.agencyName;
		this.agencyTimeZoneOffset = leg.agencyTimeZoneOffset;
		this.agencyUrl = leg.agencyUrl;
		this.alerts = leg.alerts;
		this.alighting = leg.alighting;
		this.alightRule = leg.alightRule;
		this.arrivalDelay = leg.arrivalDelay;
		this.assignedcontainers = leg.assignedcontainers;
		this.boarding = leg.boarding;
		this.boardRule = leg.boardRule;
		this.capacity = leg.capacity;
		this.capacityId = leg.capacityId;
		this.CO2 = leg.CO2;
		this.costCO2 = leg.costCO2;
		this.costdistance = leg.costdistance;
		this.costforonecontainerTruck = leg.costforonecontainerTruck;
		this.costtime = leg.costtime;
		this.departureDelay = leg.departureDelay;
		this.destinationId = leg.destinationId;
		this.distance = leg.distance;
		this.endTime = leg.endTime;
		this.endTimeDisturbed = leg.endTimeDisturbed;
		this.finalDestination = leg.finalDestination;
		this.from = leg.from;
		this.headsign = leg.headsign;
		this.headway = leg.headway;
		this.interlineWithPreviousLeg = leg.interlineWithPreviousLeg;
		this.isNonExactFrequency = leg.isNonExactFrequency;
		this.legGeometry = leg.legGeometry;
		this.mode = leg.mode;
		this.nextCapacityId = leg.nextCapacityId;
		this.pathway = leg.pathway;
		this.prevCapacityId = leg.prevCapacityId;
		this.previousDestinationId = leg.previousDestinationId;
		this.realTime = leg.realTime;
		this.rentedBike = leg.rentedBike;
		this.route = leg.route;
		this.routeColor = leg.routeColor;
		this.routeId = leg.routeId;
		this.routeLongName = leg.routeLongName;
		this.routeShortName = leg.routeShortName;
		this.routeTextColor = leg.routeTextColor;
		this.routeType = leg.routeType;
		this.serviceDate = leg.serviceDate;
		this.startTime = leg.startTime;
		this.startTimeDisturbed = leg.startTimeDisturbed;
		this.stop = leg.stop;
		this.to = leg.to;
		this.totalcost = leg.totalcost;
		this.totalcost_multiobjective = leg.totalcost_multiobjective;
		this.transit = leg.transit;
		this.tripBlockId = leg.tripBlockId;
		this.tripId = leg.tripId;
		this.tripShortName = leg.tripShortName;
		this.waiting = leg.waiting;
		this.walkSteps = leg.walkSteps;
	}

	public void setEndTime(long  endTime) {
		this.endTime.setTimeInMillis(endTime);
	}
}
