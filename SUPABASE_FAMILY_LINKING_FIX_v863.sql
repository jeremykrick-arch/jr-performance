-- OFFSZN v8.63: Fix family invitation generation on Supabase.
-- Run after SUPABASE_FAMILY_LINKING_v857.sql. No tables or links are deleted.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION public.offszn_create_parent_invite()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE code text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.offszn_account_roles
   WHERE user_id = auth.uid() AND role = 'athlete'
 ) THEN RAISE EXCEPTION 'Athlete sign-in required'; END IF;
 code := upper(encode(extensions.gen_random_bytes(4), 'hex'));
 INSERT INTO public.offszn_family_invites (athlete_id,code_hash,expires_at)
 VALUES (auth.uid(),encode(extensions.digest(code,'sha256'),'hex'),now()+interval '24 hours');
 RETURN code;
END $$;
CREATE OR REPLACE FUNCTION public.offszn_request_parent_link(invite_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE aid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.offszn_account_roles
   WHERE user_id = auth.uid() AND role = 'parent'
 ) THEN RAISE EXCEPTION 'Parent sign-in required'; END IF;
 invite_code := upper(trim(invite_code));
 IF invite_code !~ '^[A-F0-9]{8}$' THEN RAISE EXCEPTION 'Invalid invitation code'; END IF;
 UPDATE public.offszn_family_invites SET used_at=now()
 WHERE id=(SELECT id FROM public.offszn_family_invites
  WHERE code_hash=encode(extensions.digest(invite_code,'sha256'),'hex')
   AND expires_at>now() AND used_at IS NULL
  FOR UPDATE SKIP LOCKED LIMIT 1)
 RETURNING athlete_id INTO aid;
 IF aid IS NULL THEN RAISE EXCEPTION 'Invitation expired or already used'; END IF;
 INSERT INTO public.offszn_family_links(parent_id,athlete_id,status)
 VALUES(auth.uid(),aid,'pending')
 ON CONFLICT(parent_id,athlete_id) DO UPDATE SET status='pending',decided_at=NULL;
END $$;
REVOKE ALL ON FUNCTION public.offszn_create_parent_invite(),public.offszn_request_parent_link(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.offszn_create_parent_invite(),public.offszn_request_parent_link(text) TO authenticated;
