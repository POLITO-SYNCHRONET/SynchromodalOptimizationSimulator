package com.SynchroNET.risk.profiler;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import com.amazonaws.util.json.JSONArray;
import com.amazonaws.util.json.JSONObject;

import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;




public class RiskDataBaseManager {
	/*EDIT - Yuanyuan (08/05/2017): This contains the actions related to the tables for getting or adding data
	 * of the routes, which is for risk calculation*/
	private static final Logger LOG = LoggerFactory.getLogger(RiskDataBaseManager.class);
	private static final String address = "jdbc:mysql://localhost:3306/synchronet?verifyServerCertificate=false&useSSL=true";
	private static final String userName = "root";
	private static final String password = "root";
	
	/*EDIT-Yuanyuan (30/04/2018): as a client here to receive the xml data and store the data into "file" from server*/
	public static void receiveFile(int portNumber, String file) throws IOException {
		Socket socket = new Socket(InetAddress.getLocalHost(), portNumber);
		try{
		    byte[] receivedData = new byte[8192];
		    BufferedInputStream bis = new BufferedInputStream(socket.getInputStream());
		    BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file));
		    int num;
		    while (true) {
			num = bis.read(receivedData);
			if (num==-1)
			   break;
		    	bos.write(receivedData, 0, num);
		    }
		    bos.close();
		    bis.close();
		    } catch (IOException e) {
		    		e.printStackTrace();
		    } finally {
			socket.close();
		    }
	}
	
	/*EDIT-Yuanyuan (19/04/2018): parse xml file*/
	// https://howtodoinjava.com/xml/java-xml-dom-parser-example-tutorial/
	// Use the xml file stored in src/test/resources as a test
	// parameter: flag states it is executed data(flag=0) or booked data(flag=1), filePath is the path of received xml though recieveFile(int, String) function
	public static int[] parseXMLFile(String filePath, int flag) {
		// Get Document Builder
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		DocumentBuilder builder;
		int[] ids = new int[100]; // to store booked ids of links and route
		int idCount = 0;
		try {
			builder = factory.newDocumentBuilder();
			try {
			Document document = builder.parse(new File(filePath));
			//Normalize the XML Structure; It's just too important !!
			document.getDocumentElement().normalize();
			//Here comes the root node
			Element root = document.getDocumentElement();
			
			// Get elements by name
			NodeList vertices = document.getElementsByTagName("verticesLabels");
			String verticesLabels = vertices.item(0).getTextContent();
			
			NodeList from = document.getElementsByTagName("from");
			Node fromNode = from.item(0);
			Element eFrom = (Element) fromNode;
			String fromValue = eFrom.getElementsByTagName("name").item(0).getTextContent();
			
			NodeList to = document.getElementsByTagName("to");
			Node toNode = to.item(0);
			Element eTo = (Element) toNode;
			String toValue = eTo.getElementsByTagName("name").item(0).getTextContent();
			
			NodeList startTimeNode = document.getElementsByTagName("startTime");
			String startTime = startTimeNode.item(0).getTextContent();
			
			NodeList endTimeNode = document.getElementsByTagName("endTime");
			String endTime = endTimeNode.item(0).getTextContent();
			
			NodeList idNode = document.getElementsByTagName("id");
			String id = idNode.item(0).getTextContent();
			
			NodeList legs = document.getElementsByTagName("legs");
			Node legsNode = legs.item(0);
			Element eLegs = (Element) legsNode;
			NodeList legNodes = eLegs.getElementsByTagName("leg");
			List<Integer> legIds = new LinkedList<Integer>();
			
			int SID=0;
			// store into database
			if (flag==1) {
				// booked data
				int RID = addRoutes(fromValue, toValue, legIds);
				long startMilliseconds = Long.parseLong(startTime);
				long endMilliseconds = Long.parseLong(endTime);
				Calendar startCalendar = Calendar.getInstance();
				startCalendar.setTimeInMillis(startMilliseconds);
				Calendar endCalendar = Calendar.getInstance();
				endCalendar.setTimeInMillis(endMilliseconds);
				SID = addRouteSchedule(RID, startCalendar, endCalendar);
				// SID is booked id for route, which is needed to be stored in the new xml file
				ids[idCount++] = SID;
				} 
			for (int temp=0; temp<legNodes.getLength(); temp++) {
				Node node = legNodes.item(temp);
				Element eNode = (Element) node;
				NodeList fromLegNodes = eNode.getElementsByTagName("from");
				Node fromNameNode = fromLegNodes.item(0);
				Element eFromName = (Element) fromNameNode;
				String fromLegValue = eFromName.getElementsByTagName("name").item(0).getTextContent();
				
				NodeList toLegNodes = eNode.getElementsByTagName("to");
				Node toNameNode = toLegNodes.item(0);
				Element eToName = (Element) toNameNode;
				String toLegValue = eToName.getElementsByTagName("name").item(0).getTextContent();
				
				NodeList startTimeLegNode = eNode.getElementsByTagName("startTime");
				String startLegTime = startTimeLegNode.item(0).getTextContent();
				
				NodeList endTimeLegNode = eNode.getElementsByTagName("endTime");
				String endLegTime = endTimeNode.item(0).getTextContent();
				
				NodeList idLegNode = eNode.getElementsByTagName("id");
				String idLegTime = idLegNode.item(0).getTextContent();
				
				NodeList agencyIdLegNode = eNode.getElementsByTagName("agencyId");
				String agencyId = agencyIdLegNode.item(0).getTextContent();
				
				NodeList modeNode = eNode.getElementsByTagName("mode");
				String mode = modeNode.item(0).getTextContent();
				
				// add each leg into database
				long startMillisecondsLeg = Long.parseLong(startLegTime);
				long endMillisecondsLeg = Long.parseLong(endLegTime);
				Calendar startCalendarLeg = Calendar.getInstance();
				startCalendarLeg.setTimeInMillis(startMillisecondsLeg);
				Calendar endCalendarLeg = Calendar.getInstance();
				endCalendarLeg.setTimeInMillis(endMillisecondsLeg);
				if (flag==1) {
					// booked data
					int LID = addLinks(fromLegValue, toLegValue, mode, agencyId);
					legIds.add(LID);
					int PID = addPlannedLegs(LID, SID, startCalendarLeg, endCalendarLeg);
					// PID is booked id for leg/link, which is needed to be stored in the new xml file
					ids[idCount++] = PID;
				} else {
					// executed data
					int LID = addLinks(fromLegValue, toLegValue, mode, agencyId);
					NodeList bookedIds = eNode.getElementsByTagName("bookedID");
					String bookedIdString = bookedIds.item(0).getTextContent();
					int bookedId = Integer.parseInt(bookedIdString);
					addExecutedLegs(LID, bookedId, startCalendarLeg, endCalendarLeg);
				}
				
				LOG.info("Test"+fromLegValue+" "+toLegValue+startLegTime +endLegTime+" "+agencyId+" "+mode );
				
			}
			
			
		} catch (SAXException | IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		} catch (ParserConfigurationException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		return ids;
	}
	
	/*EDIT-Yuanyuan (30/04/2018): modify xml file to add bookedID of legs and routes and store into outFile*/
	public static void modifyXML(String file, int[] id, String outFile) {
		try {
			BufferedReader f = new BufferedReader(new FileReader(file));
			String line;
			StringBuffer inputBuffer = new StringBuffer();
			int i = 0;
			
			while ((line = f.readLine()) != null) {
				if(line.indexOf("<bookedID></bookedID>") != -1) {
					System.out.println("Find");
					String replacement = "<bookedID>"+id[i++]+"</bookedID>";
					line = line.replaceAll("<bookedID></bookedID>", replacement);
					System.out.println(replacement);
					System.out.println(line);
				}
				inputBuffer.append(line);
				inputBuffer.append('\n');
			}
			FileOutputStream fileOut = new FileOutputStream(outFile);
			fileOut.write(inputBuffer.toString().getBytes());
			fileOut.close();
			
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	/*EDIT-Yuanyuan (30/04/2018): as a server here to send to client the xml file*/
	public static void sendFile(int portNumber, String file) {
		ServerSocket serverSocket;
		try {
			serverSocket = new ServerSocket(portNumber);
			Socket socket = serverSocket.accept();
			// System.out.println(socket.getPort());
			BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file));
			BufferedOutputStream bos = new BufferedOutputStream(socket.getOutputStream());
			byte[] byteArray = new byte[8192];
			int num;
			while ((num = bis.read(byteArray)) != -1) {
				bos.write(byteArray, 0, num);
				bos.flush();
			}
			Thread.sleep(2000);
			socket.close();
		} catch (IOException | InterruptedException e1) {
			e1.printStackTrace();
		}
	}
	
	
	/*EDIT -Yuanyuan (11/07/2017): store user experience*/
	public static int addExperience(String departure, String arrival, List<String> type, String dateTime, String incidentPlace, 
			String agency, String transportation, String reason, String summary) {
		
		JSONObject obj = new JSONObject();
		if (transportation.equals("truck"))
			transportation = "bus";
		if (transportation.contains("hip")) // may be slowShip, fastShip, middleShip
			transportation = "ferry";
		
		int s = alreadySavedExperience(departure, arrival, type, dateTime, incidentPlace, agency, transportation);
		if (s > 0) {
			LOG.info("Have saved!");
			return s;
		}
		JSONArray jArray = new JSONArray();
		try {
			obj.put("List", type);
			jArray = obj.getJSONArray("List");
			Class.forName("com.mysql.jdbc.Driver"); 
		} catch (Exception e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		String query = "INSERT INTO user_experience (departure, arrival, type, dateTime, incidentPlace, agency, transportation, reason, summary) "
				+ "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
		
		// using try-with-resources so the the resources are closed automatically when their scope of use ends
		try ( 
			Connection con=DriverManager.getConnection(  
			address,userName,password);  
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, departure);
			stmt.setString(2, arrival);
			stmt.setString(3, jArray.toString()); 
			dateTime = dateTime.replace("T", " ");
			SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd hh:mm");
			Date parsedDate = dateFormat.parse(dateTime);
			Timestamp timestamp = new java.sql.Timestamp(parsedDate.getTime());
			stmt.setTimestamp(4, timestamp);
			stmt.setString(5, incidentPlace);
			stmt.setString(6, agency);
			stmt.setString(7, transportation);
			stmt.setString(8, reason);
			stmt.setString(9, summary);
			stmt.executeUpdate();
			ResultSet rs = stmt.executeQuery("SELECT EID FROM user_experience WHERE JSON_CONTAINS(type, '" + jArray + "')"); 
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
		}
		return 0;
	}
	
	private static int alreadySavedExperience(String departure, String arrival, List<String> type, String dateTime,
			String incidentPlace, String agency, String transportation) {
		
		String query = "SELECT EID FROM user_experience WHERE  departure=? AND arrival=? AND dateTime=? AND incidentPlace=? AND transportation=? AND agency=? AND JSON_CONTAINS(type, ?)";
		JSONArray jArray = new JSONArray();
		try {
			Class.forName("com.mysql.jdbc.Driver");
			JSONObject obj = new JSONObject();
			obj.put("List", type);
			jArray = obj.getJSONArray("List");
		} catch (Exception e1) {
			e1.printStackTrace();
		}
		try (
			Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, departure);
			stmt.setString(2, arrival);
			dateTime = dateTime.replace("T", " ");
			SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm");
			Date parsedDate = dateFormat.parse(dateTime);
			Timestamp timestamp = new java.sql.Timestamp(parsedDate.getTime());
			stmt.setTimestamp(3, timestamp); 
			stmt.setString(4, incidentPlace);
			stmt.setString(5, transportation);
			stmt.setString(6, agency);
			stmt.setString(7, jArray.toString());
			ResultSet rs = stmt.executeQuery(); 
			if (!rs.next())
				return 0;
			return rs.getInt(1);
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		}
	}
	
	public static int countLink(String from, String to, String mode) {
		String query = "SELECT LID FROM link WHERE departure=? AND arrival=? AND transportMode=?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);) {
			stmt.setString(1, from);
			stmt.setString(2, to);
			stmt.setString(3, mode.toUpperCase());
			ResultSet rs = stmt.executeQuery(); 
			if (!rs.next())
				return 0;
			
			int LID = rs.getInt(1);
			String query2 = "SELECT COUNT(*) FROM executed_link WHERE LID = ?";
			PreparedStatement stmt2 = con.prepareStatement(query2);
			stmt2.setInt(1, LID);
			ResultSet rs2 = stmt2.executeQuery();
			if (!rs2.next())
				return 0;
			return rs2.getInt(1);
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		} 
	}
	
	public static int countIncident(String departure, String arrival, String transportation) {
		
		String query = "SELECT COUNT(*) FROM user_experience WHERE  departure=? AND arrival=? AND transportation=?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (
			Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, departure);
			stmt.setString(2, arrival);
			stmt.setString(3, transportation);
			ResultSet rs = stmt.executeQuery(); 
			if (!rs.next())
				return 0;
			return rs.getInt(1);
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		}
	}
	
	/*
	 * check for more details, if agency and month are also same, the chance could be higher, add 1.2, if just one of them are same, add 1, otw add 0.8
	 * */
	public static double countPreciseIncident(String departure, String arrival, String transportation, int m, String agency) {
		
		String query = "SELECT dateTime, agency FROM user_experience WHERE  departure=? AND arrival=? AND transportation=?";
		// LOG.info("Check safety "+departure+" "+arrival+" "+transportation);
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (
			Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, departure);
			stmt.setString(2, arrival);
			stmt.setString(3, transportation);
			ResultSet rs = stmt.executeQuery(); 
			/*if (!rs.next()) {
				LOG.info("No Found incident! for "+departure+" "+arrival);
				return 0;
			}*/
			double totalSize = 0;// rs.getFetchSize();
			// LOG.info("Total size for safety is "+totalSize);
			while (rs.next()) {
				Date date = rs.getDate("dateTime");
				Calendar cal = Calendar.getInstance();
				cal.setTime(date);
				int month = cal.get(Calendar.MONTH);
				String ag = rs.getString(2);
				// LOG.info("Check db "+ag + " input "+agency);
				if (ag.equalsIgnoreCase(agency)) {
					if (month == m) {
						totalSize += 1.2;
						// LOG.info("Found same agency "+agency + " and month "+month);
					}
					else {
						totalSize += 1.0;
						// LOG.info("Found same agency "+agency);
					}
				} else {
					if (month == m) {
						totalSize += 1.0;
						// LOG.info("Found same month "+month);
					}
					totalSize += 0.8;
				}
			}
			/*Array a = rs.getArray(2); //  Columns are numbered from 1
			String[] agencies = (String[])a.getArray(); 
			Array b = rs.getArray(1);
			DateTime[] dateTimes = (DateTime[])b.getArray();
			for (int i=0; i < agencies.length; i++) {
				if (agencies[i].equals(agency)) {
					int month = dateTimes[i].getMonthOfYear(); 
					if (month == m)
						totalSize += 1.2;
					else
						totalSize += 1.0;
				} else
					totalSize = 0.8;
					
			}*/
			return totalSize;
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		}
	}

	/* Add routes, links and planned ones*/
	public static int addRoutes(String from, String to, List<Integer> LIds) {
		
		JSONObject obj = new JSONObject();
		
		int s = alreadySavedRoute(from, to, LIds);
		if (s > 0) {
			return s;
		}
		JSONArray jArray = new JSONArray();
		try {
			obj.put("List", LIds);
			jArray = obj.getJSONArray("List");
			Class.forName("com.mysql.jdbc.Driver"); 
		} catch (Exception e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		String query = "INSERT INTO route (departure, arrival, links) VALUES (?, ?, ?)";
		
		// using try-with-resources so the the resources are closed automatically when their scope of use ends
		try ( 
			Connection con=DriverManager.getConnection(  
			address,userName,password);  
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, from);
			stmt.setString(2, to);
			stmt.setString(3, jArray.toString()); // ?
			stmt.executeUpdate();
			ResultSet rs = stmt.executeQuery("SELECT RID FROM route WHERE JSON_CONTAINS(links, '" + jArray + "')"); 
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
		}
		return 0;
	}


	public static int addLinks(String from, String to, String mode, String agency) {
		String query = "INSERT INTO link(departure, arrival, transportMode, agency) VALUES(?, ?, ?, ?)";
		String query2 = "SELECT LID FROM link WHERE departure=? AND arrival=? AND transportMode=? AND agency=?";
		LOG.info("Insert " + from + to + mode + agency);
		int s = alreadySavedLink(from, to, mode, agency);
		if (s > 0) {
			return s;
		}
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (
			Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);
			PreparedStatement stmt2 = con.prepareStatement(query2);	) {
			
			stmt.setString(1, from);
			stmt.setString(2, to);
			stmt.setString(3, mode);
			stmt.setString(4, agency);
			stmt.executeUpdate();
			//stmt.executeUpdate(query);
			
			stmt2.setString(1, from);
			stmt2.setString(2, to);
			stmt2.setString(3, mode);
			stmt2.setString(4, agency);
			ResultSet rs = stmt2.executeQuery(); 
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			LOG.info("Debug....");
			e.printStackTrace();
			return 0;
		}
	}

	public static List<Integer> getTimeDeviation(String mode) {
		
		List<Integer> timeDevs = new ArrayList<Integer>();
		String query= "select timeDeviation from history_time_deviation where PID in(select PID from planned_link where LID in (select LID from link where transportMode=? ))";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (
				Connection con = DriverManager.getConnection(address, userName, password);
				PreparedStatement stmt = con.prepareStatement(query);	) {
				
				stmt.setString(1, mode);
				ResultSet rs = stmt.executeQuery();
				while (rs.next())
					timeDevs.add(rs.getInt(1));
				 return timeDevs;
			} catch (Exception e) {
				LOG.info("Debug....");
				e.printStackTrace();
				return timeDevs;
			}
	}
	
	private static int alreadySavedRoute(String from, String to, List<Integer> LIds) {
		String query = "SELECT RID FROM route WHERE JSON_CONTAINS(links, ?)";
		JSONArray jArray = new JSONArray();
		try {
			Class.forName("com.mysql.jdbc.Driver");
			JSONObject obj = new JSONObject();
			obj.put("List", LIds);
			jArray = obj.getJSONArray("List");
		} catch (Exception e1) {
			e1.printStackTrace();
		}
		try (
			Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, jArray.toString()); // ?
			ResultSet rs = stmt.executeQuery(); 
			if (!rs.next())
				return 0;
			return rs.getInt(1);
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		} 
	}
	
	private static int alreadySavedLink(String from, String to, String mode, String agency) {
		String query = "SELECT LID FROM link WHERE departure=? AND arrival=? AND transportMode=? AND agency=?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, from);
			stmt.setString(2, to);
			stmt.setString(3, mode);
			stmt.setString(4, agency);
			ResultSet rs = stmt.executeQuery(); 
			if (!rs.next())
				return 0;
			return rs.getInt(1);
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		} 
	}

	private static int alreadySavedSchedule(int rID, Calendar startTime, Calendar endTime) {
		
		String sql = "SELECT SID FROM route_schedule WHERE RID= ? AND startTime=? AND arrivalTime=?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);) { 
			
			Timestamp t1 = new Timestamp(startTime.getTimeInMillis());
			Timestamp t2 = new Timestamp(endTime.getTimeInMillis());
			stmt.setInt(1, rID);
			stmt.setTimestamp(2, t1);
			stmt.setTimestamp(3, t2);
			ResultSet rs = stmt.executeQuery();
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		} 
	}

	private static int alreadySavedExecuted(int i, int PID, Calendar startTime, Calendar endTime) {
	    
		String sql = "SELECT PID FROM executed_link WHERE LID= ? AND PID=? AND startTime=? AND arrivalTime=?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);){
			
			Timestamp t1 = new Timestamp(startTime.getTimeInMillis());
			Timestamp t2 = new Timestamp(endTime.getTimeInMillis());
			stmt.setInt(1, i);
			stmt.setInt(2, PID);
			stmt.setTimestamp(3, t1);
			stmt.setTimestamp(4, t2);
			ResultSet rs = stmt.executeQuery();
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		} 
	}
	
	private static int alreadySavedPlan(int i, int sID, Calendar startTime, Calendar endTime) {
    
		String sql = "SELECT PID FROM planned_link WHERE LID= ? AND SID=? AND startTime=? AND arrivalTime=?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);){
			
			Timestamp t1 = new Timestamp(startTime.getTimeInMillis());
			Timestamp t2 = new Timestamp(endTime.getTimeInMillis());
			stmt.setInt(1, i);
			stmt.setInt(2, sID);
			stmt.setTimestamp(3, t1);
			stmt.setTimestamp(4, t2);
			ResultSet rs = stmt.executeQuery();
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		} 
	}
	
	private static int alreadySavedTimeDev(Integer i, int timeDev, String string) {
		
		String sql = "SELECT * FROM history_time_deviation WHERE PID=?";
		String sql2 = "UPDATE history_time_deviations SET timeDeviation = ?, reason = ?"
				+ "WHERE PID = ?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);
			PreparedStatement stmt2 = con.prepareStatement(sql2);){ 
			
			stmt.setInt(1, i);
			ResultSet rs = stmt.executeQuery();
			if (rs.next()) {
				// update
				stmt2.setInt(1, timeDev);
				stmt2.setString(2, string);
				stmt2.setInt(3, i);
				stmt2.executeUpdate();
				return 1;
			} return -1;
		} catch (Exception e) {
			e.printStackTrace();
			return 0;
		} 
	}

	
	public static int addRouteSchedule(int rID, Calendar startTime, Calendar endTime) {
		
		int s = alreadySavedSchedule(rID, startTime, endTime);
		if (s > 0) {
			return s;
		}
		
		String sql = "INSERT INTO route_schedule(RID, startTime, arrivalTime) VALUES(?, ?, ?)";
		String sql2 = "SELECT SID FROM route_schedule WHERE RID= ? AND startTime=? AND arrivalTime=?";
		
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);
			PreparedStatement stmt2 = con.prepareStatement(sql2);) {
			
			Timestamp t1 = new Timestamp(startTime.getTimeInMillis());
			Timestamp t2 = new Timestamp(endTime.getTimeInMillis());
			stmt.setInt(1, rID);
			stmt.setTimestamp(2, t1);
			stmt.setTimestamp(3, t2);
			stmt.executeUpdate();
		
			stmt2.setInt(1, rID);
			stmt2.setTimestamp(2, t1);
			stmt2.setTimestamp(3, t2);
			ResultSet rs = stmt2.executeQuery(); 
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
		}
		return 0;
	}

	public static int addPlannedLegs(int i, int sID, Calendar startTime, Calendar endTime) {
		
		int s = alreadySavedPlan(i, sID, startTime, endTime);
		if (s > 0) {
			return s;
		}
		
		String sql = "INSERT INTO planned_link(LID, sID, startTime, arrivalTime) VALUES(?, ?, ?, ?)";
		String sql2 = "SELECT PID FROM planned_link WHERE LID= ? AND SID=? AND startTime=? AND arrivalTime=?";
		
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);
			PreparedStatement stmt2 = con.prepareStatement(sql2);) {
			
			Timestamp t1 = new Timestamp(startTime.getTimeInMillis());
			Timestamp t2 = new Timestamp(endTime.getTimeInMillis());
			stmt.setInt(1, i);
			stmt.setInt(2, sID);
			stmt.setTimestamp(3, t1);
			stmt.setTimestamp(4, t2);
			stmt.executeUpdate();
			
			stmt2.setInt(1, i);
			stmt2.setInt(2, sID);
			stmt2.setTimestamp(3, t1);
			stmt2.setTimestamp(4, t2);
			ResultSet rs = stmt2.executeQuery(); 
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
		}
		return 0;
	}

	public static int addExecutedLegs(int i, int PID, Calendar startTime, Calendar endTime) {
		
		int s = alreadySavedExecuted(i, PID, startTime, endTime);
		if (s > 0) {
			return s;
		}
		
		String sql = "INSERT INTO executed_link(LID, PID, startTime, arrivalTime) VALUES(?, ?, ?, ?)";
		String sql2 = "SELECT PID FROM executed_link WHERE LID= ? AND PID=? AND startTime=? AND arrivalTime=?";
		
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);
			PreparedStatement stmt2 = con.prepareStatement(sql2);) {
			
			Timestamp t1 = new Timestamp(startTime.getTimeInMillis());
			Timestamp t2 = new Timestamp(endTime.getTimeInMillis());
			stmt.setInt(1, i);
			stmt.setInt(2, PID);
			stmt.setTimestamp(3, t1);
			stmt.setTimestamp(4, t2);
			stmt.executeUpdate();
			
			stmt2.setInt(1, i);
			stmt2.setInt(2, PID);
			stmt2.setTimestamp(3, t1);
			stmt2.setTimestamp(4, t2);
			ResultSet rs = stmt2.executeQuery(); 
			if (rs.next())
			 return rs.getInt(1);
			return 0;
		} catch (Exception e) {
			e.printStackTrace();
		}
		return 0;
	}

	public static void addTimeDev(Integer i, int timeDev, String string) {
		
		int s = alreadySavedTimeDev(i, timeDev, string);
		if (s < 0) {
		
		
		String sql = "INSERT INTO history_time_deviation(PID, timeDeviation, reason) VALUES(?, ?, ?)";
			
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);) {
			
			stmt.setInt(1, i);
			stmt.setInt(2, timeDev);
			stmt.setString(3, string);
			stmt.executeUpdate();
		} catch (Exception e) {
			e.printStackTrace();
		}
		}
	}
	
	public  void addFeature(String feature, String departure, String arrival, String mode) {
		
		String sql = "UPDATE link SET feature = ? WHERE departure = ? and arrival=? and transportMode=?";
			
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		
		try (Connection con = DriverManager.getConnection( address,userName,password);
			// use preparedStatement to avoid sql injection
			PreparedStatement stmt = con.prepareStatement(sql);) {
			
			stmt.setString(1, feature);
			stmt.setString(2, departure);
			stmt.setString(3, arrival);
			stmt.setString(4, mode);
			stmt.executeUpdate();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public String searchFeatureFromDB(String departure, String arrival, String mode) {
		String query = "SELECT feature FROM link WHERE departure=? AND arrival=? AND transportMode=?";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (Connection con = DriverManager.getConnection(address, userName, password);
			PreparedStatement stmt = con.prepareStatement(query);) {
			
			stmt.setString(1, departure);
			stmt.setString(2, arrival);
			stmt.setString(3, mode);
			ResultSet rs = stmt.executeQuery(); 
			if (!rs.next())
				return null;
			return rs.getString(1);
		} catch (Exception e) {
			e.printStackTrace();
			return null;
		} 
	}
	
	public Instances getTimeDeviation2(String departure, String arrival, String mode) {
		
		List<Integer> startHour = new ArrayList<Integer>();
		List<Integer> endHour = new ArrayList<Integer>();
		List<String> season = new ArrayList<String>();
		List<String> label = new ArrayList<String>();
		String query= "select startHour, endHour, season, class from time_deviation_detail where LID in(select LID from link where departure=? and arrival=? and transportMode=? )";
		try {
			Class.forName("com.mysql.jdbc.Driver");
		} catch (ClassNotFoundException e1) {
			e1.printStackTrace();
		}
		try (
				Connection con = DriverManager.getConnection(address, userName, password);
				PreparedStatement stmt = con.prepareStatement(query);	) {
				
				stmt.setString(1, departure);
				stmt.setString(2, arrival);
				stmt.setString(3, mode);
				ResultSet rs = stmt.executeQuery();
				// EDIT Yuanyuan(09/05/2017) Modify it to check there are enough historical data
				// to analysis or not
				int count = 0;
				while (rs.next()) {
					startHour.add(rs.getInt(1));
					endHour.add(rs.getInt(2));
					season.add(rs.getString(3));
					label.add(rs.getString(4));
					count++;
				}
				// 10 can be modified later
				if (count < 10)
					return null;
				ArrayList<Attribute> atts = new ArrayList<Attribute>();
				ArrayList<String> attVals = new ArrayList<String>();
				ArrayList<String> attVals2 = new ArrayList<String>();
				attVals.add("Spring");
				attVals.add("Summer");
				attVals.add("Fall");
				attVals.add("Winter");
				atts.add(new Attribute("season", attVals));
				atts.add(new Attribute("startHour"));
				atts.add(new Attribute("endHour"));
				
				attVals2.add("Insignificant");
				attVals2.add("Minor");
				attVals2.add("Moderate");
				attVals2.add("Major");
				atts.add(new Attribute("class", attVals2));
				Instances test = new Instances("ins", atts, 0);
				for (int i=0; i<startHour.size(); i++) {
					double vas[] = new double[atts.size()];
					vas[0] = startHour.get(i);
					vas[1] = endHour.get(i);
					// nominal
					String temp = season.get(i);
					vas[2] = attVals.indexOf(temp);
					temp = label.get(i);
				    vas[3] = attVals2.indexOf(temp);
				  //  LOG.info("CHeck temp "+vas[2]+" "+vas[3]+" "+season.get(i));
				    // Create empty instance with three attribute values 
					test.add(new DenseInstance(1.0, vas));
				}
				 return test;
			} catch (Exception e) {
				LOG.info("Debug....");
				e.printStackTrace();
				return null;
			}
	}

	//EDIT-Yuanyuan 31-08-2017: get the data(time deviation array) selected by the most discriminative feature
	public List<Integer> getData(String feature, String departure, String arrival, String mode, Calendar startTime, Calendar endTime ) {
		// LOG.info("Start time is "+startTime.getTime());
		List<Integer> timeDevs = new ArrayList<Integer>();
		
		//  ************ CASE 1: The most discriminative feature is season  ************
		if (feature.equals("season")) {
			String[] seasons = {
					"Winter", "Winter", 
					"Spring", "Spring", "Spring",
					"Summer", "Summer", "Summer",
					"Fall", "Fall", "Fall",
					"Winter"
			};
			String selectedSeason = seasons[ startTime.get(Calendar.MONTH) ];
			String sql = "SELECT time_deviation FROM time_deviation_detail WHERE season= ? and LID in (select LID from link where departure=? and arrival=? and transportMode=? )";
			try {
				Class.forName("com.mysql.jdbc.Driver");
			} catch (ClassNotFoundException e1) {
				e1.printStackTrace();
			}
			
			try (Connection con = DriverManager.getConnection( address,userName,password);
				// use preparedStatement to avoid sql injection
				PreparedStatement stmt = con.prepareStatement(sql);) { 
				stmt.setString(1, selectedSeason);
				stmt.setString(2, departure);
				stmt.setString(3, arrival);
				stmt.setString(4, mode);
				ResultSet rs = stmt.executeQuery();
				while (rs.next())
					timeDevs.add(rs.getInt(1));
				LOG.info("The feature is "+ feature +" The time array is "+timeDevs);
				return timeDevs;
			} catch (Exception e) {
				e.printStackTrace();
				return null;
			} 
		}
		// ************ CASE 1 finished ************
		else {
			//  ************ CASE 2: The most discriminative feature is startHour  ************
			if (feature.equals("startHour")) {
				int hour = startTime.get(Calendar.HOUR_OF_DAY);
				String sql = "";
				int flag0=0;
				if (hour>=7 && hour<10 )
					sql = "SELECT time_deviation FROM time_deviation_detail WHERE startHour>=7 and startHour<10 and LID in (select LID from link where departure=? and arrival=? and transportMode=? )";
				else {
					if (hour<17 && hour>=10)
						sql = "SELECT time_deviation FROM time_deviation_detail WHERE startHour>=10 and startHour<17 and LID in (select LID from link where departure=? and arrival=? and transportMode=? )";
					else {
						if (hour<20 && hour>=17)
							sql = "SELECT time_deviation FROM time_deviation_detail WHERE startHour>=17 and startHour<20 and LID in (select LID from link where departure=? and arrival=? and transportMode=? )";
						else {
							LOG.info("start hour is "+hour);
							flag0=1;
							sql = "SELECT time_deviation FROM time_deviation_detail WHERE (LID in (select LID from link where departure=? and arrival=? and transportMode=? ) and startHour>=20) or (startHour<7 and LID in (select LID from link where departure=? and arrival=? and transportMode=? ))";
						}
					}
				}
				
				try {
					Class.forName("com.mysql.jdbc.Driver");
				} catch (ClassNotFoundException e1) {
					e1.printStackTrace();
				}
				
				try (Connection con = DriverManager.getConnection( address,userName,password);
					// use preparedStatement to avoid sql injection
					PreparedStatement stmt = con.prepareStatement(sql);) { 
					stmt.setString(1, departure);
					stmt.setString(2, arrival);
					stmt.setString(3, mode);
					if (flag0==1) {
						stmt.setString(4, departure);
						stmt.setString(5, arrival);
						stmt.setString(6, mode);
						}
					ResultSet rs = stmt.executeQuery();
					while (rs.next())
						timeDevs.add(rs.getInt(1));
					LOG.info("From "+departure+" to "+arrival+" by "+mode +" the feature is "+ feature +" "+hour+" The time array is "+timeDevs);
					return timeDevs;
				} catch (Exception e) {
					e.printStackTrace();
					return null;
				} 
			}
			// ************ CASE 2 finished ************
			else 
				//************  CASE 3: The most discriminative feature is endHour ************
				{
				int hour = endTime.get(Calendar.HOUR);
				String sql = "";
				int flag = 0;
				if (hour>=7 && hour<10 )
					sql = "SELECT time_deviation FROM time_deviation_detail WHERE endHour>=7 and endHour<10 and LID in (select LID from link where departure=? and arrival=? and transportMode=? )";
				else {
					if (hour<17 && hour>=10)
						sql = "SELECT time_deviation FROM time_deviation_detail WHERE endHour>=10 and endHour<17 and LID in (select LID from link where departure=? and arrival=? and transportMode=? )";
					else {
						if (hour<20 && hour>=17)
							sql = "SELECT time_deviation FROM time_deviation_detail WHERE endHour>=17 and endHour<20 and LID in (select LID from link where departure=? and arrival=? and transportMode=? )";
						else {
							flag = 1;
							sql = "SELECT time_deviation FROM time_deviation_detail WHERE (LID in (select LID from link where departure=? and arrival=? and transportMode=? ) or endHour>=20) or (endHour<7 and LID in (select LID from link where departure=? and arrival=? and transportMode=? ))";
						}
					}
				}
				
				try {
					Class.forName("com.mysql.jdbc.Driver");
				} catch (ClassNotFoundException e1) {
					e1.printStackTrace();
				}
				
				try (Connection con = DriverManager.getConnection( address,userName,password);
					// use preparedStatement to avoid sql injection
					PreparedStatement stmt = con.prepareStatement(sql);) { 
					stmt.setString(1, departure);
					stmt.setString(2, arrival);
					stmt.setString(3, mode);
					if (flag==1) {
						stmt.setString(4, departure);
						stmt.setString(5, arrival);
						stmt.setString(6, mode);
						}
					ResultSet rs = stmt.executeQuery();
					while (rs.next())
						timeDevs.add(rs.getInt(1));
					LOG.info("The feature is "+ feature +" The time array is "+timeDevs);
					return timeDevs;
				} catch (Exception e) {
					e.printStackTrace();
					return null;
				}
			} // ********** CASE 3 finished ************
		}
		
		
	}
	
}
