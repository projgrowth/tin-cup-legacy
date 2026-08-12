-- Generated from the read-only Nhost public snapshot captured 2026-08-09T21:26:17.237Z.
-- Snapshot SHA-256: 81cc83eb01d2420f1c7e147266cbb6adab519f6ba3ba2746d10ef9befd614bc7
-- This migration is intentionally guarded for a new, user-empty Supabase project.
do $$
begin
  if exists (select 1 from public.profiles)
     or exists (select 1 from public.photos)
     or exists (select 1 from public.hole_notes)
     or exists (select 1 from public.round_plans)
     or exists (select 1 from public.user_roles) then
    raise exception 'Refusing public import after user-owned data exists';
  end if;
end;
$$;

delete from public.matches;
delete from public.side_bets;
delete from public.trophies;
delete from public.players;
delete from public.rounds;
delete from public.teams;

insert into public.teams (id, slug, name, captain_name, sort_order) values
  ('29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'strong-mental', 'Team Strong Mental', 'Zack Smith', 1),
  ('ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'grass-roots', 'Team Grass Roots', 'Charles Grass', 2);

insert into public.players (id, team_id, name, is_captain, sort_order) values
  ('8ffc6bc8-a54d-4bbf-b614-a773bb43a71d', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Zack Smith', true, 1),
  ('62b65702-dd94-4075-8328-54e279f8a66b', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Charles Grass', true, 1),
  ('a9f36712-de23-4163-9ab4-1f958638a026', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Neil Candelora', false, 2),
  ('19a39d87-939b-4016-a256-ce36f0b9281e', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Chris Maher', false, 2),
  ('493a10fa-379d-406b-810f-6a285e80faed', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Andrew Kezsbom', false, 3),
  ('c6254032-b2a8-40b9-a3e1-3989ed948a9b', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Blake Weeks', false, 3),
  ('00fecf0b-b0eb-45b6-b39c-3cd753899385', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Mike Maher', false, 4),
  ('cf67f1e5-2576-4ae2-8cd4-80ac8b8bb238', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Nick Sears', false, 4),
  ('493fd176-29ed-49eb-841e-673f42463146', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Max Furth', false, 5),
  ('adf688dc-6e21-426d-b3c5-23c690eaaa3a', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Dan Rodriguez', false, 5),
  ('97fc0265-d00c-4a41-a5a5-6c607077d521', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Josef Yehia', false, 6),
  ('d2612231-8d2c-40be-87e8-421f9aedf6c9', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Kevin Maher', false, 6),
  ('9abbe367-3f77-41e0-96b8-89125658c58a', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Seth Beaver', false, 7),
  ('e0d8d2b8-9c87-40ba-ac17-608111a6fe75', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Casey Gillespie', false, 7),
  ('8349a953-4ef2-4580-ae87-c2f68eff374d', 'ca2c58ce-708f-4753-a59c-e19720b0e7c6', 'Barry Rigby', false, 8),
  ('866c8f68-4c54-491c-b63e-5915883ec077', '29d33069-b2bd-47a4-91a0-4c2c00d6cdb5', 'Keenan Horrell', false, 8);

insert into public.rounds (id, slug, day_label, play_date, course, tee_window, format, format_detail, points, meal, sort_order) values
  ('95b09678-f5f8-4180-adf9-f040f434657b', 'friday', 'Friday', '2026-08-28', 'South Course', '12:19 - 12:44 PM', 'Scramble / Alt Shot', '4 scramble points + 4 alternate shot points', 8, 'Dinner: Salamander Grille', 1),
  ('98d930bf-bd09-4b8a-99f0-576cff04bfc3', 'saturday', 'Saturday', '2026-08-29', 'Copperhead Course', '9:54 - 10:20 AM', 'Modified Stableford Match Play', '2 / 2 / 2 breakdown across the round', 6, 'Dinner: 7 PM Steakhouse', 2),
  ('9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'sunday', 'Sunday', '2026-08-30', 'Island Course', '9:54 - 10:20 AM', 'Shamble / Singles', '4 shamble points + 8 singles points', 12, 'Lunch & Awards Ceremony', 3);

insert into public.matches (id, round_id, label, side_a, side_b, points, result, sort_order, revision, updated_at) values
  ('d006873c-7aa1-4c3f-82f1-502df71a9aa1', '98d930bf-bd09-4b8a-99f0-576cff04bfc3', 'Stableford Front 9', null, null, 2, 'pending', 1, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('5b2457e5-676f-4dd8-a3d0-652bd0cee862', '95b09678-f5f8-4180-adf9-f040f434657b', 'Scramble Match 1', 'Zack / Chris', 'Charles / Blake', 1, 'pending', 1, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('8937c4ae-19c0-48c7-a63a-f6972e013e2a', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Shamble Match 1', null, null, 1, 'pending', 1, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('72232877-319e-43bb-8c83-6bffca24a3c0', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Shamble Match 2', null, null, 1, 'pending', 2, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('d8a2da39-aba3-4c15-8cd5-59c5f4ec6b94', '98d930bf-bd09-4b8a-99f0-576cff04bfc3', 'Stableford Back 9', null, null, 2, 'pending', 2, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('60497fac-3f96-4843-bf4d-a3abb813dcc0', '95b09678-f5f8-4180-adf9-f040f434657b', 'Scramble Match 2', 'Nick / Andrew', 'Neil / Mike', 1, 'pending', 2, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('b53030a9-155a-4201-8ffa-f03c182d0f27', '98d930bf-bd09-4b8a-99f0-576cff04bfc3', 'Stableford Overall', null, null, 2, 'pending', 3, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('9406fb32-99c9-405e-8314-1e9f84d8376c', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Shamble Match 3', null, null, 1, 'pending', 3, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('9a31a93b-3ff0-4d99-924e-59d718e37a76', '95b09678-f5f8-4180-adf9-f040f434657b', 'Scramble Match 3', 'Kevin / Max', 'Dan / Josef', 1, 'pending', 3, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('bd905402-19e0-497f-aea7-48e5ae309778', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Shamble Match 4', null, null, 1, 'pending', 4, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('b1a4874a-1fe5-4b3c-9065-aeeb3cfbd895', '95b09678-f5f8-4180-adf9-f040f434657b', 'Scramble Match 4', 'Seth / Keenan', 'Casey / Barry', 1, 'pending', 4, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('40280966-ebbf-48b8-b3de-34ae6967a367', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 1', null, null, 1, 'pending', 5, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('60ada895-fcd7-42ff-9b50-ef13a968a511', '95b09678-f5f8-4180-adf9-f040f434657b', 'Alt Shot Match 1', 'Zack / Chris', 'Charles / Blake', 1, 'pending', 5, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('a17f242a-aa8a-4887-9896-9cc1e55e6552', '95b09678-f5f8-4180-adf9-f040f434657b', 'Alt Shot Match 2', 'Nick / Andrew', 'Neil / Mike', 1, 'pending', 6, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('cda64dc3-2ef2-4fe3-ac1e-31ee9c7154f1', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 2', null, null, 1, 'pending', 6, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('5afb55e5-1c54-4c70-abc4-92b06980053b', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 3', null, null, 1, 'pending', 7, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('555d1780-8ce7-4a09-83a1-eb46c9a29e70', '95b09678-f5f8-4180-adf9-f040f434657b', 'Alt Shot Match 3', 'Kevin / Max', 'Dan / Josef', 1, 'pending', 7, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('40372d6b-05f0-4119-9e74-d4085199b0b0', '95b09678-f5f8-4180-adf9-f040f434657b', 'Alt Shot Match 4', 'Seth / Keenan', 'Casey / Barry', 1, 'pending', 8, 1, '2026-08-07T18:12:56.416742+00:00'),
  ('74b7dc8b-c270-451d-a3b1-8da9f1687c33', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 4', null, null, 1, 'pending', 8, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('b38024ed-f284-40aa-8cee-1fd6d84847eb', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 5', null, null, 1, 'pending', 9, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('8dce5eec-80f4-4f5d-8695-1d03f8ea064c', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 6', null, null, 1, 'pending', 10, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('c8ebe382-a304-44ed-a0bf-3160dbae1539', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 7', null, null, 1, 'pending', 11, 0, '2026-08-03T16:47:34.75751+00:00'),
  ('9ba080a4-67de-46cc-853f-f135a691a961', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', 'Singles Match 8', null, null, 1, 'pending', 12, 0, '2026-08-03T16:47:34.75751+00:00');

insert into public.side_bets (id, kind, label, round_id, hole, amount, player_name, team_slug, distance, sort_order, revision, updated_at) values
  ('eca36c93-2636-499c-bda4-ba5d57840042', 'ctp', 'CTP - Friday front', '95b09678-f5f8-4180-adf9-f040f434657b', null, 100, null, null, null, 1, 3, '2026-08-07T18:12:56.416742+00:00'),
  ('883c6088-760a-4d02-8d14-ffcb161afe64', 'ctp', 'CTP - Friday back', '95b09678-f5f8-4180-adf9-f040f434657b', null, 100, null, null, null, 2, 3, '2026-08-07T18:12:56.416742+00:00'),
  ('4050e197-4c80-47be-a8c2-17e1b3ceecf7', 'ctp', 'CTP - Saturday front', '98d930bf-bd09-4b8a-99f0-576cff04bfc3', null, 100, null, null, null, 3, 3, '2026-08-07T18:12:56.416742+00:00'),
  ('27e7bc13-e242-4389-8280-58582ecdac0b', 'ctp', 'CTP - Saturday back', '98d930bf-bd09-4b8a-99f0-576cff04bfc3', null, 100, null, null, null, 4, 3, '2026-08-07T18:12:56.416742+00:00'),
  ('676c87ca-59d7-45af-bf56-fad59ff2d635', 'ctp', 'CTP - Sunday front', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', null, 100, null, null, null, 5, 3, '2026-08-07T18:12:56.416742+00:00'),
  ('2c3a4b10-6a8a-4b63-b36b-96fcf54ba1e5', 'ctp', 'CTP - Sunday back', '9d851b66-aeb0-4ae9-8944-5a1c815bbc2a', null, 100, null, null, null, 6, 3, '2026-08-07T18:12:56.416742+00:00'),
  ('e1904a89-7524-4ca8-a612-2ea5df61b26d', 'ld', 'Long Drive - Friday', '95b09678-f5f8-4180-adf9-f040f434657b', null, 100, null, null, null, 7, 3, '2026-08-07T18:12:56.416742+00:00'),
  ('159918b8-f694-49b2-b858-e21028dba7cc', 'ld', 'Long Drive - Saturday', '98d930bf-bd09-4b8a-99f0-576cff04bfc3', null, 100, null, null, null, 8, 3, '2026-08-07T18:12:56.416742+00:00');

insert into public.trophies (id, slug, name, description, winner_name, winner_note, sort_order, revision, created_at, updated_at) values
  ('7e73040b-fa4b-42d6-bcb3-4022c89c8201', 'championship', 'Championship Trophy', 'Awarded to the winning side of the 26-point cup.', null, null, 0, 0, '2026-08-03T16:47:34.75751+00:00', '2026-08-03T16:47:34.75751+00:00'),
  ('51015cd3-9f89-4e0c-8084-4e397dd2d944', 'chubbs-mvp', 'Chubbs Peterson MVP', 'Most points earned across the three rounds.', null, null, 1, 0, '2026-08-03T16:47:34.75751+00:00', '2026-08-03T16:47:34.75751+00:00'),
  ('6ea7c56a-6658-4017-8300-bafeb19ecc20', 'steve-stinson-vibes', 'Steve Stinson Vibes Award', 'For the man who kept the vibes high all weekend.', null, null, 2, 0, '2026-08-03T16:47:34.75751+00:00', '2026-08-03T16:47:34.75751+00:00'),
  ('cb3eed42-e921-40fc-87dd-13f78ae0202b', 'snake-pit', 'Snake Pit Trophy', 'Best play through Copperhead 16, 17 and 18.', null, null, 3, 0, '2026-08-03T16:47:34.75751+00:00', '2026-08-03T16:47:34.75751+00:00');

