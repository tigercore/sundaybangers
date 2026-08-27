-- Small album cover thumbnail (64px) per track, for the Spotify-style listing.

alter table tracks add column album_art text;
