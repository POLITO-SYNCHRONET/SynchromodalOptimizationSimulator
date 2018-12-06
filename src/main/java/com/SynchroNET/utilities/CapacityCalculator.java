//Giovanni: this class is used to calculate the total capacity of the itinerary 
package com.SynchroNET.utilities;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.StringTokenizer;
import java.util.concurrent.ConcurrentHashMap;

import org.opentripplanner.api.model.Itinerary;
import org.opentripplanner.api.model.Leg;
import org.opentripplanner.api.model.TripPlan;
import org.opentripplanner.api.resource.PlannerResource;
import org.opentripplanner.routing.core.RoutingRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CapacityCalculator {
	private static final Logger LOG = LoggerFactory.getLogger(PlannerResource.class);
	Map<Itinerary, Integer> mapItineraryMaxCapacity;
	SpecialRouteFinder srf;

	public CapacityCalculator(SpecialRouteFinder srf) {
		mapItineraryMaxCapacity = new ConcurrentHashMap<>();
		this.srf = srf;
	}

	public void startCapacityMode(TripPlan plan, RoutingRequest request, int destinationsNumber, int[] capacityRequest, Date[] arrivaltime) {
		
		if (plan == null || plan.itinerary.isEmpty()) return;
		
		List<Itinerary> itinerariesFinal = new ArrayList<>();
		calculateItinerariesMaxCapacity(plan.itinerary); // create a Map with Itinerary and his max capacity.

		LOG.info("START CAPACITY");
		LOG.info("Destinations Number: " + Integer.toString(destinationsNumber));
		itinerariesClean(itinerariesFinal, capacityRequest);
		multipleSearchNewLegs(itinerariesFinal, request, destinationsNumber, capacityRequest, arrivaltime);
		// if(multiple==1)
		// merge2itinerary(request.capacityRequest, itinerariesFinal);
		refreshTotalCost(itinerariesFinal);
		//plan.itinerary = QualityCalculator.calculateItinerariesQualityListSort(itinerariesFinal, request);
		QualityCalculator.calculateItinerariesQuality(itinerariesFinal, request);
		plan.itinerary =  itinerariesFinal;

	}

	//Trovo itinerario unico
	private void itinerariesClean(List<Itinerary> itinerariesFinal, int[] capacityRequest) {
		for (Map.Entry<Itinerary, Integer> itinerary : mapItineraryMaxCapacity.entrySet()) {
			// Ho cercato l'itinerario che ha già la capacità disponibile.
			Boolean ok = true;
			for (Leg leg : itinerary.getKey().legs) {
				int capacityforleg = searchcapacity(leg.destinationId, capacityRequest);
				if (!leg.isTRUCKLeg())
					if (leg.capacity < capacityforleg) {
						ok = false;
						break;
					}
			}
			if (ok) {
				for (Leg leg : itinerary.getKey().legs) {
					leg.assignedcontainers = searchcapacity(leg.destinationId, capacityRequest);
					//refreshCostCo2leg(itinerary.getKey(), leg, true, leg.capacity);
				}
				itinerariesFinal.add(itinerary.getKey());
				mapItineraryMaxCapacity.remove(itinerary.getKey());
			}
		}

	}

	private int searchcapacity(String destinationId, int[] capacityRequest) {
		StringTokenizer st = new StringTokenizer(destinationId, "-");
		int capacity = 0;
		while (st.hasMoreElements()) {
			int number = Integer.parseInt(st.nextElement().toString());
			number--;
			capacity += capacityRequest[number];
		}
		return capacity;
	}

	private void multipleSearchNewLegs(List<Itinerary> itinerariesFinal, RoutingRequest request, int destinationsNumber, int[] capacityRequest, Date[] arrivaltime) {
		for (Map.Entry<Itinerary, Integer> itinerary : mapItineraryMaxCapacity.entrySet()) {
			LOG.info("New itinerary");
			Boolean maxcapacity = false;
			Map<Integer, Boolean> legscheck = new ConcurrentHashMap<>();
			int count = 0;
			for (Leg leg : itinerary.getKey().legs) {
				if (leg.isTRUCKLeg()) {
					maxcapacity = true;
				} else {
					if (leg.capacity >= searchcapacity(leg.destinationId, capacityRequest))
						maxcapacity = true;
				}
				legscheck.put(count, false);
				count++;
			}
			if (maxcapacity) {
				LOG.info("	Now try to search other leg to add");
				Itinerary newitinerary = new Itinerary();
				newitinerary.cloneItinerary(itinerary.getKey(), true);
				int sizeNewiniterary = newitinerary.legs.size();
				Boolean check = true;
				for (int indexLegs = 0; indexLegs < sizeNewiniterary; indexLegs++) {
					if (!legscheck.get(indexLegs)) {
						Leg leg = newitinerary.legs.get(indexLegs);
						int crequest = searchcapacity(leg.destinationId, capacityRequest);
						LOG.info("Leg: " + leg.from.name + "-" + leg.to.name + " " + leg.mode);
						LOG.info("Capacity request: " + Integer.toString(crequest));
						LOG.info("Capacity leg: " + Integer.toString(leg.capacity));
						if (!leg.isTRUCKLeg()) {
							if (leg.capacity < crequest) {
								int ret = searchotheritineraryMultiple(newitinerary, indexLegs, indexLegs,
										sizeNewiniterary, request, crequest, arrivaltime, capacityRequest);
								if (ret > 0) {
									legscheck.replace(indexLegs, true);
									if (ret > indexLegs) {
										int k = indexLegs;
										while (k <= ret) {
											if (newitinerary.legs.get(k).destinationId.equals(leg.destinationId))
												legscheck.replace(k, true);
											k++;
										}
									}
								} else {
									LOG.info("searchotheritinerary non found");
									check = false;
									break;
								}
							} else {
								leg.assignedcontainers = crequest;
							}
						} else {
							leg.assignedcontainers = crequest;
							//refreshCostCo2leg(newitinerary, leg, false, leg.capacity);
						}
					}
				}
				if (check) {
					itinerariesFinal.add(newitinerary);
				}
			} else {
				LOG.info("No, this itinerary is not good, all legs have lower capacity than the requested one.");
			}

		}
	}

	private int searchotheritineraryMultiple(Itinerary newitinerary, int indexFirstLeg, int indexLastLeg,
			int nLegsOriginalItinerary, RoutingRequest request, int crequest, Date[] arrivaltime, int[] capacityRequest) {
				
		int ultimo = 0;
		int penultimo = 0, prev = -1;
		List<Integer> lista = new ArrayList<>();
		for (int d = indexFirstLeg; d <= nLegsOriginalItinerary - 1; d++) {
			if (newitinerary.legs.get(d).destinationId.equals(newitinerary.legs.get(indexFirstLeg).destinationId)) {
				ultimo = d;
				lista.add(d);
			}

		}
		for (int next : lista) {
			if (next < indexFirstLeg) {
				prev = next;

			}
		}
		if (lista.size() > 1)
			penultimo = lista.get(lista.size() - 2);
		if (indexLastLeg < ultimo) {
			for (int k = indexLastLeg; k < nLegsOriginalItinerary - 1; k++) {
				if (newitinerary.legs.get(k + 1).destinationId
						.equals(newitinerary.legs.get(indexFirstLeg).destinationId)) {
					if (newitinerary.legs.get(k + 1).capacity < crequest
							&& !newitinerary.legs.get(k + 1).isTRUCKLeg()) {
						indexLastLeg = k + 1;
					} else
						break;
				}
			}
		}
		int mincap = crequest;
		for (int m = indexFirstLeg; m <= indexLastLeg; m++) {
			if (newitinerary.legs.get(m).destinationId.equals(newitinerary.legs.get(indexFirstLeg).destinationId)) {
				if (newitinerary.legs.get(m).capacity < crequest && !newitinerary.legs.get(m).isTRUCKLeg())
					mincap = newitinerary.legs.get(m).capacity;
			}
		}
		LOG.info("mincap " + Integer.toString(mincap));
		for (int m = indexFirstLeg; m <= indexLastLeg; m++) {
			if (newitinerary.legs.get(m).destinationId.equals(newitinerary.legs.get(indexFirstLeg).destinationId)) {
				newitinerary.legs.get(m).assignedcontainers = mincap;
				//refreshCostCo2leg(newitinerary, newitinerary.legs.get(m), false, newitinerary.legs.get(m).capacity);
				LOG.info("leg " + newitinerary.legs.get(m).from.name + " "
						+ Integer.toString(newitinerary.legs.get(m).assignedcontainers));
			}
		}
		Leg leg = newitinerary.legs.get(indexFirstLeg);
		int[] destinationLeg = getDestinationId(leg.destinationId);
		if (prev < 0 && indexFirstLeg > 0) {
			prev = checkprev(newitinerary, indexFirstLeg, leg);
		}
		Leg arrive = newitinerary.legs.get(indexLastLeg);
		LOG.info("cerco un nuovo itinerario in sostituzione");
		LOG.info("Partenza " + leg.from.name);
		LOG.info("Arrivo " + arrive.to.name);
		String departure = leg.from.name + "::" + leg.from.lat + "," + leg.from.lon;
		String arrival = arrive.to.name + "::" + arrive.to.lat + "," + arrive.to.lon;
		Date arrivetime = null;
		Date starttime = null;
		Boolean movetruck = false;
		int nt = 0, nntt = 0;
		int indice = 0;
		for (int next : lista) {
			if (next > indexLastLeg) {
				nt = next;
				break;
			}
			indice++;
		}
		if (lista.size() > indice + 1)
			nntt = lista.get(indice + 1);

		if (indexLastLeg < ultimo) {

			Leg nextleg = newitinerary.legs.get(nt);
			if (nextleg.isTRUCKLeg()) {
				movetruck = true;
				if (indexLastLeg < penultimo) {
					Long timeadd = newitinerary.legs.get(nntt).startTime.getTime().getTime()
							- nextleg.endTime.getTime().getTime();
					arrivetime = nextleg.startTime.getTime();
					arrivetime.setTime(nextleg.startTime.getTime().getTime() + timeadd);
				} else {
					// movetruck = false;
					if (destinationLeg.length == 1) {
						if (arrivaltime[destinationLeg[0] - 1] != null)
							arrivetime = arrivaltime[destinationLeg[0] - 1];
					} else
						arrivetime = nextleg.startTime.getTime();
				}
			} else {
				arrivetime = nextleg.startTime.getTime();
			}
		} else {
			if (indexFirstLeg < newitinerary.legs.size() - 1) {
				Boolean checkfinaldestination = true;
				if (arrive.finalDestination > 0) {
					String finaldest = ""+arrive.finalDestination;
					if(leg.capacity<searchcapacity(finaldest,capacityRequest)) {
						arrivetime = arrive.endTime.getTime();
						checkfinaldestination=false;
					}
				}
				if (checkfinaldestination)
					for (int search = indexLastLeg + 1; search < newitinerary.legs.size() - 1; search++)
						if (newitinerary.legs.get(search).previousDestinationId.equals(arrive.destinationId)) {
							arrivetime = newitinerary.legs.get(search).startTime.getTime();
							break;
						}
			} else {
				if (destinationLeg.length == 1) {
					if (arrivaltime[destinationLeg[0] - 1] != null)
						arrivetime = arrivaltime[destinationLeg[0] - 1];
				} else
					arrivetime = arrive.endTime.getTime();
			}
		}

		starttime = starttime(indexFirstLeg, request, leg);
		int capacityToFind = crequest - leg.assignedcontainers;
		
		//Riccardo: avoid going back
		ArrayList<String> bannedStops = new ArrayList<>();
		for(int i = 0; i < newitinerary.legs.size(); i++){
			Leg l = newitinerary.legs.get(i);
			if(l.from.name.equals(leg.from.name)) break;
			bannedStops.add(l.from.name);
		}
		int nextLastToBan = 0;
		for(int item : lista) {
			if(item > indexLastLeg) {
				nextLastToBan = item;
				break;
			}
		}
		if(nextLastToBan>0) {
			bannedStops.add(newitinerary.legs.get(nextLastToBan).to.name);
			LOG.info(newitinerary.legs.get(nextLastToBan).to.name);
		}
		
		List<Itinerary> listfound = srf.findOtherItineraryForCapacity(departure, arrival, starttime, null, bannedStops,
				arrivetime, capacityToFind);
		Boolean yeswecan = false;
		if (listfound != null) {
			LOG.info("Listfound != null");
			for (Itinerary found : listfound) {
				Boolean capacity = true;
				for (Leg nleg : found.legs) {
					if (!nleg.isTRUCKLeg()) {
						if (nleg.capacity < capacityToFind) {
							LOG.info("	New ininerary is not good");
							capacity = false;
							break;
						}
					}
					for (Leg check : newitinerary.legs) {
						Boolean doublecheck;
						doublecheck = checkleg(nleg, check);
						if (!doublecheck) {
							capacity = false;
							break;
						}
					}
					if (!capacity)
						break;
				}
				if (capacity) {
					int n = 0, m = found.legs.size();
					if (newitinerary.endTime.before(found.endTime))
						newitinerary.endTime = found.endTime;
					for (Leg nleg : found.legs) {
						nleg.assignedcontainers = capacityToFind;
						nleg.destinationId = leg.destinationId;
						nleg.previousDestinationId = leg.previousDestinationId;
						nleg.capacityId = "2";
						if (indexFirstLeg > 0 && n == 0
								&& (leg.destinationId.equals(leg.previousDestinationId)
										|| leg.previousDestinationId.equals("0")
										|| leg.destinationId.equals(newitinerary.legs.get(prev).destinationId))) {
							nleg.prevCapacityId = Long.toString(newitinerary.legs.get(prev).getID());
						}
						if (n > 0)
							nleg.prevCapacityId = Long.toString(found.legs.get(n - 1).getID());
						if (n < m - 1)
							nleg.nextCapacityId = Long.toString(found.legs.get(n + 1).getID());
						if (indexLastLeg < ultimo && n == m - 1) {
							nleg.nextCapacityId = Long.toString(newitinerary.legs.get(nt).getID());
						}
						//refreshCostCo2legparallels(newitinerary, nleg, capacityToFind, true);
						newitinerary.legs.add(nleg);
						n++;
					}
					if (movetruck) {
						if (newitinerary.legs.get(nt).isTRUCKLeg()) {
							if (newitinerary.legs.get(nt).startTime.before(found.endTime)) {
								long duration = newitinerary.legs.get(nt).getDurationLong();
								newitinerary.legs.get(nt).startTime = found.endTime;
								newitinerary.legs.get(nt).setEndTime(found.endTime.getTimeInMillis() + duration);
							}
						}
					}
					yeswecan = true;
					break;
				}
			}
		}
		if (yeswecan) {
			LOG.info("Found!");
			return indexLastLeg;
		} else {
			LOG.info("No good");
			if (nLegsOriginalItinerary > 2) {
				if (indexLastLeg < ultimo) {
					LOG.info("Try to another");
					int ret = searchotheritineraryMultiple(newitinerary, indexFirstLeg, nt, nLegsOriginalItinerary,
							request, crequest, arrivaltime, capacityRequest);
					if (ret > 0) {
						return ret;
					} else {
						LOG.info("searchotheritinerary non found");
						return -1;
					}
				} else
					return -1;
			} else
				return -1;
		}
	}

	private int checkprev(Itinerary newitinerary, int indexFirstLeg, Leg leg) {
		StringTokenizer st = new StringTokenizer(leg.destinationId, "-");
		int prev = -1;
		List<Integer> list = new ArrayList<>();
		while (st.hasMoreElements()) {
			list.add(Integer.parseInt(st.nextElement().toString()));
		}
		int count = 0;
		for (Leg nleg : newitinerary.legs) {
			if (count < indexFirstLeg) {
				List<Integer> leglist = new ArrayList<>();
				StringTokenizer str = new StringTokenizer(nleg.destinationId, "-");
				while (str.hasMoreElements()) {
					leglist.add(Integer.parseInt(str.nextElement().toString()));
				}
				Boolean ok = false;
				for (int i = 0; i < list.size(); i++) {
					for (int j = 0; j < leglist.size(); j++) {
						if (list.get(i).equals(leglist.get(j))) {
							ok = true;
						}
					}
					if (!ok)
						break;
				}
				if (ok)
					prev = count;
			}
			count++;
		}
		return prev;

	}

	private int[] getDestinationId(String destinationID) {
		String[] destination = destinationID == null ? null : destinationID.split("-");
		int[] destinationid = new int[destination.length];
		for (int i = 0; i < destination.length; i++) {
			destinationid[i] = Integer.parseInt(destination[i]);
		}
		return destinationid;
	}

//	private void merge2itinerary(int capacityRequest, List<Itinerary> itinerariesFinal) {
//		Map<Itinerary, Integer> mapItineraryforMerge2 = new ConcurrentHashMap<>();
//		for (Map.Entry<Itinerary, Integer> itinerary : mapItineraryMaxCapacity.entrySet()) {
//			mapItineraryforMerge2.put(itinerary.getKey(), itinerary.getValue());
//		}
//		LOG.info("Start search 2 itineraries");
//		for (Map.Entry<Itinerary, Integer> itinerary : mapItineraryMaxCapacity.entrySet()) {
//			for (Map.Entry<Itinerary, Integer> itinerary2 : mapItineraryforMerge2.entrySet()) {
//				if (!itinerary.getKey().equals(itinerary2.getKey())) {
//					if (itinerary.getValue() + itinerary2.getValue() >= capacityRequest) {
//						Boolean check = true;
//						for (Leg leg1 : itinerary.getKey().legs) {
//							for (Leg leg2 : itinerary2.getKey().legs) {
//								check = checkleg(leg1, leg2);
//								if (!check)
//									break;
//							}
//							if (!check)
//								break;
//						}
//						if (check) {
//							Itinerary newItinerary = new Itinerary();
//							newItinerary.cloneItinerary(itinerary.getKey(), true);
//							Calendar partenza1 = newItinerary.startTime;
//							Calendar partenza2 = itinerary2.getKey().startTime;
//							Calendar arrivo1 = newItinerary.endTime;
//							Calendar arrivo2 = itinerary2.getKey().endTime;
//							int boarding1 = 0;
//							int boarding2 = 0;
//							int boarding = 0;
//							Boolean flag = false;
//							for (Leg leg : newItinerary.legs) {
//								LOG.info("Itinerary: leg form: " + leg.from.name + " to: " + leg.to.name);
//								leg.assignedcontainers = itinerary.getValue();
//								refreshCostCo2leg(newItinerary, leg, false, capacityRequest);
//								if (!flag) {
//									boarding1 = leg.boarding;
//									flag = true;
//								}
//							}
//							flag = false;
//							for (Leg legfound : itinerary2.getKey().legs) {
//								LOG.info("Itinerary2: leg form: " + legfound.from.name + " to: " + legfound.to.name);
//								Leg leg = new Leg();
//								leg.cloneLeg(legfound);
//								leg.capacityId = "2";
//								leg.assignedcontainers = capacityRequest - itinerary.getValue();
//								if (leg.isTRUCKLeg()) {
//									leg.costforonecontainerTruck = leg.totalcost;
//									leg.totalcost = leg.totalcost * leg.assignedcontainers;
//									leg.CO2 = leg.CO2 * leg.assignedcontainers;
//									leg.costCO2 = leg.costCO2 * leg.assignedcontainers;
//								}
//								if (!flag) {
//									boarding1 = leg.boarding;
//									flag = true;
//								}
//								newItinerary.addLegFromAnotherItineraryForCapacity(leg);
//							}
//							if (partenza2.before(partenza1)) {
//								newItinerary.startTime = partenza2;
//								boarding = boarding2;
//							} else {
//								boarding = boarding1;
//							}
//							if (arrivo2.getTimeInMillis() > arrivo1.getTimeInMillis()) {
//								newItinerary.endTime = arrivo2;
//							}
//							newItinerary.duration = ((newItinerary.endTime.getTimeInMillis()
//									- newItinerary.startTime.getTimeInMillis()) / 1000) + boarding;
//							itinerariesFinal.add(newItinerary);
//						}
//					}
//				}
//
//			}
//			mapItineraryforMerge2.remove(itinerary.getKey());
//		}
//	}

	/*private void refreshCostCo2leg(Itinerary itinerary, Leg leg, Boolean flag, int capacityRequest) {
		if (leg.isTRUCKLeg()) {
			itinerary.CO2TRUCK -= leg.CO2;
			itinerary.totalcostTRUCK -= leg.totalcost;
			itinerary.totalcost -= leg.totalcost;
			itinerary.CO2 -= leg.CO2;
			itinerary.costCO2 -= leg.costCO2;
			leg.costforonecontainerTruck = leg.totalcost;
			leg.totalcost = leg.totalcost * leg.assignedcontainers;
			if (!flag) {
				leg.CO2 = (leg.CO2 / capacityRequest) * leg.assignedcontainers;
				leg.costCO2 = (leg.costCO2 / capacityRequest) * leg.assignedcontainers;
			}
			itinerary.CO2TRUCK += leg.CO2;
			itinerary.totalcostTRUCK += leg.totalcost;
			itinerary.totalcost += leg.totalcost;
			itinerary.CO2 += leg.CO2;
			itinerary.costCO2 += leg.costCO2;
		}
	}*/

	private void refreshCostCo2legparallels(Itinerary itinerary, Leg leg, int capacityRequest, Boolean flag) {
		if (leg.isTRUCKLeg()) {
			if (flag) {
				leg.costforonecontainerTruck = leg.totalcost;
				leg.totalcost = leg.totalcost * leg.assignedcontainers;
				leg.CO2 = (leg.CO2 / capacityRequest) * leg.assignedcontainers;
				leg.costCO2 = (leg.costCO2 / capacityRequest) * leg.assignedcontainers;
			}
			itinerary.CO2TRUCK += leg.CO2;
			itinerary.totalcostTRUCK += leg.totalcost;
			itinerary.totalcost += leg.totalcost;
			itinerary.CO2 += leg.CO2;
			itinerary.costCO2 += leg.costCO2;
		}
		if (leg.isTRAINLeg()) {
			itinerary.CO2TRAIN += leg.CO2;
			itinerary.totalcostTRAIN += leg.totalcost;
			itinerary.totalcost += leg.totalcost;
			itinerary.CO2 += leg.CO2;
			itinerary.costCO2 += leg.costCO2;
		}
		if (leg.isSHIPLeg()) {
			itinerary.CO2SHIP += leg.CO2;
			itinerary.totalcostSHIP += leg.totalcost;
			itinerary.totalcost += leg.totalcost;
			itinerary.CO2 += leg.CO2;
			itinerary.costCO2 += leg.costCO2;
		}
	}

	private void calculateItinerariesMaxCapacity(List<Itinerary> itineraries) {
		LOG.info("Finding max capacity for each itinerary");
		if (itineraries.isEmpty()) { 
			LOG.error("listItineraries is empty");
			return;
		}
		
		for (Itinerary itinerary : itineraries) {
			//calculate max capacity for each itinerary
			List<Leg> listLeg = itinerary.legs;
			if (listLeg.isEmpty()) {
				LOG.warn("listLeg is empty");
			}
			
			int maxCapacity = Integer.MAX_VALUE;
			for (Leg leg : listLeg) {
				//if the mode is not truck and the maxCapacity of the itinerary is higher then the leg capacity
				//update the new max capacity
				if (!leg.isTRUCKLeg() && maxCapacity > leg.capacity)
							maxCapacity = leg.capacity;
			}
			
			mapItineraryMaxCapacity.put(itinerary, maxCapacity);

		}
		
	}

	private Date starttime(int indexFirstLeg, RoutingRequest request, Leg leg) {
		if (indexFirstLeg == 0)
			return request.getDateTime();
		else
			return leg.startTime.getTime();
	}

	private Boolean checkleg(Leg nleg, Leg check) {
		if (nleg.mode.equals(check.mode)) {
			if (nleg.from.name.equals(check.from.name)) {
				if (nleg.to.name.equals(check.to.name)) {
					if (nleg.startTime.equals(check.startTime)) {
						if (nleg.endTime.equals(check.endTime)) {
							return false;
						}
					}
				}
			}
		}
		return true;
	}

	private void refreshTotalCost(List<Itinerary> itinerariesFinal) {
		for (Itinerary it : itinerariesFinal) {
			it.CO2 = (double) 0;
			it.CO2SHIP = (double) 0;
			it.CO2TRAIN = (double) 0;
			it.CO2TRUCK = (double) 0;
			it.costCO2 = (double) 0;
			it.totalcost = (double) 0;
			it.totalcostSHIP = (double) 0;
			it.totalcostTRAIN = (double) 0;
			it.totalcostTRUCK = (double) 0;
			for (Leg leg : it.legs) {
				refreshCostCo2legparallels(it, leg, 0, false);
			}
		}
	}
}
