window.ParticipantDialog = class ParticipantDialog {
  constructor(translate, setStatus) {
    this.t = translate;
    this.setStatus = setStatus;
  }

  init() {
    const button = document.querySelector('#participant-label');
    const form = document.querySelector('#participant-form');
    const cancelButton = document.querySelector('#participant-dialog-cancel');

    button?.addEventListener('click', () => this.open());
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save();
    });
    cancelButton?.addEventListener('click', () => {
      document.querySelector('#participant-dialog')?.close();
    });
  }

  open() {
    const dialog = document.querySelector('#participant-dialog');

    if (!dialog) {
      return;
    }

    this.updateLabels();
    document.querySelector('#participant-dialog-error').hidden = true;
    document.querySelector('#participant-name').value = '';
    document.querySelector('#participant-email').value = '';
    dialog.showModal();
  }

  updateLabels() {
    document.querySelector('#participant-dialog-title').textContent = this.t('ui.participant');
    document.querySelector('#participant-dialog-text').textContent = this.t('ui.participantDescription');
    document.querySelector('#participant-name-label').textContent = this.t('ui.participantName');
    document.querySelector('#participant-email-label').textContent = this.t('ui.participantEmail');
    document.querySelector('#participant-dialog-cancel').textContent = this.t('ui.cancel');
    document.querySelector('#participant-dialog-save').textContent = this.t('ui.participantSave');
  }

  refreshLanguage() {
    this.updateLabels();
  }

  async save() {
    const nameInput = document.querySelector('#participant-name');
    const emailInput = document.querySelector('#participant-email');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !email) {
      this.showError(this.t('ui.participantRequired'));
      return;
    }

    if (!emailInput.checkValidity()) {
      this.showError(this.t('ui.participantInvalidEmail'));
      return;
    }

    const saveButton = document.querySelector('#participant-dialog-save');
    saveButton.disabled = true;

    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });

      if (!response.ok) {
        if (response.status === 409) {
          this.showError(this.t('ui.participantDuplicate'));
          return;
        }

        throw new Error('Teilnahme konnte nicht gespeichert werden.');
      }

      this.setStatus(this.t('ui.participantSaved'), 'success');
      document.querySelector('#participant-dialog').close();
    } catch (error) {
      this.showError(this.t('ui.participantSaveError'));
    } finally {
      saveButton.disabled = false;
    }
  }

  showError(message) {
    const errorElement = document.querySelector('#participant-dialog-error');
    errorElement.textContent = message;
    errorElement.hidden = false;
  }

};