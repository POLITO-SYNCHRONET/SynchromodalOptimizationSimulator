package com.SynchroNET.api.resource;

import java.util.LinkedList;
import java.util.List;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.risk.profiler.RiskDataBaseManager;

@Path("routers/{routerId}/userExperience")
public class UserExperienceResource {

	private static final Logger LOG = LoggerFactory.getLogger(UserExperienceResource.class);
	
	@POST
	@Path("/save")
	@Consumes(MediaType.APPLICATION_JSON)
	@Produces(MediaType.APPLICATION_JSON)
	public int saveExperience(UserExperience userExperience) {
		int returnVal = 0;
		System.out.println(userExperience.getSLocation() + "," + userExperience.getELocation() + 
				"," + userExperience.getDateTime() + "," + userExperience.getIncidentPlace() + "," + 
				userExperience.getReason() + "," + userExperience.getSummary());
		String[] temp = userExperience.getType();
		List<String> type = new LinkedList<String>();
		for (int i=0; i<temp.length; i++) {
			System.out.println(temp[i]);
			type.add(temp[i]);
		}
		RiskDataBaseManager.addExperience(userExperience.getSLocation(), userExperience.getELocation(), type, userExperience.getDateTime(), 
				userExperience.getIncidentPlace(), userExperience.getServiceProvider(), userExperience.getTransportation(),
				userExperience.getReason(), userExperience.getSummary());
		return returnVal;
	}
}
