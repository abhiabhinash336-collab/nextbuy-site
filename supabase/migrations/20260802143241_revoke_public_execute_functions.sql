/*
# Revoke PUBLIC execute on internal SECURITY DEFINER functions

## Overview
PostgreSQL grants EXECUTE on functions to PUBLIC by default. The previous migration
revoked from anon/authenticated but the PUBLIC grant remained, so the linter still
flags is_admin() and handle_new_user() as callable via /rest/v1/rpc. This revokes
from PUBLIC and re-grants only to the postgres service role (trigger owner).

## Security changes
1. REVOKE EXECUTE on both functions FROM PUBLIC.
2. GRANT EXECUTE to postgres so the auth.users trigger still invokes handle_new_user.
   is_admin needs no explicit grant — it's only called inside RLS policy predicates,
   which run with the table owner's privileges, not the caller's.
*/

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
