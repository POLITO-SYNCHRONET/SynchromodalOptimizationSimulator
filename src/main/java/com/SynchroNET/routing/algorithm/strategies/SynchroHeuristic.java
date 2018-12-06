package com.SynchroNET.routing.algorithm.strategies;

import gnu.trove.map.TObjectDoubleMap;
import gnu.trove.map.hash.TObjectDoubleHashMap;
import org.opentripplanner.common.pqueue.BinHeap;
import org.opentripplanner.routing.algorithm.strategies.InterleavedBidirectionalHeuristic;
import org.opentripplanner.routing.algorithm.strategies.RemainingWeightHeuristic;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.State;
import org.opentripplanner.routing.edgetype.StreetTransitLink;
import org.opentripplanner.routing.graph.Edge;
import org.opentripplanner.routing.graph.Graph;
import org.opentripplanner.routing.graph.Vertex;
import org.opentripplanner.routing.location.StreetLocation;
import org.opentripplanner.routing.spt.DominanceFunction;
import org.opentripplanner.routing.spt.ShortestPathTree;
import org.opentripplanner.routing.vertextype.StreetVertex;
import org.opentripplanner.routing.vertextype.TransitStop;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;

public class SynchroHeuristic implements RemainingWeightHeuristic {

   private static final long serialVersionUID = 20160215L;

   private static Logger LOG = LoggerFactory.getLogger(InterleavedBidirectionalHeuristic.class);

   // For each step in the main search, how many steps should the reverse search proceed?
   private static final int HEURISTIC_STEPS_PER_MAIN_STEP = 8; // TODO determine a good value empirically
   //PHUONG: hard-wired parameter that controls how fast the heuristic progresses relative to the main search

   /** The vertex at which the main search begins. */
   Vertex origin;

   /** The vertex that the main search is working towards. */
   Vertex target;

   /** All vertices within walking distance of the origin (the vertex at which the main search begins). */
   Set<Vertex> preTransitVertices;

   /**
    * A lower bound on the weight of the lowest-cost path to the target (the vertex at which the main search ends)
    * from each vertex within walking distance of the target. As the heuristic progressively improves, this map will
    * include lower bounds on path weights for an increasing number of vertices on board transit.
    */
   TObjectDoubleMap<Vertex> postBoardingWeights;

   Graph graph;

   RoutingRequest routingRequest;

   // The maximum weight yet seen at a closed node in the reverse search. The priority queue head has a uniformly
   // increasing weight, so any unreached transit node must have greater weight than this.
   double maxWeightSeen = 0;

   // The priority queue for the interleaved backward search through the transit network.
   BinHeap<Vertex> transitQueue;

   // True when the entire transit network has been explored by the reverse search.
   boolean finished = false;

   /**
    * Before the main search begins, the heuristic must search on the streets around the origin and destination.
    * This also sets up the initial states for the reverse search through the transit network, which progressively
    * improves lower bounds on travel time to the target to guide the main search.
    */
   @Override
   public void initialize(RoutingRequest request, long abortTime) { //PHUONG: this function will be called @Astar.startSearch
       Vertex target = request.rctx.target; //PHUONG: abortTime is now = System.currentTimeMillis() + (long)(relativeTimeoutSeconds * 1000.0); --> (time_whenCallnew_Astar@GraphPathFinder + 2s) in ms
       if (target == this.target) {
           LOG.debug("Reusing existing heuristic, the target vertex has not changed.");
           return;
       }
       LOG.debug("Initializing heuristic computation.");
       this.graph = request.rctx.graph;
       long start = System.currentTimeMillis();
       this.target = target;
       this.routingRequest = request;
       request.softWalkLimiting = false;
       request.softPreTransitLimiting = false;
       transitQueue = new BinHeap<>();
       // Forward street search first, mark street vertices around the origin so H evaluates to 0
       TObjectDoubleMap<Vertex> forwardStreetSearchResults = streetSearch(request, false, abortTime);
       if (forwardStreetSearchResults == null) {
           return; // Search timed out
       }
       preTransitVertices = forwardStreetSearchResults.keySet();
       LOG.debug("end forward street search {} ms", System.currentTimeMillis() - start);
       postBoardingWeights = streetSearch(request, true, abortTime); // PHUONG: mark street vertices around the destination so Heuristic evaluates to 0
       if (postBoardingWeights == null) {
           return; // Search timed out
       }
       LOG.debug("end backward street search {} ms", System.currentTimeMillis() - start);
       // once street searches are done, raise the limits to max
       // because hard walk limiting is incorrect and is observed to cause problems 
       // for trips near the cutoff
       request.setMaxWalkDistance(Double.POSITIVE_INFINITY);
       //request.setMaxPreTransitTime(Integer.MAX_VALUE); PHUONG closed
       LOG.debug("initialized SSSP");
       request.rctx.debugOutput.finishedPrecalculating();
   }

   /**
    * This function supplies the main search with an (under)estimate of the remaining path weight to the target.
    * No matter how much progress has been made on the reverse heuristic search, we must return an underestimate
    * of the cost to reach the target (i.e. the heuristic must be admissible).
    * All on-street vertices within walking distance of the origin or destination will have been explored by the
    * heuristic before the main search starts.
    */
   @Override
   public double estimateRemainingWeight (State s) {
       final Vertex v = s.getVertex();

       // The main search is not currently on a street vertex, it's probably on transit.
       // If the current part of the transit network has been explored, then return the stored lower bound.
       // Otherwise return the highest lower bound yet seen -- this location must have a higher cost than that.
       double h = postBoardingWeights.get(v); //A lower bound on the weight of the lowest-cost path to the target (the vertex at which the main search ends)
                                              //from vertex v within walking distance of the target
       if (h == Double.POSITIVE_INFINITY) { //not explored yet
           return maxWeightSeen; //return the highest lower bound yet seen: The maximum weight yet seen at a closed node in the reverse search. The priority queue head has a uniformly
                                  // increasing weight, so any unreached transit node must have greater weight than this.
       } else {
           return h; //has been explored --> return the stored lower bound
       }
       
   }
   
