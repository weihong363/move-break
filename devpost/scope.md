---
doc: scope
status: approved
---

# MoveBreak

A lightweight browser companion that notices prolonged low movement locally through the user's webcam, then verifies a short movement break.

## The Unique Kernel

Instead of waiting for a preset work timer, MoveBreak watches for a configurable seated or stationary period after the user explicitly enables their camera. It then asks them to stand up and move, and verifies that transition locally in the browser. Small hand, head, and upper-body movements do not interrupt the reminder timer.

## Who It's For

A desk worker, developer, student, or remote worker who spends long stretches at a computer. They know breaks help, but can remain still longer than intended while focused on their work.

## The Core Loop

The user explicitly enables the camera once. MoveBreak establishes a low-movement or seated baseline and locally monitors torso position. Once the seated or stationary state lasts past the configurable inactivity threshold, it prompts a movement break. A standing or clear upward transition followed by sustained body movement completes the break. Monitoring resumes only after the user returns near their original seated baseline, so standing after the break never becomes a new sedentary baseline.

## Inspiration & Identity

Simple, lightweight, friendly, and non-judgmental. It should feel like a smart break companion, with an immediately understandable flow: seated → reminder → stand and move → camera verifies → sit back → monitor again.

## Why This Matters to the Learner

The learner wants to practice keeping an AI-assisted project small and shippable: controlling scope, avoiding overengineering, and reaching a complete end-to-end product quickly. This project also lets them compare Devpost's scope → PRD → spec process with their existing SDD-style workflow.

## What "Working" Looks Like

In a short recorded demo, a user enables the camera, starts seated or still until the short configurable inactivity threshold is reached, receives a movement prompt, stands or clearly rises, moves until a short configurable threshold is met, and sees “Movement break completed.” After they sit back near their original baseline, the app resumes inactivity monitoring.

## The POC Boundary

One static browser experience with a user-initiated camera session, a configurable short inactivity threshold, clear monitoring and break states, local webcam processing, and one simple verification sequence: user-specific seated baseline → inactivity threshold → standing or clear upward transition → general movement for a configurable short threshold → completed → monitoring reset. Precise seated-pose classification is not required: both visible shoulders establish the baseline at the user's normal desk distance, so the flow remains viable with desk occlusion and partial body visibility. A suggested movement may appear as guidance, but it is not measured.

## Later

- A simple animated movement guide
- Calibration for camera position
- Subtle start and completion sounds

## Explicitly Cut

- Specific exercise detection and form evaluation, because the proof is general movement after standing.
- Work-session timers, Pomodoro cycles, productivity tracking, and background monitoring, because the proof is automatic low-movement detection in an active local camera session.
- Custom ML training, because a browser-compatible prebuilt model is sufficient for this demo.
- Accounts, backend services, databases, cloud processing, analytics, and notifications, because the complete loop runs locally in one browser session.
- Fitness tracking, health advice, gamification, social features, payments, and mobile or native applications, because none prove the core break-verification loop.
- Multiple movement types, because one reliable sequence makes the demo clearer and faster to finish.
