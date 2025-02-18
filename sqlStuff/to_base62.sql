-- converts a base-10 number to a base-62 number

CREATE OR REPLACE FUNCTION to_base62(num BIGINT) RETURNS VARCHAR AS $$
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

    -- Pad the result to 10 characters
    RETURN lpad(result, 10, '0');
END;
$$ LANGUAGE plpgsql;