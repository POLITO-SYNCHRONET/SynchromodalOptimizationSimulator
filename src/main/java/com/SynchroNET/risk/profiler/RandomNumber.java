package com.SynchroNET.risk.profiler;

import java.util.List;
import java.util.Objects;

import org.rosuda.JRI.Rengine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import weka.attributeSelection.AttributeSelection;
import weka.attributeSelection.BestFirst;
import weka.attributeSelection.CfsSubsetEval;
import weka.attributeSelection.GainRatioAttributeEval;
import weka.attributeSelection.OneRAttributeEval;
import weka.attributeSelection.PrincipalComponents;
import weka.attributeSelection.Ranker;
import weka.attributeSelection.ReliefFAttributeEval;
import weka.core.Instances;

public class RandomNumber {
/*
 * EDIT - Yuanyuan(5/5/2017) Generate random time deviation for different mode
 * */
	private static final Logger LOG = LoggerFactory.getLogger(RandomNumber.class);
	static Rengine engine = new Rengine(new String[] { "--no-save"}, false, null);
	
	// for truck. using normal distribution
	public int timeDevTruck(int duration, int seed) {
		double mean = 20*duration/200; // the delay of 20 min for 1 unit(200 min) 
		double stdev = 20; 
		int n = 1; // just generate 1 number
		
		// for seq function
		/* int from = -100;
		int to = 120;
		int by = 1; */
		
		engine.eval("mean=" + mean);
		engine.eval("stdev=" + stdev);
		engine.eval("n=" + n);
		/* engine.eval("from=" + from);
		engine.eval("to=" + to);
		engine.eval("by=" + by);
		engine.eval("x=seq(from, to, by)"); */
		
		// choose the mean as 10 and standard deviation as 30
		engine.eval("seedValue="+ seed);
		engine.eval("set.seed(seedValue)");
		 engine.eval("numArray = rnorm(n, mean, stdev)");
		
		double[] numArray = engine.eval("numArray").asDoubleArray();
		// LOG.info("The time deviation of truck is " + numArray[0]);
		
		return (int) numArray[0];
	} 
	
	/*******                      to modify parameters                         *****/
	// for fast ship, using Gamma distribution
	public int timeDevFastShip(int duration, int seed) {
		// use rgamme(n, shape, rate=1, scale = 1/rate)
		double shape = 20;
		double scale = 1.2;
		int n = 1;
		
		engine.eval("shape="+ shape);
		engine.eval("scale=" + scale);
		engine.eval("n=" + n);
		
		/*EDIT-Yuanyuan-13/06/2018: Set seed for reproducing the random number*/
		engine.eval("seedValue="+ seed);
		engine.eval("set.seed(seedValue)");
		engine.eval("numArray = rgamma(n, shape, scale)");
		
		double[] numArray = engine.eval("numArray").asDoubleArray();
		int number = (int)numArray[0];
		number = number*duration/200; // normalize with 200 minutes as 1 unit
		LOG.info("The time deviation of fast ship is " + number);
		return number;
	}
	
	// for slow ship, using Gamma distribution
		public int timeDevSlowShip(int duration, int seed) {
			// use rgamme(n, shape, rate=1, scale = 1/rate)
			double shape = 7.5;
			double scale = 1;
			int n = 1;
			
			engine.eval("shape="+ shape);
			engine.eval("scale=" + scale);
			engine.eval("n=" + n);
			
			/*EDIT-Yuanyuan-13/06/2018: Set seed for reproducing the random number*/
			engine.eval("seedValue="+ seed);
			engine.eval("set.seed(seedValue)");
			engine.eval("numArray = rgamma(n, shape, scale)");
			
			double[] numArray = engine.eval("numArray").asDoubleArray();
			LOG.info("The time deviation of slow ship is " + numArray[0]);
			
			int number = (int)numArray[0];
			number = number*duration/200; // normalize with 200 minutes as 1 unit
			return number;
		}
		
		/*                             End                                       */
		
		/*EDIT - Yuanyuan(08/05/2017) for train, using bimodal combined by normal and gamma distributions*/
		public int timeDevTrain(int duration, int seed) {
			int n = 100;
			double cpct = 0.4;//0.6;
			double shape = 50;//20;
			double scale = 1.2;
			double mu1 = 3;
			double sig1 = 3;//Math.log(3);
			
			engine.eval("n="+ n);
			engine.eval("cpct="+ cpct);
			engine.eval("shape="+ shape);
			engine.eval("scale=" + scale);
			engine.eval("mu1="+ mu1);
			engine.eval("sig1=" + sig1);
			engine.eval("seedValue="+ seed);
			engine.eval("set.seed(seedValue)");
			
			engine.eval("bimodalDistFunc= function(n, cpct, mul, shape, scale, sig1){"
					+ "y0 = rnorm(n, mean = mu1, sd = sig1);"
					+ "y1 = rgamma(n, shape = shape, scale = scale);"
					+ "flag = rbinom(n, size=1, prob= cpct);"
					+ "y = y0*(1 - flag) + y1*flag}");
			engine.eval("bimodalData= bimodalDistFunc(n, cpct, mu1, shape, scale, sig1)");
			/*EDIT-Yuanyuan-13/06/2018: Set seed for reproducing the random number*/
			engine.eval("set.seed(1234)");
			engine.eval("num= sample(bimodalData, size=1)");
			
			double[] numArray = engine.eval("num").asDoubleArray();
			// LOG.info("The time deviation of train is " + numArray[0]);
			
			int number = (int)numArray[0];
			number = number*duration/200; // normalize with 200 minutes as 1 unit
			// LOG.info("The time deviation of train is " + numArray[0]);
			return number;
			/* double num = engine.eval("num").asDouble();
			LOG.info("The time deviation of train is " + num);
			
			return (int) num; */
		
		}
		
