---
doc: scope
status: approved
---

# MoveBreak

A lightweight browser break timer that verifies a short movement break locally through the user's webcam.

## The Unique Kernel

Instead of letting a user dismiss a break reminder, MoveBreak asks them to stand up and move, then verifies that transition locally in the browser. It turns “I should take a break” into a visible, completed micro-break without becoming an exercise tracker.

## Who It's For

A desk worker, developer, student, or remote worker who spends long stretches at a computer. They know breaks help, but today can dismiss a timer reminder and remain seated.

## The Core Loop

The user starts a short work timer. When it ends, MoveBreak starts a movement break, asks for camera permission if needed, and guides the user to stand and move. Once local detection sees a stationary or seated baseline, a standing or clear upward transition, and sustained body movement, it marks the break complete and makes the next work session available.

## Inspiration & Identity

Simple, lightweight, friendly, and non-judgmental. It should feel like a smart break timer, with an immediately understandable flow: work → reminder → stand and move → camera verifies → complete.

## Why This Matters to the Learner

The learner wants to practice keeping an AI-assisted project small and shippable: controlling scope, avoiding overengineering, and reaching a complete end-to-end product quickly. This project also lets them compare Devpost's scope → PRD → spec process with their existing SDD-style workflow.

## What "Working" Looks Like

In a short recorded demo, a user starts a short work session, receives a break prompt, grants camera access, starts seated or still, stands or clearly rises, moves until a short configurable threshold is met, and sees “Movement break completed.” The app then offers the next work session.

## The POC Boundary

One static browser experience with configurable short timer durations, a clear timer and state display, local webcam processing, and one simple verification sequence: low-movement or seated baseline → standing or clear upward transition → general movement for a configurable short threshold → completed. Precise seated-pose classification is not required, so the flow remains viable with desk occlusion, camera-angle differences, or partial body visibility. A suggested movement may appear as guidance, but it is not measured.

## Later

- A simple animated movement guide
- Local streak count
- Alternative micro-break suggestions
- Calibration for camera position
- Subtle start and completion sounds

## Explicitly Cut

- Specific exercise detection and form evaluation, because the proof is general movement after standing.
- Custom ML training, because a browser-compatible prebuilt model is sufficient for this demo.
- Accounts, backend services, databases, cloud processing, analytics, and notifications, because the complete loop runs locally in one browser session.
- Fitness tracking, health advice, gamification, social features, payments, and mobile or native applications, because none prove the core break-verification loop.
- Multiple movement types, because one reliable sequence makes the demo clearer and faster to finish.
