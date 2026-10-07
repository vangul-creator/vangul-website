const express = require("express");
const path = require("path");

const app = express();

// Serve website
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/index.html")
    );
});

// =========================
// VANGUL RELEASES
// =========================

const releases = [
    {
        name: "QUÉDATE AQUÍ",
        track_name: "QUÉDATE AQUÍ",
        spotify_url:
            "https://open.spotify.com/track/0Jnk47ODMggJ48OJdbCC1"
    },

    {
        name: "MONTAGEM MÚSICA",
        track_name: "MONTAGEM MÚSICA",
        spotify_url:
            "https://open.spotify.com/track/3jv2w7OfbINNZdmz9ifks0"
    },

    {
        name: "Bate no chão",
        track_name: "Bate no chão",
        spotify_url:
            "https://open.spotify.com/track/7BdpqJaJXoJ2YX4bHSetfj"
    },

    {
        name: "FUNK FREQUÊNCIA",
        track_name: "FUNK FREQUÊNCIA",
        spotify_url:
            "https://open.spotify.com/track/0ahckddUHVPDt6MGqc041w"
    },

    {
        name: "Rebolou Na Pista",
        track_name: "Rebolou Na Pista",
        spotify_url:
            "https://open.spotify.com/track/7EmEhUvOzsmUIy4Wid64IQ"
    },

    {
        name: "DREAM",
        track_name: "DREAM",
        spotify_url:
            "https://open.spotify.com/track/3CfAK3mR5mHXOoBdbvIE8W"
    },

    {
        name: "APOCALYPSE!",
        track_name: "APOCALYPSE!",
        spotify_url:
            "https://open.spotify.com/track/01rdqC5QM9rs968JBO7ktg"
    }
];

// =========================
// LATEST RELEASE
// =========================

app.get("/api/releases", (req, res) => {

    const latest = releases[0];

    res.json({
        name: latest.name,

        image: "images/quedate-aqui.jpg",

        date: "2026-01-01",

        type: "MINI-ALBUM",

        total_tracks: 4,

        spotify_url: latest.spotify_url
    });
});

// =========================
// ALL RELEASES
// =========================

app.get("/api/releases/all", (req, res) => {
    res.json(releases);
});

module.exports = app;