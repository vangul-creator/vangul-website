const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

const ARTIST_ID = "2sb1b7hozpaPl6oI6ShR0u";


// =========================
// WEBSITE
// =========================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});


// =========================
// SPOTIFY TOKEN CACHE
// =========================

let spotifyToken = null;
let spotifyTokenExpires = 0;

async function getSpotifyToken() {

    if (
        spotifyToken &&
        Date.now() < spotifyTokenExpires
    ) {
        return {
            access_token: spotifyToken
        };
    }

    const credentials =
        Buffer
            .from(
                `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            )
            .toString("base64");

    const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",

            headers: {
                "Authorization":
                    `Basic ${credentials}`,

                "Content-Type":
                    "application/x-www-form-urlencoded"
            },

            body:
                "grant_type=client_credentials"
        }
    );

    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            `Spotify token error: ${response.status} ${errorText}`
        );
    }

    const data =
        await response.json();

    spotifyToken =
        data.access_token;

    spotifyTokenExpires =
        Date.now() +
        ((data.expires_in - 60) * 1000);

    return data;
}


// =========================
// LATEST RELEASE CACHE
// =========================

let latestReleaseCache = null;
let latestReleaseCacheTime = 0;

// 5 хвилин
const LATEST_CACHE_TIME =
    5 * 60 * 1000;


// =========================
// LATEST RELEASE
// =========================

app.get(
    "/api/releases",
    async (req, res) => {

        try {

            // Якщо вже отримували реліз —
            // не робимо новий запит до Spotify.

            if (
                latestReleaseCache &&
                Date.now() -
                    latestReleaseCacheTime <
                    LATEST_CACHE_TIME
            ) {

                return res.json(
                    latestReleaseCache
                );
            }


            const tokenData =
                await getSpotifyToken();


            // Отримуємо релізи КОНКРЕТНОГО VANGUL
            // за Artist ID.

            const response =
                await fetch(
                    `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=album,single,compilation&limit=10&offset=0&market=DE`,
                    {
                        headers: {
                            "Authorization":
                                `Bearer ${tokenData.access_token}`
                        }
                    }
                );


            if (!response.ok) {

                const errorText =
                    await response.text();

                throw new Error(
                    `Spotify releases error: ${response.status} ${errorText}`
                );
            }


            const data =
                await response.json();


            if (
                !data.items ||
                data.items.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "No VANGUL releases found"
                    });
            }


            // Сортуємо від найновішого до найстарішого.

            const releases =
                [...data.items].sort(
                    (a, b) => {

                        const dateA =
                            new Date(
                                a.release_date
                            );

                        const dateB =
                            new Date(
                                b.release_date
                            );

                        return dateB - dateA;
                    }
                );


            const latest =
                releases[0];


            // Отримуємо перший трек
            // саме цього нового релізу.

            const tracksResponse =
                await fetch(
                    `https://api.spotify.com/v1/albums/${latest.id}/tracks?market=DE&limit=1`,
                    {
                        headers: {
                            "Authorization":
                                `Bearer ${tokenData.access_token}`
                        }
                    }
                );


            if (!tracksResponse.ok) {

                const errorText =
                    await tracksResponse.text();

                throw new Error(
                    `Spotify track error: ${tracksResponse.status} ${errorText}`
                );
            }


            const tracksData =
                await tracksResponse.json();


            const track =
                tracksData.items &&
                tracksData.items.length > 0
                    ? tracksData.items[0]
                    : null;


            const result = {

                name:
                    latest.name,

                image:
                    latest.images &&
                    latest.images.length > 0
                        ? latest.images[0].url
                        : null,

                date:
                    latest.release_date,

                type:
                    latest.album_type === "album"
                        ? "ALBUM"
                        : latest.album_type === "single"
                            ? "SINGLE"
                            : "RELEASE",

                total_tracks:
                    latest.total_tracks,

                track_name:
                    track
                        ? track.name
                        : null,

                spotify_url:
                    track &&
                    track.external_urls &&
                    track.external_urls.spotify
                        ? track.external_urls.spotify
                        : null
            };


            latestReleaseCache =
                result;

            latestReleaseCacheTime =
                Date.now();


            res.json(result);


        } catch (error) {

            console.error(
                "LATEST RELEASE ERROR:",
                error
            );

            res
                .status(500)
                .json({
                    error:
                        "Could not load Spotify latest release"
                });
        }
    }
);


// =========================
// SELECTED BY VANGUL CACHE
// =========================

let selectedReleasesCache = null;
let selectedReleasesCacheTime = 0;

// 30 хвилин
const SELECTED_CACHE_TIME =
    30 * 60 * 1000;


// =========================
// SELECTED BY VANGUL
// =========================

app.get(
    "/api/releases/all",
    async (req, res) => {

        try {

            // Не шукаємо всі 7 треків заново
            // при кожному відкритті сторінки.

            if (
                selectedReleasesCache &&
                Date.now() -
                    selectedReleasesCacheTime <
                    SELECTED_CACHE_TIME
            ) {

                return res.json(
                    selectedReleasesCache
                );
            }


            const targetReleases = [

                "QUÉDATE AQUÍ",
                "MONTAGEM MÚSICA",
                "Bate no chão",
                "FUNK FREQUÊNCIA",
                "Rebolou Na Pista",
                "DREAM",
                "APOCALYPSE!"

            ];


            const tokenData =
                await getSpotifyToken();


            const result = [];


            for (
                const releaseName
                of targetReleases
            ) {

                const query =
                    encodeURIComponent(
                        `artist:vangul track:${releaseName}`
                    );


                const response =
                    await fetch(
                        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=10&market=DE`,
                        {
                            headers: {
                                "Authorization":
                                    `Bearer ${tokenData.access_token}`
                            }
                        }
                    );


                if (!response.ok) {

                    console.error(
                        `Spotify search failed for ${releaseName}: ${response.status}`
                    );

                    continue;
                }


                const data =
                    await response.json();


                const tracks =
                    data.tracks &&
                    data.tracks.items
                        ? data.tracks.items
                        : [];


                // Перевіряємо Artist ID,
                // щоб це був саме твій VANGUL.

                const track =
                    tracks.find(
                        item =>
                            item.artists &&
                            item.artists.some(
                                artist =>
                                    artist.id ===
                                    ARTIST_ID
                            )
                    );


                if (!track) {
                    continue;
                }


                result.push({

                    name:
                        releaseName,

                    track_name:
                        track.name,

                    spotify_url:
                        track.external_urls &&
                        track.external_urls.spotify
                            ? track.external_urls.spotify
                            : null
                });
            }


            selectedReleasesCache =
                result;

            selectedReleasesCacheTime =
                Date.now();


            res.json(result);


        } catch (error) {

            console.error(
                "SELECTED RELEASES ERROR:",
                error
            );

            res
                .status(500)
                .json({
                    error:
                        "Could not load Spotify releases"
                });
        }
    }
);


// =========================
// START SERVER
// =========================

app.listen(
    process.env.PORT || 3000,
    () => {

        console.log(
            `VANGUL website running at http://localhost:${process.env.PORT || 3000}`
        );
    }
);


module.exports = app;