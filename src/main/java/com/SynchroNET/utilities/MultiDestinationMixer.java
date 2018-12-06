package com.SynchroNET.utilities;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.api.model.TripPlan;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.TraverseMode;
import com.amazonaws.util.json.JSONException;
import com.amazonaws.util.json.JSONObject;

//Riccardo (23/05/2017): Try to merge the itineraries going to different destinations and give back a new TripPlan with the merged itineraries

public class MultiDestinationMixer {
	
	public static void findMultiDestinationItineraries(TripPlan plan, String[] otherDestinations, RoutingRequest request){
		
		List<ArrayList<Itinerary>> separatedItineraries = new ArrayList<>();
    	
		for(int jj = 0; jj <= otherDestinations.length; jj++){
    		separatedItineraries.add(new ArrayList<>());
    	}
    	
		//Riccardo (23/05/2017): put the itineraries in a different ArrayList depending on their destination
        for(Itinerary itin : plan.itinerary){
        	
        	for(int jj = 0; jj < otherDestinations.length; jj++){
        		if(otherDestinations[jj].split("::")[0].equals(itin.legs.get(itin.legs.size() - 1).to.name)){
        			separatedItineraries.get(jj + 1).add(itin);
        			itin.legs.get(itin.legs.size() - 1).finalDestination = jj + 2;
            		break;
            	} 
        		if (jj == otherDestinations.length - 1){
        			itin.legs.get(itin.legs.size() - 1).finalDestination = 1;
        			separatedItineraries.get(0).add(itin);
            	}
        	}
        }
		
 
		//Riccardo (23/05/2017): try to merge the itineraries of different destinations (two per time)
    	int destinationId = 2;
        while(separatedItineraries.size() >= 2){
        	ArrayList<Itinerary> firstDestination = separatedItineraries.get(0);
        	ArrayList<Itinerary> secondDestination = separatedItineraries.get(1);
    	
            separatedItineraries.add(0, MultiDestinationMixer.getDoubleDestinationItineraries(firstDestination, secondDestination, Integer.toString(destinationId), request));
            separatedItineraries.remove(2);
            separatedItineraries.remove(1);
            destinationId++;
        }
		//Riccardo (23/05/2017): END

		//Riccardo (23/05/2017): find paths going to the same city and fix them
        List<Itinerary> itineraries = separatedItineraries.get(0);
        for(Itinerary itinerary : itineraries){
            fixLegsToTheSameNode(itinerary);
        }
		//Riccardo (23/05/2017): END
        
		//Riccardo (23/05/2017): recalculate the quality of the itineraries
        plan.itinerary = itineraries;
        int[] quality = QualityCalculator.calculateItinerariesQuality(plan.itinerary, request);

        for(int i = 0; i < quality.length; i++){
        	plan.itinerary.get(i).quality = quality[i];
        }
        
//        TimesCalculator.calculateTimesofParallelLegs(plan.itinerary, request);
		//Riccardo (23/05/2017): END
	}
	
