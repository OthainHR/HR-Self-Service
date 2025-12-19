import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// ─── Graph helpers ────────────────────────────────────────────────────────────
async function getMicrosoftGraphToken(tenant, id, secret) {
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: id,
    scope: 'https://graph.microsoft.com/.default',
    client_secret: secret,
    grant_type: 'client_credentials'
  });
  const r = await fetch(url, {
    method: 'POST',
    body: params
  });
  if (!r.ok) throw new Error(`Graph token error ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}
async function sendMicrosoftGraphEmail(token, from, to, subject, html, cc = []) {
  if (!to.length) {
    console.log('No "To" recipients provided. Skipping email send.');
    return {
      success: false,
      message: 'No recipients'
    };
  }
  const r = await fetch(`https://graph.microsoft.com/v1.0/users/${from}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: html
        },
        toRecipients: to.map((a)=>({
            emailAddress: {
              address: a
            }
          })),
        ccRecipients: cc.map((a)=>({
            emailAddress: {
              address: a
            }
          }))
      },
      saveToSentItems: 'true'
    })
  });
  if (r.status === 202) return {
    success: true,
    status: 202
  };
  throw new Error(`sendMail failed ${r.status}: ${await r.text()}`);
}
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req)=>{
  const { record, old_record, type } = await req.json();
  // 1) Only fire on an UPDATE where expense_status changed and category_id==5
  if (type !== 'UPDATE' || old_record.expense_status === record.expense_status || record.category_id !== 5) {
    return new Response(null, {
      status: 200
    });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  
  // Query v_ticket_board to get complete ticket data including expense fields
  const { data: ticket } = await supabase.from('v_ticket_board').select('*').eq('id', record.id).single();
  if (!ticket) {
    console.error('Could not find ticket in v_ticket_board:', record.id);
    return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });
  }
  
  // 2) Lookup new assignee's email
  const { data: user } = await supabase.from('users').select('email').eq('id', ticket.assignee).single();
  const to = user?.email ? [
    user.email
  ] : [
    'accounts@othainsoft.com'
  ];
  // 3) Lookup previous assignee's NAME from ticket_assignees
  const { data: prev } = await supabase.from('ticket_assignees').select('name').eq('user_id', old_record.assignee).single();
  const prevName = prev?.name ?? 'your teammate';
  // 4) Lookup category & sub-category
  const { data: cat } = await supabase.from('categories').select('name').eq('id', ticket.category_id).single();
  const categoryName = cat?.name ?? 'N/A';
  const { data: sub } = await supabase.from('sub_categories').select('name').eq('id', ticket.sub_category_id).single();
  const subcategoryName = sub?.name ?? 'N/A';
  // 5) Compose & send
  try {
    const token = await getMicrosoftGraphToken(Deno.env.get('MICROSOFT_TENANT_ID'), Deno.env.get('MICROSOFT_CLIENT_ID'), Deno.env.get('MICROSOFT_CLIENT_SECRET'));
    const from = 'accounts@othainsoft.com';
    // Generate proper ticket number based on category and creation order
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', ticket.category_id)
      .lte('created_at', ticket.created_at);
    
    const sequenceNumber = String(count || 1).padStart(3, '0');
    const shortId = `OTH-EXP${sequenceNumber}`;
    const link = `${Deno.env.get('APP_BASE_URL')}/ticket/${ticket.id}`;
    const subject = `[Action Required] #${shortId} needs your approval`;
    const html = `
      <p>An expense has been approved by <strong>${prevName}</strong> for <strong>${ticket.expense_amount}</strong> INR, and the expense request has moved to <strong>${ticket.expense_status}</strong>.  
      Please click the ticket link below and change the status in the Expense Dashboard to approve this expense.</p>

      <p><strong>Category:</strong> ${categoryName}</p>
      <p><strong>Sub-category:</strong> ${subcategoryName}</p><hr/>

      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      ${ticket.expense_amount ? `<p><strong>Expense Amount:</strong> ₹${parseFloat(ticket.expense_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ''}
      ${ticket.payment_type ? `<p><strong>Payment Type:</strong> ${ticket.payment_type}</p>` : ''}
      <p><strong>Description:</strong><br/><pre>${ticket.description ?? 'N/A'}</pre></p>
      ${ticket.client ? `<p><strong>Client:</strong> ${ticket.client}</p>` : ''}

      <p>View: <a href="${link}">${link}</a></p>
    `;
    const result = await sendMicrosoftGraphEmail(token, from, to, subject, html);
    console.log('✅ expense-email send result:', result);
  } catch (err) {
    console.error('❌ expense-email error:', err);
  }
  return new Response(JSON.stringify({
    sent: true
  }), {
    status: 200
  });
});