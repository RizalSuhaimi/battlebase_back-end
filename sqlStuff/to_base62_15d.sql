-- converts a base-10 number to a base-62 number in a 15-digit string fomat

CREATE OR REPLACE FUNCTION to_base62_15d(num BIGINT) RETURNS VARCHAR AS $$
DECLARE
    alphabet TEXT := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    base INT := 62;
BEGIN
    IF num = 0 THEN
        RETURN '0';
    END IF;

    WHILE num > 0 LOOP
        result := substr(alphabet, ((num % base) + 1)::INT, 1) || result;
        num := num / base;
    END LOOP;

    -- Pad the result to 15 characters
    RETURN lpad(result, 15, '0');
END;
$$ LANGUAGE plpgsql;