	//Riccardo (29/05/2017): Fix itineraries avoiding legs going to the same destination 
	private static void fixLegsToTheSameNode(Itinerary itinerary){
		List<Leg> legs = itinerary.legs;
		HashMap<String, List<Leg>> allDestinations = new HashMap<>();
		List<String> passingByCitiesAgain = new ArrayList<>();
		
		for(Leg l : legs){

			if(allDestinations.get(l.to.name) != null) {
				if(allDestinations.get(l.to.name).size() == 1) passingByCitiesAgain.add(l.to.name);
				allDestinations.get(l.to.name).add(l);
			}
			else {
				List<Leg> tempLegs = new ArrayList<Leg>();
				tempLegs.add(l);
				allDestinations.put(l.to.name, tempLegs);
			}

		}
		
		if(passingByCitiesAgain.size() > 0){
			TreeNode root = createTree(legs);
			List<TreeNode> nodesArray = root.getNodesArray();
			
			while(passingByCitiesAgain.size() > 0){
				String city = passingByCitiesAgain.get(0);
				List<Leg> sameDestinationLegs = allDestinations.get(city);			
				List<TreeNode> sameDestinationNodes = new ArrayList<>();
				
				while(sameDestinationLegs.size() > 0){
					for(TreeNode node : nodesArray){
						if(node.leg.equals(sameDestinationLegs.get(0))){
							sameDestinationNodes.add(node);
						}
					}
					sameDestinationLegs.remove(0);
				}
				
				TreeNode bestNode = null;
				
				for(TreeNode node : sameDestinationNodes){
					if(bestNode != null){
						if(bestNode.leg.endTime.after(node)){
							bestNode = node;
						}
					} else {
						bestNode = node;
					}
				}
				
				sameDestinationNodes.remove(bestNode);
				for(TreeNode node : sameDestinationNodes){
					
					if(node.children.size() > 0){
						for(TreeNode child : node.children){
							bestNode.addChild(child);
						}
					}
					
					TreeNode parent = node.parent;
					String[] idsToMove = node.leg.destinationId.split("-");
												
					while(!parent.leg.previousDestinationId.equals("0")){

						String[] ids = parent.leg.destinationId.split("-");
						String id = "";
						
						for(int i = 0; i < ids.length; i++){
							
							for(int jj = 0; jj < idsToMove.length; jj++){

								if(!ids[i].equals(idsToMove[jj])){
									
									id += "-" + ids[i];
								}
								
							}
							
						}

						if(id.contains("-")) parent.leg.destinationId = id.substring(1);
						else parent.leg.destinationId = "";
						
						parent = parent.parent;
						
					}
					
					do{
						node.parent.children.remove(node);
						node = node.parent;
					} while(node.leg.destinationId.length() == 0);
					
										
					changeId:
					while(!bestNode.leg.previousDestinationId.equals("0")) {
						String[] ids = bestNode.leg.destinationId.split("-");
						String id = "";
						
						int i = 0;
						int jj = 0;
						
						while(i < ids.length || jj < idsToMove.length){

								int id1 = i == ids.length ? Integer.parseInt(idsToMove[idsToMove.length - 1]) + 1 : Integer.parseInt(ids[i]);
								int id2 = jj == idsToMove.length ? Integer.parseInt(ids[ids.length - 1]) + 1 : Integer.parseInt(idsToMove[jj]);

								if(id1 == id2){
									break changeId;
								} 
							
								if(id1 < id2){
									id += "-" + ids[i];
									i++;
								} else {
									id += "-" + idsToMove[jj];
									jj++;
								}
						
						}

						if(id.contains("-")) bestNode.leg.destinationId = id.substring(1);
						bestNode = bestNode.parent;
						
					}

				}
				
				clearPreviousDestinationId(root);
				
				createMergedItinerary(root);
				
				passingByCitiesAgain.remove(0);
			}
//			printTree(root);
			itinerary.legs = root.getLegsArray();
		}
	}
	//Riccardo (23/05/2017): END
	
