---
layout: about
title: about
permalink: /standard/
subtitle: CS @ UIUC — building ML systems.

selected_papers: false
social: false

announcements:
  enabled: false

latest_posts:
  enabled: false
---

<div class="contact-bar">
  <a href="https://github.com/RyanKim17920" target="_blank" rel="noopener" class="contact-btn">
    <i class="fa-brands fa-github"></i><span>GitHub</span>
  </a>
  <a href="https://www.linkedin.com/in/ryankim17920/" target="_blank" rel="noopener" class="contact-btn">
    <i class="fa-brands fa-linkedin"></i><span>LinkedIn</span>
  </a>
  <a href="mailto:ryankim17920@gmail.com" class="contact-btn">
    <i class="fa-solid fa-envelope"></i><span>Email</span>
  </a>
  <a href="/assets/pdf/cv.pdf" target="_blank" rel="noopener" class="contact-btn">
    <i class="fa-solid fa-file-pdf"></i><span>CV</span>
  </a>
</div>

I’m Ryan Kim — a Computer Science student at UIUC (Class of 2029). First-author paper at a NeurIPS 2026 workshop · Sole-author paper under review · Founding team, a16z AI startup.

<h2 class="section-heading">
  Experience
  <span class="section-hint">click any row to expand</span>
</h2>

