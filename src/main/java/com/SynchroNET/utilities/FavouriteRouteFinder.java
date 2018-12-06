package com.SynchroNET.utilities;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.graph.Edge;
import org.opentripplanner.routing.graph.Vertex;
import org.opentripplanner.routing.impl.GraphPathFinder;
import org.opentripplanner.routing.spt.GraphPath;
import org.opentripplanner.standalone.OTPServer;
import org.opentripplanner.standalone.Router;

import com.SynchroNET.routing.impl.SynchroGraphPathFinder;

public class FavouriteRouteFinder {

    //EDIT - Riccardo (28/03/2017): We will keep track of the outgoing and incoming of each vertex that we will modify with generateFakeGraph
    //to restore them with restorRealGraph
    private static HashMap<String, Edge[]> incomingEdgeByVertex = new HashMap<>();
    private static HashMap<String, Edge[]> outgoingEdgeByVertex = new HashMap<>();
    //EDIT - Riccardo (28/03/2017): END
    
    //EDIT - Riccardo (28/03/2017): Find previous favorite route from the ArrayList<String> of Vertex Label stored in the Data Base
    public static List<GraphPath> findMyFavouritePath(RoutingRequest previousFavoriteRequest, OTPServer otpServer, ArrayList<String[]> previousRoutes){
    	if(previousRoutes.size() == 0){
    		return new ArrayList<GraphPath>();
    	}
    	else{
    		  //To get everything work we need to create another route and another request          
            Router previousFavoriteRouter = otpServer.getRouter(previousFavoriteRequest.routerId);
//            System.out.println(previousFavoriteRequest.getToPlace());
            //Here we edit the graph
            //every vertex of the previous route will have just one outgoing edge leading to next one
            //and one incoming come from the previous one
            generateFakeGraph(previousFavoriteRouter, previousRoutes);

            //We use the new graph to calculate the route based on the previous one the user has decided
            SynchroGraphPathFinder gpFinderDBTest = new SynchroGraphPathFinder(previousFavoriteRouter); 
            List<GraphPath> previousFavoritePaths = gpFinderDBTest.graphPathFinderEntryPoint(previousFavoriteRequest);

            for(int i = 0; i <previousFavoritePaths.size(); i++){
            	GraphPath gp = previousFavoritePaths.get(i);
            	previousFavoritePaths.remove(i);
            	gp.setFromDatabase(true);
            	previousFavoritePaths.add(i, gp);	
            }
            
            //We restore the real graph 
            restoreRealGraph(previousFavoriteRouter);
            
            return previousFavoritePaths;
    	}
    }
    //EDIT - Riccardo (28/03/2017): END

    //EDIT - Riccardo (28/03/2017): We use this method to edit the graph
    //We set just one incoming and one outgoing edge for each Vertex
    //In this way the graph will just find one route
    private static void generateFakeGraph(Router router, ArrayList<String[]> previousRoutes){

    	for(int i = 0; i < previousRoutes.size(); i++){
            String[] verticesLabels = previousRoutes.get(i);
            int vertexNumber = verticesLabels.length;
//            Vertex[] fakeVertexDB = new Vertex[vertexNumber];
            Vertex fromV;
            Edge incomingEdge = null;
            
            for(int j = 0; j < vertexNumber; j++){
            	
            	fromV = router.graph.getVertex(verticesLabels[j]);        	 
//              	 System.out.println(fromV.getName());
              	 if(j == 0){
              		 incomingEdgeByVertex.put(fromV.getLabel(), fromV.getIncomingArray());

              		 fromV.clearIncoming();
              	 }
              	 else{
              		 incomingEdgeByVertex.put(fromV.getLabel(), fromV.getIncomingArray());

              		 fromV.clearIncoming();
              		 fromV.addIncoming(incomingEdge);
              	 }
               	 
            	 if(j == vertexNumber - 1){
            		 outgoingEdgeByVertex.put(fromV.getLabel(), fromV.getOutgoingArray());
            		 
            		 fromV.clearOutgoing();    		 
            	 }
            	 else {
            		 String toVertexToKeep = router.graph.getVertex(verticesLabels[j + 1]).getLabel();
            		 String fromVertexToKeep = fromV.getLabel();

            		 for(Edge e: fromV.getOutgoing()){
            		        
            			 String fromVertex = e.getFromVertex().getLabel();
                		 
            			 String toVertex = e.getToVertex().getLabel();
                		 
                		 if(fromVertex.equals(fromVertexToKeep) && toVertex.equals(toVertexToKeep)){
                    		 outgoingEdgeByVertex.put(fromV.getLabel(), fromV.getOutgoingArray());
                    		 fromV.clearOutgoing();
                    		 fromV.addOutgoing(e);
                			 incomingEdge = e;
                			 break;
                		 }
            		 }	 	
              	 }
            	 
//            	 fakeVertexDB[j] = fromV;
            }

//            for(Vertex v : fakeVertexDB){
//            	System.out.println("Vertex: " + v.getLabel());
//            	System.out.println("Incoming:");
//            	for(Edge e: v.getIncoming()){
//            		System.out.println(e.getFromVertex().getName() + " " + e.getFromVertex().getLabel() + " " + e.getToVertex().getName() + " " + e.getToVertex().getLabel());
//            	}
//            	System.out.println("Outgoing:");
//            	for(Edge e : v.getOutgoing()){
//            		System.out.println(e.getFromVertex().getName() + " " + e.getFromVertex().getLabel() + " " + e.getToVertex().getName() + " " + e.getToVertex().getLabel());
//            	}
//            	System.out.println();
//            }
            
    	}
    }
    //EDIT - Riccardo (28/03/2017): END
    
    //EDIT - Riccardo (28/03/2017): Restore real graph
    //We need to restore the real graph to find routes when we will make a search
    private static void restoreRealGraph(Router router){
    	for(String k : outgoingEdgeByVertex.keySet()){
    		Vertex v = router.graph.getVertex(k);
    		v.clearOutgoing();
    		for(Edge e : outgoingEdgeByVertex.get(k)){
        		v.addOutgoing(e);
    		}
    	}

    	for(String k : incomingEdgeByVertex.keySet()){
    		Vertex v = router.graph.getVertex(k);
    		v.clearIncoming();
    		for(Edge e : incomingEdgeByVertex.get(k)){
        		v.addIncoming(e);;
    		}
    	}
    }
    //EDIT - Riccardo (28/03/2017): END

}
