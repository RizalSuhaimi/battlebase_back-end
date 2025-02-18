CREATE TRIGGER set_user_id
BEFORE INSERT ON users
FOR EACH ROW
WHEN (NEW.id IS NULL) -- Only set the ID if it's not provided
EXECUTE FUNCTION generate_user_id();