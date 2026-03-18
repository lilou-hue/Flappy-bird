/* ═══════════════════════════════════════════════════════════════
   dialogue-engine.js  –  Markdown-like scene parser & executor
   The Art of Doing Nothing
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Speaker config ── */
  function getSpeakerName(key, fallback) {
    if (typeof I18N !== 'undefined') {
      var t = I18N.t(key);
      if (t !== key) return t;
    }
    return fallback;
  }
  const SPEAKERS = {
    s: { get name() { return getSpeakerName('aodnSloth', 'Sloth'); }, color: '#C4A97D', blipPitch: 'low' },
    n: { name: '',      color: '#999',    blipPitch: 'mid' },
    m: { get name() { return getSpeakerName('aodnSam', 'Sam'); },   color: '#B088D4', blipPitch: 'high' }
  };

  /* ── Parser ── */
  function parseSceneMarkdown(text) {
    const sections = {};
    let currentId = '_start';
    sections[currentId] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed) continue;

      // Section header: # id
      if (/^#\s+(\S+)/.test(trimmed)) {
        currentId = trimmed.match(/^#\s+(\S+)/)[1];
        if (!sections[currentId]) sections[currentId] = [];
        continue;
      }

      // Conditional: {{if expr}} ... {{/if}}
      if (/^\{\{if\s+(.+)\}\}$/.test(trimmed)) {
        const expr = trimmed.match(/^\{\{if\s+(.+)\}\}$/)[1];
        const block = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('{{/if}}')) {
          block.push(lines[i]);
          i++;
        }
        sections[currentId].push({ type: 'conditional', expr: expr, block: parseSceneMarkdown(block.join('\n')) });
        continue;
      }

      // Dialogue: s: / n: / m:
      const dialogueMatch = trimmed.match(/^([snm]):\s*(.+)/);
      if (dialogueMatch) {
        sections[currentId].push({
          type: 'dialogue',
          speaker: dialogueMatch[1],
          text: dialogueMatch[2]
        });
        continue;
      }

      // Choice: [Text](#id)
      const choiceMatch = trimmed.match(/^\[(.+?)\]\(#(.+?)\)/);
      if (choiceMatch) {
        // Collect consecutive choices
        const choices = [{ text: choiceMatch[1], target: choiceMatch[2] }];
        while (i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          const cm = next.match(/^\[(.+?)\]\(#(.+?)\)/);
          if (cm) {
            choices.push({ text: cm[1], target: cm[2] });
            i++;
          } else {
            break;
          }
        }
        sections[currentId].push({ type: 'choice', choices: choices });
        continue;
      }

      // JS execution: `code`
      const codeMatch = trimmed.match(/^`(.+)`$/);
      if (codeMatch) {
        sections[currentId].push({ type: 'exec', code: codeMatch[1] });
        continue;
      }

      // Wait: (...ms)
      const waitMatch = trimmed.match(/^\(\.\.\.(\d+)\)$/);
      if (waitMatch) {
        sections[currentId].push({ type: 'wait', ms: parseInt(waitMatch[1], 10) });
        continue;
      }

      // Goto: (#id)
      const gotoMatch = trimmed.match(/^\(#(.+)\)$/);
      if (gotoMatch) {
        sections[currentId].push({ type: 'goto', target: gotoMatch[1] });
        continue;
      }
    }

    return sections;
  }

  /* ── Executor ── */
  function DialogueExecutor(sections, callbacks) {
    this.sections = sections;
    this.cb = callbacks; // { onDialogue, onChoices, onWait, onExec, onEnd }
    this.queue = [];
    this.running = false;
    this.waitingForChoice = false;
    this.waitingForClick = false;
  }

  DialogueExecutor.prototype.goto = function (sectionId) {
    const section = this.sections[sectionId];
    if (!section) {
      // Check if it's nested in conditional blocks
      for (const key of Object.keys(this.sections)) {
        const lines = this.sections[key];
        for (const line of lines) {
          if (line.type === 'conditional' && line.block[sectionId]) {
            this.queue = line.block[sectionId].slice();
            this.running = true;
            this.next();
            return;
          }
        }
      }
      console.warn('Section not found:', sectionId);
      if (this.cb.onEnd) this.cb.onEnd();
      return;
    }
    this.queue = section.slice();
    this.running = true;
    this.next();
  };

  DialogueExecutor.prototype.next = function () {
    if (!this.running) return;
    if (this.queue.length === 0) {
      if (this.cb.onEnd) this.cb.onEnd();
      return;
    }

    const line = this.queue.shift();

    switch (line.type) {
      case 'dialogue':
        this.waitingForClick = true;
        if (this.cb.onDialogue) {
          this.cb.onDialogue(line.speaker, line.text, SPEAKERS[line.speaker]);
        }
        break;

      case 'choice':
        this.waitingForChoice = true;
        if (this.cb.onChoices) {
          this.cb.onChoices(line.choices);
        }
        break;

      case 'exec':
        try {
          /* eslint-disable no-new-func */
          new Function(line.code)();
        } catch (e) {
          console.warn('Exec error:', e);
        }
        if (this.cb.onExec) this.cb.onExec(line.code);
        this.next();
        break;

      case 'wait':
        if (this.cb.onWait) this.cb.onWait(line.ms);
        setTimeout(function () { this.next(); }.bind(this), line.ms);
        break;

      case 'goto':
        this.goto(line.target);
        break;

      case 'conditional': {
        let result = false;
        try {
          result = new Function('return ' + line.expr)();
        } catch (e) {}
        if (result && line.block._start) {
          // Prepend conditional block lines to current queue
          this.queue = line.block._start.concat(this.queue);
        }
        this.next();
        break;
      }

      default:
        this.next();
    }
  };

  DialogueExecutor.prototype.advance = function () {
    if (this.waitingForClick) {
      this.waitingForClick = false;
      this.next();
    }
  };

  DialogueExecutor.prototype.choose = function (targetId) {
    if (!this.waitingForChoice) return;
    this.waitingForChoice = false;
    window._.choicesMade++;
    GameState.save();
    this.goto(targetId);
  };

  DialogueExecutor.prototype.stop = function () {
    this.running = false;
    this.queue = [];
  };

  /* ── Text reveal helper ── */
  function revealText(container, text, charDelay, onChar, onDone) {
    container.innerHTML = '';
    let i = 0;
    const chars = text.split('');
    let skipped = false;

    function addNext() {
      if (skipped) return;
      if (i >= chars.length) {
        if (onDone) onDone();
        return;
      }
      const span = document.createElement('span');
      span.textContent = chars[i];
      span.style.opacity = '0';
      span.style.transition = 'opacity 0.08s';
      container.appendChild(span);
      requestAnimationFrame(function () { span.style.opacity = '1'; });
      if (onChar) onChar(chars[i], i);
      i++;
      setTimeout(addNext, charDelay);
    }

    addNext();

    return {
      skip: function () {
        skipped = true;
        container.textContent = text;
        if (onDone) onDone();
      },
      get done() { return i >= chars.length || skipped; }
    };
  }

  /* ── Public API ── */
  window.DialogueEngine = {
    parse: parseSceneMarkdown,
    Executor: DialogueExecutor,
    revealText: revealText,
    SPEAKERS: SPEAKERS
  };
})();
