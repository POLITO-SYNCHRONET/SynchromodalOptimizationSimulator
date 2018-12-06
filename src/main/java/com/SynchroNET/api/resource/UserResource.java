//Shuai 

package com.SynchroNET.api.resource;

import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.UriInfo;
import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Marshaller;

import org.hsqldb.Database;
import org.opentripplanner.api.model.Itineraries;
import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.resource.Response;
import org.opentripplanner.standalone.OTPServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.database.DatabaseManager;
import com.SynchroNET.database.GenericConfiguration;
import com.SynchroNET.database.RoutesConfiguration;
import com.SynchroNET.database.VehicleConfiguration;
import com.SynchroNET.utilities.GraphRebuilder;
import com.SynchroNET.utilities.UserManagement;
import com.amazonaws.util.json.JSONArray;
import com.amazonaws.util.json.JSONException;
import com.amazonaws.util.json.JSONObject;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.introspect.VisibilityChecker;

@Path("routers/{routerId}/user")
public class UserResource {

    private static final Logger LOG = LoggerFactory.getLogger(UserResource.class);
    
    @Context OTPServer otpserver;

    @POST
    @Path("/register")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int register(User user){
    		System.out.println(user.getUsername() + ":  " + user.getPassword());
    		//add to database
    		// Edit-Yuanyuan(07-12-2017): for "role", discuss later (TO DO)
    		boolean result = DatabaseManager.addUser(user.getUsername(), user.getPassword(), "admin");
    		if (result)
    			return 0;
    		//0 success
    		//-1 username in use
		return -1;
    }
    
    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int login(User user){
		System.out.println(user.getUsername() + ":  " + user.getPassword());
		//connect database for authentication
		boolean result = DatabaseManager.checkUser(user.getUsername(), user.getPassword()); 
		if (result)
			return 0;
		//0 success
		//-1 wrong username or password
		return -1;
    }
    
    /*Edit-Yuanyuan(01/12/2017): for implementing the operations of preferred routes*/
    @POST
    @Path("/bookmark/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addBookmark(Bookmark bookmark){
    		    int reply = 0;
    		    String[] destinations = bookmark.getArrival().split("---");
		// for(int i = 0; i < destinations.length; i++){
			LOG.info("Check "+bookmark.getDeparture()+" arrival "+bookmark.getArrival());
			StringJoiner to = new StringJoiner(";"); // use ";" as delimiter for storing more than one destinations in one field
			for(int i = 0; i < destinations.length; i++){
				String temp = destinations[i].split("::")[1];
				to.add(temp);
			}
			String from = bookmark.getDeparture().split("::")[1];
			String itinerary = UserResource.jaxbObjectToXML(bookmark.getItinerary());
			System.out.println(bookmark.getItinerary().getID());
			boolean result = DatabaseManager.addPreferredRoute(bookmark.getUsername(), from, to.toString(), itinerary);
			if (!result)
				return -1;
			return reply;
    }
    
    // Marshal Itinerary object into XML by JAXB
    private static String jaxbObjectToXML(org.opentripplanner.api.model.Itinerary itinerary) {
    		JAXBContext context;
    		String xmlString = "";
    		Itineraries itineraries = new Itineraries();
    		itineraries.addItinerary(itinerary);
			try {
				context = JAXBContext.newInstance(Itineraries.class);
				Marshaller m = context.createMarshaller();
				m.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);
				StringWriter sw = new StringWriter();
				ObjectMapper mapper = new ObjectMapper();
				mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
				// mapper.setVisibilityChecker(VisibilityChecker.Std.defaultInstance().withFieldVisibility(JsonAutoDetect.Visibility.ANY));
				// for debugging
				// m.marshal(itinerary, System.out);
				m.marshal(itinerary, sw);
				xmlString = sw.toString();
			} catch (JAXBException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
    		return xmlString;
    }
    
 // EDIT-Yuanyuan(11/12/2017): get and delete operations of booking
    @POST
    @Path("/bookmark/get")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public List<Itinerary> getBookmark(Bookmark bookmark){
    		List<Itinerary> itineraries = DatabaseManager.findPreferredRoutesItinerary(bookmark.getUsername(), bookmark.getDeparture(), bookmark.getArrival());
    		return itineraries;
    }
    
