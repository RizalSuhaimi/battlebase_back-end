--- This function can be used for any table that used the integer id columns by changing the function name and the table used in the for loop on line 11

CREATE OR REPLACE FUNCTION generate_category_id() RETURNS TRIGGER AS $$
DECLARE
    taken_ids INT[] := ARRAY[]::INT[];
    max_id INT;
    smallest_available_id INT;
    current_id INT;
    rec RECORD;
BEGIN
    FOR rec IN (SELECT id FROM categories) LOOP
        taken_ids := array_append(taken_ids, rec.id);
    END LOOP;

    SELECT MAX(id) INTO max_id
    FROM unnest(taken_ids) AS id;

    FOR current_id IN 1..max_id LOOP
        IF current_id != ALL(taken_ids) THEN
            smallest_available_id = current_id;
            EXIT;
        ELSIF current_id = max_id THEN
            smallest_available_id = max_id + 1;
        END IF;
    END LOOP;

    NEW.id := smallest_available_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;