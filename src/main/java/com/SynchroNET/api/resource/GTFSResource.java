package com.SynchroNET.api.resource;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import javax.ws.rs.BadRequestException;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.commons.lang3.SystemUtils;
import org.onebusaway.gtfs.model.Agency;
import org.onebusaway.gtfs.model.AgencyAndId;
import org.onebusaway.gtfs.model.Frequency;
import org.onebusaway.gtfs.model.Route;
import org.onebusaway.gtfs.model.ServiceCalendar;
import org.onebusaway.gtfs.model.ServiceCalendarDate;
import org.onebusaway.gtfs.model.Stop;
import org.onebusaway.gtfs.model.StopTime;
import org.onebusaway.gtfs.model.Trip;
import org.onebusaway.gtfs.model.calendar.ServiceDate;
import org.opentripplanner.api.common.RoutingResource;
import org.opentripplanner.api.resource.CoordinateArrayListSequence;
import org.opentripplanner.common.geometry.GeometryUtils;
import org.opentripplanner.index.model.StopClusterDetail;
import org.opentripplanner.model.StopPattern;
import org.opentripplanner.routing.edgetype.TripPattern;
import org.opentripplanner.routing.graph.GraphIndex;
import org.opentripplanner.routing.services.GraphService;
import org.opentripplanner.routing.trippattern.FrequencyEntry;
import org.opentripplanner.routing.trippattern.TripTimes;
import org.opentripplanner.standalone.CommandLineParameters;
import org.opentripplanner.standalone.OTPMain;
import org.opentripplanner.standalone.OTPServer;
import org.opentripplanner.standalone.Router;
import org.opentripplanner.util.PolylineEncoder;
import org.opentripplanner.util.model.EncodedPolylineBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.utilities.ServerReloader;
import com.google.common.collect.Maps;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.impl.PackedCoordinateSequence;

//Shuai (12-12-2017) implementation on the operations without server reloading
@Path("routers/{routerId}/gtfs")
public class GTFSResource extends RoutingResource{

	private static final Logger LOG = LoggerFactory.getLogger(GTFSResource.class);
	
	private final GraphIndex index;
	private final Router router;
	private final String user;
	private final String feedId;
	private final String path;
	
	public GTFSResource(@Context OTPServer otpServer, @PathParam("routerId") String routerId){
		user = routerId;
		if(otpServer.params.build != null){
			path = otpServer.params.build + "";
			router = otpServer.getRouter("default");
		}
		else{
			path = otpServer.params.basePath + "/graphs/" + user;
			router = otpServer.getRouter(routerId);
		}
		index = router.graph.index;
		feedId = router.graph.getFeedIds().iterator().next();
//		System.out.println(feedId);
//		System.out.println(path);
	}
	
	@POST
	@Path("/stop/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addLocation(GTFSLocation gtfsLocation){
    	int returnVal = 0;
//    	System.out.println(gtfsLocation.getLocation() + ":" + gtfsLocation.getLatitude() + "," + gtfsLocation.getLongitude() + "," + gtfsLocation.getCountry() + "," + gtfsLocation.getType());
    	
    	/*Yuanyuan(19/07/2017) update the server data */
    	// add to the stopForId map, otherwise the new stop will not exist once refresh the page(without reloading)
    	AgencyAndId id = new AgencyAndId();
    	id.setAgencyId(feedId);
    	id.setId(gtfsLocation.getLocation());
//    	System.out.println("Checkkkk id " + id);

    	FileOutputStream fop = null;
		File file;
		try {
			Stop stop = new Stop();
	    	stop.setId(id);
	    	stop.setName(gtfsLocation.getLocation());
	    	stop.setLat(Double.parseDouble(gtfsLocation.getLatitude()));
	    	stop.setLon(Double.parseDouble(gtfsLocation.getLongitude()));
	    	
	    	//Shuai (19-09-2017) format of stop_desc: "key:value;key:value".
	    	//1st pair: core/customized gtfs
	    	//2nd pair: country
	    	//3rd pair: location type
	    	String description = "type:custom";
	    	description += ";country:";
	    	if (gtfsLocation.getCountry()!="")
	    		description += gtfsLocation.getCountry();
	    	description += ";locationType:";
	    	if (gtfsLocation.getType()!="")
	    		description += gtfsLocation.getType();
	    	System.out.println(description);
	    	stop.setDesc(description);
	    	index.stopForId.put(id, stop);
	    	
			// in windows, the line feed is \r\n
			String lineFeed="\n";
			if(SystemUtils.IS_OS_WINDOWS)
				lineFeed = "\r\n";
			String content = gtfsLocation.getLocation().toUpperCase()  + "," + gtfsLocation.getLocation()+ 
					"," + description + "," + gtfsLocation.getLatitude() + "," + 
					gtfsLocation.getLongitude() + lineFeed;
			System.out.print(content);

			file = new File(path + "/stops.txt");
			//file = new File(folder + "/stops.txt");
			fop = new FileOutputStream(file, true);

			// if file doesnt exists, then create it
			if (!file.exists()) {
				file.createNewFile();
			}

			// get the content in bytes
			byte[] contentInBytes = content.getBytes();

			fop.write(contentInBytes);
			fop.flush();
			fop.close();

			System.out.println("Done");

		} catch (IOException e) {
			e.printStackTrace();
			returnVal = -1;
		} finally {
			try {
				if (fop != null) {
					fop.close();
				}
			} catch (IOException e) {
				e.printStackTrace();
				returnVal = -1;
			}
		}
    	
    	//0 OK; -1 server error
    	return returnVal;
    }
	

	
	@POST
	@Path("/stop/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int removeLocation(GTFSLocation gtfsLocation){
    	int returnVal = 0;
    	System.out.println("Remove " + gtfsLocation.getLocation() + ":" + gtfsLocation.getLatitude() + "," + gtfsLocation.getLongitude());
    	
    	returnVal = removeRouteForStop(gtfsLocation);
    	// EDIT(07/27/2017) - Yuanyuan 
    	if (returnVal >=0)
    		returnVal = removeFromStop(gtfsLocation);
    	
    	//0 OK; -1 server error
    	return returnVal;
	}
	
		private int removeRouteForStop(GTFSLocation gtfsLocation) {
		int returnVal = 0;		
		returnVal = removeTripForRouteOrStop(null, gtfsLocation);
		if(returnVal >= 0)
    		returnVal = removeFromRoute(null, gtfsLocation);
		return returnVal;
	}


