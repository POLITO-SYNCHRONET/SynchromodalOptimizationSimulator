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

package org.opentripplanner.routing.edgetype;

import org.onebusaway.gtfs.model.Stop;
import org.onebusaway.gtfs.model.Trip;
import org.opentripplanner.common.geometry.GeometryUtils;
import org.opentripplanner.common.geometry.SphericalDistanceLibrary;
import org.opentripplanner.gtfs.GtfsLibrary;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.ServiceDay;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.core.StateEditor;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.routing.graph.Edge;
import org.opentripplanner.routing.trippattern.TripTimes;
import org.opentripplanner.routing.vertextype.OnboardDepartVertex;
import org.opentripplanner.routing.vertextype.PatternStopVertex;

import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.LineString;
import java.util.Locale;

/**
 * A transit vehicle's journey (temporary vertex) between departure while onboard a trip and arrival
 * at the next. This version represents a set of such journeys specified by a TripPattern.
 * 
 * @author laurent
 */
public class OnBoardDepartPatternHop extends Edge implements OnboardEdge, TemporaryEdge {
    private static final long serialVersionUID = 1L;

    private TripTimes tripTimes;

    private ServiceDay serviceDay;

    private int stopIndex;

    private double positionInHop;

    private Trip trip;

    private Stop endStop;

    private LineString geometry = null;

    /**
     * @param from Originating vertex.
     * @param to Destination vertex: a PatternStopVertex for the next stop of the current hop.
     * @param tripTimes Resolved trip times for the trip with updated real-time info if available.
     * @param serviceDay Service day on which trip is running.
     * @param stopIndex Index of the current stop.
     * @param positionInHop Between 0 to 1, an estimation of the covered distance in this hop so
     *        far.
     */
    public OnBoardDepartPatternHop(OnboardDepartVertex from, PatternStopVertex to,
            TripTimes tripTimes, ServiceDay serviceDay, int stopIndex, double positionInHop) { //PHUONG: "to" variable belongs to "GTFS" stops"
        super(from, to);
        this.stopIndex = stopIndex;
        this.serviceDay = serviceDay;
        this.tripTimes = tripTimes;
        this.positionInHop = positionInHop;
        this.trip = tripTimes.trip;
        this.endStop = to.getStop();
    }

    public double getDistanceInMeters() {
        /*
         * Do not multiply by positionInHop, as it is already taken into account by the from vertex
         * location.
         */
        return SphericalDistanceLibrary.distance(getFromVertex().getY(),
                getFromVertex().getX(), endStop.getLat(), endStop.getLon());
    }

    public double getDistanceP() {
        /*
         * Do not multiply by positionInHop, as it is already taken into account by the from vertex
         * location.
         */
        return SphericalDistanceLibrary.distanceP(getFromVertex().getY(),
                getFromVertex().getX(), endStop.getLat(), endStop.getLon());
    }

    public TraverseMode getMode() {
        return GtfsLibrary.getTraverseMode(trip.getRoute());
    }

    public String getName() {
        return GtfsLibrary.getRouteName(trip.getRoute());
    }

    public String getRouteID(){ //PHUONG
    	return GtfsLibrary.getRouteID(trip.getRoute());
    }
    
    @Override
    public String getName(Locale locale) {
        return this.getName();
    }

    public State optimisticTraverse(State state0) {
        return traverse(state0);
    }

