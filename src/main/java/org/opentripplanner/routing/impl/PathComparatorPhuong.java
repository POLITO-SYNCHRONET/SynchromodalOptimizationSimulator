package org.opentripplanner.routing.impl;

import java.util.Comparator;

import org.opentripplanner.routing.spt.GraphPath;

public class PathComparatorPhuong implements Comparator<GraphPath> {

    int sortResultType;
    
    public PathComparatorPhuong(int sortResultType) {
        this.sortResultType = sortResultType;
    }
    
   
    @Override
    public int compare(GraphPath o1, GraphPath o2) {
    	 //sort Results presented on the web use-interface: 0: weight ascending; 1: C02 ascending; 2:duration ascending,  3: distance ascending; 4:departure ascending; 5: arrival ascending
    	//obj1 and obj2 are the objects to be compared. This method returns zero if the objects are equal. It returns a positive value if obj1 is greater than obj2. Otherwise, a negative value is returned.
    	if (sortResultType == 0)
    		return (int) (o1.getWeight() - o2.getWeight());
    	else if (sortResultType == 1)
    		return (int) (o1.getCO2() - o2.getCO2());
    	else if (sortResultType == 2)
    		return (int) (o1.getDuration() - o2.getDuration());
    	else if (sortResultType == 3)
    		return (int) (o1.getDistance() - o2.getDistance());
    	else if (sortResultType == 4)
    		return (int) (o1.getStartTime() - o2.getStartTime());
    	else if (sortResultType == 5)
    		return (int) (o1.getEndTime() - o2.getEndTime());
    	else return (int) (o1.getWeight() - o2.getWeight());
    }
}
