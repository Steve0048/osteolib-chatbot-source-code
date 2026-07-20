export const FileUploadExtension = {
  name: 'FileUploadExtension',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'ext_file_upload' || trace.payload?.name === 'ext_file_upload',
  render: ({ trace, element }) => {
    const label = trace.payload?.label || 'Ajoutez votre fichier';
    const acceptedTypes = trace.payload?.accept || '.pdf,.jpg,.jpeg,.png,.mp4';

    const container = document.createElement('div');
    container.classList.add('osteolib-upload-container');

    container.innerHTML = `
      <style>
        .osteolib-upload-container {
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(145deg, #ffffff, #eafbf8);
          border: 1.5px solid #cff5ef;
          border-radius: 16px;
          padding: 24px;
          max-width: 380px;
          margin: 12px auto;
          box-shadow: 0 4px 16px rgba(63, 191, 174, 0.12);
        }
        .osteolib-upload-title {
          font-size: 0.95rem;
          color: #1d5854;
          margin-bottom: 16px;
          font-weight: 600;
        }
        .osteolib-dropzone {
          border: 2px dashed #6fdcce;
          border-radius: 12px;
          padding: 28px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s ease;
          background: #ffffff;
        }
        .osteolib-dropzone.dragover {
          border-color: #3fbfae;
          background: #eafbf8;
          transform: scale(1.01);
        }
        .osteolib-dropzone-icon {
          font-size: 1.8rem;
          margin-bottom: 8px;
        }
        .osteolib-dropzone-text {
          color: #277a70;
          font-size: 0.9rem;
        }
        .osteolib-dropzone-sub {
          color: #94a3a8;
          font-size: 0.75rem;
          margin-top: 4px;
        }
        .osteolib-file-input {
          display: none;
        }
        .osteolib-file-preview {
          display: none;
          align-items: center;
          justify-content: space-between;
          background: #eafbf8;
          border-radius: 10px;
          padding: 10px 14px;
          margin-top: 14px;
          font-size: 0.85rem;
          color: #1d5854;
        }
        .osteolib-file-preview.active {
          display: flex;
        }
        .osteolib-remove-file {
          cursor: pointer;
          color: #94a3a8;
          font-size: 1.1rem;
          line-height: 1;
        }
        .osteolib-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .osteolib-btn {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          border: none;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .osteolib-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .osteolib-btn-primary {
          background: #3fbfae;
          color: white;
        }
        .osteolib-btn-primary:hover:not(:disabled) {
          background: #329c8f;
        }
        .osteolib-btn-secondary {
          background: #eafbf8;
          color: #1d5854;
        }
        .osteolib-status {
          margin-top: 12px;
          font-size: 0.82rem;
          text-align: center;
        }
        .osteolib-status.error { color: #d64545; }
        .osteolib-status.success { color: #329c8f; }
        .osteolib-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid #cff5ef;
          border-top-color: #3fbfae;
          border-radius: 50%;
          animation: osteolib-spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }
        @keyframes osteolib-spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <div class="osteolib-upload-title">${label}</div>

      <div class="osteolib-dropzone" id="dropzone">
        <div class="osteolib-dropzone-icon">📎</div>
        <div class="osteolib-dropzone-text">Glissez un fichier ici, ou cliquez pour parcourir</div>
        <div class="osteolib-dropzone-sub">PDF, JPG, PNG ou MP4</div>
        <input type="file" class="osteolib-file-input" id="fileInput" accept="${acceptedTypes}">
      </div>

      <div class="osteolib-file-preview" id="filePreview">
        <span id="fileName"></span>
        <span class="osteolib-remove-file" id="removeFile">✕</span>
      </div>

      <div class="osteolib-actions">
        <button class="osteolib-btn osteolib-btn-secondary" id="skipBtn" type="button">Passer cette étape</button>
        <button class="osteolib-btn osteolib-btn-primary" id="uploadBtn" type="button" disabled>Envoyer</button>
      </div>

      <div class="osteolib-status" id="status"></div>
    `;

    const dropzone = container.querySelector('#dropzone');
    const fileInput = container.querySelector('#fileInput');
    const filePreview = container.querySelector('#filePreview');
    const fileNameEl = container.querySelector('#fileName');
    const removeFileBtn = container.querySelector('#removeFile');
    const uploadBtn = container.querySelector('#uploadBtn');
    const skipBtn = container.querySelector('#skipBtn');
    const status = container.querySelector('#status');

    let selectedFile = null;

    function showFile(file) {
      selectedFile = file;
      fileNameEl.textContent = file.name;
      filePreview.classList.add('active');
      uploadBtn.disabled = false;
      dropzone.style.display = 'none';
    }

    function clearFile() {
      selectedFile = null;
      fileInput.value = '';
      filePreview.classList.remove('active');
      uploadBtn.disabled = true;
      dropzone.style.display = 'block';
    }

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) showFile(fileInput.files[0]);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) showFile(e.dataTransfer.files[0]);
    });

    removeFileBtn.addEventListener('click', clearFile);

    skipBtn.addEventListener('click', () => {
      window.voiceflow.chat.interact({
        type: 'complete',
        payload: { skipped: true, file: null },
      });
    });

    uploadBtn.addEventListener('click', async () => {
      if (!selectedFile) return;

      uploadBtn.disabled = true;
      skipBtn.disabled = true;
      status.className = 'osteolib-status';
      status.innerHTML = `<span class="osteolib-spinner"></span>Envoi en cours...`;

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();

        if (response.ok) {
          const fileUrl = data.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
          status.className = 'osteolib-status success';
          status.textContent = 'Fichier envoyé avec succès.';

          window.voiceflow.chat.interact({
            type: 'complete',
            payload: { skipped: false, file: fileUrl, fileName: selectedFile.name },
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (err) {
        status.className = 'osteolib-status error';
        status.textContent = "L'envoi a échoué, réessayez.";
        uploadBtn.disabled = false;
        skipBtn.disabled = false;
      }
    });

    element.appendChild(container);
  },
};