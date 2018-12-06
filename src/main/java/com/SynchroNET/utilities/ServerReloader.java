package com.SynchroNET.utilities;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.management.ManagementFactory;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

import org.opentripplanner.api.common.RoutingResource;
import org.opentripplanner.graph_builder.GraphBuilder;
import org.opentripplanner.routing.graph.Graph;
import org.opentripplanner.routing.impl.DefaultStreetVertexIndexFactory;
import org.opentripplanner.routing.impl.GraphScanner;
import org.opentripplanner.routing.impl.InputStreamGraphSource;
import org.opentripplanner.routing.impl.MemoryGraphSource;
import org.opentripplanner.routing.services.GraphService;
import org.opentripplanner.scripting.impl.BSFOTPScript;
import org.opentripplanner.scripting.impl.OTPScript;
import org.opentripplanner.standalone.CommandLineParameters;
import org.opentripplanner.standalone.GrizzlyServer;
import org.opentripplanner.standalone.OTPMain;
import org.opentripplanner.standalone.OTPServer;
import org.opentripplanner.standalone.Router;
import org.opentripplanner.visualizer.GraphVisualizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.commons.lang3.SystemUtils;

public class ServerReloader {

//    private static final Logger LOG = LoggerFactory.getLogger(GraphLoader.class);
    public static final String SUN_JAVA_COMMAND = "sun.java.command";
    
