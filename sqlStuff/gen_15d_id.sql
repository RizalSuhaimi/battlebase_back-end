--- This function can be used for any table that used the 15-digit id columns by changing the function name and the table used in the for loop on line 12

CREATE OR REPLACE FUNCTION generate_order_id() RETURNS TRIGGER AS $$
DECLARE
    base10_ids BIGINT[] := ARRAY[]::BIGINT[];
    max_id BIGINT;
    smallest_id BIGINT := 1;
    current_id BIGINT;
    rec RECORD;
BEGIN
    -- Fetch all existing ids, convert them to base-10, and store in the array
    FOR rec IN (SELECT id FROM orders) LOOP
        base10_ids := array_append(base10_ids, from_base62(rec.id));
    END LOOP;

    -- Find the largest id in base-10 from the array
    SELECT MAX(base10_id) INTO max_id
    FROM unnest(base10_ids) AS base10_id;
    
    -- Check for the smallest available base-10 number by iterating
    FOR current_id IN 1..max_id LOOP
        IF current_id != ALL(base10_ids) THEN
            smallest_id := current_id;
            EXIT;
        ELSIF current_id = max_id THEN
            smallest_id = max_id;
        END IF;
    END LOOP;

    -- If the largest ID equals the number of rows, use the value after the biggest value that's currently in the table 
    IF smallest_id >= max_id THEN
        NEW.id := to_base62_15d(max_id + 1);
    ELSE
        -- Otherwise, use the smallest available number
        NEW.id := to_base62_15d(smallest_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;