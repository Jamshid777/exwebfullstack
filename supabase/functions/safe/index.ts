import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DepositRequest {
  currency: { id: number; code: string; name: string; symbol: string };
  amount: number;
  rate?: number;
  note?: string;
}

interface WithdrawalRequest {
  currency: { id: number; code: string; name: string; symbol: string };
  amount: number;
  note?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // POST /safe/deposit - create deposit
    if (req.method === 'POST' && path.includes('/deposit')) {
      const body: DepositRequest = await req.json();

      // Validate rate for USDT deposits (required for FIFO)
      if (body.currency.code === 'USDT' && !body.rate) {
        return new Response(JSON.stringify({ error: 'Rate is required for USDT deposits' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get active shift
      const { data: activeShift } = await supabase
        .from('shifts')
        .select('id')
        .is('end_time', null)
        .maybeSingle();

      // Update balance
      const { data: balance } = await supabase
        .from('balances')
        .select('*')
        .eq('currency_id', body.currency.id)
        .single();

      if (balance) {
        await supabase
          .from('balances')
          .update({
            amount: parseFloat(balance.amount) + body.amount,
            available_amount: parseFloat(balance.available_amount) + body.amount,
          })
          .eq('id', balance.id);
      }

      // Create transaction record
      const rate = body.rate || 1;
      const totalAmount = body.amount * rate;

      const { data: newTransaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          shift_id: activeShift?.id || null,
          operation_type: 'deposit',
          currency_id: body.currency.id,
          amount: body.amount,
          rate: rate,
          total_amount: totalAmount,
          status: 'completed',
          remaining_amount: body.currency.code === 'USDT' ? body.amount : null,
          note: body.note,
        })
        .select(`
          *,
          currency:currencies(*)
        `)
        .single();

      if (txError) throw txError;

      const transaction = {
        id: newTransaction.id,
        operationType: newTransaction.operation_type,
        amount: parseFloat(newTransaction.amount),
        currency: {
          id: newTransaction.currency.id,
          code: newTransaction.currency.code,
          name: newTransaction.currency.name,
          symbol: newTransaction.currency.symbol,
        },
        rate: parseFloat(newTransaction.rate),
        totalAmount: parseFloat(newTransaction.total_amount),
        profit: newTransaction.profit ? parseFloat(newTransaction.profit) : null,
        status: newTransaction.status,
        paymentCurrency: newTransaction.payment_currency,
        uzsRate: newTransaction.uzs_rate ? parseFloat(newTransaction.uzs_rate) : null,
        totalAmountUzs: newTransaction.total_amount_uzs ? parseFloat(newTransaction.total_amount_uzs) : null,
        paidAmountUsd: newTransaction.paid_amount_usd ? parseFloat(newTransaction.paid_amount_usd) : null,
        paidAmountUzs: newTransaction.paid_amount_uzs ? parseFloat(newTransaction.paid_amount_uzs) : null,
        remainingAmount: newTransaction.remaining_amount ? parseFloat(newTransaction.remaining_amount) : null,
        walletAddress: newTransaction.wallet_address,
        note: newTransaction.note,
        createdAt: newTransaction.created_at,
      };

      return new Response(JSON.stringify(transaction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /safe/withdrawal - create withdrawal
    if (req.method === 'POST' && path.includes('/withdrawal')) {
      const body: WithdrawalRequest = await req.json();

      // Check balance
      const { data: balance } = await supabase
        .from('balances')
        .select('*')
        .eq('currency_id', body.currency.id)
        .single();

      if (!balance || parseFloat(balance.available_amount) < body.amount) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get active shift
      const { data: activeShift } = await supabase
        .from('shifts')
        .select('id')
        .is('end_time', null)
        .maybeSingle();

      // Update balance
      await supabase
        .from('balances')
        .update({
          amount: parseFloat(balance.amount) - body.amount,
          available_amount: parseFloat(balance.available_amount) - body.amount,
        })
        .eq('id', balance.id);

      // Create transaction record
      const { data: newTransaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          shift_id: activeShift?.id || null,
          operation_type: 'withdrawal',
          currency_id: body.currency.id,
          amount: body.amount,
          rate: 1,
          total_amount: body.amount,
          status: 'completed',
          note: body.note,
        })
        .select(`
          *,
          currency:currencies(*)
        `)
        .single();

      if (txError) throw txError;

      const transaction = {
        id: newTransaction.id,
        operationType: newTransaction.operation_type,
        amount: parseFloat(newTransaction.amount),
        currency: {
          id: newTransaction.currency.id,
          code: newTransaction.currency.code,
          name: newTransaction.currency.name,
          symbol: newTransaction.currency.symbol,
        },
        rate: parseFloat(newTransaction.rate),
        totalAmount: parseFloat(newTransaction.total_amount),
        profit: newTransaction.profit ? parseFloat(newTransaction.profit) : null,
        status: newTransaction.status,
        paymentCurrency: newTransaction.payment_currency,
        uzsRate: newTransaction.uzs_rate ? parseFloat(newTransaction.uzs_rate) : null,
        totalAmountUzs: newTransaction.total_amount_uzs ? parseFloat(newTransaction.total_amount_uzs) : null,
        paidAmountUsd: newTransaction.paid_amount_usd ? parseFloat(newTransaction.paid_amount_usd) : null,
        paidAmountUzs: newTransaction.paid_amount_uzs ? parseFloat(newTransaction.paid_amount_uzs) : null,
        remainingAmount: newTransaction.remaining_amount ? parseFloat(newTransaction.remaining_amount) : null,
        walletAddress: newTransaction.wallet_address,
        note: newTransaction.note,
        createdAt: newTransaction.created_at,
      };

      return new Response(JSON.stringify(transaction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Safe operations error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});