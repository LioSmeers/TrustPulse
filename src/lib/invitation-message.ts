// The editable script never supplies the customer destination.
export function invitationScript(value: string) {
  return value.replace(/\{link\}/gi, '').replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, '');
}

export function invitationMessage(script: string, link: string) {
  return `${invitationScript(script).trim()}\n\n${link}`;
}