	private int removeFromStop(GTFSLocation gtfsLocation) {
		int returnVal = 0;
    	
		File inputFile;
    	File tempFile;    	
    	/*Yuanyuan(19/07/2017) update the server data */
    	// remove the stop from the stopForId map, otherwise the new stop will still exist once refresh the page(without reloading)
    	AgencyAndId id = new AgencyAndId();
    	id.setAgencyId(feedId);
    	id.setId(gtfsLocation.getLocation());
    	System.out.println("Check the stop id which should be removed "+ id);    	
    	Stop removed = index.stopForId.remove(id);
    	if (removed != null)
    		System.out.println("Removed stop " + removed.getId());
		try {
			inputFile = new File(path  + "/stops.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	BufferedReader reader = new BufferedReader(new FileReader(inputFile));
	    	BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
	    	String currentLine;
			while((currentLine = reader.readLine()) != null) {
				String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (!fields[0].equals(gtfsLocation.getLocation().toUpperCase())) {
					writer.write(currentLine);
					String lineFeed="\n";
					if(SystemUtils.IS_OS_WINDOWS)
						lineFeed = "\r\n";
					writer.write(lineFeed);
				}
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			System.out.println("Done");

		} catch (IOException e) {
			e.printStackTrace();
			returnVal = -1;
		}
		return returnVal;
	}



	@POST
	@Path("/stop/edit")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int updateLocation(GTFSLocation gtfsLocation){
		int returnVal = 0;
    	System.out.println("Update " + gtfsLocation.getLocation() + ":" + gtfsLocation.getLatitude() + "," + gtfsLocation.getLongitude());
    	
    	File inputFile;
    	File tempFile;
    	
    	/*Yuanyuan(19/07/2017) update the server data */
    	// update the stopForId map, otherwise the new stop will not exist once refresh the page(without reloading)
    	AgencyAndId id = new AgencyAndId();
    	id.setAgencyId(feedId);
    	id.setId(gtfsLocation.getLocation());
    	System.out.println("Check agencyAndId:"+id);
    	
		try {
			Stop stop = new Stop();
	    	stop.setId(id);
	    	stop.setName(gtfsLocation.getLocation());
	    	stop.setLat(Double.parseDouble(gtfsLocation.getLatitude()));
	    	stop.setLon(Double.parseDouble(gtfsLocation.getLongitude()));
	    	
	    	String description = "type:" + gtfsLocation.getGtfs();
	    	description += ";country:";
	    	if (gtfsLocation.getCountry()!="")
	    		description += gtfsLocation.getCountry();
	    	description += ";locationType:";
	    	if (gtfsLocation.getType()!="")
	    		description += gtfsLocation.getType();
	    	System.out.println(description);
	    	stop.setDesc(description);
	    	
	    	if (index.stopForId.get(id)==null)
	    		System.out.println("Strange.."+id.getAgencyId());
	    	index.stopForId.put(id, stop);
	    	
			inputFile = new File(path  + "/stops.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");
	    	
	    	BufferedReader reader = new BufferedReader(new FileReader(inputFile));
	    	BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	String content = gtfsLocation.getLocation().toUpperCase()  + "," + gtfsLocation.getLocation() + "," + description + "," + 
	    			gtfsLocation.getLatitude() + "," + gtfsLocation.getLongitude();
			String currentLine;
			while((currentLine = reader.readLine()) != null) {
				String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (fields[0].equals(gtfsLocation.getLocation().toUpperCase())) {
					// System.out.println(content);
					writer.write(content);
					// in windows, the line feed is \r\n
					String lineFeed="\n";
					if(SystemUtils.IS_OS_WINDOWS)
						lineFeed = "\r\n";
					writer.write(lineFeed);
				}
				else {
					System.out.println(currentLine);
					writer.write(currentLine);
					String lineFeed="\n";
					if(SystemUtils.IS_OS_WINDOWS)
						lineFeed = "\r\n";
					writer.write(lineFeed);
				}
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			System.out.println("Done");

		} catch (IOException e) {
			e.printStackTrace();
		}
    	
    	//0 OK; -1 server error
    	return returnVal;
	}

	@POST
	@Path("/route/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addRoute(GTFSRoute gtfsRoute){
		int returnVal = 0;
		System.out.println("Route");
    	System.out.println(gtfsRoute.getFrom() + "->" + gtfsRoute.getTo() + ":" + gtfsRoute.getMode() + ":" + gtfsRoute.getAgency() + ":" + gtfsRoute.getUsername());
    	System.out.println(gtfsRoute.getShape());
    	System.out.println(gtfsRoute.getFrequency());
    	
		returnVal = addToRouteFile(gtfsRoute);
		if (returnVal >= 0){
    		returnVal = addToTripFile(gtfsRoute);
    	}
		return returnVal;
    }
	

//	private Agency searchAgency(String name, String id) {
//    	Collection<Map<String, Agency>> agencies = otpServer.getRouter(this.username).graph.index.agenciesForFeedId.values();
//    	for (Map<String, Agency> agencyMap:agencies) {
//    		for (Agency agency:agencyMap.values()) {
//    			if (name!=null) {
//    				String agencyName =name.toLowerCase();
//    				System.out.println("Agency name is " + agency.getName());
//    				if (agency.getName().toLowerCase().equals(agencyName)) {
//    					return agency;
//    			} } else {
//    				System.out.println("Agency id is " + agency.getId());
//    				if (agency.getId().toLowerCase().equals(id.toLowerCase())) {
//    					return agency;
//    			} }
//    		}
//    	}
//    		System.out.println("Not Found the agency");
//    		return null;
//		Agency a = new Agency();
//		a.setId("gtfs");
//		return a;
//	}


	private int addToRouteFile(GTFSRoute gtfsRoute) {
		int returnVal = 0;
    	
    	// 1st check the existence of agency
//    	Agency agency0 = searchAgency(gtfsRoute.getAgency(), null);
    	Agency agency0 = new Agency();
    	agency0.setId(feedId);
    	if (agency0!=null)
    	{
    		System.out.println("Find");
    		/*Yuanyuan(21/07/2017) update the server data */
    		// add to the routeForId map, otherwise the new stop will not exist once refresh the page(without reloading)
    		AgencyAndId id = new AgencyAndId();
    		String name = gtfsRoute.getRouteId();
    		id.setAgencyId(agency0.getId());
    		id.setId(name);
    		System.out.println("add route id is "+id);
    		Route route = new Route();
    		String longName = gtfsRoute.getFrom() + " - " + gtfsRoute.getTo();
    		String shortName = gtfsRoute.getFrom().trim() + "_" + gtfsRoute.getTo().trim();
    		int type = 0;
    		if (gtfsRoute.getMode().toLowerCase().contains("rail") || gtfsRoute.getMode().toLowerCase().contains("train"))
    			type = 100;
    		else {
    			if (gtfsRoute.getMode().toLowerCase().contains("truck") || gtfsRoute.getMode().toLowerCase().contains("bus"))
    				type = 200;
    			if (gtfsRoute.getMode().toLowerCase().contains("ferry") || gtfsRoute.getMode().toLowerCase().contains("ship"))
    				type = 1000;
    			}
    		route.setAgency(agency0);
    		route.setId(id);
    		route.setLongName(longName);
    		route.setShortName(shortName);
    		route.setType(type);
    		route.setDesc("type:custom");
    		index.routeForId.put(id, route);
    		
    		FileOutputStream fop = null;
    		File file;
		
    		// in windows, the line feed is \r\n
    		String lineFeed="\n";
    		if(SystemUtils.IS_OS_WINDOWS)
    			lineFeed = "\r\n";
    		String content = name  + "," + agency0.getId()+ 
				"," + shortName + "," + longName + ",type:custom," + type
				 + ",,," + lineFeed;
    		System.out.println("Check content " + content);
    		try {

    			file = new File(path  + "/routes.txt");
    			fop = new FileOutputStream(file, true);

    			// if file doesnt exists, then create it
    			if (!file.exists()) {
    				file.createNewFile();
    			}

    			// get the content in bytes
    			byte[] contentInBytes = content.getBytes();
    			fop.write(contentInBytes);
    			fop.flush();
    			fop.close();

    			System.out.println("Done");

		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try {
				if (fop != null) {
					fop.close();
				}
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
    	
    	//0 OK; -1 server error
		System.out.println("return of route is " + returnVal);
    	return returnVal;
    	} else
    		return -1;
	}


	private int addToTripFile(GTFSRoute gtfsRoute) {
		int returnVal = 0;
		System.out.println("Add to trip/shape/frequency/stoptime file");
		
		Agency agency0 = new Agency();
    	agency0.setId(feedId);
    	
		// set the id like: gtfs_A_B_TRIP
		AgencyAndId tripId = new AgencyAndId();
		tripId.setAgencyId(agency0.getId());
		tripId.setId(gtfsRoute.getRouteId() + "_TRIP");
    	System.out.println("Check trip id " + tripId);
    	
//    	Agency agency0 = searchAgency(gtfsRoute.getAgency(), null);
		AgencyAndId routeid = new AgencyAndId();
		String name = gtfsRoute.getRouteId();
		routeid.setAgencyId(agency0.getId());
		routeid.setId(name);
		Route route = index.routeForId.get(routeid);
		System.out.print(route);
		
		AgencyAndId serviceId = new AgencyAndId();
		serviceId.setAgencyId(agency0.getId());
		serviceId.setId(gtfsRoute.getService().split(":")[1]);
		
		AgencyAndId shapeId = new AgencyAndId();
		shapeId.setAgencyId(agency0.getId());
		shapeId.setId(gtfsRoute.getRouteId() + "_SHAPE");
	
    	FileOutputStream fop = null;
		File file;
		try {
			Trip trip = new Trip();
			trip.setId(tripId);
			trip.setRoute(route);
			trip.setServiceId(serviceId);
			trip.setShapeId(shapeId);
			
			List<StopTime> stoptimes = new ArrayList<StopTime>();			
			
			//set departure/arrival time for each stoptime
	        AgencyAndId stopid = new AgencyAndId();
	        stopid.setAgencyId(agency0.getId());
	        stopid.setId(gtfsRoute.getFrom());
	        Stop stop = new Stop();
	        stop.setId(stopid);
	        StopTime stoptime = new StopTime();	
	        stoptime.setStop(stop);
	        int departure = Integer.parseInt(gtfsRoute.getDeparture().split(":")[0])*3600 + 
					Integer.parseInt(gtfsRoute.getDeparture().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getDeparture().split(":")[2]);
	        stoptime.setDepartureTime(departure);
	        stoptime.setArrivalTime(departure);
	        stoptimes.add(stoptime);
	        
	        stopid = new AgencyAndId();
	        stopid.setAgencyId(agency0.getId());
	        stopid.setId(gtfsRoute.getTo());
	        stop = new Stop();
	        stop.setId(stopid);
	        stoptime = new StopTime();
	        stoptime.setStop(stop);
	        int arrival = Integer.parseInt(gtfsRoute.getArrive().split(":")[0])*3600 + 
					Integer.parseInt(gtfsRoute.getArrive().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getArrive().split(":")[2]) + gtfsRoute.getArriveDays()*24*3600;
	        stoptime.setArrivalTime(arrival);
	        stoptime.setDepartureTime(arrival);
	        stoptimes.add(stoptime);
			
	        //store stoptimes/frequency
			TripTimes tt = new TripTimes(trip, stoptimes, router.graph.deduplicator);
			
			TripPattern tp = new TripPattern(route, new StopPattern(stoptimes));			
			if(gtfsRoute.getFrequency()){
				Frequency freq = new Frequency();
				freq.setStartTime(Integer.parseInt(gtfsRoute.getStartTime().split(":")[0])*3600 + 
						Integer.parseInt(gtfsRoute.getStartTime().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getStartTime().split(":")[2])); 
				freq.setEndTime(Integer.parseInt(gtfsRoute.getEndTime().split(":")[0])*3600 + 
						Integer.parseInt(gtfsRoute.getEndTime().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getEndTime().split(":")[2])); 
				freq.setHeadwaySecs(Integer.parseInt(gtfsRoute.getHeadway()));
				tp.add(new FrequencyEntry(freq, tt));
				
				index.frequencyForTripName.put(trip.getId().getId(), freq);
			}
			else{
				tp.add(tt);
			}
			List<TripPattern> tps = new ArrayList<TripPattern>();
		    tps.add(tp);
		    TripPattern.generateUniqueIds(tps);
		    
		    //store shape
	    	ArrayList<Double> lats = new ArrayList<Double>();
	    	ArrayList<Double> lons = new ArrayList<Double>();	    	
	    	for (Object s : gtfsRoute.getShape()) {
	    		String[] fields = s.toString().split(",|\\}");
	    		lats.add( Double.parseDouble(fields[0].replaceFirst("\\{lat=", "")));
	    		lons.add( Double.parseDouble(fields[1].replaceFirst("lng=", "")));
	    	}
	    	System.out.println(lats);
		    
		    ArrayList<Coordinate> c = new ArrayList<Coordinate>();
		    for(int k=0; k < lats.size(); k++){
		    	c.add(new Coordinate(lons.get(k), lats.get(k)));
		    }
	        CoordinateArrayListSequence coordinates = new CoordinateArrayListSequence(c);System.out.println(coordinates.size());
	        PackedCoordinateSequence packedCoords = new PackedCoordinateSequence.Double(coordinates.toCoordinateArray(), 2);
	        tp.geometry = GeometryUtils.getGeometryFactory().createLineString(packedCoords);
		    
	        index.patternForId.put(tp.code, tp);
	        index.patternsForRoute.put(tp.route, tp);
	        index.patternForTrip.put(trip, tp);
			index.tripForId.put(tripId, trip);
			for(Stop s: tp.getStops()){
				index.patternsForStop.put(s, tp);
			}

			// in windows, the line feed is \r\n
			String lineFeed="\n";
			if(SystemUtils.IS_OS_WINDOWS)
				lineFeed = "\r\n";
			
			//trip.txt
			String content = name  + "," + gtfsRoute.getService().split(":")[1] + "," + (name + "_TRIP") + 
					",,0,," + (name + "_SHAPE") + lineFeed;

			file = new File(path  + "/trips.txt");
			//file = new File(folder + "/stops.txt");
			fop = new FileOutputStream(file, true);

			// if file doesnt exists, then create it
			if (!file.exists()) {
				file.createNewFile();
			}

			// get the content in bytes
			byte[] contentInBytes = content.getBytes();

			fop.write(contentInBytes);
			fop.flush();
			fop.close();
			
			
			//shape.txt
			file = new File(path  + "/shapes.txt");
			fop = new FileOutputStream(file, true);
			
			if (!file.exists()) {
				file.createNewFile();
			}
			
			for (int i=0; i < lats.size(); i++) {
				int j = i+1;
				String distance = gtfsRoute.getLength().get(i).toString();
				double temp = Double.parseDouble(distance)/1000.0; // unit is meter
				content = (name + "_SHAPE") + "," + lats.get(i) + "," + lons.get(i) + "," + j + "," + temp + lineFeed;
				contentInBytes = content.getBytes();
				fop.write(contentInBytes);
			}
			fop.flush();
			fop.close();
			
			
			//stop_times.txt
			String arrive = "" + (gtfsRoute.getArriveDays() * 24 + Integer.parseInt(gtfsRoute.getArrive().split(":")[0])) + ":" + 
					gtfsRoute.getArrive().split(":")[1] + ":" + gtfsRoute.getArrive().split(":")[2];
			arrive = timeFormat(arrive);
			String depart = timeFormat(gtfsRoute.getDeparture());
			
			content = (name + "_TRIP")  + "," + depart + "," + depart + 
					"," + gtfsRoute.getFrom().toUpperCase() + ",1,0.0" + lineFeed + 
					(name + "_TRIP")  + "," + arrive + "," + arrive + 
					"," + gtfsRoute.getTo().toUpperCase() + "," + gtfsRoute.getLength().size() + "," + 
					((Double)gtfsRoute.getLength().get(gtfsRoute.getLength().size()-1)/1000) + lineFeed;

			file = new File(path  + "/stop_times.txt");
			//file = new File(folder + "/stops.txt");
			fop = new FileOutputStream(file, true);

			// if file doesnt exists, then create it
			if (!file.exists()) {
				file.createNewFile();
			}

			// get the content in bytes
			contentInBytes = content.getBytes();

			fop.write(contentInBytes);
			fop.flush();
			fop.close();
			
			
			//frequencies.txt
			if(gtfsRoute.getFrequency()){
				content = (name + "_TRIP")  + "," + timeFormat(gtfsRoute.getStartTime()) + "," + timeFormat(gtfsRoute.getEndTime()) + 
					"," + gtfsRoute.getHeadway() + lineFeed;
	
				file = new File(path  + "/frequencies.txt");
				//file = new File(folder + "/stops.txt");
				fop = new FileOutputStream(file, true);
		
				// if file doesnt exists, then create it
				if (!file.exists()) {
					file.createNewFile();
				}
		
				// get the content in bytes
				contentInBytes = content.getBytes();
		
				fop.write(contentInBytes);
				fop.flush();
				fop.close();
			}	
			
			System.out.println("Done");

		} catch (IOException e) {
			e.printStackTrace();
			returnVal = -1;
		} finally {
			try {
				if (fop != null) {
					fop.close();
				}
			} catch (IOException e) {
				e.printStackTrace();
				returnVal = -1;
			}
		}
		return returnVal;
	}



	@POST
	@Path("/route/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int removeRoute(GTFSRoute gtfsRoute){
		int returnVal = 0;
    	System.out.println(gtfsRoute.getRouteId());    	
    	returnVal = removeTripForRouteOrStop(gtfsRoute, null);
    	if(returnVal >= 0)
    		returnVal = removeFromRoute(gtfsRoute, null);
    	return returnVal;
	}
	
	
	private int removeTripForRouteOrStop(GTFSRoute gtfsRoute, GTFSLocation gtfsLocation) {
		int returnVal = 0;
    	System.out.println("Remove trip/stoptime/shape/frequency for route");
    	
    	AgencyAndId tripId = null;
    	AgencyAndId shapeId = null;
    	String stopName = null;
    	if(gtfsRoute != null){	    	
	    	Agency agency0 = new Agency();
	    	agency0.setId(feedId);
	    	
	    	tripId = new AgencyAndId();
			tripId.setAgencyId(agency0.getId());
			tripId.setId(gtfsRoute.getRouteId() + "_TRIP");
	    	System.out.println("Check trip id " + tripId);
			
			Trip trip = index.tripForId.get(tripId);
			TripPattern tp = index.patternForTrip.get(trip);
			
			shapeId = trip.getShapeId();
						
			index.frequencyForTripName.remove(trip.getId().getId());
			index.patternForId.remove(tp.code);
	        index.patternsForRoute.remove(tp.route, tp);
			index.tripForId.remove(tripId);
			for(Stop s: tp.getStops()){
				index.patternsForStop.remove(s, tp);
			}
			index.patternForTrip.remove(trip);
    	}
    	else{
    		//in case of deleting a stop
    		stopName = gtfsLocation.getLocation().toUpperCase();
    		System.out.println(stopName);
    		
    		System.out.println("#frequency: " + index.frequencyForTripName.size());
    		System.out.println("#tripForId: " + index.tripForId.size());
    		System.out.println("#patternForId: " + index.patternForId.size());
    		System.out.println("#patternsForRoute: " + index.patternsForRoute.size());
    		System.out.println("#patternForTrip: " + index.patternForTrip.size());
    		Iterator<Map.Entry<Trip, TripPattern>> it = index.patternForTrip.entrySet().iterator();
    		while(it.hasNext()){
    			Map.Entry<Trip, TripPattern> tp = (Map.Entry<Trip, TripPattern>)it.next();
    			System.out.println(tp);
    			String[] fields = tp.getKey().getId().getId().split("_");
    			if(fields[0].toUpperCase().equals(stopName) || fields[1].toUpperCase().equals(stopName)){
    				index.frequencyForTripName.remove(tp.getKey().getId().getId());
    				index.patternForId.remove(tp.getValue().code);
    		        index.patternsForRoute.remove(tp.getValue().route, tp.getValue());
    				index.tripForId.remove(tp.getKey().getId());
    				for(Stop s: tp.getValue().getStops()){
    					index.patternsForStop.remove(s, tp);
    				}
    				it.remove();
    			}
    		}
    		System.out.println("#frequency: " + index.frequencyForTripName.size());
    		System.out.println("#tripForId: " + index.tripForId.size());
    		System.out.println("#patternForId: " + index.patternForId.size());
    		System.out.println("#patternsForRoute: " + index.patternsForRoute.size());
    		System.out.println("#patternForTrip: " + index.patternForTrip.size());
    	}		
		
		
    	//delete in GTFS file
		File inputFile = null, tempFile = null;
    	BufferedReader reader = null;
		BufferedWriter writer = null;
    	String currentLine;
		String lineFeed="\n";
		if(SystemUtils.IS_OS_WINDOWS)
			lineFeed = "\r\n";
		try{
			//trip.txt
			inputFile = new File(path  + "/trips.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");
					String[] subFields = fields[2].split("_");
					
					if ((tripId!=null && !fields[2].equals(tripId.getId())) || (stopName!=null && !(subFields[0].equals(stopName) 
							|| subFields[1].equals(stopName)))) {
						//write the line if routeid doens't match and stopName doesn't exist
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			
			//shapes.txt
			inputFile = new File(path  + "/shapes.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");
					String[] subFields = fields[0].split("_");
					
					if ((shapeId!=null && !fields[0].equals(shapeId.getId())) || (stopName!=null && !(subFields[0].equals(stopName) 
							|| subFields[1].equals(stopName)))) {
						//write the line if shapeId doens't match and stopName doesn't exist
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			
			//stop_times.txt
			inputFile = new File(path  + "/stop_times.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");
					String[] subFields = fields[0].split("_");
					
					if ((tripId!=null && !fields[0].equals(tripId.getId())) || (stopName!=null && !(subFields[0].equals(stopName) 
							|| subFields[1].equals(stopName)))) {
						//write the line if shapeId doens't match and stopName doesn't exist
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			
			//frequencies.txt
			inputFile = new File(path  + "/frequencies.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");
					String[] subFields = fields[0].split("_");
					
					if ((tripId!=null && !fields[0].equals(tripId.getId())) || (stopName!=null && !(subFields[0].equals(stopName) 
							|| subFields[1].equals(stopName)))) {
						//write the line if shapeId doens't match and stopName doesn't exist
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
	    	
		} catch (IOException e) {
			e.printStackTrace();
			returnVal = -1;
		}    	
    	return returnVal;
	}
	
	
	private int removeFromRoute(GTFSRoute gtfsRoute, GTFSLocation gtfsLocation) {
    	int returnVal = 0;
    	System.out.println("Remove route");    	
    	
    	String stopName = null;
    	AgencyAndId routeId = null;
    	if(gtfsRoute != null){	    	
	    	Agency agency0 = new Agency();
	    	agency0.setId(feedId);	    	
	    	routeId = new AgencyAndId();
	    	routeId.setAgencyId(agency0.getId());
	    	routeId.setId(gtfsRoute.getRouteId());
	    	System.out.println("Check route id " + routeId);
	    	
			index.routeForId.remove(routeId);			
    	}
    	else{
    		//in the case of deleting a stop
    		stopName = gtfsLocation.getLocation().toUpperCase();
    		System.out.println(stopName);
    		
    		Iterator<Map.Entry<AgencyAndId, Route>> it = index.routeForId.entrySet().iterator();
    		while(it.hasNext()){
    			Map.Entry<AgencyAndId, Route> r = (Map.Entry<AgencyAndId, Route>)it.next();
    			System.out.println(r);
    			String[] fields = r.getKey().getId().split("_");
    			if(fields[0].toUpperCase().equals(stopName) || fields[1].toUpperCase().equals(stopName)){
    				it.remove();
    			}
    		}
    	}
    	
    	
    	File inputFile;
    	File tempFile;    	
    	/*Yuanyuan(26/07/2017) update the server data */
		String lineFeed="\n";
		if(SystemUtils.IS_OS_WINDOWS)
			lineFeed = "\r\n";
		try {
    		inputFile = new File(path  + "/routes.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	BufferedReader reader = new BufferedReader(new FileReader(inputFile));
	    	BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
	    	String currentLine;
	    	
			while((currentLine = reader.readLine()) != null) {
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");
					String[] subFields = fields[0].split("_");
					
					if (routeId!=null && !fields[0].equals(routeId.getId() ) || (stopName!=null && !(subFields[0].equals(stopName) 
							|| subFields[1].equals(stopName)))) {
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			System.out.println("Done");

		} catch (IOException e) {
			e.printStackTrace();
			returnVal = -1;
		}
    	
    	//0 OK; -1 server error
    	return returnVal;
	}


	
	@POST
	@Path("/route/edit")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int updateRoute(GTFSRoute gtfsRoute){
		int returnVal = updateRouteFile(gtfsRoute);
		if (returnVal>=0){
			returnVal = updateTripFile(gtfsRoute);
		}
		return returnVal;
	}
	
	
	private int updateRouteFile(GTFSRoute gtfsRoute) {
		int returnVal = 0;
		System.out.println("Update Route");
		System.out.println(gtfsRoute.getRouteId());
		System.out.println(gtfsRoute.getFrom() + "->" + gtfsRoute.getTo() + ":" + gtfsRoute.getMode() + ":" + gtfsRoute.getAgency() + ":" + gtfsRoute.getUsername());
		System.out.println(gtfsRoute.getShape());
		System.out.println(gtfsRoute.getGtfs());
		
		// 1st check the existence of agency
//		Agency agency0 = searchAgency(gtfsRoute.getAgency(), null);
		Agency agency0 = new Agency();
		agency0.setId(feedId);
		if (agency0!=null)
		{
			System.out.println("Find");
			/*Yuanyuan(21/07/2017) update the server data */
			// add to the routeForId map, otherwise the new stop will not exist once refresh the page(without reloading)
			AgencyAndId id = new AgencyAndId();
			String name = gtfsRoute.getRouteId();
			id.setAgencyId(agency0.getId());
			id.setId(name);
			String longName = gtfsRoute.getFrom().trim() + " - " + gtfsRoute.getTo().trim();
			String shortName = gtfsRoute.getFrom().trim() + "_" + gtfsRoute.getTo().trim();
			int type = 0;
			if (gtfsRoute.getMode().toLowerCase().contains("rail") || gtfsRoute.getMode().toLowerCase().contains("train"))
    			type = 100;
    		else {
    			if (gtfsRoute.getMode().toLowerCase().contains("truck") || gtfsRoute.getMode().toLowerCase().contains("bus"))
    				type = 200;
				if (gtfsRoute.getMode().toLowerCase().contains("ferry") || gtfsRoute.getMode().toLowerCase().contains("ship"))
					type = 1000;
				}
			String description = "type:" + gtfsRoute.getGtfs();
			
			Route route = index.routeForId.get(id);
			//in case we have more fields
			route.setDesc(description);
			
			File inputFile = null, tempFile = null;
			inputFile = new File(path  + "/routes.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");
	    	
	    	String content = name  + "," + agency0.getId()+ 
				"," + shortName + "," + longName + "," + description + "," + type
				 + ",,,";
	    	System.out.println("Check name " + name);
	    	try {
	    		BufferedReader reader = new BufferedReader(new FileReader(inputFile));
		    	BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
	    		String currentLine;
	    		name = name.replaceAll("\\s", "");
				while((currentLine = reader.readLine()) != null) {
					String[] fields = currentLine.split(",");
					fields[0] = fields[0].replaceAll("\\s", "");
					// System.out.println("fields" + fields[0]);
					if (fields[0].equals(name)) {
						System.out.println(content);
						writer.write(content);
						String lineFeed="\n";
						if(SystemUtils.IS_OS_WINDOWS)
							lineFeed = "\r\n";
						writer.write(lineFeed);
					}
					else {
						// System.out.println(currentLine);
						writer.write(currentLine);
						String lineFeed="\n";
						if(SystemUtils.IS_OS_WINDOWS)
							lineFeed = "\r\n";
						writer.write(lineFeed);
					}
				}
				reader.close();
				writer.close();
				inputFile.delete();
				tempFile.renameTo(inputFile);
				System.out.println("Done");
	
			} catch (IOException e) {
				e.printStackTrace();
				returnVal = -1;
			}
			
			//0 OK; -1 server error
			System.out.println("return of route is " + returnVal);
		} else
			returnVal = -1;
		return returnVal;
	}


	private int updateTripFile(GTFSRoute gtfsRoute) {
		int returnVal = 0;
		System.out.println("Update Trip/StopTime/Frenqency");
    	System.out.println(gtfsRoute.getRouteId());
    	System.out.println(gtfsRoute.getFrom() + "->" + gtfsRoute.getTo() + ":" + gtfsRoute.getMode() + ":" + gtfsRoute.getAgency() + ":" + gtfsRoute.getUsername());
    	System.out.println(gtfsRoute.getLength());
    	
    	Agency agency0 = new Agency();
    	agency0.setId(feedId);
    	
    	// set the id like: gtfs_A_B_TRIP
		AgencyAndId tripId = new AgencyAndId();
		tripId.setAgencyId(agency0.getId());
		tripId.setId(gtfsRoute.getRouteId() + "_TRIP");
    	System.out.println("Check trip id " + tripId);
    	
//    	Agency agency0 = searchAgency(gtfsRoute.getAgency(), null);
		AgencyAndId routeid = new AgencyAndId();
		String name = gtfsRoute.getRouteId();
		routeid.setAgencyId(agency0.getId());
		routeid.setId(name);
		Route route = index.routeForId.get(routeid);
		System.out.println(route);
		
		AgencyAndId serviceId = new AgencyAndId();
		serviceId.setAgencyId(agency0.getId());
		serviceId.setId(gtfsRoute.getService().split(":")[1]);
		
		AgencyAndId shapeId = new AgencyAndId();
		shapeId.setAgencyId(agency0.getId());
		shapeId.setId(gtfsRoute.getRouteId() + "_SHAPE");
				
		Trip trip = index.tripForId.get(tripId);
		trip.setRoute(route);
		trip.setServiceId(serviceId);
		
		TripPattern tp = index.patternForTrip.get(trip);
		
		int departure = Integer.parseInt(gtfsRoute.getDeparture().split(":")[0])*3600 + 
				Integer.parseInt(gtfsRoute.getDeparture().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getDeparture().split(":")[2]);
        int arrival = Integer.parseInt(gtfsRoute.getArrive().split(":")[0])*3600 + 
				Integer.parseInt(gtfsRoute.getArrive().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getArrive().split(":")[2]) + gtfsRoute.getArriveDays()*24*3600;
		
        List<StopTime> stoptimes = new ArrayList<StopTime>();
        
        StopTime stoptime = new StopTime();	
        stoptime.setStop(tp.stopPattern.stops[0]);
        stoptime.setDepartureTime(departure);
        stoptime.setArrivalTime(departure);
        stoptimes.add(stoptime);
        
        stoptime = new StopTime();	
        stoptime.setStop(tp.stopPattern.stops[1]);
        stoptime.setDepartureTime(arrival);
        stoptime.setArrivalTime(arrival);
        stoptimes.add(stoptime);
        
        TripTimes tt = new TripTimes(trip, stoptimes, router.graph.deduplicator);
        
		Boolean hasFrequencyBefore = tp.scheduledTimetable.frequencyEntries.size() > 0 ? true : false;
		//update frequency/stoptimes
		if(hasFrequencyBefore){
			if(gtfsRoute.getFrequency()){
				//both have freq -> remove freq before add a new one since startTime/endTime/headway 'final'
				tp.scheduledTimetable.frequencyEntries.remove(0);
				Frequency freq = new Frequency();
				freq.setStartTime(Integer.parseInt(gtfsRoute.getStartTime().split(":")[0])*3600 + 
						Integer.parseInt(gtfsRoute.getStartTime().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getStartTime().split(":")[2])); 
				freq.setEndTime(Integer.parseInt(gtfsRoute.getEndTime().split(":")[0])*3600 + 
						Integer.parseInt(gtfsRoute.getEndTime().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getEndTime().split(":")[2])); 
				freq.setHeadwaySecs(Integer.parseInt(gtfsRoute.getHeadway()));
				tp.add(new FrequencyEntry(freq, tt));
				index.frequencyForTripName.put(trip.getId().getId(), freq);
			}
			else{
				//no longer freq after editing -> remove freq and add tripTimes to tripPattern
				tp.scheduledTimetable.frequencyEntries.remove(0);
				tp.add(tt);
				index.frequencyForTripName.remove(trip.getId().getId());
			}
		}
		else{
			if(gtfsRoute.getFrequency()){
				//doenst have freq before -> remove tripTimes to tripPattern and add freq
				tp.scheduledTimetable.tripTimes.remove(0);					
				Frequency freq = new Frequency();
				freq.setStartTime(Integer.parseInt(gtfsRoute.getStartTime().split(":")[0])*3600 + 
						Integer.parseInt(gtfsRoute.getStartTime().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getStartTime().split(":")[2])); 
				freq.setEndTime(Integer.parseInt(gtfsRoute.getEndTime().split(":")[0])*3600 + 
						Integer.parseInt(gtfsRoute.getEndTime().split(":")[1])*60 + Integer.parseInt(gtfsRoute.getEndTime().split(":")[2])); 
				freq.setHeadwaySecs(Integer.parseInt(gtfsRoute.getHeadway()));
				tp.add(new FrequencyEntry(freq, tt));
				index.frequencyForTripName.put(trip.getId().getId(), freq);
			}
			else{
				//neither have freq -> update tripTimes only
				tp.scheduledTimetable.tripTimes.remove(0);
				tp.add(tt);
			}
		}
		
		//update shape
    	ArrayList<Double> lats = new ArrayList<Double>();
    	ArrayList<Double> lons = new ArrayList<Double>();	    	
    	for (Object s : gtfsRoute.getShape()) {
    		String[] fields = s.toString().split(",|\\}");
    		lats.add( Double.parseDouble(fields[0].replaceFirst("\\{lat=", "")));
    		lons.add( Double.parseDouble(fields[1].replaceFirst("lng=", "")));
    	}
	    ArrayList<Coordinate> c = new ArrayList<Coordinate>();
	    for(int k=0; k < lats.size(); k++){
	    	c.add(new Coordinate(lons.get(k), lats.get(k)));
	    }
        CoordinateArrayListSequence coordinates = new CoordinateArrayListSequence(c);
        PackedCoordinateSequence packedCoords = new PackedCoordinateSequence.Double(coordinates.toCoordinateArray(), 2);
        tp.geometry = GeometryUtils.getGeometryFactory().createLineString(packedCoords);
        System.out.println(tp.geometry);
        
        
        //edit txt
		// in windows, the line feed is \r\n
		String lineFeed="\n";
		if(SystemUtils.IS_OS_WINDOWS)
			lineFeed = "\r\n";			

        File inputFile, tempFile;
        BufferedReader reader;
		BufferedWriter writer;
		String currentLine;
		String content;
        try {
        	//trip.txt
        	inputFile = new File(path  + "/trips.txt");
			tempFile = new File(path  + "/myTempFile.txt");			
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (!fields[2].equals(tripId.getId())) {
					writer.write(currentLine);
					writer.write(lineFeed);
				} else {
					content = gtfsRoute.getRouteId()  + "," + gtfsRoute.getService().split(":")[1] + "," + tripId.getId() + 
							",,0,," + shapeId.getId() + lineFeed;
					writer.write(content);
				}
	    	}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
	    	
        	//shape.txt
			inputFile = new File(path  + "/shapes.txt");
			tempFile = new File(path  + "/myTempFile.txt");			
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	// 1st write all except the old ones
	    	while((currentLine = reader.readLine()) != null) {
				String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (!fields[0].equals(shapeId.getId())) {
					writer.write(currentLine);
					writer.write(lineFeed);
				}
			}			
			for (int i=0; i < lats.size(); i++) {
				content = shapeId.getId() + "," + lats.get(i) + "," + lons.get(i) + "," + (i+1) + "," + Double.parseDouble(gtfsRoute.getLength().get(i).toString())/1000.0 + lineFeed;
				writer.write(content);
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);

			//stoptimes.txt
			inputFile = new File(path  + "/stop_times.txt");
			tempFile = new File(path  + "/myTempFile.txt");			
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (!fields[0].equals(tripId.getId())) {
					writer.write(currentLine);
					writer.write(lineFeed);
				}
	    	}
	    	String arriveString = "" + (gtfsRoute.getArriveDays() * 24 + Integer.parseInt(gtfsRoute.getArrive().split(":")[0])) + ":" + 
					gtfsRoute.getArrive().split(":")[1] + ":" + gtfsRoute.getArrive().split(":")[2];
	    	arriveString = timeFormat(arriveString);
			content = (name + "_TRIP")  + "," + timeFormat(gtfsRoute.getDeparture()) + "," + timeFormat(gtfsRoute.getDeparture()) + 
					"," + gtfsRoute.getFrom().toUpperCase() + ",1,0.0" + lineFeed + 
					(name + "_TRIP")  + "," + arriveString + "," + arriveString + "," + gtfsRoute.getTo().toUpperCase() + "," + gtfsRoute.getLength().size() + "," + 
					((Double)gtfsRoute.getLength().get(gtfsRoute.getLength().size()-1)/1000) + lineFeed;
	    	writer.write(content);
	    			
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			//frequency.txt
			inputFile = new File(path  + "/frequencies.txt");
			tempFile = new File(path  + "/myTempFile.txt");			
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (!fields[0].equals(tripId.getId())) {
					writer.write(currentLine);
					writer.write(lineFeed);
				}
	    	}
	    	if(gtfsRoute.getFrequency()){
				content = tripId.getId()  + "," + timeFormat(gtfsRoute.getStartTime()) + "," + timeFormat(gtfsRoute.getEndTime()) + "," + gtfsRoute.getHeadway() + lineFeed;
				writer.write(content);
	    	}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
		} catch (IOException e) {
			e.printStackTrace();
			returnVal = -1;
		}
        System.out.println("Done");
	
		return returnVal;
	}


	@POST
	@Path("/service/add")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int addService(GTFSService gtfsService){
    	int returnVal = 0;
    	System.out.println(gtfsService.getId() + ":" + gtfsService.getMon() + ":" +gtfsService.getStartdate());
    	System.out.println(gtfsService.getInclude());
    	System.out.println(gtfsService.getExclude());
    	
    	returnVal = addToCalendarFile(gtfsService);		
    	return returnVal;
    }
	
	
	//1. weekly periodic calendar only: add to calendar.txt only
	//2. non-periodic calendar: add to calendar_dates.txt only
	//3. weekly periodic calendar with exceptions: add to both calendar.txt and calendar_dates.txt
	private int addToCalendarFile(GTFSService gtfsService) {
		int returnVal = 0;
		System.out.println("add to calendar file");
		
		AgencyAndId serviceId = new AgencyAndId();
		serviceId.setAgencyId(feedId);
		serviceId.setId(gtfsService.getId());
    	System.out.println("Check calendar id " + serviceId);
    	// if the same name has existed
//    	if (searchCalendar(id))
//    		return -1;
	
    	FileOutputStream fop = null;
		File file;
		try {
			ServiceCalendar serviceCalendar = new ServiceCalendar();
			serviceCalendar.setServiceId(serviceId);
			serviceCalendar.setMonday(gtfsService.getMon());
			serviceCalendar.setTuesday(gtfsService.getTue());
			serviceCalendar.setWednesday(gtfsService.getWed());
			serviceCalendar.setThursday(gtfsService.getThu());
			serviceCalendar.setFriday(gtfsService.getFri());
			serviceCalendar.setSaturday(gtfsService.getFri());
			serviceCalendar.setSunday(gtfsService.getSun());
			DateFormat format1 = new SimpleDateFormat("MM/dd/yyyy");
			Date start = format1.parse(gtfsService.getStartdate());
			String[] fields = gtfsService.getStartdate().split("/");
			String content_start = "";
			content_start += fields[2];
			content_start += String.format("%02d", Integer.parseInt(fields[0]));
			content_start += String.format("%02d", Integer.parseInt(fields[1]));
			serviceCalendar.setStartDate(new ServiceDate(start));
			DateFormat format2 = new SimpleDateFormat("MM/dd/yyyy");
			Date end = format2.parse(gtfsService.getEnddate());
			fields = gtfsService.getEnddate().split("/");
			String content_end = "";
			content_end += fields[2];
			content_end += String.format("%02d", Integer.parseInt(fields[0]));
			content_end += String.format("%02d", Integer.parseInt(fields[1]));
			serviceCalendar.setEndDate(new ServiceDate(end));
			
	    	index.serviceForId.put(serviceId, serviceCalendar);

			// in windows, the line feed is \r\n
			String lineFeed="\n";
			if(SystemUtils.IS_OS_WINDOWS)
				lineFeed = "\r\n";
			
			//calendar.txt
			String content;
			byte[] contentInBytes;
			if(gtfsService.getMon()==1 || gtfsService.getTue()==1 || gtfsService.getWed()==1 || gtfsService.getThu()==1 || 
					gtfsService.getFri()==1 || gtfsService.getSat()==1 || gtfsService.getSun()==1){
				content = gtfsService.getId().toUpperCase()  + "," + gtfsService.getMon()+ 
						"," + gtfsService.getTue() + "," + gtfsService.getWed() + "," + 
						gtfsService.getThu() + "," + gtfsService.getFri() + "," + 
						gtfsService.getSat() + "," + gtfsService.getSun() + "," + 
						content_start + "," + content_end + lineFeed;
				
				file = new File(path  + "/calendar.txt");
				fop = new FileOutputStream(file, true);
	
				// if file doesnt exists, then create it
				if (!file.exists()) {
					file.createNewFile();
				}
	
				// get the content in bytes
				contentInBytes = content.getBytes();
	
				fop.write(contentInBytes);
				fop.flush();
				fop.close();
			}
			
			//calendar_dates.txt
			file = new File(path  + "/calendar_dates.txt");
			fop = new FileOutputStream(file, true);

			// if file doesnt exists, then create it
			if (!file.exists()) {
				file.createNewFile();
			}
			
			ServiceCalendarDate calendarDate;
			Iterator iterator = gtfsService.getInclude().iterator();
			while(iterator.hasNext()){
				String includedDate = (String)iterator.next();
				String[] spliter = includedDate.split("/");
				String temp = "" + spliter[2] + spliter[0] + spliter[1]; 
				System.out.println(includedDate);
				content = gtfsService.getId().toUpperCase()  + "," + temp + ",1" + lineFeed;
				contentInBytes = content.getBytes();
				fop.write(contentInBytes);
				
				calendarDate = new ServiceCalendarDate();
				calendarDate.setServiceId(serviceId);
				ServiceDate date = new ServiceDate(Integer.parseInt(spliter[2]), Integer.parseInt(spliter[0]), Integer.parseInt(spliter[1]));
				calendarDate.setDate(date);
				calendarDate.setExceptionType(1);
				index.calendarDateForId.put(serviceId, calendarDate);
			}
			iterator = gtfsService.getExclude().iterator();
			while(iterator.hasNext()){
				String excludedDate = (String)iterator.next();
				String[] spliter = excludedDate.split("/");
				String temp = "" + spliter[2] + spliter[0] + spliter[1];
				System.out.println(excludedDate);
				content = gtfsService.getId().toUpperCase()  + "," + temp + ",2" + lineFeed;
				contentInBytes = content.getBytes();
				fop.write(contentInBytes);
				
				calendarDate = new ServiceCalendarDate();
				calendarDate.setServiceId(serviceId);
				ServiceDate date = new ServiceDate(Integer.parseInt(spliter[2]), Integer.parseInt(spliter[0]), Integer.parseInt(spliter[1]));
				calendarDate.setDate(date);
				calendarDate.setExceptionType(2);
				index.calendarDateForId.put(serviceId, calendarDate);
			}			
			fop.flush();
			fop.close();
			
			System.out.println("Done");
			
		} catch (IOException | ParseException e) {
			e.printStackTrace();
			returnVal = -1;
		} finally {
			try {
				if (fop != null) {
					fop.close();
				}
			} catch (IOException e) {
				e.printStackTrace();
				returnVal = -1;
			}
		}
		return returnVal;
	}


	
	//return a list of tripId for updating the client data
	@POST
	@Path("/service/remove")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response removeService(GTFSService gtfsService){
    	ArrayList<String> returnVal;
    	int val;
    	returnVal = removeTripForService(gtfsService);
    	val = removeFromCalendar(gtfsService);
		if (!returnVal.contains("-1") && val >= 0) {
			for(int i=0; i < returnVal.size(); i++){
				String temp = returnVal.get(i);
				returnVal.set(i, temp.substring(0, temp.length()-5));
			}
	        return Response.status(Status.OK).entity(returnVal).build();
	    } else {
	        return Response.status(Status.NOT_FOUND).entity("-1").build();
	    }
	}


	private ArrayList<String> removeTripForService(GTFSService gtfsService) {
		System.out.println("Remove " + gtfsService.getId());
		
		//store tripId for deletion of route/freqency/stoptimes/shape/trip txt
		ArrayList<String> tripIds = new ArrayList<String>();
		
		AgencyAndId serviceId = new AgencyAndId();
		serviceId.setAgencyId(feedId);
		serviceId.setId(gtfsService.getId().split(":")[1]);
		
		System.out.println("#route: " + index.routeForId.size());
		System.out.println("#frequency: " + index.frequencyForTripName.size());
		System.out.println("#tripForId: " + index.tripForId.size());
		System.out.println("#patternForId: " + index.patternForId.size());
		System.out.println("#patternsForRoute: " + index.patternsForRoute.size());
		System.out.println("#patternForTrip: " + index.patternForTrip.size());
		Iterator<Map.Entry<Trip, TripPattern>> it = index.patternForTrip.entrySet().iterator();
		while(it.hasNext()){
			Map.Entry<Trip, TripPattern> tp = (Map.Entry<Trip, TripPattern>)it.next();
			System.out.println(tp);
			String field = tp.getKey().getServiceId().getId();
			if(field.toUpperCase().equals(serviceId.getId()) || field.toUpperCase().equals(serviceId.getId())){
				index.frequencyForTripName.remove(tp.getKey().getId().getId());
				index.patternForId.remove(tp.getValue().code);
		        index.patternsForRoute.remove(tp.getValue().route, tp.getValue());
				index.tripForId.remove(tp.getKey().getId());
				for(Stop s: tp.getValue().getStops()){
					index.patternsForStop.remove(s, tp);
				}
				index.routeForId.values().remove(tp.getValue().route);
				it.remove();
				tripIds.add(tp.getKey().getId().getId());
			}
		}
		System.out.println("#route: " + index.routeForId.size());
		System.out.println("#frequency: " + index.frequencyForTripName.size());
		System.out.println("#tripForId: " + index.tripForId.size());
		System.out.println("#patternForId: " + index.patternForId.size());
		System.out.println("#patternsForRoute: " + index.patternsForRoute.size());
		System.out.println("#patternForTrip: " + index.patternForTrip.size());
		
		System.out.println(tripIds);
		
		File inputFile;
		File tempFile;
		BufferedReader reader;
		BufferedWriter writer;
    	String currentLine;
    	boolean match;
		String lineFeed="\n";
		if(SystemUtils.IS_OS_WINDOWS)
			lineFeed = "\r\n";
		try {
			//trip.txt
			inputFile = new File(path  + "/trips.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		match = false;
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");					
					for(String tripId: tripIds){
						if (tripId.equals(fields[2])) {
							match = true;
							break;
						}
					}
					if(!match){
						//write the line if tripId doens't match
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			
			//shapes.txt
			inputFile = new File(path  + "/shapes.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		match = false;
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");				
					for(String tripId: tripIds){
						if(tripId.substring(0, tripId.length()-5).equals(fields[0].substring(0, fields[0].length()-6))){
							match = true;
							break;
						}
					}
					if(!match){
						//write the line if tripId doens't match
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			
			//stop_times.txt
			inputFile = new File(path  + "/stop_times.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		match = false;
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");				
					for(String tripId: tripIds){
						if (tripId.equals(fields[0])) {
							match = true;
							break;
						}
					}
					if(!match){
						//write the line if tripId doens't match
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			
			//frequencies.txt
			inputFile = new File(path  + "/frequencies.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		match = false;
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");					
					for(String tripId: tripIds){
						if (tripId.equals(fields[0])) {
							match = true;
							break;
						}
					}
					if(!match){
						//write the line if tripId doens't match
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			//routes.txt
			inputFile = new File(path  + "/routes.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	while((currentLine = reader.readLine()) != null) {
	    		match = false;
				if (currentLine.length()>0) {
					String[] fields = currentLine.split(",");				
					for(String tripId: tripIds){
						if(tripId.substring(0, tripId.length()-5).equals(fields[0])){
							match = true;
							break;
						}
					}
					if(!match){
						//write the line if tripId doens't match
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
	    	reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
	
		} catch (IOException e) {
			e.printStackTrace();
			tripIds.add("-1");
		}
		
		return tripIds;
	}


	private int removeFromCalendar(GTFSService gtfsService) {	
		int returnVal = 0;
		System.out.println("Remove " + gtfsService.getId());
		
		/*Yuanyuan(28/07/2017) update the server data */
		AgencyAndId id = new AgencyAndId();
		id.setAgencyId(feedId);
		id.setId(gtfsService.getId().replaceFirst(feedId + ":", ""));
		System.out.println("Check the service id which should be removed "+ id);
		ServiceCalendar removed = index.serviceForId.remove(id);
		if (removed != null)
			System.out.println("Removed from calendar " + removed.getServiceId());
		index.calendarDateForId.removeAll(id);
		
		File inputFile;
		File tempFile;	
		BufferedReader reader;
		BufferedWriter writer;
    	String currentLine;
		String lineFeed="\n";
		if(SystemUtils.IS_OS_WINDOWS)
			lineFeed = "\r\n";
		try {
			//calendar.txt
			inputFile = new File(path  + "/calendar.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
			while((currentLine = reader.readLine()) != null) {
				String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (fields.length>1) {
					if (!fields[0].equals(gtfsService.getId().replaceFirst(feedId + ":", "").toUpperCase())) {
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			//calendar_dates.txt
			inputFile = new File(path  + "/calendar_dates.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
			while((currentLine = reader.readLine()) != null) {
				String trimmedLine = currentLine.trim();
				String[] fields = trimmedLine.split(",");
				if (fields.length>1) {
					if (!fields[0].equals(gtfsService.getId().replaceFirst(feedId + ":", "").toUpperCase())) {
						writer.write(currentLine);
						writer.write(lineFeed);
					}
				}
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			System.out.println("Done");
	
		} catch (IOException e) {
			e.printStackTrace();
			returnVal = -1;
		}
		//0 OK; -1 server error
		return returnVal;
	}



	@POST
	@Path("/service/edit")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public int updateService(GTFSService gtfsService){
    	int returnVal = 0;
    	returnVal = updateCalendarFile(gtfsService);
    	return returnVal;
	}
	
	private int updateCalendarFile(GTFSService gtfsService) {
		int returnVal = 0;
		System.out.println("Update " + gtfsService.getId());
		
		File inputFile;
		File tempFile;
		
		/*Yuanyuan(28/07/2017) update the server data */
		AgencyAndId serviceId = new AgencyAndId();
		serviceId.setAgencyId(feedId);
		serviceId.setId(gtfsService.getId().replaceFirst(feedId + ":", ""));
		
		try {			
			DateFormat format1 = new SimpleDateFormat("MM/dd/yyyy");
			Date start = format1.parse(gtfsService.getStartdate());
			String[] fields = gtfsService.getStartdate().split("/");
			String content_start = "";
			content_start += fields[2];
			content_start += String.format("%02d", Integer.parseInt(fields[0]));
			content_start += String.format("%02d", Integer.parseInt(fields[1]));
			DateFormat format2 = new SimpleDateFormat("MM/dd/yyyy");
			Date end = format2.parse(gtfsService.getEnddate());
			fields = gtfsService.getEnddate().split("/");
			String content_end = "";
			content_end += fields[2];
			content_end += String.format("%02d", Integer.parseInt(fields[0]));
			content_end += String.format("%02d", Integer.parseInt(fields[1]));
			
			ServiceCalendar serviceCalendar = index.serviceForId.get(serviceId);
			serviceCalendar.setMonday(gtfsService.getMon());
			serviceCalendar.setTuesday(gtfsService.getTue());
			serviceCalendar.setWednesday(gtfsService.getWed());
			serviceCalendar.setThursday(gtfsService.getThu());
			serviceCalendar.setFriday(gtfsService.getFri());
			serviceCalendar.setSaturday(gtfsService.getFri());
			serviceCalendar.setSunday(gtfsService.getSun());
			serviceCalendar.setStartDate(new ServiceDate(start));
			serviceCalendar.setEndDate(new ServiceDate(end));
			
			// in windows, the line feed is \r\n
			String lineFeed="\n";
			if(SystemUtils.IS_OS_WINDOWS)
				lineFeed = "\r\n";
			
			//calendar.txt
			String content = gtfsService.getId().replaceFirst(feedId + ":", "").toUpperCase()  + "," + gtfsService.getMon()+ 
					"," + gtfsService.getTue() + "," + gtfsService.getWed() + "," + 
					gtfsService.getThu() + "," + gtfsService.getFri() + "," + 
					gtfsService.getSat() + "," + gtfsService.getSun() + "," + 
					content_start + "," + content_end + lineFeed;
			System.out.println(content);
			inputFile = new File(path  + "/calendar.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");
	    	
	    	BufferedReader reader = new BufferedReader(new FileReader(inputFile));
	    	BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
	    	String currentLine;
			while((currentLine = reader.readLine()) != null) {
				String trimmedLine = currentLine.trim();
				String[] f = trimmedLine.split(",");
				if (!f[0].equals(gtfsService.getId().replaceFirst(feedId + ":", "").toUpperCase())) {
					// System.out.println(currentLine);
					writer.write(currentLine);
					writer.write(lineFeed);
				} else {
					writer.write(content);
				}
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			//calendar_dates.txt
			index.calendarDateForId.removeAll(serviceId);
			
			inputFile = new File(path  + "/calendar_dates.txt");
	    	tempFile = new File(path  + "/myTempFile.txt");	    	
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));
	    	
	    	//delete the existing lines of the serviceId
			while((currentLine = reader.readLine()) != null) {
				String trimmedLine = currentLine.trim();
				String[] f = trimmedLine.split(",");
				if (!f[0].equals(gtfsService.getId().replaceFirst(feedId + ":", "").toUpperCase())) {
					writer.write(currentLine);
					writer.write(lineFeed);
				}
			}
			
			//write new lines
			ServiceCalendarDate calendarDate;
			Iterator iterator = gtfsService.getInclude().iterator();
			while(iterator.hasNext()){
				String includedDate = (String)iterator.next();
				String[] spliter = includedDate.split("/");
				String temp = "" + spliter[2] + spliter[0] + spliter[1]; 
				System.out.println(includedDate);
				content = gtfsService.getId().split(":")[1].toUpperCase()  + "," + temp + ",1" + lineFeed;
				writer.write(content);
				
				calendarDate = new ServiceCalendarDate();
				calendarDate.setServiceId(serviceId);
				ServiceDate date = new ServiceDate(Integer.parseInt(spliter[2]), Integer.parseInt(spliter[0]), Integer.parseInt(spliter[1]));
				calendarDate.setDate(date);
				calendarDate.setExceptionType(1);
				index.calendarDateForId.put(serviceId, calendarDate);
			}
			iterator = gtfsService.getExclude().iterator();
			while(iterator.hasNext()){
				String excludedDate = (String)iterator.next();
				String[] spliter = excludedDate.split("/");
				String temp = "" + spliter[2] + spliter[0] + spliter[1];
				System.out.println(excludedDate);
				content = gtfsService.getId().split(":")[1].toUpperCase()  + "," + temp + ",2" + lineFeed;
				writer.write(content);
				
				calendarDate = new ServiceCalendarDate();
				calendarDate.setServiceId(serviceId);
				ServiceDate date = new ServiceDate(Integer.parseInt(spliter[2]), Integer.parseInt(spliter[0]), Integer.parseInt(spliter[1]));
				calendarDate.setDate(date);
				calendarDate.setExceptionType(2);
				index.calendarDateForId.put(serviceId, calendarDate);
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			
			System.out.println("Done");

		} catch (IOException | ParseException e) {
			e.printStackTrace();
			returnVal = -1;
		}
		return returnVal;
	}

//	public static void addToZipFile(String fileName, ZipOutputStream zos) throws FileNotFoundException, IOException {
//
//		System.out.println("Writing '" + fileName + "' to zip file");
//		
//		File file = new File(fileName);
//		FileInputStream fis = new FileInputStream(file);
//		ZipEntry zipEntry = new ZipEntry(file.getName());
//		zos.putNextEntry(zipEntry);
//
//		byte[] bytes = new byte[1024];
//		int length;
//		while ((length = fis.read(bytes)) >= 0) {
//			zos.write(bytes, 0, length);
//		}
//
//		zos.closeEntry();
//		fis.close();
//	}
	
	private String timeFormat(String init){
		String formatted = "";
		String[] fields = init.split(":");
		for(int i=0; i < fields.length; i++){
			formatted += Integer.parseInt(fields[i]) < 10 ? "0"+Integer.parseInt(fields[i]) : Integer.parseInt(fields[i]);
			if(i < fields.length-1)
				formatted += ":";
		}
		return formatted;
	}
	
//	private void packZipFile() {
//		try {    
//        	// zip files
//        	ZipInputStream in = new ZipInputStream(new FileInputStream(path + "/privateGtfs.zip"));
//
//			ArrayList<String> filesName = new ArrayList<>();
//			
//		    ZipEntry e; 
//		    while( (e = in.getNextEntry()) != null){
//		    	filesName.add(path + "/" + e.getName());
//		    }
//
//		    in.close();
//		    
//		    File gtfsZip = new File(path + "/privateGtfs.zip");
//			FileOutputStream fos = new FileOutputStream(gtfsZip);
//			ZipOutputStream zos = new ZipOutputStream(fos);
//		    for(String s : filesName){
//				addToZipFile(s, zos);
//		    }
//
//			zos.close();
//			fos.close();
//
//        	File gtfs = new File("privateGtfs.zip");
//			gtfs.renameTo(new File( path + "/privateGtfs.zip") );
//            
//        } catch (Throwable t) {
//            t.printStackTrace();
//        }
//	}
	
	
//	@POST
//	@Path("/reload")
//	@Consumes(MediaType.APPLICATION_JSON)
//    @Produces(MediaType.APPLICATION_JSON)
//    public void reload(){
//		packZipFile();
//		
//		otpServer.httpServer.shutdown();
//        try {
//        	ServerReloader.reloadGraph(path);
//		} catch (IOException e) {
//			e.printStackTrace();
//		}
//	}
	
	
	//test the route shape
	@GET
	@Path("/routeShapeTest")
    @Produces(MediaType.APPLICATION_JSON)
    public Response routeShapeTest(){
		File dir = new File("C:\\Users\\mercyforever\\Documents\\SynchroNet\\data\\mengaTest\\SYNCHRONET_SHIP_SHAPE_171219");
		File[] files = dir.listFiles();
		BufferedReader reader;
		String line;
		List<routeShape> r = new ArrayList<routeShape>();
		
		try {
			for (int i = 0; i < files.length; i++) {			
				reader = new BufferedReader(new FileReader(files[i]));
				String route = "";
				ArrayList<Coordinate> points = new ArrayList<Coordinate>();
				PackedCoordinateSequence packedCoords = null;
				while((line = reader.readLine()) != null){					
					String[] fields = line.split(",");
					if(route.equals(""))
						route = fields[0];
					points.add(new Coordinate(Double.parseDouble(fields[2]), Double.parseDouble(fields[1])));
			        CoordinateArrayListSequence coordinates = new CoordinateArrayListSequence(points);
			        packedCoords = new PackedCoordinateSequence.Double(coordinates.toCoordinateArray(), 2);
				}
				r.add(new routeShape(route, PolylineEncoder.createEncodings(GeometryUtils.getGeometryFactory().createLineString(packedCoords))));
			}
			return Response.status(Status.OK).entity(r).build();
		} catch (IOException e) {
			e.printStackTrace();
			return Response.status(Status.NOT_FOUND).entity("4 0 4").build();
		}
 	}
	
	public class routeShape{
		public String name;
		public EncodedPolylineBean coordinate;
		public routeShape(String name, EncodedPolylineBean encodedPolylineBean){
			this.name = name;
			this.coordinate = encodedPolylineBean;
		}
	}
}