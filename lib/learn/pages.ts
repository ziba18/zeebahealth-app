// "Before and after your appointment": fixed reading pages and the common GP questions (20 Nov 2026).
//
// RULES (MHRA reading of the sources, design/uiux-2026-11-13/research/02-legal-uk.md §9.2; not legal advice):
// - Fixed content, IDENTICAL for every user, listed in a fixed order. Nothing here reads her records.
// - The app never chooses, orders or highlights a page or a question because of what she logged, never ticks a
//   question for her, and never puts her data on these screens. Doing so would turn reading pages into a
//   symptom checker (a medical device).
// - No condition scores, no "you may have", no advice about which treatment to take. Referral advice and
//   "see your GP" are fine.
// - Say "pain" plainly (owner, 15 Nov 2026). PMOS is the NHS name since 2026: write "PMOS (PCOS)".
//
// SOURCES checked on 20 Nov 2026: NHS endometriosis (reviewed 27 Aug 2024), NHS PMOS (reviewed 30 Jun 2026),
// NHS "Your choices in the NHS" (reviewed 10 May 2023), NHS PALS (reviewed 29 May 2024), Endometriosis UK
// "Visiting your doctor" (modified 20 Aug 2026), Verity (UK PCOS charity).
// NICE NG73 (updated Nov 2024) could NOT be opened on 20 Nov (nice.org.uk blocks automated readers): its points
// below come from design/uiux-2026-11-13/research/01-clinical.md §2.3 (13 Nov 2026). BEFORE LAUNCH: check them
// against https://www.nice.org.uk/guidance/ng73/chapter/Recommendations in a browser, and have a clinician read
// every page once.

export type LearnId = 'endometriosis' | 'pmos' | 'next-steps';

export interface LearnSource { label: string; url: string }
/** heading, then `lead` (introduces the list), then `bullets`, then `text` (paragraphs, or notes after a list). */
export interface LearnBlock { heading?: string; lead?: string; bullets?: string[]; text?: string[] }
export interface LearnPage {
  id: LearnId;
  /** Row title on the For my doctor tab and the page's large title. */
  title: string;
  /** One line under the row title. */
  blurb: string;
  blocks: LearnBlock[];
  /** Charities and services she may want to open (plain links, same for everyone). */
  links?: LearnSource[];
  sources: LearnSource[];
}

/** Shown at the top of each reading page. */
export const LEARN_NOTICE = 'General information, the same for everyone. It is not about you, and the app has not looked at your records.';

const NHS_ENDO: LearnSource = { label: 'NHS: Endometriosis (reviewed August 2024)', url: 'https://www.nhs.uk/conditions/endometriosis/' };
const NICE_NG73: LearnSource = { label: 'NICE guideline NG73: Endometriosis (updated November 2024)', url: 'https://www.nice.org.uk/guidance/ng73/chapter/Recommendations' };
const NHS_PMOS: LearnSource = { label: 'NHS: PMOS, previously called PCOS (reviewed June 2026)', url: 'https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/' };
const PCOS_GUIDELINE: LearnSource = { label: 'International PCOS guideline 2023 (summary, open access)', url: 'https://www.mja.com.au/journal/2024/221/7/summary-2023-international-evidence-based-guideline-assessment-and-management' };
const NHS_CHOICE: LearnSource = { label: 'NHS: Your choices in the NHS', url: 'https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/' };
const NHS_PALS: LearnSource = { label: 'NHS: What is PALS (Patient Advice and Liaison Service)?', url: 'https://www.nhs.uk/nhs-services/hospitals/what-is-pals-patient-advice-and-liaison-service/' };
const ENDO_UK_GP: LearnSource = { label: 'Endometriosis UK: Visiting your doctor', url: 'https://www.endometriosis-uk.org/visiting-your-doctor' };
const VERITY: LearnSource = { label: 'Verity: the UK PCOS charity', url: 'https://www.verity-pcos.org.uk/' };

