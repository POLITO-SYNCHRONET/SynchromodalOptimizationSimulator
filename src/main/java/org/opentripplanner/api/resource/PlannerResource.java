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
package org.opentripplanner.api.resource;

import org.glassfish.grizzly.http.server.Request;
import org.onebusaway.gtfs.model.Agency;
import org.opentripplanner.api.common.RoutingResource;
import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.api.model.TripPlan;
import org.opentripplanner.api.model.error.PlannerError;
import org.opentripplanner.common.geometry.SphericalDistanceLibrary;
import org.opentripplanner.common.model.GenericLocation;
import org.opentripplanner.graph_builder.GraphBuilder;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.routing.graph.Edge;
import org.opentripplanner.routing.graph.Graph;
import org.opentripplanner.routing.graph.Vertex;
import org.opentripplanner.routing.impl.DefaultStreetVertexIndexFactory;
import org.opentripplanner.routing.impl.GraphPathFinder;
import org.opentripplanner.routing.impl.MemoryGraphSource;
import org.opentripplanner.routing.services.GraphService;
import org.opentripplanner.routing.spt.GraphPath;
import org.opentripplanner.standalone.CommandLineParameters;
import org.opentripplanner.standalone.Router;
import org.opentripplanner.util.DateUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


import com.SynchroNET.database.DatabaseManager;
import com.SynchroNET.database.GenericConfiguration;
import com.SynchroNET.risk.analysis.Analysis;
import com.SynchroNET.risk.profiler.RandomNumber;
import com.SynchroNET.risk.profiler.RiskCalculation;
import com.SynchroNET.risk.profiler.RiskDataBaseManager;

import com.SynchroNET.routing.impl.SynchroGraphPathFinder;
import com.SynchroNET.utilities.FavouriteRouteFinder;
import com.SynchroNET.utilities.ServerReloader;
import com.SynchroNET.utilities.MultiDestinationMixer;
import com.SynchroNET.utilities.QualityCalculator;
import com.SynchroNET.utilities.SpecialRouteFinder;
import com.SynchroNET.utilities.TimesCalculator;
import com.SynchroNET.utilities.CapacityCalculator;
import com.SynchroNET.utilities.CostCalculator;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;

import java.io.FileInputStream;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.Map.Entry;
import java.util.Properties;
import java.util.Set;

import static org.opentripplanner.api.resource.ServerInfo.Q;

/**
 * This is the primary entry point for the trip planning web service.
 * All parameters are passed in the query string. These parameters are defined as fields in the abstract
 * RoutingResource superclass, which also has methods for building routing requests from query
 * parameters. This allows multiple web services to have the same set of query parameters.
 * In order for inheritance to work, the REST resources are request-scoped (constructed at each request)
 * rather than singleton-scoped (a single instance existing for the lifetime of the OTP server).
 */
@Path("routers/{routerId}/plan") // final element needed here rather than on method to distinguish from routers API
public class PlannerResource extends RoutingResource {

    private static final Logger LOG = LoggerFactory.getLogger(PlannerResource.class);
    
