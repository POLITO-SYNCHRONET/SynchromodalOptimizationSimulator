/* This program is free software: you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public License
 as published by the Free Software Foundation, either version 3 of
 the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>. */

package org.opentripplanner.graph_builder.annotation;

public class ConflictingBikeTags extends GraphBuilderAnnotation {

    private static final long serialVersionUID = 1L;

    public static final String FMT = "Conflicting tags bicycle:[yes|designated] and cycleway: " +
    		"dismount on way %s, assuming dismount";
    public static final String HTMLFMT = "Conflicting tags bicycle:[yes|designated] and cycleway: " +
        "dismount on way <a href=\"http://www.openstreetmap.org/way/%d\">\"%d\"</a>, assuming dismount";
    
    final long wayId;
    
    public ConflictingBikeTags(long wayId){
    	this.wayId = wayId;
    }

    @Override
    public String getHTMLMessage() {
        if (wayId > 0 ) {
            return String.format(HTMLFMT, wayId, wayId);
        // If way is lower then 0 it means it is temporary ID and so useless to link to OSM
        } else {
            return getMessage();
        }
    }

    @Override
    public String getMessage() {
        return String.format(FMT, wayId);
    }

}
