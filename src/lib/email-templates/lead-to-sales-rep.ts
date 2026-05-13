// Lead-to-sales-rep email template. Pure function — no DB, no fetch, no side
// effects. Caller (the approve-and-email route) loads the lead, signs photo
// URLs, and passes everything in.

export type LeadToSalesRepTemplateInput = {
  repName: string
  techName: string
  customerName: string
  contact: {
    name: string | null
    email: string | null
    phone: string | null
  }
  equipmentDescription: string
  notes: string | null
  signedPhotoUrls: string[]
  leadDeepLink: string
  optionalNote: string | null
  companyName: string
}

export type EmailTemplate = {
  subject: string
  html: string
  text: string
}

export function renderLeadToSalesRepEmail(
  input: LeadToSalesRepTemplateInput
): EmailTemplate {
  const {
    repName,
    techName,
    customerName,
    contact,
    equipmentDescription,
    notes,
    signedPhotoUrls,
    leadDeepLink,
    optionalNote,
    companyName,
  } = input

  const repFirstName = repName.split(' ')[0] || 'there'
  const subject = `New equipment lead from ${techName} — ${customerName}`

  const contactLines = [
    contact.name ? `Name:  ${contact.name}` : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
  ].filter((l): l is string => l !== null)

  const text = [
    `Hi ${repFirstName},`,
    '',
    `${techName} just submitted an equipment lead at ${customerName}. Forwarding it to you to follow up.`,
    optionalNote ? '' : null,
    optionalNote ? `Note: ${optionalNote}` : null,
    '',
    'Contact:',
    ...contactLines,
    '',
    'Equipment / opportunity:',
    equipmentDescription,
    notes ? '' : null,
    notes ? `Tech notes: ${notes}` : null,
    signedPhotoUrls.length > 0 ? '' : null,
    signedPhotoUrls.length > 0 ? 'Photos (links valid 7 days):' : null,
    ...signedPhotoUrls.map((u, i) => `  ${i + 1}. ${u}`),
    '',
    `Full lead in CallBoard: ${leadDeepLink}`,
    '',
    `Thanks,`,
    `${companyName}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const contactRowsHtml = [
    contact.name ? row('Name', escapeHtml(contact.name)) : '',
    contact.email
      ? row('Email', `<a href="mailto:${escapeAttr(contact.email)}" style="color:#0f172a;">${escapeHtml(contact.email)}</a>`)
      : '',
    contact.phone
      ? row('Phone', `<a href="tel:${escapeAttr(contact.phone.replace(/[^\d+]/g, ''))}" style="color:#0f172a;">${escapeHtml(contact.phone)}</a>`)
      : '',
  ].join('')

  const photosHtml =
    signedPhotoUrls.length > 0
      ? `<tr>
            <td style="padding:8px 32px 0;color:#52525b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Photos</td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${signedPhotoUrls
                    .map(
                      (url) => `
                  <td style="padding:0 8px 8px 0;vertical-align:top;">
                    <a href="${escapeAttr(url)}" style="display:inline-block;">
                      <img src="${escapeAttr(url)}" alt="Equipment photo" width="160" height="160" style="display:block;width:160px;height:160px;object-fit:cover;border:1px solid #e4e4e7;border-radius:6px;" />
                    </a>
                  </td>`
                    )
                    .join('')}
                </tr>
              </table>
              <p style="margin:8px 0 0;color:#71717a;font-size:12px;">Photo links expire after 7 days. Open the lead in CallBoard for a fresh view.</p>
            </td>
          </tr>`
      : ''

  const noteHtml = optionalNote
    ? `<tr>
          <td style="padding:0 32px 16px;">
            <div style="padding:12px 16px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;color:#78350f;font-size:14px;font-style:italic;">
              ${escapeHtml(optionalNote)}
            </div>
          </td>
        </tr>`
    : ''

  const notesHtml = notes
    ? `<tr>
          <td style="padding:8px 32px 0;color:#52525b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Tech notes</td>
        </tr>
        <tr>
          <td style="padding:8px 32px 16px;color:#1f2937;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(notes)}</td>
        </tr>`
    : ''

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:24px 32px;background:#0f172a;color:#ffffff;font-size:18px;font-weight:600;">
              New equipment lead — ${escapeHtml(customerName)}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;color:#1f2937;font-size:15px;line-height:1.55;">
              <p style="margin:0 0 12px;">Hi ${escapeHtml(repFirstName)},</p>
              <p style="margin:0;">${escapeHtml(techName)} just submitted an equipment lead at <strong>${escapeHtml(customerName)}</strong>. Forwarding it to you to follow up.</p>
            </td>
          </tr>
          ${noteHtml}
          <tr>
            <td style="padding:8px 32px 0;color:#52525b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Contact</td>
          </tr>
          <tr>
            <td style="padding:8px 32px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${contactRowsHtml || '<tr><td style="color:#71717a;font-size:14px;">No contact info captured.</td></tr>'}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;color:#52525b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Equipment / opportunity</td>
          </tr>
          <tr>
            <td style="padding:8px 32px 16px;color:#1f2937;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(equipmentDescription)}</td>
          </tr>
          ${notesHtml}
          ${photosHtml}
          <tr>
            <td style="padding:8px 32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(leadDeepLink)}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="14%" stroke="f" fillcolor="#0f172a">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;">View lead in CallBoard</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${escapeAttr(leadDeepLink)}" style="background:#0f172a;border-radius:6px;color:#ffffff;display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:44px;text-align:center;text-decoration:none;width:240px;mso-hide:all;">View lead in CallBoard</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;color:#52525b;font-size:13px;">
                Button not working?
                <a href="${escapeAttr(leadDeepLink)}" style="color:#0f172a;text-decoration:underline;">Open the lead</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e4e4e7;color:#52525b;font-size:13px;">
              ${escapeHtml(companyName)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}

function row(label: string, valueHtml: string): string {
  return `<tr>
            <td style="padding:2px 12px 2px 0;color:#71717a;font-size:14px;width:80px;vertical-align:top;">${escapeHtml(label)}</td>
            <td style="padding:2px 0;color:#1f2937;font-size:14px;">${valueHtml}</td>
          </tr>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