		public static void testDBConnection() {
			final String host0 = "localhost";
			final String userName = "root";
			final String password0 = "root";
			final String dbName = "synchronet";
			
			engine.eval("host="+ host0);
			engine.eval("userName="+ userName);
			engine.eval("password="+ password0);
			engine.eval("dbName=" + dbName);
			
			org.rosuda.JRI.REXP x;
			// engine.eval("library(RMySQL)");
			System.out.println(x=engine.eval("library(\"RMySQL\")"));
			
			engine.eval("mydb= dbConnect(MySQL(), user = 'root', password='root', dbname='synchronet', host = 'localhost')" );
			System.out.println(x=engine.eval("dbListTables(mydb)"));
			engine.eval("rs= dbSendQuery(mydb, 'select LID from links')");
			
			// double[] result_a = engine.eval("dbGetQuery(mydb, 'select LID from links')").asList().at(1).asDoubleArray(); 
			 engine.eval("rs= dbGetQuery(mydb, 'select LID from links')");
			 System.out.println(x=engine.eval("data = fetch(rs, n=-1)"));
			 System.out.println(x.asList().at(0));
			 System.out.println(x.asIntArray());
			 
			 // connect connection
			 engine.eval("dbDisconnect(mydb)");
			// int[] result = engine.eval("data").asIntArray();
		///	x=engine.eval("data = fetch(rs, n=-1)");
		///	double[] result = x.asDoubleArray();
			/*for (int i = 0; i < result_a.length; i++) 
				LOG.info("Check " + result_a[i]);*/
				///	System.out.println(Arrays.asList(result));
				///LOG.info("Test db result is " + result.toString());
		}

		public static org.rosuda.JRI.REXP getTruckDeviation() {
			final String host0 = "localhost";
			final String userName = "root";
			final String password0 = "root";
			final String dbName = "synchronet";
			
			engine.eval("host="+ host0);
			engine.eval("userName="+ userName);
			engine.eval("password="+ password0);
			engine.eval("dbName=" + dbName);
			
			org.rosuda.JRI.REXP x;
			engine.eval("library(\"RMySQL\")");
			engine.eval("mydb= dbConnect(MySQL(), user = 'root', password='root', dbname='synchronet', host = 'localhost')" );
			engine.eval("query= 'select timeDeviation from history_time_deviations where PID in(select PID from planned_links where LID in (select LID from links where transportMode='BUS' ))'");
			engine.eval("rs= dbGetQuery(mydb, query)");
			LOG.info("Check:");
			System.out.println(x=engine.eval("rs)"));
			System.out.println( x=engine.eval("data = fetch(rs, n=-1)"));
			engine.eval("dbDisconnect(mydb)");
			return x;
		}
		
		
		/*EDIT(16/05/2017) - Yuanyuan draw R plots for both input and output*/
		public static void drawTruck() {
			
			// input
			double mean = 20;
			double stdev = 40;
			
			engine.eval("mean=" + mean);
			engine.eval("stdev=" + stdev);
			
			engine.eval("x=seq(-100, 100, by=1)");
			engine.eval("y=pnorm(x, mean=mean, sd=stdev)");
			// engine.eval("plot(x, y, type='l', col='red')");
			
			// output
			List<Integer> timeDevs = RiskDataBaseManager.getTimeDeviation("BUS");
			LOG.info("Check " + timeDevs);
			StringBuilder builder = new StringBuilder();
			// Use exact R vector format
			builder.append("c(");
			
			int i = 0;
			for (long value : timeDevs) {
				String temp = Objects.toString(value, null);
				builder.append(temp);
				i++;
				if (i != timeDevs.size())
					builder.append(",");
			}
			builder.append(")");
			String dataVector = builder.toString();
			engine.eval("outTime="+ dataVector);
			engine.eval("out=ecdf(outTime)");
			// hide the axes of 1st plot
			engine.eval("plot(out(x),  , xlab = '', ylab = '', xaxt='n', yaxt='n')");
			engine.eval("par(new=TRUE)");
			engine.eval("plot(x, y, type='l', col='red', xlab = 'x', ylab = 'y')");
			// engine.eval("axis(1, at=x,labels=x, col.axis='red', las=2)");
			// engine.eval("Axis(side=2)");
			/*engine.eval("plot(out(x),  , xlab = '', ylab = '', axes=F)");
			engine.eval("par(new=TRUE)");
			engine.eval("plot(x, y, type='l', col='red', xlab = 'x', ylab = 'y')");*/
			
			// engine.eval("lines(x, y, col='green')");
			// engine.eval("curve(y, add=TRUE)");
		}
		

