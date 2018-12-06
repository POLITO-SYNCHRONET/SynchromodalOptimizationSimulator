package org.opentripplanner.routing.impl;


import java.util.Comparator;

import org.opentripplanner.routing.spt.GraphPath;

public class PathComparatorWeight implements Comparator<GraphPath> {
    
    public PathComparatorWeight() {
    }
    
    /**
     * Search results sort by weight ascending
     */
    @Override
    public int compare(GraphPath o1, GraphPath o2) {
    	return (int) (o2.getWeight() - o1.getWeight());
    }

}
