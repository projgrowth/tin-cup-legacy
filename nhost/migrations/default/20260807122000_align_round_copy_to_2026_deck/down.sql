UPDATE public.rounds
SET
  format = 'Scramble / Alt Shot',
  format_detail = '4 scramble points + 4 alternate shot points'
WHERE slug = 'friday';

UPDATE public.rounds
SET
  format_detail = '2 / 2 / 2 breakdown across the round'
WHERE slug = 'saturday';