<div class="experience-list">

  <details class="experience-item">
    <summary class="experience-header">
      <span class="experience-chevron">&#9656;</span>
      <span class="experience-icon experience-icon-fallback" aria-hidden="true">D</span>
      <div class="experience-main">
        <div class="experience-top-row">
          <div class="experience-title"><strong>RL Intern (Founding Team)</strong> · <a href="https://delightfullabs.ai" target="_blank" rel="noopener">Delightful AI</a> (a16z speedrun-backed)</div>
          <div class="experience-date">Aug 2026 — Present</div>
        </div>
        <div class="experience-tags">
          <span class="tag">RL Environments</span><span class="tag">LLM Agents</span><span class="tag">Docker</span><span class="tag">Harbor</span>
        </div>
      </div>
    </summary>
    <div class="experience-details">
      <ul>
        <li>Built bioinformatics agent RL environments (Chimera) end to end that hold GPT-6 Astra, Claude Opus 5.5, and Fable 5.1 to &lt;0.5/1.0 reward: a synthetic generator of verified-solvable tasks, Docker/Harbor execution, and reward grading.</li>
        <li>Sped up task generation 6&times; by adding caching and parallelism to the generator pipeline.</li>
        <li>Analyzed agent trajectories with an LLM-as-a-judge that checks each run against expected milestones.</li>
      </ul>
    </div>
  </details>

  <details class="experience-item">
    <summary class="experience-header">
      <span class="experience-chevron">&#9656;</span>
      <img class="experience-icon" src="https://www.google.com/s2/favicons?domain=illinois.edu&sz=64" alt="University of Illinois logo" loading="lazy">
      <div class="experience-main">
        <div class="experience-top-row">
          <div class="experience-title"><strong>Undergraduate Researcher</strong> · BLENDER Lab, UIUC (with Alexi Gladstone)</div>
          <div class="experience-date">Aug 2026 — Present</div>
        </div>
        <div class="experience-tags">
          <span class="tag">Energy-Based Transformers</span><span class="tag">Explorative Modeling (XM)</span><span class="tag">LLM Architecture</span><span class="tag">Scaling Laws</span>
        </div>
      </div>
    </summary>
    <div class="experience-details">
      <ul>
        <li>Led research extending Energy-Based Transformers to multi-token prediction through Explorative Modeling (XM).</li>
        <li>Implemented the full training stack and compared candidate energy formulations against block-diffusion LLMs; running scaling-law studies for Energy-Based Transformers.</li>
      </ul>
    </div>
  </details>

  <details class="experience-item">
    <summary class="experience-header">
      <span class="experience-chevron">&#9656;</span>
      <img class="experience-icon" src="https://www.google.com/s2/favicons?domain=sophont.med&sz=64" alt="Sophont logo" loading="lazy">
      <div class="experience-main">
        <div class="experience-top-row">
          <div class="experience-title"><strong>Research Intern (prev. ML Research Contributor, MedARC)</strong> · <a href="https://sophont.med" target="_blank" rel="noopener">Sophont</a></div>
          <div class="experience-date">Apr 2026 — Present</div>
        </div>
        <div class="experience-tags">
          <span class="tag">Histopathology</span><span class="tag">NanoPath</span><span class="tag">Model Robustness</span><span class="tag">LLM Agents</span>
        </div>
      </div>
    </summary>
    <div class="experience-details">
      <ul>
        <li>Drove 37% of the gain over baseline on <a href="https://labless.dev/nano-projects/nanopath" target="_blank" rel="noopener">NanoPath v1</a> (3rd-author paper, accepted at a NeurIPS 2026 workshop) and over 50% on <a href="https://labless.dev/nano-projects/nanobrain-smri" target="_blank" rel="noopener">NanoBrain</a> by building an LLM autoresearch agent with dual-branch search and anti-overfitting cycles.</li>
        <li>Cut config errors 80% and token use 15&times; by designing agent infrastructure (knowledge graphs, SLURM, worktree isolation).</li>
        <li>Raised mean PathoROB robustness 0.726&rarr;0.891 and improved downstream AUC across 7 pathology foundation models by introducing <a href="https://openreview.net/forum?id=Gs7BZ9XI3r" target="_blank" rel="noopener">SPECTRA</a>, label-free contrastive LoRA fine-tuning (first-author paper, accepted at a NeurIPS 2026 workshop).</li>
      </ul>
    </div>
  </details>

  <details class="experience-item">
    <summary class="experience-header">
      <span class="experience-chevron">&#9656;</span>
      <img class="experience-icon" src="https://www.google.com/s2/favicons?domain=weill.cornell.edu&sz=64" alt="Weill Cornell Medicine logo" loading="lazy">
      <div class="experience-main">
        <div class="experience-top-row">
          <div class="experience-title"><strong>Pathology AI Research Intern</strong> · <a href="https://ihlab.med.cornell.edu/" target="_blank" rel="noopener">AI in Medicine &amp; Computational Biology Lab, Weill Cornell Medicine</a></div>
          <div class="experience-date">Oct 2024 — Jul 2026</div>
        </div>
        <div class="experience-tags">
          <span class="tag">Computer Vision</span><span class="tag">Generalization</span><span class="tag">TCGA</span><span class="tag">Tumor Purity</span>
        </div>
      </div>
    </summary>
    <div class="experience-details">
      <ul>
        <li>Found that error doubles out of distribution (MAE ~0.10&rarr;~0.20) by benchmarking 12 vision foundation models for tumor-purity regression on TCGA and internal cohorts in PyTorch.</li>
      </ul>
    </div>
  </details>

  <details class="experience-item">
    <summary class="experience-header">
      <span class="experience-chevron">&#9656;</span>
      <img class="experience-icon" src="https://www.google.com/s2/favicons?domain=mskcc.org&sz=64" alt="Memorial Sloan Kettering logo" loading="lazy">
      <div class="experience-main">
        <div class="experience-top-row">
          <div class="experience-title"><strong>Computational Oncology Research Intern</strong> · <a href="https://www.mskcc.org/research-areas/research-teams/advanced-computing-and-oncology-lab" target="_blank" rel="noopener">Advanced Computing &amp; Oncology Lab, Memorial Sloan Kettering</a></div>
          <div class="experience-date">Dec 2024 — Jan 2026</div>
        </div>
        <div class="experience-tags">
          <span class="tag">LLMs</span><span class="tag">DSPy</span><span class="tag">Clinical NLP</span><span class="tag">Oncology</span>
        </div>
      </div>
    </summary>
    <div class="experience-details">
      <ul>
        <li>Engineered a CPU-only LLM pipeline that classified 370 clinically annotated lung-cancer CT reports, optimizing prompts for Llama 3.1-8B and Qwen3-4B with DSPy MIPROv2 (3rd-author abstract, accepted at ACRO 2026).</li>
      </ul>
    </div>
  </details>

  <details class="experience-item">
    <summary class="experience-header">
      <span class="experience-chevron">&#9656;</span>
      <img class="experience-icon" src="https://www.google.com/s2/favicons?domain=stonybrook.edu&sz=64" alt="Stony Brook University logo" loading="lazy">
      <div class="experience-main">
        <div class="experience-top-row">
          <div class="experience-title"><strong><a href="https://www.stonybrook.edu/simons/" target="_blank" rel="noopener">Simons Summer Research Fellow (Computational Genomics)</a></strong> · <a href="https://ayurovsky.github.io/" target="_blank" rel="noopener">Yurovsky Lab</a>, Stony Brook University (<a href="https://www.simonsfoundation.org/" target="_blank" rel="noopener">Simons Foundation</a>)</div>
          <div class="experience-date">Jun 2025 — Aug 2026</div>
        </div>
        <div class="experience-tags">
          <span class="tag">Genomics</span><span class="tag">DNABERT</span><span class="tag">Cox Regression</span><span class="tag">Glioblastoma</span>
        </div>
      </div>
    </summary>
    <div class="experience-details">
      <ul>
        <li>Predicted survival of 185 glioblastoma patients with a DNABERT-based Cox model on non-coding DNA mutations.</li>
      </ul>
    </div>
  </details>

