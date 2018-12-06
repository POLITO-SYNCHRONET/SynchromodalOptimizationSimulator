package com.SynchroNET.utilities;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import javax.ws.rs.PathParam;
import javax.ws.rs.core.Response;

import org.opentripplanner.graph_builder.GraphBuilder;
import org.opentripplanner.routing.graph.Graph;
import org.opentripplanner.routing.impl.DefaultStreetVertexIndexFactory;
import org.opentripplanner.routing.impl.MemoryGraphSource;
import org.opentripplanner.routing.services.GraphService;
import org.opentripplanner.standalone.CommandLineParameters;
import org.opentripplanner.standalone.OTPServer;


//Shuai(26-06-2018) the class for rebuilding the graph.obj
public class GraphRebuilder {
	
	//method for building a graph for the new user dynamically
	public static boolean graphForNewUser(OTPServer otpServer, String routerId){
		build(otpServer.params, new File(otpServer.params.basePath + "/graphs/" + routerId));
		GraphService graphService = otpServer.getGraphService();
		boolean success = graphService.registerGraph(routerId, graphService.getGraphSourceFactory().createGraphSource(routerId));
        return success;
	}

	public static void rebuild(OTPServer otpServer, String routerId) {
		CommandLineParameters params = otpServer.params;
		File buildpath;
		if(otpServer.params.build != null){
			buildpath = otpServer.params.build;
		}
		else{
			buildpath = new File(otpServer.params.basePath + "/graphs/" + routerId);
		}
		System.out.println(buildpath);
		
		packZipFile(buildpath.toString());
		build(params, buildpath);
	}
	
	public static void build(CommandLineParameters params, File buildpath){
		Boolean inMemory = params.inMemory;
		//force not in-memory in order to generate graph.obj on disk
		params.inMemory = false;
        GraphBuilder graphBuilder = GraphBuilder.forDirectory(params, buildpath); 
        if (graphBuilder != null) {
            graphBuilder.run();
        } else {
            System.out.println("An error occurred while building the graph. Exiting.");
            System.exit(-1);
        }
        params.inMemory = inMemory;
	}
	
	public static void packZipFile(String buildpath) {
		String path = buildpath;		
		try {    
        	// zip files
        	ZipInputStream in = new ZipInputStream(new FileInputStream(path + "/privateGtfs.zip"));

			ArrayList<String> filesName = new ArrayList<>();
			
		    ZipEntry e; 
		    while( (e = in.getNextEntry()) != null){
		    	filesName.add(path + "/" + e.getName());
		    }

		    in.close();
		    
		    File gtfsZip = new File(path + "/privateGtfs.zip");
			FileOutputStream fos = new FileOutputStream(gtfsZip);
			ZipOutputStream zos = new ZipOutputStream(fos);
		    for(String s : filesName){
				addToZipFile(s, zos);
		    }

			zos.close();
			fos.close();

        	File gtfs = new File("privateGtfs.zip");
			gtfs.renameTo(new File( path + "/privateGtfs.zip") );
            
        } catch (Throwable t) {
            t.printStackTrace();
        }
	}
	
	public static void addToZipFile(String fileName, ZipOutputStream zos) throws FileNotFoundException, IOException {

		System.out.println("Writing '" + fileName + "' to zip file");
		
		File file = new File(fileName);
		FileInputStream fis = new FileInputStream(file);
		ZipEntry zipEntry = new ZipEntry(file.getName());
		zos.putNextEntry(zipEntry);

		byte[] bytes = new byte[1024];
		int length;
		while ((length = fis.read(bytes)) >= 0) {
			zos.write(bytes, 0, length);
		}

		zos.closeEntry();
		fis.close();
	}
}
