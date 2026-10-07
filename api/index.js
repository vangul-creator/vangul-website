const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

const ARTIST_ID = "2sb1b7hozpaPl6oI6ShR0u";

// Serve website
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/index.html")
    );
});

// =========================
// SPOTIFY TOKEN
// =========================

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

// =========================
// GET ALL RELEASES
// =========================

async function getSpotifyReleases() {

    const tokenData = await getSpotifyToken();

    const allReleases = [];

    let offset = 0;

    const limit = 10;

    while (true) {

        const response = await fetch(
            `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=album,single,compilation&limit=${limit}&offset=${offset}&market=DE`,
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
            break;
        }

        allReleases.push(...data.items);

        if (!data.next) {
            break;
        }

        offset += limit;
    }

    const uniqueReleases = [];

    const seen = new Set();

    for (const release of allReleases) {

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

    return uniqueReleases;
}

// =========================
// LATEST RELEASE
// =========================

app.get("/api/releases", async (req, res) => {

    try {

        const releases = await getSpotifyReleases();

        if (!releases.length) {

            return res.status(404).json({
                error: "No releases found"
            });
        }

        const latest = releases[0];

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

// =========================
// ALL RELEASES + FIRST TRACK
// =========================

app.get("/api/releases/all", async (req, res) => {

    try {

        const releases = await getSpotifyReleases();

        const tokenData = await getSpotifyToken();

        const result = [];

        for (const release of releases) {

            const response = await fetch(
                `https://api.spotify.com/v1/albums/${release.id}/tracks?market=DE&limit=1`,
                {
                    headers: {
                        "Authorization": `Bearer ${tokenData.access_token}`
                    }
                }
            );

            if (!response.ok) {
                continue;
            }

            const data = await response.json();

            const track =
                data.items &&
                data.items.length > 0
                    ? data.items[0]
                    : null;

            if (!track) {
                continue;
            }

            result.push({
                name: release.name,
                track_name: track.name,
                spotify_url:
                    track.external_urls &&
                    track.external_urls.spotify
                        ? track.external_urls.spotify
                        : null
            });
        }

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Could not load Spotify releases"
        });
    }
});

module.exports = app;