package com.SynchroNET.routing.algorithm;

import java.util.Calendar;
import java.util.Collection;
import java.util.LinkedList;
import java.util.List;

import org.opentripplanner.common.pqueue.BinHeap;
import org.opentripplanner.routing.algorithm.AStar;
import org.opentripplanner.routing.algorithm.TraverseVisitor;
import org.opentripplanner.routing.algorithm.strategies.RemainingWeightHeuristic;
import org.opentripplanner.routing.algorithm.strategies.SearchTerminationStrategy;
import org.opentripplanner.routing.core.RoutingContext;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.core.StateEditor;
import org.opentripplanner.routing.edgetype.PatternHop;
import org.opentripplanner.routing.edgetype.PreAlightEdge;
import org.opentripplanner.routing.edgetype.TransitBoardAlight;
import org.opentripplanner.routing.graph.Edge;
import org.opentripplanner.routing.graph.Vertex;
import org.opentripplanner.routing.spt.GraphPath;
import org.opentripplanner.routing.spt.ShortestPathTree;
import org.opentripplanner.routing.vertextype.TransitStop;
import org.opentripplanner.util.DateUtils;
import org.opentripplanner.util.monitoring.MonitoringStore;
import org.opentripplanner.util.monitoring.MonitoringStoreFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.SynchroNET.utilities.GTFSExtraDataManager;
import com.beust.jcommander.internal.Lists;

/**
* Find the shortest path between graph vertices using A*.
* A basic Dijkstra search is a special case of AStar where the heuristic is always zero.
* 
* NOTE this is now per-request scoped, which has caused some threading problems in the past.
* Always make one new instance of this class per request, it contains a lot of state fields.
*/

public class SynchroStar {

   private static final Logger LOG = LoggerFactory.getLogger(AStar.class);

   private static final MonitoringStore store = MonitoringStoreFactory.getStore();

   private TraverseVisitor traverseVisitor;
   
   enum RunStatus {
       RUNNING, STOPPED
   }
   
   /* TODO instead of having a separate class for search state, we should just make one GenericAStar per request. */
   class RunState {

       public State u;
       public ShortestPathTree spt;
       BinHeap<State> pq;
       RemainingWeightHeuristic heuristic;
       public RoutingContext rctx;
       public int nVisited;
       public List<State> targetAcceptedStates;
       public RunStatus status;
       private RoutingRequest options;
       private SearchTerminationStrategy terminationStrategy;
       public Vertex u_vertex;
       Double foundPathWeight = null;

       public RunState(RoutingRequest options, SearchTerminationStrategy terminationStrategy) {
           this.options = options;
           this.terminationStrategy = terminationStrategy;
       }

   }
   
   private RunState runState;
   
   /**
    * Compute SPT using default timeout and termination strategy.
    */
   public ShortestPathTree getShortestPathTree(RoutingRequest req) {
       return getShortestPathTree(req, -1, null); // negative timeout means no timeout
   }
   
   /**
    * Compute SPT using default termination strategy.
    */
   public ShortestPathTree getShortestPathTree(RoutingRequest req, double relTimeoutSeconds) {
       return this.getShortestPathTree(req, relTimeoutSeconds, null);
   }
   
   /** set up a single-origin search */
   public void startSearch(RoutingRequest options,
           SearchTerminationStrategy terminationStrategy, long abortTime) {
       startSearch(options, terminationStrategy, abortTime, true);
   }
   
   /** set up the search, optionally not adding the initial state to the queue (for multi-state Dijkstra) */
   private void startSearch(RoutingRequest options,
   		SearchTerminationStrategy terminationStrategy, long abortTime, boolean addToQueue) {

	   runState = new RunState( options, terminationStrategy );
       runState.rctx = options.getRoutingContext();
       runState.spt = options.getNewShortestPathTree();


       // We want to reuse the heuristic instance in a series of requests for the same target to avoid repeated work.
       // "Batch" means one-to-many mode, where there is no goal to reach so we use a trivial heuristic.
       runState.heuristic = runState.rctx.remainingWeightHeuristic; //is set to InterleavedBidirectionalHeuristic in the GraphPathFinder.java (PHUONG)

       // Since initial states can be multiple, heuristic cannot depend on the initial state.
       // Initializing the bidirectional heuristic is a pretty complicated operation that involves searching through
       // the streets around the origin and destination.
       runState.heuristic.initialize(runState.options, abortTime); 

       //PHUONG: abortTime is now = System.currentTimeMillis() + (long)(relativeTimeoutSeconds * 1000.0); --> (time_whenCallnew_Astar@GraphPathFinder + 2s) in ms
       if (abortTime < Long.MAX_VALUE  && System.currentTimeMillis() > abortTime) {
           LOG.warn("Timeout during initialization of goal direction heuristic.");
           options.rctx.debugOutput.timedOut = true;
           runState = null; // Search timed out
           return;
       }

       // Priority Queue.
       // The queue is self-resizing, so we initialize it to have size = O(sqrt(|V|)) << |V|.
       // For reference, a random, undirected search on a uniform 2d grid will examine roughly sqrt(|V|) vertices
       // before reaching its target.
       int initialSize = runState.rctx.graph.getVertices().size();
       initialSize = (int) Math.ceil(2 * (Math.sqrt((double) initialSize + 1)));

       runState.pq = new BinHeap<>(initialSize);
       runState.nVisited = 0;
       runState.targetAcceptedStates = Lists.newArrayList();
       
       if (addToQueue) {
           State initialState = new State(options);
           runState.spt.add(initialState);
           runState.pq.insert(initialState, 0);
       }
   }
   
