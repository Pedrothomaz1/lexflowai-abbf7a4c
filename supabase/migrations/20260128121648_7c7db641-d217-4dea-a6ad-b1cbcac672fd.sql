-- Create rate_limits table for tracking API usage
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint_key TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(user_id, endpoint_key, window_start DESC);
CREATE INDEX idx_rate_limits_ip ON public.rate_limits(ip_address, endpoint_key, window_start DESC);
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the rate-limiter function (via service role) can manage this table
CREATE POLICY "Service role can manage rate_limits"
  ON public.rate_limits
  FOR ALL
  USING (auth.uid() IS NULL)
  WITH CHECK (true);

-- Auto-cleanup old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE public.rate_limits IS 'Tracks API request counts for rate limiting. Auto-cleaned after 24h.';