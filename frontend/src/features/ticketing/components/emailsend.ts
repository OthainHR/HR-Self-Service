// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
console.log('send-ticket-email-ms-graph function initializing');
// --- Microsoft Graph API Helper Functions ---
async function getMicrosoftGraphToken(tenantId, clientId, clientSecret) {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');
  const response = await fetch(url, {
    method: 'POST',
    body: params
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error fetching MS Graph token:', errorData);
    throw new Error(`Error fetching MS Graph token: ${response.status} ${JSON.stringify(errorData)}`);
  }
  const tokenData = await response.json();
  return tokenData.access_token;
}
async function sendMicrosoftGraphEmail(token, fromAddress, toAddresses, subject, htmlBody) {
  if (toAddresses.length === 0) {
    console.log(`No recipients for email with subject: ${subject}`);
    return {
      success: false,
      message: 'No recipients'
    };
  }
  const url = `https://graph.microsoft.com/v1.0/users/${fromAddress}/sendMail`;
  const emailPayload = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody
      },
      toRecipients: toAddresses.map((addr)=>({
          emailAddress: {
            address: addr
          }
        }))
    },
    saveToSentItems: 'true'
  };
  console.log(`Attempting to send email via MS Graph: From ${fromAddress}, To: ${toAddresses.join(', ')}, Subject: ${subject}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
  });
  if (response.status === 202) {
    console.log(`MS Graph sendMail accepted for delivery from ${fromAddress} to ${toAddresses.join(', ')}`);
    return {
      success: true,
      status: response.status
    };
  } else {
    const errorData = await response.text();
    console.error(`MS Graph sendMail error: ${response.status}`, errorData);
    throw new Error(`Failed to send email via MS Graph for user ${fromAddress}: ${response.status} - ${errorData}`);
  }
}
// --- End Microsoft Graph API Helper Functions ---
serve(async (req)=>{
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      global: {
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        }
      }
    });
    // Microsoft Graph API Credentials
    const msClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const msClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    const msTenantId = Deno.env.get('MICROSOFT_TENANT_ID');
    if (!msClientId || !msClientSecret || !msTenantId) {
      console.error('Microsoft Graph API credentials not set in environment variables.');
      return new Response(JSON.stringify({
        error: 'MS Graph API credentials not configured'
      }), {
        status: 500,
        headers
      });
    }
    const msGraphToken = await getMicrosoftGraphToken(msTenantId, msClientId, msClientSecret);
    const payload = await req.json();
    const { record: rawRecord, old_record: rawOldRecord, type: eventType, table: eventTable } = payload;
    console.log(`Event type: ${eventType}, Table: ${eventTable || 'N/A'}`);
    console.log('Received rawRecord:', JSON.stringify(rawRecord, null, 2));
    if (rawOldRecord) console.log('Received rawOldRecord:', JSON.stringify(rawOldRecord, null, 2));
    if (!rawRecord || !rawRecord.id && !rawRecord.ticket_id) {
      console.error('No record/ID or ticket_id found in payload');
      return new Response(JSON.stringify({
        error: 'Invalid payload: Missing record ID or ticket_id'
      }), {
        status: 400,
        headers
      });
    }
    let subject = '';
    let htmlBody = '';
    const recipients = new Set();
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    let ticketContext;
    let isCommunicationEvent = false;
    let communicationDetails = null;
    // Determine event type
    if (rawRecord.ticket_id && rawRecord.message && rawRecord.type && typeof rawRecord.status === 'undefined' && typeof rawRecord.priority === 'undefined') {
      isCommunicationEvent = true;
      communicationDetails = rawRecord;
      console.log('Detected Communication Event. Communication ID:', communicationDetails.id);
      const { data: ticketData, error: ticketErr } = await supabaseClient.from('tickets').select('id, title, description, client, category_id, sub_category_id, requested_by, assignee, status, priority, due_at').eq('id', communicationDetails.ticket_id).single();
      if (ticketErr || !ticketData) {
        console.error(`Error fetching parent ticket ${communicationDetails.ticket_id}:`, ticketErr?.message);
        return new Response(JSON.stringify({
          error: 'Failed to fetch parent ticket for communication'
        }), {
          status: 500,
          headers
        });
      }
      ticketContext = ticketData;
    } else {
      console.log('Detected Ticket Event. Ticket ID:', rawRecord.id);
      ticketContext = rawRecord;
    }
    const ticketLink = `${appBaseUrl}/ticket/${ticketContext.id}`;
    // --- Determine categoryName ---
    let categoryName = null;
    if (ticketContext.category_id) {
      const { data: catData, error: catErr } = await supabaseClient.from('categories').select('name').eq('id', ticketContext.category_id).single();
      if (!catErr && catData) categoryName = catData.name;
    }
    console.log('Ticket Category Name:', categoryName);
    // --- NEW: Determine subcategoryName ---
    let subcategoryName = null;
    if (ticketContext.sub_category_id) {
      const { data: subcatData, error: subcatErr } = await supabaseClient.from('sub_categories').select('name').eq('id', ticketContext.sub_category_id).single();
      if (!subcatErr && subcatData) subcategoryName = subcatData.name;
    }
    console.log('Ticket Subcategory Name:', subcategoryName);
    // --- NEW: Prepare display values & prefix for subject/body ---
    const displayCategory = categoryName ?? 'N/A';
    const displaySubcategory = subcategoryName ?? 'N/A';
    const categoryPrefix = `[${displayCategory}] `;
    // --- Determine sender based on category ---
    let ticketPrefix = 'OTH';
    let fromEmailForGraph = '';
    switch(categoryName?.toLowerCase()?.trim()){
      case 'it':
      case 'it support':
      case 'it requests':
        ticketPrefix = 'OTH-IT';
        fromEmailForGraph = 'it@othainsoft.com';
        break;
      case 'hr':
      case 'hr support':
      case 'hr requests':
      case 'leave applications':
      case 'benefits inquiries':
        ticketPrefix = 'OTH-HR';
        fromEmailForGraph = 'hr@othainsoft.com';
        break;
      case 'accounts':
      case 'accounts support':
      case 'accounts requests':
      case 'tax payments':
      case 'payroll requests':
      case 'payroll request':
      case 'payroll':
        ticketPrefix = 'OTH-ACC';
        fromEmailForGraph = 'accounts@othainsoft.com';
        break;
      case 'operations':
      case 'ops':
        ticketPrefix = 'OTH-OPS';
        fromEmailForGraph = 'accounts@othainsoft.com';
        break;
      default:
        const defaultSender = Deno.env.get('DEFAULT_SENDER_EMAIL');
        if (!defaultSender) {
          console.error(`Unknown category '${categoryName}' & no default sender.`);
          return new Response(JSON.stringify({
            error: `Cannot determine sender for '${categoryName}'`
          }), {
            status: 500,
            headers
          });
        }
        fromEmailForGraph = defaultSender;
        console.warn(`Using default sender: ${defaultSender}`);
    }
    const formattedTicketId = `${ticketPrefix}${ticketContext.id.slice(0, 8)}`;
    console.log('Formatted Ticket ID:', formattedTicketId, 'Sender email:', fromEmailForGraph);
    // --- Fetch requester & assignee emails ---
    let ticketRequesterEmail = null;
    if (ticketContext.requested_by) {
      const { data: user, error } = await supabaseClient.from('users').select('email').eq('id', ticketContext.requested_by).single();
      if (!error && user) ticketRequesterEmail = user.email;
    }
    let ticketAssigneeEmail = null;
    if (ticketContext.assignee) {
      const { data: user, error } = await supabaseClient.from('users').select('email').eq('id', ticketContext.assignee).single();
      if (!error && user) ticketAssigneeEmail = user.email;
    }
    console.log(`Requester: ${ticketRequesterEmail}, Assignee: ${ticketAssigneeEmail}`);
    // --- Build subject & body for each event type ---
    if (isCommunicationEvent && eventType === 'INSERT') {
      // communication branch…
      const commAuthorId = communicationDetails.user_id;
      let commAuthorEmail = 'System';
      if (commAuthorId) {
        const { data: authorUser, error: authorError } = await supabaseClient.from('users').select('email').eq('id', commAuthorId).single();
        if (!authorError && authorUser) commAuthorEmail = authorUser.email;
      }
      const communicationType = communicationDetails.type?.toLowerCase();
      const messageContent = communicationDetails.message;
      switch(communicationType){
        case 'admin_reply':
          subject = `[Admin Reply on Ticket #${formattedTicketId}] ${ticketContext.title}`;
          htmlBody = `
            <p>An administrator has replied to your ticket #${formattedTicketId} (${ticketContext.title}).</p>
            <p><strong>Reply from ${commAuthorEmail}:</strong><br/><pre>${messageContent}</pre></p>
            <p>You can view and respond here: <a href="${ticketLink}">${ticketLink}</a></p>`;
          if (ticketRequesterEmail) recipients.add(ticketRequesterEmail);
          break;
        case 'customer_reply':
          subject = `[Customer Reply on Ticket #${formattedTicketId}] ${ticketContext.title}`;
          htmlBody = `
            <p>The requester (${commAuthorEmail}) has replied to ticket #${formattedTicketId} (${ticketContext.title}).</p>
            <p><strong>Reply:</strong><br/><pre>${messageContent}</pre></p>
            <p>View ticket: <a href="${ticketLink}">${ticketLink}</a></p>`;
          if (ticketAssigneeEmail) recipients.add(ticketAssigneeEmail);
          break;
        case 'internal_note':
          subject = `[Admin Note on Ticket #${formattedTicketId}] ${ticketContext.title}`;
          htmlBody = `
            <p>An internal note was added to ticket #${formattedTicketId} (${ticketContext.title}) by ${commAuthorEmail}.</p>
            <p><strong>Note:</strong><br/><pre>${messageContent}</pre></p>
            <p>View ticket: <a href="${ticketLink}">${ticketLink}</a></p>`;
          if (ticketAssigneeEmail && commAuthorEmail !== ticketAssigneeEmail) recipients.add(ticketAssigneeEmail);
          break;
        default:
          console.log(`Unhandled communication type: ${communicationType}`);
          recipients.clear();
      }
    } else if (!isCommunicationEvent && eventType === 'INSERT') {
      subject = `[New Ticket #${formattedTicketId}] ${ticketContext.title}`;
      htmlBody = `
        <p>A new ticket has been created:</p>
        <p><strong>Title:</strong> ${ticketContext.title}</p>
        <p><strong>Status:</strong> ${ticketContext.status}</p>
        <p><strong>Priority:</strong> ${ticketContext.priority}</p>
        <p><strong>Description:</strong><br/><pre>${ticketContext.description || 'N/A'}</pre></p>
        ${ticketContext.client ? `<p><strong>Client:</strong> ${ticketContext.client}</p>` : ''}
        ${ticketContext.due_at ? `<p><strong>Due At:</strong> ${new Date(ticketContext.due_at).toLocaleString()}</p>` : ''}
        <p>View ticket: <a href="${ticketLink}">${ticketLink}</a></p>`;
      if (ticketRequesterEmail) recipients.add(ticketRequesterEmail);
      if (ticketAssigneeEmail) recipients.add(ticketAssigneeEmail);
    } else if (!isCommunicationEvent && eventType === 'UPDATE') {
      const oldCtx = rawOldRecord;
      // ticketAssigneeEmail and ticketRequesterEmail are fetched earlier in the script

      // --- BEGIN: New Assignee Notification Logic ---
      if (oldCtx?.assignee !== ticketContext.assignee && ticketAssigneeEmail) {
        console.log(`Assignee changed from ${oldCtx?.assignee || 'Unassigned'} to ${ticketContext.assignee}. Notifying new assignee: ${ticketAssigneeEmail}`);
        
        const assigneeNotificationSubject = `You've been assigned Ticket #${formattedTicketId}: ${ticketContext.title} ${categoryPrefix}`;
        const assigneeNotificationHtmlBody = `
          <p>Hello,</p>
          <p>You have been assigned a new ticket:</p>
          <p><strong>Ticket ID:</strong> ${formattedTicketId}</p>
          <p><strong>Title:</strong> ${ticketContext.title}</p>
          <p><strong>Category:</strong> ${displayCategory}</p>
          <p><strong>Sub-category:</strong> ${displaySubcategory}</p>
          <p><strong>Status:</strong> ${ticketContext.status}</p>
          <p><strong>Priority:</strong> ${ticketContext.priority}</p>
          <p><strong>Description:</strong><br/><pre>${ticketContext.description || 'N/A'}</pre></p>
          ${ticketContext.client ? `<p><strong>Client:</strong> ${ticketContext.client}</p>` : ''}
          ${ticketContext.due_at ? `<p><strong>Due Date:</strong> ${new Date(ticketContext.due_at).toLocaleString()}</p>` : ''}
          <p>You can view the ticket details here: <a href="${ticketLink}">${ticketLink}</a></p>
        `;
        
        try {
          await sendMicrosoftGraphEmail(msGraphToken, fromEmailForGraph, [ticketAssigneeEmail], assigneeNotificationSubject, assigneeNotificationHtmlBody);
          console.log(`New assignment notification sent successfully to ${ticketAssigneeEmail}`);
        } catch (emailError) {
          console.error(`Error sending new assignment notification to ${ticketAssigneeEmail}:`, emailError);
          // Optionally, decide if this error should halt further processing or just be logged
        }
      }
      // --- END: New Assignee Notification Logic ---

      let changes = '';
      let specificUpdateType = ''; // Renamed from 'specific' to avoid confusion

      if (oldCtx?.status !== ticketContext.status) {
        changes += `<li>Status: ${oldCtx.status} → ${ticketContext.status}</li>`;
        if (ticketContext.status?.toLowerCase() === 'resolved') specificUpdateType = 'Resolved';
        if (ticketContext.status?.toLowerCase() === 'closed') specificUpdateType = 'Closed';
      }
      if (oldCtx?.priority !== ticketContext.priority) {
        changes += `<li>Priority: ${oldCtx.priority} → ${ticketContext.priority}</li>`;
      }
      if (oldCtx?.due_at !== ticketContext.due_at) {
        changes += `<li>Due At: ${oldCtx.due_at ? new Date(oldCtx.due_at).toLocaleString() : 'None'} → ${ticketContext.due_at ? new Date(ticketContext.due_at).toLocaleString() : 'None'}</li>`;
        if (!specificUpdateType) specificUpdateType = 'DueAtChanged';
      }
      
      // Update 'changes' string for the general notification (e.g., to requester)
      if (oldCtx?.assignee !== ticketContext.assignee) {
        let oldAssigneeEmailDisplay = 'Unassigned';
        if (oldCtx?.assignee) {
          // Attempt to fetch old assignee's email for display. This is best-effort.
          // In a more complex scenario, you might pre-fetch this or handle it differently.
          const { data: oldAssigneeUser } = await supabaseClient.from('users').select('email').eq('id', oldCtx.assignee).single();
          if (oldAssigneeUser) oldAssigneeEmailDisplay = oldAssigneeUser.email;
          else oldAssigneeEmailDisplay = `User ID: ${oldCtx.assignee}`; // Fallback
        }
        changes += `<li>Assignee: ${oldAssigneeEmailDisplay} → ${ticketAssigneeEmail ?? 'Unassigned'}</li>`;
        // DO NOT add ticketAssigneeEmail to the general 'recipients' here, they got a dedicated email.
      }

      if (!changes) {
        console.log('No relevant changes for general update notification.');
        return new Response(JSON.stringify({
          message: 'No changes for general update notification (assignee may have been notified separately).'
        }), {
          status: 200,
          headers
        });
      }

      // Prepare recipients for the general update email (primarily the requester)
      if (ticketRequesterEmail) recipients.add(ticketRequesterEmail);
      // Ensure not to add the new assignee again if they were in 'recipients' for other reasons.
      // However, with the current logic, 'recipients' is usually just the requester for updates.

      if (recipients.size === 0) {
        console.log('No recipients for general update email.');
        return new Response(JSON.stringify({
          message: 'No recipients for general update'
        }), {
          status: 200,
          headers
        });
      }
      
      // Determine subject for the general update email
      switch(specificUpdateType){
        case 'Resolved':
          subject = `[Ticket Resolved #${formattedTicketId}] ${ticketContext.title}`;
          break;
        case 'Closed':
          subject = `[Ticket Closed #${formattedTicketId}] ${ticketContext.title}`;
          break;
        case 'DueAtChanged':
          subject = `[Ticket Due Date Updated #${formattedTicketId}] ${ticketContext.title}`;
          break;
        default:
          subject = `[Ticket Update #${formattedTicketId}] ${ticketContext.title}`;
      }
      htmlBody = `
        <p>Ticket #${formattedTicketId} (${ticketContext.title}) has been ${specificUpdateType || 'updated'}.</p>
        <p>Details of changes:</p>
        <ul>${changes}</ul>
        <p><strong>Current Status:</strong> ${ticketContext.status}</p>
        <p><strong>Current Priority:</strong> ${ticketContext.priority}</p>
        ${ticketContext.due_at ? `<p><strong>Current Due At:</strong> ${new Date(ticketContext.due_at).toLocaleString()}</p>` : ''}
        <p><strong>Description:</strong><br/><pre>${ticketContext.description || 'N/A'}</pre></p>
        <p>View ticket: <a href="${ticketLink}">${ticketLink}</a></p>`;
    } else {
      console.log(`Unhandled event: ${eventType}`);
      return new Response(JSON.stringify({
        message: `Unhandled event: ${eventType}`
      }), {
        status: 200,
        headers
      });
    }
    if (recipients.size === 0) {
      console.log('No recipients determined.');
      return new Response(JSON.stringify({
        message: 'No recipients'
      }), {
        status: 200,
        headers
      });
    }
    // --- NEW: inject category & subcategory into subject & body ---
    subject = `${subject} ${categoryPrefix}`;
    htmlBody = `
      <p><strong>Category:</strong> ${displayCategory}</p>
      <p><strong>Sub-category:</strong> ${displaySubcategory}</p>
      <hr/>
    ` + htmlBody;

    console.log(`Sending general update email to: ${Array.from(recipients).join(', ')} for ticket ${ticketContext.id}`);
    const emailResult = await sendMicrosoftGraphEmail(msGraphToken, fromEmailForGraph, Array.from(recipients), subject, htmlBody);
    
    if (!emailResult.success) {
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: emailResult.message
      }), {
        status: 500,
        headers
      });
    }
    console.log('Email sent successfully.'); // This pertains to the general update email if sent
    return new Response(JSON.stringify({
      message: 'Email process completed (assignee notified if changed, general update sent if applicable).',
      details: emailResult // This 'emailResult' is from the general update.
    }), {
      status: 200,
      headers
    });
  } catch (err) {
    console.error('Error in Edge Function:', err);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: err.message
    }), {
      status: 500,
      headers
    });
  }
});