	//Riccardo (23/05/2017): Add all the not merged legs cost of the second destination 
	private static void addLegs(List<Itinerary> mixed, Itinerary itin1, Itinerary itin2, List<Leg> legs1, List<Leg> legs2, int startPoint, String destinationId){
	
		for(int i = startPoint; i < legs2.size(); i++){
	
			Leg leg2 = legs2.get(i);
				
			legs1.add(leg2);
	
			itin1.CO2 += leg2.CO2;
			itin1.costCO2 += leg2.costCO2;
			itin1.distance += leg2.distance / 1000;
			itin1.costDistance += leg2.costdistance;
			itin1.costTime += leg2.costtime;
			itin1.totalcost += leg2.totalcost;
			
			String truck = TraverseMode.BUS.toString();
			String rails = TraverseMode.RAIL.toString();
			String ship = TraverseMode.FERRY.toString();
			
			if(leg2.mode.equals(truck)){
				itin1.haveTRUCK = true;
				itin1.CO2TRUCK += leg2.CO2;
				itin1.totalcostTRUCK += leg2.totalcost;
				itin1.distanceTRUCK += leg2.distance / 1000;
			} else if(leg2.mode.equals(rails)){
				itin1.haveTRAIN = true;
				itin1.CO2TRAIN += leg2.CO2;
				itin1.totalcostTRAIN += leg2.totalcost;
				itin1.distanceTRAIN += leg2.distance / 1000;
			} else if(leg2.mode.equals(ship)){
				itin1.haveSHIP = true;
				itin1.CO2SHIP += leg2.CO2;
				itin1.totalcostSHIP += leg2.totalcost;
				itin1.distanceSHIP += leg2.distance / 1000;
			}			
		}
		
		if(itin1.duration < itin2.duration){
			itin1.duration = itin2.duration;
			itin1.elapsedTime = itin2.elapsedTime;
			itin1.endTime.setTimeInMillis(itin2.endTime.getTimeInMillis());
			itin1.waitingTime = itin2.waitingTime;
		}
	
		legs1.sort(new EndTimeComparator());
	
		try {
			
			JSONObject json1 = new JSONObject(itin1.verticesLabels);
			
			JSONObject json2 = new JSONObject(itin2.verticesLabels);
			
			for(String s : JSONObject.getNames(json2)){
				json1.put(s, json2.get(s));
			}
			itin1.setVerticesLabels(json1.toString());
		} catch (JSONException e) {
			e.printStackTrace();
		}
		
		if(itin1.fromDatabase && !itin2.fromDatabase){
			itin1.fromDatabase = false;
		}
		
		mixed.add(itin1);
	}
	//Riccardo (23/05/2017): END

	private static void switchLegs(Itinerary itin1, Leg leg1, Leg leg2){
		
		itin1.CO2 = itin1.CO2 - leg1.CO2 + leg2.CO2;
		itin1.costCO2 = itin1.costCO2 - leg1.costCO2 + leg2.costCO2;
		itin1.distance = itin1.distance -leg1.distance / 1000 + leg2.distance / 1000;
		itin1.costDistance = itin1.costDistance - leg1.costdistance + leg2.costdistance;
		itin1.costTime = itin1.costTime - leg1.costtime + leg2.costtime;
		itin1.totalcost = itin1.totalcost - leg1.totalcost + leg2.totalcost;
		
		String truck = TraverseMode.BUS.toString();
		String rails = TraverseMode.RAIL.toString();
		String ship = TraverseMode.FERRY.toString();
		String legMode = null;
		
		if(leg1.mode.equals(truck)){
			itin1.haveTRUCK = false;
			legMode = truck;
			itin1.CO2TRUCK -= leg1.CO2;
			itin1.totalcostTRUCK -= leg1.totalcost;
			itin1.distanceTRUCK -= leg1.distance / 1000;
		} else if(leg1.mode.equals(rails)){
			itin1.haveTRAIN = false;
			legMode = rails;
			itin1.CO2TRAIN -= leg1.CO2;
			itin1.totalcostTRAIN -= leg1.totalcost;
			itin1.distanceTRAIN -= leg1.distance / 1000;
		} else if(leg1.mode.equals(ship)){
			itin1.haveSHIP = false;
			legMode = ship;
			itin1.CO2SHIP -= leg1.CO2;
			itin1.totalcostSHIP -= leg1.totalcost;
			itin1.distanceSHIP -= leg1.distance / 1000;
		}
		
		for(Leg l : itin1.legs){
			if(!l.equals(leg1) && l.mode.equals(legMode)){
				if(legMode.equals(truck)){
					itin1.haveTRUCK = true;
				} else if(legMode.equals(rails)){
					itin1.haveTRAIN = true;
				} else if(legMode.equals(ship)){
					itin1.haveSHIP = true;
				}
				break;
			}
		}
		
		if(leg2.mode.equals(truck)){
			itin1.haveTRUCK = true;
			itin1.CO2TRUCK += leg2.CO2;
			itin1.totalcostTRUCK += leg2.totalcost;
			itin1.distanceTRUCK += leg2.distance / 1000;
		} else if(leg2.mode.equals(rails)){
			itin1.haveTRAIN = true;
			itin1.CO2TRAIN += leg2.CO2;
			itin1.totalcostTRAIN += leg2.totalcost;
			itin1.distanceTRAIN += leg2.distance / 1000;
		} else if(leg2.mode.equals(ship)){
			itin1.haveSHIP = true;
			itin1.CO2SHIP += leg2.CO2;
			itin1.totalcostSHIP += leg2.totalcost;
			itin1.distanceSHIP += leg2.distance / 1000;
		}
		
		if(leg1.finalDestination != 0) leg2.finalDestination = leg1.finalDestination;
			
	}
	//Riccardo (23/05/2017): END
	
