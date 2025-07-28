document.addEventListener('DOMContentLoaded', () => {
  const blockMessageElement   = document.getElementById('blockMessage');
  const blockReasonElement    = document.getElementById('blockReason');
  const tempMinutesInput      = document.getElementById('tempMinutes');
  const requestTempUnblockBtn = document.getElementById('requestTempUnblock');
  const minutesDisplaySpan    = document.getElementById('minutesDisplay');
  const tempUnblockStatus     = document.getElementById('tempUnblockStatus');
  const passwordContainer     = document.getElementById('passwordContainer');
  const tempPasswordInput     = document.getElementById('tempPassword');

  let currentDomain = '';
  let currentKeyword = '';

  browser.storage.local.get('blockPageMessage').then(settings => {
    blockMessageElement.textContent = settings.blockPageMessage || "I don't need this.";
  });

  const urlParams = new URLSearchParams(window.location.search);
  const reason = urlParams.get('reason');
  if (reason) {
    blockReasonElement.textContent = `(${reason})`;
    if (reason.startsWith('Blocked Domain:')) {
      currentDomain = reason.replace('Blocked Domain: ', '').trim();
    } else if (reason.startsWith('Content Keyword:')) {
      currentKeyword = reason.replace('Content Keyword: "', '').replace('"', '').trim();
    }
  }

  // Show password field only if a password is set
  browser.storage.local.get('passwordHash').then(({ passwordHash }) => {
    if (passwordHash) passwordContainer.style.display = 'block';
  });

  tempMinutesInput.addEventListener('input', () => {
    minutesDisplaySpan.textContent = parseInt(tempMinutesInput.value) || 15;
  });

  requestTempUnblockBtn.addEventListener('click', async () => {
    const minutes = parseInt(tempMinutesInput.value);
    if (!minutes || minutes < 1 || minutes > 1440) {
      showStatus('Please enter a valid number between 1 and 1440 minutes.', 'error');
      return;
    }
    if (!currentDomain && !currentKeyword) {
      showStatus('Unable to determine what to unblock.', 'error');
      return;
    }

    requestTempUnblockBtn.disabled = true;
    showStatus('Processing request...', 'info');

    const password = passwordContainer.style.display === 'block'
      ? tempPasswordInput.value
      : undefined;

    try {
      const response = await browser.runtime.sendMessage({
        action: 'requestTempUnblock',
        domain: currentDomain,
        keyword: currentKeyword,
        minutes,
        password
      });

      if (response.success) {
        showStatus(`Access granted for ${minutes} minutes. Redirecting...`, 'success');
        setTimeout(() => {
          if (currentDomain) {
            window.location.href = `https://${currentDomain}`;
          } else {
            window.history.back();
          }
        }, 2000);
      } else {
        let msg = response.error || 'Failed to grant temporary access.';
        if (response.error === 'Password required.') msg = 'Enter the password to unlock.';
        if (response.error === 'Incorrect password.') msg = 'Wrong password – try again.';
        showStatus(msg, 'error');
        requestTempUnblockBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      showStatus('Error processing request. Try again.', 'error');
      requestTempUnblockBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    tempUnblockStatus.textContent = message;
    tempUnblockStatus.className = type;
    if (type === 'error') {
      setTimeout(() => {
        tempUnblockStatus.textContent = '';
        tempUnblockStatus.className = '';
      }, 5000);
    }
  }

  tempMinutesInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') requestTempUnblockBtn.click();
  });
});
