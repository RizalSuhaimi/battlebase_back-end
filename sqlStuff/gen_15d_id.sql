--- This function can be used for any table that used the 15-digit id columns by changing the function name and the table used in the for loop on line 12

CREATE OR REPLACE FUNCTION generate_order_id() RETURNS TRIGGER AS $$
DECLARE
    base10_ids BIGINT[] := ARRAY[]::BIGINT[];
    max_id BIGINT;
    smallest_available_id BIGINT := 1;
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
    
    -- Find and select the smallest available base-10 number by iterating
    FOR current_id IN 1..max_id LOOP
        IF current_id != ALL(base10_ids) THEN
            smallest_available_id = current_id;
            EXIT;
        ELSIF current_id = max_id THEN
            smallest_available_id = max_id + 1;
        END IF;
    END LOOP;

    NEW.id := to_base62_15d(smallest_available_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;