	public static void reloadGraph(String folder) throws IOException{
		try {
			// java binary
			//String java = System.getProperty("java.home") + "/bin/java";
			String java = "java";
			// vm arguments
			List<String> vmArguments = ManagementFactory.getRuntimeMXBean().getInputArguments();
			StringBuffer vmArgsOneLine = new StringBuffer();
			for (String arg : vmArguments) {
				// if it's the agent argument : we ignore it otherwise the
				// address of the old application and the new one will be in conflict
				if (!arg.contains("-agentlib")) {
				vmArgsOneLine.append(arg);
				vmArgsOneLine.append(" ");
				}
			}
			// init the command to execute, add the vm args
//			final StringBuffer cmd = new StringBuffer("\"" + java + "\" " + vmArgsOneLine);
			final StringBuffer cmd;
			System.out.println(System.getProperty(SUN_JAVA_COMMAND));
			// program main and program arguments
			String[] mainCommand = System.getProperty(SUN_JAVA_COMMAND).split(" ");
			// program main is a jar
			if (mainCommand[0].endsWith(".jar")) {
			// if it's a jar, add -jar mainJar
				cmd = new StringBuffer(java + " " + vmArgsOneLine);
				cmd.append("-jar " + new File(mainCommand[0]).getPath());
			} else {
			// else it's a .class, add the classpath and mainClass
				cmd = new StringBuffer("\"" + java + "\" " + vmArgsOneLine);
				cmd.append("-cp \"" + System.getProperty("java.class.path") + "\" " + mainCommand[0]);
			}
			// finally add program arguments
			String buildGraph = cmd.toString() + " --build " + folder;
			for (int i = 1; i < mainCommand.length; i++) {
				cmd.append(" ");
				cmd.append(mainCommand[i]);
			}
			// execute the command in a shutdown hook, to be sure that all the
			// resources have been disposed before restarting the application

			// execute some custom code before restarting

				String finalCmd = "";
//				if(!mainCommand[0].endsWith(".jar")){
//					finalCmd = cmd.toString();
////				} else if(SystemUtils.IS_OS_WINDOWS) {
////					finalCmd = "runas.exe /savecred /user:administrator \"" + cmd.toString() + "\"";
////					buildGraph = "call " + buildGraph;
////				} else if(SystemUtils.IS_OS_LINUX){
////					finalCmd = "sudo " + cmd.toString();
////					buildGraph = "sudo " + cmd.toString();
////				}
				if(SystemUtils.IS_OS_UNIX) finalCmd += "R_HOME=/usr/lib/R ";
						
				finalCmd += cmd.toString();
				if(SystemUtils.IS_OS_WINDOWS) buildGraph = "call " + buildGraph;

				System.out.println(finalCmd);
				
				FileOutputStream fop = null;
				File file;

				String script;
				String launcher;
				if(SystemUtils.IS_OS_WINDOWS) {
					script  = folder + "/restart.bat";
					launcher = folder + "/launcher.bat";
				}
				else {
					script = folder + "/restart.sh";
					launcher = folder + "/launcher.sh";
				}
				
				System.out.println(script);
				System.out.println(launcher);
					file = new File(script);
					fop = new FileOutputStream(file, false);

					// if file doesnt exists, then create it
					if (!file.exists()) {
						file.createNewFile();
					}
					
//					 get the content in bytes
					
					if(SystemUtils.IS_OS_UNIX) fop.write("#!/bin/sh\n".getBytes());
					fop.write(buildGraph.getBytes());
					fop.write("\n".getBytes());
					fop.write(finalCmd.getBytes());
					fop.flush();
					fop.close();
					
					file = new File(launcher);
					fop = new FileOutputStream(file, false);
					if (!file.exists()) {
						file.createNewFile();
					}
					
					String runLauncher;
//					 get the content in bytes
					if(SystemUtils.IS_OS_UNIX) { 
						fop.write("#!/bin/sh\n".getBytes());
						script = "sudo " + script;
						runLauncher = "sudo " + launcher;
					} else {
						runLauncher = launcher;
						script = "runas.exe /savecred /user:administrator " + script;
					}
					fop.write( script.getBytes() );
					fop.flush();
					fop.close();
					
					Runtime.getRuntime().addShutdownHook(new Thread() {
						@Override
							public void run() {
										
									try {
										Runtime.getRuntime().exec(runLauncher);
									} catch (IOException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								
							}
						});
					
					// exit
					System.exit(0);
			}
			catch (Exception e) {
			// something went wrong
			throw new IOException("Error while trying to restart the application", e);
			}
		  
//        /* Create the top-level objects that represent the OTP server. */
//        makeGraphService(params, graphService);
//        otpServer = new OTPServer(params, graphService);
//
//        /* Start graph builder if requested */
//        if (params.build != null) {
//            GraphBuilder graphBuilder = GraphBuilder.forDirectory(params, params.build); // TODO multiple directories
//            if (graphBuilder != null) {
//                graphBuilder.run();
//                /* If requested, hand off the graph to the server as the default graph using an in-memory GraphSource. */
//                if (params.inMemory || params.preFlight) {
//                    Graph graph = graphBuilder.getGraph();
//                    graph.index(new DefaultStreetVertexIndexFactory());
//                    // FIXME set true router IDs
//                    graphService.registerGraph("", new MemoryGraphSource("", graph, graphBuilder.routerConfig));
//                }
//            } else {
//                LOG.error("An error occurred while building the graph. Exiting.");
//                System.exit(-1);
//            }
//        }
//
//        /* Scan for graphs to load from disk if requested */
//        // FIXME eventually router IDs will be present even when just building a graph.
//        if ((params.routerIds != null && params.routerIds.size() > 0) || params.autoScan) {
//            /* Auto-register pre-existing graph on disk, with optional auto-scan. */
//            GraphScanner graphScanner = new GraphScanner(graphService, params.graphDirectory, params.autoScan);
//            graphScanner.basePath = params.graphDirectory;
//            if (params.routerIds != null && params.routerIds.size() > 0) {
//                graphScanner.defaultRouterId = params.routerIds.get(0);
//            }
//            graphScanner.autoRegister = params.routerIds;
//            graphScanner.startup();
//        }
//
//        /* Start visualizer if requested */
//        if (params.visualize) {
//            Router defaultRouter = graphService.getRouter();
//            defaultRouter.graphVisualizer = new GraphVisualizer(defaultRouter);
//            defaultRouter.graphVisualizer.run();
//            defaultRouter.timeouts = new double[] {60}; // avoid timeouts due to search animation
//        }
//
//        /* Start script if requested */
//        if (params.scriptFile != null) {
//            try {
//                OTPScript otpScript = new BSFOTPScript(otpServer, params.scriptFile);
//                if (otpScript != null) {
//                    Object retval = otpScript.run();
//                    if (retval != null) {
//                        LOG.warn("Your script returned something, no idea what to do with it: {}", retval);
//                    }
//                }
//            } catch (Exception e) {
//                throw new RuntimeException(e);
//            }
//        }
//
//        /* Start web server if requested */
//        if (params.server) {
//        	params.myServer.shutdown();
//            GrizzlyServer grizzlyServer = new GrizzlyServer(params, otpServer);
//            while (true) { // Loop to restart server on uncaught fatal exceptions.
//                try {
//                    grizzlyServer.run();
//                    return;
//                } catch (Throwable throwable) {
//                    LOG.error("An uncaught {} occurred inside OTP. Restarting server.",
//                            throwable.getClass().getSimpleName(), throwable);
//                }
//            }
//        }

	}
	
//    private static void makeGraphService (CommandLineParameters params, GraphService graphService) {
//        graphService = new GraphService(params.autoReload);
//        InputStreamGraphSource.FileFactory graphSourceFactory =
//                new InputStreamGraphSource.FileFactory(params.graphDirectory);
//        graphService.graphSourceFactory = graphSourceFactory;
//        if (params.graphDirectory != null) {
//            graphSourceFactory.basePath = params.graphDirectory;
//        }
//    }
	
}
