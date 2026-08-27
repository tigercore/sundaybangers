-- Display names can't be fetched from Spotify (users endpoint is forbidden
-- for this app tier), so they're seeded here. NOTE: SealKid/Greenlow were
-- assigned to the two anonymous ids arbitrarily — swap if the live data
-- shows them the wrong way round.

insert into members (id, display_name) values
  ('tigercore', 'Ryan'),
  ('1116843354', 'Burke'),
  ('preeceman', 'Preeceman'),
  ('mrsalim', 'MrSalim'),
  ('31ylg4a3mutu25hqqkqytwzwtbzi', 'SealKid'),
  ('31piecun525q7n67ujoqhvyltjsu', 'Greenlow')
on conflict (id) do update set display_name = excluded.display_name;
