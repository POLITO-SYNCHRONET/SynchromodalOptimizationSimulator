package org.opentripplanner.index.model;

import com.google.common.collect.Lists;

import java.util.List;

import org.opentripplanner.routing.edgetype.TripPattern;

/**
 * Some stopTimes all in the same pattern.
 * TripTimeShort should probably be renamed StopTimeShort
 */
public class StopTimesInPattern {

    public PatternShort pattern;
    public List<TripTimeShort> times = Lists.newArrayList();

    public StopTimesInPattern(TripPattern pattern) {
        this.pattern = new PatternShort(pattern);
    }

}
