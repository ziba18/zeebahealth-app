// Feature switches decided at bundle time.
import { IS_PREVIEW } from './preview/flag';

/**
 * The Today chat sends what the user types to /chat, which forwards it to Groq (US). Off until the
 * processor agreement, zero retention, consent line and privacy label are done (Safety S-046).
 * Turn on with EXPO_PUBLIC_CHAT_ENABLED=1; the design preview keeps it so reviewers can see it.
 */
export const CHAT_ENABLED = IS_PREVIEW || process.env.EXPO_PUBLIC_CHAT_ENABLED === '1';

/**
 * Friends (share your cycle phase with people you invite). Off for launch: invites are matched by
 * an email nobody has confirmed, and the server reads period dates from a table the app no longer
 * writes. The server has the matching switch (FRIENDS_ENABLED) and the privacy policy no longer
 * mentions it; turn all three back on together.
 */
export const FRIENDS_ENABLED = false;
