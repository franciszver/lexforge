import type { IntakeData } from '../types';

/**
 * Generates an HTML draft based on the collected intake data.
 * Does basic string interpolation to inject variables into templates.
 * 
 * @param intake - The full intake state from Redux.
 * @returns HTML string of the generated document.
 */
export const generateDraft = (intake: IntakeData): string => {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (intake.docType === 'Demand Letter') {
    return `
      <p style="text-align: right;">${date}</p>
      <p style="text-align: right;"><strong>VIA CERTIFIED MAIL</strong></p>
      <br>
      <p><strong>RE: Demand for Payment - ${intake.opponentName || '[Opposing Party]'}</strong></p>
      <br>
      <p>Dear ${intake.opponentName || 'Sir/Madam'},</p>
      <p>This firm represents [Client Name] in connection with the above-referenced matter. We are writing to formally demand payment in the amount of [Amount] regarding the dispute arising from [Facts].</p>
      <p><strong>Factual Background</strong></p>
      <p>As you are aware, on [Date], the following events occurred: ${intake.clientGoal || '[Insert specifics here]'}. Under the laws of ${intake.jurisdiction}, these actions constitute a breach of [Contract/Duty].</p>
      <p><strong>Demand</strong></p>
      <p>Our client hereby demands that you remit payment within 10 business days. Failure to comply will result in immediate legal action filing in ${intake.jurisdiction} court.</p>
      <p>Sincerely,</p>
      <p>[Attorney Name]</p>
      <p>LexForge Law, LLP</p>
    `;
  }

  // Placeholder for other types
  return `
    <h1>${intake.docType}</h1>
    <p>Jurisdiction: ${intake.jurisdiction}</p>
    <p>Practice Area: ${intake.practiceArea}</p>
    <p><em>Generated draft based on client goal: "${intake.clientGoal}"...</em></p>
  `;
};
