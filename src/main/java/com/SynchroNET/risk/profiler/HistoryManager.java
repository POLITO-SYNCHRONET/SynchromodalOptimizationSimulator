package com.SynchroNET.risk.profiler;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import com.amazonaws.util.json.JSONArray;
import com.amazonaws.util.json.JSONException;
import com.amazonaws.util.json.JSONObject;


public class HistoryManager {
	/*EDIT - Yuanyuan (26/04/2017): This contains the actions related to the historical database  
	 * which records each legs with associated time deviation vector*/
	
	private static final String address = "jdbc:mysql://localhost:3306/synchronet?verifyServerCertificate=false&useSSL=true";
	private static final String userName = "root";
	private static final String password = "root";
	
	/*EDIT - Yuanyuan (26/04/2017): Add executed leg to database*/
	public static boolean addExecutedLeg(String from, String to, int timeDev, String traverseMode, String dateTime) {
		String query = "";
		try{
			query = "INSERT INTO history_legs (departure, arrival, timeDev, traverseMode, calendar) VALUES ( '"
					+ from + "', '" + to + "', '" + timeDev + "', '" + traverseMode + "', '" + dateTime + "')";
			Class.forName("com.mysql.jdbc.Driver");
			Connection con = DriverManager.getConnection(address, userName, password);
			Statement stmt = con.createStatement();
			int n = stmt.executeUpdate(query);
			
			if (n > 0) return true;
			else return false;
		} catch (Exception e) {
			System.out.println("Debug....");
			e.printStackTrace();
			return false;
		}
	}

	/*EDIT - Yuanyuan (27/04/2017): to get time deviation for a specified leg at one time*/
	// To do : modify 
	public static int getTimeDev(String from, String to, String traverseMode, String dateTime) {
			try {
				Class.forName("com.mysql.jdbc.Driver");
				Connection con = DriverManager.getConnection(address, userName,password);
				Statement stmt = con.createStatement();
				ResultSet rs = stmt.executeQuery("SELECT timeDev FROM history_legs WHERE departure='" + from + "' AND arrival='" + to +"' AND traverseMode='" + traverseMode +
						 "' AND calendar = '" + dateTime + "'");
				
				int dev = 0;
				while (rs.next())
					dev = rs.getInt(1);
				
				con.close();
				System.out.println("Check timeDev:" + dev);
				return dev;
			} catch (Exception e) {
				e.printStackTrace();
				return 0;
			}
	}
	
	/*EDIT - Yuanyuan (27/04/2017): to get time deviation arrays for a specified leg within a time range*/
	// To do : modify 
	public static List<Integer> getTimeDevArray(String from, String to, String traverseMode, String startDateTime, String endDateTime) {
		List<Integer> timeDevs = new ArrayList<Integer>();	
		try {
				Class.forName("com.mysql.jdbc.Driver");
				Connection con = DriverManager.getConnection(address, userName,password);
				Statement stmt = con.createStatement();
				ResultSet rs = stmt.executeQuery("SELECT timeDev FROM history_legs WHERE departure='" + from + "' AND arrival='" + to +"' "
						+ "AND traverseMode='" + traverseMode + "' AND calendar>= '" + startDateTime + "' AND calendar<= '" + endDateTime + "'");
				
				while (rs.next()) {
					timeDevs.add(rs.getInt(1));
				}
				
				con.close();
				System.out.println("Check timeDev:" + timeDevs.size());
				for (int i : timeDevs) {
					System.out.print(" " + i);
				}
				return timeDevs;
			} catch (Exception e) {
				e.printStackTrace();
				return timeDevs;
			}
	}

}
