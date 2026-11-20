---
layout: page
permalink: /projects/mechanistic-sps/
title: Which State Should Prediction Read?
description: "Sole-author paper, under review."
importance: 1
category: work
related_publications: false
---

Sole-author paper, under review.

**Built with:** LLM Architecture & Interpretability

**GitHub:** [RyanKim17920/mechanistic-sps](https://github.com/RyanKim17920/mechanistic-sps)

**Models:** [ryankim17920/mechanistic-sps](https://huggingface.co/ryankim17920/mechanistic-sps)

- Trained State–Prediction Separation (SPS) LMs, which split a Transformer into separate state and prediction streams; ablations showed the two divide the work: state tracks context, prediction retrieves from it.
- Reached a FLOP-matched Transformer's loss on 2.1× fewer tokens and ended 0.064 nats/token lower after 20B tokens by designing Sequential, a final-state-read architecture, from these ablations (92M non-embedding params).

_August – September 2026_
