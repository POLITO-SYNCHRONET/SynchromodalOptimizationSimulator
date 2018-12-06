package com.SynchroNET.database;

import java.io.StringReader;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBElement;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Unmarshaller;
import javax.xml.stream.FactoryConfigurationError;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import org.opentripplanner.api.model.Itineraries;
import org.opentripplanner.api.model.Itinerary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.configurations.DefaultConfiguration;
import com.SynchroNET.api.resource.ValuesKPIKRI;

import com.amazonaws.util.json.JSONArray;


public class DatabaseManager {
    //EDIT - Riccardo (31/03/2017): This class contains all the method used to comunicate with the database

	private static final Logger LOG = LoggerFactory.getLogger(DatabaseManager.class);
	private static final String address = "jdbc:mysql://localhost:3306/synchronet?autoReconnect=true&useSSL=false";
//	private static final String address = "jdbc:mysql://130.192.16.164:3306/synchronet";
	private static final String userName = "root";
	private static final String password = "root";
	
	//EDIT - Yuanyuan (07/12/2017): Adding new user to database and check the existence of the user
		public static boolean addUser(String username, String password, String role){
			
			boolean s = alreadySaved(username);
			if (s) {
				LOG.info("Have saved!");
				return false;
			}
			String query = "INSERT INTO users (username, password, role) "
					+ "VALUES (?, ?, ?)";
			
			// using try-with-resources so the the resources are closed automatically when their scope of use ends			
			try ( 
				Connection con=DriverManager.getConnection(  
				address,userName,password);  
				PreparedStatement stmt = con.prepareStatement(query);) {
				
				stmt.setString(1, username);
				stmt.setString(2, password);
				stmt.setString(3, role); 
				stmt.execute();
				
				return true;
			} catch (Exception e) {
				e.printStackTrace();
			}			
			return true;
		}
	    private static boolean alreadySaved(String username) {
				Connection con = null;
		    	try {
		    		Class.forName("com.mysql.jdbc.Driver");
					con = DriverManager.getConnection( address,userName,password);
					Statement stmt = con.createStatement();  
					ResultSet rs = stmt.executeQuery("SELECT * FROM users WHERE username='" + username +"'"); 
					return rs.next();
				} catch (Exception e) {
					e.printStackTrace();
					return false;
				} finally{
					 if (con != null) try {con.close();} catch (Exception e) {}
				}
		}
	    public static boolean checkUser(String username, String pass) {
	    	Connection con =null;
	    	try {
				Class.forName("com.mysql.jdbc.Driver"); 
				con = DriverManager.getConnection( address,userName,password);
				Statement stmt = con.createStatement();  
				ResultSet rs = stmt.executeQuery("SELECT * FROM users WHERE username='" + username +"' AND password='"+pass+"'"); 
				return rs.next();
			} catch (Exception e) {
				e.printStackTrace();
				return false;
			} finally{
				if (con != null) try {con.close();} catch (Exception e) {}
			}
	    }
		//EDIT - Yuanyuan (07/12/2017): END
	
