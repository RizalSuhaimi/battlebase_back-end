-- Converts a base-62 number to a base-10 number

CREATE OR REPLACE FUNCTION from_base62(base62_str VARCHAR) RETURNS BIGINT AS $$
DECLARE
    alphabet TEXT := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result BIGINT := 0;
    base INT := 62;
    char TEXT;
    idx IT;
BEGIN
    FOR idx IN 1..length(base62_str) LOOP
        char := substr(base62_str, idx, 1);
    
        -- Find the position of the current character in the alphabet (0-indexed)
        result := result * base + (position(char IN alphabet) - 1);
    END LOOP;

    RETURN RESULT
END;
$$ LANGUAGE plpgsql;