    @POST
    @Path("/bookmark/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public boolean removeBookmark(Bookmark bookmark){
    		boolean result = DatabaseManager.deletePreferredRoute(bookmark.getId());
    	return result;
    }
 // EDIT-Yuanyuan(11/12/2017): end
    
    @POST
    @Path("/booking/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addBooking(Booking booking){
    	int returnVal = 0;
    	//add this booking to database
    	try {
			JSONObject jsonVertices = new JSONObject(booking.getVertices());
			LOG.info(booking.getVertices());
			// because of multi-destination
			String[] destinations = booking.getArrival().split("---");
			for(int i = 0; i < destinations.length; i++){
					// Store lon and lat
					String from = booking.getDeparture().split("::")[1];
					String to = destinations[i].split("::")[1];
					String toName = destinations[i].split("::")[0];
//					toName = toName.split("stop")[1].trim();
					boolean result = DatabaseManager.addBookedRoute(booking.getUsername(), from, to, jsonVertices.getString(toName));
					if (!result)
						return -1;
			}


		} catch (JSONException e) {
			e.printStackTrace();
		}
    	return returnVal;
    }
    
    // EDIT-Yuanyuan(11/12/2017): get and delete operations of booking
    @GET
    @Path("/booking/get/{from}/{to}")
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<String[]> getBooking(@QueryParam(value = "username") String username, 
    										 @PathParam("from") String from, 
    										 @PathParam("to") String to){
    		ArrayList<String[]> vertices = DatabaseManager.findPreviousRoutesVertices(username, from, to);
    	return vertices;
    }
    
    @POST
    @Path("/booking/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Boolean removeBooking(Booking booking){
    		boolean result =  DatabaseManager.deletePreviousRoute(booking.getId());
    		// if result is true-> deleted; else, not
    	return result;
    }
    // EDIT-Yuanyuan(11/12/2017): end
    
    // EDIT-Yuanyuan(11/12/2017): add/edit API about generic and vehicle configurations
    @POST
    @Path("/genericConfiguration/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addGenericConfiguration(GenericConfiguration generic){
    	System.out.println("confId: " + generic.getId() + " confName: " + generic.getConfigurationName());
    		    int current;
    		    if (generic.isCurrent())
    		    		current = 1;
    		    else
    		    		current = 0; 
    		//Shuai(27-3-2018)
    		//result = new Id of the configuration : add successful
    		//result = 0 : edit succesful
    		//result = -1 : add/edit unsuccessful 
			int result = DatabaseManager.addGenericConfiguration(generic.getId(), generic.getUsername(), generic.getConfigurationName(), generic.getCostPerHour(),
					generic.getCostPerKgCO2(), generic.getKPICO2(), generic.getKPIDistance(), generic.getKPITime(), generic.getKRISafety(), generic.getKRICost(), 
					generic.getKRIFlexibility(), generic.getTransfer(), current, generic.getKRITime());
			System.out.println("result=" + result);
			return result;
    }
    // get generic configuration no matter it is current or not
    @GET
    @Path("/genericConfiguration/getList")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<GenericConfiguration> getGenericConfiguration(@PathParam(value = "routerId") String username){
			ArrayList<GenericConfiguration> result = DatabaseManager.findGenericConfiguration(username);
			return result;
    }
 // get only current generic configuration
    @POST
    @Path("/genericConfiguration/get")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<GenericConfiguration> getCurrentGenericConfiguration(@PathParam(value = "routerId") String username){
			ArrayList<GenericConfiguration> result = DatabaseManager.findCurrentGenericConfiguration(username);
			return result;
    }
    @POST
    @Path("/genericConfiguration/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public boolean removeGenericConfiguration(GenericConfiguration generic){
    		boolean result = DatabaseManager.deleteGenericConfiguration(generic.getId(), generic.getUsername());
    	return result;
    }
    
    
    @POST
    @Path("/vehicleConfiguration/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addVehicleConfiguration(VehicleConfiguration vehicle){
    		    int current;
    		    if (vehicle.isCurrent())
    		    		current = 1;
    		    else
    		    		current = 0; 
		    //Shuai(27-3-2018)
    		//result = new Id of the configuration : add successful
    		//result = 0 : edit succesful
    		//result = -1 : add/edit unsuccessful 
			int result = DatabaseManager.addVehicleConfiguration(vehicle.getId(), vehicle.getUsername(), vehicle.getConfigurationName(), vehicle.getMode(), 
					vehicle.getSpeed(), vehicle.getCapacity(), vehicle.getCostPerKm(), vehicle.getCO2PerKm(), vehicle.getCO2PerKmSlow(), 
					vehicle.getBoarding(), vehicle.getAlighting(), vehicle.getBoardingRoRo(), vehicle.getAlightingRoRo(), current, vehicle.getCO2PerKmFast());
			System.out.println("result=" + result);
			return result;
    }
    // get vehicle configuration no matter it is current or not
    @GET
    @Path("/vehicleConfiguration/getList")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<VehicleConfiguration> geVehicleConfiguration(@PathParam(value = "routerId") String username){
			ArrayList<VehicleConfiguration> result = DatabaseManager.findVehicleConfiguration(username);
			return result;
    }
 // get only current generic configuration
    @POST
    @Path("/vehicleConfiguration/get")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<VehicleConfiguration> getCurrentVehicleConfiguration(@PathParam(value = "routerId") String username){
			ArrayList<VehicleConfiguration> result = DatabaseManager.findCurrentVehicleConfiguration(username);
			return result;
    }
    @POST
    @Path("/vehicleConfiguration/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public boolean removeVehicleConfiguration(VehicleConfiguration vehicle){
    		boolean result = DatabaseManager.deleteVehicleConfiguration(vehicle.getId(), vehicle.getUsername());
    	return result;
    }
    // EDIT-Yuanyuan(11/12/2017): end
    
