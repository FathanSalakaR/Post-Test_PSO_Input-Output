/**
 * OS-QUEST Main Application Controller
 * Laboratorium Teknik Digital - Post-Test Sistem Operasi
 * Handles: Login Gate, class passcodes, sequential levels,
 * 25-min timer, hint penalty, asprak portal w/ bar chart, CSV/Excel export.
 */

// Default class passcodes (asprak can change via portal)
const DEFAULT_CLASS_CODES = {
  'PSO A': 'LTD-A26',
  'PSO B': 'LTD-B26',
  'PSO C': 'LTD-C26',
  'PSO D': 'LTD-D26',
  'PSO E': 'LTD-E26'
};
const ASPRAK_MASTER_PIN = 'asprak2026';
// Webhook default untuk Google Sheets (dapat diubah melalui Portal Asprak)
const DEFAULT_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwsYhSXrbdK41ta3ySUVVe2-HUd4fGPvk7D75jhaAogg2niAlax9Oh83gOf0qMWAt2J/exec';

class SoundEffects {
  constructor() {
    this.enabled = localStorage.getItem('osquest_sound_enabled') !== 'false';
    this.ctx = null;
    this.updateIcon();
  }

  initContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('osquest_sound_enabled', this.enabled.toString());
    this.updateIcon();
    if (this.enabled) {
      this.playSuccessTone();
    }
  }

  updateIcon() {
    let onIcon = document.getElementById('soundIconOn');
    let offIcon = document.getElementById('soundIconOff');
    if (onIcon && offIcon) {
      if (this.enabled) {
        onIcon.classList.remove('hidden');
        offIcon.classList.add('hidden');
      } else {
        onIcon.classList.add('hidden');
        offIcon.classList.remove('hidden');
      }
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      let osc = this.ctx.createOscillator();
      let gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playObjectiveDone() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.1, 0.12);
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.12), 80);
    setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.15), 160);
  }

  playLevelVictory() {
    if (!this.enabled) return;
    let notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.25, 0.18), i * 120);
    });
  }

  playPenaltyWarning() {
    if (!this.enabled) return;
    this.playTone(330, 'sawtooth', 0.15, 0.12);
    setTimeout(() => this.playTone(261.63, 'sawtooth', 0.25, 0.15), 120);
  }

  playSuccessTone() { this.playTone(880, 'sine', 0.08, 0.08); }
  playErrorTone() { this.playTone(220, 'sawtooth', 0.25, 0.15); }
}

class AppController {
  constructor() {
    this.sound = new SoundEffects();
    this.vfs = window.vfs;
    this.quest = window.questManager;
    this.terminal = null; // Created after login

    this.student = { name: '', npm: '', class: '' };
    this.timerSeconds = 25 * 60;
    this.timerInterval = null;
    this.isAsprakAuthenticated = false;

    // Load class codes from localStorage or use defaults
    this.classCodes = this._loadClassCodes();

    // Start on login screen
    this._listenersInitialized = false;
    this._initLoginScreen();
    this.initEventListeners();
  }

  // ============================================================
  // Class Passcode Management
  // ============================================================
  _loadClassCodes() {
    try {
      const saved = localStorage.getItem('ltd_class_codes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return Object.assign({}, DEFAULT_CLASS_CODES);
  }

  _saveClassCodes(codes) {
    this.classCodes = codes;
    localStorage.setItem('ltd_class_codes', JSON.stringify(codes));
  }

  // ============================================================
  // LOGIN SCREEN
  // ============================================================
  _initLoginScreen() {
    const loginView = document.getElementById('viewLoginScreen');
    const workspaceView = document.getElementById('viewWorkspace');
    if (loginView) loginView.classList.remove('hidden');
    if (workspaceView) workspaceView.classList.add('hidden');

    const form = document.getElementById('formPracticalLogin');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this._handleLogin(); });

    const btnAsprakLogin = document.getElementById('btnOpenAsprakFromLogin');
    if (btnAsprakLogin) btnAsprakLogin.addEventListener('click', () => this.openAsprakPortal());
  }

  _handleLogin() {
    const nameEl = document.getElementById('loginName');
    const npmEl = document.getElementById('loginNPM');
    const classEl = document.getElementById('loginClass');
    const codeEl = document.getElementById('loginTestCode');
    const errEl = document.getElementById('loginErrorMessage');

    const name = nameEl ? nameEl.value.trim() : '';
    const npm = npmEl ? npmEl.value.trim() : '';
    const kelas = classEl ? classEl.value : 'PSO A';
    const codeInput = codeEl ? codeEl.value.trim().toUpperCase() : '';

    if (!name || !npm) {
      if (errEl) { errEl.textContent = 'Nama lengkap dan NPM wajib diisi!'; errEl.classList.remove('hidden'); }
      return;
    }

    const expectedCode = (this.classCodes[kelas] || '').toUpperCase();
    if (codeInput !== expectedCode) {
      if (errEl) { errEl.textContent = 'Kode akses post-test tidak sesuai untuk kelas yang dipilih!'; errEl.classList.remove('hidden'); }
      this.sound.playErrorTone ? this.sound.playErrorTone() : this.sound.playTone(220, 'sawtooth', 0.25, 0.15);
      return;
    }

    const prevNpm = localStorage.getItem('osquest_student_npm');
    const prevName = localStorage.getItem('osquest_student_name');
    const isDifferentUser = !prevNpm || prevNpm !== npm || prevName !== name;

    this.student = { name, npm, class: kelas };
    localStorage.setItem('osquest_student_name', name);
    localStorage.setItem('osquest_student_npm', npm);
    localStorage.setItem('osquest_student_class', kelas);
    if (errEl) errEl.classList.add('hidden');

    if (isDifferentUser) {
      // Jika orang baru yang login, bersihkan seluruh progress dan mulai ujian baru dari nol
      this.quest.resetAll();
      this.vfs.initDefaultStructure();
      if (this.terminal) {
        this.terminal.clearScreen();
        this.terminal.history = [];
        this.terminal.historyIndex = -1;
        this.terminal.activeMultilineSession = null;
        this.terminal.activeNanoSession = null;
      }
      this.timerSeconds = 25 * 60;
    }

    this._enterWorkspace();
  }

  _enterWorkspace() {
    const loginView = document.getElementById('viewLoginScreen');
    const workspaceView = document.getElementById('viewWorkspace');
    if (loginView) loginView.classList.add('hidden');
    if (workspaceView) workspaceView.classList.remove('hidden');

    if (!this.terminal) {
      this.terminal = new window.TerminalEngine(this.vfs, this.quest);
    } else {
      this.terminal.updatePromptDisplay();
    }

    this.updateStudentHeader();
    this.startTimer();
    this.renderLevelMap();
    this.renderCurrentMission();
    this.renderFileTree();
    this.updateHeaderStats();
    this.syncAsprakRecord();
    this.sound.playSuccessTone();
  }

