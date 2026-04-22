#!/usr/bin/env npx tsx

import { spawn, ChildProcess } from "child_process";
import path from "path";
import { I18nCoverageTester } from "../tests/i18n-coverage.test";

// Configuration
const DEV_SERVER_PORT = process.env.PORT || "3000";
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Utility to run shell commands
function runCommand(command: string, args: string[]): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_TEST_MODE: "true",
        NEXT_PUBLIC_E2E_TEST_MODE: "true",
        PORT: DEV_SERVER_PORT.toString()
      }
    });
    
    child.on("error", reject);
    
    // Resolve immediately with the child process
    // We don't wait for it to complete since it's a server
    setTimeout(() => resolve(child), 5000); // Give server 5 seconds to start
  });
}

// Utility to wait for server to be ready
async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

// Main function
async function main() {
  console.log("\n🌎 i18n Coverage Test Runner\n");

  let devServer: ChildProcess | null = null;
  let needsCleanup = false;

  try {
    // Check if dev server is already running
    console.log("Checking if dev server is running...");
    const serverRunning = await waitForServer(BASE_URL, 2);

    if (!serverRunning) {
      console.log("Starting development server...");
      devServer = await runCommand("npm", ["run", "dev"]);
      needsCleanup = true;

      // Wait for server to be ready
      console.log("Waiting for server to be ready...");
      const ready = await waitForServer(BASE_URL);
      if (!ready) {
        throw new Error("Failed to start development server");
      }
      console.log("✔ Development server is ready");
    } else {
      console.log("✔ Development server is already running");
    }

    // Initialize and run the coverage tester
    console.log("\nRunning i18n coverage tests...");
    const tester = new I18nCoverageTester(BASE_URL);

    // Set up the tester
    await tester.setup();

    // Log in for authenticated routes
    console.log("Logging in as test user...");
    await tester.loginAsTestUser();
    
    // Test all Spanish routes
    console.log("Testing Spanish routes for English leaks...");
    const routes = [
      // Public pages
      { path: "/", requiresAuth: false, description: "Landing page" },
      { path: "/sign-in", requiresAuth: false, description: "Sign in page" },
      { path: "/sign-up", requiresAuth: false, description: "Sign up page" },
      { path: "/pricing", requiresAuth: false, description: "Pricing page" },
      { path: "/about", requiresAuth: false, description: "About page" },
      { path: "/privacy", requiresAuth: false, description: "Privacy policy" },
      { path: "/terms", requiresAuth: false, description: "Terms of service" },
      
      // Candidate pages
      { path: "/candidate/dashboard", requiresAuth: true, description: "Candidate dashboard" },
      { path: "/candidate/profile", requiresAuth: true, description: "Candidate profile" },
      
      // Assessment pages
      { path: "/assessments/{id}/welcome", requiresAuth: true, requiresScenario: true, description: "Assessment welcome" },
      { path: "/assessments/{id}/work", requiresAuth: true, requiresScenario: true, description: "Assessment work page" },
      { path: "/assessments/{id}/results", requiresAuth: true, requiresScenario: true, description: "Assessment results" },
      
      // Recruiter pages
      { path: "/recruiter/simulations", requiresAuth: true, description: "Recruiter simulations list" },
      { path: "/recruiter/simulations/new", requiresAuth: true, description: "Create new simulation" },
      { path: "/recruiter/assessments", requiresAuth: true, description: "Recruiter assessments list" },
      { path: "/recruiter/candidates", requiresAuth: true, description: "Recruiter candidates list" },
      
      // Invite pages
      { path: "/invite/{scenarioId}", requiresAuth: false, requiresScenario: true, description: "Assessment invite page" },
    ];
    
    let tested = 0;
    const total = routes.length;
    
    for (const route of routes) {
      tested++;
      process.stdout.write(`[${tested}/${total}] Testing ${route.description}...\r`);
      await tester.testRoute(route as any, "es");
    }
    
    console.log(""); // New line after progress
    
    // Get the report
    const failures = tester.getFailures();
    const report = tester.generateReport();
    
    // Display the report
    console.log("\n" + "=".repeat(60));
    console.log("i18n Coverage Test Results");
    console.log("=".repeat(60) + "\n");

    if (failures.length === 0) {
      console.log("✅ All tests passed!");
      console.log("No English leaks detected in Spanish pages.");
    } else {
      console.log(`❌ ${failures.length} route(s) have English leaks\n`);

      for (const failure of failures) {
        console.log(`\nRoute: ${failure.route}`);
        console.log("Detected English phrases:");
        for (const phrase of failure.englishPhrases) {
          console.log(`  • "${phrase}"`);
        }
        if (failure.suggestedKeys.length > 0) {
          console.log("Suggested translation keys:");
          for (const key of failure.suggestedKeys) {
            console.log(`  → ${key}`);
          }
        }
      }

      console.log(`\n❌ Test failed. Fix the ${failures.length} leak(s) above.`);
    }
    
    // Clean up
    await tester.teardown();
    
    // Exit with appropriate code
    process.exit(failures.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error("\n❌ Error running i18n coverage tests:");
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up dev server if we started it
    if (needsCleanup && devServer) {
      console.log("\nStopping development server...");
      devServer.kill("SIGTERM");
    }
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});