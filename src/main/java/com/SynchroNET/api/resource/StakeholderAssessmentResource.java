package com.SynchroNET.api.resource;

import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.opentripplanner.standalone.OTPServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.database.DatabaseManager;
import com.SynchroNET.utilities.GraphRebuilder;
import com.SynchroNET.utilities.UserManagement;

@Path("stakeholderAssessment")
public class StakeholderAssessmentResource {
	
	private static final Logger LOG = LoggerFactory.getLogger(StakeholderAssessmentResource.class);
	
    @Context OTPServer otpserver;
	
	@QueryParam("username")
	public String username;
	
	@QueryParam("userrole")
	public String userrole;
	
	@QueryParam("emission")
	public double emission;
	
	@QueryParam("length")
	public double length;
	
	@QueryParam("time")
	public double time;
	
	@QueryParam("flexibility")
	public double flexibility;
	
	@QueryParam("safety")
	public double safety;
	
	@QueryParam("costDeviation")
	public double costDeviation;
	
	@QueryParam("timeDeviation")
	public double timeDeviation;
	
	//Shuai(07-09-2018) modification on stakeholder assessment API: no longer userId but user role
	@GET
    @Path("/settingByRole")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public String setStakeholderAssessmentByRole(){
    	System.out.println("stakeholder assessment by role: " + userrole);
    	if(emission + time + length == 1 && flexibility + safety + costDeviation + timeDeviation == 1)
    		if(DatabaseManager.setValuesFromStakeholderAssessmentByRole(userrole, emission, length, time, flexibility, safety, costDeviation, timeDeviation))
    			return "Updated";
    		else
    			return "Error";
    	else if(emission + time + length != 1)
    		return "The sum of KPI should be 1";
    	else
    		return "The sum of KRI should be 1";
	}

	//Shuai(26-04-2018) (deprecated) API for receiving the KPI/KRI from stakeholder assessment
    @GET
    @Path("/setting")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public boolean setStakeholderAssessment(){
    	System.out.println("stakeholder assessment");
    	System.out.println(username);
    	int ret = DatabaseManager.userCheckAndInitialization(username, userrole);
    	if(ret == 0){
    		//TODO create the GTFS folder and graph for the new user
    		if(UserManagement.GTFSFolderCreation(otpserver, username)){
    			GraphRebuilder.graphForNewUser(otpserver, username);
    		}
    	}
    	return DatabaseManager.setValuesFromStakeholderAssessment(username, emission, length, time, flexibility, safety, costDeviation, timeDeviation);
	}
    
    //Shuai(07-05-2018) API for fetching the KPI/KRI stored corresponding to the stakeholder assessment
    @GET
    @Path("/get")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response getStakeholderAssessment(){
    	System.out.println("stakeholder assessment / get: " + userrole);
    	ValuesKPIKRI v = DatabaseManager.getValuesFromStakeholderAssessment(userrole);
    	return Response.status(Status.OK).entity(v).build();
	}
}
