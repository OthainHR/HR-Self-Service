// send-ticket-email-ms-graph.ts
// Edge Function for Supabase (Deno Deploy)
// ————————————————————————————————————————————————————————————————
//  • Sends ticket-related e-mails via Microsoft Graph.
//  • ALWAYS copies sunhith.reddy@othainsoft.com on any ticket whose category
//    is “AI”, “AI Request”, or “AI Requests”.
// ————————————————————————————————————————————————————————————————
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const AI_HANDLER_EMAIL = 'sunhith.reddy@othainsoft.com';
// ─── MS Graph helpers ────────────────────────────────────────────────────────
async function getMicrosoftGraphToken(tenant, id, secret) {
  const url = https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token;
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
  if (!r.ok) throw new Error(Graph token error ${r.status}: ${await r.text()});
  return (await r.json()).access_token;
}
async function sendMicrosoftGraphEmail(token, from, to, subject, html, cc = []) {
  if (!to || !to.length) {
    console.log('No "To" recipients provided. Skipping email send.');
    return {
      success: false,
      message: 'No recipients'
    };
  }
  const r = await fetch(https://graph.microsoft.com/v1.0/users/${from}/sendMail, {
    method: 'POST',
    headers: {
      Authorization: Bearer ${token},
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
  throw new Error(sendMail failed ${r.status}: ${await r.text()});
}
// ─── Edge entrypoint ─────────────────────────────────────────────────────────
serve(async (req)=>{
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      global: {
        headers: {
          Authorization: Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}
        }
      }
    });
    const graphToken = await getMicrosoftGraphToken(Deno.env.get('MICROSOFT_TENANT_ID'), Deno.env.get('MICROSOFT_CLIENT_ID'), Deno.env.get('MICROSOFT_CLIENT_SECRET'));
    const { record: raw, old_record: oldRec, type: eventType } = await req.json();
    if (!raw || !raw.id && !raw.ticket_id) {
      return new Response(JSON.stringify({
        error: 'Invalid payload'
      }), {
        status: 400,
        headers
      });
    }
    const isComm = !!raw.ticket_id && !!raw.message;
    let ticket = isComm ? (await supabase.from('tickets').select('*').eq('id', raw.ticket_id).single()).data : raw;
    if (!ticket) throw new Error(Could not find ticket with ID: ${isComm ? raw.ticket_id : raw.id});
    // — category / subcategory names —
    const categoryName = (ticket.category_id ? (await supabase.from('categories').select('name').eq('id', ticket.category_id).single()).data?.name : null) ?? null;
    const subcategoryName = (ticket.sub_category_id ? (await supabase.from('sub_categories').select('name').eq('id', ticket.sub_category_id).single()).data?.name : null) ?? null;
    // — sender & prefix —
    let fromEmail = '';
    let prefix = 'OTH';
    const isExpenseCategory = [
      'expense management',
      'expense',
      'expenses'
    ].includes((categoryName ?? '').toLowerCase().trim());
    const isAiCategory = [
      'ai',
      'ai request',
      'ai requests',
      'general ai request'
    ].includes((categoryName ?? '').toLowerCase().trim());
    switch((categoryName ?? '').toLowerCase().trim()){
      case 'it':
      case 'it support':
      case 'it requests':
        prefix = 'OTH-IT';
        fromEmail = 'it@othainsoft.com';
        break;
      case 'hr':
      case 'hr support':
      case 'hr requests':
      case 'leave applications':
      case 'benefits inquiries':
        prefix = 'OTH-HR';
        fromEmail = 'hr@othainsoft.com';
        break;
      case 'accounts':
      case 'accounts support':
      case 'accounts requests':
      case 'tax payments':
      case 'payroll requests':
      case 'payroll':
        prefix = 'OTH-ACC';
        fromEmail = 'accounts@othainsoft.com';
        break;
      case 'expense management':
      case 'expense':
      case 'expenses':
        prefix = 'OTH-EXP';
        fromEmail = 'accounts@othainsoft.com';
        break;
      case 'operations':
      case 'ops':
        prefix = 'OTH-OPS';
        fromEmail = 'it@othainsoft.com';
        break;
      case 'ai':
      case 'ai request':
      case 'ai requests':
      case 'general ai request':
        prefix = 'OTH-AI';
        fromEmail = 'it@othainsoft.com';
        break;
      default:
        fromEmail = Deno.env.get('DEFAULT_SENDER_EMAIL');
    }
    const shortId = ${prefix}${ticket.id.slice(0, 8)};
    const link = ${Deno.env.get('APP_BASE_URL')}/ticket/${ticket.id};
    const ccRecipients = isAiCategory ? [
      AI_HANDLER_EMAIL
    ] : [];
    // EVENT-SPECIFIC LOGIC
    if (isComm) {
      const requesterEmail = (ticket.requested_by ? (await supabase.from('users').select('email').eq('id', ticket.requested_by).single()).data?.email : null) ?? null;
      const assigneeEmail = (ticket.assignee ? (await supabase.from('users').select('email').eq('id', ticket.assignee).single()).data?.email : null) ?? null;
      const commAuthor = (raw.user_id ? (await supabase.from('users').select('email').eq('id', raw.user_id).single()).data?.email : null) ?? 'System';
      const recipients = new Set();
      let subject = '';
      switch((raw.type ?? '').toLowerCase()){
        case 'admin_reply':
          subject = [Admin Reply #${shortId}] ${ticket.title};
          if (requesterEmail) recipients.add(requesterEmail);
          break;
        case 'customer_reply':
          subject = [Customer Reply #${shortId}] ${ticket.title};
          if (assigneeEmail) recipients.add(assigneeEmail);
          break;
        case 'internal_note':
          subject = [Internal Note #${shortId}] ${ticket.title};
          if (assigneeEmail && commAuthor !== assigneeEmail) recipients.add(assigneeEmail);
          break;
        default:
          console.log(Unhandled comment type "${raw.type}", no email sent.);
          return new Response(JSON.stringify({
            message: 'Unhandled comm type'
          }), {
            status: 200,
            headers
          });
      }
      if (recipients.size > 0) {
        let htmlBody = <p><strong>Category:</strong> ${categoryName ?? 'N/A'}</p><hr/>;
        htmlBody += <p>A new reply has been added to ticket #${shortId}.</p><p><strong>Reply from ${commAuthor}:</strong><br/><pre>${raw.message}</pre></p><p>View: <a href="${link}">${link}</a></p>;
        await sendMicrosoftGraphEmail(graphToken, fromEmail, [
          ...recipients
        ], subject, htmlBody, ccRecipients);
      }
    } else if (eventType === 'INSERT') {
      const requesterEmail = (ticket.requested_by ? (await supabase.from('users').select('email').eq('id', ticket.requested_by).single()).data?.email : null) ?? null;
      const assigneeEmail = (ticket.assignee ? (await supabase.from('users').select('email').eq('id', ticket.assignee).single()).data?.email : null) ?? null;
      const recipients = new Set();
      if (requesterEmail) recipients.add(requesterEmail);
      if (assigneeEmail) recipients.add(assigneeEmail);
      const displayStatus = isExpenseCategory ? ticket.expense_status ?? ticket.status : ticket.status;
      const subject = [New Ticket #${shortId}] ${ticket.title};
      let htmlBody = <p><strong>Category:</strong> ${categoryName ?? 'N/A'}</p><p><strong>Sub-category:</strong> ${subcategoryName ?? 'N/A'}</p><hr/>;
      htmlBody += <p>A new ticket has been created.</p><p><strong>Title:</strong> ${ticket.title}</p><p><strong>Status:</strong> ${displayStatus}</p><p><strong>Priority:</strong> ${ticket.priority}</p><p><strong>Description:</strong><br/><pre>${ticket.description ?? 'N/A'}</pre></p>${ticket.client ? <p><strong>Client:</strong> ${ticket.client}</p> : ''}${ticket.due_at ? <p><strong>Due At:</strong> ${new Date(ticket.due_at).toLocaleString()}</p> : ''}<p>View: <a href="${link}">${link}</a></p>;
      await sendMicrosoftGraphEmail(graphToken, fromEmail, [
        ...recipients
      ], subject, htmlBody, ccRecipients);
    } else if (eventType === 'UPDATE') {
  // ───── only enter when the ticket is an Expense AND the new assignee is present ─────
  if (
    isExpenseCategory &&
    ticket.assignee &&                    // ← ADD THIS GUARD LINE
    oldRec.assignee !== ticket.assignee
  ) 
    // --- Expense-approval workflow ---
    const assigneeEmail = (await supabase
      .from('users')
      .select('email')
      .eq('id', ticket.assignee)
      .single()).data?.email ?? null;

    const oldAssigneeEmail = oldRec.assignee
      ? (await supabase
          .from('users')
          .select('email')
          .eq('id', oldRec.assignee)
          .single()).data?.email ?? null
      : null;

    if (assigneeEmail) {
      const subject  = [Action Required #${shortId}] Expense request needs your approval: ${ticket.title};
      let   htmlBody = <p><strong>Category:</strong> ${categoryName ?? 'N/A'}</p><hr/>;
      htmlBody      += <p>An expense request is now assigned to you for approval.</p>;
      htmlBody      += <p>The status is: <strong>${ticket.expense_status}</strong></p>;
      htmlBody      += <p>Please review the details and take action.</p>;
      htmlBody      += <p>View Ticket: <a href="${link}">${link}</a></p>;

      await sendMicrosoftGraphEmail(
        graphToken,
        fromEmail,
        [assigneeEmail],
        subject,
        htmlBody,
        ccRecipients
      );
    } else {
      console.error(
        Could not find email for new assignee UUID: ${ticket.assignee}.  +
        'No "Action Required" email sent.'
      );
    }
    }
    if (oldAssigneeEmail) {
      const subject  = [Update #${shortId}] Expense request you handled has been reassigned;
      let   htmlBody = <p><strong>Category:</strong> ${categoryName ?? 'N/A'}</p><hr/>;
      htmlBody      += <p>The expense request you recently handled has been successfully moved to the next step.</p>;
      htmlBody      += <p>Its new status is: <strong>${ticket.expense_status}</strong></p>;
      htmlBody      += <p>No further action is required from you on this ticket.</p>;
      htmlBody      += <p>View Ticket: <a href="${link}">${link}</a></p>;

      await sendMicrosoftGraphEmail(
        graphToken,
        fromEmail,
        [oldAssigneeEmail],
        subject,
        htmlBody,
        ccRecipients
      );
    }
     
      } else {
        // --- It's a General Update (Functionality is Preserved) ---
        const requesterEmail = (ticket.requested_by ? (await supabase.from('users').select('email').eq('id', ticket.requested_by).single()).data?.email : null) ?? null;
        const assigneeEmail = (ticket.assignee ? (await supabase.from('users').select('email').eq('id', ticket.assignee).single()).data?.email : null) ?? null;
        const oldAssigneeEmail = oldRec.assignee ? (await supabase.from('users').select('email').eq('id', oldRec.assignee).single()).data?.email : null;
        let changes = '';
        if (oldRec.status !== ticket.status) changes += <li>Status: ${oldRec.status} → ${ticket.status}</li>;
        if (oldRec.priority !== ticket.priority) changes += <li>Priority: ${oldRec.priority} → ${ticket.priority}</li>;
        if (oldRec.due_at !== ticket.due_at) changes += <li>Due At: ${oldRec.due_at ?? 'None'} → ${ticket.due_at ?? 'None'}</li>;
        // This line is now correct and does NOT have the flawed "!isExpenseCategory" check.
        if (oldAssigneeEmail !== assigneeEmail) {
          changes += <li>Assignee: ${oldAssigneeEmail ?? 'Unassigned'} → ${assigneeEmail ?? 'Unassigned'}</li>;
        }
        if (changes) {
          const recipients = new Set();
          if (requesterEmail) recipients.add(requesterEmail);
          if (assigneeEmail) recipients.add(assigneeEmail);
          const subject = [Ticket Update #${shortId}] ${ticket.title};
          let htmlBody = <p><strong>Category:</strong> ${categoryName ?? 'N/A'}</p><hr/>;
          htmlBody += <p>Ticket <strong>#${shortId}</strong> has been updated.</p><ul>${changes}</ul><p>View: <a href="${link}">${link}</a></p>;
          await sendMicrosoftGraphEmail(graphToken, fromEmail, [
            ...recipients
          ], subject, htmlBody, ccRecipients);
        } else {
          console.log('Update occurred, but no tracked fields changed for a general notification. No email sent.');
        }
      }
    }
    return new Response(JSON.stringify({
      message: 'Mail task processed.'
    }), {
      status: 200,
      headers
    });
  } catch (e) {
    console.error('Edge Function error:', e);
    return new Response(JSON.stringify({
      error: e.message
    }), {
      status: 500,
      headers
    });
  }
});