  _logoutToLogin() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const loginView = document.getElementById('viewLoginScreen');
    const workspaceView = document.getElementById('viewWorkspace');
    if (loginView) loginView.classList.remove('hidden');
    if (workspaceView) workspaceView.classList.add('hidden');
    ['loginName','loginNPM','loginTestCode'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const errEl = document.getElementById('loginErrorMessage');
    if (errEl) errEl.classList.add('hidden');

    if (this.terminal) {
      if (this.terminal.activeMultilineSession) {
        if (this.terminal.multilineBoxEl) this.terminal.multilineBoxEl.classList.add('hidden');
        this.terminal.activeMultilineSession = null;
      }
      if (this.terminal.activeNanoSession) {
        this.terminal.closeNanoView();
      }
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.updateTimerDisplay();
        if (this.timerSeconds === 300) { // 5 minutes warning
          this.sound.playPenaltyWarning();
        }
      } else {
        clearInterval(this.timerInterval);
        this.sound.playPenaltyWarning();
        alert("Waktu pengerjaan 25 menit untuk level ini telah selesai! Silakan tunjukkan hasil pengerjaan kepada asisten praktikum.");
      }
    }, 1000);
  }

  updateTimerDisplay() {
    let el = document.getElementById('displayTimer');
    if (!el) return;
    let m = Math.floor(this.timerSeconds / 60);
    let s = this.timerSeconds % 60;
    el.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  initEventListeners() {
    if (this._listenersInitialized) return;
    this._listenersInitialized = true;

    // Sound toggle
    const btnSound = document.getElementById('btnToggleSound');
    if (btnSound) btnSound.addEventListener('click', () => this.sound.toggle());

    // Logout to login screen
    const btnLogout = document.getElementById('btnLogoutStudent');
    if (btnLogout) btnLogout.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin keluar dari sesi ujian?\nProgress pengerjaan akan tersimpan.')) this._logoutToLogin();
    });

    // Student profile modal
    const profileBtn = document.getElementById('studentProfileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        let nameIn = document.getElementById('inputStudentName');
        let npmIn = document.getElementById('inputStudentNPM');
        let classIn = document.getElementById('inputStudentClass');
        if (nameIn) nameIn.value = this.student.name === 'Praktikan Tamu' ? '' : this.student.name;
        if (npmIn) npmIn.value = this.student.npm;
        if (classIn) classIn.value = this.student.class || 'PSO A';
        this.openModal('modalStudentProfile');
      });
    }

    const closeProfile = document.getElementById('closeProfileModal');
    if (closeProfile) closeProfile.addEventListener('click', () => this.closeModal('modalStudentProfile'));

    const formProfile = document.getElementById('formStudentProfile');
    if (formProfile) {
      formProfile.addEventListener('submit', (e) => {
        e.preventDefault();
        let nameIn = document.getElementById('inputStudentName');
        let npmIn = document.getElementById('inputStudentNPM');
        let classIn = document.getElementById('inputStudentClass');

        this.student.name = nameIn ? nameIn.value.trim() || 'Praktikan Tamu' : 'Praktikan Tamu';
        this.student.npm = npmIn ? npmIn.value.trim() : '';
        this.student.class = classIn ? classIn.value : 'PSO A';

        localStorage.setItem('osquest_student_name', this.student.name);
        localStorage.setItem('osquest_student_npm', this.student.npm);
        localStorage.setItem('osquest_student_class', this.student.class);

        this.updateStudentHeader();
        this.syncAsprakRecord();
        this.closeModal('modalStudentProfile');
        this.sound.playSuccessTone();
      });
    }

    // Virtual Browser modal
    const btnBrowser = document.getElementById('btnOpenBrowser');
    if (btnBrowser) {
      btnBrowser.addEventListener('click', () => {
        this.renderVirtualBrowser();
        this.openModal('modalVirtualBrowser');
      });
    }
    const closeBrowser = document.getElementById('closeBrowserModal');
    if (closeBrowser) closeBrowser.addEventListener('click', () => this.closeModal('modalVirtualBrowser'));

    const btnReload = document.getElementById('btnBrowserReload');
    if (btnReload) btnReload.addEventListener('click', () => this.renderVirtualBrowser());

    // Portal Asprak modal & Auth
    const btnAsprak = document.getElementById('btnOpenAsprak');
    if (btnAsprak) {
      btnAsprak.addEventListener('click', () => this.openAsprakPortal());
    }
    const closeAsprak = document.getElementById('closeAsprakModal');
    if (closeAsprak) closeAsprak.addEventListener('click', () => this.closeModal('modalAsprakPortal'));

    const btnPin = document.getElementById('btnSubmitAsprakPin');
    if (btnPin) btnPin.addEventListener('click', () => this.verifyAsprakPin());

    const inputPin = document.getElementById('inputAsprakPin');
    if (inputPin) {
      inputPin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.verifyAsprakPin();
      });
    }

    // Asprak Navigation Tabs
    const tabScores = document.getElementById('tabBtnScores');
    const tabCodes = document.getElementById('tabBtnCodes');
    const tabSheets = document.getElementById('tabBtnSheets');
    const paneScores = document.getElementById('paneScores');
    const paneCodes = document.getElementById('paneCodes');
    const paneSheets = document.getElementById('paneSheets');

    const switchAsprakTab = (activeTab, activePane) => {
      [tabScores, tabCodes, tabSheets].forEach(t => { if (t) t.classList.remove('active'); });
      [paneScores, paneCodes, paneSheets].forEach(p => { if (p) p.classList.add('hidden'); });
      if (activeTab) activeTab.classList.add('active');
      if (activePane) activePane.classList.remove('hidden');
    };

    if (tabScores) {
      tabScores.addEventListener('click', () => {
        switchAsprakTab(tabScores, paneScores);
        this.renderAsprakTable();
        this.renderBarChart();
      });
    }
    if (tabCodes) {
      tabCodes.addEventListener('click', () => {
        switchAsprakTab(tabCodes, paneCodes);
        this.renderClassCodeGrid();
      });
    }
    if (tabSheets) {
      tabSheets.addEventListener('click', () => {
        switchAsprakTab(tabSheets, paneSheets);
        this.updateSheetsTabDisplay();
      });
    }

    // Google Sheets Integration Handlers
    const btnSaveSheets = document.getElementById('btnSaveSheetsUrl');
    if (btnSaveSheets) {
      btnSaveSheets.addEventListener('click', () => this.saveSheetsWebhookUrl());
    }

    const btnTestSheets = document.getElementById('btnTestSheets');
    if (btnTestSheets) {
      btnTestSheets.addEventListener('click', () => this.testGoogleSheetsConnection());
    }

    const btnSyncAllSheets = document.getElementById('btnSyncAllToSheets');
    if (btnSyncAllSheets) {
      btnSyncAllSheets.addEventListener('click', () => this.syncAllRecordsToGoogleSheets());
    }

    const btnCopyCode = document.getElementById('btnCopyAppsScript');
    if (btnCopyCode) {
      btnCopyCode.addEventListener('click', () => {
        const snippetEl = document.getElementById('snippetAppsScript');
        if (snippetEl) {
          navigator.clipboard.writeText(snippetEl.textContent.trim()).then(() => {
            btnCopyCode.textContent = '✓ Kode Berhasil Disalin!';
            setTimeout(() => { btnCopyCode.textContent = '📋 Salin Kode Apps Script'; }, 2500);
          }).catch(() => {
            alert('Silakan salin kode secara manual dari kotak di bawah.');
          });
        }
      });
    }

    // Asprak Filters & Export buttons
    const filterClass = document.getElementById('filterAsprakClass');
    if (filterClass) {
      filterClass.addEventListener('change', () => {
        this.renderAsprakTable();
        this.renderBarChart();
      });
    }

    const searchStudent = document.getElementById('searchAsprakStudent');
    if (searchStudent) searchStudent.addEventListener('input', () => this.renderAsprakTable());

    const btnCsv = document.getElementById('btnExportCsv');
    if (btnCsv) btnCsv.addEventListener('click', () => this.exportAsprakCsv());

    const btnExcel = document.getElementById('btnExportExcel');
    if (btnExcel) btnExcel.addEventListener('click', () => this.exportAsprakExcel());

    const btnClearData = document.getElementById('btnClearAsprakData');
    if (btnClearData) {
      btnClearData.addEventListener('click', () => {
        if (confirm("Peringatan: Apakah Anda yakin ingin mengosongkan seluruh riwayat rekap nilai praktikan?")) {
          localStorage.removeItem('osquest_asprak_records');
          this.syncAsprakRecord();
          this.renderAsprakTable();
          this.renderBarChart();
          alert("Seluruh data rekap telah dibersihkan.");
        }
      });
    }

    // File viewer modal
    const closeFile = document.getElementById('closeFileViewer');
    if (closeFile) closeFile.addEventListener('click', () => this.closeModal('modalFileViewer'));

    // Refresh tree button
    const btnTree = document.getElementById('btnRefreshTree');
    if (btnTree) {
      btnTree.addEventListener('click', () => {
        this.renderFileTree();
        this.sound.playSuccessTone();
      });
    }

    // Hint Unlock Buttons
    const btnUnlockSingle = document.getElementById('btnUnlockSingleHint');
    if (btnUnlockSingle) {
      btnUnlockSingle.addEventListener('click', () => this.openHintConfirmModal('single'));
    }

    const btnUnlockAll = document.getElementById('btnUnlockAllHint');
    if (btnUnlockAll) {
      btnUnlockAll.addEventListener('click', () => this.openHintConfirmModal('all'));
    }

    const btnUpgradeAll = document.getElementById('btnUpgradeAllHint');
    if (btnUpgradeAll) {
      btnUpgradeAll.addEventListener('click', () => this.openHintConfirmModal('all'));
    }

    // Fallback for legacy btnUnlockHint if present
    const btnLegacyHint = document.getElementById('btnUnlockHint');
    if (btnLegacyHint) {
      btnLegacyHint.addEventListener('click', () => this.openHintConfirmModal('single'));
    }

    // Modal Radio Toggle Change
    const radioSingle = document.getElementById('radioOptSingle');
    const radioAll = document.getElementById('radioOptAll');
    if (radioSingle) {
      radioSingle.addEventListener('change', () => this._syncHintModalView());
    }
    if (radioAll) {
      radioAll.addEventListener('change', () => this._syncHintModalView());
    }

    const cardOptSingle = document.getElementById('cardOptSingleHint');
    const cardOptAll = document.getElementById('cardOptAllHint');
    if (cardOptSingle) {
      cardOptSingle.addEventListener('click', () => {
        if (radioSingle && !radioSingle.checked) {
          radioSingle.checked = true;
          this._syncHintModalView();
        }
      });
    }
    if (cardOptAll) {
      cardOptAll.addEventListener('click', () => {
        if (radioAll && !radioAll.checked) {
          radioAll.checked = true;
          this._syncHintModalView();
        }
      });
    }

    const btnCancelHint = document.getElementById('btnCancelHint');
    if (btnCancelHint) btnCancelHint.addEventListener('click', () => this.closeModal('modalConfirmHint'));

    const closeConfirmHint = document.getElementById('closeConfirmHintModal');
    if (closeConfirmHint) closeConfirmHint.addEventListener('click', () => this.closeModal('modalConfirmHint'));

    const btnProceedHint = document.getElementById('btnProceedHint');
    if (btnProceedHint) {
      btnProceedHint.addEventListener('click', () => this._proceedUnlockHint());
    }

    // Delegation for inline objective hint buttons
    const objListEl = document.getElementById('objectivesList');
    if (objListEl) {
      objListEl.addEventListener('click', (e) => {
        let btn = e.target.closest('.btn-obj-hint');
        if (btn && btn.dataset.objId) {
          this.openHintConfirmModal('single', btn.dataset.objId);
        }
      });
    }

    // Evaluation modal buttons
    const btnContinueWorking = document.getElementById('btnContinueWorking');
    if (btnContinueWorking) btnContinueWorking.addEventListener('click', () => this.closeModal('modalIncompleteObjectives'));
    const closeEvalModal = document.getElementById('closeEvalModal');
    if (closeEvalModal) closeEvalModal.addEventListener('click', () => this.closeModal('modalIncompleteObjectives'));

    // Manual validate button (Kumpulkan & Evaluasi)
    const btnVal = document.getElementById('btnManualValidate');
    if (btnVal) {
      btnVal.addEventListener('click', () => this.evaluateQuestState(true));
    }

    // Next level button on mission card
    const btnNext = document.getElementById('btnNextLevel');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (this.quest.advanceToNextLevel()) {
          this.onLevelSwitched();
        }
      });
    }

    // Celebration modal next button
    const btnModalNext = document.getElementById('btnProceedNextModal');
    if (btnModalNext) {
      btnModalNext.addEventListener('click', () => {
        this.closeModal('modalLevelComplete');
        if (this.quest.advanceToNextLevel()) {
          this.onLevelSwitched();
        } else {
          this.showFinalVictory();
        }
      });
    }

    const btnCert = document.getElementById('btnCloseCert');
    if (btnCert) btnCert.addEventListener('click', () => this.closeModal('modalFinalVictory'));

    // Reset Quest button
    const btnReset = document.getElementById('btnResetQuest');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm("Apakah Anda yakin ingin me-reset pengerjaan ujian dan mengulang timer?")) {
          this.quest.resetAll();
          this.vfs.initDefaultStructure();
          this.terminal.clearScreen();
          this.timerSeconds = 25 * 60;
          this.startTimer();
          this.onLevelSwitched();
          this.renderFileTree();
          this.syncAsprakRecord();
          alert("Ujian telah direset.");
        }
      });
    }

    // Engine Event Listeners
    window.addEventListener('osquest_command_executed', () => {
      this.evaluateQuestState(false);
      this.renderFileTree();
    });

    window.addEventListener('osquest_vfs_changed', () => {
      this.renderFileTree();
      this.evaluateQuestState(false);
    });
  }

  updateStudentHeader() {
    let nameEl = document.getElementById('displayStudentName');
    let npmEl = document.getElementById('displayStudentNPM');
    if (nameEl) nameEl.textContent = this.student.name;
    if (npmEl) {
      npmEl.textContent = this.student.npm 
        ? `NPM: ${this.student.npm} • ${this.student.class}` 
        : `NPM: Belum Diisi • ${this.student.class}`;
    }
  }

  updateHeaderStats() {
    let currentLvl = this.quest.getCurrentLevel();
    let lvlBadge = document.getElementById('currentLevelNumberBadge');
    if (lvlBadge) lvlBadge.textContent = currentLvl ? currentLvl.id : '1';
    
    let netScore = typeof this.quest.getNetScore === 'function' 
      ? this.quest.getNetScore() 
      : (typeof this.quest.getCumulativeScore === 'function' ? this.quest.getCumulativeScore() : 0);
    let scoreBadge = document.getElementById('totalScoreBadge');
    if (scoreBadge) scoreBadge.textContent = `${netScore} / 100`;

    let penaltyBadge = document.getElementById('penaltyScoreBadge');
    if (penaltyBadge) penaltyBadge.textContent = `-${this.quest.penaltyPoints || 0}`;

    let totalLvls = this.quest.levels ? this.quest.levels.length : 8;
    let completedCount = typeof this.quest.getCompletedLevelsCount === 'function' 
      ? this.quest.getCompletedLevelsCount() 
      : (this.quest.completedLevels ? this.quest.completedLevels.length : 0);
    let counterEl = document.getElementById('unlockedLevelCounter');
    if (counterEl) counterEl.textContent = `${completedCount} / ${totalLvls} Level Selesai`;
  }

  renderLevelMap() {
    let container = document.getElementById('levelPillsContainer');
    if (!container) return;
    container.innerHTML = '';

    this.quest.levels.forEach((lvl, idx) => {
      let isCompleted = this.quest.isLevelComplete(lvl.id);
      let isUnlocked = this.quest.isLevelUnlocked(lvl.id);
      let isActive = idx === this.quest.currentLevelIndex;

      let pill = document.createElement('div');
      const classes = ['level-pill'];
      if (isActive) classes.push('active');
      if (isCompleted) classes.push('completed');
      if (!isUnlocked) classes.push('locked');
      pill.className = classes.join(' ');
      pill.title = isUnlocked
        ? lvl.title + (isCompleted ? ' ✓ Selesai' : ' - Tersedia')
        : 'Level ' + lvl.id + ' — Terkunci. Selesaikan level sebelumnya.';

      if (isCompleted) {
        pill.innerHTML = '<span>✓</span>';
      } else if (!isUnlocked) {
        pill.innerHTML = '<span>🔒</span>';
      } else {
        pill.innerHTML = '<span>' + lvl.id + '</span>';
      }

      if (isUnlocked) {
        pill.style.cursor = 'pointer';
        pill.addEventListener('click', () => {
          this.quest.selectLevel(lvl.id);
          this.timerSeconds = 25 * 60;
          this.startTimer();
          this.onLevelSwitched();
        });
      } else {
        pill.style.cursor = 'not-allowed';
        pill.style.opacity = '0.4';
        pill.addEventListener('click', () => {
          alert('🔒 Level ini terkunci!\nSelesaikan level sebelumnya terlebih dahulu untuk membuka level ini.');
        });
      }

      container.appendChild(pill);
    });
  }

  renderCurrentMission() {
    let lvl = this.quest.getCurrentLevel();
    let isCompleted = this.quest.isLevelComplete(lvl.id);

    let titleEl = document.getElementById('missionTitle');
    let descEl = document.getElementById('missionDesc');
    let xpBadge = document.getElementById('missionXpBadge');

    if (titleEl) titleEl.textContent = lvl.title;
    if (descEl) {
      descEl.innerHTML = `
        <div style="background: rgba(0,0,0,0.3); border-left: 3px solid var(--ubuntu-orange); padding: 8px 12px; margin-bottom: 10px; border-radius: 4px;">
          <strong style="color: var(--ubuntu-orange);">Kasus:</strong> ${lvl.case}
        </div>
      `;
    }
    if (xpBadge) xpBadge.textContent = `${lvl.badge} • 100 Poin`;

    let statusChip = document.getElementById('missionStatusChip');
    let statusText = document.getElementById('missionStatusText');
    let btnNext = document.getElementById('btnNextLevel');

    if (statusChip && statusText) {
      if (isCompleted) {
        statusChip.style.background = 'rgba(16, 185, 129, 0.2)';
        statusChip.style.color = '#10B981';
        statusText.textContent = 'SELESAI ✓';
        if (btnNext) btnNext.classList.remove('hidden');
      } else {
        statusChip.style.background = 'rgba(233, 84, 32, 0.15)';
        statusChip.style.color = 'var(--ubuntu-orange)';
        statusText.textContent = 'LEVEL AKTIF';
        if (btnNext) btnNext.classList.add('hidden');
      }
    }

    // Render Objectives
    let listEl = document.getElementById('objectivesList');
    if (listEl) {
      listEl.innerHTML = '';
      let doneObjs = this.quest.completedObjectivesByLevel[lvl.id] || [];

      lvl.objectives.forEach(obj => {
        let isDone = doneObjs.includes(obj.id);
        let isHintUnlocked = this.quest.isObjectiveHintRevealed(lvl.id, obj.id);
        let li = document.createElement('li');
        li.className = `objective-item ${isDone ? 'done' : ''}`;
        li.id = `obj_${obj.id}`;

        let hintCalloutHtml = (isHintUnlocked && obj.hint) ? `
          <div class="obj-hint-callout">
            <span class="obj-hint-icon">💡</span>
            <div class="obj-hint-text"><strong>Petunjuk:</strong> <code>${this._escapeHtml(obj.hint)}</code></div>
          </div>
        ` : '';

        let hintBtnHtml = (!isHintUnlocked && !this.quest.isAllHintsRevealed(lvl.id) && obj.hint) ? `
          <button type="button" class="btn-obj-hint" data-obj-id="${obj.id}" title="Lihat petunjuk nomor ini (-20 Poin)">
            💡 Petunjuk (-20)
          </button>
        ` : '';

        li.innerHTML = `
          <div class="obj-checkbox">${isDone ? '✓' : ''}</div>
          <div class="obj-text">
            <div class="obj-title-row">
              <span>${obj.desc}</span>
              ${hintBtnHtml}
            </div>
            ${hintCalloutHtml}
          </div>
        `;
        listEl.appendChild(li);
      });
    }

    this.renderHintBox(lvl);
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderHintBox(lvl) {
    let isAllRevealed = this.quest.isAllHintsRevealed(lvl.id);
    let unlockedObjIds = this.quest.getUnlockedObjectivesInLevel(lvl.id);
    let btnGroup = document.getElementById('hintBtnGroup');
    let btnSingle = document.getElementById('btnUnlockSingleHint');
    let btnAll = document.getElementById('btnUnlockAllHint');
    let boxRevealed = document.getElementById('hintRevealedBox');
    let codeBlock = document.getElementById('hintCodeBlock');
    let btnUpgrade = document.getElementById('btnUpgradeAllHint');
    let revealedTitle = document.getElementById('hintRevealedTitle');
    let warningText = document.getElementById('hintWarningText');

    if (warningText) {
      warningText.innerHTML = `Petunjuk 1 Soal: <span class="text-danger font-bold">-20 Poin</span> &bull; Semua Petunjuk Level: <span class="text-danger font-bold">-30 Poin</span>`;
    }

    if (isAllRevealed) {
      if (btnGroup) btnGroup.classList.add('hidden');
      if (boxRevealed) boxRevealed.classList.remove('hidden');
      if (btnUpgrade) btnUpgrade.classList.add('hidden');
      if (revealedTitle) revealedTitle.textContent = `📖 Seluruh Petunjuk Level ${lvl.id} Terbuka (-30 Poin):`;
      if (codeBlock) codeBlock.textContent = lvl.hint;
    } else if (unlockedObjIds.length > 0) {
      if (btnGroup) btnGroup.classList.remove('hidden');
      if (boxRevealed) boxRevealed.classList.remove('hidden');
      if (btnUpgrade) {
        btnUpgrade.classList.remove('hidden');
        btnUpgrade.textContent = `🔓 Buka Semua Petunjuk (+10 Poin)`;
      }
      if (revealedTitle) revealedTitle.textContent = `📖 Petunjuk Terbuka (${unlockedObjIds.length} Soal):`;

      let hintTexts = [];
      lvl.objectives.forEach(obj => {
        if (unlockedObjIds.includes(obj.id)) {
          let cleanDesc = obj.desc.replace(/<[^>]*>/g, '');
          hintTexts.push(`• ${cleanDesc.split('.')[0] || 'Soal'}: ${obj.hint}`);
        }
      });
      if (codeBlock) codeBlock.textContent = hintTexts.join('\n');

      let btnSingleText = document.getElementById('btnUnlockSingleHintText');
      if (btnSingleText) btnSingleText.textContent = `Buka 1 Soal Lain (-20 Poin)`;
      let btnAllText = document.getElementById('btnUnlockAllHintText');
      if (btnAllText) btnAllText.textContent = `Buka Semua Petunjuk (+10 Poin)`;
    } else {
      if (btnGroup) btnGroup.classList.remove('hidden');
      if (boxRevealed) boxRevealed.classList.add('hidden');
      if (btnUpgrade) btnUpgrade.classList.add('hidden');
      if (codeBlock) codeBlock.textContent = '';
      let btnSingleText = document.getElementById('btnUnlockSingleHintText');
      if (btnSingleText) btnSingleText.textContent = `Buka 1 Soal Saja (-20 Poin)`;
      let btnAllText = document.getElementById('btnUnlockAllHintText');
      if (btnAllText) btnAllText.textContent = `Buka Semua Petunjuk Level Ini (-30 Poin)`;
    }
  }

  openHintConfirmModal(mode = 'single', targetObjId = null) {
    let curLvl = this.quest.getCurrentLevel();
    if (!curLvl) return;

    let sel = document.getElementById('modalSelectObjective');
    if (sel) {
      sel.innerHTML = '';
      curLvl.objectives.forEach((obj, idx) => {
        let isUnlocked = this.quest.isObjectiveHintRevealed(curLvl.id, obj.id);
        let opt = document.createElement('option');
        opt.value = obj.id;
        let cleanDesc = obj.desc.replace(/<[^>]*>/g, '');
        opt.textContent = `${cleanDesc.substring(0, 52)}${cleanDesc.length > 52 ? '...' : ''} ${isUnlocked ? '✓ (Terbuka)' : ''}`;
        if (isUnlocked) opt.disabled = true;
        sel.appendChild(opt);
      });

      if (targetObjId) {
        sel.value = targetObjId;
      } else {
        // Pilih opsi pertama yang belum terbuka
        let firstAvailable = Array.from(sel.options).find(o => !o.disabled);
        if (firstAvailable) sel.value = firstAvailable.value;
      }
    }

    let alreadyUnlocked = this.quest.getUnlockedObjectivesInLevel(curLvl.id);
    let allPenalty = (alreadyUnlocked.length > 0) ? 10 : 30;

    let badgeAll = document.getElementById('badgeModalAllPenalty');
    if (badgeAll) badgeAll.textContent = `-${allPenalty} Poin`;

    let descAll = document.getElementById('descModalAllPenalty');
    if (descAll) {
      descAll.textContent = (alreadyUnlocked.length > 0)
        ? `Membuka sisa seluruh petunjuk untuk level ini (diskon upgrade hanya +${allPenalty} Poin).`
        : `Membuka panduan lengkap untuk seluruh 5 soal pada level ini sekaligus.`;
    }

    let radioSingle = document.getElementById('radioOptSingle');
    let radioAll = document.getElementById('radioOptAll');

    // Jika seluruh soal sudah terbuka secara terpisah, paksa opsi all
    let hasAvailableSingle = sel && Array.from(sel.options).some(o => !o.disabled);
    if (!hasAvailableSingle || mode === 'all') {
      if (radioAll) radioAll.checked = true;
      if (radioSingle) { radioSingle.checked = false; radioSingle.disabled = true; }
    } else {
      if (radioSingle) radioSingle.disabled = false;
      if (mode === 'single' && radioSingle) {
        radioSingle.checked = true;
      } else if (radioAll) {
        radioAll.checked = true;
      }
    }

    this._syncHintModalView();
    this.openModal('modalConfirmHint');
  }

  _syncHintModalView() {
    let curLvl = this.quest.getCurrentLevel();
    let radioSingle = document.getElementById('radioOptSingle');
    let isSingle = radioSingle && radioSingle.checked;

    let cardSingle = document.getElementById('cardOptSingleHint');
    let cardAll = document.getElementById('cardOptAllHint');
    let badge = document.getElementById('hintPenaltyBadge');
    let msg = document.getElementById('hintPenaltyMsg');
    let proceedBtn = document.getElementById('btnProceedHint');
    let soalWrap = document.getElementById('hintSoalSelectWrap');

    let alreadyUnlocked = this.quest.getUnlockedObjectivesInLevel(curLvl.id);
    let allPenalty = (alreadyUnlocked.length > 0) ? 10 : 30;

    if (isSingle) {
      if (cardSingle) cardSingle.classList.add('active');
      if (cardAll) cardAll.classList.remove('active');
      if (soalWrap) soalWrap.style.display = 'block';
      if (badge) badge.innerHTML = `PENALTI NILAI: <strong>-20 POIN</strong>`;
      if (msg) msg.textContent = `Membuka petunjuk untuk 1 nomor soal akan mengurangi nilai gabungan Anda sebesar 20 poin.`;
      if (proceedBtn) proceedBtn.textContent = `Ya, Buka Petunjuk Soal Ini (-20 Poin)`;
    } else {
      if (cardSingle) cardSingle.classList.remove('active');
      if (cardAll) cardAll.classList.add('active');
      if (soalWrap) soalWrap.style.display = 'none';
      if (badge) badge.innerHTML = `PENALTI NILAI: <strong>-${allPenalty} POIN</strong>`;
      if (msg) msg.textContent = (alreadyUnlocked.length > 0)
        ? `Membuka seluruh sisa petunjuk level ini akan menambahkan potongan sebesar 10 poin (total potongan level ini 30 poin).`
        : `Membuka semua petunjuk perintah pada level ini akan mengurangi nilai gabungan Anda sebesar 30 poin.`;
      if (proceedBtn) proceedBtn.textContent = `Ya, Buka Semua Petunjuk (-${allPenalty} Poin)`;
    }
  }

  _proceedUnlockHint() {
    let curLvl = this.quest.getCurrentLevel();
    if (!curLvl) return;

    let radioSingle = document.getElementById('radioOptSingle');
    let isSingle = radioSingle && radioSingle.checked;

    if (isSingle) {
      let sel = document.getElementById('modalSelectObjective');
      let objId = sel ? sel.value : null;
      if (objId) {
        this.quest.unlockObjectiveHint(curLvl.id, objId);
      }
    } else {
      this.quest.unlockAllLevelHints(curLvl.id);
    }

    this.sound.playPenaltyWarning();
    this.renderCurrentMission();
    this.renderHintBox(curLvl);
    this.updateHeaderStats();
    this.syncAsprakRecord();
    this.closeModal('modalConfirmHint');
  }

  onLevelSwitched() {
    this.renderLevelMap();
    this.renderCurrentMission();
    this.updateHeaderStats();
    this.evaluateQuestState(false);
  }

  evaluateQuestState(manualTrigger = false) {
    let termState = this.terminal ? this.terminal.state : {};
    let evalRes = this.quest.evaluateCurrentLevel(this.vfs, termState);

    evalRes.objResults.forEach(r => {
      let itemEl = document.getElementById(`obj_${r.id}`);
      if (itemEl) {
        if (r.passed) {
          if (!itemEl.classList.contains('done')) {
            itemEl.classList.add('done');
            let box = itemEl.querySelector('.obj-checkbox');
            if (box) box.innerHTML = '✓';
            this.sound.playObjectiveDone();
          }
        } else {
          itemEl.classList.remove('done');
          let box = itemEl.querySelector('.obj-checkbox');
          if (box) box.innerHTML = '';
        }
      }
    });

    this.updateHeaderStats();
    this.syncAsprakRecord();

    if (evalRes.allDone) {
      let curLvl = evalRes.currentLevel;
      let btnNext = document.getElementById('btnNextLevel');
      if (btnNext) btnNext.classList.remove('hidden');

      if (manualTrigger) {
        this.sound.playLevelVictory();
        document.getElementById('congratsLevelTitle').textContent = curLvl.title;
        document.getElementById('congratsXpVal').textContent = `${this.quest.getNetScore()} / 100`;
        document.getElementById('congratsMessage').textContent = `Luar biasa! Seluruh instruksi untuk ${curLvl.title} berhasil dipenuhi dengan akurat.`;

        let nextBtn = document.getElementById('btnProceedNextModal');
        if (nextBtn) {
          nextBtn.textContent = evalRes.hasNext ? 'Lanjut ke Level Berikutnya →' : 'Lihat Rekap Nilai 🎓';
        }
        this.openModal('modalLevelComplete');
      }
    } else if (manualTrigger) {
      this.sound.playErrorTone();
      let curLvl = evalRes.currentLevel;
      let modalTitle = document.getElementById('evalModalTitle');
      if (modalTitle) modalTitle.textContent = `Evaluasi Tugas: ${curLvl.title}`;
      let listEl = document.getElementById('evalChecklistDetails');
      if (listEl) {
        listEl.innerHTML = '';
        evalRes.objResults.forEach(r => {
          let objDef = curLvl.objectives.find(o => o.id === r.id);
          let row = document.createElement('div');
          row.className = `eval-item-row ${r.passed ? 'is-done' : 'is-unmet'}`;
          row.innerHTML = `
            <span class="eval-status-icon">${r.passed ? '✅' : '❌'}</span>
            <div class="eval-item-desc">
              <div><strong>${objDef ? objDef.description : r.id}</strong></div>
              <div style="font-size:11px;opacity:0.85">${r.passed ? 'Status: Terpenuhi' : 'Status: Belum Terpenuhi — Jalankan perintah yang sesuai di terminal'}</div>
            </div>
          `;
          listEl.appendChild(row);
        });
      }
      this.openModal('modalIncompleteObjectives');
    }
  }

  showFinalVictory() {
    let nameEl = document.getElementById('certStudentName');
    let npmEl = document.getElementById('certStudentNPM');
    let scoreEl = document.getElementById('certTotalScore');
    let timeEl = document.getElementById('certTimestamp');

    if (nameEl) nameEl.textContent = this.student.name;
    if (npmEl) npmEl.textContent = `NPM: ${this.student.npm || '-'} • ${this.student.class}`;
    if (scoreEl) scoreEl.textContent = `NILAI AKHIR: ${this.quest.getNetScore()} / 100 (PENALTI: -${this.quest.penaltyPoints})`;
    if (timeEl) timeEl.textContent = `Waktu Selesai: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`;
    this.openModal('modalFinalVictory');
  }

  // =========================================================================
  // Portal Asprak (Asisten Praktikum) & Excel / CSV Exports
  // =========================================================================
  openAsprakPortal() {
    let authView = document.getElementById('asprakAuthView');
    let dashView = document.getElementById('asprakDashboardView');

    if (this.isAsprakAuthenticated) {
      if (authView) authView.classList.add('hidden');
      if (dashView) dashView.classList.remove('hidden');
      this.renderAsprakTable();
      this.renderBarChart();
    } else {
      if (authView) authView.classList.remove('hidden');
      if (dashView) dashView.classList.add('hidden');
      let pinIn = document.getElementById('inputAsprakPin');
      if (pinIn) pinIn.value = '';
      let errEl = document.getElementById('asprakPinError');
      if (errEl) errEl.classList.add('hidden');
    }

    this.openModal('modalAsprakPortal');
  }

  getMasterPin() {
    return localStorage.getItem('ltd_asprak_master_pin') || ASPRAK_MASTER_PIN;
  }

  verifyAsprakPin() {
    let pinIn = document.getElementById('inputAsprakPin');
    let errEl = document.getElementById('asprakPinError');
    let entered = pinIn ? pinIn.value.trim() : '';
    if (entered === this.getMasterPin()) {
      this.isAsprakAuthenticated = true;
      if (errEl) errEl.classList.add('hidden');
      let authView = document.getElementById('asprakAuthView');
      let dashView = document.getElementById('asprakDashboardView');
      if (authView) authView.classList.add('hidden');
      if (dashView) dashView.classList.remove('hidden');

      // Switch to scores tab
      let tabScores = document.getElementById('tabBtnScores');
      let tabCodes = document.getElementById('tabBtnCodes');
      let tabSheets = document.getElementById('tabBtnSheets');
      let paneScores = document.getElementById('paneScores');
      let paneCodes = document.getElementById('paneCodes');
      let paneSheets = document.getElementById('paneSheets');
      if (tabScores) tabScores.classList.add('active');
      if (tabCodes) tabCodes.classList.remove('active');
      if (tabSheets) tabSheets.classList.remove('active');
      if (paneScores) paneScores.classList.remove('hidden');
      if (paneCodes) paneCodes.classList.add('hidden');
      if (paneSheets) paneSheets.classList.add('hidden');

      this.renderAsprakTable();
      this.renderBarChart();
      this.renderClassCodeGrid();
      this.updateSheetsTabDisplay();
      this.sound.playSuccessTone();
    } else {
      this.sound.playErrorTone();
      if (errEl) {
        errEl.textContent = 'PIN Master salah! Khusus Asisten Laboratorium Teknik Digital.';
        errEl.classList.remove('hidden');
      }
      if (pinIn) pinIn.value = '';
    }
  }

  syncAsprakRecord() {
    let records = this.getAsprakRecords();
    let currentNpm = this.student.npm || 'GUEST';

    let curLvl = this.quest.getCurrentLevel();
    let isLevelDone = this.quest.isLevelComplete(curLvl.id);
    let netScore = this.quest.getNetScore();
    let pureScore = this.quest.getPureScore();

    let idx = records.findIndex(r => r.npm === currentNpm);
    let recordObj = {
      name: this.student.name,
      npm: currentNpm,
      class: this.student.class || 'PSO A',
      levelAchieved: `Level ${curLvl.id}`,
      pureScore: pureScore,
      penalties: this.quest.penaltyPoints,
      netScore: netScore,
      status: isLevelDone ? 'LULUS' : 'PROSES',
      timestamp: new Date().toLocaleString('id-ID')
    };

    if (idx !== -1) {
      records[idx] = recordObj;
    } else {
      records.unshift(recordObj);
    }

    localStorage.setItem('osquest_asprak_records', JSON.stringify(records));

    // Kirim otomatis ke Google Sheets jika webhook URL telah diatur
    if (this.student.npm && this.student.npm !== 'GUEST') {
      this.sendRecordToGoogleSheets(recordObj);
    }
  }

  getAsprakRecords() {
    try {
      let saved = localStorage.getItem('osquest_asprak_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [];
  }

  renderBarChart() {
    const container = document.getElementById('barChartContainer');
    if (!container) return;
    const records = this.getAsprakRecords();
    const filterClassEl = document.getElementById('filterAsprakClass');
    const filterClass = filterClassEl ? filterClassEl.value : 'ALL';
    const classes = ['PSO A', 'PSO B', 'PSO C', 'PSO D', 'PSO E'];
    const colors = { 'PSO A': '#6366f1', 'PSO B': '#22d3ee', 'PSO C': '#f59e0b', 'PSO D': '#10b981', 'PSO E': '#f97316' };
    const classStats = {};
    classes.forEach(cls => {
      const cr = records.filter(r => r.class === cls);
      const total = cr.length;
      const avgScore = total > 0 ? Math.round(cr.reduce((s, r) => s + (r.netScore || 0), 0) / total) : 0;
      const passed = cr.filter(r => r.status === 'LULUS').length;
      classStats[cls] = { total, avgScore, passed };
    });
    const displayClasses = filterClass === 'ALL' ? classes : [filterClass];
    const sub = document.getElementById('chartClassSub');
    if (sub) sub.textContent = filterClass === 'ALL' ? 'Statistik Seluruh Kelas (PSO A - E)' : 'Filter: ' + filterClass;

    let html = '<div class="bar-chart-inner"><div class="chart-y-axis">';
    [100, 75, 50, 25, 0].forEach(v => { html += '<div class="y-label">' + v + '</div>'; });
    html += '</div><div class="chart-bars-area">';
    displayClasses.forEach(cls => {
      const stat = classStats[cls];
      const pct = Math.max(2, Math.round((stat.avgScore / 100) * 100));
      const color = colors[cls];
      html += '<div class="chart-bar-group">' +
        '<div class="bar-tooltip-wrap">' +
        '<div class="bar-pillar-wrap"><div class="bar-pillar" style="height:' + pct + '%;background:linear-gradient(180deg,' + color + ' 0%,' + color + '88 100%);"></div></div>' +
        '<div class="bar-tooltip-popup"><strong>' + cls + '</strong><br>Rata-rata: <b>' + stat.avgScore + '</b><br>Praktikan: <b>' + stat.total + '</b><br>Lulus: <b>' + stat.passed + '</b></div>' +
        '</div>' +
        '<div class="bar-class-label" style="color:' + color + '">' + cls.replace('PSO ', '') + '</div>' +
        '<div class="bar-score-label" style="color:' + color + ';font-size:11px;font-weight:700">' + stat.avgScore + '</div>' +
        '</div>';
    });
    html += '</div></div>';
    html += '<div class="chart-summary-row">';
    displayClasses.forEach(cls => {
      const stat = classStats[cls];
      const color = colors[cls];
      html += '<div class="chart-stat-card" style="border-left:3px solid ' + color + '"><span class="stat-card-class">' + cls + '</span><div class="stat-card-vals"><span>⭐ ' + stat.avgScore + '</span><span>👤 ' + stat.total + '</span><span>✅ ' + stat.passed + '</span></div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  renderClassCodeGrid() {
    const grid = document.getElementById('classCodeGrid');
    if (!grid) return;
    const classes = ['PSO A', 'PSO B', 'PSO C', 'PSO D', 'PSO E'];
    grid.innerHTML = '';
    classes.forEach(cls => {
      const currentCode = this.classCodes[cls] || DEFAULT_CLASS_CODES[cls];
      const row = document.createElement('div');
      row.className = 'code-row-item';
      row.innerHTML = '<div class="code-class-label">🔑 ' + cls + '</div>' +
        '<input type="text" class="code-input-field" id="codeInput_' + cls.replace(' ', '_') + '" value="' + currentCode + '" placeholder="' + DEFAULT_CLASS_CODES[cls] + '" style="text-transform:uppercase">' +
        '<div style="font-size:10px;color:#64748b;margin-top:2px">Default: ' + DEFAULT_CLASS_CODES[cls] + '</div>';
      grid.appendChild(row);
    });
    // Wire save/reset if not already done
    const btnSave = document.getElementById('btnSaveClassCodes');
    if (btnSave && !btnSave._bound) {
      btnSave.addEventListener('click', () => this.saveClassCodeInputs());
      btnSave._bound = true;
    }
    const btnReset = document.getElementById('btnResetDefaultCodes');
    if (btnReset && !btnReset._bound) {
      btnReset.addEventListener('click', () => {
        if (confirm('Reset semua kode ke default?')) {
          this._saveClassCodes(Object.assign({}, DEFAULT_CLASS_CODES));
          this.renderClassCodeGrid();
          alert('Kode kelas direset ke default.');
        }
      });
      btnReset._bound = true;
    }

    const btnSavePin = document.getElementById('btnSaveMasterPin');
    if (btnSavePin && !btnSavePin._bound) {
      btnSavePin.addEventListener('click', () => {
        let inputNew = document.getElementById('inputNewMasterPin');
        let feedback = document.getElementById('pinChangeFeedback');
        let val = inputNew ? inputNew.value.trim() : '';
        if (val.length >= 4) {
          localStorage.setItem('ltd_asprak_master_pin', val);
          if (feedback) {
            feedback.textContent = '✅ PIN Master berhasil diubah!';
            feedback.style.color = '#10b981';
            feedback.classList.remove('hidden');
            setTimeout(() => feedback.classList.add('hidden'), 3500);
          }
          if (inputNew) inputNew.value = '';
          this.sound.playSuccessTone();
        } else {
          if (feedback) {
            feedback.textContent = '❌ PIN minimal 4 karakter!';
            feedback.style.color = '#ef4444';
            feedback.classList.remove('hidden');
          }
        }
      });
      btnSavePin._bound = true;
    }
  }

  saveClassCodeInputs() {
    const classes = ['PSO A', 'PSO B', 'PSO C', 'PSO D', 'PSO E'];
    const newCodes = {};
    let hasError = false;
    classes.forEach(cls => {
      const el = document.getElementById('codeInput_' + cls.replace(' ', '_'));
      const val = el ? el.value.trim().toUpperCase() : '';
      if (!val || val.length < 3) { hasError = true; if (el) el.style.borderColor = '#ef4444'; }
      else { newCodes[cls] = val; if (el) el.style.borderColor = ''; }
    });
    if (hasError) { alert('Kode kelas tidak boleh kosong dan minimal 3 karakter!'); return; }
    this._saveClassCodes(newCodes);
    alert('✅ Kode kelas berhasil disimpan! Kode baru aktif untuk ujian berikutnya.');
    this.sound.playSuccessTone();
  }

  renderAsprakTable() {
    let records = this.getAsprakRecords();
    let filterClassEl = document.getElementById('filterAsprakClass');
    let filterClass = filterClassEl ? filterClassEl.value : 'ALL';
    let searchEl = document.getElementById('searchAsprakStudent');
    let searchQuery = searchEl ? searchEl.value.toLowerCase().trim() : '';
    let tbody = document.getElementById('tbodyAsprakRecords');

    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = records.filter(r => {
      let matchClass = filterClass === 'ALL' || r.class === filterClass;
      let matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery) || r.npm.toLowerCase().includes(searchQuery);
      return matchClass && matchSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 20px; color: #94a3b8;">Tidak ada data praktikan yang cocok.</td></tr>`;
      return;
    }

    filtered.forEach((r, i) => {
      let tr = document.createElement('tr');
      let statusClass = r.status === 'LULUS' ? 'lulus' : 'proses';

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><strong>${r.name}</strong></td>
        <td><code>${r.npm}</code></td>
        <td><span class="badge-tag" style="background:#475569;">${r.class}</span></td>
        <td>${r.levelAchieved}</td>
        <td>${r.pureScore}</td>
        <td class="text-danger">${r.penalties > 0 ? `-${r.penalties}` : '0'}</td>
        <td><strong class="green-text" style="font-size: 14px;">${r.netScore}</strong></td>
        <td><span class="status-badge ${statusClass}">${r.status}</span></td>
        <td style="font-size: 11px; color: #94a3b8;">${r.timestamp}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  exportAsprakCsv() {
    let records = this.getAsprakRecords();
    let filterClassEl = document.getElementById('filterAsprakClass');
    let filterClass = filterClassEl ? filterClassEl.value : 'ALL';
    if (filterClass !== 'ALL') {
      records = records.filter(r => r.class === filterClass);
    }

    let csv = '\uFEFF';
    csv += "No,Nama Praktikan,NPM,Kelas,Level Tercapai,Nilai Murni,Penalti Petunjuk,Nilai Akhir,Status,Waktu Selesai\n";

    records.forEach((r, idx) => {
      let row = [
        idx + 1,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.npm}"`,
        `"${r.class}"`,
        `"${r.levelAchieved}"`,
        r.pureScore,
        r.penalties,
        r.netScore,
        `"${r.status}"`,
        `"${r.timestamp}"`
      ];
      csv += row.join(',') + '\n';
    });

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_PostTest_SO_${filterClass}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.sound.playSuccessTone();
  }

  exportAsprakExcel() {
    let records = this.getAsprakRecords();
    let filterClassEl = document.getElementById('filterAsprakClass');
    let filterClass = filterClassEl ? filterClassEl.value : 'ALL';
    if (filterClass !== 'ALL') {
      records = records.filter(r => r.class === filterClass);
    }

    let excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          th { background-color: #2C001E; color: #FFFFFF; font-weight: bold; border: 1px solid #999; }
          td { border: 1px solid #CCC; text-align: left; }
          .num { text-align: center; }
          .score { font-weight: bold; color: #008000; text-align: center; }
        </style>
      </head>
      <body>
        <h2>REKAPITULASI NILAI POST-TEST SISTEM OPERASI</h2>
        <p>Kelas: ${filterClass} | Diekspor pada: ${new Date().toLocaleString('id-ID')}</p>
        <table border="1">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Praktikan</th>
              <th>NPM</th>
              <th>Kelas</th>
              <th>Level Tercapai</th>
              <th>Nilai Murni</th>
              <th>Penalti Petunjuk</th>
              <th>Nilai Akhir</th>
              <th>Status</th>
              <th>Waktu Selesai</th>
            </tr>
          </thead>
          <tbody>
    `;

    records.forEach((r, idx) => {
      excelContent += `
        <tr>
          <td class="num">${idx + 1}</td>
          <td>${r.name}</td>
          <td style="mso-number-format:'\\@'">${r.npm}</td>
          <td class="num">${r.class}</td>
          <td>${r.levelAchieved}</td>
          <td class="num">${r.pureScore}</td>
          <td class="num">${r.penalties}</td>
          <td class="score">${r.netScore}</td>
          <td class="num">${r.status}</td>
          <td>${r.timestamp}</td>
        </tr>
      `;
    });

    excelContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    let blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_PostTest_SO_${filterClass}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    this.sound.playSuccessTone();
  }

  // =========================================================================
  // Live Virtual File Tree Widget
  // =========================================================================
  renderFileTree() {
    let treeContainer = document.getElementById('virtualFileTree');
    if (!treeContainer) return;
    let treeData = this.vfs.getHomeTreeData();

    treeContainer.innerHTML = '';

    const renderNode = (node, depth = 0) => {
      let div = document.createElement('div');
      div.className = `tree-node ${node.type === 'dir' ? 'is-dir' : 'is-file'}`;
      div.style.paddingLeft = `${depth * 14 + 6}px`;

      let icon = node.type === 'dir' ? '📁' : '📄';
      div.innerHTML = `<span class="tree-icon">${icon}</span> <span>${node.name || '~ (home)'}</span>`;

      if (node.type === 'file') {
        div.title = `Klik untuk inspeksi berkas: ${node.path}`;
        div.addEventListener('click', () => this.inspectFile(node.path));
      }

      treeContainer.appendChild(div);

      if (node.children && node.children.length > 0) {
        node.children.forEach(child => renderNode(child, depth + 1));
      }
    };

    renderNode(treeData);
  }

  inspectFile(pathStr) {
    let node = this.vfs.getNode(pathStr);
    if (!node) return;

    let nameEl = document.getElementById('inspectFileName');
    let pathEl = document.getElementById('inspectFilePath');
    let sizeEl = document.getElementById('inspectFileSize');
    let contentEl = document.getElementById('inspectFileContent');

    if (nameEl) nameEl.textContent = node.name;
    if (pathEl) pathEl.textContent = `Path: ${pathStr}`;
    if (sizeEl) sizeEl.textContent = `${node.content ? node.content.length : 0} bytes`;
    if (contentEl) contentEl.textContent = node.content || '(Berkas kosong)';

    this.openModal('modalFileViewer');
  }

  // =========================================================================
  // Virtual Browser Simulation (Percobaan 2-1)
  // =========================================================================
  renderVirtualBrowser() {
    let vp = document.getElementById('browserViewport');
    if (!vp || !this.terminal) return;
    let isRunning = this.terminal.state.apacheRunning;

    if (isRunning) {
      vp.innerHTML = `
        <div class="apache-page">
          <div class="apache-banner">
            <h1>Apache2 Ubuntu Default Page</h1>
            <span class="apache-ubuntu-badge">Ubuntu Server</span>
          </div>
          <div class="apache-content">
            <h3>It works!</h3>
            <p>This is the default welcome page used to test the correct operation of the Apache2 server after installation on Ubuntu systems.</p>
            <p style="margin-top: 10px;">Layanan web server <strong>Apache2</strong> pada IP <code>192.168.1.50</code> sedang aktif dan menerima koneksi port 80.</p>
          </div>
        </div>
      `;
    } else {
      vp.innerHTML = `
        <div class="browser-error-state">
          <div class="err-icon">🌐⚠️</div>
          <h3>This site can't be reached</h3>
          <p><strong>192.168.1.50</strong> refused to connect. Layanan web server Apache2 mungkin belum dijalankan atau telah dihentikan (stopped / killed).</p>
          <span class="err-code">ERR_CONNECTION_REFUSED</span>
        </div>
      `;
    }
  }

  // =========================================================================
  // Google Sheets Integration Methods
  // =========================================================================
  getSheetsWebhookUrl() {
    let saved = localStorage.getItem('ltd_sheets_webhook_url');
    if (saved && saved.trim().length > 0) return saved.trim();
    return DEFAULT_SHEETS_WEBHOOK_URL || '';
  }

  saveSheetsWebhookUrl() {
    let inputEl = document.getElementById('inputSheetsWebhookUrl');
    let feedbackEl = document.getElementById('sheetsFeedback');
    let url = inputEl ? inputEl.value.trim() : '';

    if (!url) {
      localStorage.removeItem('ltd_sheets_webhook_url');
      this.updateSheetsTabDisplay();
      if (feedbackEl) {
        feedbackEl.textContent = 'ℹ️ URL Webhook dihapus. Integrasi Google Sheets dinonaktifkan.';
        feedbackEl.style.color = '#f59e0b';
        feedbackEl.classList.remove('hidden');
      }
      return;
    }

    if (!url.startsWith('https://script.google.com/macros/s/')) {
      if (feedbackEl) {
        feedbackEl.textContent = '❌ Format URL tidak valid! URL harus diawali dengan https://script.google.com/macros/s/.../exec';
        feedbackEl.style.color = '#ef4444';
        feedbackEl.classList.remove('hidden');
      }
      return;
    }

    localStorage.setItem('ltd_sheets_webhook_url', url);
    this.updateSheetsTabDisplay();
    if (feedbackEl) {
      feedbackEl.textContent = '✅ URL Webhook Google Sheets berhasil disimpan!';
      feedbackEl.style.color = '#10b981';
      feedbackEl.classList.remove('hidden');
      setTimeout(() => { if (feedbackEl) feedbackEl.classList.add('hidden'); }, 4000);
    }
    this.sound.playSuccessTone();
  }

  updateSheetsTabDisplay() {
    let inputEl = document.getElementById('inputSheetsWebhookUrl');
    let badgeEl = document.getElementById('badgeSheetsStatus');
    let currentUrl = this.getSheetsWebhookUrl();

    if (inputEl) inputEl.value = currentUrl;

    if (badgeEl) {
      if (currentUrl) {
        badgeEl.textContent = 'Tersambung ✓';
        badgeEl.className = 'status-badge-sheets connected';
      } else {
        badgeEl.textContent = 'Belum Dikonfigurasi';
        badgeEl.className = 'status-badge-sheets disconnected';
      }
    }
  }

  sendRecordToGoogleSheets(recordObj) {
    let url = this.getSheetsWebhookUrl();
    if (!url) return Promise.resolve(false);

    // Menggunakan mode no-cors dan Content-Type text/plain agar tidak terblokir preflight CORS browser
    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(recordObj)
    }).then(() => true).catch(err => {
      console.warn('Gagal sinkronisasi ke Google Sheets:', err);
      return false;
    });
  }

  testGoogleSheetsConnection() {
    let url = this.getSheetsWebhookUrl();
    let feedbackEl = document.getElementById('sheetsFeedback');
    let btnTest = document.getElementById('btnTestSheets');

    if (!url) {
      if (feedbackEl) {
        feedbackEl.textContent = '⚠️ Masukkan dan simpan URL Webhook Google Apps Script terlebih dahulu!';
        feedbackEl.style.color = '#f59e0b';
        feedbackEl.classList.remove('hidden');
      }
      return;
    }

    if (btnTest) {
      btnTest.disabled = true;
      btnTest.textContent = '⏳ Mengirim...';
    }

    let testPayload = {
      timestamp: new Date().toLocaleString('id-ID'),
      npm: '2415061108_TEST',
      name: 'Praktikan Uji Coba (Test Connection)',
      class: 'PSO A',
      levelAchieved: 'Level 8',
      pureScore: 100,
      penalties: 0,
      netScore: 100,
      status: 'LULUS'
    };

    this.sendRecordToGoogleSheets(testPayload).then(() => {
      if (feedbackEl) {
        feedbackEl.innerHTML = `✅ Baris data uji coba berhasil dikirim ke Google Sheets! Silakan periksa spreadsheet Anda. Jika baris uji coba sudah muncul, Anda dapat menghapusnya.`;
        feedbackEl.style.color = '#10b981';
        feedbackEl.classList.remove('hidden');
      }
      this.sound.playSuccessTone();
    }).finally(() => {
      if (btnTest) {
        btnTest.disabled = false;
        btnTest.textContent = '🧪 Tes Kirim Uji Coba';
      }
    });
  }

  syncAllRecordsToGoogleSheets() {
    let url = this.getSheetsWebhookUrl();
    let feedbackEl = document.getElementById('sheetsFeedback');
    let btnSync = document.getElementById('btnSyncAllToSheets');

    if (!url) {
      alert('⚠️ Silakan simpan URL Webhook Google Apps Script terlebih dahulu pada kolom di atas!');
      return;
    }

    let records = this.getAsprakRecords();
    if (!records || records.length === 0) {
      alert('ℹ️ Tidak ada data praktikan lokal yang tersimpan saat ini.');
      return;
    }

    if (!confirm(`Kirim seluruh ${records.length} data praktikan lokal ke Google Sheets?`)) return;

    if (btnSync) {
      btnSync.disabled = true;
      btnSync.textContent = `⏳ Mengirim 0/${records.length}...`;
    }

    let count = 0;
    let sendNext = (i) => {
      if (i >= records.length) {
        if (btnSync) {
          btnSync.disabled = false;
          btnSync.textContent = '📤 Kirim Semua Data ke Google Sheets';
        }
        if (feedbackEl) {
          feedbackEl.textContent = `✅ Berhasil mengirim ${count} data praktikan ke Google Sheets!`;
          feedbackEl.style.color = '#10b981';
          feedbackEl.classList.remove('hidden');
        }
        this.sound.playSuccessTone();
        return;
      }

      this.sendRecordToGoogleSheets(records[i]).then(() => {
        count++;
        if (btnSync) btnSync.textContent = `⏳ Mengirim ${count}/${records.length}...`;
        setTimeout(() => sendNext(i + 1), 250);
      });
    };

    sendNext(0);
  }

  // =========================================================================
  // Modals Controller
  // =========================================================================
  openModal(modalId) {
    let modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  closeModal(modalId) {
    let modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
