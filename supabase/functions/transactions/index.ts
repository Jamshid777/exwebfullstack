import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TransactionRequest {
  operationType: 'buy' | 'sell';
  amount: number;
  currency: { id: number; code: string; name: string; symbol: string };
  rate: number;
  paymentCurrency: 'USD' | 'UZS' | 'MIX';
  uzsRate?: number;
  paidAmountUsd?: number;
  paidAmountUzs?: number;
  walletAddress?: string;
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

    // GET /transactions - fetch all transactions
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          currency:currencies(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactions = data.map((t: any) => ({
        id: t.id,
        operationType: t.operation_type,
        amount: parseFloat(t.amount),
        currency: {
          id: t.currency.id,
          code: t.currency.code,
          name: t.currency.name,
          symbol: t.currency.symbol,
        },
        rate: parseFloat(t.rate),
        totalAmount: parseFloat(t.total_amount),
        profit: t.profit ? parseFloat(t.profit) : null,
        status: t.status,
        paymentCurrency: t.payment_currency,
        uzsRate: t.uzs_rate ? parseFloat(t.uzs_rate) : null,
        totalAmountUzs: t.total_amount_uzs ? parseFloat(t.total_amount_uzs) : null,
        paidAmountUsd: t.paid_amount_usd ? parseFloat(t.paid_amount_usd) : null,
        paidAmountUzs: t.paid_amount_uzs ? parseFloat(t.paid_amount_uzs) : null,
        remainingAmount: t.remaining_amount ? parseFloat(t.remaining_amount) : null,
        walletAddress: t.wallet_address,
        note: t.note,
        createdAt: t.created_at,
      }));

      return new Response(JSON.stringify(transactions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /transactions - create new transaction
    if (req.method === 'POST') {
      const body: TransactionRequest = await req.json();

      // Get active shift
      const { data: activeShift, error: shiftError } = await supabase
        .from('shifts')
        .select('id')
        .is('end_time', null)
        .maybeSingle();

      if (shiftError) throw shiftError;
      if (!activeShift) {
        return new Response(JSON.stringify({ error: 'No active shift' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate total amounts
      let totalAmount = body.amount * body.rate;
      let totalAmountUzs = null;
      let paidAmountUsd = null;
      let paidAmountUzs = null;

      if (body.operationType === 'buy') {
        if (body.paymentCurrency === 'USD') {
          paidAmountUsd = totalAmount;
        } else if (body.paymentCurrency === 'UZS' && body.uzsRate) {
          totalAmountUzs = totalAmount * body.uzsRate;
          paidAmountUzs = totalAmountUzs;
        } else if (body.paymentCurrency === 'MIX') {
          paidAmountUsd = body.paidAmountUsd || 0;
          paidAmountUzs = body.paidAmountUzs || 0;
          totalAmountUzs = body.uzsRate ? (totalAmount - paidAmountUsd) * body.uzsRate : null;
        }

        // Validate balances for buy
        const { data: balances } = await supabase.from('balances').select('*, currency:currencies(code)');
        const usdBalance = balances?.find((b: any) => b.currency.code === 'USD');
        const uzsBalance = balances?.find((b: any) => b.currency.code === 'UZS');

        if (paidAmountUsd && usdBalance && parseFloat(usdBalance.available_amount) < paidAmountUsd) {
          return new Response(JSON.stringify({ error: 'Insufficient USD balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (paidAmountUzs && uzsBalance && parseFloat(uzsBalance.available_amount) < paidAmountUzs) {
          return new Response(JSON.stringify({ error: 'Insufficient UZS balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update balances - deduct payment currencies, add purchased currency
        if (paidAmountUsd && usdBalance) {
          await supabase.from('balances').update({
            amount: parseFloat(usdBalance.amount) - paidAmountUsd,
            available_amount: parseFloat(usdBalance.available_amount) - paidAmountUsd,
          }).eq('id', usdBalance.id);
        }

        if (paidAmountUzs && uzsBalance) {
          await supabase.from('balances').update({
            amount: parseFloat(uzsBalance.amount) - paidAmountUzs,
            available_amount: parseFloat(uzsBalance.available_amount) - paidAmountUzs,
          }).eq('id', uzsBalance.id);
        }

        // Add purchased currency
        const { data: currencyBalance } = await supabase
          .from('balances')
          .select('*')
          .eq('currency_id', body.currency.id)
          .single();

        if (currencyBalance) {
          await supabase.from('balances').update({
            amount: parseFloat(currencyBalance.amount) + body.amount,
            available_amount: parseFloat(currencyBalance.available_amount) + body.amount,
          }).eq('id', currencyBalance.id);
        }
      }

      // Handle SELL with FIFO profit calculation
      let profit = null;
      if (body.operationType === 'sell') {
        // Check if we have enough of the currency to sell
        const { data: currencyBalance } = await supabase
          .from('balances')
          .select('*')
          .eq('currency_id', body.currency.id)
          .single();

        if (!currencyBalance || parseFloat(currencyBalance.available_amount) < body.amount) {
          return new Response(JSON.stringify({ error: 'Insufficient currency balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // FIFO profit calculation
        const { data: lots } = await supabase
          .from('transactions')
          .select('*')
          .eq('currency_id', body.currency.id)
          .in('operation_type', ['buy', 'deposit'])
          .gt('remaining_amount', 0)
          .order('created_at', { ascending: true });

        let remainingToSell = body.amount;
        let totalCost = 0;

        if (lots) {
          for (const lot of lots) {
            if (remainingToSell <= 0) break;

            const lotRemaining = parseFloat(lot.remaining_amount);
            const amountFromLot = Math.min(remainingToSell, lotRemaining);
            const costFromLot = amountFromLot * parseFloat(lot.rate);

            totalCost += costFromLot;
            remainingToSell -= amountFromLot;

            // Update lot remaining amount
            await supabase.from('transactions').update({
              remaining_amount: lotRemaining - amountFromLot,
            }).eq('id', lot.id);
          }
        }

        const proceeds = body.amount * body.rate;
        profit = proceeds - totalCost;

        // Update balances - deduct sold currency, add USD
        await supabase.from('balances').update({
          amount: parseFloat(currencyBalance.amount) - body.amount,
          available_amount: parseFloat(currencyBalance.available_amount) - body.amount,
        }).eq('id', currencyBalance.id);

        const { data: usdBalance } = await supabase
          .from('balances')
          .select('*, currency:currencies(code)')
          .eq('currency_id', (await supabase.from('currencies').select('id').eq('code', 'USD').single()).data.id)
          .single();

        if (usdBalance) {
          await supabase.from('balances').update({
            amount: parseFloat(usdBalance.amount) + totalAmount,
            available_amount: parseFloat(usdBalance.available_amount) + totalAmount,
          }).eq('id', usdBalance.id);
        }
      }

      // Create transaction record
      const { data: newTransaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          shift_id: activeShift.id,
          operation_type: body.operationType,
          currency_id: body.currency.id,
          amount: body.amount,
          rate: body.rate,
          total_amount: totalAmount,
          profit: profit,
          status: 'completed',
          payment_currency: body.paymentCurrency,
          uzs_rate: body.uzsRate,
          total_amount_uzs: totalAmountUzs,
          paid_amount_usd: paidAmountUsd,
          paid_amount_uzs: paidAmountUzs,
          remaining_amount: body.operationType === 'buy' ? body.amount : null,
          wallet_address: body.walletAddress,
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
    console.error('Transaction error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});