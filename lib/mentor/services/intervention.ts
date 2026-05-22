import { saveMessage } from "../stage";
import { MentorResponse, MentorRequest } from "../orchestrator";

export async function handleIntervention(
  intervention: any,
  body: MentorRequest,
  session: any,
  context: any
): Promise<MentorResponse> {
  let message = '';

  switch (intervention.type) {
    case 'frustration':
      message = `I can see you're feeling frustrated, and that's completely okay.
Let's take a step back. ${intervention.suggestedAction}`;
      break;

    case 'confusion':
      message = `It sounds like we're going in circles. Let me try a different approach.
${intervention.suggestedAction}`;
      break;

    case 'escalation':
      message = `I notice you're asking for more direct help.
${intervention.suggestedAction}`;
      break;

    case 'stuck':
      message = `You've been working on this for a while. ${intervention.suggestedAction}`;
      break;

    default:
      message = intervention.suggestedAction;
  }

  // Save the intervention message
  await saveMessage(
    session.id,
    "assistant",
    message,
    session.stage as any,
  );

  return {
    ok: true,
    message,
    metadata: {
      interventionType: intervention.type,
      stage: session.stage,
      requiresAttention: true
    }
  };
}
