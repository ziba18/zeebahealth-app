# Feature brief: "The evidence pack" (from the funding session, 18 Nov 2026)

Status: **idea brief for the owner to review.** Nothing here is approved for building yet.
Written in the funding folder session (`~/projects/zeeba-funding`) after a talk about what makes Zeeba Health
different, for investors and a future Innovator Founder visa endorsement ("innovative, viable, scalable").

## The angle
Most apps are built around the **cycle** (periods, fertility, predictions). Zeeba is built around the
**appointment**: for the woman who has to convince a doctor.
Pitch line (draft): *"Other apps track your cycle. Zeeba builds your case."*

## The six features
Core (build together, as one "evidence pack" on one dated page of the report):
1. **Treatments tried.** What she has tried (painkillers, the pill, other hormonal treatment, physio, diet, etc.),
   dates started/stopped, and whether it helped (her own words or a simple helped / didn't help / side effects).
2. **Appointment history ("dismissal record").** Each appointment: date, who (GP, nurse, A&E, gynae), what she
   said, what they said, what happened next (referral, scan, test, nothing). Builds a timeline over months that helps
   a second opinion, a referral request or a PALS complaint.
3. **Impact on life.** Days missed from work / university, cancelled plans, broken-sleep nights. Counts only.

Next:
4. **Voice logging for flare days.** "Pain 8, can't stand up, took ibuprofen" → a dated entry she confirms before
   it is saved. Uses the owner's MSc AI work.
5. **Report designed with clinicians.** Ask a GP / gynaecologist what they want in a two-minute read and shape the
   PDF around that. Only claim "designed with doctors" once it is true.

Later:
6. **Wearable data** (sleep, heart rate on flare days; from the dissertation) and **opt-in anonymous data for
   research**.

## Hard rules these features must follow (see CLAUDE.md)
- No diagnosis, score, likelihood, "match" or automatic flag. Summaries of her own entries only; counts, not verdicts.
- Treatments and appointment notes, voice audio/transcripts and wearable data are **new kinds of health data**:
  consent wording, privacy page, DPIA and `CONSENT_VERSION` come first. Prefer not storing raw audio.
- Wren never on the Doctor tab or the PDF. No streaks. Plain word "pain".
- Show the owner the plan and mock-ups before building; she approves the design direction.
