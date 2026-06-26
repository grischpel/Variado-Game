window.QuestionDialog = class QuestionDialog {
  constructor(translate, setStatus) {
    this.t = translate;
    this.setStatus = setStatus;
  }

  ask(questionConfig) {
    return new Promise((resolve) => {
      const dialog = document.querySelector('#question-dialog');
      const titleElement = document.querySelector('#question-dialog-title');
      const textElement = document.querySelector('#question-dialog-text');
      const answersElement = document.querySelector('#question-dialog-answers');
      const cancelButton = document.querySelector('#question-dialog-cancel');

      if (!dialog || !titleElement || !textElement || !answersElement || !cancelButton) {
        console.warn(this.t('warnings.questionDialogMissing'));
        resolve(false);
        return;
      }

      let resolved = false;

      titleElement.textContent = this.t('ui.questionTitle');
      textElement.textContent = this.t(questionConfig.questionKey);
      answersElement.innerHTML = '';
      cancelButton.textContent = this.t('ui.cancel');

      const cleanup = () => {
        cancelButton.removeEventListener('click', onCancel);
        dialog.removeEventListener('cancel', onNativeCancel);
        dialog.removeEventListener('close', onClose);
        answersElement.innerHTML = '';
      };

      const finish = (result) => {
        if (resolved) {
          return;
        }

        resolved = true;
        cleanup();

        if (dialog.open) {
          dialog.close();
        }

        resolve(result);
      };

      const onCancel = () => {
        this.setStatus(this.t('status.questionCancelled'), 'warning');
        finish(false);
      };

      const onNativeCancel = (event) => {
        event.preventDefault();
        this.setStatus(this.t('status.questionCancelled'), 'warning');
        finish(false);
      };

      const onClose = () => {
        if (!resolved) {
          this.setStatus(this.t('status.questionCancelled'), 'warning');
          finish(false);
        }
      };

      questionConfig.answers.forEach((answer) => {
        const answerButton = document.createElement('button');

        answerButton.type = 'button';
        answerButton.className = 'question-dialog__answer';
        answerButton.textContent = this.t(answer.labelKey);

        answerButton.addEventListener('click', () => {
          if (!answer.correct) {
            this.setStatus(this.t('status.questionWrongAnswer'), 'error');
            finish(false);
            return;
          }

          this.setStatus(this.t('status.questionCorrectAnswer'), 'success');
          finish(true);
        });

        answersElement.appendChild(answerButton);
      });

      cancelButton.addEventListener('click', onCancel);
      dialog.addEventListener('cancel', onNativeCancel);
      dialog.addEventListener('close', onClose);

      dialog.showModal();
    });
  }
};