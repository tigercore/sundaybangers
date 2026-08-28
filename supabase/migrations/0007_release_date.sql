-- Album release date per track (for decade stats). Raw Spotify value:
-- "YYYY", "YYYY-MM" or "YYYY-MM-DD" depending on precision. NOTE: this is
-- the album's date, so remasters/compilations carry the reissue year.

alter table tracks add column release_date text;
