/**
 * Simple WebSocket test client for browser console testing
 * To use:
 * 1. Open your browser console on the frontend app
 * 2. Copy and paste this entire file into the console
 * 3. Call testWebSocket() to run the test
 */

function testWebSocket() {
  console.log("Starting WebSocket test...");
  
  // Create a new WebSocket connection
  const ws = new WebSocket('ws://localhost:8000/ws/query');
  
  // Connection opened
  ws.onopen = (event) => {
    console.log("Connected to WebSocket server");
    
    // Send a test query
    const testQuery = {
      subreddit: "python",
      keyword: "asyncio",
      question: "What are the best practices for using asyncio in Python?",
      limit: 5,
      repeatHours: 0,
      repeatMinutes: 0
    };
    
    console.log("Sending test query:", testQuery);
    ws.send(JSON.stringify(testQuery));
  };
  
  // Listen for messages
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);
      
      if (data.status) {
        console.log("Status update:", data.status);
      }
      
      if (data.results) {
        console.log("Final results received:", data.results);
      }
      
      if (data.error) {
        console.error("Error from server:", data.error);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      console.log("Raw message:", event.data);
    }
  };
  
  // Connection closed
  ws.onclose = (event) => {
    if (event.wasClean) {
      console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
    } else {
      console.error('Connection died');
    }
  };
  
  // Connection error
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  return ws; // Return the WebSocket instance so it can be manipulated later
}

console.log("WebSocket test client loaded. Type testWebSocket() to run the test."); 