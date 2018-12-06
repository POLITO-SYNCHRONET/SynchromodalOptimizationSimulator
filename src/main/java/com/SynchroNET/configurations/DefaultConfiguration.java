package com.SynchroNET.configurations;

public class DefaultConfiguration {

	public static final double cost_distance_per_km_train=0.3;
	public static final double cost_distance_per_km_truck=0.4;
	public static final double cost_distance_per_km_ship=0.001;
//	public static final double cost_distance_per_km_train=0.0324;
//	public static final double cost_distance_per_km_truck=0.4;
//	public static final double cost_distance_per_km_ship=0.108;
	public static final double cost_per_hour=2;
//	public static final double cost_per_hour=35;
	
	public static final double co2_cost_per_kg=0.15;
	public static final double co2_per_km_train=0.06;
	public static final double co2_per_km_truck=0.25;
	public static final double co2_per_km_feeder_ship_Slow=60;
	public static final double co2_per_km_feeder_ship_Medium=80;
	public static final double co2_per_km_feeder_ship_Fast=100;
	public static final double co2_per_km_big_ship_Slow=450;
	public static final double co2_per_km_big_ship_Medium=600;
	public static final double co2_per_km_big_ship_Fast=750;

	public static final int boarding_time_truck=60;
	public static final int boarding_time_rail=120;
	public static final int boarding_time_ship_lolo=360;
	public static final int boarding_time_ship_roro=180;

	public static final int alighting_time_truck=60;
	public static final int alighting_time_rail=120;
	public static final int alighting_time_ship_lolo=360;
	public static final int alighting_time_ship_roro=180;

	public static final int capacity_rail=200;
	public static final int capacity_feeder_ship=1000;
	public static final int capacity_oceanic_ship=13500;
	
	public static final double KPICO2 = 0.33;
	public static final double KPIDistance = 0.33;
	public static final double KPITime = 0.34;
	public static final double KRISafety = 0.25;
	public static final double KRICost = 0.25;
	public static final double KRIFlexibility = 0.25;
	public static final double KRITime = 0.25;
}
