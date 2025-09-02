-- Test script to verify sequential ID system
-- This will check the current state and test the functions

-- Check the current sequence status
SELECT 
  'Sequence Status' as test_type,
  current_number,
  last_reset_at,
  created_at
FROM service_order_sequence;

-- Check existing service orders with sequential numbers
SELECT 
  'Existing Orders' as test_type,
  COUNT(*) as total_orders,
  MIN(sequential_number) as min_seq,
  MAX(sequential_number) as max_seq
FROM service_orders 
WHERE sequential_number IS NOT NULL;

-- Test the format function with different numbers
SELECT 
  'Format Function Test' as test_type,
  format_service_order_id(1) as format_1,
  format_service_order_id(123) as format_123,
  format_service_order_id(9999) as format_9999;

-- Show sample of existing orders with their formatted IDs
SELECT 
  'Sample Orders' as test_type,
  id,
  sequential_number,
  format_service_order_id(sequential_number) as formatted_id,
  device_model,
  status,
  created_at
FROM service_orders 
WHERE sequential_number IS NOT NULL
ORDER BY sequential_number DESC
LIMIT 5;

-- Test the sequence generation function (this will increment the counter)
SELECT 
  'Next Sequential Number' as test_type,
  generate_sequential_number() as next_number;

-- Check the sequence status after generating a number
SELECT 
  'Updated Sequence Status' as test_type,
  current_number,
  last_reset_at
FROM service_order_sequence;

COMMENT ON TABLE service_orders IS 'Teste das funções do sistema de IDs sequenciais executado';