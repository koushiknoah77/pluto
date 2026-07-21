# Pluto experience and UI specification

## Experience north star

Pluto should feel like a calm, capable mission workspace: warm enough for real community learning, precise enough for school governance, and honest about what AI can do. It must not feel like a generic dashboard, a noisy card grid, or a chatbot pretending to be a teacher.

## Visual system

- **Voice:** warm, direct, evidence-minded, and human.
- **Typography:** Manrope for display hierarchy and DM Sans for interface reading. Body text is comfortable at 15-16px; utility text never becomes decorative microcopy.
- **Layout:** an 8px spacing rhythm, a stable content width, one app shell, and consistent 12-18px component radii.
- **Colour:** ink for decisions, plum for Pluto guidance, mint for trusted progress, amber for review, and rose for risk. Colour never carries meaning alone.
- **Cards:** a card groups a decision, task, or document. Do not create a card for every paragraph.
- **Motion:** short, purposeful transitions only. Respect reduced-motion preferences.

## Page hierarchy

| Page type | Layout rule |
| --- | --- |
| Public landing | One message, one visual focus, one primary action, and a concise proof of trust. |
| Mission or Proof overview | A visual narrative is allowed because it explains the work as a whole. |
| Role dashboard | One moderate overview plus one or two decision signals. |
| Form, intake, research, assessment, or assignment | Compact header, focused form/work area, and clear next action. |
| Settings and governance | Plain language, grouped controls, visible policy state, and audit context. |

## AI experience

AI must be legible rather than decorative.

- Show **Live AI**, **Template mode**, or **Restricted** wherever AI creates a draft or response.
- Explain the consequence of the current state in plain language.
- Place citations, evidence count, and teacher approval status next to the generated guidance.
- Ask for one useful next action. Do not display a permanent generic chatbot panel.
- Never make a template response look like a model response.

## Role priorities

- **Partner:** understand the need, status, next review, and what students are delivering.
- **Teacher:** see the next support or approval decision before secondary activity.
- **Student:** see the mission, their current milestone, approved evidence, and one clear next action.
- **Administrator:** see policy, consent, and the one or two programme decisions that require attention.

## Accessibility baseline

- Keyboard focus is visible and predictable.
- Touch targets are at least 38px high.
- Forms use labels, concise error text, and semantic control states.
- Status includes text and icon, not colour alone.
- The shell adapts from desktop sidebar to mobile navigation without hiding critical work.
