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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // GET /shifts - fetch all shifts
    if (req.method === 'GET' && path.endsWith('/shifts')) {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;

      const shifts = await Promise.all(
        data.map(async (s: any) => {
          // Get transactions for this shift
          const { data: txs } = await supabase
            .from('transactions')
            .select('*, currency:currencies(*)')
            .eq('shift_id', s.id)
            .order('created_at', { ascending: false });

          // Get expenses for this shift
          const { data: exps } = await supabase
            .from('expenses')
            .select('*')
            .eq('shift_id', s.id)
            .order('created_at', { ascending: false });

          const transactions = txs?.map((t: any) => ({
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
          })) || [];

          const expenses = exps?.map((e: any) => ({
            id: e.id,
            categoryId: e.category_id,
            amount: parseFloat(e.amount),
            currency: e.currency,
            amountUsd: parseFloat(e.amount_usd),
            uzsRate: e.uzs_rate ? parseFloat(e.uzs_rate) : null,
            note: e.note,
            createdAt: e.created_at,
          })) || [];

          // Transform balances
          const startingBalances = [];
          if (s.starting_balances && typeof s.starting_balances === 'object') {
            const { data: currencies } = await supabase.from('currencies').select('*');
            for (const curr of currencies || []) {
              const balance = s.starting_balances[curr.code] || 0;
              startingBalances.push({
                currency: curr,
                amount: balance,
                reservedAmount: 0,
                availableAmount: balance,
                lastUpdated: s.start_time,
              });
            }
          }

          const endingBalances = [];
          if (s.ending_balances && typeof s.ending_balances === 'object') {
            const { data: currencies } = await supabase.from('currencies').select('*');
            for (const curr of currencies || []) {
              const balance = s.ending_balances[curr.code] || 0;
              endingBalances.push({
                currency: curr,
                amount: balance,
                reservedAmount: 0,
                availableAmount: balance,
                lastUpdated: s.end_time,
              });
            }
          }

          return {
            id: s.id,
            startTime: s.start_time,
            endTime: s.end_time,
            startingBalances,
            endingBalances: s.end_time ? endingBalances : null,
            transactions,
            expenses,
            grossProfit: parseFloat(s.gross_profit),
            totalExpenses: parseFloat(s.total_expenses),
            netProfit: parseFloat(s.net_profit),
          };
        })
      );

      return new Response(JSON.stringify(shifts), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /shifts/active - get active shift
    if (req.method === 'GET' && path.includes('/active')) {
      const { data: activeShift, error } = await supabase
        .from('shifts')
        .select('*')
        .is('end_time', null)
        .maybeSingle();

      if (error) throw error;

      if (!activeShift) {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      // Get transactions and expenses
      const { data: txs } = await supabase
        .from('transactions')
        .select('*, currency:currencies(*)')
        .eq('shift_id', activeShift.id)
        .order('created_at', { ascending: false });

      const { data: exps } = await supabase
        .from('expenses')
        .select('*')
        .eq('shift_id', activeShift.id)
        .order('created_at', { ascending: false });

      const transactions = txs?.map((t: any) => ({
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
      })) || [];

      const expenses = exps?.map((e: any) => ({
        id: e.id,
        categoryId: e.category_id,
        amount: parseFloat(e.amount),
        currency: e.currency,
        amountUsd: parseFloat(e.amount_usd),
        uzsRate: e.uzs_rate ? parseFloat(e.uzs_rate) : null,
        note: e.note,
        createdAt: e.created_at,
      })) || [];

      const startingBalances = [];
      if (activeShift.starting_balances && typeof activeShift.starting_balances === 'object') {
        const { data: currencies } = await supabase.from('currencies').select('*');
        for (const curr of currencies || []) {
          const balance = activeShift.starting_balances[curr.code] || 0;
          startingBalances.push({
            currency: curr,
            amount: balance,
            reservedAmount: 0,
            availableAmount: balance,
            lastUpdated: activeShift.start_time,
          });
        }
      }

      const shift = {
        id: activeShift.id,
        startTime: activeShift.start_time,
        endTime: activeShift.end_time,
        startingBalances,
        endingBalances: null,
        transactions,
        expenses,
        grossProfit: parseFloat(activeShift.gross_profit),
        totalExpenses: parseFloat(activeShift.total_expenses),
        netProfit: parseFloat(activeShift.net_profit),
      };

      return new Response(JSON.stringify(shift), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /shifts/start - start new shift
    if (req.method === 'POST' && path.includes('/start')) {
      // Check for active shift
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .is('end_time', null)
        .maybeSingle();

      if (existingShift) {
        return new Response(JSON.stringify({ error: 'A shift is already active' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get current balances
      const { data: balances } = await supabase
        .from('balances')
        .select('*, currency:currencies(*)');

      const startingBalances: Record<string, number> = {};
      for (const b of balances || []) {
        startingBalances[b.currency.code] = parseFloat(b.amount);
      }

      // Create new shift
      const { data: newShift, error } = await supabase
        .from('shifts')
        .insert({
          starting_balances: startingBalances,
        })
        .select()
        .single();

      if (error) throw error;

      const startingBalancesArray = [];
      for (const b of balances || []) {
        startingBalancesArray.push({
          currency: b.currency,
          amount: parseFloat(b.amount),
          reservedAmount: parseFloat(b.reserved_amount),
          availableAmount: parseFloat(b.available_amount),
          lastUpdated: b.last_updated,
        });
      }

      const shift = {
        id: newShift.id,
        startTime: newShift.start_time,
        endTime: null,
        startingBalances: startingBalancesArray,
        endingBalances: null,
        transactions: [],
        expenses: [],
        grossProfit: 0,
        totalExpenses: 0,
        netProfit: 0,
      };

      return new Response(JSON.stringify(shift), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /shifts/end - end active shift
    if (req.method === 'POST' && path.includes('/end')) {
      // Get active shift
      const { data: activeShift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .is('end_time', null)
        .maybeSingle();

      if (shiftError) throw shiftError;
      if (!activeShift) {
        return new Response(JSON.stringify({ error: 'No active shift' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get transactions and calculate gross profit
      const { data: transactions } = await supabase
        .from('transactions')
        .select('profit')
        .eq('shift_id', activeShift.id)
        .eq('operation_type', 'sell');

      const grossProfit = transactions?.reduce(
        (sum: number, t: any) => sum + (t.profit ? parseFloat(t.profit) : 0),
        0
      ) || 0;

      // Get expenses and calculate total
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount_usd')
        .eq('shift_id', activeShift.id);

      const totalExpenses = expenses?.reduce(
        (sum: number, e: any) => sum + parseFloat(e.amount_usd),
        0
      ) || 0;

      const netProfit = grossProfit - totalExpenses;

      // Get current balances
      const { data: balances } = await supabase
        .from('balances')
        .select('*, currency:currencies(*)');

      const endingBalances: Record<string, number> = {};
      for (const b of balances || []) {
        endingBalances[b.currency.code] = parseFloat(b.amount);
      }

      // Update shift
      const { data: updatedShift, error: updateError } = await supabase
        .from('shifts')
        .update({
          end_time: new Date().toISOString(),
          ending_balances: endingBalances,
          gross_profit: grossProfit,
          total_expenses: totalExpenses,
          net_profit: netProfit,
        })
        .eq('id', activeShift.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Get transactions and expenses for response
      const { data: txs } = await supabase
        .from('transactions')
        .select('*, currency:currencies(*)')
        .eq('shift_id', updatedShift.id)
        .order('created_at', { ascending: false });

      const { data: exps } = await supabase
        .from('expenses')
        .select('*')
        .eq('shift_id', updatedShift.id)
        .order('created_at', { ascending: false });

      const transactionsArray = txs?.map((t: any) => ({
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
      })) || [];

      const expensesArray = exps?.map((e: any) => ({
        id: e.id,
        categoryId: e.category_id,
        amount: parseFloat(e.amount),
        currency: e.currency,
        amountUsd: parseFloat(e.amount_usd),
        uzsRate: e.uzs_rate ? parseFloat(e.uzs_rate) : null,
        note: e.note,
        createdAt: e.created_at,
      })) || [];

      const startingBalancesArray = [];
      if (updatedShift.starting_balances && typeof updatedShift.starting_balances === 'object') {
        const { data: currencies } = await supabase.from('currencies').select('*');
        for (const curr of currencies || []) {
          const balance = updatedShift.starting_balances[curr.code] || 0;
          startingBalancesArray.push({
            currency: curr,
            amount: balance,
            reservedAmount: 0,
            availableAmount: balance,
            lastUpdated: updatedShift.start_time,
          });
        }
      }

      const endingBalancesArray = [];
      if (updatedShift.ending_balances && typeof updatedShift.ending_balances === 'object') {
        const { data: currencies } = await supabase.from('currencies').select('*');
        for (const curr of currencies || []) {
          const balance = updatedShift.ending_balances[curr.code] || 0;
          endingBalancesArray.push({
            currency: curr,
            amount: balance,
            reservedAmount: 0,
            availableAmount: balance,
            lastUpdated: updatedShift.end_time,
          });
        }
      }

      const shift = {
        id: updatedShift.id,
        startTime: updatedShift.start_time,
        endTime: updatedShift.end_time,
        startingBalances: startingBalancesArray,
        endingBalances: endingBalancesArray,
        transactions: transactionsArray,
        expenses: expensesArray,
        grossProfit: parseFloat(updatedShift.gross_profit),
        totalExpenses: parseFloat(updatedShift.total_expenses),
        netProfit: parseFloat(updatedShift.net_profit),
      };

      return new Response(JSON.stringify(shift), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Shifts error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});