	static class EndTimeComparator implements Comparator<Leg> {
	    @Override
	    public int compare(Leg a, Leg b) {
	        return a.endTime.compareTo(b.endTime);
	    }
	}
	
	//Riccardo (23/05/2017): assign the right previousDestinationId to keep track of the previous leg
	private static void createMergedItinerary(TreeNode root){

		ArrayList<TreeNode> nodesOnSameLevel = new ArrayList<>();
		ArrayList<String> previousIds = new ArrayList<>();
		
		boolean first = true;
		
		do{
			if(first){
				for(TreeNode child : root.children){
					nodesOnSameLevel.add(child);
					if(root.children.size() == 1 && root.children.get(0).leg.destinationId.equals(root.leg.destinationId)){
						previousIds.add(root.leg.previousDestinationId);
					} else {
						previousIds.add(root.leg.destinationId);
					}
				}
				first = false;
			} else {
				ArrayList<TreeNode> tempNodesOnSameLevel = new ArrayList<>();
				ArrayList<String> tempPreviousIds = new ArrayList<>();
				
				for(int i = 0; i < nodesOnSameLevel.size(); i++){
					TreeNode tempChild = nodesOnSameLevel.get(i);
					tempChild.leg.previousDestinationId = previousIds.get(i);
					for(TreeNode child : tempChild.children){
						tempNodesOnSameLevel.add(child);
						if(tempChild.children.size() == 1 && tempChild.children.get(0).leg.destinationId.equals(tempChild.leg.destinationId)) {
							tempPreviousIds.add(tempChild.leg.previousDestinationId);
						} else {
							tempPreviousIds.add(tempChild.leg.destinationId);
						}
					}
				}
				nodesOnSameLevel = tempNodesOnSameLevel;
				previousIds = tempPreviousIds;
			}
		
		}
		while(nodesOnSameLevel.size() != 0);
//		System.out.println("Tree after");
//		printTree(root);
	}
	//Riccardo (23/05/2017): END
	
	private static void printTree(TreeNode root){
		TreeNode actualChild = root;
		System.out.println(root.leg.destinationId + " " + root.leg.previousDestinationId + " " + root.leg.routeId + " " + root.children.size());
		System.out.println();
	
		ArrayList<TreeNode> nodesOnSameLevel = new ArrayList<>();
		
		do{
			if(actualChild != null){
				for(TreeNode child : actualChild.children){
					nodesOnSameLevel.add(child);
				}
				actualChild = null;
			} else {
				ArrayList<TreeNode> tempNodesOnSameLevel = new ArrayList<>();
				for(TreeNode tempChild : nodesOnSameLevel){
					for(TreeNode child : tempChild.children){
						tempNodesOnSameLevel.add(child);
					}
					System.out.println(tempChild.leg.destinationId + " " + tempChild.leg.previousDestinationId + " " + tempChild.leg.routeId + " " +  tempChild.children.size() + " Parent:" + tempChild.parent.leg.routeId);
				}
				System.out.println();
				nodesOnSameLevel = tempNodesOnSameLevel;
			}
	
			
		}
		while(nodesOnSameLevel.size() != 0);
		System.out.println();
	}

	private static void clearPreviousDestinationId(TreeNode root){
		TreeNode actualChild = root;
		actualChild.leg.previousDestinationId = "0";
		
		ArrayList<TreeNode> nodesOnSameLevel = new ArrayList<>();
		
		do{
			if(actualChild != null){
				for(TreeNode child : actualChild.children){
					nodesOnSameLevel.add(child);
					child.leg.previousDestinationId = "0";
				}
				actualChild = null;
			} else {
				ArrayList<TreeNode> tempNodesOnSameLevel = new ArrayList<>();
				for(TreeNode tempChild : nodesOnSameLevel){
					for(TreeNode child : tempChild.children){
						tempNodesOnSameLevel.add(child);
						child.leg.previousDestinationId = "0";
					}
				}
				nodesOnSameLevel = tempNodesOnSameLevel;
			}
		
		}
		while(nodesOnSameLevel.size() != 0);
	}
	
