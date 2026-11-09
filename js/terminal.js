/**
 * Ubuntu Server Terminal Simulator & Command Execution Engine
 * Handles tokenizer, pipeline, redirections, nano editor, process table, and command implementations
 */

class TerminalEngine {
  constructor(vfs, questMgr) {
    this.vfs = vfs;
    this.quest = questMgr;

    // Terminal DOM Elements
    this.bodyEl = document.getElementById('terminalBody');
    this.outputEl = document.getElementById('terminalOutput');
    this.promptLineEl = document.getElementById('promptLine');
    this.inputEl = document.getElementById('terminalInput');
    this.currentPathEl = document.getElementById('promptCurrentPath');
    this.tabTitleEl = document.getElementById('terminalTabTitle');

    // Multiline cat > elements
    this.multilineBoxEl = document.getElementById('multilinePromptBox');
    this.multilineInputEl = document.getElementById('multilineInput');
    this.multilineHistoryEl = document.getElementById('multilineHistory');

    // Nano editor elements
    this.nanoViewEl = document.getElementById('nanoEditorView');
    this.nanoFileNameEl = document.getElementById('nanoFileName');
    this.nanoTextAreaEl = document.getElementById('nanoTextArea');
    this.nanoConfirmBarEl = document.getElementById('nanoConfirmBar');
    this.nanoConfirmInputEl = document.getElementById('nanoConfirmInput');
    this.nanoConfirmQuestionEl = document.getElementById('nanoConfirmQuestion');

    // Top screen view
    this.topViewEl = document.getElementById('topScreenView');
    this.topHeaderEl = document.getElementById('topHeader');
    this.topTableEl = document.getElementById('topTable');

    // History navigation
    this.history = [];
    this.historyIndex = -1;

    // Background jobs
    this.backgroundJobs = [];

    // System & Daemon state
    this.state = {
      apacheInstalled: true, // Installed by default so students can start/stop/restart
      apacheRunning: true,
      apachePid: 1420,
      lastExitCode: 0
    };

    // Active multiline redirection session
    this.activeMultilineSession = null; // { targetFile, mode: 'overwrite'|'append', lines: [] }

    // Active Nano session
    this.activeNanoSession = null; // { filePath, originalContent, isModified }

    this.initEventListeners();
    this.updatePromptDisplay();
  }

