/* ============================================================================
   ChatBotté Animal — Extension d'envoi de fichier pour le widget Voiceflow
   ----------------------------------------------------------------------------
   Deux modes de fonctionnement, pilotés par CONFIG.UPLOAD_URL :

     UPLOAD_URL = null   →  MODE DÉMONSTRATION
                            Le fichier n'est envoyé nulle part. L'extension
                            renvoie quand même un payload complet à Osteobot,
                            avec une référence locale et simulated: true.
                            Tous les parcours restent testables.

     UPLOAD_URL = "..."  →  MODE RÉEL
                            Le fichier part vers l'endpoint Osteolib, et
                            l'URL renvoyée par le serveur est transmise
                            à Osteobot.

   Pour passer en réel : renseigner UPLOAD_URL ci-dessous, vérifier
   RESPONSE_URL_PATH selon la réponse de l'API, et c'est tout. Aucune autre
   ligne à modifier.
   ========================================================================== */

const CONFIG = {
  /* --- Endpoint de dépôt -------------------------------------------------
     null  = mode démonstration (aucun envoi réseau)
     sinon = URL absolue de l'endpoint Osteolib
     Exemple : 'https://api.osteolib.fr/v1/attachments/upload'
  */
  UPLOAD_URL: null,

  UPLOAD_METHOD: 'POST',

  // Nom du champ multipart qui porte le fichier
  UPLOAD_FIELD_NAME: 'file',

  /* Champs de formulaire additionnels envoyés avec le fichier.
     Les valeurs peuvent être surchargées depuis Voiceflow via
     trace.payload.context (voir « Contrat » en bas de fichier). */
  EXTRA_FIELDS: {
    purpose: 'preconsultation'
  },

  /* En-têtes HTTP additionnels.
     ATTENTION : ce code s'exécute dans le navigateur. N'y placez jamais
     un secret permanent. Utilisez un jeton court transmis par Osteolib
     dans le payload de lancement, ou une URL signée à durée de vie limitée. */
  UPLOAD_HEADERS: {},

  /* Chemin de l'URL du fichier dans la réponse JSON du serveur.
     'url'            →  { "url": "https://..." }
     'data.url'       →  { "data": { "url": "https://..." } }
     'file.public_url'→  { "file": { "public_url": "https://..." } }  */
  RESPONSE_URL_PATH: 'url',

  /* Chemin de l'identifiant renvoyé par le serveur, facultatif. */
  RESPONSE_ID_PATH: 'attachment_id',

  // Contraintes de validation, alignées sur le cahier des charges
  MAX_SIZE_MB: 5,
  ACCEPTED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'mp4'],

  // Délai au-delà duquel l'envoi est abandonné
  TIMEOUT_MS: 30000
};

/* ========================================================================== */

const STYLE_ID = 'osteolib-upload-styles';

const STYLES = `
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
  .osteolib-upload-container[data-done="true"] {
    opacity: 0.65;
    pointer-events: none;
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
  .osteolib-dropzone:focus-visible {
    outline: 2px solid #3fbfae;
    outline-offset: 2px;
  }
  .osteolib-dropzone.dragover {
    border-color: #3fbfae;
    background: #eafbf8;
    transform: scale(1.01);
  }
  .osteolib-dropzone-icon { font-size: 1.8rem; margin-bottom: 8px; }
  .osteolib-dropzone-text { color: #277a70; font-size: 0.9rem; }
  .osteolib-dropzone-sub  { color: #94a3a8; font-size: 0.75rem; margin-top: 4px; }
  .osteolib-file-input { display: none; }
  .osteolib-file-preview {
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: #eafbf8;
    border-radius: 10px;
    padding: 10px 14px;
    margin-top: 14px;
    font-size: 0.85rem;
    color: #1d5854;
  }
  .osteolib-file-preview.active { display: flex; }
  .osteolib-file-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .osteolib-file-size { color: #6b8a86; font-size: 0.75rem; }
  .osteolib-remove-file {
    cursor: pointer;
    color: #94a3a8;
    font-size: 1.1rem;
    line-height: 1;
    background: none;
    border: none;
    padding: 0 4px;
  }
  .osteolib-actions { display: flex; gap: 10px; margin-top: 16px; }
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
  .osteolib-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .osteolib-btn-primary { background: #3fbfae; color: white; }
  .osteolib-btn-primary:hover:not(:disabled) { background: #329c8f; }
  .osteolib-btn-secondary { background: #eafbf8; color: #1d5854; }
  .osteolib-status { margin-top: 12px; font-size: 0.82rem; text-align: center; }
  .osteolib-status.error   { color: #d64545; }
  .osteolib-status.success { color: #329c8f; }
  .osteolib-status.note    { color: #94a3a8; font-size: 0.75rem; }
  .osteolib-spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid #cff5ef;
    border-top-color: #3fbfae;
    border-radius: 50%;
    animation: osteolib-spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
  @keyframes osteolib-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .osteolib-spinner { animation-duration: 2s; }
    .osteolib-dropzone { transition: none; }
  }
`;