   private double calculateLinearDistance(double initialLat, double initialLong, double finalLat, double finalLong){
	   	int R = 6371; // km (Earth radius)
		double dLat = toRadians(finalLat-initialLat);
		double dLon = toRadians(finalLong-initialLong);
		initialLat = toRadians(initialLat);
		finalLat = toRadians(finalLat);
		
		double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(initialLat) * Math.cos(finalLat); 
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		return R * c;
	}

   private double toRadians(double deg) {
	   return deg * (Math.PI/180);
   }

   @Override
   public void doSomeWork() {
       if (finished) return;
       for (int i = 0; i < HEURISTIC_STEPS_PER_MAIN_STEP; ++i) {
           if (transitQueue.empty()) {
               finished = true;
               break;
           }
           int uWeight = (int) transitQueue.peek_min_key();
           Vertex u = transitQueue.extract_min();
           // The weight of the queue head is uniformly increasing.
           // This is the highest weight ever seen for a closed vertex.
           maxWeightSeen = uWeight;
           // Now that this vertex is closed, we can store its weight for use as a lower bound / heuristic value.
           // We don't implement decrease-key operations though, so check whether a smaller value is already known.
           double uWeightOld = postBoardingWeights.get(u);
           if (uWeight < uWeightOld) {
               // Including when uWeightOld is infinite because the vertex is not yet closed.
               postBoardingWeights.put(u, uWeight);
           } else {
               // The vertex was already closed. This time it necessarily has a higher weight, so skip it.
               continue;
           }
           // This search is proceeding backward relative to the main search.
           // When the main search is arriveBy the heuristic search looks at OUTgoing edges.
           for (Edge e : routingRequest.arriveBy ? u.getOutgoing() : u.getIncoming()) {
               // Do not enter streets in this phase, which should only touch transit.
               if (e instanceof StreetTransitLink) {
                   continue;
               }
               Vertex v = routingRequest.arriveBy ? e.getToVertex() : e.getFromVertex();
               double edgeWeight = e.weightLowerBound(routingRequest);
               // INF heuristic value indicates unreachable (e.g. non-running transit service)
               // this saves time by not reverse-exploring those routes and avoids maxFound of INF.
               if (Double.isInfinite(edgeWeight)) {
                   continue;
               }
               double vWeight = uWeight + edgeWeight;
               double vWeightOld = postBoardingWeights.get(v);
               if (vWeight < vWeightOld) {
                   // Should only happen when vWeightOld is infinite because it is not yet closed.
                   transitQueue.insert(v, vWeight);
               }
           }
       }
   }

   private TObjectDoubleMap<Vertex> streetSearch (RoutingRequest rr, boolean fromTarget, long abortTime) {
       LOG.debug("Heuristic street search around the {}.", fromTarget ? "target" : "origin"); //PHUONG: abortTime = System.currentTimeMillis() + (long)(relativeTimeoutSeconds * 1000.0); --> (currentTime + 2s) in ms
       rr = rr.clone();
       if (fromTarget) {
           rr.setArriveBy(!rr.arriveBy);
       }
       // Create a map that returns Infinity when it does not contain a vertex.
       TObjectDoubleMap<Vertex> vertices = new TObjectDoubleHashMap<>(100, 0.5f, Double.POSITIVE_INFINITY);
       ShortestPathTree spt = new DominanceFunction.MinimumWeight().getNewShortestPathTree(rr);
       // TODO use normal OTP search for this.
       BinHeap<State> pq = new BinHeap<State>();
       Vertex initVertex = fromTarget ? rr.rctx.target : rr.rctx.origin;
       State initState = new State(initVertex, rr);
       pq.insert(initState, 0);
       while ( ! pq.empty()) {
           if (abortTime < Long.MAX_VALUE  && System.currentTimeMillis() > abortTime) {
               return null;
           }
           State s = pq.extract_min();
           Vertex v = s.getVertex();
           // At this point the vertex is closed (pulled off heap).
           // This is the lowest cost we will ever see for this vertex. We can record the cost to reach it.
           if (v instanceof TransitStop) {
               // We don't want to continue into the transit network yet, but when searching around the target
               // place vertices on the transit queue so we can explore the transit network backward later.
               if (fromTarget) {
                   double weight = s.getWeight();
                   transitQueue.insert(v, weight);
                   if (weight > maxWeightSeen) {
                       maxWeightSeen = weight;
                   }
               }
               continue;
           }
           // We don't test whether we're on an instanceof StreetVertex here because some other vertex types
           // (park and ride or bike rental related) that should also be explored and marked as usable.
           // Record the cost to reach this vertex.
           if (!vertices.containsKey(v)) {
               vertices.put(v, (int) s.getWeight()); // FIXME time or weight? is RR using right mode?
           }
           for (Edge e : rr.arriveBy ? v.getIncoming() : v.getOutgoing()) {
               // arriveBy has been set to match actual directional behavior in this subsearch.
               // Walk cutoff will happen in the street edge traversal method.
               State s1 = e.traverse(s);
               if (s1 == null) {
                   continue;
               }
               if (spt.add(s1)) {
                   pq.insert(s1,  s1.getWeight());
               }
           }
       }
       LOG.debug("Heuristric street search hit {} vertices.", vertices.size());
       LOG.debug("Heuristric street search hit {} transit stops.", transitQueue.size());
       return vertices;
   }

@Override
public void reset() {
	// TODO Auto-generated method stub
	
}

}
