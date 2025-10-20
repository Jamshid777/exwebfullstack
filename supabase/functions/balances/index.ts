import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET /balances - fetch all balances with currency info
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('balances')
        .select(`
          *,
          currency:currencies(*)
        `)
        .order('currency_id');

      if (error) throw error;

      // Transform to match frontend format
      const balances = data.map((b: any) => ({
        currency: {
          id: b.currency.id,
          code: b.currency.code,
          name: b.currency.name,
          symbol: b.currency.symbol,
        },
        amount: parseFloat(b.amount),
        reservedAmount: parseFloat(b.reserved_amount),
        availableAmount: parseFloat(b.available_amount),
        lastUpdated: b.last_updated,
      }));

      return new Response(JSON.stringify(balances), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});