	public static TreeNode createTree(List<Leg> legs){
    	TreeNode root = new TreeNode(legs.get(0));
//		HashMap<String, TreeNode> passingByCities = new HashMap<>();

		List<Leg> tempLegs = new ArrayList<>();
		for(Leg l: legs){
			tempLegs.add(l);
		}
		
		TreeNode actualChild = null;
		HashMap<String, TreeNode> sameLevelNodes = new HashMap<>();
		
		for(int leg1Number = 0; leg1Number < tempLegs.size();){
			if(actualChild == null){
				actualChild = root;
			} else {
				actualChild = new TreeNode(tempLegs.get(leg1Number));
				sameLevelNodes.get(actualChild.leg.previousDestinationId).addChild(actualChild);
			}
			
//			passingByCities.put(actualChild.leg.to.name, actualChild);
			
			sameLevelNodes.put(tempLegs.get(leg1Number).destinationId, actualChild);
			tempLegs.remove(leg1Number);

			for(int n = 0; n < tempLegs.size(); n++){
				TreeNode node = sameLevelNodes.get(tempLegs.get(n).destinationId);
				if(node != null){
					node.addChild(tempLegs.get(n));
					sameLevelNodes.put(tempLegs.get(n).destinationId, node.children.get(node.children.size() - 1));
					tempLegs.remove(n);
					n--;
				}
			}
			
		}
		
		return root;
    }
	
	static class TreeNode {

		Leg leg;
	    TreeNode parent;
	    List<TreeNode> children;

	    public TreeNode(Leg leg) {
	        this.leg = leg;
	        this.children = new LinkedList<TreeNode>();
	    }

	    public TreeNode addChild(Leg child) {
	        TreeNode childNode = new TreeNode(child);
	        childNode.parent = this;
	        this.children.add(childNode);
	        return childNode;
	    }
	    
	    public TreeNode addChild(TreeNode childNode) {
	        childNode.parent = this;
	        this.children.add(childNode);
	        return childNode;
	    }
	    
	    public List<TreeNode> getNodesArray(){
	    	List<TreeNode> nodes = new ArrayList<>();
	    	List<TreeNode> tempNodes = new ArrayList<>();
	    	nodes.add(this);
	    	tempNodes.add(this);
	    	
	    	while(tempNodes.size() > 0){
	    		for(TreeNode node : tempNodes.get(0).children){
	    			nodes.add(node);
	    			tempNodes.add(node);
	    		}
	    		tempNodes.remove(0);
	    	}
	    	
	    	return nodes;
	    }
	    
	    public List<Leg> getLegsArray(){
	    	List<Leg> legs = new ArrayList<>();
	    	List<TreeNode> tempNodes = new ArrayList<>();
	    	legs.add(this.leg);
	    	tempNodes.add(this);
	    	
	    	while(tempNodes.size() > 0){
	    		for(TreeNode node : tempNodes.get(0).children){
	    			legs.add(node.leg);
	    			tempNodes.add(node);
	    		}
	    		tempNodes.remove(0);
	    	}
	    	
	    	return legs;
	    }

	}
	
