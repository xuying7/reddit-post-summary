# WebSocket Integration with Backend

This frontend application has been updated to use WebSockets for real-time communication with the backend. This allows the frontend to receive live updates and debug information as the backend processes Reddit queries.

## How It Works

1. When a query form is submitted, the frontend establishes a WebSocket connection to the backend at `ws://localhost:8000/ws/query`.
2. The query parameters are sent as a JSON object through the WebSocket connection.
3. The backend processes the query and sends real-time status updates and debug information back to the frontend.
4. When processing is complete, the backend sends the final results to the frontend.

## WebSocket Message Format

The backend sends messages in the following JSON format:

```json
{
  "status": "Status message for debugging or progress updates",
  "results": { /* Final results object (only in the last message) */ }
}
```

Or in case of an error:

```json
{
  "error": "Error message describing what went wrong"
}
```

## Testing the WebSocket Connection

You can test the WebSocket connection using the included `test-websocket.js` script:

1. Open your browser console on the frontend application
2. Copy and paste the content of `test-websocket.js` into the console
3. Run `testWebSocket()` in the console

This will establish a WebSocket connection and send a test query, displaying all received messages in the console.

## Troubleshooting

If you encounter issues with the WebSocket connection:

1. Make sure the backend server is running at `localhost:8000`
2. Check that your browser supports WebSockets
3. Look for CORS issues in the browser console
4. Verify that the backend is correctly configured to accept WebSocket connections

## Implementation Details

The WebSocket implementation is handled in `app/page.tsx`, which:

1. Creates a WebSocket connection when a form is submitted
2. Sends the query parameters to the backend
3. Processes incoming messages and updates the UI
4. Handles connection errors and closures

The form component in `app/components/form.tsx` collects user input and passes it to the WebSocket handler in `page.tsx`. The result component in `app/components/result.tsx` displays the progress messages and final results. 