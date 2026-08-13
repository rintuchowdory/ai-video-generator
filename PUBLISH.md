# Manus Publish Readiness

The permanent WebDev project is ready for the Manus publish action. The latest validated code is saved in the WebDev checkpoint that will be delivered with this project. The production build passes, TypeScript has no errors, and the Vitest suite passes 27 tests.

To publish, open the Manus Management UI for **Werkbank — AI Video Generator**, open the latest checkpoint, and click **Publish** in the header. Manus will inject the configured server-side environment variables for `MAGIC_HOUR_API_KEY` and `GROQ_API_KEY`; these keys are not included in the repository or frontend bundle.

The final publish click is intentionally left to the project owner. After publishing, test the OAuth login, dashboard, project creation, storyboard generation, and media controls with the configured provider credits. A public production URL is only available after that user-confirmed action.

The current code is also available in GitHub branch `manus-permanent`:
https://github.com/rintuchowdory/ai-video-generator/tree/manus-permanent
