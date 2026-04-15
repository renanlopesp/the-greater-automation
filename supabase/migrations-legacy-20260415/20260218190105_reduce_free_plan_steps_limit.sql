-- Reduce free plan steps limit from 1000 to 300
UPDATE plans SET steps_limit = 300 WHERE id = 'free';