</div>

<div class="section-more">
  <a href="/assets/pdf/cv.pdf" target="_blank" rel="noopener">Full CV (PDF) →</a>
</div>

<h2 class="section-heading">
  Research
  <a class="section-more-inline" href="/publications/">All publications →</a>
</h2>

{% include selected_papers.liquid %}

<h2 class="section-heading">
  Selected Projects
  <a class="section-more-inline" href="/projects/">All projects →</a>
</h2>

<div class="projects-grid">

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

</div>

<h2 class="section-heading">Skills</h2>

<div class="skills-cards">

  <div class="skills-card">
    <div class="skills-card-title">Languages</div>
    <div class="tech-grid">
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" alt="Python logo"><span>Python</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" alt="C/C++ logo"><span>C/C++</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" alt="Java logo"><span>Java</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" alt="SQL logo"><span>SQL</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" alt="JavaScript logo"><span>JavaScript</span></div>
    </div>
  </div>

  <div class="skills-card">
    <div class="skills-card-title">ML / LLM</div>
    <div class="tech-grid">
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" alt="PyTorch logo"><span>PyTorch</span></div>
      <div class="tech-item"><img src="https://cdn.simpleicons.org/huggingface" alt="Hugging Face logo"><span>Hugging Face</span></div>
      <div class="tech-item"><img src="https://cdn.simpleicons.org/vllm" alt="vLLM logo"><span>vLLM</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/scikitlearn/scikitlearn-original.svg" alt="Scikit-learn logo"><span>Scikit-learn</span></div>
      <div class="tech-item"><img src="https://cdn.simpleicons.org/polars/6B46C1" alt="Polars logo"><span>Polars</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg" alt="Pandas logo"><span>Pandas</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg" alt="NumPy logo"><span>NumPy</span></div>
    </div>
  </div>

  <div class="skills-card">
    <div class="skills-card-title">Web / Backend</div>
    <div class="tech-grid">
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React logo"><span>React</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js logo"><span>Node.js</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" alt="FastAPI logo"><span>FastAPI</span></div>
    </div>
  </div>

  <div class="skills-card">
    <div class="skills-card-title">Tools</div>
    <div class="tech-grid">
      <div class="tech-item"><img src="https://www.google.com/s2/favicons?domain=schedmd.com&sz=64" alt="Slurm logo"><span>Slurm</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" alt="Docker logo"><span>Docker</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg" alt="Linux logo"><span>Linux</span></div>
      <div class="tech-item"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" alt="Git logo"><span>Git</span></div>
    </div>
  </div>

</div>
