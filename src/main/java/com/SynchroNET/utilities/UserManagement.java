package com.SynchroNET.utilities;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.SystemUtils;
import org.onebusaway.gtfs.model.Stop;
import org.opentripplanner.standalone.OTPServer;

public class UserManagement {

	public static boolean GTFSFolderCreation(OTPServer otpserver, String routerId){
		//make a copy of all the files from default folder to the folder of a new user.
		String newDir = "";
		System.out.println(otpserver.params.basePath);
		System.out.println(routerId);
		
		Boolean newDirCreated = new File(otpserver.params.basePath + "/graphs/" + routerId).mkdirs();
		if(newDirCreated){
			File from = new File(otpserver.params.basePath + "/default");
			File to = new File(otpserver.params.basePath + "/graphs/" + routerId);
			try {
				FileUtils.copyDirectory(from, to);
				return ApplyGTFSFeedIdForRouter(to, routerId);
			} catch (IOException e) {
				e.printStackTrace();
				return false;
			}
		}
		return false;
	}

	//modify the feed/agency id 
	private static boolean ApplyGTFSFeedIdForRouter(File to, String routerId) {		
		File inputFile;
    	File tempFile;
		// in windows, the line feed is \r\n
		String lineFeed="\n";
		if(SystemUtils.IS_OS_WINDOWS)
			lineFeed = "\r\n";
		System.out.println(to.getAbsolutePath());
		
    	try {	    
    		//feed_info.txt
			inputFile = new File(to.getAbsolutePath()  + "/feed_info.txt");
	    	tempFile = new File(to.getAbsolutePath()  + "/myTempFile.txt");
	    	BufferedReader reader = new BufferedReader(new FileReader(inputFile));
	    	BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));

			String currentLine;
			while((currentLine = reader.readLine()) != null) {
				System.out.println(currentLine.replace("default", routerId));
				writer.write(currentLine.replace("default", routerId));
				writer.write(lineFeed);
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			System.out.println("Feedinfo Done");
			
			//agency.txt
			inputFile = new File(to.getAbsolutePath()  + "/agency.txt");
	    	tempFile = new File(to.getAbsolutePath()  + "/myTempFile.txt");
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));

			while((currentLine = reader.readLine()) != null) {
				System.out.println(currentLine.replace("default", routerId));
				writer.write(currentLine.replace("default", routerId));
				writer.write(lineFeed);
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			System.out.println("Agency Done");
			
			//routes.txt
			inputFile = new File(to.getAbsolutePath()  + "/routes.txt");
	    	tempFile = new File(to.getAbsolutePath()  + "/myTempFile.txt");
	    	reader = new BufferedReader(new FileReader(inputFile));
	    	writer = new BufferedWriter(new FileWriter(tempFile));

			while((currentLine = reader.readLine()) != null) {
				System.out.println(currentLine.replace("default", routerId));
				writer.write(currentLine.replace("default", routerId));
				writer.write(lineFeed);
			}
			reader.close();
			writer.close();
			inputFile.delete();
			tempFile.renameTo(inputFile);
			System.out.println("Routes Done");
			
			GraphRebuilder.packZipFile(to.getAbsolutePath());
			
			return true;
		} catch (IOException e) {
			e.printStackTrace();
			return false;
		}		
	}
}
