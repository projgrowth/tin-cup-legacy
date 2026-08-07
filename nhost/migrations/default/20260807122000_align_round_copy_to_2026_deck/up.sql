-- Align round format labels with Desktop deck:
-- /Users/projgrowth/Desktop/4th Annual Tin Cup Invitational 2026.pdf
UPDATE public.rounds
SET
  format = 'Scramble / Modified Alternate Shot',
  format_detail = '4 scramble points + 4 modified alternate shot points'
WHERE slug = 'friday';

UPDATE public.rounds
SET
  format_detail = 'Full team match play; each 9 and total score worth 2 points (2 / 2 / 2)'
WHERE slug = 'saturday';