	private static ArrayList<Itinerary> getDoubleDestinationItineraries(ArrayList<Itinerary> to1, ArrayList<Itinerary> to2, String destinationId, RoutingRequest request){
		ArrayList<Itinerary> mixedItineraries = new ArrayList<>();
		HashMap<Itinerary, Boolean> alreadyUsed = new HashMap<>(); //Riccardo (23/05/2017): delete it if you want to try to merge an itinerary already merged

		
		firstDestinationIteration:
		for(Itinerary itin1 : to1){

			List<Leg> legs1 = itin1.legs;
				
			//Riccardo: create a tree representation of the first itinerary
			TreeNode root = createTree(legs1);
//			System.out.println("Tree before");
//			printTree(root);

			//Riccardo: Try to merge the first itinerary with one from the second destination list
			secondDestinationIteration:
			for(Itinerary itin2 : to2){
				if(alreadyUsed.get(itin2) != null) continue;

				List<Leg> legs2 = itin2.legs;
				
				TreeNode currentChild = root;
									
				ArrayList<TreeNode> currentChildren = new ArrayList<TreeNode>();
				currentChildren.add(currentChild);

				for(int indexLeg2 = 0; indexLeg2 < legs2.size(); indexLeg2++){
						
					Leg leg2 = legs2.get(indexLeg2);

					for(TreeNode child : currentChildren){
						
						if(leg2.tripId.toString().contains("DB_AMSTERDAM_FRANKFURT_TRIP")) System.out.println(leg2.tripId + " id:" + leg2.destinationId + " pID:" + leg2.previousDestinationId);

						if(child.leg.to.lat.equals(leg2.to.lat) && child.leg.from.lat.equals(leg2.from.lat) &&
									child.leg.to.lon.equals(leg2.to.lon) && child.leg.from.lon.equals(leg2.from.lon)){
							//leg1 and leg2 go from/to the same origin/destination
								currentChild = child;
								currentChild.leg.destinationId += "-" + destinationId;
							
								if(currentChild.leg.endTime.after(leg2.endTime)){
									//leg2 arrive before leg1, keep leg2 instead of leg1
									leg2.destinationId = currentChild.leg.destinationId;
									leg2.previousDestinationId = currentChild.leg.previousDestinationId;
									Leg leg1 = currentChild.leg;
									currentChild.leg = leg2;

									switchLegs(itin1, leg1, leg2);
									int index = legs1.indexOf(leg1);
									legs1.remove(index);
									legs1.add(index, leg2);

								}

							//move along the tree
							currentChildren = new ArrayList<>();
							for(TreeNode grandChild : currentChild.children){
								currentChildren.add(grandChild);
							}
							if(indexLeg2 == legs2.size() - 1){
								//last leg2
								//merge itineraries
								alreadyUsed.put(itin2, true);
								mergeItineraries(mixedItineraries, itin1, itin2, legs2.size(), destinationId, currentChild, root);
								continue firstDestinationIteration;
							} else if(currentChildren.size() == 0){
								//last leg1
								//add all remaining legs2
								alreadyUsed.put(itin2, true);
								mergeItineraries(mixedItineraries, itin1, itin2, indexLeg2 + 1, destinationId, currentChild, root);
								continue firstDestinationIteration;	
							}
							break;
						} else {
							if(indexLeg2 == 0) {
								//no common legs
								continue secondDestinationIteration;
							} else {
								//If at least one leg was merged and there aren't more common legs
								//add the not merged legs of the second destination itinerary to the tree
								alreadyUsed.put(itin2, true);
								mergeItineraries(mixedItineraries, itin1, itin2, indexLeg2, destinationId, currentChild, root);
								continue firstDestinationIteration;								
							}
						}
					}	
				}
			}
		}
			
        return mixedItineraries;
	}
	
	private static void mergeItineraries(List<Itinerary> mixed, Itinerary itin1, Itinerary itin2, int startPoint, String destinationId, TreeNode node, TreeNode root){
//		printTree(root);
		List<Leg> legs1 = itin1.legs;
		List<Leg> legs2 = itin2.legs;
		for(int singleRouteId = startPoint; singleRouteId < legs2.size(); singleRouteId++){
			node.addChild(legs2.get(singleRouteId));
			node = node.children.get(node.children.size() - 1);
			node.leg.destinationId = destinationId;
		}
		node.leg.finalDestination = Integer.parseInt(destinationId);

		//merge the itineraries and try with another first itinerary
		addLegs(mixed, itin1, itin2, legs1, legs2, startPoint, destinationId);
		createMergedItinerary(root);
		
//		System.out.println("Tree after");
//		printTree(root);
	}
	
}