		/*
		 * EDIT - Yuanyuan(21/07/2017) Generate random number to estimate mode/path change probability
		 * */
		public double changeNum() {
			engine.eval("num = runif(n=1, min=0, max=1)");
			double[] numArray = engine.eval("num").asDoubleArray();
			return numArray[0];
		}
		
		  protected String useLowLevel(Instances data) throws Exception {
		      LOG.info("\n3. Low-level");
		      AttributeSelection attsel = new AttributeSelection();
		   // EDIT-Yuanyuan (01/08/2018): Modify the evaluation method
		     Ranker search = new Ranker();
		     // BestFirst search = new BestFirst();
		      ReliefFAttributeEval evals = new ReliefFAttributeEval();
		     //  PrincipalComponents evals = new PrincipalComponents();
		      // OneRAttributeEval evals = new OneRAttributeEval();
		    // CfsSubsetEval evals = new CfsSubsetEval();
		      attsel.setRanking(true);
		      attsel.setEvaluator(evals);
		      attsel.setSearch(search);
		      attsel.SelectAttributes(data);
		      // un-comment here to display the results from the ranking
		     LOG.info("Ranking result "+attsel.toResultsString());

		      // expand the ranked attributes so you can find the index, name and weight of the features
		      // Returns a X by 2 list of attribute indexes and corresponding evaluations from best (highest) to worst.
		      double[][] ranked = attsel.rankedAttributes();
		      // attsel.rankedAttributes();
		      LOG.info(attsel.numberAttributesSelected()+"ranked attributes!!!\n"); 
		      String fAttribute = "";
		      for(int i=0;i<ranked.length;i++){
		    	  	// EDIT-Yuanyuan (01/08/18): Error here, cz the attribute ranked order is not as stored in data
		        // LOG.info(" Feature:"+ data.attribute(i).name() +" weight:"+ ranked[i][1]);
		    	  int ii = (int) ranked[i][0];	
		    	  String attribute = data.attribute(ii).name();
		    	  LOG.info(" Feature:"+ attribute +" weight:"+ ranked[i][1]);
		      } 
		      int ii = (int) ranked[0][0];	
	    	  	  fAttribute = data.attribute(ii).name();
		      return fAttribute;
		}
		// EDIT-Yuanyuan 30/08/2017: Given the link, get the most discriminative property
		public String getMainFeature(String departure, String arrival, String mode) throws Exception {
			// load data
		    // LOG.info("\n0. Loading data");
		    // DataSource source = new DataSource(args[0]);
		    // Instances data = source.getDataSet();
		    RiskDataBaseManager rs = new RiskDataBaseManager();
		    
		    // EDIT-Yuanyuan(09/20/2017): enable the feature storing inside the database
		    // 1st check whether there's feature already stored for the link
		    // if there's the feature is newly created, store it inside the db
		    String feature = rs.searchFeatureFromDB(departure, arrival, mode);
		    if (feature != null) {
		    // LOG.info("The feature is got from database");
		    	return feature;
		    }
		    Instances data = rs.getTimeDeviation2(departure, arrival, mode);
		    if (data==null)
		    	return null;
		    // LOG.info("Attribute number is "+data.numAttributes()+" "+data.toSummaryString());
		   // if (data.classIndex() == -1)
		    // setting class attribute
		    data.setClassIndex(data.numAttributes() - 1); 
		    // LOG.info("Class Attribute is "+data.classAttribute());
		    // 1. meta-classifier
		    // useClassifier(data);

		    // 2. filter
		    //useFilter(data);

		    // 3. low-level
		    feature = useLowLevel(data);
		    // store into database
		    rs.addFeature(feature, departure, arrival, mode);
			return feature;
		} 
		
		// EDIT- Yuanyuan 31/08/2017: Given the collection of time deviation selected through the most discriminative property, generate the random number as time deviation
		public int getTimeDeviation(List<Integer> timeDevs) {
			// LOG.info("Check " + timeDevs);
			StringBuilder builder = new StringBuilder();
			// Use exact R vector format
			builder.append("c(");
			
			int i = 0;
			for (long value : timeDevs) {
				String temp = Objects.toString(value, null);
				builder.append(temp);
				i++;
				if (i != timeDevs.size())
					builder.append(",");
			}
			builder.append(")");
			String dataVector = builder.toString();
			LOG.info("The dataVector is "+ dataVector);
			engine.eval("outTime="+ dataVector);
			engine.eval("size=" + 1);
			org.rosuda.JRI.REXP z = engine.eval("out=sample(outTime, size, replace=TRUE)");
			LOG.info("The time deviation is "+ z + " "+z.asDouble());
			Double x = engine.eval("out").asDouble();
			LOG.info("The time deviation is "+x);
			return x.intValue(); 
		}
    	
}
