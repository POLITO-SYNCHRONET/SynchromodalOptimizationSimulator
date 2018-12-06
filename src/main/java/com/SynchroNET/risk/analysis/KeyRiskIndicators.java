package com.SynchroNET.risk.analysis;


import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import org.opentripplanner.api.model.Itinerary;

//@XmlElement(name = "KeyRiskIndicators")
@XmlAccessorType(XmlAccessType.FIELD)
public class KeyRiskIndicators {
	@XmlElement(name="duration") 
	public long duration = 0;
	@XmlElement(name="timeDeviation") 
	public double timeDeviation = 0;
	// percent of the whole trip
	@XmlElement(name="timeRating") 
	public double timeRating = 0.0;
	@XmlElement(name="minTime") 
	public double minTime = 0;
	@XmlElement(name="maxTime") 
	public double maxTime = 0;
	@XmlElement(name="timeStd") 
	public double timeStd = 0; // add standard deviation
	@XmlElement(name="timeError") 
	public double timeError = 0;
	@XmlElement(name="safety") 
	public double safety = 0.0;
	@XmlElement(name="flexibility") 
	public double flexibility = 0;
	@XmlElement(name="minFlexibility") 
	public double minFlexibility = 0;
	@XmlElement(name="maxFlexibility") 
	public double maxFlexibility = 0;
	@XmlElement(name="flexibilityStd") 
	public double flexibilityStd = 0;
	@XmlElement(name="flexibilityError") 
	public double flexibilityError = 0;
	@XmlElement(name="costDeviation") 
	public double costDeviation = 0.0;
	@XmlElement(name="costRating") 
	public double costRating = 0.0;
	@XmlElement(name="minCost") 
	public double minCost = 0;
	@XmlElement(name="maxCost") 
	public double maxCost = 0;
	@XmlElement(name="totalCost") 
	public double totalCost = 0;
	@XmlElement(name="costStd") 
	public double costStd = 0;
	@XmlElement(name="costError") 
	public double costError = 0;
	
	public double getTimeError() {
		return timeError;
	}

	public void setTimeError(double timeError) {
		this.timeError = timeError;
	}

	public double getFlexibilityError() {
		return flexibilityError;
	}

	public void setFlexibilityError(double flexibilityError) {
		this.flexibilityError = flexibilityError;
	}

	public double getCostError() {
		return costError;
	}

	public void setCostError(double costError) {
		this.costError = costError;
	}

	public double getTimeStd() {
		return timeStd;
	}

	public void setTimeStd(double timeStd) {
		this.timeStd = timeStd;
	}

	public double getFlexibilityStd() {
		return flexibilityStd;
	}

	public void setFlexibilityStd(double flexibilityStd) {
		this.flexibilityStd = flexibilityStd;
	}

	public double getCostStd() {
		return costStd;
	}

	public void setCostStd(double costStd) {
		this.costStd = costStd;
	}
	
	public double getTotalCost() {
		return totalCost;
	}

	public void setTotalCost(double totalCost) {
		this.totalCost = totalCost;
	}
	public double getCostRating() {
		return costRating;
	}

	public void setCostRating(double costRating) {
		this.costRating = costRating;
	}

	public double getMinCost() {
		return minCost;
	}

	public void setMinCost(double minCost) {
		this.minCost = minCost;
	}

	public double getMaxCost() {
		return maxCost;
	}

	public void setMaxCost(double maxCost) {
		this.maxCost = maxCost;
	}

	
	// public double averageRating = 0.0;
	
	/* public double getAverageRating() {
		return (timeDevPercent + safety + flexibilityPercent + costDeviation )/ 4;
	} */
	public long getDuration() {
		return duration;
	}

	public void setDuration(long duration) {
		this.duration = duration;
	}
	public double getMinFlexibility() {
		return minFlexibility;
	}

	public void setMinFlexibility(double minFlexibility) {
		this.minFlexibility = minFlexibility;
	}

	public double getMaxFlexibility() {
		return maxFlexibility;
	}

	public void setMaxFlexibility(double maxFlexibility) {
		this.maxFlexibility = maxFlexibility;
	}

	public double getTimeRating() {
		return timeRating;
	}

	public void setTimeRating(double timeRating) {
		this.timeRating = timeRating;
	}
	
	public double getMinTime() {
		return minTime;
	}

	public void setMinTime(double minTime) {
		this.minTime = minTime;
	}

	public double getMaxTime() {
		return maxTime;
	}

	public void setMaxTime(double maxTime) {
		this.maxTime = maxTime;
	}
	
	public double getCostDeviation() {
		return costDeviation;
	}

	public void setCostDeviation(double costDeviation) {
		this.costDeviation = costDeviation;
	}
	
	public double getSafety() {
		return safety;
	}

	public void setSafety(double safety) {
		this.safety = safety;
	}

	public double getFlexibility() {
		return flexibility;
	}

	public void setFlexibility(double flexibility) {
		this.flexibility = flexibility;
	}

	public double getTimeDeviation() {
		return timeDeviation;
	}

	public void setTimeDeviation(double timeDeviation) {
		this.timeDeviation = timeDeviation;
	}
	/*public double[] getAsArray() {
		double[] results = {costDeviation, timeDeviation, safety, flexibility};
		return results;
	}*/
}
