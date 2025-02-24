-- For reusing this code on other tables, just change the trigger name, table name, and the function to be executed
CREATE TRIGGER set_user_id
BEFORE INSERT ON users
FOR EACH ROW
WHEN (NEW.id IS NULL) -- Only set the ID if it's not provided
EXECUTE FUNCTION generate_user_id();