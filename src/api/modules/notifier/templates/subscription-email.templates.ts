export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildConfirmSubscriptionTemplate(input: {
  repository: string;
  confirmUrl: string;
  unsubscribeUrl: string;
}): EmailTemplate {
  const repository = escapeHtml(input.repository);

  return {
    subject: `Confirm subscription for ${input.repository}`,
    text: [
      `You requested release notifications for ${input.repository}.`,
      "",
      `Confirm subscription: ${input.confirmUrl}`,
      `Unsubscribe: ${input.unsubscribeUrl}`,
    ].join("\n"),
    html: `
      <h2>Confirm your subscription</h2>
      <p>You requested release notifications for <b>${repository}</b>.</p>
      <p><a href="${input.confirmUrl}">Confirm subscription</a></p>
      <p>If this wasn't you, use this link to unsubscribe:</p>
      <p><a href="${input.unsubscribeUrl}">Unsubscribe</a></p>
    `,
  };
}



export function buildUnsubscribedTemplate(input: {
  repository: string;
}): EmailTemplate {
  const repository = escapeHtml(input.repository);

  return {
    subject: `Unsubscribed from ${input.repository}`,
    text: [
      `You have been unsubscribed from release notifications for ${input.repository}.`,
      "If this was a mistake, subscribe again from the API endpoint.",
    ].join("\n"),
    html: `
      <h2>Unsubscribed</h2>
      <p>You have been unsubscribed from release notifications for <b>${repository}</b>.</p>
      <p>If this was a mistake, subscribe again from the API endpoint.</p>
    `,
  };
}

export function buildNewReleaseTemplate(input: {
  repository: string;
  tagName: string;
  releaseUrl: string;
}): EmailTemplate {
  const repository = escapeHtml(input.repository);
  const tagName = escapeHtml(input.tagName);

  return {
    subject: `New release ${input.tagName} in ${input.repository}`,
    text: [
      `A new release ${input.tagName} was published for ${input.repository}.`,
      input.releaseUrl ? `Release notes: ${input.releaseUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <h2>New release detected</h2>
      <p>Repository <b>${repository}</b> has a new release: <b>${tagName}</b>.</p>
      ${
        input.releaseUrl
          ? `<p><a href="${input.releaseUrl}">Open release notes</a></p>`
          : ""
      }
    `,
  };
}
