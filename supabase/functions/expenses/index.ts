import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ExpenseRequest {
  categoryId: string;
  amount: number;
  currency: 'USD' | 'UZS';
  uzsRate?: number;
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

    // GET /expenses - fetch all expenses
    if (req.method === 'GET' && !path.includes('categories')) {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const expenses = data.map((e: any) => ({
        id: e.id,
        categoryId: e.category_id,
        amount: parseFloat(e.amount),
        currency: e.currency,
        amountUsd: parseFloat(e.amount_usd),
        uzsRate: e.uzs_rate ? parseFloat(e.uzs_rate) : null,
        note: e.note,
        createdAt: e.created_at,
      }));

      return new Response(JSON.stringify(expenses), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /expense-categories - fetch all categories
    if (req.method === 'GET' && path.includes('categories')) {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      const categories = data.map((c: any) => ({
        id: c.id,
        name: c.name,
      }));

      return new Response(JSON.stringify(categories), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /expense-categories - create new category
    if (req.method === 'POST' && path.includes('categories')) {
      const { name } = await req.json();

      if (!name || name.trim() === '') {
        return new Response(JSON.stringify({ error: 'Category name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for duplicate
      const { data: existing } = await supabase
        .from('expense_categories')
        .select('id')
        .ilike('name', name.trim())
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: 'Category already exists' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: newCategory, error } = await supabase
        .from('expense_categories')
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          id: newCategory.id,
          name: newCategory.name,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /expenses - create new expense
    if (req.method === 'POST' && !path.includes('categories')) {
      const body: ExpenseRequest = await req.json();

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

      // Calculate amount in USD
      let amountUsd = body.amount;
      if (body.currency === 'UZS' && body.uzsRate) {
        amountUsd = body.amount / body.uzsRate;
      }

      // Get balance for the expense currency
      const { data: currencies } = await supabase
        .from('currencies')
        .select('id')
        .eq('code', body.currency)
        .single();

      if (!currencies) {
        return new Response(JSON.stringify({ error: 'Invalid currency' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: balance } = await supabase
        .from('balances')
        .select('*')
        .eq('currency_id', currencies.id)
        .single();

      if (!balance || parseFloat(balance.available_amount) < body.amount) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update balance
      await supabase
        .from('balances')
        .update({
          amount: parseFloat(balance.amount) - body.amount,
          available_amount: parseFloat(balance.available_amount) - body.amount,
        })
        .eq('id', balance.id);

      // Create expense
      const { data: newExpense, error } = await supabase
        .from('expenses')
        .insert({
          shift_id: activeShift.id,
          category_id: body.categoryId,
          amount: body.amount,
          currency: body.currency,
          amount_usd: amountUsd,
          uzs_rate: body.uzsRate,
          note: body.note,
        })
        .select()
        .single();

      if (error) throw error;

      const expense = {
        id: newExpense.id,
        categoryId: newExpense.category_id,
        amount: parseFloat(newExpense.amount),
        currency: newExpense.currency,
        amountUsd: parseFloat(newExpense.amount_usd),
        uzsRate: newExpense.uzs_rate ? parseFloat(newExpense.uzs_rate) : null,
        note: newExpense.note,
        createdAt: newExpense.created_at,
      };

      return new Response(JSON.stringify(expense), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /expenses/:id - update expense
    if (req.method === 'PUT') {
      const pathParts = path.split('/');
      const expenseId = pathParts[pathParts.length - 1];
      const body: ExpenseRequest & { id: string } = await req.json();

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

      // Get original expense
      const { data: originalExpense } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .single();

      if (!originalExpense) {
        return new Response(JSON.stringify({ error: 'Expense not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Revert original expense balance
      const { data: origCurrency } = await supabase
        .from('currencies')
        .select('id')
        .eq('code', originalExpense.currency)
        .single();

      const { data: origBalance } = await supabase
        .from('balances')
        .select('*')
        .eq('currency_id', origCurrency.id)
        .single();

      if (origBalance) {
        await supabase
          .from('balances')
          .update({
            amount: parseFloat(origBalance.amount) + parseFloat(originalExpense.amount),
            available_amount: parseFloat(origBalance.available_amount) + parseFloat(originalExpense.amount),
          })
          .eq('id', origBalance.id);
      }

      // Calculate new amount in USD
      let amountUsd = body.amount;
      if (body.currency === 'UZS' && body.uzsRate) {
        amountUsd = body.amount / body.uzsRate;
      }

      // Get new currency balance
      const { data: newCurrency } = await supabase
        .from('currencies')
        .select('id')
        .eq('code', body.currency)
        .single();

      const { data: newBalance } = await supabase
        .from('balances')
        .select('*')
        .eq('currency_id', newCurrency.id)
        .single();

      if (!newBalance || parseFloat(newBalance.available_amount) < body.amount) {
        // Revert the original balance change if new balance is insufficient
        if (origBalance) {
          await supabase
            .from('balances')
            .update({
              amount: parseFloat(origBalance.amount),
              available_amount: parseFloat(origBalance.available_amount),
            })
            .eq('id', origBalance.id);
        }
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deduct new amount
      await supabase
        .from('balances')
        .update({
          amount: parseFloat(newBalance.amount) - body.amount,
          available_amount: parseFloat(newBalance.available_amount) - body.amount,
        })
        .eq('id', newBalance.id);

      // Update expense
      const { data: updatedExpense, error } = await supabase
        .from('expenses')
        .update({
          category_id: body.categoryId,
          amount: body.amount,
          currency: body.currency,
          amount_usd: amountUsd,
          uzs_rate: body.uzsRate,
          note: body.note,
        })
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;

      const expense = {
        id: updatedExpense.id,
        categoryId: updatedExpense.category_id,
        amount: parseFloat(updatedExpense.amount),
        currency: updatedExpense.currency,
        amountUsd: parseFloat(updatedExpense.amount_usd),
        uzsRate: updatedExpense.uzs_rate ? parseFloat(updatedExpense.uzs_rate) : null,
        note: updatedExpense.note,
        createdAt: updatedExpense.created_at,
      };

      return new Response(JSON.stringify(expense), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Expenses error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});