    //Shuai(09-04-2018) get vehicle configurations based on mode
    @GET
    @Path("/vehicleConfiguration/getListByMode/{mode}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<VehicleConfiguration> getVehicleConfigurationByMode(@PathParam(value = "routerId") String username, @PathParam(value="mode") String mode){
			ArrayList<VehicleConfiguration> result = DatabaseManager.findVehicleConfigurationByMode(username, mode);
			return result;
    }
    
    //Shuai(27-03-2018) API for routes configuration
    @POST
    @Path("/routesConfiguration/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addRoutesConfiguration(RoutesConfiguration routes){
    		    int current;
    		    if (routes.isCurrent())
    		    		current = 1;
    		    else
    		    		current = 0; 
		    //Shuai(27-3-2018)
    		//result = new Id of the configuration : add successful
    		//result = 0 : edit succesful
    		//result = -1 : add/edit unsuccessful 
			int result = DatabaseManager.addRoutesConfiguration(routes.getId(), routes.getUsername(), routes.getConfigurationName(), routes.getBannedRoutes(),
					routes.getForcedRoutes(), routes.getBannedStops(), routes.getPassBy(), current);
			System.out.println("result=" + result);
			return result;
    }
    // get routes configuration no matter it is current or not
    @GET
    @Path("/routesConfiguration/getList")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<RoutesConfiguration> getRoutesConfiguration(@PathParam(value = "routerId") String username){
			ArrayList<RoutesConfiguration> result = DatabaseManager.findRoutesConfiguration(username);
			return result;
    }
 // get only current generic configuration
    @POST
    @Path("/routesConfiguration/get")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ArrayList<RoutesConfiguration> getCurrentRoutesConfiguration(@PathParam(value = "routerId") String username){
			ArrayList<RoutesConfiguration> result = DatabaseManager.findCurrentRoutesConfiguration(username);
			return result;
    }
    @POST
    @Path("/routesConfiguration/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public boolean removeRoutesConfiguration(RoutesConfiguration routes){
    		boolean result = DatabaseManager.deleteRoutesConfiguration(routes.getId(), routes.getUsername());
    	return result;
    }
    
    @GET
    @Path("/userCheck")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int userCheckAndInitialization(@PathParam(value="routerId") String username, @QueryParam(value="userrole") String userrole){
    	System.out.println(username + ": " + userrole);
    	int ret = DatabaseManager.userCheckAndInitialization(username, userrole);
    	if(ret == 0){
    		//TODO create the GTFS folder and graph for the new user
    		if(UserManagement.GTFSFolderCreation(otpserver, username)){
    			GraphRebuilder.graphForNewUser(otpserver, username);
    		}
    	}
    	return ret;
    }
    
    @GET
    @Path("/testFolderCreation")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public void testFolderCreation(@PathParam(value="routerId") String username){
    	if(UserManagement.GTFSFolderCreation(otpserver, username)){
			GraphRebuilder.graphForNewUser(otpserver, username);
		}
    }
}