	//EDIT - Riccardo (31/03/2017): This method check if the user already booked a trip with the same departure/arrival
	//and give back the vertices labels needed to recalculate the route
	public static ArrayList<String[]> findPreviousRoutesVertices(String user, String from, String to){ 
		Connection con =null;
		try{  
		Class.forName("com.mysql.jdbc.Driver");  
		con = DriverManager.getConnection(address,userName,password);  
		Statement stmt = con.createStatement();  
		ResultSet rs = stmt.executeQuery("SELECT vertices FROM join_previous_routes " 
				+ "INNER JOIN previous_routes ON join_previous_routes.previousRoutesId = previous_routes.Id "
				+ "INNER JOIN users ON join_previous_routes.userId = users.ID "
				+ "WHERE join_previous_routes.userId = (SELECT id FROM users WHERE users.username='" + user + "') "
				+ "AND join_previous_routes.previousRoutesId = (SELECT id FROM previous_routes WHERE previous_routes.departure='" + from + "' AND previous_routes.arrival='" + to + "')");
//		ResultSet rs = stmt.executeQuery("SELECT vertices FROM previous_routes WHERE username='" + user + "' AND departure='" + from +"' AND arrival='" + to + "'");  
		
		ArrayList<String[]> previousRoutesVertices = new ArrayList<>();
		while(rs.next()){  
			String verticesDB = rs.getString(1);  
			JSONArray jsonVertices = new JSONArray(verticesDB);
			
			String[] vertices = new String [jsonVertices.length()];
			for(int j = 0; j < jsonVertices.length(); j++){
				vertices[j] = jsonVertices.getString(j);
			}
			
for(String s : vertices) {
	System.out.println(s);
}
			previousRoutesVertices.add(vertices);
		}
		return previousRoutesVertices;
		} catch(Exception e){
			e.printStackTrace();
			return new ArrayList<String[]>();
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}  
    //EDIT - Riccardo (31/03/2017): END

	//EDIT - Yuanyuan (27/11/2017): Enabling storing multiple booked routes for one user
    //EDIT - Riccardo (04/04/2017): Adding booked route to database
	public static boolean addBookedRoute(String user, String from, String to, String vertices){
		String query = "";
		boolean flag = false;
		
		if(alreadySavedPrevious(user, from, to, vertices)){
			query = "update previous_routes set vertices='"+vertices+ "' where id in (" + 
					"select previousRoutesId from join_previous_routes where userId=" + user + ") and departure='" + from + "' and arrival='" + to+"'"; 
			flag = true;
			LOG.info("Already saved");
		} else {
			// need to update at 2 tables
			query = "INSERT INTO previous_routes (departure, arrival, vertices) VALUES ('" 
						+ from + "','" + to + "','" + vertices +"')";
			flag = false;
		}
		
		Connection con= null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con=DriverManager.getConnection(address,userName,password);  
			Statement stmt = con.createStatement(); 
			int n = stmt.executeUpdate(query);
			
			if(n > 0) {
				if (flag) {
					// update 2nd table
					// 1st retrieve the previousRoutesId
					ResultSet rs = stmt.executeQuery("SELECT id FROM previous_routes WHERE departure=" + from +"AND arrival=" + to +" AND vertices=" + vertices); 
					String previousRoutesId = "";
					if (rs.next())
						previousRoutesId = rs.getString("id");
					else
						return false;
					// 2nd update the table
					query = "INSERT INTO join_previous_routes (userId, previousRoutesId) VALUES (" 
							+ user + ", " + previousRoutesId +")";
					n = stmt.executeUpdate(query);
					if (n>0)
						return true;
					return false;
				}
				return true;
			}
			else return false;
		
		} catch (Exception e){
			e.printStackTrace();
			return false;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
    //EDIT - Riccardo (04/04/2017): END
	
	//EDIT - Yuanyuan (27/11/2017): This method checks if the user already marked preferred routes with the same departure/arrival
		//and give back the Itinerary
		public static List<Itinerary> findPreferredRoutesItinerary(String uId, String departure, String arrival){  
			List<Itinerary> itineraryList = new ArrayList<Itinerary>();
			Connection con=null;
			try{  
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password);  
			Statement stmt = con.createStatement();  
			ResultSet rs = stmt.executeQuery("SELECT itinerary FROM preferred_routes WHERE uId='" + uId + "' AND departure='" + departure +"' AND arrival='" + arrival+"'");
			while(rs.next()){ 
				String itineraryString = rs.getString("itinerary");
				// unmarshal from xml string to java object
				Itinerary iti = unmarshalItinerary(itineraryString);
				LOG.info("The itinerary is "+iti.getID());
				itineraryList.add(iti);
			}
			return itineraryList;
			} catch(Exception e){
				e.printStackTrace();
				return null;
			} finally{
				if (con != null) try {con.close();} catch (Exception e) {}
			}
		}
		private static Itinerary unmarshalItinerary(String itineraryString) {
			JAXBContext jc;
			XMLStreamReader reader = null;
			try {
				jc = JAXBContext.newInstance(Itineraries.class);
				Unmarshaller u = jc.createUnmarshaller();
				try {
					reader = XMLInputFactory.newInstance().createXMLStreamReader(new StringReader(itineraryString));
				} catch (XMLStreamException | FactoryConfigurationError e) {
					e.printStackTrace();
				}
				//LOG.info("Check the db selection "+itineraryString);
				/*JAXBElement<Itineraries> itinerariesJAXB = u.unmarshal(reader, Itineraries.class);
				Itineraries itineraries = itinerariesJAXB.getValue();
				LOG.info("Size is "+itineraries.getItineraries().size());
				return itineraries.getItineraries().get(0); */
				JAXBElement<Itinerary> itineraryJAXB = u.unmarshal(reader, Itinerary.class);
				Itinerary itinerary = itineraryJAXB.getValue();
				return itinerary;
			} catch (JAXBException e) {
				e.printStackTrace();
			}
			return null; // this should not be reached
			
		}
	//EDIT - Yuanyuan (27/11/2017): END 
    //EDIT - Yuanyuan (23/11/2017): Adding preferred route to database
	public static boolean addPreferredRoute(String uId, String departure, String arrival, String itinerary){
		String query = "";
		
		if(alreadySavedPreferred(uId, departure, arrival, itinerary)){
			LOG.info("Already saved");
			return true;
			
		} else {
			query = "INSERT INTO preferred_routes (uId, departure, arrival, itinerary) VALUES ('" 
						+ uId + "', '" + departure + "', '" + arrival + "','" + itinerary+"')";
		}
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con=DriverManager.getConnection(address,userName,password);  
			Statement stmt = con.createStatement(); 
			int n = stmt.executeUpdate(query);
			
			if(n > 0) return true;
			else return false;
		
		} catch (Exception e){
			e.printStackTrace();
			return false;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
    private static boolean alreadySavedPreferred(String uId, String departure, String arrival, String itinerary) {
    	Connection con = null;
    	try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  
			ResultSet rs = stmt.executeQuery("SELECT * FROM preferred_routes WHERE uId='" + uId + "' AND departure='" + departure +"' AND arrival='" + arrival+"'"); 
			return rs.next();
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	//EDIT - Yuanyuan (23/11/2017): END
	
	private static boolean alreadySavedPrevious(String user, String from, String to, String vertices){
		Connection con = null;
		try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  
			ResultSet rs = stmt.executeQuery("SELECT * FROM previous_routes WHERE  departure='" + from + "' AND arrival='" + to +"'"
					+ " AND id in (select previousRoutesId from join_previous_routes where userId='" + user + "')"); 
			return rs.next();
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}  finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	public static ArrayList<GenericConfiguration> findGenericConfiguration(String user){
		String query = "SELECT * FROM generic_configurations WHERE username='" + user + "'";
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password); 
			return getGenericConfigurations(query(con, query));
		} catch(Exception e){
			e.printStackTrace();
			return null;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
		
//		return getGenericConfigurations(query(query));
	}
	
	public static ArrayList<GenericConfiguration> findCurrentGenericConfiguration(String user){
		String query = "SELECT * FROM generic_configurations WHERE username='" + user + "' AND current=TRUE";
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password); 
			return getGenericConfigurations(query(con, query));
		} catch(Exception e){
			e.printStackTrace();
			return null;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
		
//		return getGenericConfigurations(query(query));
	}
	
	public static ArrayList<VehicleConfiguration> findVehicleConfiguration(String user){
		String query = "SELECT * FROM vehicle_configurations WHERE username='" + user + "'";
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");
			con = DriverManager.getConnection(address,userName,password); 
			return getVehicleConfigurations(query(con, query));
		} catch(Exception e){
			e.printStackTrace();
			return null;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
		
//		return getVehicleConfigurations(query(query));
	}
	
	public static ArrayList<VehicleConfiguration> findCurrentVehicleConfiguration(String user){
		String query = "SELECT * FROM vehicle_configurations WHERE username='" + user + "' AND current=TRUE";
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password); 
			return getVehicleConfigurations(query(con, query));
		} catch(Exception e){
			e.printStackTrace();
			return null;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
		
//		return getVehicleConfigurations(query(query));
	}
	