    public State traverse(State state0) {
        RoutingRequest options = state0.getOptions();

        if (options.reverseOptimizing || options.reverseOptimizeOnTheFly) {
            throw new UnsupportedOperationException(
                    "Cannot (yet) reverse-optimize depart-on-board mode.");
        }
        
        /* Can't be traversed backwards. */
        if (options.arriveBy)
            return null;

        StateEditor s1 = state0.edit(this);
        // s1.setBackMode(TraverseMode.BOARDING); TODO Do we need this?
        s1.setServiceDay(serviceDay);
        s1.setTripTimes(tripTimes);

        // s1.incrementNumBoardings(); TODO Needed?
        s1.setTripId(trip.getId());
        s1.setPreviousTrip(trip);
        s1.setZone(endStop.getZoneId());
        s1.setRoute(trip.getRoute().getId());

        int remainingTime = (int) Math.round(
                (1.0 - positionInHop) * tripTimes.getRunningTime(stopIndex)); //getRunningTime = getArrivalTime(stopIndex + 1) - getDepartureTime(stopIndex);

        s1.incrementTimeInSeconds(remainingTime);
        
        double cost_timeP = options.cost_per_hour * remainingTime/3600.0;
        double cost_distanceP = getDistanceP(); //in km
        s1.incrementDistance(cost_distanceP);
        double cost_C02 =  cost_distanceP; 
        if (getMode() == TraverseMode.FERRY)
        {
        	cost_distanceP *= options.cost_distance_per_km_ship;
        	//LOG.info("RouteID = {}",getRouteID());
        	if (getRouteID().endsWith("_1")) //1: slow velocity
        	{
        		//LOG.info("SLOW: {}   CO2 = {}",getRouteID(),options.co2_per_km_ship_Slow);
        		cost_C02 *=  options.co2_per_km_feeder_ship_Slow;
        	}
        	else if (getRouteID().endsWith("_2")) //2: medium velocity
    			cost_C02 *=  options.co2_per_km_feeder_ship_Medium;
        	else if (getRouteID().endsWith("_3")) //3: fast velocity
    			cost_C02 *=  options.co2_per_km_feeder_ship_Fast;
        	else 	cost_C02 *=  options.co2_per_km_feeder_ship; //velocity is not defined
        	//LOG.info("banned tripID = {}",tripId);
        }
        else if (getMode() == TraverseMode.BUS)
        {
        	cost_distanceP *= options.cost_distance_per_km_truck;
        	cost_C02 *=  options.co2_per_km_truck;
        }
        else if (getMode() == TraverseMode.RAIL)
        {
        	cost_distanceP *= options.cost_distance_per_km_train;
        	cost_C02 *=  options.co2_per_km_train;
        }
        
        s1.incrementcostDistance(cost_distanceP);
        s1.incrementcostTime(cost_timeP);
         
        //Generalized cost = distance_w * cost_distance_per_km_train * distance + co2_w * co2_cost_per_kg * co2_per_km_train * distance + time_w * cost_per_hour * traveltime
        s1.incrementCO2(cost_C02);
        cost_C02 *=  options.co2_cost_per_kg; 
        s1.incrementcostCO2(cost_C02);
         
        double weightP = options.distance_w * cost_distanceP + options.co2_w * cost_C02 + options.time_w * cost_timeP;
        s1.incrementWeight(weightP);
        //s1.incrementWeight(remainingTime);
        
        s1.setBackMode(getMode());
        s1.setEverBoarded(true);
        return s1.makeState();
    }

    public void setGeometry(LineString geometry) {
        this.geometry = geometry;
    }

    public LineString getGeometry() {
        if (geometry == null) {
            Coordinate c1 = new Coordinate(getFromVertex().getX(), getFromVertex().getY());
            Coordinate c2 = new Coordinate(endStop.getLon(), endStop.getLat());
            geometry = GeometryUtils.getGeometryFactory().createLineString(
                    new Coordinate[] { c1, c2 });
        }
        return geometry;
    }

    public String toString() {
        return "OnBoardPatternHop(" + getFromVertex() + ", " + getToVertex() + ")";
    }

    @Override
    public int getStopIndex() {
        return stopIndex;
    }

    @Override
    public Trip getTrip() {
        return trip;
    }

    @Override
    public String getDirection() {
        return tripTimes.getHeadsign(stopIndex);
    }

    @Override
    public void dispose() {
        tov.removeIncoming(this);
    }
}