function injectStylesOnce() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function readPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' Mo';
}

function extensionOf(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

/* Validation côté client. L'attribut accept d'un input n'est qu'une
   suggestion : il est contourné par le glisser-déposer. Cette fonction
   est donc le seul vrai garde-fou avant l'envoi. */
function validateFile(file, cfg) {
  const maxBytes = cfg.MAX_SIZE_MB * 1024 * 1024;

  if (file.size === 0) {
    return 'Ce fichier est vide.';
  }
  if (file.size > maxBytes) {
    return `Fichier trop volumineux (${formatSize(file.size)}). Maximum ${cfg.MAX_SIZE_MB} Mo.`;
  }
  const ext = extensionOf(file.name);
  if (!cfg.ACCEPTED_EXTENSIONS.includes(ext)) {
    return `Format non accepté. Formats possibles : ${cfg.ACCEPTED_EXTENSIONS.join(', ')}.`;
  }
  return null;
}

/* --------------------------------------------------------------------------
   Envoi du fichier.
   Renvoie toujours un objet de la même forme, quel que soit le mode :
     { url, attachmentId, simulated }
   -------------------------------------------------------------------------- */
async function uploadFile(file, cfg, context) {

  /* ---- MODE DÉMONSTRATION -------------------------------------------------
     Aucun appel réseau. On produit une référence locale pour que le parcours
     se déroule normalement, et on marque le résultat comme simulé afin que
     rien ne soit pris pour un vrai dépôt côté Osteolib. */
  if (!cfg.UPLOAD_URL) {
    await new Promise((r) => setTimeout(r, 600)); // latence simulée
    return {
      url: 'local://' + encodeURIComponent(file.name),
      attachmentId: null,
      simulated: true
    };
  }

  /* ---- MODE RÉEL ---------------------------------------------------------
     Requête attendue par l'endpoint Osteolib :

        POST <UPLOAD_URL>
        Content-Type : multipart/form-data
        En-têtes      : ceux de CONFIG.UPLOAD_HEADERS

        Champs du formulaire :
          file        (binaire)   le fichier lui-même
          purpose     (texte)     "preconsultation"
          session_id  (texte)     transmis par Voiceflow si disponible
          practitioner_id (texte) transmis par Voiceflow si disponible

     Réponse attendue, 200 ou 201 :

        {
          "attachment_id": "att_998",
          "url": "https://storage.osteolib.fr/att_998/compte_rendu.pdf",
          "type": "application/pdf",
          "size": 284410
        }

     Le champ lu pour l'URL est défini par CONFIG.RESPONSE_URL_PATH.
     Toute réponse hors 2xx, ou sans URL exploitable, est traitée comme un
     échec : le parcours continue, l'utilisateur peut réessayer ou passer. */

  const formData = new FormData();
  formData.append(cfg.UPLOAD_FIELD_NAME, file, file.name);

  Object.entries(cfg.EXTRA_FIELDS || {}).forEach(([k, v]) => {
    formData.append(k, v);
  });
  Object.entries(context || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') formData.append(k, String(v));
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.TIMEOUT_MS);

  try {
    const response = await fetch(cfg.UPLOAD_URL, {
      method: cfg.UPLOAD_METHOD,
      headers: cfg.UPLOAD_HEADERS, // ne pas définir Content-Type : le navigateur
      body: formData,              // ajoute lui-même la frontière multipart
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json().catch(() => ({}));
    const url = readPath(data, cfg.RESPONSE_URL_PATH);

    if (!url || typeof url !== 'string') {
      throw new Error('Réponse sans URL exploitable');
    }

    return {
      url,
      attachmentId: readPath(data, cfg.RESPONSE_ID_PATH) || null,
      simulated: false
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ========================================================================== */

export const FileUploadExtension = {
  name: 'FileUploadExtension',
  type: 'response',

  match: ({ trace }) =>
    trace.type === 'ext_file_upload' || trace.payload?.name === 'ext_file_upload',

  render: ({ trace, element }) => {
    injectStylesOnce();

    const payload = trace.payload || {};
    const label = payload.label || 'Ajoutez votre fichier';

    /* Surcharges possibles depuis le nœud Voiceflow, toutes facultatives */
    const cfg = {
      ...CONFIG,
      MAX_SIZE_MB: Number(payload.maxSizeMb) > 0 ? Number(payload.maxSizeMb) : CONFIG.MAX_SIZE_MB,
      ACCEPTED_EXTENSIONS: Array.isArray(payload.acceptedExtensions) && payload.acceptedExtensions.length
        ? payload.acceptedExtensions.map((e) => String(e).toLowerCase())
        : CONFIG.ACCEPTED_EXTENSIONS,
      UPLOAD_URL: payload.uploadUrl || CONFIG.UPLOAD_URL
    };

    /* Contexte transmis au serveur avec le fichier, si Voiceflow l'envoie */
    const context = {
      session_id: payload.session_id || '',
      practitioner_id: payload.practitioner_id || ''
    };

    const acceptAttr = cfg.ACCEPTED_EXTENSIONS.map((e) => '.' + e).join(',');

    const container = document.createElement('div');
    container.className = 'osteolib-upload-container';
    container.dataset.done = 'false';

    container.innerHTML = `
      <div class="osteolib-upload-title"></div>

      <div class="osteolib-dropzone" id="dropzone" role="button" tabindex="0"
           aria-label="Ajouter un fichier">
        <div class="osteolib-dropzone-icon" aria-hidden="true">📎</div>
        <div class="osteolib-dropzone-text">Glissez un fichier ici, ou cliquez pour parcourir</div>
        <div class="osteolib-dropzone-sub" id="dropzoneSub"></div>
        <input type="file" class="osteolib-file-input" id="fileInput" accept="${acceptAttr}">
      </div>

      <div class="osteolib-file-preview" id="filePreview">
        <span class="osteolib-file-meta">
          <span id="fileName"></span>
          <span class="osteolib-file-size" id="fileSize"></span>
        </span>
        <button class="osteolib-remove-file" id="removeFile" type="button"
                aria-label="Retirer le fichier">&#10005;</button>
      </div>

      <div class="osteolib-actions">
        <button class="osteolib-btn osteolib-btn-secondary" id="skipBtn" type="button">Passer cette étape</button>
        <button class="osteolib-btn osteolib-btn-primary" id="uploadBtn" type="button" disabled>Envoyer</button>
      </div>

      <div class="osteolib-status" id="status" role="status" aria-live="polite"></div>
    `;

    /* Le libellé vient d'une variable Voiceflow : on l'insère en texte,
       jamais en HTML, pour qu'aucun contenu ne puisse être injecté. */
    container.querySelector('.osteolib-upload-title').textContent = label;
    container.querySelector('#dropzoneSub').textContent =
      cfg.ACCEPTED_EXTENSIONS.map((e) => e.toUpperCase()).join(', ') +
      ' — ' + cfg.MAX_SIZE_MB + ' Mo maximum';

    const dropzone = container.querySelector('#dropzone');
    const fileInput = container.querySelector('#fileInput');
    const filePreview = container.querySelector('#filePreview');
    const fileNameEl = container.querySelector('#fileName');
    const fileSizeEl = container.querySelector('#fileSize');
    const removeFileBtn = container.querySelector('#removeFile');
    const uploadBtn = container.querySelector('#uploadBtn');
    const skipBtn = container.querySelector('#skipBtn');
    const status = container.querySelector('#status');

    let selectedFile = null;
    let finished = false; // verrou : une seule interaction par carte

    function setStatus(text, kind) {
      status.className = 'osteolib-status' + (kind ? ' ' + kind : '');
      status.textContent = text || '';
    }

    function setBusy(text) {
      status.className = 'osteolib-status';
      status.innerHTML = '<span class="osteolib-spinner"></span>';
      status.appendChild(document.createTextNode(text));
    }

    function lock() {
      finished = true;
      container.dataset.done = 'true';
      uploadBtn.disabled = true;
      skipBtn.disabled = true;
    }

    function send(data) {
      if (finished) return;
      lock();
      window.voiceflow.chat.interact({ type: 'complete', payload: data });
    }

    function showFile(file) {
      const error = validateFile(file, cfg);
      if (error) {
        clearFile();
        setStatus(error, 'error');
        return;
      }
      selectedFile = file;
      fileNameEl.textContent = file.name;
      fileSizeEl.textContent = ' · ' + formatSize(file.size);
      filePreview.classList.add('active');
      uploadBtn.disabled = false;
      dropzone.style.display = 'none';
      setStatus('');
    }

    function clearFile() {
      selectedFile = null;
      fileInput.value = '';
      filePreview.classList.remove('active');
      uploadBtn.disabled = true;
      dropzone.style.display = 'block';
      setStatus('');
    }

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

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
      send({
        skipped: true,
        file: null,
        name: null,
        type: null,
        size: 0,
        attachment_id: null,
        simulated: false
      });
    });

    uploadBtn.addEventListener('click', async () => {
      if (!selectedFile || finished) return;

      uploadBtn.disabled = true;
      skipBtn.disabled = true;
      setBusy('Envoi en cours…');

      try {
        const result = await uploadFile(selectedFile, cfg, context);

        setStatus(
          result.simulated
            ? 'Fichier pris en compte (mode démonstration).'
            : 'Fichier envoyé avec succès.',
          result.simulated ? 'note' : 'success'
        );

        send({
          skipped: false,
          file: result.url,
          name: selectedFile.name,
          fileName: selectedFile.name,      // conservé pour compatibilité
          type: selectedFile.type || '',
          size: selectedFile.size,
          attachment_id: result.attachmentId,
          simulated: result.simulated
        });
      } catch (err) {
        const aborted = err && err.name === 'AbortError';
        setStatus(
          aborted
            ? "L'envoi a pris trop de temps. Réessayez ou passez cette étape."
            : "L'envoi a échoué. Réessayez ou passez cette étape.",
          'error'
        );
        uploadBtn.disabled = false;
        skipBtn.disabled = false;
      }
    });

    element.appendChild(container);
  }
};

/* ============================================================================
   CONTRAT AVEC OSTEOBOT
   ----------------------------------------------------------------------------
   Ce que Voiceflow peut envoyer dans trace.payload (tous facultatifs) :

     label               texte    titre affiché au-dessus de la zone de dépôt
     maxSizeMb           nombre   surcharge la taille maximale
     acceptedExtensions  tableau  ex. ["pdf","jpg","png"]
     uploadUrl           texte    surcharge l'endpoint pour ce nœud précis
     session_id          texte    transmis au serveur avec le fichier
     practitioner_id     texte    transmis au serveur avec le fichier

   Ce que l'extension renvoie à Osteobot, dans les deux cas :

     {
       skipped:       false,
       file:          "https://storage.osteolib.fr/att_998/compte_rendu.pdf",
       name:          "compte_rendu.pdf",
       fileName:      "compte_rendu.pdf",
       type:          "application/pdf",
       size:          284410,
       attachment_id: "att_998",
       simulated:     false
     }

   Si l'utilisateur passe l'étape :

     { skipped: true, file: null, name: null, type: null,
       size: 0, attachment_id: null, simulated: false }

   Côté Voiceflow, le Code step lit ces champs ainsi :

     const list = JSON.parse(attachments || "[]");
     const p = last_event.payload || {};
     if (p.file) {
       list.push({
         attachment_id: p.attachment_id || ("att_" + Date.now()),
         url:      p.file,
         type:     p.type || "",
         name:     p.name || "",
         size:     p.size || 0,
         status:   p.simulated ? "simulated" : "uploaded",
         added_at: new Date().toISOString()
       });
     }
     attachments = JSON.stringify(list);
     skipped = String(p.skipped === true);
   ========================================================================== */
