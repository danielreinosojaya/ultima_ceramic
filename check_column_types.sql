SELECT 
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns
WHERE table_name = 'timecards'
  AND column_name IN ('time_in', 'time_out', 'date', 'created_at', 'updated_at', 'edited_at');
