---
layout: page
title: projects
permalink: /projects/
description: All code on GitHub at github.com/RyanKim17920.
nav: true
nav_order: 3
---

<div class="projects-grid">

  <a class="project-card" href="/projects/mechanistic-sps/">
    <div class="project-card-header">
      <h3>Which State Should Prediction Read?</h3>
      <span class="project-date">2026</span>
    </div>
    <p>Sole-author paper, under review. Reached a FLOP-matched Transformer&rsquo;s loss on 2.1&times; fewer tokens and ended 0.064 nats/token lower after 20B tokens by designing Sequential, a final-state-read architecture, from these ablations (92M non-embedding params).</p>
    <div class="project-tags">LLM Architecture &amp; Interpretability</div>
    <span class="project-card-source">github.com/RyanKim17920/mechanistic-sps</span>
  </a>

  <a class="project-card" href="/projects/qwen-expthink/">
    <div class="project-card-header">
      <h3>Qwen3.6-27B ExpThink</h3>
      <span class="project-date">2026</span>
    </div>
    <p>Cut thinking tokens 52% in-domain / 34% OOD and truncation 6.0%&rarr;2.6% while mean OOD accuracy rose 84%&rarr;86% by post-training Qwen3.6-27B with a length-adjusted GRPO reward.</p>
    <div class="project-tags">GRPO Post-Training · LLM · RL</div>
    <span class="project-card-source">huggingface.co/ryankim17920/qwen3p6-27b-expthink-step60</span>
  </a>

  <a class="project-card" href="/projects/speedlm/">
    <img class="project-card-thumb" src="/assets/img/projects/speedlm-card.png" alt="speedLM preview" loading="lazy">
    <div class="project-card-header">
      <h3>speedLM</h3>
      <span class="project-date">2026</span>
    </div>
    <p>Built a custom vLLM server that fine-tunes EAGLE-3 draft models on captured local traffic during idle GPU time. Raised tokens accepted per verification step 13.4% over the stock draft on held-out Qwen3-8B data.</p>
    <div class="project-tags">LLM · vLLM · Speculative Decoding</div>
    <span class="project-card-source">github.com/RyanKim17920/speedlm</span>
  </a>

  <a class="project-card" href="/projects/microdinov3/">
    <img class="project-card-thumb" src="/assets/img/projects/dinov3-card.png" alt="microDINOv3 preview" loading="lazy">
    <div class="project-card-header">
      <h3>microDINOv3</h3>
      <span class="project-date">2026</span>
    </div>
    <p>DINOv3 in dependency-free pure Python — hand-written reverse-mode autograd and ViT, EMA teacher-student distillation, DINO + iBOT objectives, KoLeo regularization, axial RoPE with register tokens, and Gram anchoring.</p>
    <div class="project-tags">Pure Python · CV · Self-Supervised</div>
    <span class="project-card-source">github.com/RyanKim17920/microDINOv3</span>
  </a>

  <a class="project-card" href="/projects/deepmoe/">
    <img class="project-card-thumb" src="/assets/img/projects/deep-moe-card.png" alt="DeepMoE Reproduction preview" loading="lazy">
    <div class="project-card-header">
      <h3>DeepMoE Reproduction</h3>
      <span class="project-date">2024</span>
    </div>
    <p>PyTorch reproduction of "Deep Mixture of Experts via Shallow Embedding," recovering the paper's accuracy-vs-compute tradeoff on CIFAR-10.</p>
    <div class="project-tags">PyTorch · CV · Paper Reproduction</div>
    <span class="project-card-source">github.com/RyanKim17920/Deep-Mixture-of-Experts-via-Shallow-Embedding</span>
  </a>

  <a class="project-card" href="/projects/spectra/">
    <div class="project-card-header">
      <h3>SPECTRA</h3>
      <span class="project-date">2026</span>
    </div>
    <p>Raised mean PathoROB robustness 0.726&rarr;0.891 and improved downstream AUC across 7 pathology foundation models (first-author paper, accepted at a NeurIPS 2026 workshop).</p>
    <div class="project-tags">Label-free contrastive LoRA fine-tuning</div>
    <span class="project-card-source">openreview.net/forum?id=Gs7BZ9XI3r</span>
  </a>

  <a class="project-card" href="/projects/nanopath-autoresearch/">
    <div class="project-card-header">
      <h3>LLM Autoresearch Agent (NanoPath)</h3>
      <span class="project-date">2026</span>
    </div>
    <p>Drove 37% of the gain over baseline on NanoPath v1 and over 50% on NanoBrain by building an LLM autoresearch agent with dual-branch search and anti-overfitting cycles.</p>
    <div class="project-tags">LLM Agents</div>
    <span class="project-card-source">labless.dev</span>
  </a>

</div>