   boolean iterate(){
       // interleave some heuristic-improving work (single threaded)
       runState.heuristic.doSomeWork(); //PHUONG: from InterleavedBidirectionalHeuristic:
                                        //Move backward N steps through the transit network.This improves the heuristic's knowledge of the transit network as seen from the target, making its lower bounds on path weight progressively more accurate. [for estimateRemainingWeight]

       // get the lowest-weight state in the queue
       runState.u = runState.pq.extract_min();
//       if(runState.u.getVertex().getLabel().toUpperCase().contains("SOPRON") && runState.u.getVertex().getClass().equals(TransitStop.class)) System.out.println(runState.u.getVertex().getLabel() + " " + runState.u.getVertex().getClass().equals(TransitStop.class) + " " + runState.u.getWeight());
       // check that this state has not been dominated
       // and mark vertex as visited
       if (!runState.spt.visit(runState.u)) {
           // state has been dominated since it was added to the priority queue, so it is
           // not in any optimal path. drop it on the floor and try the next one.
       	//LOG.info("iterate) min = {} not worth to visit", runState.u.getWeight()); //PHUONG should be deleted
           return false; //PHUONG: this state is not worth visiting --> change to another state
       }
       
       if (traverseVisitor != null) {
           traverseVisitor.visitVertex(runState.u);
       }
       
       runState.u_vertex = runState.u.getVertex();

       runState.nVisited += 1;
//System.out.println();
//System.out.println("state_u:  " + runState.u);
//System.out.println("List of edges:");
       
       Collection<Edge> edges = runState.options.arriveBy ? runState.u_vertex.getIncoming() : runState.u_vertex.getOutgoing();    
       
//       int temp = 1;
       for (Edge edge : edges) { //PHUONG: for each neighbor of runState.u_vertex:
    	   //System.out.println(temp + ". " + edge);
//    	   temp++;
           // Iterate over traversal results. When an edge leads nowhere (as indicated by
           // returning NULL), the iteration is over. TODO Use this to board multiple trips.
  
//       	if(edge.getFromVertex().getLabel().split("_")[edge.getFromVertex().getLabel().split("_").length - 1].equals("D") ||
//       			edge.getToVertex().getLabel().split("_")[edge.getToVertex().getLabel().split("_").length - 1].equals("D")) if(edge.getClass().equals(TransitBoardAlight.class))
//       		System.out.println(edge.getFromVertex().getLabel() + " " +	edge.getToVertex().getLabel() + " " + edge.getClass());
       	
    	   //EDIT - Riccardo (31/03/2017): Avoid going back to origin or to continue beyond the final destination 
    	   Vertex from = edge.getFromVertex();
    	   Vertex to = edge.getToVertex();
    	   Boolean sameNode = from.getLat() == to.getLat() && from.getLon() == to.getLon();
//     		if(runState.rctx.target.getLat() == from.getLat() && runState.rctx.target.getLon() == from.getLon() && from.getLat() != to.getLat() && !sameNode){
//      			continue;
//      		}
//      		if(runState.rctx.origin.getLat() == to.getLat() && runState.rctx.origin.getLon() == to.getLon() && !sameNode){
//      			continue;
//      		}

      		if(runState.rctx.target.getLabel().equals(from.getLabel())){
      			continue;
      		}
      		if(runState.rctx.origin.getName().equals(to.getName()) && !runState.rctx.origin.getName().equals(from.getName())){
      			continue;
      		}
      	    //EDIT - Riccardo (31/03/2017): END
      		//EDIT - Riccardo (07-04-2017): GenericLocation object (final destination) added to help heuristic performing better
//      		System.out.println(edge.getFromVertex().getName() + " " + edge.getToVertex().getName() + " " + edge.getClass());

      		for (State v = edge.traverse(runState.u); v != null; v = v.getNextResult()) {

//System.out.println(v);
//       		if( v.getBackEdge().getFromVertex().getLabel().contains("TIVOLI") || v.getBackEdge().getToVertex().getLabel().contains("TIVOLI")  )
//       			System.out.println(v.getBackEdge().getClass().toString());
//      	        if(v.getBackEdge().getToVertex().toString().contains("GERAU"))
//      	        	if(v.getBackEdge().getClass().equals(PatternHop.class))System.out.println(v.getBackEdge().getFromVertex().getLabel() + " " + v.getBackEdge().getToVertex().getLabel() + " " + v.weight);
//                Could be: for (State v : traverseEdge...)
//      			System.out.println(v.getVertex().getLabel() + " " + v.getWeight());
                

	       		if (traverseVisitor != null) {
	                   traverseVisitor.visitEdge(edge, v);
	            }
	       			
	       		double remaining_w = 0;
	            if(!v.getVertex().getName().equals(runState.rctx.target.getName())){
	         	   remaining_w = runState.heuristic.estimateRemainingWeight(v);
	            }
//               if((v.getBackEdge().getFromVertex().getName().equals("Cork") && v.getBackEdge().getToVertex().getName().equals("Patra")) ||
//            		   v.getBackEdge().getFromVertex().getName().equals("Patra") && v.getBackEdge().getToVertex().getName().equals("Cork")){
//               }

		      	   

	            if (remaining_w < 0 || Double.isInfinite(remaining_w) ) {                	 
	            	continue;
	            }

	            double estimate = v.getActiveTime() + remaining_w;


	            // avoid enqueuing useless branches 
	            if (estimate > runState.options.maxWeight) { //BUC5
	            	// too expensive to get here
	            	LOG.info("         too expensive to reach, not enqueued. estimated weight = " + estimate);                       
	            	continue;
	            }

	            if (isWorstTimeExceeded(v, runState.options)) { //PHUONG: BUC4: the current time at state v > opt.worstTime [mode: depart by]
	               // 	too much time to get here
	            	LOG.info("         too much time to reach, not enqueued. time = " + v.getTimeSeconds());
	                continue;
	            }
	           
	            // spt.add returns true if the state is hopeful; enqueue state if it's hopeful
//                if(runState.u.getVertex().getLabel().toUpperCase().contains("RIJEKA_SOPRON")) System.out.println(runState.u.getVertex().getLabel() + " " + runState.u.getVertex().getClass().equals(TransitStop.class) + " " + runState.u.getWeight());
	            if (runState.spt.add(v)) {
//System.out.println("added!");
	            	// report to the visitor if there is one
	            	if (traverseVisitor != null){
	            		traverseVisitor.visitEnqueue(v);
	            	}

	            	//runState.pq.insert(v, estimate);
	            	runState.pq.insert(v, v.weight);
	            } 

      		}
       }       
       return true;
   }
   
