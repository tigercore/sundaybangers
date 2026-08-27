-- Genre per track, resolved via the iTunes Search API (Spotify removed genre
-- data from this app tier). null = not yet looked up, '' = looked up, none found.

alter table tracks add column genre text;