export const LEARN_PAGES: readonly LearnPage[] = [
  {
    id: 'endometriosis',
    title: 'Endometriosis: what doctors look for',
    blurb: 'The symptoms the NHS lists and what NICE tells GPs',
    blocks: [
      {
        heading: 'Symptoms the NHS lists',
        bullets: [
          'Severe period pain that stops you doing your normal activities',
          'Pain in the lower tummy and back (the pelvic area)',
          'Pain when you poo or pee',
          'Pain during or after sex',
          'Heavy periods',
          'Extreme tiredness',
          'Difficulty getting pregnant',
          'Low mood or anxiety',
        ],
        text: ['These symptoms are common and can have other causes.'],
      },
      {
        heading: 'What NICE tells doctors',
        lead: 'NICE writes the guidelines doctors in England follow. Its endometriosis guideline (NG73) says:',
        bullets: [
          'Suspect endometriosis when someone has one or more of: long-lasting pelvic pain; period pain that affects daily activities and quality of life; deep pain during or after sex; pain when pooing, or other bowel symptoms linked to periods; pain when peeing, or blood in the urine, linked to periods; or difficulty getting pregnant together with one of these.',
          'Ask whether a mother, sister or daughter has endometriosis.',
          'Tell women that keeping a pain and symptom diary can help the conversation.',
          'Offer an internal (transvaginal) ultrasound scan, even if an examination was normal.',
          'A normal scan does not rule endometriosis out.',
          'Refer to gynaecology if the first treatment does not work, cannot be taken or is not tolerated; or if symptoms affect daily life; or if they keep coming back.',
        ],
      },
      {
        heading: 'How it is diagnosed',
        text: [
          'A GP asks about symptoms and family history and may examine you. Tests can include an ultrasound scan, an MRI scan, or a laparoscopy (keyhole surgery with a camera). Only a doctor can diagnose endometriosis.',
        ],
      },
      {
        heading: 'When the NHS says to see a GP',
        bullets: [
          'You think you might have endometriosis',
          'Your symptoms are affecting your everyday life, work and relationships',
          'You have had treatment from a GP but your symptoms do not get better, or get worse',
        ],
      },
    ],
    links: [ENDO_UK_GP],
    sources: [NHS_ENDO, NICE_NG73],
  },
  {
    id: 'pmos',
    title: 'PMOS (PCOS): what doctors look for',
    blurb: 'Symptoms, how doctors decide, and the tests a GP may arrange',
    blocks: [
      {
        text: ['In 2026 polycystic ovary syndrome (PCOS) was renamed polyendocrine metabolic ovarian syndrome (PMOS), and the NHS now uses the new name. Many doctors and websites still say PCOS.'],
      },
      {
        heading: 'Symptoms the NHS lists',
        bullets: [
          'Irregular periods or long gaps between periods',
          'Excess hair growth, or hair loss',
          'Weight gain or difficulty losing weight',
          'Difficulty getting pregnant',
          'Oily skin and acne',
          'Feeling very tired',
        ],
        text: ['Symptoms can be mild or severe. Some people have none. They are common and can have other causes.'],
      },
      {
        heading: 'How doctors decide (2023 international guideline, adults)',
        lead: 'A doctor looks for at least two of these three, after ruling out other causes:',
        bullets: [
          'Irregular cycles, or signs that ovulation is not regular',
          'Signs of higher androgen hormones, on the body (such as excess hair growth) or in a blood test',
          'Polycystic ovaries on an ultrasound scan, or a raised AMH blood test (one or the other, not both)',
        ],
      },
      {
        text: ['For teenagers the rules are different: both of the first two are needed, and scans and AMH tests are not used.'],
      },
      {
        heading: 'Tests a GP may arrange (NHS)',
        bullets: [
          'Blood tests to check hormone levels and insulin resistance',
          'An ultrasound scan of the ovaries, only if you are over 18',
        ],
        text: ['A GP may also arrange tests with a gynaecologist or a hormone specialist (endocrinologist). Only a doctor can diagnose PMOS.'],
      },
    ],
    links: [VERITY],
    sources: [NHS_PMOS, PCOS_GUIDELINE],
  },
  {
    id: 'next-steps',
    title: 'Referrals, second opinions and your options',
    blurb: 'What you can ask for if things are not moving',
    blocks: [
      {
        heading: 'Asking for a referral',
        text: [
          'You can ask your GP whether a referral to a specialist, such as a gynaecologist, would be right for you. NICE tells GPs to refer to gynaecology when endometriosis is suspected and the first treatment has not helped, cannot be taken, or symptoms affect daily life or keep coming back.',
          'It can help to show what you have already tried, and what the pain stops you doing.',
        ],
      },
      {
        heading: 'Choosing where you are referred (England)',
        text: [
          'If a GP refers you for a physical or mental health condition, in most cases you have the legal right to choose the hospital or service you go to. You can also choose a team led by a named consultant, if that team provides the treatment you need.',
          'Endometriosis UK suggests asking whether there is a service nearby that specialises in endometriosis.',
        ],
      },
      {
        heading: 'Seeing someone else',
        text: [
          'You can ask your GP practice for an appointment with a different GP, for example one with an interest in women’s health. You can also ask for what you discussed, and what you asked for, to be written in your notes.',
        ],
      },
      {
        heading: 'If you are unhappy with your care',
        text: [
          'Every GP practice has a complaints procedure: you can ask the practice for it. In hospitals, PALS (the Patient Advice and Liaison Service) offers confidential advice and help to sort out concerns about NHS care.',
        ],
      },
    ],
    links: [ENDO_UK_GP, VERITY],
    sources: [NHS_CHOICE, NICE_NG73, NHS_PALS, ENDO_UK_GP],
  },
] as const;

export const learnPage = (id: string | undefined): LearnPage | undefined => LEARN_PAGES.find((p) => p.id === id);

/**
 * Common questions to ask a GP: the same list, in the same order, for everyone. She picks the ones she wants; they
 * join her own questions on the report, word for word. Never pre-ticked, never suggested from her records.
 * Each is ONE sentence ending in "?": agendaBlockOf() splits a note into questions at sentence ends.
 * Based on design/uiux-2026-11-13/research/02-legal-uk.md §9.2(b) and NICE NG73 (scan, referral).
 */
export const COMMON_QUESTIONS: readonly string[] = [
  'What could be causing the symptoms I have recorded?',
  'Could this be endometriosis or PMOS (PCOS), and what would rule them in or out?',
  'What tests are available, and can I have them?',
  'Could I have an internal ultrasound scan?',
  'If my scan is normal and the pain carries on, could I be referred to gynaecology?',
  'Would a referral to a gynaecologist or a hormone specialist be right for me?',
  'If this treatment does not help my pain, what is the next step?',
  'What can I do about the pain in the meantime?',
  'Can you write in my notes what we discussed and what I asked for today?',
  'When should I come back if things do not get better?',
] as const;
