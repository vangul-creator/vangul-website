const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

const ARTIST_ID = "2sb1b7hozpaPl6oI6ShR0u";

// Serve website files
app.use(express.static(path.join(__dirname, "../public")));

// Homepage
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/index.html")
    );
});

// Spotify access token
async function getSpotifyToken() {
    const credentials = Buffer
        .from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        )
        .toString("base64");

    const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "grant_type=client_credentials"
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Spotify token error: ${response.status} ${errorText}`
        );
    }

    return response.json();
}

// Latest Spotify release
app.get("/api/releases", async (req, res) => {
    try {
        const tokenData = await getSpotifyToken();

        const response = await fetch(
            `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=album,single,compilation&limit=50&market=DE`,
            {
                headers: {
                    "Authorization": `Bearer ${tokenData.access_token}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            throw new Error(
                `Spotify releases error: ${response.status} ${errorText}`
            );
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            return res.status(404).json({
                error: "No releases found"
            });
        }

        const uniqueReleases = [];
        const seen = new Set();

        for (const release of data.items) {
            if (!seen.has(release.id)) {
                seen.add(release.id);
                uniqueReleases.push(release);
            }
        }

        uniqueReleases.sort(
            (a, b) =>
                new Date(b.release_date) -
                new Date(a.release_date)
        );

        const latest = uniqueReleases[0];

        res.json({
            name: latest.name,

            image:
                latest.images &&
                latest.images.length > 0
                    ? latest.images[0].url
                    : null,

            date: latest.release_date,

            type:
                latest.album_type === "album"
                    ? "ALBUM"
                    : latest.album_type === "single"
                        ? "SINGLE"
                        : "RELEASE",

            total_tracks: latest.total_tracks,

            spotify_url:
                latest.external_urls &&
                latest.external_urls.spotify
                    ? latest.external_urls.spotify
                    : null
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Could not load Spotify release"
        });
    }
});

module.exports = app;