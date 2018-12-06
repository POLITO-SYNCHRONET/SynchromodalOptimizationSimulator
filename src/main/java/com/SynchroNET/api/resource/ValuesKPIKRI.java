package com.SynchroNET.api.resource;

public class ValuesKPIKRI {

	private double KPICO2;
	private double KPIDistance;
	private double KPITime;
	private double KRISafety;
	private double KRICost;
	private double KRIFlexibility;
	private double KRITime;
	
	public ValuesKPIKRI(double KPICO2, double KPIDistance, double KPITime, double KRISafety, double KRICost, double KRIFlexibility,double KRITime) {
		this.KPICO2 = KPICO2;
		this.KPIDistance = KPIDistance;
		this.KPITime = KPITime;
		this.KRISafety = KRISafety;
		this.KRICost = KRICost;
		this.KRIFlexibility = KRIFlexibility;
		this.KRITime = KRITime;
	}

	public double getKPICO2() {
		return KPICO2;
	}

	public void setKPICO2(double kPICO2) {
		KPICO2 = kPICO2;
	}

	public double getKPIDistance() {
		return KPIDistance;
	}

	public void setKPIDistance(double kPIDistance) {
		KPIDistance = kPIDistance;
	}

	public double getKPITime() {
		return KPITime;
	}

	public void setKPITime(double kPITime) {
		KPITime = kPITime;
	}

	public double getKRISafety() {
		return KRISafety;
	}

	public void setKRISafety(double kRISafety) {
		KRISafety = kRISafety;
	}

	public double getKRICost() {
		return KRICost;
	}

	public void setKRICost(double kRICost) {
		KRICost = kRICost;
	}

	public double getKRIFlexibility() {
		return KRIFlexibility;
	}

	public void setKRIFlexibility(double kRIFlexibility) {
		KRIFlexibility = kRIFlexibility;
	}

	public double getKRITime() {
		return KRITime;
	}

	public void setKRITime(double kRITime) {
		KRITime = kRITime;
	}
}