   void runSearch(long abortTime){ 
       /* the core of the A* algorithm */
       while (!runState.pq.empty()) { // Until the priority queue is empty:
           /*
            * Terminate based on timeout?
            */

           if (abortTime < Long.MAX_VALUE  && System.currentTimeMillis() > abortTime) {
               LOG.warn("Astar.runSearch timeout: currentTime = {} , abortTime={}  , pathfounds = {}  ,  requiredpaths = {}  , origin={} target={}",System.currentTimeMillis(), abortTime, runState.targetAcceptedStates.size(), runState.options.getNumItineraries(), runState.rctx.origin, runState.rctx.target);
               // Rather than returning null to indicate that the search was aborted/timed out,
               // we instead set a flag in the routing context and return the SPT anyway. This
               // allows returning a partial list results even when a timeout occurs.
               runState.options.rctx.aborted = true; // signal search cancellation up to higher stack frames
               runState.options.rctx.debugOutput.timedOut = true; // signal timeout in debug output object

               break;
           }
           
           /*
            * Get next best state and, if it hasn't already been dominated, add adjacent states to queue.
            * If it has been dominated, the iteration is over; don't bother checking for termination condition.
            * 
            * Note that termination is checked after adjacent states are added. This presents the negligible inefficiency
            * that adjacent states are generated for a state which could be the last one you need to check. The advantage
            * of this is that the algorithm is always left in a restartable state, which is useful for debugging or
            * potential future variations.
            */ 
           if(!iterate()){ //PHUONG: iterate == false --> the state on the head of pq queue [the lowest-weight state in the queue] is not worth to visit --> try another one
           	continue; 
           }

           
           /*
            * Should we terminate the search? BUC3: Take away not go too far from the most recently found accepted path
            */
           // Don't search too far past the most recently found accepted path/state
           
//        if(runState.u_vertex.getLabel().toUpperCase().contains("RIJEKA_SOPRON"))   System.out.println(runState.u_vertex.getLabel() + " " + runState.u_vertex.getClass().equals(TransitStop.class) + " " + runState.u.getWeight());
//        if(runState.u_vertex.getLabel().toUpperCase().contains("SOPRON") && runState.u_vertex.getClass().equals(TransitStop.class)) System.out.println(runState.u_vertex.getLabel() + " " + runState.u_vertex.getClass().equals(TransitStop.class) + " " + runState.u.getWeight());
           if (runState.terminationStrategy != null) {
               if (runState.terminationStrategy.shouldSearchTerminate (
                   runState.rctx.origin, runState.rctx.target, runState.u, runState.spt, runState.options)) 
               {
               	LOG.info("TeminateStrategy");
               	break;
               }
           }  else if (!runState.options.batch && runState.u_vertex.getLat() == runState.rctx.target.getLat() && runState.u_vertex.getLon() == runState.rctx.target.getLon()
   	   			&& runState.u_vertex.getClass().equals(TransitStop.class)) {
               //Riccardo (12-07-2017): vertex is consider the target if it is in the corresponding city, also if it was related to another agency
               if (runState.options.onlyTransitTrips && !runState.u.isEverBoarded()) {
               	LOG.info("Try another one");
               	continue;
               }
               
               //Riccardo: increase the weight of a final state too allowed more solution with a unique astar
               int x = 2;
               runState.u.weight *= x;
               runState.targetAcceptedStates.add(runState.u);
               runState.foundPathWeight = runState.u.getWeight() / x;
               runState.options.rctx.debugOutput.foundPath();

               LOG.info("Found new solution cost = {}" , runState.foundPathWeight); //PHUONG 
               
               /* Only find one path at a time in long distance mode. */
            
               /* Break out of the search if we've found the requested number of paths. */
               if (runState.targetAcceptedStates.size() >= runState.options.getNumItineraries()) {
            	 //  LOG.info("total vertices visited {}", runState.nVisited); //PHUONG should be deleted Giovanni
                   LOG.debug("total vertices visited {}", runState.nVisited);
                   break;
               }
           }
       }
       
   }

