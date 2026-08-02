/*
# Harden SECURITY DEFINER functions

## Overview
The database linter flagged that `is_admin()` and `handle_new_user()` are callable by
the `anon` and `authenticated` roles via the PostgREST RPC endpoint. Neither function
needs to be invoked directly by clients — `handle_new_user` fires only via a trigger on
auth.users, and `is_admin` is referenced only inside RLS policy predicates. Revoking
EXECUTE removes the public RPC surface while keeping both functions usable internally.

## Security changes
1. REVOKE EXECUTE on `is_admin()` from `anon` and `authenticated`.
2. REVOKE EXECUTE on `handle_new_user()` from `anon` and `authenticated`.
3. GRANT EXECUTE on `handle_new_user()` to `postgres` (trigger owner) so the trigger keeps working.
*/

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
