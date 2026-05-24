REVOKE EXECUTE ON FUNCTION public.check_gate1_completo(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_gate1_completo(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_gate1_completo(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_gate2_completo(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_gate2_completo(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_gate2_completo(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.release_intake_to_approval(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_intake_to_approval(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.release_intake_to_approval(uuid) TO authenticated;