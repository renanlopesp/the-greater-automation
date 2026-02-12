-- Allow 'running' status in step_test_results
ALTER TABLE step_test_results DROP CONSTRAINT IF EXISTS step_test_results_status_check;
ALTER TABLE step_test_results ADD CONSTRAINT step_test_results_status_check CHECK (status IN ('running', 'success', 'failed'));