	private static ResultSet query(String query){  
		Connection con = null;
		try{  
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password);  
			Statement stmt = con.createStatement();  
			ResultSet rs = stmt.executeQuery(query);  
			
			return rs;
		} catch (Exception e) {
			e.printStackTrace();
			return null;
		}
	}  
	
	private static ResultSet query(Connection con, String query){
		Statement stmt;
		try {
			stmt = con.createStatement();
			ResultSet rs = stmt.executeQuery(query);  
			return rs;
		} catch (SQLException e) {
			e.printStackTrace();
			return null;
		}  
	}
//	
	private static ArrayList<GenericConfiguration> getGenericConfigurations(ResultSet rs){
		ArrayList<GenericConfiguration> configurations = new ArrayList<GenericConfiguration>();

		if(rs == null) return configurations;
		
		try {
			
			while(rs.next()){
				GenericConfiguration gc = new GenericConfiguration(rs.getInt("id"), 
						rs.getString("username"), rs.getString("configurationName"), rs.getDouble("costPerHour"), rs.getDouble("costPerKgCO2"), 
						rs.getDouble("KPICO2"), rs.getDouble("KPIDistance"), rs.getDouble("KPITime"), rs.getDouble("KRITime"), rs.getDouble("KRISafety"),
						rs.getDouble("KRICost"), rs.getDouble("KRIFlexibility"), rs.getInt("transfer"), rs.getBoolean("current"));
				configurations.add(gc);
			}
		} catch (SQLException e) {
			e.printStackTrace();
		}
		
		return configurations;
	}
	
	private static ArrayList<VehicleConfiguration> getVehicleConfigurations(ResultSet rs){
		ArrayList<VehicleConfiguration> configurations = new ArrayList<VehicleConfiguration>();

		if(rs == null) return configurations;
		
		try {
			while(rs.next()){
				VehicleConfiguration gc = new VehicleConfiguration(
						rs.getInt("id"), rs.getString("username"), rs.getString("configurationName"), rs.getString("mode"), rs.getDouble("speed"), 
						rs.getDouble("capacity"), rs.getDouble("costPerKm"), rs.getDouble("CO2PerKm"), rs.getDouble("CO2PerKmSlow"), rs.getDouble("CO2PerKmFast"), 
						rs.getInt("boarding"), rs.getInt("alighting"), rs.getInt("boardingRoRo"), rs.getInt("alightingRoRo"), rs.getBoolean("current"));
				configurations.add(gc);
			}
		} catch (SQLException e) {
			e.printStackTrace();
		}
		
		return configurations;
	}
	
    //EDIT - Yuanyuan (4/12/2017): Adding configurations to database
	public static int addVehicleConfiguration(int id, String username, String configurationName, String mode, double speed, double capacity,
			double costPerKm, double CO2PerKm, double CO2PerKmSlow, int boarding, int alighting, int boardingRoRo, int alightingRoRo, int current, double CO2PerKmFast){
		String query = "";
		
		if(alreadySavedVehicleConf(username, configurationName)){
			LOG.info("Already saved");
			return editVehicleConfiguration(id, username, configurationName, mode, speed, capacity, costPerKm, CO2PerKm, CO2PerKmSlow, boarding, alighting, boardingRoRo, alightingRoRo, current, CO2PerKmFast);
		} else {
			query = "INSERT INTO vehicle_configurations (username, configurationName, mode, speed, capacity, costPerKm, CO2PerKm, CO2PerKmSlow, boarding, alighting, boardingRoRo, alightingRoRo, current, CO2PerKmFast) VALUES ('" 
						+ username + "', '" + configurationName+ "', '" + mode + "','" + speed+ "', '" + capacity+ "', '" + costPerKm + "', '" + CO2PerKm+ "', '" + CO2PerKmSlow +"', '" + boarding+ "', '" + alighting + "','" + boardingRoRo+
						 "','" + alightingRoRo + "','" + current +"' , '" + CO2PerKmFast + "')";
			System.out.println(query);
		}
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con=DriverManager.getConnection(address,userName,password);  
			Statement stmt = con.createStatement(); 
			int n = stmt.executeUpdate(query, Statement.RETURN_GENERATED_KEYS);
			
			if(n <= 0) return -1;
			
			//return the last Id generated
			ResultSet keys = stmt.getGeneratedKeys();
			if(keys.next()){
				return keys.getInt(1);
			}
			else return -1;
		
		} catch (Exception e){
			e.printStackTrace();
			return -1;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
    private static boolean alreadySavedVehicleConf(String username, String configurationName) {
    	Connection con = null;
    	try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  
			ResultSet rs = stmt.executeQuery("SELECT * FROM vehicle_configurations WHERE username='" + username + "' AND configurationName='" + configurationName +"'"); 
			return rs.next();
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
  //EDIT - Yuanyuan (5/12/2017): Updating configurations to database
  public static int editVehicleConfiguration(int id, String username, String configurationName, String mode, double speed, double capacity,
  			double costPerKm, double CO2PerKm, double CO2PerKmSlow, int boarding, int alighting, int boardingRoRo, int alightingRoRo, int current, double CO2PerKmFast){
	  Connection con = null;
	  try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			System.out.println("UPDATE vehicle_configurations SET mode='" + mode
  					+ "' , speed='" + speed + "' , capacity='" + capacity + "' , costPerKm='" + costPerKm + "' , CO2PerKm='" + CO2PerKm+ "' , CO2PerKmSlow='" + CO2PerKmSlow
  					+ "' , boarding='" + boarding + "' , alighting='" + alighting+ "' , boardingRoRo='" + boardingRoRo +"' , alightingRoRo='"+alightingRoRo+"' , current='"
  					+current+ "', CO2PerKmFast='" + CO2PerKmFast + "' WHERE id='"+id+"' AND username='" + username + "'");
  			int n = stmt.executeUpdate("UPDATE vehicle_configurations SET mode='" + mode
  					+ "' , speed='" + speed + "' , capacity='" + capacity + "' , costPerKm='" + costPerKm + "' , CO2PerKm='" + CO2PerKm+ "' , CO2PerKmSlow='" + CO2PerKmSlow
  					+ "' , boarding='" + boarding + "' , alighting='" + alighting+ "' , boardingRoRo='" + boardingRoRo +"' , alightingRoRo='"+alightingRoRo+"' , current='"
  					+current+ "', CO2PerKmFast='" + CO2PerKmFast + "' WHERE id='"+id+"' AND username='" + username + "'");
  			
  			if(n > 0) return 0;
  			else return -1;
  		
  		} catch (Exception e){
  			e.printStackTrace();
  			return -1;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
  	} 
  	
    //return = new Id of the configuration : add successful
	//return = 0 : edit succesful
	//return = -1 : add/edit unsuccessful 
    public static int addGenericConfiguration(int id, String username, String configurationName, double costPerHour, double costPerKgCO2, double KPICO2,
			double KPIDistance, double KPITime, double KRISafety, double KRICost, double KRIFlexibility, int transfer, int current, double KRITime){
		String query = "";
		
		if(alreadySaved(username, configurationName)){
			LOG.info("Already saved");
			return editGenericConfiguration(id, username, configurationName, costPerHour, costPerKgCO2, KPICO2, KPIDistance, KPITime, KRISafety, KRICost, KRIFlexibility, transfer, current, KRITime);
		} else {
			query = "INSERT INTO generic_configurations (username, configurationName, costPerHour, costPerKgCO2, KPICO2, KPIDistance, KPITime, KRISafety, KRICost, KRIFlexibility, transfer, current, KRITime) VALUES ('" 
						+ username + "', '" + configurationName+ "', '" + costPerHour + "','" + costPerKgCO2+ "', '" + KPICO2 + "', '" + KPIDistance + "', '" + KPITime + "', '" + KRISafety +"', '" + KRICost+ "', '" + KRIFlexibility + "','" + transfer+
						 "', '"+ current +"', '" + KRITime + "')";
			System.out.println(query);
		}
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con=DriverManager.getConnection(address,userName,password);  
			Statement stmt = con.createStatement(); 
			int n = stmt.executeUpdate(query, Statement.RETURN_GENERATED_KEYS);
			
			if(n <= 0) return -1;
			
			//return the last Id generated
			ResultSet keys = stmt.getGeneratedKeys();
			if(keys.next()){
				return keys.getInt(1);
			}
			else return -1;
			
		} catch (Exception e){
			e.printStackTrace();
			return -1;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
    
    private static boolean alreadySaved(String username, String configurationName) {
    	Connection con = null;
    	try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  

			ResultSet rs = stmt.executeQuery("SELECT * FROM generic_configurations WHERE username='" + username + "' AND configurationName='" + configurationName + "'"); 
			return rs.next();
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}

    public static int editGenericConfiguration(int id, String username, String configurationName, double costPerHour, double costPerKgCO2, double KPICO2,
			double KPIDistance, double KPITime, double KRISafety, double KRICost, double KRIFlexibility, int transfer, int current, double KRITime){
    	Connection con = null;
  		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			System.out.println("UPDATE generic_configurations SET costPerHour='" + costPerHour
  					+ "' , costPerKgCO2='" + costPerKgCO2 + "' , KPICO2='" + KPICO2 + "' , KPIDistance='" + KPIDistance + "' , KPITime='" + KPITime+ "' , KRISafety='" + KRISafety
  					+ "' , KRICost='" + KRICost + "' , KRIFlexibility='" + KRIFlexibility+ "' , current='" + current +"' , KRITime='" + KRITime + "' WHERE id='"+id+"' AND username='" 
  					+ username + "'");
  			int n = stmt.executeUpdate("UPDATE generic_configurations SET costPerHour='" + costPerHour
  					+ "' , costPerKgCO2='" + costPerKgCO2 + "' , KPICO2='" + KPICO2 + "' , KPIDistance='" + KPIDistance + "' , KPITime='" + KPITime+ "' , KRISafety='" + KRISafety
  					+ "' , KRICost='" + KRICost + "' , KRIFlexibility='" + KRIFlexibility+ "' , current='" + current +"' , KRITime='" + KRITime + "' WHERE id='"+id+"' AND username='" 
  					+ username + "'");
  			
  			if(n > 0) return 0;
  			else return -1;
  		
  		} catch (Exception e){
  			e.printStackTrace();
  			return -1;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
  	}
    
    // Delete configurations
    public static boolean deleteGenericConfiguration(int id, String username){
  		String query = "DELETE FROM generic_configurations WHERE id='"+id+"' AND username='" + username + "'";
  		Connection con = null;
  		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			int n = stmt.executeUpdate(query);
  			
  			if(n > 0) return true;
  			else return false;
  		
  		} catch (Exception e){
  			e.printStackTrace();
  			return false;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
  		
    }
    public static boolean deleteVehicleConfiguration(int id, String username){
  		String query = "DELETE FROM vehicle_configurations WHERE id='"+id+"' AND username='" + username + "'";
  		Connection con = null;
  		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			int n = stmt.executeUpdate(query);
  			
  			if(n > 0) return true;
  			else return false;
  		
  		} catch (Exception e){
  			e.printStackTrace();
  			return false;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
  		
    }
    public static boolean deletePreviousRoute(int id) {
    		String query = "DELETE FROM previous_routes WHERE id='"+id+"'";
    		Connection con = null;
  		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			int n = stmt.executeUpdate(query);
  			
  			if(n > 0) return true;
  			else return false;
  		
  		} catch (Exception e){
  			e.printStackTrace();
  			return false;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
    }
    public static boolean deletePreferredRoute(int id) {
    		String query = "DELETE FROM preferred_routes WHERE id='"+id+"'";
    		Connection con = null;
  		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			int n = stmt.executeUpdate(query);
  			
  			if(n > 0) return true;
  			else return false;
  		
  		} catch (Exception e){
  			e.printStackTrace();
  			return false;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
    }
	//EDIT - Yuanyuan (23/11/2017): END
    
    //Shuai(09-04-2018) get vehicle configurations based on mode
	public static ArrayList<VehicleConfiguration> findVehicleConfigurationByMode(String username, String mode) {
		String query = "SELECT * FROM vehicle_configurations WHERE username='" + username + "' AND mode='" + mode + "'";
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password); 
			return getVehicleConfigurations(query(con, query));
		} catch(Exception e){
			e.printStackTrace();
			return null;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
		
//		return getVehicleConfigurations(query(query));		
	}    
    
    //Shuai(06-04-2018) database management for routes configuration
	public static ArrayList<RoutesConfiguration> findRoutesConfiguration(String username) {
		String query = "SELECT * FROM stops_routes_configurations WHERE username='" + username + "'";
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password); 
			return getRoutesConfigurations(query(con, query), con);
		} catch(Exception e){
			e.printStackTrace();
			return null;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
		
//		return getRoutesConfigurations(query(query));
	}
	
	public static ArrayList<RoutesConfiguration> findCurrentRoutesConfiguration(String username) {
		String query = "SELECT * FROM stops_routes_configurations WHERE username='" + username + "' AND current=TRUE";
		
		Connection con = null;
		try{
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection(address,userName,password); 
			return getRoutesConfigurations(query(con, query), con);
		} catch(Exception e){
			e.printStackTrace();
			return null;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
		
//		return getRoutesConfigurations(query(query));
	}
	
	private static ArrayList<RoutesConfiguration> getRoutesConfigurations(ResultSet rs, Connection con){
		ArrayList<RoutesConfiguration> configurations = new ArrayList<RoutesConfiguration>();

		if(rs == null) return configurations;
		
		try {
			while(rs.next()){
				RoutesConfiguration rc = new RoutesConfiguration();
				int id = rs.getInt("id");
				rc.setId(id);
				rc.setUsername(rs.getString("username"));
				rc.setConfigurationName(rs.getString("configurationName"));
				rc.setCurrent(rs.getBoolean("current"));

				//get also routes from banned/forced routes/stops
				rc.setBannedRotues(getRoutesList(id, "banned_routes", ",", con));
				rc.setForcedRoutes(getRoutesList(id, "forced_routes", ",", con));
				rc.setBannedStops(getRoutesList(id, "banned_stops", ";", con));
				rc.setPassBy(getRoutesList(id, "forced_stops", ";", con));

				configurations.add(rc);
			}
		} catch (SQLException e) {
			e.printStackTrace();
		}
		return configurations;
	}
	
	private static String getRoutesList(int id, String tableName, String separator, Connection con) {
		String query = "SELECT * FROM join_" + tableName + " INNER JOIN " + tableName + " ON join_" + tableName + "." + tableName 
						+ "=" + tableName + ".id WHERE join_" + tableName + ".stopsRoutesConfigurationId='" + id + "'";
//		System.out.println(query);
		ResultSet rs = query(con, query);
		try {
			String routeList = "";
			while(rs.next()){
				if(routeList != ""){
					routeList += separator;
				}
				routeList += rs.getString("route");
			}
//			System.out.println(routeList);
			return routeList;
		} catch (SQLException e) {
			e.printStackTrace();
			return "";
		}
	}
	
	public static int addRoutesConfiguration(int id, String username, String configurationName, String bannedRotues,
			String forcedRoutes, String bannedStops, String passBy, int current) {
		String query = "";
//		System.out.println(passBy);
		String[] bannedRoutesList = (bannedRotues == null || bannedRotues == "") ? null : bannedRotues.split(",");
		String[] forcedRoutesList = (forcedRoutes == null || forcedRoutes == "") ? null : forcedRoutes.split(",");
		String[] bannedStopsList = (bannedStops == null || bannedStops == "") ? null : bannedStops.split(";");
		String[] passByList = (passBy == null || passBy == "") ? null : passBy.split(";");
				
		if(alreadySavedRoutesConf(username, configurationName)){
			LOG.info("Already saved");
			return editRoutesConfiguration(id, username, configurationName, current, bannedRoutesList, forcedRoutesList, bannedStopsList, passByList);
		} else {
			//update the table "stops_routes_configurations"
			query = "INSERT INTO stops_routes_configurations (username, configurationName, current) VALUES ('" + username + "', '" + configurationName+ "', '" 
					+ current + "')";
//			System.out.println(query);
			
			Connection con = null;
			try{
				Class.forName("com.mysql.jdbc.Driver");  
				con=DriverManager.getConnection(address,userName,password);  
				Statement stmt = con.createStatement(); 
				int n = stmt.executeUpdate(query, Statement.RETURN_GENERATED_KEYS);
				if(n <= 0) return -1;
				//save the last Id generated in "stops_routes_configurations"
				ResultSet keys = stmt.getGeneratedKeys();
							
				if(keys.next()){
					int newId = keys.getInt(1);
					//update other tables
					if(!insertRoutesConfig(newId, "banned_routes", bannedRoutesList)) return -1;
					if(!insertRoutesConfig(newId, "forced_routes", forcedRoutesList)) return -1;
					if(!insertRoutesConfig(newId, "banned_stops", bannedStopsList)) return -1;
					if(!insertRoutesConfig(newId, "forced_stops", passByList)) return -1;
					//return the last Id generated in "stops_routes_configurations" after updating all the tables
					return newId;
				}
				else return -1;
				
			} catch (Exception e){
				e.printStackTrace();
				return -1;
			} finally{
				if (con != null) try {con.close();} catch (Exception e) {}
			}
		}
	}
	
	private static boolean insertRoutesConfig(int newId, String tableName, String[] dataList) {
		String query = "";
		if(dataList != null)
			for(int i=0; i < dataList.length; i++){
				//check if the route is already saved in the table 'tableName'
				int routeId = routeAlreadySaved(dataList[i], tableName);
				if(routeId == -1){
					return false;
				}
				else if(routeId == 0){
					//update table based on tableName
					query = "INSERT INTO " + tableName + " (route) VALUES ('" + dataList[i] + "')";	
//					System.out.println(query);
					Connection con = null;
					try {
						Class.forName("com.mysql.jdbc.Driver");
						con=DriverManager.getConnection(address,userName,password);  
						Statement stmt = con.createStatement(); 
						int n = stmt.executeUpdate(query, Statement.RETURN_GENERATED_KEYS);
						if(n <= 0) return false;
						ResultSet keys = stmt.getGeneratedKeys();
						if(keys.next()){
							int index = keys.getInt(1);
							//update the "join" table
							query = "INSERT INTO join_" + tableName + "(stopsRoutesConfigurationId, " + tableName + ") VALUES ('" + newId + "', '" + index + "')";
//							System.out.println(query);
							n = stmt.executeUpdate(query);
							if(n <= 0) return false;
						}
						else return false;
					} catch (Exception e) {
						e.printStackTrace();
						return false;
					}   finally{
						if (con != null) try {con.close();} catch (Exception e) {}
					}
				}
				else{
					//update the "join" table only with the existing routeId
					query = "INSERT INTO join_" + tableName + "(stopsRoutesConfigurationId, " + tableName + ") VALUES ('" + newId + "', '" + routeId + "')";
//					System.out.println(query);
					Connection con = null;
					try {
						Class.forName("com.mysql.jdbc.Driver");
						con=DriverManager.getConnection(address,userName,password);  
						Statement stmt = con.createStatement(); 
						int n = stmt.executeUpdate(query);
						if(n <= 0) return false;						
					} catch (Exception e) {
						e.printStackTrace();
						return false;
					}   finally{
						if (con != null) try {con.close();} catch (Exception e) {}
					}
				}
			}
		return true;
	}
	
	private static int routeAlreadySaved(String route, String tableName) {
		//return -1 if error, return 0 if already saved, otherwise the id of the route.
		String query = "SELECT * FROM " + tableName + " WHERE route='" + route + "'";
		Connection con = null;
		try {
			Class.forName("com.mysql.jdbc.Driver");
			con=DriverManager.getConnection(address,userName,password);  
			Statement stmt = con.createStatement(); 
			
			ResultSet rs = stmt.executeQuery(query);
			if(rs.next()){
				return rs.getInt("id");
			}
			else 
				return 0;			
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		}   finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	private static boolean alreadySavedRoutesConf(String username, String configurationName) {
		Connection con = null;
		try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  

			ResultSet rs = stmt.executeQuery("SELECT * FROM stops_routes_configurations WHERE username='" + username + "' AND configurationName='" + configurationName + "'"); 
			return rs.next();
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	public static int editRoutesConfiguration(int id, String username, String configurationName, int current, String[] bannedRoutesList, String[] forcedRoutesList, String[] bannedStopsList, String[] passByList){
		Connection con = null;
		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			//update the table "stops_routes_configurations"
  			int n = stmt.executeUpdate("UPDATE stops_routes_configurations SET current='" + current +"' WHERE id='"+id+"' AND username='" + username + "'");
  			
  			if(n > 0){
  				//update other tables
				if(!updateRoutesConfig(id, "banned_routes", bannedRoutesList)) return -1;
				if(!updateRoutesConfig(id, "forced_routes", forcedRoutesList)) return -1;
				if(!updateRoutesConfig(id, "banned_stops", bannedStopsList)) return -1;
				if(!updateRoutesConfig(id, "forced_stops", passByList)) return -1;
  				return 0;
  			}
  			else return -1;
  		} catch (Exception e){
  			e.printStackTrace();
  			return -1;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	private static boolean updateRoutesConfig(int id, String tableName, String[] dataList) {
		String query = "";
		Connection con = null;
		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			
			if(dataList == null){
				//remove all the previously inserted data in 'join' table.
				query = "DELETE FROM join_" + tableName + " WHERE stopsRoutesConfigurationId='" + id + "'";
//				System.out.println(query);
				int n = stmt.executeUpdate(query);
	  			if(n >= 0) return true;
	  			else return false;
			}
			else{
				query = "SELECT * FROM join_" + tableName + " INNER JOIN " + tableName + " ON join_" + tableName + "." + tableName + "=" + tableName + ".id" 
						+ " WHERE join_" + tableName + ".stopsRoutesConfigurationId=" + id;
//				System.out.println(query);
				ResultSet rs = stmt.executeQuery(query);
				
				ArrayList<String> newRoutes = new ArrayList<String>();
				ArrayList<String> removedRoutes = new ArrayList<String>();
				ArrayList<String> temp = new ArrayList<String>();
				
				for(int i=0; i < dataList.length; i++)
					newRoutes.add(dataList[i].toString().intern());
				while(rs.next()){
					String r = rs.getString("route").toString().intern();
//					System.out.println(r);
					removedRoutes.add(r);
					temp.add(r);
				}
//				System.out.println("newRoutes:" + newRoutes);
//				System.out.println("removedRoutes:" + removedRoutes);				
				//get the difference between the stored data and the new input
				removedRoutes.removeAll(newRoutes);
				newRoutes.removeAll(temp);
//				System.out.println("newRoutes:" + newRoutes);
//				System.out.println("removedRoutes:" + removedRoutes);
				
				for(int i=0; i < removedRoutes.size(); i++){
					query = "DELETE FROM join_" + tableName + " WHERE stopsRoutesConfigurationId='" + id + "' AND " + tableName + "=(SELECT id FROM " 
							+ tableName + " WHERE route='" + removedRoutes.get(i) + "')";
//					System.out.println(query);
					int n = stmt.executeUpdate(query);
		  			if(n > 0) continue;
		  			else return false;
				}
				
				for(int i=0; i < newRoutes.size(); i++){
//					System.out.println(newRoutes.get(i));
					String[] tmp = {newRoutes.get(i)};
					if(!insertRoutesConfig(id, tableName, tmp)) 
						return false;
				}
				return true;
			}
  		} catch (Exception e){
  			e.printStackTrace();
  			return false;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	public static boolean deleteRoutesConfiguration(int id, String username) {
		String query = "DELETE FROM stops_routes_configurations WHERE id='"+id+"' AND username='" + username + "'";
		Connection con = null;
  		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			int n = stmt.executeUpdate(query);
  			
  			if(n > 0){
  				if(!deleteRoutesConf(id, "banned_routes")) return false;
				if(!deleteRoutesConf(id, "forced_routes")) return false;
				if(!deleteRoutesConf(id, "banned_stops")) return false;
				if(!deleteRoutesConf(id, "forced_stops")) return false;
				return true;
  			}
  			else return false;
  		
  		} catch (Exception e){
  			e.printStackTrace();
  			return false;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	public static boolean deleteRoutesConf(int id, String tableName){
		String query = "DELETE FROM join_" + tableName + " WHERE stopsRoutesConfigurationId='" + id + "'";
		Connection con = null;
		try{
  			Class.forName("com.mysql.jdbc.Driver");  
  			con=DriverManager.getConnection(address,userName,password);  
  			Statement stmt = con.createStatement(); 
  			int n = stmt.executeUpdate(query);
  			if(n >= 0) return true;
  			else return false;
  		} catch (Exception e){
  			e.printStackTrace();
  			return false;
  		} finally{
  			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	//Shuai(03-05-2018) check if the user exists. If not, add to database as well as a default configuration.
	//return 1 if user already exists
	//return 0 if user is added successfully
	//return -1 if error
	public static int userCheckAndInitialization(String username, String userrole) {
		Connection con = null;
		try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  
			ResultSet rs = stmt.executeQuery("SELECT * FROM users WHERE username='" + username +"'");
			if(rs.next())
				return 1;
			else{
				int n = stmt.executeUpdate("INSERT INTO users (username, password, role) VALUES('" + username + "', '', '" + userrole + "') ");
				if(n > 0){
					//add default configuration
					
					int r;
					//Shuai(07-09-2018) check if KPI/KRI values of the user role are stored in database.
					rs = stmt.executeQuery("SELECT * FROM stakeholder_assessment WHERE role='" + userrole + "'");
					if(rs.next()){
						r = addGenericConfiguration(-1, username, "Default", DefaultConfiguration.cost_per_hour, DefaultConfiguration.co2_cost_per_kg,
								rs.getDouble("KPICO2"), rs.getDouble("KPIDistance"), rs.getDouble("KPITime"), rs.getDouble("KRISafety"), rs.getDouble("KRICost"),
								rs.getDouble("KRIFlexibility"), 0, 0, rs.getDouble("KRITime"));
					}
					else{
						r = addGenericConfiguration(-1, username, "Default", DefaultConfiguration.cost_per_hour, DefaultConfiguration.co2_cost_per_kg, 
								DefaultConfiguration.KPICO2, DefaultConfiguration.KPIDistance, DefaultConfiguration.KPITime, DefaultConfiguration.KRISafety, 
								DefaultConfiguration.KRICost, DefaultConfiguration.KRIFlexibility, 0, 0, DefaultConfiguration.KRITime);
					}

					if(r == -1)
						return -1;
					else{
						r = addVehicleConfiguration(-1, username, "DefaultTruck", "Truck", 0, 0, DefaultConfiguration.cost_distance_per_km_truck, 
								DefaultConfiguration.co2_per_km_truck, 0, DefaultConfiguration.boarding_time_truck, DefaultConfiguration.alighting_time_truck,
								0, 0, 0, 0);
						if(r == -1)
							return -1;
						else{
							r = addVehicleConfiguration(-1, username, "DefaultTrain", "Train", 0, DefaultConfiguration.capacity_rail, DefaultConfiguration.cost_distance_per_km_train, 
									DefaultConfiguration.co2_per_km_train, 0, DefaultConfiguration.boarding_time_rail, DefaultConfiguration.alighting_time_rail,
									0, 0, 0, 0);
							if(r == -1)
								return -1;
							else{
								r = addVehicleConfiguration(-1, username, "DefaultShip", "Ship", 0, DefaultConfiguration.capacity_feeder_ship, DefaultConfiguration.cost_distance_per_km_ship, 
										DefaultConfiguration.co2_per_km_feeder_ship_Medium, DefaultConfiguration.co2_per_km_feeder_ship_Slow, DefaultConfiguration.boarding_time_ship_lolo, 
										DefaultConfiguration.alighting_time_ship_lolo,DefaultConfiguration.boarding_time_ship_roro, DefaultConfiguration.alighting_time_ship_roro, 0, 
										DefaultConfiguration.co2_per_km_feeder_ship_Fast);
								if(r == -1)
									return -1;
								else
									return 0;
							}
						}
					}
				}
				else
					return -1;
			}
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		} finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}	
	

	//Shuai(07-09-2018) store the KPI/KRI values from stakeholder assessment by user role into database
	public static boolean setValuesFromStakeholderAssessmentByRole(String userRole, double emission, double length, double time, double flexibility, 
			double safety, double costDeviation, double timeDeviation){
		String query = "";
		Connection con = null;
		try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  

			ResultSet rs = stmt.executeQuery("SELECT * FROM stakeholder_assessment WHERE role='" + userRole + "'"); 
			
			if(rs.next()){
				//update if the default configuration for the given role already exists
				query = "UPDATE stakeholder_assessment SET KPICO2='" + emission + "' , KPIDistance='" + length 
						+ "' , KPITime='" + time+ "' , KRISafety='" + safety + "' , KRICost='" + costDeviation + "' , KRIFlexibility='" + flexibility
					 	+ "' , KRITime='" + timeDeviation + "' WHERE role='" + userRole + "'";
				System.out.println(query);
				int n = stmt.executeUpdate(query);
	  			if(n > 0) return true;
	  			else return false;
			}
			else{
				query = "INSERT INTO stakeholder_assessment (role, KPICO2, KPIDistance, KPITime, KRISafety, "
						+ "KRICost, KRIFlexibility, KRITime) VALUES ('" + userRole + "', '" + emission
						+ "', '" + length + "', '" + time + "', '" + safety +"', '" + costDeviation+ "', '" + flexibility + "', '" + timeDeviation + "')";
				System.out.println(query);
				
				try{
					int n = stmt.executeUpdate(query);
					
					if(n <= 0) return false;
					return true;
					
				} catch (Exception e){
					e.printStackTrace();
					return false;
				}
			}
			
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}	 finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	//Shuai(26-04-2018) (deprecated) store the KPI/KRI values from stakeholder assessment into database
	public static boolean setValuesFromStakeholderAssessment(String username, double emission, double length, double time, double flexibility, 
			double safety, double costDeviation, double timeDeviation){
		String query = "";
		Connection con = null;
		try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  

			ResultSet rs = stmt.executeQuery("SELECT * FROM generic_configurations WHERE username='" + username + "' AND configurationName='StakeholderAssessment'"); 
			
			if(rs.next()){
				//update if configuration 'StakeholderAssessment' already exists
				query = "UPDATE generic_configurations SET KPICO2='" + emission + "' , KPIDistance='" + length 
						+ "' , KPITime='" + time+ "' , KRISafety='" + safety + "' , KRICost='" + costDeviation + "' , KRIFlexibility='" + flexibility
					 	+ "' , KRITime='" + timeDeviation + "' WHERE id='"+ rs.getInt("id") +"' AND username='" + username + "'";
				System.out.println(query);
				int n = stmt.executeUpdate(query);
	  			if(n > 0) return true;
	  			else return false;
			}
			else{
				query = "INSERT INTO generic_configurations (username, configurationName, costPerHour, costPerKgCO2, KPICO2, KPIDistance, KPITime, KRISafety, "
						+ "KRICost, KRIFlexibility, transfer, current, KRITime) VALUES ('" + username + "', 'StakeholderAssessment', '35','0.15', '" + emission
						+ "', '" + length + "', '" + time + "', '" + safety +"', '" + costDeviation+ "', '" + flexibility + "'," + " '0', '0', '" + timeDeviation + "')";
				System.out.println(query);
				
				try{
					int n = stmt.executeUpdate(query, Statement.RETURN_GENERATED_KEYS);
					
					if(n <= 0) return false;
					
					ResultSet keys = stmt.getGeneratedKeys();
					if(keys.next()){
						return true;
					}
					else return false;
					
				} catch (Exception e){
					e.printStackTrace();
					return false;
				}
			}
			
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}	 finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}
	
	public static ValuesKPIKRI getValuesFromStakeholderAssessment(String userrole) {
		String query = "";
		Connection con = null;
		try {
			Class.forName("com.mysql.jdbc.Driver");  
			con = DriverManager.getConnection( address,userName,password);
			Statement stmt = con.createStatement();  

			ResultSet rs = stmt.executeQuery("SELECT * FROM stakeholder_assessment WHERE role='" + userrole + "'"); 
			
			if(rs.next()){
				return new ValuesKPIKRI(rs.getDouble("KPICO2"), rs.getDouble("KPIDistance"), rs.getDouble("KPITime"), rs.getDouble("KRISafety"), rs.getDouble("KRICost"),
						rs.getDouble("KRIFlexibility"), rs.getDouble("KRITime"));
			}
			return new ValuesKPIKRI(DefaultConfiguration.KPICO2, DefaultConfiguration.KPIDistance, DefaultConfiguration.KPITime, DefaultConfiguration.KRISafety, 
					DefaultConfiguration.KRICost, DefaultConfiguration.KRIFlexibility, DefaultConfiguration.KRITime);
			
		} catch (Exception e) {
			e.printStackTrace();
			return null;
		}	 finally{
			if (con != null) try {con.close();} catch (Exception e) {}
		}
	}

}