   /** @return the shortest path, or null if none is found */
   public ShortestPathTree getShortestPathTree(RoutingRequest options, double relTimeoutSeconds,
           SearchTerminationStrategy terminationStrategy) {
       ShortestPathTree spt = null;
       long abortTime = DateUtils.absoluteTimeout(relTimeoutSeconds); //PHUONG: relTimeoutSeconds may be 5s or 4s or 2s
       //PHUONG: in GraphPathFinder: aStar.getShortestPathTree(options, timeout); the timeout is calculated 
       startSearch (options, terminationStrategy, abortTime); //PHUONG: abortTime is now = System.currentTimeMillis() + (long)(relativeTimeoutSeconds * 1000.0); --> (currentTime + 2s) in ms

     //  LOG.info("FINISH Astar startSearch, call RunSearch"); //PHUONG should be deleted Giovanni
       if (runState != null) {
           runSearch(abortTime);
           spt = runState.spt;
       }
       
       storeMemory();
       return spt;
   }
   
   /** Get an SPT, starting from a collection of states */
   public ShortestPathTree getShortestPathTree(RoutingRequest options, double relTimeoutSeconds,
           SearchTerminationStrategy terminationStrategy, Collection<State> initialStates) {
       
       ShortestPathTree spt = null;
       long abortTime = DateUtils.absoluteTimeout(relTimeoutSeconds);

       startSearch (options, terminationStrategy, abortTime, false);
       
       if (runState != null) {
           for (State state : initialStates) {
               runState.spt.add(state);
               // TODO: hardwired for earliest arrival
               // TODO: weights are seconds, no?
               runState.pq.insert(state, state.getDurationSeconds());
           }
           
           runSearch(abortTime);
           spt = runState.spt;
       }
       
       return spt;
   }

   private void storeMemory() {
       if (store.isMonitoring("memoryUsed")) {
           System.gc();
           long memoryUsed = Runtime.getRuntime().totalMemory() -
                   Runtime.getRuntime().freeMemory();
           store.setLongMax("memoryUsed", memoryUsed);
       }
   }

   private boolean isWorstTimeExceeded(State v, RoutingRequest opt) {
       if (opt.arriveBy)
           return v.getTimeSeconds() < opt.worstTime;
       else
           return v.getTimeSeconds() > opt.worstTime;
   }

   public void setTraverseVisitor(TraverseVisitor traverseVisitor) {
       this.traverseVisitor = traverseVisitor;
   }

   public List<GraphPath> getPathsToTarget() {
       List<GraphPath> ret = new LinkedList<>();
       for (State s : runState.targetAcceptedStates) {
           if (s.isFinal()) { //PHUONG: True if the state at vertex can be the end of path.
               ret.add(new GraphPath(s, true));
           }
       }
       return ret;
   }
   
   
}