    // We inject info about the incoming request so we can include the incoming query
    // parameters in the outgoing response. This is a TriMet requirement.
    // Jersey uses @Context to inject internal types and @InjectParam or @Resource for DI objects.
    @GET
    @Produces({ MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML + Q, MediaType.TEXT_XML + Q })
    public Response plan(@Context UriInfo uriInfo, @Context Request grizzlyRequest) {
    	/*
         * TODO: add Lang / Locale parameter, and thus get localized content (Messages & more...)
         * TODO: from/to inputs should be converted / geocoded / etc... here, and maybe send coords 
         *       or vertex ids to planner (or error back to user)
         * TODO: org.opentripplanner.routing.module.PathServiceImpl has COOORD parsing. Abstract that
         *       out so it's used here too...
         */
        // Create response object, containing a copy of all request parameters. Maybe they should be in the debug section of the response.
        Response response = new Response(uriInfo);
        RoutingRequest request = null;
        Router router = null;
        List<GraphPath> paths = null;
        
        try {
            
            /* Fill in request fields from query parameters via shared superclass method, catching any errors. */
            request = super.buildRequest();

            if(request.capacityRequest==0) request.capacityRequest=1;
            
            request.numItineraries = 10;
            
            LOG.info("Username: " + this.username);
            
            router = otpServer.getRouter(this.username);

            //            RequestEditor.addBannedForced(request, router);
            
            /* Find some good GraphPaths through the OTP Graph. */
            SynchroGraphPathFinder gpFinder = new SynchroGraphPathFinder(router); // we could also get a persistent router-scoped GraphPathFinder but there's no setup cost here
            paths = gpFinder.graphPathFinderEntryPoint(request); //PHUONG: here Astar is called 

            //EDIT - Riccardo (28/03/2017): Here we find the first previous route the user has chosen from Data Base
           /* ArrayList<String[]> previousRoutes = DatabaseManager.findPreviousRoutesVertices(this.username, request.getFromPlace().place, request.getToPlace().place);

            if(previousRoutes.size() > 0){
            	 
                List<GraphPath> previousPaths = FavouriteRouteFinder.findMyFavouritePath(super.buildRequest(), otpServer, previousRoutes);

                for(int i = 0; i < paths.size(); i++){
                    if(paths.get(i).similarPaths(previousPaths)) paths.remove(i);
                }

                //We add the path to the paths calculated on the real graph

                for(int j = 0; j < previousPaths.size(); j++){
                    paths.add(previousPaths.get(j));
                }
                
            } */
            //EDIT - Riccardo (28/03/2017): END
            
            String multiDestinations = response.requestParameters.get("to2ndPlace");
            String[] otherDestinations = multiDestinations == null ? null : multiDestinations.split("---");
            Boolean[] hasArrivalTimes=null;
            String[] otherDates=null, otherTimes=null;
            if(otherDestinations != null){
            	
                String multiTimes = response.requestParameters.get("otherTime");
                String multiDates = response.requestParameters.get("otherDate");
                String multiHasArrivalTimes = response.requestParameters.get("otherTimeArriveVisible");
                
                otherTimes = multiTimes == null ? null : multiTimes.split("---");
                otherDates = multiDates == null ? null : multiDates.split("---");
                String[] stringHasArrivalTimes = multiHasArrivalTimes == null ? null : multiHasArrivalTimes.split("---");
                hasArrivalTimes = new Boolean [ stringHasArrivalTimes.length ];

                for(int i = 0; i < stringHasArrivalTimes.length; i++){
                	hasArrivalTimes[i] = Boolean.parseBoolean(stringHasArrivalTimes[i]);
                }
                
                for(int i = 0; i < otherDestinations.length; i++){

                	//EDIT - Riccardo (10/04/2017): We calculate routes for other destinations
                	RoutingRequest request2 = super.buildRequest();

                    request2.setToString(otherDestinations[i]);
                    
                    if(hasArrivalTimes[i]){
                        request2.setDateTimeArrive(otherDates[i], otherTimes[i], TimeZone.getDefault());
                        request2.timeArriveVisible = true;
                    } else {
                    	request2.timeArriveVisible = false;
                    }

                    Router router2 = otpServer.getRouter(request2.routerId);
                                        
                    SynchroGraphPathFinder gpFinder2 = new SynchroGraphPathFinder(router2); // we could also get a persistent router-scoped GraphPathFinder but there's no setup cost here
                    List<GraphPath> paths2 = gpFinder2.graphPathFinderEntryPoint(request2); //PHUONG: here Astar is called 

                    for(int j = 0; j < paths2.size(); j++){
                    	paths.add(paths2.get(j));
          	      	}
                    
                    //EDIT - Riccardo (28/03/2017): Here we find the other previous routes the user has chosen from Data Base
                    
//          		  ArrayList<String[]> previousRoutes2 = DatabaseManager.findPreviousRoutesVertices(this.username, request.getFromPlace().place, otherDestinations[i].split("::")[1]);
//                    
//                    if(previousRoutes2.size() > 0){
//                    	
//                        RoutingRequest routingPrevious2nd = super.buildRequest();
//                                                
//                        routingPrevious2nd.setToString(otherDestinations[i]);
//                        List<GraphPath> previousPaths2 = FavouriteRouteFinder.findMyFavouritePath(routingPrevious2nd, otpServer, previousRoutes2);
//            	        for(int jj = 0; jj < paths.size(); jj++){
//            	        	if(paths.get(jj).similarPaths(previousPaths2)) paths.remove(jj);
//            	        }
//
//                        for(int j = 0; j < previousPaths2.size(); j++){
//                            paths.add(previousPaths2.get(j));
//                        }
//                        
//                    }	
                    //EDIT - Riccardo (28/03/2017): END
                    
                }
            }

            //EDIT - Riccardo (10/04/2017): END
            
//            request.KPIimportance = true; request.co2_w = CO2; request.distance_w = distance; request.time_w = time; //EDIT - Riccardo (08/03/2017): Setting the right weight value to calculate the quality

            /* Convert the internal GraphPaths to a TripPlan object that is included in an OTP web service Response. */

            request.intermediatePlaces.clear();
            request.passByCities.clear();

            TripPlan plan = GraphPathToTripPlanConverter.generatePlan(paths, request);

        	//Riccardo (19-06-2017): class used to recalculate parte of itineraries
        	// SET srf AS A VARIABLE IN THE RISK FUNCTION
            
        	SpecialRouteFinder srf = new SpecialRouteFinder(this, otpServer);
        	//Riccardo (19-06-2017): END
          
            //Shuai(18-01-2018) possibility to disable risk analysis
            if(riskAnalysis){ 	        	 
	        	/*Edit- Yuanyuan(14/08/2017) for testing risk safety, delete it when there are other functions for storing the planned and executed data*/
	        	// RiskCalculation riskCal = new RiskCalculation(plan);
		   // 	riskCal.convertToDatabase(); 
	        	/*Yuanyuan (21/017/2017): Test risk*/
		    	// LOG.info("request test:"+request.getBoardTime(TraverseMode.BUS));
	        	Analysis analysis = new Analysis(srf, plan.itinerary, request);
	        	analysis.runRiskAnalysis();
	        	/*Edit- Yuanyuan(22/11/2017): Recalculate quality by considering also KRIs*/
	        	plan = QualityCalculator.addKRIQuality(plan, request);
            }
            
            /*Yuanyuan(30/04/2018): Interaction with real time module*/
          /*
            String bookedFile = "src/test/resources/xml/receive-bookedRoute.xml";
            int portNum = 1777;
            // receive booked file as a client with port number equal to 1777
            RiskDataBaseManager.receiveFile(portNum, bookedFile);
            // Yuanyuan(22/04/2018): Test parsing booked xml file
            int[] ids = RiskDataBaseManager.parseXMLFile(bookedFile, 1);
            // Modify file to add bookedId
            String newBookedFile = "src/test/resources/xml/new-receive-bookedRoute.xml";
            RiskDataBaseManager.modifyXML(bookedFile, ids, newBookedFile); 
            // Send back modified file to client with port number equal to 1778
            int portNum2 = 1778;
            RiskDataBaseManager.sendFile(portNum2, newBookedFile);
            // receive executed file as a client with port number equal to 1777
            String executedFile = "src/test/resources/xml/receive-executedRoute.xml";
            RiskDataBaseManager.receiveFile(portNum, executedFile);
            // parsing executed file
            RiskDataBaseManager.parseXMLFile(executedFile, 0); 
            */
            
            
            //EDIT - Riccardo (10/04/2017): We merge the itineraries that share medium point
            if(otherDestinations != null){
            	MultiDestinationMixer.findMultiDestinationItineraries(plan, otherDestinations, request);
            }

            //EDIT - Riccardo (10/04/2017): EDIT
            
            //DELETE IT LATER
//            //Shuai(11-01-2018) remove the limitation
//            while(plan.itinerary.size() > 10){
//            	plan.itinerary.remove(plan.itinerary.size() - 1);
//            }
            //DELETE IT LATER
//            ArrayList<Itinerary> itin = new ArrayList<>();
//            itin.add(srf.findLaterItinerary("Le Havre::49.4938,0.10767", "Patra::38.2444, 21.7344", new Date ( plan.itinerary.get(0).startTime.getTimeInMillis() + 1)));
//            plan.itinerary = itin;

            //Giovanni CAPACITY MODE START

            CapacityCalculator capacityCalculator = new CapacityCalculator(srf);
            int destinationsNumber = 1;
            Date[] arrivaltime;
            int[] multipleCapacity;
            if(otherDestinations != null) {
            	//Multi-Destination
            	destinationsNumber += otherDestinations.length;
            	multipleCapacity = new int[destinationsNumber];
           		arrivaltime = new Date[destinationsNumber];
           		
           		multipleCapacity[0] = request.capacityRequest;
           		String multiCapacity = response.requestParameters.get("otherCapacityRequest");
           		String[] otherCapacity = multiCapacity == null ? null : multiCapacity.split("---");
           		
           		for(int i = 1; i < destinationsNumber; i++) {
           			//for each destination save the arrival time and the capacity
           			if(hasArrivalTimes[i-1]) 
           				arrivaltime[i] = DateUtils.toDate(otherDates[i-1], otherTimes[i-1], TimeZone.getDefault());
           			
           			multipleCapacity[i] = Integer.parseInt(otherCapacity[i-1]);
           			if(multipleCapacity[i] <= 0)
           				multipleCapacity[i] = 1;
           		}
           		  		
            } else {
            	//Single Destination
            	multipleCapacity = new int[1];
            	arrivaltime = new Date[1];
            }
            
            //save arrival time and capacity of the first destination if it has one
        	multipleCapacity[0] = request.capacityRequest;
            if(multipleCapacity[0] <= 0) {
            	multipleCapacity[0] = 1;
            }
            if(request.timeArriveVisible) 
            	arrivaltime[0] = request.getDateTimeArrive();

            //capacityCalculator.calculateCapacity(plan, request, destinationsNumber, multipleCapacity, arrivaltime);
            capacityCalculator.startCapacityMode(plan, request, destinationsNumber, multipleCapacity, arrivaltime);    

           	//CAPACITY MODE END
            if(plan == null)  throw new Exception();
            //limita itinerary.
            while(plan.itinerary.size() > 20) 
            	plan.itinerary.remove(plan.itinerary.size() - 1);

            //try to calculate the real cost
            CostCalculator.calculateRealCosts(plan);
            if(otherDestinations != null || request.capacityRequest > 1) TimesCalculator.calculateTimesofParallelLegs(plan.itinerary, request);

            response.setPlan(plan);
            
        } catch (Exception e) {
            PlannerError error = new PlannerError(e);
            if(!PlannerError.isPlanningError(e.getClass()))
                LOG.warn("Error while planning path: ", e);
            response.setError(error);
        } finally {
            if (request != null) {
                if (request.rctx != null) {
                    response.debugOutput = request.rctx.debugOutput;
                }
                request.cleanup(); // TODO verify that this cleanup step is being done on Analyst web services
            }
        }
        /* Log this request if such logging is enabled. */
        if (request != null && router != null && router.requestLogger != null) {
            StringBuilder sb = new StringBuilder();
            String clientIpAddress = grizzlyRequest.getRemoteAddr();
            //sb.append(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            sb.append(clientIpAddress);
            sb.append(' ');
            sb.append(request.arriveBy ? "ARRIVE" : "DEPART");
            sb.append(' ');
            sb.append(LocalDateTime.ofInstant(Instant.ofEpochSecond(request.dateTime), ZoneId.systemDefault()));
            sb.append(' ');
            sb.append(request.modes.getAsStr());
            sb.append(' ');
            sb.append(request.from.lat);
            sb.append(' ');
            sb.append(request.from.lng);
            sb.append(' ');
            sb.append(request.to.lat);
            sb.append(' ');
            sb.append(request.to.lng);
            sb.append(' ');
            if (paths != null) {
                for (GraphPath path : paths) {
                    sb.append(path.getDuration());
                    sb.append(' ');
                    sb.append(path.getTrips().size());
                    sb.append(' ');
                }
            }
            router.requestLogger.info(sb.toString());
        }
        
        return response;
    }


}