  initEventListeners() {
    // Terminal input key handling
    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          let cmd = this.inputEl.value;
          this.inputEl.value = '';
          this.executeCommandLine(cmd);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (this.history.length > 0) {
            if (this.historyIndex === -1) {
              this.historyIndex = this.history.length - 1;
            } else if (this.historyIndex > 0) {
              this.historyIndex--;
            }
            this.inputEl.value = this.history[this.historyIndex] || '';
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (this.historyIndex !== -1) {
            if (this.historyIndex < this.history.length - 1) {
              this.historyIndex++;
              this.inputEl.value = this.history[this.historyIndex];
            } else {
              this.historyIndex = -1;
              this.inputEl.value = '';
            }
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this.handleTabAutocomplete();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          this.sendCtrlC();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          this.sendCtrlD();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
          e.preventDefault();
          this.clearScreen();
        }
      });
    }

    // Multiline cat > input handling
    if (this.multilineInputEl) {
      this.multilineInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          let val = this.multilineInputEl.value;
          this.multilineInputEl.value = '';
          this.handleMultilineLine(val);
        } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          this.sendCtrlC();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          this.sendCtrlD();
        }
      });

      this.multilineInputEl.addEventListener('paste', (e) => {
        let pasted = (e.clipboardData || window.clipboardData)?.getData('text');
        if (pasted && pasted.includes('\n')) {
          e.preventDefault();
          let lines = pasted.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
          for (let l of lines) {
            this.handleMultilineLine(l);
          }
          this.multilineInputEl.value = '';
        }
      });
    }

    // Global click anywhere in terminal focuses active input
    if (this.bodyEl) {
      this.bodyEl.addEventListener('click', () => {
        if (this.activeMultilineSession) {
          if (this.multilineInputEl) this.multilineInputEl.focus();
        } else if (this.activeNanoSession) {
          if (this.nanoTextAreaEl) this.nanoTextAreaEl.focus();
        } else {
          if (this.inputEl) this.inputEl.focus();
        }
      });
    }

    // Safe attachment for Quick Action Bar Buttons
    const btnCtrlC = document.getElementById('btnCtrlC');
    if (btnCtrlC) btnCtrlC.addEventListener('click', () => this.sendCtrlC());

    const btnCtrlD = document.getElementById('btnCtrlD');
    if (btnCtrlD) btnCtrlD.addEventListener('click', () => this.sendCtrlD());

    const btnClearTerm = document.getElementById('btnClearTerm');
    if (btnClearTerm) btnClearTerm.addEventListener('click', () => this.clearScreen());

    const btnHelpTerm = document.getElementById('btnHelpTerm');
    if (btnHelpTerm) btnHelpTerm.addEventListener('click', () => this.executeCommandLine('help'));

    // Top screen exit
    const btnExitTop = document.getElementById('btnExitTop');
    if (btnExitTop) btnExitTop.addEventListener('click', () => this.exitTopScreen());

    window.addEventListener('keydown', (e) => {
      if (this.topViewEl && !this.topViewEl.classList.contains('hidden')) {
        if (e.key.toLowerCase() === 'q') {
          this.exitTopScreen();
        }
      }
    });

    // Nano button listeners
    const btnNanoWriteOut = document.getElementById('btnNanoWriteOut');
    if (btnNanoWriteOut) btnNanoWriteOut.addEventListener('click', () => this.nanoSaveBuffer());

    const btnNanoExit = document.getElementById('btnNanoExit');
    if (btnNanoExit) btnNanoExit.addEventListener('click', () => this.nanoExit());

    if (this.nanoTextAreaEl) {
      this.nanoTextAreaEl.addEventListener('input', () => {
        if (this.activeNanoSession) {
          this.activeNanoSession.isModified = true;
          const statusEl = document.getElementById('nanoModifiedStatus');
          if (statusEl) statusEl.textContent = 'Modified';
        }
      });
      this.nanoTextAreaEl.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          this.nanoExit();
        } else if (e.ctrlKey && (e.key.toLowerCase() === 'o' || e.key.toLowerCase() === 's')) {
          e.preventDefault();
          this.nanoSaveBuffer();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          let start = this.nanoTextAreaEl.selectionStart;
          let end = this.nanoTextAreaEl.selectionEnd;
          this.nanoTextAreaEl.value = this.nanoTextAreaEl.value.substring(0, start) + '  ' + this.nanoTextAreaEl.value.substring(end);
          this.nanoTextAreaEl.selectionStart = this.nanoTextAreaEl.selectionEnd = start + 2;
          if (this.activeNanoSession) {
            this.activeNanoSession.isModified = true;
            const statusEl = document.getElementById('nanoModifiedStatus');
            if (statusEl) statusEl.textContent = 'Modified';
          }
        }
      });
    }

    if (this.nanoViewEl) {
      this.nanoViewEl.addEventListener('click', (e) => {
        if (!e.target.closest('.nano-shortcut') && !e.target.closest('.nano-confirm-bar')) {
          if (this.nanoTextAreaEl) this.nanoTextAreaEl.focus();
        }
      });
    }

    if (this.nanoConfirmInputEl) {
      this.nanoConfirmInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          let ans = this.nanoConfirmInputEl.value.trim().toUpperCase();
          this.handleNanoConfirmAnswer(ans);
        }
      });
    }
  }

  updatePromptDisplay() {
    let disp = this.vfs.getDisplayPath();
    if (this.currentPathEl) this.currentPathEl.textContent = disp;
    if (this.tabTitleEl) this.tabTitleEl.textContent = `praktikan@ubuntu-server: ${disp}`;
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.bodyEl) {
        this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
      }
    }, 10);
  }

  clearScreen() {
    if (this.outputEl) this.outputEl.innerHTML = '';
    const motd = document.getElementById('terminalMotd');
    if (motd) motd.style.display = 'none';
    this.scrollToBottom();
  }

  finishMultilineSession(reason = 'EOF') {
    if (!this.activeMultilineSession) return;
    let sess = this.activeMultilineSession;
    let finalContent = sess.lines.join('\n');
    try {
      if (sess.mode === 'append') {
        this.vfs.appendFile(sess.targetFile, finalContent);
      } else {
        this.vfs.createFile(sess.targetFile, finalContent, true);
      }
      let tag = reason === 'EOF' ? '^D' : '^C';
      this.appendOutputLine(`${tag}\n[File '${sess.targetFile}' disimpan]`, 'info');
    } catch (err) {
      this.appendOutputLine(`cat: error: ${err.message}`, 'error');
    }

    let targetFile = sess.targetFile;
    this.activeMultilineSession = null;
    if (this.multilineBoxEl) this.multilineBoxEl.classList.add('hidden');
    if (this.promptLineEl) this.promptLineEl.classList.remove('hidden');
    if (this.inputEl) this.inputEl.focus();

    let recordedCmd = 'cat > ' + targetFile;
    if (this.quest) {
      this.quest.recordCommand(recordedCmd, finalContent, 0);
    }

    window.dispatchEvent(new CustomEvent('osquest_vfs_changed'));
    window.dispatchEvent(new CustomEvent('osquest_command_executed', {
      detail: { cmd: recordedCmd, output: finalContent, code: 0 }
    }));
    this.scrollToBottom();
  }

  sendCtrlD() {
    if (this.activeMultilineSession) {
      this.finishMultilineSession('EOF');
    }
  }

  sendCtrlC() {
    if (this.activeNanoSession) {
      if (this.nanoConfirmBarEl && !this.nanoConfirmBarEl.classList.contains('hidden')) {
        this.nanoConfirmBarEl.classList.add('hidden');
        if (this.nanoTextAreaEl) this.nanoTextAreaEl.focus();
      }
      return;
    }

    if (this.activeMultilineSession) {
      this.finishMultilineSession('INTR');
      return;
    } else {
      let currentVal = this.inputEl ? this.inputEl.value : '';
      this.appendPromptEcho(currentVal + '^C');
      if (this.inputEl) this.inputEl.value = '';
      this.historyIndex = -1;
    }
    this.scrollToBottom();
  }

  appendPromptEcho(cmdText) {
    if (!this.outputEl) return;
    let entry = document.createElement('div');
    entry.className = 'term-entry';
    let echo = document.createElement('div');
    echo.className = 'term-cmd-echo';
    echo.innerHTML = `<span class="prompt-user">praktikan@ubuntu-server</span><span class="prompt-colon">:</span><span class="prompt-path">${this.vfs.getDisplayPath()}</span><span class="prompt-symbol">$</span> <span>${this.escapeHtml(cmdText)}</span>`;
    entry.appendChild(echo);
    this.outputEl.appendChild(entry);
    this.scrollToBottom();
  }

  appendOutputLine(text, type = 'normal') {
    if (!this.outputEl || (!text && text !== '')) return;
    let entry = document.createElement('div');
    entry.className = 'term-entry';
    let res = document.createElement('div');
    res.className = `term-result ${type}`;
    res.textContent = text;
    entry.appendChild(res);
    this.outputEl.appendChild(entry);
    this.scrollToBottom();
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Multiline handler for cat >
  startMultilineCapture(targetFile, mode = 'overwrite') {
    this.activeMultilineSession = {
      targetFile,
      mode,
      lines: []
    };
    if (this.promptLineEl) this.promptLineEl.classList.add('hidden');
    if (this.multilineBoxEl) this.multilineBoxEl.classList.remove('hidden');
    if (this.multilineHistoryEl) this.multilineHistoryEl.textContent = '';
    if (this.multilineInputEl) {
      this.multilineInputEl.value = '';
      this.multilineInputEl.focus();
    }
    this.scrollToBottom();
  }

  handleMultilineLine(line) {
    if (!this.activeMultilineSession) return;
    if (typeof line === 'string' && line.includes('\n')) {
      let subLines = line.split(/\r?\n/);
      for (let sl of subLines) {
        let trimmed = sl.trim().replace(/^[-•*]\s*/, '');
        if (trimmed.length > 0) this.activeMultilineSession.lines.push(trimmed);
      }
    } else if (line !== undefined) {
      let trimmed = String(line).trim().replace(/^[-•*]\s*/, '');
      if (trimmed.length > 0) {
        this.activeMultilineSession.lines.push(trimmed);
      }
    }
    if (this.multilineHistoryEl) {
      this.multilineHistoryEl.textContent = this.activeMultilineSession.lines.join('\n');
    }
    if (this.multilineInputEl) this.multilineInputEl.focus();
    this.scrollToBottom();
  }

  // Nano Editor Handlers
  openNano(filePath) {
    if (!filePath || filePath.trim() === '') {
      filePath = 'untitled.txt';
    }
    let absPath = this.vfs.resolvePath(filePath);
    let fileName = absPath.split('/').pop();
    let content = '';

    // Check if parent directory exists
    let lastSlash = absPath.lastIndexOf('/');
    let parentPath = absPath.slice(0, lastSlash) || '/';
    let parentNode = this.vfs.getNode(parentPath);
    if (!parentNode || parentNode.type !== 'dir') {
      this.appendOutputLine(`nano: ${filePath}: No such file or directory`, 'error');
      return;
    }

    let existing = this.vfs.getNode(absPath);
    if (existing) {
      if (existing.type === 'dir') {
        this.appendOutputLine(`nano: ${filePath}: Is a directory`, 'error');
        return;
      }
      content = existing.content || '';
    }

    this.activeNanoSession = {
      filePath: absPath,
      fileName,
      originalContent: content,
      isModified: false
    };

    if (this.nanoFileNameEl) this.nanoFileNameEl.textContent = fileName;
    if (this.nanoTextAreaEl) {
      this.nanoTextAreaEl.value = content;
    }
    const statusEl = document.getElementById('nanoModifiedStatus');
    if (statusEl) statusEl.textContent = '';
    if (this.nanoConfirmBarEl) this.nanoConfirmBarEl.classList.add('hidden');
    if (this.nanoViewEl) this.nanoViewEl.classList.remove('hidden');
    if (this.promptLineEl) this.promptLineEl.classList.add('hidden');

    setTimeout(() => {
      if (this.nanoTextAreaEl) {
        this.nanoTextAreaEl.focus();
        this.nanoTextAreaEl.setSelectionRange(this.nanoTextAreaEl.value.length, this.nanoTextAreaEl.value.length);
      }
    }, 30);
  }

  nanoSaveBuffer() {
    if (!this.activeNanoSession || !this.nanoTextAreaEl) return;
    try {
      this.vfs.createFile(this.activeNanoSession.filePath, this.nanoTextAreaEl.value, true);
      this.activeNanoSession.isModified = false;
      const statusEl = document.getElementById('nanoModifiedStatus');
      if (statusEl) {
        statusEl.textContent = `[ Wrote ${this.nanoTextAreaEl.value.length} bytes ]`;
        setTimeout(() => {
          if (this.activeNanoSession && !this.activeNanoSession.isModified) {
            statusEl.textContent = '';
          }
        }, 2000);
      }
      window.dispatchEvent(new CustomEvent('osquest_vfs_changed'));
    } catch (e) {
      alert("Error saving buffer: " + e.message);
    }
  }

  nanoExit() {
    if (!this.activeNanoSession) return;
    if (this.activeNanoSession.isModified) {
      if (this.nanoConfirmBarEl) this.nanoConfirmBarEl.classList.remove('hidden');
      if (this.nanoConfirmInputEl) {
        this.nanoConfirmInputEl.value = '';
        this.nanoConfirmInputEl.focus();
      }
    } else {
      this.closeNanoView();
    }
  }

  handleNanoConfirmAnswer(ans) {
    if (ans === 'Y') {
      this.nanoSaveBuffer();
      this.closeNanoView();
    } else if (ans === 'N') {
      this.closeNanoView();
    } else {
      if (this.nanoConfirmBarEl) this.nanoConfirmBarEl.classList.add('hidden');
      if (this.nanoTextAreaEl) this.nanoTextAreaEl.focus();
    }
  }

  closeNanoView() {
    let savedFile = this.activeNanoSession ? this.activeNanoSession.filePath : '';
    this.activeNanoSession = null;
    if (this.nanoViewEl) this.nanoViewEl.classList.add('hidden');
    if (this.nanoConfirmBarEl) this.nanoConfirmBarEl.classList.add('hidden');
    if (this.promptLineEl) this.promptLineEl.classList.remove('hidden');
    if (this.inputEl) this.inputEl.focus();
    this.updatePromptDisplay();
    this.scrollToBottom();

    window.dispatchEvent(new CustomEvent('osquest_command_executed', {
      detail: { cmd: 'nano ' + savedFile, output: '', code: 0 }
    }));
  }

  // TOP Command Simulation
  openTopScreen() {
    if (!this.topViewEl) return;
    this.topViewEl.classList.remove('hidden');
    if (this.promptLineEl) this.promptLineEl.classList.add('hidden');
    let now = new Date();
    let timeStr = now.toTimeString().split(' ')[0];

    if (this.topHeaderEl) {
      this.topHeaderEl.innerHTML = `
        <div><strong>top - ${timeStr}</strong> up 2:15, 1 user, load average: 0.08, 0.05, 0.01</div>
        <div>Tasks: <strong>112 total</strong>, 1 running, 111 sleeping, 0 stopped, 0 zombie</div>
        <div>%Cpu(s):  <strong>1.3 us</strong>,  0.7 sy,  0.0 ni, 97.8 id,  0.1 wa,  0.0 hi,  0.1 si</div>
        <div>MiB Mem : <strong>7920.4 total</strong>, 3412.0 free, 2145.2 used, 2363.2 buff/cache</div>
        <div>MiB Swap: <strong>2048.0 total</strong>, 2048.0 free,    0.0 used. 5420.8 avail Mem</div>
      `;
    }

    let apacheRow = this.state.apacheRunning ? `
      <tr><td>1420</td><td>www-data</td><td>20</td><td>0</td><td>256M</td><td>32M</td><td>18M</td><td>S</td><td>0.3</td><td>0.4</td><td>0:01.42</td><td>apache2</td></tr>
      <tr><td>1421</td><td>www-data</td><td>20</td><td>0</td><td>256M</td><td>14M</td><td>12M</td><td>S</td><td>0.0</td><td>0.2</td><td>0:00.12</td><td>apache2 (thread worker)</td></tr>
    ` : '';

    let bgRows = this.backgroundJobs.map(j => `
      <tr><td>${j.pid}</td><td>praktikan</td><td>20</td><td>0</td><td>12M</td><td>2M</td><td>2M</td><td>S</td><td>0.0</td><td>0.1</td><td>0:00.01</td><td>${j.cmd}</td></tr>
    `).join('');

    if (this.topTableEl) {
      this.topTableEl.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>PID</th><th>USER</th><th>PR</th><th>NI</th><th>VIRT</th><th>RES</th><th>SHR</th><th>S</th><th>%CPU</th><th>%MEM</th><th>TIME+</th><th>COMMAND</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>root</td><td>20</td><td>0</td><td>168M</td><td>11M</td><td>8M</td><td>S</td><td>0.0</td><td>0.1</td><td>0:02.15</td><td>systemd</td></tr>
            <tr><td>840</td><td>root</td><td>20</td><td>0</td><td>72M</td><td>6M</td><td>5M</td><td>S</td><td>0.0</td><td>0.1</td><td>0:00.34</td><td>systemd-journald</td></tr>
            ${apacheRow}
            ${bgRows}
            <tr><td>2045</td><td>praktikan</td><td>20</td><td>0</td><td>14M</td><td>4M</td><td>3M</td><td>S</td><td>0.0</td><td>0.1</td><td>0:00.22</td><td>bash</td></tr>
            <tr><td>2102</td><td>praktikan</td><td>20</td><td>0</td><td>18M</td><td>3M</td><td>2M</td><td>R</td><td>1.2</td><td>0.0</td><td>0:00.08</td><td>top</td></tr>
          </tbody>
        </table>
      `;
    }
  }

  exitTopScreen() {
    if (this.topViewEl) this.topViewEl.classList.add('hidden');
    if (this.promptLineEl) this.promptLineEl.classList.remove('hidden');
    if (this.inputEl) this.inputEl.focus();
    this.scrollToBottom();
  }

  // Tab autocompletion for commands and files
  handleTabAutocomplete() {
    if (!this.inputEl) return;
    let val = this.inputEl.value;
    let parts = val.split(' ');
    let lastWord = parts[parts.length - 1];

    if (parts.length === 1) {
      const COMMANDS = [
        'cat', 'echo', 'nano', 'ps', 'top', 'systemctl', 'kill', 'pkill',
        'ls', 'file', 'grep', 'sort', 'wc', 'uniq', 'tee', 'mkdir', 'cd', 'pwd',
        'touch', 'rm', 'clear', 'sudo', 'ifconfig', 'history', 'help'
      ];
      let matches = COMMANDS.filter(c => c.startsWith(lastWord));
      if (matches.length === 1) {
        this.inputEl.value = matches[0] + ' ';
      }
    } else {
      try {
        let entries = this.vfs.listDir('.');
        let names = entries.map(e => e.name);
        let matches = names.filter(n => n.startsWith(lastWord));
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0];
          this.inputEl.value = parts.join(' ');
        }
      } catch (e) {}
    }
  }

  // =========================================================================
  // Command Line Parser & Execution
  // =========================================================================
  executeCommandLine(cmdLine) {
    if (!cmdLine || cmdLine.trim() === '') {
      this.appendPromptEcho('');
      return;
    }

    let trimmed = cmdLine.trim();
    this.history.push(trimmed);
    this.historyIndex = -1;
    this.appendPromptEcho(trimmed);

    // Support sequential logic: ';' or '&&' or '||'
    if (trimmed.includes(';') || trimmed.includes('&&') || trimmed.includes('||')) {
      this.executeChainedCommands(trimmed);
      return;
    }

    let result = this.executeSinglePipeline(trimmed);
    this.state.lastExitCode = result.code;

    this.quest.recordCommand(trimmed, result.stdout || result.stderr, result.code);

    window.dispatchEvent(new CustomEvent('osquest_command_executed', {
      detail: { cmd: trimmed, output: result.stdout || result.stderr, code: result.code }
    }));

    this.updatePromptDisplay();
    if (!this.activeNanoSession && (!this.topViewEl || this.topViewEl.classList.contains('hidden'))) {
      this.scrollToBottom();
    }
  }

  executeChainedCommands(rawLine) {
    let regex = /(&&|\|\||;)/g;
    let tokens = [];
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(rawLine)) !== null) {
      tokens.push(rawLine.slice(lastIdx, match.index).trim());
      tokens.push(match[0]);
      lastIdx = regex.lastIndex;
    }
    tokens.push(rawLine.slice(lastIdx).trim());

    let i = 0;
    let lastCode = 0;

    while (i < tokens.length) {
      let subCmd = tokens[i];
      if (!subCmd) {
        i++;
        continue;
      }

      let res = this.executeSinglePipeline(subCmd);
      lastCode = res.code;
      this.state.lastExitCode = lastCode;

      this.quest.recordCommand(subCmd, res.stdout || res.stderr, res.code);

      i++;
      if (i < tokens.length) {
        let op = tokens[i];
        i++;
        if (op === '&&' && lastCode !== 0) break;
        if (op === '||' && lastCode === 0) break;
      }
    }

    window.dispatchEvent(new CustomEvent('osquest_command_executed', {
      detail: { cmd: rawLine, output: '', code: lastCode }
    }));
    this.updatePromptDisplay();
    if (!this.activeNanoSession && (!this.topViewEl || this.topViewEl.classList.contains('hidden'))) {
      this.scrollToBottom();
    }
  }

  executeSinglePipeline(rawCmd) {
    let clean = rawCmd.trim();

    // Variable expansion: $$ -> 2045 (terminal shell PID)
    clean = clean.replace(/\$\$/g, '2045');

    // Check background operator '&' at end of command (Level 8 instruction)
    let isBackground = false;
    if (clean.endsWith('&') && !clean.endsWith('&&')) {
      isBackground = true;
      clean = clean.slice(0, -1).trim();
    }

    // Brace expansion in mkdir: e.g. mkdir -p Pemeriksaan_Lab/{data,hasil,log} or mkdir {data,hasil,log}
    let braceMatch = clean.match(/mkdir\s+(.*)\{([^}]+)\}(.*)/);
    if (braceMatch) {
      let before = braceMatch[1];
      let items = braceMatch[2].split(',').map(s => s.trim());
      let after = braceMatch[3] || '';
      for (let sub of items) {
        this.executeSinglePipeline(`mkdir ${before}${sub}${after}`);
      }
      return { code: 0, stdout: '', stderr: '' };
    }

    let stages = this.splitPipeline(clean);
    let pipeStdin = '';
    let finalResult = { code: 0, stdout: '', stderr: '' };

    for (let i = 0; i < stages.length; i++) {
      let stage = stages[i].trim();
      let isLast = i === stages.length - 1;

      let res = this.executeStageWithRedirection(stage, pipeStdin);

      if (res.code !== 0 && !res.stdout) {
        finalResult = res;
        break;
      }

      pipeStdin = res.stdout;
      if (isLast) {
        finalResult = res;
      }
    }

    if (isBackground) {
      let jobPid = 2340 + this.backgroundJobs.length;
      this.backgroundJobs.push({ pid: jobPid, cmd: clean });
      this.appendOutputLine(`[1] ${jobPid}`, 'info');
    } else {
      if (finalResult.stdout) {
        this.appendOutputLine(finalResult.stdout, 'normal');
      }
      if (finalResult.stderr) {
        this.appendOutputLine(finalResult.stderr, 'error');
      }
    }

    return finalResult;
  }

  splitPipeline(str) {
    let parts = [];
    let cur = '';
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < str.length; i++) {
      let char = str[i];
      if (char === "'" && !inDouble) {
        inSingle = !inSingle;
        cur += char;
      } else if (char === '"' && !inSingle) {
        inDouble = !inDouble;
        cur += char;
      } else if (char === '|' && !inSingle && !inDouble) {
        parts.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    if (cur.trim().length > 0) {
      parts.push(cur);
    }
    return parts;
  }

  executeStageWithRedirection(stageCmd, stdinText = '') {
    let outTarget = null;
    let outAppend = false;
    let errTarget = null;
    let errAppend = false;
    let inTarget = null;

    let tokens = this.tokenizeArgs(stageCmd);
    let filteredTokens = [];

    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i];

      if (t === '2>') {
        errTarget = (tokens[++i] || '').replace(/^['"]|['"]$/g, '').trim();
        errAppend = false;
      } else if (t === '2>>') {
        errTarget = (tokens[++i] || '').replace(/^['"]|['"]$/g, '').trim();
        errAppend = true;
      } else if (t === '&>') {
        outTarget = (tokens[++i] || '').replace(/^['"]|['"]$/g, '').trim();
        errTarget = outTarget;
      } else if (t === '>>') {
        outTarget = (tokens[++i] || '').replace(/^['"]|['"]$/g, '').trim();
        outAppend = true;
      } else if (t === '>') {
        outTarget = (tokens[++i] || '').replace(/^['"]|['"]$/g, '').trim();
        outAppend = false;
      } else if (t === '<') {
        inTarget = (tokens[++i] || '').replace(/^['"]|['"]$/g, '').trim();
      } else if (t.startsWith('2>')) {
        errTarget = t.slice(2).replace(/^['"]|['"]$/g, '').trim();
        errAppend = false;
      } else if (t.startsWith('>>')) {
        outTarget = t.slice(2).replace(/^['"]|['"]$/g, '').trim();
        outAppend = true;
      } else if (t.startsWith('>')) {
        outTarget = t.slice(1).replace(/^['"]|['"]$/g, '').trim();
        outAppend = false;
      } else if (t.startsWith('<')) {
        inTarget = t.slice(1).replace(/^['"]|['"]$/g, '').trim();
      } else {
        filteredTokens.push(t);
      }
    }

    if (filteredTokens.length === 0) {
      return { code: 0, stdout: '', stderr: '' };
    }

    // Strip command-scoped environment variable assignments (e.g. LC_ALL=C sort ...)
    while (filteredTokens.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(filteredTokens[0])) {
      filteredTokens.shift();
    }

    if (filteredTokens.length === 0) {
      return { code: 0, stdout: '', stderr: '' };
    }

    if (inTarget) {
      try {
        stdinText = this.vfs.readFile(inTarget);
      } catch (err) {
        let errMsg = `bash: ${inTarget}: No such file or directory`;
        if (errTarget) {
          this.writeRedirectFile(errTarget, errMsg, errAppend);
          return { code: 1, stdout: '', stderr: '' };
        }
        return { code: 1, stdout: '', stderr: errMsg };
      }
    }

    let res = this.dispatchCommand(filteredTokens, stdinText, { outTarget, outAppend });

    if (outTarget) {
      try {
        this.writeRedirectFile(outTarget, res.stdout, outAppend);
        res.stdout = '';
      } catch (e) {
        res.stderr = `bash: ${outTarget}: ${e.message}`;
        res.code = 1;
      }
    }

    if (errTarget) {
      try {
        if (res.stderr) {
          this.writeRedirectFile(errTarget, res.stderr, errAppend);
          res.stderr = '';
        } else {
          this.vfs.createFile(errTarget, '', false);
        }
      } catch (e) {
        res.stderr = `bash: ${errTarget}: ${e.message}`;
      }
    }

    return res;
  }

  writeRedirectFile(targetPath, text, isAppend = false) {
    targetPath = (targetPath || '').trim();
    if (isAppend) {
      this.vfs.appendFile(targetPath, text);
    } else {
      this.vfs.createFile(targetPath, text, true);
    }
    window.dispatchEvent(new CustomEvent('osquest_vfs_changed'));
  }

  tokenizeArgs(cmdStr) {
    let tokens = [];
    let cur = '';
    let inQuote = null;

    for (let i = 0; i < cmdStr.length; i++) {
      let char = cmdStr[i];

      if (char === '"' || char === "'") {
        if (!inQuote) {
          inQuote = char;
        } else if (inQuote === char) {
          inQuote = null;
        } else {
          cur += char;
        }
      } else if (/\s/.test(char) && !inQuote) {
        if (cur.length > 0) {
          tokens.push(cur);
          cur = '';
        }
      } else {
        cur += char;
      }
    }
    if (cur.length > 0) {
      tokens.push(cur);
    }
    return tokens;
  }

  // =========================================================================
  // Built-in Command Handlers
  // =========================================================================
  dispatchCommand(tokens, stdinText, redirectMeta) {
    let cmd = tokens[0];
    let args = tokens.slice(1);

    if (cmd === 'sudo') {
      if (args.length === 0) {
        return { code: 1, stdout: '', stderr: 'usage: sudo command' };
      }
      cmd = args[0];
      args = args.slice(1);
    }

    switch (cmd) {
      case 'pwd':
        return { code: 0, stdout: this.vfs.currentPath, stderr: '' };

      case 'cd':
        return this.cmdCd(args);

      case 'ls':
        return this.cmdLs(args);

      case 'mkdir':
        return this.cmdMkdir(args);

      case 'cat':
        return this.cmdCat(args, stdinText, redirectMeta);

      case 'echo':
        return this.cmdEcho(args);

      case 'file':
        return this.cmdFile(args);

      case 'grep':
        return this.cmdGrep(args, stdinText);

      case 'sort':
        return this.cmdSort(args, stdinText);

      case 'wc':
        return this.cmdWc(args, stdinText);

      case 'uniq':
        return this.cmdUniq(args, stdinText);

      case 'tee':
        return this.cmdTee(args, stdinText);

      case 'touch':
        return this.cmdTouch(args);

      case 'rm':
        return this.cmdRm(args);

      case 'ps':
        return this.cmdPs(args);

      case 'top':
        this.openTopScreen();
        return { code: 0, stdout: '', stderr: '' };

      case 'nano': {
        let targetFile = args[0] || 'untitled.txt';
        this.openNano(targetFile);
        return { code: 0, stdout: '', stderr: '' };
      }

      case 'systemctl':
        return this.cmdSystemctl(args);

      case 'kill':
      case 'pkill':
        return this.cmdKill(cmd, args);

      case 'ifconfig':
      case 'ip':
        return this.cmdIfconfig(args);

      case 'apt':
      case 'apt-get':
        return this.cmdApt(args);

      case 'clear':
        this.clearScreen();
        return { code: 0, stdout: '', stderr: '' };

      case 'history':
        return { code: 0, stdout: this.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n'), stderr: '' };

      default:
        return { code: 127, stdout: '', stderr: `bash: ${cmd}: command not found` };
    }
  }

  cmdCd(args) {
    let target = args[0] || '~';
    try {
      this.vfs.cd(target);
      return { code: 0, stdout: '', stderr: '' };
    } catch (e) {
      return { code: 1, stdout: '', stderr: e.message };
    }
  }

  cmdLs(args) {
    let showAll = false;
    let longFormat = false;
    let paths = [];

    for (let arg of args) {
      if (arg.startsWith('-')) {
        if (arg.includes('a')) showAll = true;
        if (arg.includes('l')) longFormat = true;
      } else {
        paths.push(arg);
      }
    }

    let targetPath = paths[0] || '.';
    try {
      let entries = this.vfs.listDir(targetPath);
      if (!showAll) {
        entries = entries.filter(e => !e.name.startsWith('.'));
      }

      if (entries.length === 0) {
        return { code: 0, stdout: '', stderr: '' };
      }

      if (longFormat) {
        let lines = [`total ${entries.length * 4}`];
        for (let item of entries) {
          let size = item.type === 'file' ? (item.content ? item.content.length : 0) : 4096;
          let dateStr = "Oct 29 13:20";
          lines.push(`${item.permissions} 1 praktikan praktikan ${size.toString().padStart(5, ' ')} ${dateStr} ${item.name}`);
        }
        return { code: 0, stdout: lines.join('\n'), stderr: '' };
      } else {
        let names = entries.map(e => e.name);
        return { code: 0, stdout: names.join('  '), stderr: '' };
      }
    } catch (e) {
      return { code: 2, stdout: '', stderr: e.message };
    }
  }

  cmdMkdir(args) {
    let recursive = false;
    let dirs = [];

    for (let arg of args) {
      if (arg === '-p') {
        recursive = true;
      } else {
        dirs.push(arg);
      }
    }

    if (dirs.length === 0) {
      return { code: 1, stdout: '', stderr: 'mkdir: missing operand' };
    }

    try {
      for (let dir of dirs) {
        this.vfs.mkdir(dir, recursive);
      }
      window.dispatchEvent(new CustomEvent('osquest_vfs_changed'));
      return { code: 0, stdout: '', stderr: '' };
    } catch (e) {
      return { code: 1, stdout: '', stderr: e.message };
    }
  }

  cmdCat(args, stdinText, redirectMeta) {
    if (redirectMeta && redirectMeta.outTarget && args.length === 0 && !stdinText) {
      this.startMultilineCapture(redirectMeta.outTarget, redirectMeta.outAppend ? 'append' : 'overwrite');
      return { code: 0, stdout: '', stderr: '' };
    }

    if (args.length === 0) {
      return { code: 0, stdout: stdinText || '', stderr: '' };
    }

    let out = [];
    for (let f of args) {
      try {
        out.push(this.vfs.readFile(f));
      } catch (e) {
        return { code: 1, stdout: '', stderr: e.message };
      }
    }

    return { code: 0, stdout: out.join('\n'), stderr: '' };
  }

  cmdEcho(args) {
    let text = args.join(' ');
    text = text.replace(/\$\?/g, this.state.lastExitCode.toString());
    return { code: 0, stdout: text, stderr: '' };
  }

  cmdFile(args) {
    if (args.length === 0) {
      return { code: 1, stdout: '', stderr: 'file: missing argument' };
    }
    let target = args[0];
    let node = this.vfs.getNode(target);
    if (!node) {
      return { code: 1, stdout: `${target}: cannot open: No such file or directory`, stderr: '' };
    }
    if (node.type === 'dir') {
      return { code: 0, stdout: `${target}: directory`, stderr: '' };
    }
    return { code: 0, stdout: `${target}: ASCII text`, stderr: '' };
  }

  cmdGrep(args, stdinText) {
    let ignoreCase = false;
    let invertMatch = false;
    let countOnly = false;
    let pattern = null;
    let filePath = null;

    for (let arg of args) {
      if (arg === '-i') ignoreCase = true;
      else if (arg === '-v') invertMatch = true;
      else if (arg === '-c') countOnly = true;
      else if (arg.startsWith('-') && arg.includes('c')) countOnly = true;
      else if (arg.startsWith('-') && arg.includes('i')) ignoreCase = true;
      else if (!pattern && !arg.startsWith('-')) pattern = arg.replace(/^['"]|['"]$/g, '');
      else if (!filePath && !arg.startsWith('-')) filePath = arg.replace(/^['"]|['"]$/g, '');
    }

    if (!pattern) {
      return { code: 2, stdout: '', stderr: 'grep: missing pattern' };
    }

    let content = stdinText;
    if (filePath) {
      try {
        content = this.vfs.readFile(filePath);
      } catch (e) {
        return { code: 2, stdout: '', stderr: e.message };
      }
    }

    let lines = content.split('\n');
    let matched = lines.filter(line => {
      let l = ignoreCase ? line.toLowerCase() : line;
      let p = ignoreCase ? pattern.toLowerCase() : pattern;
      let has = l.includes(p);
      return invertMatch ? !has : has;
    });

    if (countOnly) {
      return {
        code: 0,
        stdout: matched.length.toString(),
        stderr: ''
      };
    }

    return {
      code: matched.length > 0 ? 0 : 1,
      stdout: matched.join('\n'),
      stderr: ''
    };
  }

  cmdSort(args, stdinText) {
    let reverse = false;
    let numeric = false;
    let unique = false;
    let delimiter = null;
    let keyField = null;
    let filePath = null;

    for (let i = 0; i < args.length; i++) {
      let a = args[i];
      if (a === '-r') {
        reverse = true;
      } else if (a === '-n') {
        numeric = true;
      } else if (a === '-u') {
        unique = true;
      } else if (a === '-t') {
        delimiter = args[++i];
        if (delimiter) delimiter = delimiter.replace(/^['"]|['"]$/g, '');
      } else if (a.startsWith('-t')) {
        delimiter = a.slice(2).replace(/^['"]|['"]$/g, '');
      } else if (a === '-k') {
        let kStr = args[++i] || '1';
        let kMatch = kStr.match(/(\d+)/);
        keyField = kMatch ? parseInt(kMatch[1]) : 1;
      } else if (a.startsWith('-k')) {
        let kMatch = a.slice(2).match(/(\d+)/);
        keyField = kMatch ? parseInt(kMatch[1]) : 1;
      } else if (!a.startsWith('-')) {
        filePath = a;
      }
    }

    let content = stdinText;
    if (filePath) {
      try {
        content = this.vfs.readFile(filePath);
      } catch (e) {
        return { code: 2, stdout: '', stderr: e.message };
      }
    }

    let lines = content.split('\n').filter(l => l.trim().length > 0);
    lines.sort((a, b) => {
      let compA = a;
      let compB = b;
      if (delimiter && keyField) {
        let partsA = a.split(delimiter);
        let partsB = b.split(delimiter);
        compA = partsA[keyField - 1] !== undefined ? partsA[keyField - 1] : a;
        compB = partsB[keyField - 1] !== undefined ? partsB[keyField - 1] : b;
      }
      if (numeric) {
        let na = parseFloat(compA) || 0;
        let nb = parseFloat(compB) || 0;
        return reverse ? nb - na : na - nb;
      }
      return reverse ? compB.localeCompare(compA) : compA.localeCompare(compB);
    });

    if (unique) {
      lines = Array.from(new Set(lines));
    }

    return { code: 0, stdout: lines.join('\n'), stderr: '' };
  }

  cmdUniq(args, stdinText) {
    let count = args.includes('-c');
    let filePath = args.find(a => !a.startsWith('-'));

    let content = stdinText;
    if (filePath) {
      try {
        content = this.vfs.readFile(filePath);
      } catch (e) {
        return { code: 1, stdout: '', stderr: e.message };
      }
    }

    let lines = content.split('\n').filter(l => l.trim().length > 0);
    let result = [];

    for (let i = 0; i < lines.length; i++) {
      if (i === 0 || lines[i] !== lines[i - 1]) {
        result.push(lines[i]);
      }
    }

    return { code: 0, stdout: result.join('\n'), stderr: '' };
  }

  cmdWc(args, stdinText) {
    let countLines = args.includes('-l');
    let countWords = args.includes('-w');
    let countChars = args.includes('-c') || args.includes('-m');

    let filePath = args.find(a => !a.startsWith('-'));
    let content = stdinText;
    if (filePath) {
      try {
        content = this.vfs.readFile(filePath);
      } catch (e) {
        return { code: 1, stdout: '', stderr: e.message };
      }
    }

    let lines = content.split('\n').filter(l => l.length > 0);
    let words = content.trim().split(/\s+/).filter(w => w.length > 0);
    let chars = content.length;

    let defaultAll = !countLines && !countWords && !countChars;
    let parts = [];

    if (defaultAll || countLines) parts.push(lines.length.toString());
    if (defaultAll || countWords) parts.push(words.length.toString());
    if (defaultAll || countChars) parts.push(chars.toString());

    if (filePath) parts.push(filePath);

    return { code: 0, stdout: parts.join(' '), stderr: '' };
  }

  cmdTee(args, stdinText) {
    let isAppend = args.includes('-a');
    let files = args.filter(a => a !== '-a');

    for (let f of files) {
      this.writeRedirectFile(f, stdinText, isAppend);
    }
    return { code: 0, stdout: stdinText, stderr: '' };
  }

  cmdTouch(args) {
    if (args.length === 0) {
      return { code: 1, stdout: '', stderr: 'touch: missing file operand' };
    }
    for (let f of args) {
      this.vfs.createFile(f, '', false);
    }
    window.dispatchEvent(new CustomEvent('osquest_vfs_changed'));
    return { code: 0, stdout: '', stderr: '' };
  }

  cmdRm(args) {
    let recursive = args.includes('-r') || args.includes('-rf') || args.includes('-R');
    let files = args.filter(a => !a.startsWith('-'));
    if (files.length === 0) {
      return { code: 1, stdout: '', stderr: 'rm: missing operand' };
    }

    try {
      for (let f of files) {
        this.vfs.rm(f, recursive);
      }
      window.dispatchEvent(new CustomEvent('osquest_vfs_changed'));
      return { code: 0, stdout: '', stderr: '' };
    } catch (e) {
      return { code: 1, stdout: '', stderr: e.message };
    }
  }

  cmdPs(args) {
    let showThreads = args.includes('-T');
    let pidFilter = null;

    let pIdx = args.indexOf('-p');
    if (pIdx !== -1 && args[pIdx + 1]) {
      let pVal = args[pIdx + 1].replace(/["']/g, '');
      if (pVal === '$$' || pVal === '2045') {
        pidFilter = 2045;
      } else {
        pidFilter = parseInt(pVal) || null;
      }
    }

    let rows = [
      { pid: 1, spid: 1, tty: '?', time: '00:00:02', cmd: 'systemd' },
      { pid: 840, spid: 840, tty: '?', time: '00:00:00', cmd: 'systemd-journald' },
      { pid: 2045, spid: 2045, tty: 'pts/0', time: '00:00:00', cmd: 'bash' }
    ];

    if (showThreads) {
      rows.push({ pid: 2045, spid: 2046, tty: 'pts/0', time: '00:00:00', cmd: 'bash (worker)' });
    }

    if (this.state.apacheRunning) {
      rows.push({ pid: 1420, spid: 1420, tty: '?', time: '00:00:01', cmd: 'apache2' });
      if (showThreads) {
        rows.push({ pid: 1420, spid: 1421, tty: '?', time: '00:00:00', cmd: 'apache2 (thread worker)' });
        rows.push({ pid: 1420, spid: 1422, tty: '?', time: '00:00:00', cmd: 'apache2 (thread worker)' });
      }
    }

    for (let job of this.backgroundJobs) {
      rows.push({ pid: job.pid, spid: job.pid, tty: 'pts/0', time: '00:00:00', cmd: job.cmd });
    }

    rows.push({ pid: 2105, spid: 2105, tty: 'pts/0', time: '00:00:00', cmd: 'ps' });

    if (pidFilter) {
      rows = rows.filter(r => r.pid === pidFilter);
    }

    if (showThreads) {
      let header = '    PID    SPID TTY          TIME CMD';
      let lines = rows.map(r => `${r.pid.toString().padStart(7, ' ')} ${r.spid.toString().padStart(7, ' ')} ${r.tty.padEnd(12, ' ')} ${r.time} ${r.cmd}`);
      return { code: 0, stdout: [header, ...lines].join('\n'), stderr: '' };
    } else {
      let header = '    PID TTY          TIME CMD';
      let lines = rows.map(r => `${r.pid.toString().padStart(7, ' ')} ${r.tty.padEnd(12, ' ')} ${r.time} ${r.cmd}`);
      return { code: 0, stdout: [header, ...lines].join('\n'), stderr: '' };
    }
  }

  cmdSystemctl(args) {
    let action = args[0];
    let service = args[1];

    if (service !== 'apache2') {
      return { code: 1, stdout: '', stderr: `Failed to ${action} ${service}: Unit ${service}.service not found.` };
    }

    if (action === 'status') {
      if (this.state.apacheRunning) {
        return {
          code: 0,
          stdout: `● apache2.service - The Apache HTTP Server
     Loaded: loaded (/lib/systemd/system/apache2.service; enabled; vendor preset: enabled)
     Active: active (running) since Thu 2026-10-29 13:20:00 WIB
   Main PID: 1420 (apache2)
      Tasks: 3 (limit: 9345)
     Memory: 18.2M
        CPU: 145ms
     CGroup: /system.slice/apache2.service
             ├─1420 /usr/sbin/apache2 -k start
             ├─1421 /usr/sbin/apache2 -k start
             └─1422 /usr/sbin/apache2 -k start`,
          stderr: ''
        };
      } else {
        return {
          code: 3,
          stdout: `● apache2.service - The Apache HTTP Server
     Loaded: loaded (/lib/systemd/system/apache2.service; enabled; vendor preset: enabled)
     Active: inactive (dead) since Thu 2026-10-29 13:21:00 WIB`,
          stderr: ''
        };
      }
    } else if (action === 'start') {
      this.state.apacheRunning = true;
      this.updateApacheBadge();
      return { code: 0, stdout: '', stderr: '' };
    } else if (action === 'stop') {
      this.state.apacheRunning = false;
      this.updateApacheBadge();
      return { code: 0, stdout: '', stderr: '' };
    } else if (action === 'restart') {
      this.state.apacheRunning = true;
      this.updateApacheBadge();
      return { code: 0, stdout: '', stderr: '' };
    }

    return { code: 1, stdout: '', stderr: `Unknown operation ${action}` };
  }

  cmdKill(type, args) {
    if (args.length === 0) {
      return { code: 1, stdout: '', stderr: `${type}: missing argument` };
    }
    let target = args[0];
    if (target === 'apache2' || target === '1420') {
      this.state.apacheRunning = false;
      this.updateApacheBadge();
      return { code: 0, stdout: `[1]+  Terminated              apache2`, stderr: '' };
    }
    return { code: 1, stdout: '', stderr: `${type}: (${target}) - No such process` };
  }

  cmdIfconfig(args) {
    return {
      code: 0,
      stdout: `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.50  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe8e:4c89  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:8e:4c:89  txqueuelen 1000  (Ethernet)
        RX packets 24194  bytes 18349210 (18.3 MB)
        TX packets 15092  bytes 1290342 (1.2 MB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 120  bytes 8400 (8.4 KB)`,
      stderr: ''
    };
  }

  cmdApt(args) {
    if (args.includes('update')) {
      return {
        code: 0,
        stdout: `Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease
Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]
Get:3 http://archive.ubuntu.com/ubuntu jammy-security InRelease [110 kB]
Fetched 229 kB in 1s (229 kB/s)
Reading package lists... Done
Building dependency tree... Done
All packages are up to date.`,
        stderr: ''
      };
    }
    if (args.includes('install')) {
      let pkg = args.filter(a => a !== 'install' && !a.startsWith('-'))[0] || 'net-tools';
      if (pkg === 'apache2') {
        this.state.apacheInstalled = true;
        this.state.apacheRunning = true;
        this.updateApacheBadge();
      }
      return {
        code: 0,
        stdout: `Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following NEW packages will be installed:
  ${pkg}
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Setting up ${pkg} ... Done`,
        stderr: ''
      };
    }
    return { code: 0, stdout: 'Reading package lists... Done', stderr: '' };
  }

  updateApacheBadge() {
    let pill = document.getElementById('apacheStatusPill');
    if (pill) {
      if (this.state.apacheRunning) {
        pill.textContent = 'Active (Running)';
        pill.className = 'green-text';
      } else {
        pill.textContent = 'Stopped';
        pill.className = 'text-amber';
      }
    }
  }
}

window.TerminalEngine = TerminalEngine;
