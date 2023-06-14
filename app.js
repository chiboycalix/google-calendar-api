const express = require("express");
const dotenv = require("dotenv");
const { google } = require("googleapis");
const fetch = require("node-fetch");
const credentials = require("./credentials.json");

dotenv.config();

const app = express();
const port = 3001;

const { client_id, client_secret, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

app.get("/connect", (req, res) => {
  // Generate a URL that asks permissions for Google Calendar scopes
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
  res.redirect(url);
});

app.get("/refresh", (req, res) => {
  const refresh_token = req.query.refresh_token;
  oAuth2Client.setCredentials({
    refresh_token: refresh_token,
  });

  oAuth2Client.refreshAccessToken((err, tokens) => {
    if (err) {
      console.error("Error refreshing access token:", err);
      res.status(500).send("Error refreshing access token");
      return;
    }
    const access_token = tokens.access_token;
    console.log("Refresh token:", access_token);
    res.send("Refresh token successful!");
  });
});

app.get("/add-event", async (req, res) => {
  // add event to calendar
  const event = {
    summary: "Google I/O 2021",
    location: "800 Howard St., San Francisco, CA 94103",
    description: "A chance to hear more about Google's developer products.",
    start: {
      dateTime: "2023-06-15T09:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: "2023-05-16T17:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    recurrence: ["RRULE:FREQ=DAILY;COUNT=2"],
  };

  try {
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    const addedEvent = await calendar.events.insert({
      auth: oAuth2Client,
      calendarId: "primary",
      resource: event,
    });

    console.log(addedEvent)
    res.json({
      status: "ok",
      message: "Event added successfully.",
    })
  } catch (error) {
    console.log(error);
  }
});

app.get("/callback", (req, res) => {
  const authorizationCode = req.query.code;

  oAuth2Client.getToken(authorizationCode, (err, tokens) => {
    if (err) {
      console.error("Error retrieving access token:", err);
      res.status(500).send("Error retrieving access token");
      return;
    }
    oAuth2Client.setCredentials(tokens);
    const access_token = tokens.access_token;
    console.log("Refresh token:", access_token);
    res.send("Authentication successful!");
  });
});

app.get("/revoke", async (req, res) => {
  const access_token = req.query.access_token;
  try {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: access_token,
      }),
    });

    if (response.ok) {
      console.log("Access token revoked successfully.");
    } else {
      console.log(response);
      console.error("Failed to revoke access token:", response.status);
    }
    res.json({
      status: "ok",
      message: "Access token revoked successfully.",
    });
  } catch (err) {
    console.error("Error revoking access token:", err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
