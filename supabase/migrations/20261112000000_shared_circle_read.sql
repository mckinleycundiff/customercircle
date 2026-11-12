-- Shared circle: recipient read access via RPC (run in Supabase SQL editor if not using CLI migrate).

CREATE TABLE IF NOT EXISTS public.shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, recipient_id, scope)
);

CREATE INDEX IF NOT EXISTS shares_recipient_idx ON public.shares (recipient_id);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shares_owner_insert ON public.shares;
CREATE POLICY shares_owner_insert ON public.shares
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS shares_participant_select ON public.shares;
CREATE POLICY shares_participant_select ON public.shares
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR recipient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.list_shares_received()
RETURNS TABLE (
  owner_id uuid,
  owner_label text,
  shared_at timestamptz,
  customer_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.owner_id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(u.email, '@', 1),
      'IBO'
    ) AS owner_label,
    s.created_at AS shared_at,
    (SELECT count(*)::bigint FROM public.customers c WHERE c.user_id = s.owner_id) AS customer_count
  FROM public.shares s
  JOIN auth.users u ON u.id = s.owner_id
  WHERE s.recipient_id = auth.uid()
    AND s.scope = 'all'
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_circle(p_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
  cust jsonb;
  acts jsonb;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'invalid_owner';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.shares s
    WHERE s.owner_id = p_owner_id
      AND s.recipient_id = auth.uid()
      AND s.scope = 'all'
  ) INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'not_shared';
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(c) ORDER BY c.name), '[]'::jsonb)
  INTO cust
  FROM (
    SELECT id, name, phone, email, preferred, how_met, amway_id, last_contact, notes
    FROM public.customers
    WHERE user_id = p_owner_id
  ) c;

  SELECT coalesce(jsonb_agg(row_to_json(a) ORDER BY a.date DESC), '[]'::jsonb)
  INTO acts
  FROM (
    SELECT id, customer_id, date, type, notes
    FROM public.activities
    WHERE user_id = p_owner_id
    ORDER BY date DESC NULLS LAST
    LIMIT 500
  ) a;

  RETURN jsonb_build_object('customers', cust, 'activities', acts);
END;
$$;

REVOKE ALL ON FUNCTION public.list_shares_received() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_shared_circle(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_shares_received() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_circle(uuid) TO authenticated;
