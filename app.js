const express = require("express");
const fs = require("fs");
const dotenv = require("dotenv");
const { google } = require("googleapis");
const fetch = require("node-fetch");
const credentials = require("./credentials.json");

dotenv.config();

const app = express();
const port = 3001;

const { client_id, client_secret, redirect_uris, api_key } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const token = JSON.parse(fs.readFileSync('access_token.json'))

const calendar = google.calendar({ version: "v3", auth: api_key, auth: oAuth2Client,
// const calendar = google.calendar({ version: "v3", auth: oAuth2Client,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
    "Authorization": "Bearer " + token.access_token,
  },
});

app.get("/connect", (req, res) => {
  try {
    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"]
    });
    res.redirect(url);
  } catch (error) {
    console.log(error.message);
  }
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
  try {
    const event = {
      summary: 'This should be a new meeting with my wife.',
      location: 'House',
      description: 'This is a new meeting with my wife.',
      start: {
        // dateTime: '2023-06-16T10:00:00',
        dateTime: '2023-06-16T12:00:00.000Z',
        timeZone: 'America/New_York',
      },
      end: {
        // dateTime: '2023-06-16T11:30:00',
        dateTime: '2023-06-16T13:00:00.000Z',
        timeZone: 'America/New_York',
      },
      attendees: [
        { email: 'usigbedeborah95@gmail.com' },
        { email: 'igwechinonso94@gmail.com' },
      ],
      visibility: 'public'
    };
    const addedEvent = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });
    res.json({
      status: "ok",
      message: "Event added successfully.",
      data: addedEvent.data,
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
    oAuth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });
    const access_token = tokens.access_token;
    const token = JSON.stringify({ access_token });
    fs.writeFileSync('access_token.json', token);
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
        token: token.access_token,
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

// get caledar list
app.get("/calendar-list", async (req, res) => {
  try {
    const calendarList = await calendar.calendarList.list();
    res.json({
      status: "ok",
      message: "Calendar list retrieved successfully.",
      data: calendarList.data,
    });
  } catch (error) {
    console.log(error);
  }
})

// get events
app.get("/events", async (req, res) => {
  try {
    const events = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    res.json({
      status: "ok",
      message: "Events retrieved successfully.",
      data: events.data,
    });
  } catch (error) {
    console.log(error);
  }
})

// get event by id
app.get("/event/:id", async (req, res) => {
  try {
    const event = await calendar.events.get({
      calendarId: "primary",
      eventId: req.params.id,
    });
    res.json({
      status: "ok",
      message: "Event retrieved successfully.",
      data: event.data,
    });
  } catch (error) {
    console.log(error);
  }
})

// update event
app.post("/event/:id", async (req, res) => {
  try {
    const event = await calendar.events.update({
      calendarId: "primary",
      eventId: req.params.id,
      requestBody: req.body,
    });
    res.json({
      status: "ok",
      message: "Event updated successfully.",
      data: event.data,
    });
  } catch (error) {
    console.log(error);
  }
})

// delete event
app.delete("/event/:id", async (req, res) => {
  try {
    const event = await calendar.events.delete({
      calendarId: "primary",
      eventId: req.params.id,
    });
    res.json({
      status: "ok",
      message: "Event deleted successfully.",
      data: event.data,
    });
  } catch (error) {
    console.log(error);
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
